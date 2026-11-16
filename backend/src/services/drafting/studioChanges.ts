import { AppError } from '../../errors/AppError';
import type { ContractTemplate } from './templates';
import {
  normalizeStudioDocument,
  studioInput,
  studioText,
  walkStudio,
  type StudioDocument,
  type StudioNode,
} from './studioDocument';
import { studioParagraph, studioTextNode } from './studioTemplate';
import { validateLineItems } from './line-items';

export type StudioChanges = {
  fields: { key: string; before: string; after: string }[];
  blocks: { action: 'replace' | 'insertAfter'; blockId: string; before: string; after: string }[];
};

export function studioBlocks(document: StudioDocument, template: ContractTemplate) {
  return document.content.map((node) => {
    const keys: string[] = [];
    walkStudio(node, (child) => {
      if (child.type === 'templateField' || child.type === 'templateItems')
        keys.push(String(child.attrs!.key));
    });
    return {
      id: String(node.attrs?.blockId),
      text: studioText(node, template),
      editable: ['paragraph', 'heading'].includes(node.type) && !keys.length,
      keys: [...new Set(keys)],
    };
  });
}

export function applyStudioChanges(
  document: StudioDocument,
  changes: StudioChanges,
  template: ContractTemplate,
) {
  const next = structuredClone(document);
  const values = new Map(changes.fields.map((field) => [field.key, field.after]));
  if (
    values.has('salary') &&
    !values.has('salaryInWords') &&
    template.fields.some((field) => field.key === 'salaryInWords')
  )
    values.set('salaryInWords', '');
  const present = new Set<string>();
  if (values.get('termType') === 'indefinite') values.set('endDate', '');
  if (values.has('lineItems')) {
    const total = validateLineItems(values.get('lineItems')!, false).total;
    if (total) values.set('price', total);
  }
  walkStudio(next, (node) => {
    if (node.type === 'templateField' || node.type === 'templateItems') {
      present.add(String(node.attrs!.key));
      if (values.has(String(node.attrs!.key)))
        node.attrs!.value = values.get(String(node.attrs!.key));
    }
  });
  for (const change of changes.fields) {
    if (present.has(change.key)) continue;
    if (change.key === 'lineItems')
      next.content.push({
        type: 'templateItems',
        attrs: { key: 'lineItems', value: change.after },
      });
    else
      next.content.push(
        studioParagraph([
          studioTextNode(`${template.fields.find((field) => field.key === change.key)!.label}: `),
          { type: 'templateField', attrs: { key: change.key, value: change.after } },
        ]),
      );
  }
  for (const change of changes.blocks) {
    const index = next.content.findIndex((node) => node.attrs?.blockId === change.blockId);
    if (index < 0) throw AppError.conflict('Đoạn văn đã thay đổi. Vui lòng yêu cầu đề xuất mới.');
    const node = next.content[index];
    if (change.action === 'replace') {
      node.content = change.after
        .split('\n')
        .flatMap((line, position): StudioNode[] => [
          ...(position ? [{ type: 'hardBreak' }] : []),
          ...(line ? [studioTextNode(line)] : []),
        ]);
    } else {
      next.content.splice(
        index + 1,
        0,
        ...change.after
          .split(/\n+/)
          .filter(Boolean)
          .map((line) => studioParagraph([studioTextNode(line)])),
      );
    }
  }
  const normalized = normalizeStudioDocument(next, template);
  return { document: normalized, input: studioInput(normalized, Object.fromEntries(values)) };
}
