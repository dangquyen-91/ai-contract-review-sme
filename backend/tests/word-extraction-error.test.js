process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1/unused';
process.env.JWT_ACCESS_SECRET = 'extraction-test';
process.env.JWT_REFRESH_SECRET = 'extraction-test-refresh';
process.env.DATA_ENCRYPTION_KEY = Buffer.alloc(32, 7).toString('base64');
jest.mock('mammoth', () => ({ extractRawText: jest.fn().mockResolvedValue({ value: 'Nội dung hợp đồng Word hợp lệ.' }) }));
jest.mock('../dist/services/contract/documentPageCount.service', () => ({ countDocxPages: jest.fn() }));
const { AppError } = require('../dist/errors/AppError');
const { extractContractText } = require('../dist/services/contract/textExtraction.service');
const { countDocxPages } = require('../dist/services/contract/documentPageCount.service');

test('missing Word conversion retains a distinct error code and cannot produce a billable page estimate', async () => {
  countDocxPages.mockRejectedValueOnce(new AppError('Converter unavailable', 503, true, 'REVIEW_PAGE_COUNT_UNAVAILABLE'));
  // A structurally valid DOCX, so the archive check passes and page counting is reached.
  const zip = new (require('jszip'))();
  zip.file('[Content_Types].xml', '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>');
  zip.file('word/document.xml', '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"/>');
  const docx = await zip.generateAsync({ type: 'nodebuffer' });
  const result = await extractContractText(docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  expect(result).toMatchObject({ status: 'failed', errorCode: 'REVIEW_PAGE_COUNT_UNAVAILABLE' });
  expect(result.quality?.pageCount).toBeUndefined();
});
