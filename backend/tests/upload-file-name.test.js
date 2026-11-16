const { normalizeUploadFileName } = require('../dist/utils/uploadFileName');

test('multipart UTF-8 Vietnamese filenames are restored without damaging already-correct names', () => {
  const name = 'Hợp Đồng Lao Động.pdf';
  expect(normalizeUploadFileName(Buffer.from(name, 'utf8').toString('latin1'))).toBe(name);
  for (const correct of [name, 'contract.docx', 'Résumé.docx', '契約書.pdf'])
    expect(normalizeUploadFileName(correct)).toBe(correct);
  expect(normalizeUploadFileName(name.normalize('NFD'))).toBe(name);
});
