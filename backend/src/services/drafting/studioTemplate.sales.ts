import type { ContractTemplate } from './templates';
import { normalizeStudioDocument, type StudioDocument, type StudioNode } from './studioDocument';
import { studioParagraph as p, studioTextNode as text } from './studioNodes';
import { SALES_REFERENCE_OPENING, SALES_REFERENCE_APPENDIX } from './sales-reference-content';

// The reference always identifies A as seller and B as buyer. Input keys remain
// relative to the signed-in party, including when they choose to be the buyer.
const partyPairs = [
  ['companyName', 'partnerName'],
  ['companyTaxCode', 'partnerIdentifier'],
  ['companyAddress', 'partnerAddress'],
  ['representative', 'partnerRepresentative'],
  ['representativePosition', 'partnerPosition'],
  ['authorization', 'partnerAuthorization'],
  ['authorizationDate', 'partnerAuthorizationDate'],
  ['companyPhone', 'partnerPhone'],
  ['companyEmail', 'partnerEmail'],
  ['companyIdIssuedDate', 'partnerIdIssuedDate'],
  ['companyIdIssuedPlace', 'partnerIdIssuedPlace'],
] as const;

export function buildSalesStudioTemplate(
  template: ContractTemplate,
  input: Record<string, string>,
  companyName: string,
  ourParty: string,
): StudioDocument {
  const aliases = new Map<string, string>(
    ourParty === 'buyer'
      ? partyPairs.flatMap(([a, b]) => [
          [a, b],
          [b, a],
        ])
      : [],
  );
  function field(reference: string): StudioNode {
    const [original, format] = reference.split(':');
    const key = aliases.get(original) ?? original;
    return {
      type: 'templateField',
      attrs: {
        key,
        value: input[key] ?? (key === 'companyName' ? companyName : ''),
        ...(format ? { format } : {}),
      },
    };
  }
  const inline = (value: string): StudioNode[] =>
    value
      .split(/(\{\{\w+(?::(?:day|month|year))?\}\})/g)
      .filter(Boolean)
      .map((part) => {
        const match = /^\{\{([^}]+)\}\}$/.exec(part);
        return match ? field(match[1]) : text(part);
      });
  const heading = (value: string, center = false): StudioNode => ({
    type: 'heading',
    attrs: { level: center ? 1 : 2, textAlign: center ? 'center' : null },
    content: [text(value)],
  });
  const boldLine = (value: string, align: string | null = null) =>
    p([{ ...text(value), marks: [{ type: 'bold' }] }], align);
  const signature = (): StudioNode => ({
    type: 'table',
    attrs: { layout: 'signature' },
    content: [
      [boldLine('BÊN BÁN (BÊN A)', 'center'), boldLine('BÊN MUA (BÊN B)', 'center')],
      [
        p([text('(Ký, ghi rõ họ tên và đóng dấu nếu có)')], 'center'),
        p([text('(Ký, ghi rõ họ tên và đóng dấu nếu có)')], 'center'),
      ],
      [p([]), p([])],
      [p([]), p([])],
      [p([]), p([])],
      [p([field('representative')], 'center'), p([field('partnerRepresentative')], 'center')],
    ].map((row) => ({
      type: 'tableRow',
      content: row.map((paragraph) => ({ type: 'tableCell', content: [paragraph] })),
    })),
  });
  const opening = SALES_REFERENCE_OPENING.map((value, index): StudioNode => {
    if ([0, 1].includes(index)) return boldLine(value, 'center');
    if (index === 4) return heading(value, true);
    if ([13, 24].includes(index)) return heading(value);
    const nodes = inline(value);
    if (index >= 6 && index <= 11)
      nodes.forEach((node) => {
        if (node.type === 'text') node.marks = [{ type: 'italic' }];
      });
    return p(nodes, index === 3 ? 'right' : index === 2 || index === 5 ? 'center' : null);
  });
  return normalizeStudioDocument(
    {
      type: 'doc',
      content: [
        ...opening,
        ...template.sections.flatMap((section, index) => [
          heading(`ĐIỀU ${index + 1}. ${section.title}`),
          ...section.body.split('\n').map((line) => p(inline(line))),
        ]),
        signature(),
        { type: 'pageBreak' },
        {
          ...heading('PHỤ LỤC 01: DANH MỤC HÀNG HÓA, ĐƠN GIÁ VÀ TIẾN ĐỘ GIAO HÀNG'),
          attrs: { level: 2, textAlign: 'center', appendix: true },
        },
        p(
          [text('Kèm theo Hợp đồng mua bán hàng hóa số '), field('reference'), text('/HĐMBHH')],
          'center',
        ),
        { type: 'templateItems', attrs: { key: 'lineItems', value: input.lineItems ?? '' } },
        ...SALES_REFERENCE_APPENDIX.map((line) => p(inline(line))),
        signature(),
      ],
    },
    template,
  );
}
