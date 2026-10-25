import JSZip from 'jszip';

const xml = (value: string) => Array.from(value).filter(character => character.charCodeAt(0) >= 32 || '\n\r\t'.includes(character)).join('').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function paragraph(text: string, { center = false, bold = false, italic = false, small = false, keep = false } = {}) {
  return `<w:p><w:pPr>${center ? '<w:jc w:val="center"/>' : ''}${keep ? '<w:keepNext/>' : ''}<w:spacing w:after="120" w:line="320" w:lineRule="auto"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:eastAsia="Times New Roman" w:cs="Times New Roman"/><w:sz w:val="${small ? 22 : 26}"/><w:lang w:val="vi-VN"/>${bold ? '<w:b/>' : ''}${italic ? '<w:i/>' : ''}</w:rPr><w:t xml:space="preserve">${xml(text)}</w:t></w:r></w:p>`;
}

function table(rows: string[][], signature: boolean) {
  const columns = signature ? [4535, 4536] : [635, 2630, 1088, 1270, 1724, 1724];
  const borders = ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(edge => `<w:${edge} w:val="${signature ? 'nil' : 'single'}" w:sz="4" w:color="334155"/>`).join('');
  return `<w:tbl><w:tblPr><w:tblW w:w="9071" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders>${borders}</w:tblBorders><w:tblCellMar><w:top w:w="80" w:type="dxa"/><w:left w:w="80" w:type="dxa"/><w:bottom w:w="80" w:type="dxa"/><w:right w:w="80" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${columns.map(width => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>${rows.map((row, index) => `<w:tr><w:trPr><w:cantSplit/>${!signature && index === 0 ? '<w:tblHeader/>' : ''}</w:trPr>${row.map((cell, column) => `<w:tc><w:tcPr><w:tcW w:w="${columns[column] ?? 1270}" w:type="dxa"/></w:tcPr>${paragraph(cell || ' ', { center: signature || index === 0, bold: index === 0, italic: signature && index === 1, small: !signature, keep: signature && index < rows.length - 1 })}</w:tc>`).join('')}</w:tr>`).join('')}</w:tbl>`;
}

export async function createDraftDocx(content: string) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  const lines = content.split('\n');
  const blocks: string[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (line.startsWith('| ') || line.includes('\t')) {
      const signature = line.includes('\t');
      const rows: string[][] = [];
      while (index < lines.length && (signature ? lines[index].includes('\t') : lines[index].startsWith('| '))) {
        rows.push(signature ? lines[index].split('\t') : lines[index].replace(/^\|\s*|\s*\|$/g, '').split('|').map(cell => cell.trim()));
        index++;
      }
      index--;
      blocks.push(table(rows, signature), paragraph(''));
    } else {
      const heading = index === 0 || index === 3 || /^(ĐIỀU \d+\.|BÊN [AB] -)/.test(line);
      blocks.push(paragraph(line, { center: index < 5, bold: heading, italic: index === 1, keep: heading }));
    }
  }
  const paragraphs = blocks.join('');
  zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1701"/></w:sectPr></w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
