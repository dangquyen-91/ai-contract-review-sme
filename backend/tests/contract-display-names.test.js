const { contractDisplayNames } = require('../dist/services/contract/contractDisplayNames');

test('repairs legacy upload labels without changing stored input or document metadata', () => {
  const title = 'Hợp Đồng Lao Động';
  const garbled = value => Buffer.from(value, 'utf8').toString('latin1');
  const original = {
    title: garbled(title),
    currentVersion: { fileName: garbled(`${title}.docx`), fileKey: 'unchanged', extractionStatus: 'failed' },
  };
  const display = contractDisplayNames(original);
  expect(display.title).toBe(title);
  expect(display.currentVersion).toEqual({ ...original.currentVersion, fileName: `${title}.docx` });
  expect(original.title).toBe(garbled(title));
  expect(original.currentVersion.fileName).toBe(garbled(`${title}.docx`));
  expect(contractDisplayNames(display)).toEqual(display);
});

test.each(['Hợp đồng lao động', 'Résumé', '契約書', 'contract'])('preserves valid title %s without requiring a version', title => {
  expect(contractDisplayNames({ title })).toEqual({ title });
});
