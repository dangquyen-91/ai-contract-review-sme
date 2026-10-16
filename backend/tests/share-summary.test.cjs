jest.mock('../dist/models/contract.model', () => ({ ContractModel: { findOne: jest.fn() } }));
jest.mock('../dist/models/riskFinding.model', () => ({ RiskFindingModel: { find: jest.fn() } }));
jest.mock('../dist/services/contract/contractVersion.service', () => ({ getCurrentVersionWithText: jest.fn() }));
jest.mock('../dist/services/contract/contractProfile.service', () => ({ resolveContractProfile: jest.fn() }));
const { buildShareSummary, getShareSummary } = require('../dist/services/contract/shareSummary.service');
const { ContractModel } = require('../dist/models/contract.model');
const { RiskFindingModel } = require('../dist/models/riskFinding.model');
const { getCurrentVersionWithText } = require('../dist/services/contract/contractVersion.service');
const { resolveContractProfile } = require('../dist/services/contract/contractProfile.service');
const updatedAt = new Date('2026-10-15T01:00:00Z');

beforeEach(() => {
  jest.clearAllMocks();
  ContractModel.findOne.mockResolvedValue({ type: 'service', status: 'reviewed', updatedAt });
  getCurrentVersionWithText.mockResolvedValue({ _id: 'version', summaryStatus: 'completed', riskDetectionStatus: 'completed', extractedText: '', summaryPoints: ['A short overview'], updatedAt });
  RiskFindingModel.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
  resolveContractProfile.mockResolvedValue({ name: 'Cung ứng dịch vụ' });
});

test('Only the same organization can request the summary; no extraction or findings are read on denial', async () => {
  ContractModel.findOne.mockResolvedValue(null);
  await expect(getShareSummary('other-org', 'contract')).rejects.toMatchObject({ statusCode: 404 });
  expect(ContractModel.findOne).toHaveBeenCalledWith({ _id: 'contract', orgId: 'other-org' });
  expect(getCurrentVersionWithText).not.toHaveBeenCalled();
  expect(RiskFindingModel.find).not.toHaveBeenCalled();
});

test('Changed or incomplete results are not presented as a finished summary', async () => {
  await expect(getShareSummary('org', 'contract', '2020-01-01T00:00:00Z')).rejects.toMatchObject({ statusCode: 409 });
  getCurrentVersionWithText.mockResolvedValue({ summaryStatus: 'completed', riskDetectionStatus: 'processing' });
  await expect(getShareSummary('org', 'contract')).rejects.toMatchObject({ statusCode: 409 });
  expect(RiskFindingModel.find).not.toHaveBeenCalled();
});

test('The summary uses existing results and scopes findings to the contract version and organization', async () => {
  const result = await getShareSummary('org', 'contract', updatedAt.toISOString());
  expect(result.redacted).toBe(true);
  expect(result.text).toContain('A short overview');
  expect(RiskFindingModel.find).toHaveBeenCalledWith({ contractVersionId: 'version', orgId: 'org' });
});

test('Sharing fully replaces recognized personal data including values in titles and recommendations', () => {
  const privateValues = ['Trần Văn Bình', '079203001234', '0071000123456', 'minh@gmail.com', '0903123456'];
  const result = buildShareSummary({
    contractType: 'Dịch vụ', updatedAt,
    sourceText: 'Đại diện: Trần Văn Bình\nCCCD: 079203001234\nSTK: 0071000123456\nEmail: minh@gmail.com\nĐiện thoại: 0903123456',
    summaryPoints: [`Hợp đồng của ${privateValues.join(', ')}`],
    findings: [{ severity: 'high', title: 'Liên hệ Trần Văn Bình qua minh@gmail.com', recommendations: ['Xác nhận STK: 0071000123456'] }],
  });
  for (const value of privateValues) expect(result.text).not.toContain(value);
  expect(result.text).toContain('[Thông tin cá nhân]');
  expect(result.text).not.toContain('•••');
});

test('Priorities show at most three items by severity, count every finding, and do not change the saved results', () => {
  const findings = [
    { severity: 'low', title: 'Low item' }, { severity: 'high', title: 'High one', recommendations: ['Clarify pricing'] },
    { severity: 'medium', title: 'Medium item' }, { severity: 'high', title: 'High two', recommendations: ['Clarify pricing'] },
  ];
  const result = buildShareSummary({ contractType: 'Dịch vụ', updatedAt, sourceText: '', summaryPoints: [], findings });
  expect(result.findingCounts).toEqual({ high: 2, medium: 1, low: 1 });
  expect(result.text.indexOf('High one')).toBeLessThan(result.text.indexOf('Medium item'));
  expect(result.text).not.toContain('Low item');
  expect(result.text).toContain('Còn 1 điểm khác');
  expect(result.text.split('Clarify pricing')).toHaveLength(2);
  expect(findings[0].severity).toBe('low');
});
