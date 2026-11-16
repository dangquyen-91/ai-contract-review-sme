import { packageDocx, xml } from './docx.service';
import { fieldDisplay, type StudioDocument, type StudioNode } from './studioDocument';
import type { ContractTemplate } from './templates';
import { lineItemsTable } from './line-items';

export async function createStudioDocx(document: StudioDocument, template: ContractTemplate) {
  const lists: string[] = [];
  function inline(node: StudioNode, size = 26): string {
    if (node.type === 'hardBreak') return '<w:r><w:br/></w:r>';
    const text =
      node.type === 'templateField'
        ? fieldDisplay(String(node.attrs!.key), String(node.attrs!.value), template, node.attrs?.format as string | undefined)
        : (node.text ?? '');
    const marks = new Set(node.marks?.map((mark) => mark.type));
    return `<w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${size}"/><w:lang w:val="vi-VN"/>${marks.has('bold') ? '<w:b/>' : ''}${marks.has('italic') ? '<w:i/>' : ''}${marks.has('underline') ? '<w:u w:val="single"/>' : ''}${marks.has('strike') ? '<w:strike/>' : ''}</w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r>`;
  }
  function paragraph(node: StudioNode, properties = '', size = 26) {
    const alignments: Record<string, string> = {
      left: 'left',
      center: 'center',
      right: 'right',
      justify: 'both',
    };
    const alignment = alignments[String(node.attrs?.textAlign ?? 'justify')] ?? 'both';
    const heading = node.type === 'heading';
    const fontSize = heading && node.attrs?.level === 1 ? 32 : size;
    const children = (node.content ?? []).map((child) =>
      heading ? { ...child, marks: [...(child.marks ?? []), { type: 'bold' as const }] } : child,
    );
    return `<w:p><w:pPr><w:jc w:val="${alignment}"/>${heading ? '<w:keepNext/>' : ''}<w:spacing w:before="${heading ? 180 : 0}" w:after="120" w:line="360" w:lineRule="auto"/>${properties}</w:pPr>${children.map((child) => inline(child, fontSize)).join('')}</w:p>`;
  }
  function render(node: StudioNode, depth = 0, size = 26): string {
    if (node.type === 'pageBreak') return '<w:p><w:r><w:br w:type="page"/></w:r></w:p>';
    if (node.type === 'paragraph' || node.type === 'heading') return paragraph(node, '', size);
    if (node.type === 'templateItems') {
      const rows = lineItemsTable(String(node.attrs!.value))
        .split('\n')
        .filter(Boolean)
        .map((line) =>
          line
            .replace(/^\|\s*|\s*\|$/g, '')
            .split('|')
            .map((cell) => cell.trim()),
        );
      if (!rows.length) return paragraph({ type: 'paragraph', content: [] });
      return render({
        type: 'table',
        content: rows.map((row, index) => ({
          type: 'tableRow',
          content: row.map((cell) => ({
            type: index === 0 ? 'tableHeader' : 'tableCell',
            content: [{ type: 'paragraph', content: [{ type: 'text', text: cell }] }],
          })),
        })),
      });
    }
    if (node.type === 'table') {
      const columns = node.content?.[0]?.content?.length ?? 1;
      const width = Math.floor(9071 / columns);
      const signature = node.attrs?.layout === 'signature';
      const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV']
        .map(
          (edge) =>
            `<w:${edge} w:val="${signature ? 'nil' : 'single'}" w:sz="4" w:color="475569"/>`,
        )
        .join('');
      const rows = node
        .content!.map(
          (row, rowIndex) =>
            `<w:tr><w:trPr><w:cantSplit/>${row.content?.every((cell) => cell.type === 'tableHeader') ? '<w:tblHeader/>' : ''}</w:trPr>${row.content!.map((cell) => `<w:tc><w:tcPr><w:tcW w:w="${width}" w:type="dxa"/><w:vAlign w:val="top"/></w:tcPr>${cell.content!.map((child) => (['paragraph', 'heading'].includes(child.type) ? paragraph({ ...child, attrs: { ...child.attrs, ...(signature || cell.type === 'tableHeader' ? { textAlign: 'center' } : {}) }, content: child.content?.map((item) => (cell.type === 'tableHeader' ? { ...item, marks: [...(item.marks ?? []), { type: 'bold' as const }] } : item)) }, signature && rowIndex < node.content!.length - 1 ? '<w:keepNext/>' : '', signature ? 26 : 22) : render(child, 0, signature ? 26 : 22))).join('')}</w:tc>`).join('')}</w:tr>`,
        )
        .join('');
      return `<w:tbl><w:tblPr><w:tblW w:w="9071" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${borders}</w:tblBorders><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${Array.from({ length: columns }, () => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rows}</w:tbl><w:p/>`;
    }
    if (node.type === 'bulletList' || node.type === 'orderedList') {
      const number = lists.length + 1;
      const abstractId = node.type === 'bulletList' ? 0 : 1;
      lists.push(
        `<w:num w:numId="${number}"><w:abstractNumId w:val="${abstractId}"/><w:lvlOverride w:ilvl="0"><w:startOverride w:val="${Number(node.attrs?.start ?? 1)}"/></w:lvlOverride></w:num>`,
      );
      return node
        .content!.map((item) =>
          item
            .content!.map((child, index) =>
              child.type === 'paragraph'
                ? paragraph(
                    child,
                    index === 0
                      ? `<w:numPr><w:ilvl w:val="0"/><w:numId w:val="${number}"/></w:numPr><w:ind w:left="${(depth + 1) * 360}"/>`
                      : '',
                    size,
                  )
                : render(child, depth + 1, size),
            )
            .join(''),
        )
        .join('');
    }
    return (node.content ?? []).map((child) => render(child, depth, size)).join('');
  }
  const body = render(document);
  const definitions = [0, 1]
    .map(
      (id) =>
        `<w:abstractNum w:abstractNumId="${id}"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="${id ? 'decimal' : 'bullet'}"/><w:lvlText w:val="${id ? '%1.' : '•'}"/><w:pPr><w:ind w:left="360" w:hanging="180"/></w:pPr></w:lvl></w:abstractNum>`,
    )
    .join('');
  const numbering = lists.length
    ? `<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">${definitions}${lists.join('')}</w:numbering>`
    : '';
  return packageDocx(body, numbering);
}
