import { randomUUID } from 'crypto';
import { AppError } from '../../errors/AppError';
import type { ContractTemplate } from './templates';
import { displayMoney, lineItemsTable } from './line-items';

export type StudioMark = { type: 'bold' | 'italic' | 'underline' | 'strike' };
export type StudioNode = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: StudioMark[];
  content?: StudioNode[];
};
export type StudioDocument = StudioNode & { type: 'doc'; content: StudioNode[] };
const blockTypes = new Set([
  'paragraph',
  'heading',
  'table',
  'bulletList',
  'orderedList',
  'templateItems',
  'pageBreak',
]);
const inlineTypes = new Set(['text', 'hardBreak', 'templateField']);
const allowedChildren: Record<string, Set<string>> = {
  doc: blockTypes,
  paragraph: inlineTypes,
  heading: inlineTypes,
  bulletList: new Set(['listItem']),
  orderedList: new Set(['listItem']),
  listItem: new Set(['paragraph', 'bulletList', 'orderedList']),
  table: new Set(['tableRow']),
  tableRow: new Set(['tableCell', 'tableHeader']),
  tableCell: new Set(['paragraph', 'bulletList', 'orderedList']),
  tableHeader: new Set(['paragraph', 'bulletList', 'orderedList']),
};

export function normalizeStudioDocument(
  value: unknown,
  template: ContractTemplate,
): StudioDocument {
  if (JSON.stringify(value)?.length > 300000)
    throw AppError.badRequest('Văn bản quá dài. Vui lòng rút gọn nội dung.');
  const fields = new Map(template.fields.map((field) => [field.key, field]));
  const ids = new Set<string>();
  const fieldValues = new Map<string, string>();
  let count = 0;
  function parse(raw: unknown, depth: number, parent?: string): StudioNode {
    if (++count > 4000 || depth > 16 || !raw || typeof raw !== 'object')
      throw AppError.badRequest('Cấu trúc văn bản không hợp lệ hoặc quá phức tạp.');
    const source = raw as StudioNode;
    if (
      typeof source.type !== 'string' ||
      (parent ? !allowedChildren[parent]?.has(source.type) : source.type !== 'doc')
    )
      throw AppError.badRequest('Văn bản chứa thành phần chưa được hỗ trợ.');
    const node: StudioNode = { type: source.type };
    const attrs = source.attrs ?? {};
    if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs))
      throw AppError.badRequest('Thuộc tính văn bản không hợp lệ.');
    if (blockTypes.has(node.type)) {
      let id =
        typeof attrs.blockId === 'string' && /^[\w-]{1,80}$/.test(attrs.blockId)
          ? attrs.blockId
          : randomUUID();
      if (ids.has(id)) id = randomUUID();
      ids.add(id);
      node.attrs = { blockId: id };
    }
    if (node.type === 'paragraph' || node.type === 'heading') {
      const alignment = attrs.textAlign ?? null;
      if (alignment !== null && !['left', 'center', 'right', 'justify'].includes(String(alignment)))
        throw AppError.badRequest('Căn lề văn bản không hợp lệ.');
      node.attrs!.textAlign = alignment;
      if (node.type === 'paragraph' && attrs.placeholder === 'appendix')
        node.attrs!.placeholder = 'appendix';
      if (node.type === 'heading' && attrs.appendix === true) node.attrs!.appendix = true;
    }
    if (node.type === 'heading') {
      if (![1, 2, 3].includes(Number(attrs.level)))
        throw AppError.badRequest('Cấp tiêu đề không hợp lệ.');
      node.attrs!.level = Number(attrs.level);
    }
    if (node.type === 'orderedList')
      node.attrs!.start =
        Number.isSafeInteger(attrs.start) && Number(attrs.start) > 0 && Number(attrs.start) < 1000
          ? attrs.start
          : 1;
    if (node.type === 'table')
      node.attrs!.layout = attrs.layout === 'signature' ? 'signature' : 'normal';
    if (node.type === 'tableCell' || node.type === 'tableHeader') {
      if ((attrs.colspan ?? 1) !== 1 || (attrs.rowspan ?? 1) !== 1)
        throw AppError.badRequest('Mẫu hiện hỗ trợ bảng có các ô riêng, chưa hỗ trợ gộp ô.');
      node.attrs = { colspan: 1, rowspan: 1, colwidth: null };
    }
    if (node.type === 'templateField' || node.type === 'templateItems') {
      const key = String(attrs.key ?? '');
      const field = fields.get(key);
      if (
        !field ||
        (field.kind === 'items') !== (node.type === 'templateItems') ||
        typeof attrs.value !== 'string' ||
        attrs.value.length > (field.kind === 'items' ? 16000 : 4000)
      )
        throw AppError.badRequest('Ô thông tin trên mẫu không hợp lệ.');
      const text = attrs.value.trim();
      if (fieldValues.has(key) && fieldValues.get(key) !== text)
        throw AppError.badRequest(
          `Các ô ${field.label.toLowerCase()} chưa đồng nhất. Vui lòng tải lại văn bản.`,
        );
      fieldValues.set(key, text);
      node.attrs = { ...node.attrs, key, value: text };
      if (attrs.format != null) {
        if (field.kind !== 'date' || !['day', 'month', 'year'].includes(String(attrs.format)))
          throw AppError.badRequest('Định dạng ô thông tin không hợp lệ.');
        node.attrs.format = attrs.format;
      }
    }
    if (node.type === 'text') {
      if (typeof source.text !== 'string' || !source.text || source.text.length > 20000)
        throw AppError.badRequest('Nội dung đoạn văn không hợp lệ.');
      node.text = source.text;
    }
    if (source.marks) {
      if (
        !Array.isArray(source.marks) ||
        source.marks.length > 4 ||
        source.marks.some(
          (mark) => !mark || !['bold', 'italic', 'underline', 'strike'].includes(mark.type),
        )
      )
        throw AppError.badRequest('Định dạng chữ chưa được hỗ trợ.');
      node.marks = source.marks.map((mark) => ({ type: mark.type }));
    }
    if (allowedChildren[node.type]) {
      if (source.content !== undefined && !Array.isArray(source.content))
        throw AppError.badRequest('Cấu trúc đoạn văn không hợp lệ.');
      node.content = (source.content ?? []).map((child) => parse(child, depth + 1, node.type));
      if (
        [
          'doc',
          'table',
          'tableRow',
          'tableCell',
          'tableHeader',
          'listItem',
          'bulletList',
          'orderedList',
        ].includes(node.type) &&
        !node.content.length
      )
        throw AppError.badRequest('Văn bản hoặc bảng không được để trống hoàn toàn.');
      if (
        node.type === 'table' &&
        (node.content.length > 30 ||
          node.content.some(
            (row) =>
              (row.content?.length ?? 0) > 8 ||
              row.content?.length !== node.content![0].content?.length,
          ))
      )
        throw AppError.badRequest('Bảng tối đa 30 dòng, 8 cột và phải có cùng số ô mỗi dòng.');
    }
    return node;
  }
  return parse(value, 0) as StudioDocument;
}

export function studioInput(document: StudioNode, baseline: Record<string, string> = {}) {
  const input = { ...baseline };
  walkStudio(document, (node) => {
    if (node.type === 'templateField' || node.type === 'templateItems')
      input[String(node.attrs!.key)] = String(node.attrs!.value);
  });
  return input;
}

export function walkStudio(node: StudioNode, visit: (node: StudioNode) => void) {
  visit(node);
  node.content?.forEach((child) => walkStudio(child, visit));
}

export function fieldDisplay(
  key: string,
  value: string,
  template: ContractTemplate,
  format?: string,
) {
  const field = template.fields.find((item) => item.key === key);
  if (format && ['day', 'month', 'year'].includes(format)) {
    if (value)
      return value.split('-')[({ day: 2, month: 1, year: 0 } as Record<string, number>)[format]!];
    const prefix = ({ day: 'Ngay', month: 'Thang', year: 'Nam' } as Record<string, string>)[format];
    const suffix =
      key === 'signingDate'
        ? ''
        : key === 'startDate'
          ? 'BatDau'
          : key === 'endDate'
            ? 'KetThuc'
            : key === 'effectiveDate'
              ? 'HieuLuc'
              : 'Ky';
    return `[${prefix}${suffix}]`;
  }
  if (!value && field?.token && field.required) return `[${field.token}]`;
  if (!value) return field?.required ? `[${field.label}]` : 'Không áp dụng';
  if (field?.options) return field.options.find((option) => option.value === value)?.label ?? value;
  if (field?.kind === 'number') return displayMoney(value);
  if (field?.kind === 'date') return value.split('-').reverse().join('/');
  return value;
}

export function studioText(node: StudioNode, template: ContractTemplate): string {
  if (node.type === 'pageBreak') return '\n';
  if (node.type === 'text') return node.text ?? '';
  if (node.type === 'hardBreak') return '\n';
  if (node.type === 'templateField')
    return fieldDisplay(
      String(node.attrs!.key),
      String(node.attrs!.value),
      template,
      node.attrs?.format as string | undefined,
    );
  if (node.type === 'templateItems')
    return lineItemsTable(String(node.attrs!.value)) || '[Bảng hàng hóa / dịch vụ]';
  const children = node.content ?? [];
  if (node.type === 'table') {
    const separator = node.attrs?.layout === 'signature' ? '\t' : ' | ';
    return children
      .map((row) => row.content!.map((cell) => studioText(cell, template)).join(separator))
      .join('\n');
  }
  const separator = ['paragraph', 'heading'].includes(node.type) ? '' : '\n';
  return children.map((child) => studioText(child, template)).join(separator);
}
