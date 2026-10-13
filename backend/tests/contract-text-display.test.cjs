jest.mock('../dist/models/contract.model', () => ({ ContractModel: { findOne: jest.fn() } }));
jest.mock('../dist/services/contract/contractVersion.service', () => ({ getCurrentVersionWithText: jest.fn(), getCurrentVersion: jest.fn() }));
jest.mock('../dist/services/contract/contractProfile.service', () => ({ resolveContractProfile: jest.fn(), validateContractContext: jest.fn() }));
jest.mock('../dist/services/contract/extractionWorker.service', () => ({ enqueueExtraction: jest.fn(), waitForExtraction: jest.fn() }));
jest.mock('../dist/services/contract/storage.service', () => ({}));
jest.mock('../dist/config/logger', () => ({ logger: { warn: jest.fn() } }));

const { getContractText } = require('../dist/services/contract/contract.service');
const { ContractModel } = require('../dist/models/contract.model');
const { getCurrentVersionWithText } = require('../dist/services/contract/contractVersion.service');
const { resolveContractProfile } = require('../dist/services/contract/contractProfile.service');
const source = 'STK: 0071000123456\nCCCD: 079203001234';

beforeEach(() => {
  jest.clearAllMocks();
  ContractModel.findOne.mockResolvedValue({ type: 'service' });
  getCurrentVersionWithText.mockResolvedValue({ extractedText: source, extractionStatus: 'completed' });
  resolveContractProfile.mockResolvedValue({ redactionPolicy: ['bank_account', 'national_id'] });
});

test('Partial preview retains organization-scoped contract access', async () => {
  ContractModel.findOne.mockResolvedValue(null);
  await expect(getContractText('other-org', 'contract', true, 'partial')).rejects.toThrow('Contract not found');
  expect(ContractModel.findOne).toHaveBeenCalledWith({ _id: 'contract', orgId: 'other-org' });
  expect(getCurrentVersionWithText).not.toHaveBeenCalled();
});

test('Partial response contains displayed positions and no sensitive original values', async () => {
  const result = await getContractText('org', 'contract', true, 'partial');
  expect(result.redactionMode).toBe('partial');
  expect(result.redactionSpans).toHaveLength(2);
  expect(result.text).toBe('STK: •••• •••• 3456\nCCCD: •••• •••• ••••');
  expect(JSON.stringify(result)).not.toContain('0071000123456');
  expect(JSON.stringify(result)).not.toContain('079203001234');
});

test('Existing token and full-text responses remain compatible', async () => {
  const tokenResult = await getContractText('org', 'contract', true);
  expect(tokenResult.text).toBe('STK: [BANK_ACCOUNT_1]\nCCCD: [ID_NUMBER_1]');
  const fullResult = await getContractText('org', 'contract', false, 'partial');
  expect(fullResult.text).toBe(source);
  expect(fullResult.redacted).toBe(false);
  expect(fullResult.redactionMode).toBeUndefined();
});
