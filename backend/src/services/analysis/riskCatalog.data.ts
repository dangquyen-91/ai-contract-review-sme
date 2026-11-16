import type { RISK_CODES, RISK_SEVERITIES } from '../../models/riskFinding.model';

export type RiskCode = (typeof RISK_CODES)[number];
type Severity = (typeof RISK_SEVERITIES)[number];

export type RiskGroup = 'unlawful' | 'unfavorable' | 'ambiguous' | 'missing' | 'other';

export interface RiskCatalogEntry {
  group: RiskGroup;
  name: string;
  description: string;
  severities: Severity[];
}

export const RISK_CATALOG: Record<RiskCode, RiskCatalogEntry> = {
  UNLAWFUL_TERM: {
    group: 'unlawful',
    name: 'Điều khoản trái quy định bắt buộc của pháp luật',
    description: 'The clause breaks a mandatory or prohibitive rule of Vietnamese law (exceeds a legal cap, is expressly forbidden, or is void by law).',
    severities: ['medium', 'high'],
  },
  MISSING_MANDATORY_FORM: {
    group: 'unlawful',
    name: 'Thiếu hình thức bắt buộc',
    description: 'The contract does not meet a form the law requires, such as notarization, certification or a written form.',
    severities: ['high'],
  },
  UNILATERAL_TERMINATION: {
    group: 'unfavorable',
    name: 'Bên kia được đơn phương chấm dứt bất lợi',
    description: 'The other party may terminate unilaterally without cause, without notice, or on terms that leave the user unprotected.',
    severities: ['medium', 'high'],
  },
  AUTO_RENEWAL: {
    group: 'unfavorable',
    name: 'Tự động gia hạn không có cơ chế thông báo',
    description: 'The contract renews automatically without a notice period or an easy way for the user to opt out.',
    severities: ['low', 'medium'],
  },
  EXCESSIVE_PENALTY: {
    group: 'unfavorable',
    name: 'Phạt hoặc mất tiền quá nặng',
    description: 'A penalty, forfeited deposit or non-refundable fee is disproportionately heavy for the user, even if it stays within legal caps.',
    severities: ['medium', 'high'],
  },
  LIABILITY_LIMITATION: {
    group: 'unfavorable',
    name: 'Bên kia giới hạn hoặc miễn trách nhiệm',
    description: 'The other party caps, excludes or waives its own liability in a way that shifts risk to the user.',
    severities: ['medium', 'high'],
  },
  ONE_SIDED_INDEMNITY: {
    group: 'unfavorable',
    name: 'Bồi hoàn, bồi thường một chiều',
    description: 'Only the user must indemnify or compensate, or the indemnity is much broader on the user\'s side.',
    severities: ['medium', 'high'],
  },
  UNFAVORABLE_PAYMENT: {
    group: 'unfavorable',
    name: 'Điều kiện thanh toán bất lợi',
    description: 'Payment terms hurt the user: large prepayment, long delays before the user gets paid, high late interest, or unclear price adjustment.',
    severities: ['low', 'medium', 'high'],
  },
  ONE_SIDED_OBLIGATION: {
    group: 'unfavorable',
    name: 'Nghĩa vụ mất cân đối',
    description: 'Obligations or rights are clearly imbalanced against the user without a matching counter-obligation.',
    severities: ['medium'],
  },
  BROAD_EXCLUSION: {
    group: 'unfavorable',
    name: 'Điều khoản loại trừ quá rộng',
    description: 'Exclusions from coverage, warranty or benefits are so broad or vague that the user may lose the protection they pay for.',
    severities: ['medium', 'high'],
  },
  IP_DATA_RISK: {
    group: 'unfavorable',
    name: 'Rủi ro sở hữu trí tuệ hoặc dữ liệu',
    description: 'Ownership of intellectual property, work results or data, or the handling of personal data, is unfavorable to the user.',
    severities: ['medium', 'high'],
  },
  UNFAVORABLE_DISPUTE_FORUM: {
    group: 'unfavorable',
    name: 'Cách giải quyết tranh chấp bất lợi',
    description: 'The dispute forum, governing law or procedure is unfavorable or costly for the user.',
    severities: ['low', 'medium'],
  },
  VAGUE_SCOPE: {
    group: 'ambiguous',
    name: 'Phạm vi, đối tượng mơ hồ',
    description: 'The subject matter, scope of work or deliverables are not defined clearly enough to prove what was agreed.',
    severities: ['low', 'medium'],
  },
  AMBIGUOUS_TERM: {
    group: 'ambiguous',
    name: 'Điều khoản mơ hồ',
    description: 'Another term (deadline, condition, definition, quality standard) is ambiguous and open to conflicting interpretations.',
    severities: ['low', 'medium'],
  },
  MISSING_CLAUSE: {
    group: 'missing',
    name: 'Thiếu điều khoản bắt buộc',
    description: 'A clause type normally required for this kind of contract is missing entirely.',
    severities: ['medium'],
  },
  MISSING_PROTECTION: {
    group: 'missing',
    name: 'Thiếu nội dung bảo vệ quan trọng',
    description: 'The clause exists but leaves out an important protection for the user (for example no remedy, no deadline, no compensation level).',
    severities: ['low', 'medium'],
  },
  OTHER: {
    group: 'other',
    name: 'Rủi ro khác',
    description: 'A real risk that does not fit any other code.',
    severities: ['low', 'medium'],
  },
};
