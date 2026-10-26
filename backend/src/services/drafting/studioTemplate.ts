import { randomUUID } from 'crypto';
import type { ContractTemplate } from './templates';
import { normalizeStudioDocument, type StudioDocument, type StudioNode } from './studioDocument';
import { studioParagraph, studioTextNode } from './studioNodes';
import { buildLaborStudioTemplate } from './studioTemplate.labor';
export { studioParagraph, studioTextNode } from './studioNodes';

export function buildStudioTemplate(
  template: ContractTemplate,
  input: Record<string, string>,
  companyName: string,
  ourParty: string,
): StudioDocument {
  if (template.code === 'labor' && template.version >= 3)
    return buildLaborStudioTemplate(template, input, companyName);
  const field = (key: string): StudioNode => ({
    type: 'templateField',
    attrs: { key, value: input[key] ?? '' },
  });
  const text = studioTextNode;
  const p = studioParagraph;
  const heading = (value: string, level = 2, textAlign: string | null = null): StudioNode => ({
    type: 'heading',
    attrs: { blockId: randomUUID(), level, textAlign },
    content: [text(value)],
  });
  const inline = (value: string) =>
    value
      .split(/(\{\{\w+\}\})/g)
      .filter(Boolean)
      .map((piece) => {
        const key = /^\{\{(\w+)\}\}$/.exec(piece)?.[1];
        if (key && template.fields.some((item) => item.key === key)) return field(key);
        if (key === 'supplierRole')
          return text(template.code === 'service' ? 'Bên cung cấp dịch vụ' : 'Bên bán');
        if (key === 'recipientRole')
          return text(template.code === 'service' ? 'Bên sử dụng dịch vụ' : 'Bên mua');
        return text(piece);
      });
  const party = template.parties.find((item) => item.code === ourParty)!;
  const partner =
    template.code === 'labor'
      ? 'Người lao động'
      : template.parties.find((item) => item.code !== ourParty)!.name;
  const document: StudioDocument = {
    type: 'doc',
    content: [
      p([{ ...text('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'), marks: [{ type: 'bold' }] }], 'center'),
      p([{ ...text('Độc lập - Tự do - Hạnh phúc'), marks: [{ type: 'italic' }] }], 'center'),
      p([]),
      heading(template.name.toLocaleUpperCase('vi-VN'), 1, 'center'),
      p([text('Số: '), field('reference')], 'center'),
      p([]),
      p([text(`Căn cứ ${template.legalBasis}`)]),
      p([text('Căn cứ nhu cầu và sự thỏa thuận của các bên.')]),
      p([
        text('Hôm nay, ngày '),
        field('signingDate'),
        text(', tại '),
        field('signingPlace'),
        text(', chúng tôi gồm:'),
      ]),
      heading(`BÊN A — ${party.name.toLocaleUpperCase('vi-VN')}`),
      p([text(`Tên doanh nghiệp: ${companyName}`)]),
      ...template.fields
        .filter(
          (item) =>
            item.group === 'parties' &&
            !item.key.startsWith('partner') &&
            !['reference', 'signingDate', 'signingPlace'].includes(item.key),
        )
        .map((item) => p([text(`${item.label}: `), field(item.key)])),
      heading(`BÊN B — ${partner.toLocaleUpperCase('vi-VN')}`),
      ...template.fields
        .filter((item) => item.group === 'parties' && item.key.startsWith('partner'))
        .map((item) => p([text(`${item.label}: `), field(item.key)])),
      p([text('Hai bên thống nhất giao kết hợp đồng với các điều khoản sau đây:')]),
      ...template.sections.flatMap((section, index) => [
        heading(`ĐIỀU ${index + 1}. ${section.title.toLocaleUpperCase('vi-VN')}`),
        ...section.body.split('\n').map((line, paragraph) =>
          line.trim() === '{{lineItems}}'
            ? {
                type: 'templateItems',
                attrs: { blockId: randomUUID(), key: 'lineItems', value: input.lineItems ?? '' },
              }
            : p([text(`${index + 1}.${paragraph + 1}. `), ...inline(line)]),
        ),
      ]),
      p([]),
      {
        type: 'table',
        attrs: { blockId: randomUUID(), layout: 'signature' },
        content: [
          ['ĐẠI DIỆN BÊN A', template.code === 'labor' ? 'NGƯỜI LAO ĐỘNG' : 'ĐẠI DIỆN BÊN B'],
          ['(Ký, ghi rõ họ tên, chức vụ; đóng dấu nếu có)', '(Ký, ghi rõ họ tên)'],
          ['', ''],
          ['', ''],
          ['', ''],
        ]
          .map((row, index) => ({
            type: 'tableRow',
            content: row.map((value) => ({
              type: 'tableCell',
              content: [
                p(
                  value
                    ? [{ ...text(value), marks: [{ type: index === 0 ? 'bold' : 'italic' }] }]
                    : [],
                ),
              ],
            })),
          }))
          .concat([
            {
              type: 'tableRow',
              content: [
                field('representative'),
                field(template.code === 'labor' ? 'partnerName' : 'partnerRepresentative'),
              ].map((value) => ({ type: 'tableCell', content: [p([value])] })),
            },
          ]),
      },
    ],
  };
  return normalizeStudioDocument(document, template);
}

export function legacyStudioDocument(content: string, template: ContractTemplate): StudioDocument {
  const lines = content.split('\n');
  const nodes: StudioNode[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith('| ') || line.includes('\t')) {
      const signature = line.includes('\t');
      const rows: string[][] = [];
      while (
        index < lines.length &&
        (signature ? lines[index].includes('\t') : lines[index].startsWith('| '))
      ) {
        rows.push(
          signature
            ? lines[index].split('\t')
            : lines[index]
                .replace(/^\|\s*|\s*\|$/g, '')
                .split('|')
                .map((cell) => cell.trim()),
        );
        index++;
      }
      index--;
      nodes.push({
        type: 'table',
        attrs: { layout: signature ? 'signature' : 'normal' },
        content: rows.map((row, rowIndex) => ({
          type: 'tableRow',
          content: row.map((cell) => ({
            type: !signature && rowIndex === 0 ? 'tableHeader' : 'tableCell',
            content: [studioParagraph(cell ? [studioTextNode(cell)] : [])],
          })),
        })),
      });
    } else {
      nodes.push({
        type: /^(ĐIỀU \d+\.|BÊN [AB] -)/.test(line) ? 'heading' : 'paragraph',
        attrs: { level: 2, textAlign: index < 5 ? 'center' : null },
        content: line ? [studioTextNode(line)] : [],
      });
    }
  }
  return normalizeStudioDocument({ type: 'doc', content: nodes }, template);
}
