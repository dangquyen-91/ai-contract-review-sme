import { ContractModel } from '../../models/contract.model';
import { RiskFindingModel } from '../../models/riskFinding.model';
import { SENSITIVE_DATA_TYPES } from '../../models/contractProfile.model';
import { AppError } from '../../errors/AppError';
import { createRedactor } from '../ai/redaction.service';
import { findResultReviewId, getCurrentVersionWithText } from './contractVersion.service';
import { resolveContractProfile } from './contractProfile.service';

type Finding = {
  checkGroup?: string | null;
  outcome?: string | null;
  label?: string | null;
  severity?: string | null;
  title: string;
  recommendations?: string[];
};

const GROUP_ORDER: Record<string, number> = { compliance: 0, clarity: 1, completeness: 2, balance: 3 };
const LEGACY_ORDER: Record<string, number> = { high: 10, medium: 11, low: 12 };
const LEGACY_LABELS: Record<string, string> = { high: 'Cao', medium: 'Trung bình', low: 'Thấp' };

const rankOf = (finding: Finding) =>
  finding.checkGroup ? (GROUP_ORDER[finding.checkGroup] ?? 9) : (LEGACY_ORDER[finding.severity ?? ''] ?? 20);
const labelOf = (finding: Finding) => finding.label ?? LEGACY_LABELS[finding.severity ?? ''] ?? 'Lưu ý';

function countLineOf(counts: { violations: number; unclear: number; missing: number; negotiable: number; total: number }, legacy: boolean) {
  if (legacy) return `Phát hiện ${counts.total} vấn đề trong kết quả rà soát trước đây.`;
  if (counts.total === 0) return 'Không phát hiện vấn đề theo các tiêu chí đã kiểm tra.';
  const parts = [
    counts.violations ? `${counts.violations} vi phạm` : '',
    counts.unclear ? `${counts.unclear} chưa rõ ràng` : '',
    counts.missing ? `${counts.missing} thiếu nội dung` : '',
    counts.negotiable ? `${counts.negotiable} nên thương lượng` : '',
  ].filter(Boolean);
  return `Phát hiện ${counts.total} vấn đề: ${parts.join(', ')}.`;
}

export function buildShareSummary(input: {
  contractType: string;
  reference?: string;
  sourceText: string;
  summaryPoints: string[];
  findings: Finding[];
  updatedAt: Date;
}) {
  const reportable = input.findings.filter((finding) => finding.checkGroup !== 'referral' && finding.outcome !== 'unverified');
  const ordered = [...reportable].sort((a, b) => rankOf(a) - rankOf(b));
  const legacy = ordered.length > 0 && ordered.every((finding) => !finding.checkGroup);
  const counts = {
    violations: ordered.filter((finding) => finding.checkGroup === 'compliance').length,
    unclear: ordered.filter((finding) => finding.checkGroup === 'clarity').length,
    missing: ordered.filter((finding) => finding.checkGroup === 'completeness').length,
    negotiable: ordered.filter((finding) => finding.checkGroup === 'balance').length,
    unverified: input.findings.filter((finding) => finding.outcome === 'unverified').length,
    total: ordered.length,
  };
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
    countLineOf(counts, legacy),
    ...(counts.unverified ? [`${counts.unverified} điểm chưa xác minh được điều kiện áp dụng.`] : []),
    '',
    'VẤN ĐỀ CẦN XỬ LÝ',
    ...(priorities.length
      ? priorities.map((finding, index) => `${index + 1}. [${labelOf(finding)}] ${clean(finding.title, 180)}`)
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
    }).select('severity checkGroup outcome label title recommendations verification')
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
