jest.mock('../dist/models/contract.model', () => ({ ContractModel: { findOne: jest.fn() } }));
jest.mock('../dist/services/contract/contractVersion.service', () => ({ getCurrentVersionWithText: jest.fn(), getCurrentVersion: jest.fn() }));
jest.mock('../dist/services/contract/contractProfile.service', () => ({ resolveContractProfile: jest.fn() }));
jest.mock('../dist/services/contract/extractionWorker.service', () => ({}));
jest.mock('../dist/services/contract/storage.service', () => ({ storedFileOf: jest.fn(), downloadContractFile: jest.fn() }));
jest.mock('../dist/services/contract/docxRedaction.service', () => ({ DOCX_MIME: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', redactDocx: jest.fn() }));
jest.mock('../dist/config/logger', () => ({ logger: { warn: jest.fn() } }));
const { getRedactedContractDocx } = require('../dist/services/contract/contract.service');
const { ContractModel } = require('../dist/models/contract.model');
const { getCurrentVersionWithText } = require('../dist/services/contract/contractVersion.service');
const { resolveContractProfile } = require('../dist/services/contract/contractProfile.service');
const { storedFileOf, downloadContractFile } = require('../dist/services/contract/storage.service');
const { DOCX_MIME, redactDocx } = require('../dist/services/contract/docxRedaction.service');

beforeEach(() => {
  jest.clearAllMocks();
  ContractModel.findOne.mockResolvedValue({ type: 'service' });
  getCurrentVersionWithText.mockResolvedValue({ mimeType: DOCX_MIME, fileName: 'test.docx', extractedText: 'Private text' });
  resolveContractProfile.mockResolvedValue({ redactionPolicy: ['national_id'] });
  storedFileOf.mockReturnValue({ key: 'private-file' });
  downloadContractFile.mockResolvedValue(Buffer.from('original'));
  redactDocx.mockResolvedValue(Buffer.from('masked'));
});

test('An inaccessible organization never downloads or processes the original', async () => {
  ContractModel.findOne.mockResolvedValue(null);
  await expect(getRedactedContractDocx('other-org', 'contract')).rejects.toMatchObject({ statusCode: 404 });
  expect(ContractModel.findOne).toHaveBeenCalledWith({ _id: 'contract', orgId: 'other-org' });
  expect(downloadContractFile).not.toHaveBeenCalled();
});

test('Redacted DOCX uses the same organization access and returns only the generated reading copy', async () => {
  const result = await getRedactedContractDocx('org', 'contract');
  expect(result.buffer.toString()).toBe('masked');
  expect(result.fileName).toBe('test-redacted.docx');
  expect(redactDocx).toHaveBeenCalledWith(Buffer.from('original'), 'Private text', ['national_id']);
});

test('A non-DOCX contract cannot accidentally return a raw file through the redacted endpoint', async () => {
  getCurrentVersionWithText.mockResolvedValue({ mimeType: 'application/pdf' });
  await expect(getRedactedContractDocx('org', 'contract')).rejects.toMatchObject({ statusCode: 400 });
  expect(downloadContractFile).not.toHaveBeenCalled();
});
