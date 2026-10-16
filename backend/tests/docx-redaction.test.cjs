const JSZip = require('jszip');
const { DOMParser } = require('@xmldom/xmldom');
const { redactDocx } = require('../dist/services/contract/docxRedaction.service');
const ns = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
const policy = ['person_name', 'national_id', 'phone', 'email', 'bank_account', 'date_of_birth', 'personal_address'];
const p = (text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`;
async function fixture(body, extras = {}) {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  zip.file('_rels/.rels', '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  zip.file('word/document.xml', `<w:document xmlns:w="${ns}"><w:body>${body}<w:sectPr/></w:body></w:document>`);
  for (const [name, content] of Object.entries(extras)) zip.file(name, content);
  return zip.generateAsync({ type: 'nodebuffer' });
}
function textOf(xml) {
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  return Array.from(document.getElementsByTagNameNS(ns, 't')).map((node) => node.textContent).join('');
}

test('Redacts values split across formatted Word runs and preserves tables and the original buffer', async () => {
  const input = await fixture('<w:tbl><w:tr><w:tc><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>CCCD: 079203</w:t></w:r><w:r><w:t>001234</w:t></w:r></w:p></w:tc></w:tr></w:tbl>'
    + p('Đại diện: Trần Văn Bình') + p('STK: 0071000123456') + p('Email: minh@gmail.com') + p('Điện thoại: 0903123456'));
  const result = await redactDocx(input, '', policy);
  const output = await JSZip.loadAsync(result);
  const xml = await output.file('word/document.xml').async('string');
  expect(xml).not.toMatch(/079203001234|Trần Văn Bình|0071000123456|minh@gmail.com|0903123456/);
  expect(textOf(xml)).toContain('m•••@gmail.com');
  expect(textOf(xml)).toContain('3456');
  expect(textOf(xml)).toContain('Cá nhân 1');
  expect(xml).toContain('<w:tbl>');
  expect(xml).toContain('<w:b/>');
  expect(textOf(await (await JSZip.loadAsync(input)).file('word/document.xml').async('string'))).toContain('079203001234');
});

test('Processes headers, footers and footnotes, and removes metadata, comments, deleted revisions and external links', async () => {
  const input = await fixture(p('Email: minh@gmail.com') + '<!-- minh@gmail.com --><w:del w:author="minh@gmail.com"><w:r><w:delText>079203001234</w:delText></w:r></w:del>', {
    'word/header1.xml': `<w:hdr xmlns:w="${ns}">${p('CCCD: 079203001234')}</w:hdr>`,
    'word/footer1.xml': `<w:ftr xmlns:w="${ns}">${p('Email: minh@gmail.com')}</w:ftr>`,
    'word/footnotes.xml': `<w:footnotes xmlns:w="${ns}"><w:footnote w:id="1">${p('STK: 0071000123456')}</w:footnote></w:footnotes>`,
    'docProps/core.xml': '<metadata>minh@gmail.com</metadata>',
    'word/comments.xml': '<comments>079203001234</comments>',
    'customXml/item1.xml': '<data>079203001234</data>',
    'word/_rels/document.xml.rels': '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="email" Target="mailto:minh@gmail.com" TargetMode="External" Type="hyperlink"/></Relationships>',
  });
  const output = await JSZip.loadAsync(await redactDocx(input, '', policy));
  expect(output.file('docProps/core.xml')).toBeNull();
  expect(output.file('word/comments.xml')).toBeNull();
  expect(output.file('customXml/item1.xml')).toBeNull();
  for (const entry of Object.values(output.files).filter((entry) => !entry.dir)) {
    expect(await entry.async('string')).not.toMatch(/079203001234|0071000123456|minh@gmail.com|mailto:|<w:del\b/);
  }
});

test('Refuses media and embedded documents rather than returning an unredacted file', async () => {
  await expect(redactDocx(await fixture(p('Test'), { 'word/media/image1.png': Buffer.from('Image') }), '', policy)).rejects.toMatchObject({ statusCode: 400 });
  await expect(redactDocx(await fixture(p('Test'), { 'word/embeddings/doc.bin': Buffer.from('Private') }), '', policy)).rejects.toMatchObject({ statusCode: 400 });
});

test('Refuses corrupt files and XML entity declarations', async () => {
  await expect(redactDocx(Buffer.from('not a zip'), '', policy)).rejects.toMatchObject({ statusCode: 400 });
  await expect(redactDocx(await fixture(p('Test'), { 'word/header1.xml': '<!DOCTYPE x [<!ENTITY e "private">]><x/>' }), '', policy)).rejects.toMatchObject({ statusCode: 400 });
  await expect(redactDocx(await fixture('<unknown>Private unprocessed text</unknown>'), '', policy)).rejects.toMatchObject({ statusCode: 400 });
});

test('Masks Vietnamese NFD names, date of birth and address in the generated copy', async () => {
  const input = await fixture(p('Đại diện: Trần Văn Bình'.normalize('NFD')) + p('Ngày sinh: 12/03/1990') + p('Địa chỉ thường trú: 123 Nguyễn Trãi, Hà Nội'));
  const zip = await JSZip.loadAsync(await redactDocx(input, '', policy));
  const text = textOf(await zip.file('word/document.xml').async('string'));
  expect(text).toContain('Cá nhân 1');
  expect(text).not.toMatch(/Trần Văn Bình|12\/03\/1990|123 Nguyễn Trãi/);
});

test('Drawing text and combining characters split across runs require the safe text fallback', async () => {
  await expect(redactDocx(await fixture('<w:p xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><a:t>private</a:t></w:p>'), '', policy)).rejects.toMatchObject({ statusCode: 400 });
  await expect(redactDocx(await fixture('<w:p><w:r><w:t>Tra</w:t></w:r><w:r><w:t>\u0302\u0300n Văn Bình</w:t></w:r></w:p>'), '', policy)).rejects.toMatchObject({ statusCode: 400 });
});
