import { ContractModel } from '../../models/contract.model';
import { RiskFindingModel } from '../../models/riskFinding.model';
import { SENSITIVE_DATA_TYPES } from '../../models/contractProfile.model';
import { AppError } from '../../errors/AppError';
import { createRedactor } from '../ai/redaction.service';
import { findResultReviewId, getCurrentVersionWithText } from './contractVersion.service';
import { resolveContractProfile } from './contractProfile.service';
import { countIssues, groupRank, issueCountLine } from '../playbook/playbook.service';

type Finding = {
  checkGroup: string;
  outcome: string;
  label: string;
  title: string;
  recommendations?: string[];
};

export function buildShareSummary(input: {
  contractType: string;
  reference?: string;
  sourceText: string;
  summaryPoints: string[];
  findings: Finding[];
  updatedAt: Date;
}) {
  const ordered = input.findings
    .filter((finding) => finding.outcome === 'failed')
    .sort((a, b) => groupRank(a.checkGroup) - groupRank(b.checkGroup));
  const counts = countIssues(input.findings);
  const priorities = ordered.slice(0, 3);
  const recommendations = [
    ...new Set(priorities.flatMap((finding) => finding.recommendations ?? [])),
  ].slice(0, 3);
  const source = [
    input.sourceText,
    input.contractType,
    ...input.summaryPoints,
    ...ordered.flatMap((finding) => [finding.title, ...(finding.recommendations ?? [])]),
  ]
    .join('\n')
    .normalize('NFC');
  const redactor = createRedactor(source, SENSITIVE_DATA_TYPES);
  const clean = (value: string, length: number) => {
    const masked = redactor
      .mask(value.normalize('NFC'))
      .replace(
        /\[(?:PERSON|ID_NUMBER|PASSPORT|DOB|PHONE|EMAIL|BANK_ACCOUNT|ADDRESS|TAX_CODE|LAND_CERT)_\d+\]/g,
        '[Thông tin cá nhân]',
      )
      .replace(/\s+/g, ' ')
      .trim();
    return masked.length > length ? `${masked.slice(0, length).trimEnd()}…` : masked;
  };
  const lines = [
    'TÓM TẮT RÀ SOÁT HỢP ĐỒNG',
    `Loại hợp đồng: ${clean(input.contractType, 120)}`,
    ...(input.reference ? [`Mã tham chiếu: ${clean(input.reference, 64)}`] : []),
    `Cập nhật phân tích: ${input.updatedAt.toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })}`,
    '',
    'TỔNG QUAN',
    ...input.summaryPoints.slice(0, 2).map((point) => `• ${clean(point, 240)}`),
    issueCountLine(counts),
    ...(counts.unverified ? [`${counts.unverified} điểm chưa xác minh được điều kiện áp dụng.`] : []),
    '',
    'VẤN ĐỀ CẦN XỬ LÝ',
    ...(priorities.length
      ? priorities.map((finding, index) => `${index + 1}. [${finding.label}] ${clean(finding.title, 180)}`)
      : ['Không có vấn đề nào cần xử lý trong kết quả đã lưu.']),
    ...(ordered.length > 3 ? [`Còn ${ordered.length - 3} điểm khác trong báo cáo đầy đủ.`] : []),
    '',
    'HƯỚNG XỬ LÝ ĐỀ XUẤT',
    ...(recommendations.length
      ? recommendations.map((item) => `• ${clean(item, 200)}`)
      : ['Đối chiếu báo cáo đầy đủ và nội dung hợp đồng trước khi quyết định.']),
    '',
    'Nội dung do AI hỗ trợ rà soát, không thay thế ý kiến tư vấn pháp lý.',
  ];
  return { text: lines.join('\n'), redacted: true as const, issueCounts: counts };
}

export async function getShareSummary(
  orgId: string,
  contractId: string,
  expectedUpdatedAt?: string,
) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
  if (expectedUpdatedAt && new Date(expectedUpdatedAt).getTime() !== contract.updatedAt.getTime()) {
    throw AppError.conflict('Contract changed. Reload the review result before sharing.');
  }
  const version = await getCurrentVersionWithText(contractId);
  if (
    contract.status === 'processing' ||
    version.summaryStatus !== 'completed' ||
    version.riskDetectionStatus !== 'completed'
  ) {
    throw AppError.conflict('Complete the analysis before creating a share summary.');
  }
  const findings = (
    await RiskFindingModel.find({
      contractVersionId: version._id,
      reviewId: await findResultReviewId(version._id),
      orgId,
    }).select('checkGroup outcome label title recommendations verification')
  ).filter((finding) => finding.verification?.verdict !== 'rejected');
  if (!contract.type) throw AppError.conflict('Complete the analysis before creating a share summary.');
  const profile = await resolveContractProfile(contract.type);
  return buildShareSummary({
    contractType: profile.name,
    reference: contractId,
    sourceText: version.extractedText ?? '',
    summaryPoints: version.summaryPoints ?? [],
    findings,
    updatedAt: version.updatedAt,
  });
}
