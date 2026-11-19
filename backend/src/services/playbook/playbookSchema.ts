import type { ClauseCategory } from '../../models/clauseTypeTaxonomy.model';
import type { LegalSourceCode } from '../legal/legalSourceCatalog.data';

export const PLAYBOOK_VERSION = '1.0.0';

export const CHECK_GROUPS = ['clarity', 'completeness', 'balance', 'compliance'] as const;
export type CheckGroup = (typeof CHECK_GROUPS)[number];

export const CHECK_GROUP_NAMES: Record<CheckGroup, string> = {
  clarity: 'Rõ ràng',
  completeness: 'Đầy đủ',
  balance: 'Cân bằng',
  compliance: 'Tuân thủ pháp luật',
};

export const FAILED_CHECK_LABELS: Record<CheckGroup, string> = {
  clarity: 'Chưa rõ ràng',
  completeness: 'Thiếu nội dung',
  balance: 'Nên thương lượng',
  compliance: 'Vi phạm',
};

export const UNVERIFIED_COMPLIANCE_LABEL = 'Chưa xác minh được';
export const NOT_CHECKED_LABEL = 'Không kiểm tra được';
export const NO_VERIFIED_LEGAL_BASIS = 'Không có căn cứ pháp lý được xác minh';
export const FALLBACK_RULE_PREFIX = 'Quy định áp dụng khi hợp đồng không thoả thuận';

export const ASPECTS = ['who', 'what', 'how_much', 'when', 'where', 'how', 'condition'] as const;
export type Aspect = (typeof ASPECTS)[number];

export const ASPECT_NAMES: Record<Aspect, string> = {
  who: 'Ai',
  what: 'Cái gì',
  how_much: 'Bao nhiêu',
  when: 'Khi nào',
  where: 'Ở đâu',
  how: 'Như thế nào',
  condition: 'Điều kiện',
};

export const FIELD_KINDS = [
  'party',
  'text',
  'money',
  'number',
  'percent',
  'interest_rate',
  'months',
  'days',
  'hours',
  'date_or_event',
  'boolean',
] as const;
export type FieldKind = (typeof FIELD_KINDS)[number];

export const NUMERIC_FIELD_KINDS: FieldKind[] = ['money', 'number', 'percent', 'interest_rate', 'months', 'days', 'hours'];

export interface PlaybookField {
  key: string;
  label: string;
  aspect: Aspect;
  kind: FieldKind;
  deferrable?: boolean;
  extraction: string;
}

export interface NotApplicableAspect {
  aspect: Aspect;
  reason: string;
}

export interface LegalArticleRef {
  sourceCode: LegalSourceCode;
  article: number;
  clause?: number;
  verifyText: string;
}

const fact = (label: string, extraction: string) => ({ label, extraction });

export const CONTRACT_FACTS = {
  commercial_contract: fact(
    'Hợp đồng thương mại',
    'At least one party is a trader: an enterprise ("công ty", "doanh nghiệp"), a cooperative or a registered business household.',
  ),
  no_foreign_exchange_exemption: fact(
    'Không thuộc trường hợp được dùng ngoại hối',
    'Every party is a resident of Vietnam, no party is an export-processing enterprise, and the contract is not an import/export entrustment or a contract with a foreign party.',
  ),
  seller_is_developer: fact(
    'Bên bán là chủ đầu tư dự án',
    'The seller is the investor of a real estate project ("chủ đầu tư dự án").',
  ),
  off_plan_home: fact(
    'Nhà ở hình thành trong tương lai',
    'The home or building sold is not built or not completed yet ("hình thành trong tương lai").',
  ),
  seller_is_foreign_invested: fact(
    'Bên bán là tổ chức kinh tế có vốn đầu tư nước ngoài',
    'The seller is an economic organization with foreign investment capital.',
  ),
  seller_not_real_estate_business: fact(
    'Bên bán không kinh doanh bất động sản',
    'The seller is an individual or an organization that does not run a real estate business, so the sale is not a real estate business transaction.',
  ),
  contract_term_under_one_month: fact(
    'Hợp đồng lao động dưới 01 tháng',
    'The labor contract has a fixed term shorter than one month.',
  ),
  employee_is_enterprise_manager: fact(
    'Người lao động là người quản lý doanh nghiệp',
    'The job is an enterprise manager position under the Law on Enterprises (for example director, general director, member of the board).',
  ),
  job_requires_college_degree: fact(
    'Công việc cần trình độ cao đẳng trở lên',
    'The job title requires professional or technical qualifications at college level or higher.',
  ),
  job_requires_intermediate_or_technical: fact(
    'Công việc cần trình độ trung cấp, công nhân kỹ thuật, nhân viên nghiệp vụ',
    'The job title requires intermediate-level qualifications, or is a technical worker or professional staff position.',
  ),
  standard_overtime_sector: fact(
    'Ngành nghề không được làm thêm đến 300 giờ/năm',
    'The job is not in a sector, trade or case that the law allows to work up to 300 overtime hours per year.',
  ),
  employee_is_vietnamese: fact(
    'Người lao động là công dân Việt Nam',
    'The employee is a Vietnamese citizen, not a foreign national working in Vietnam.',
  ),
  employee_in_compulsory_insurance: fact(
    'Người lao động thuộc diện bảo hiểm xã hội bắt buộc',
    'Under the law the employee is subject to compulsory social insurance: decide only from the employee\'s nationality and the contract term (a Vietnamese employee with a labor contract of one month or longer is subject). Ignore what the contract agrees about joining or not joining insurance; an agreement not to join does not make this false.',
  ),
  labor_contract_indefinite: fact(
    'Hợp đồng lao động không xác định thời hạn',
    'The labor contract has no fixed term.',
  ),
  labor_contract_12_to_36_months: fact(
    'Hợp đồng lao động từ 12 đến 36 tháng',
    'The labor contract has a fixed term from 12 to 36 months.',
  ),
  labor_contract_under_12_months: fact(
    'Hợp đồng lao động dưới 12 tháng',
    'The labor contract has a fixed term shorter than 12 months.',
  ),
} as const;
export type ContractFact = keyof typeof CONTRACT_FACTS;

export interface Applicability {
  contractTypes: string[];
  partyRoles?: string[];
  requiresUserParty?: boolean;
  facts?: ContractFact[];
}

export type FieldCondition =
  | { field: string; op: 'greater_than'; value: number }
  | { field: string; op: 'less_than'; value: number }
  | { field: string; op: 'is_true' }
  | { field: string; op: 'not_stated' };

export interface LimitTier {
  facts: ContractFact[];
  limit: number;
}

export type CheckTest =
  | { kind: 'stated'; field: string }
  | { kind: 'at_most'; field: string; limit: number }
  | { kind: 'at_least'; field: string; limit: number }
  | { kind: 'at_most_tiered'; field: string; tiers: LimitTier[]; absoluteLimit?: number }
  | { kind: 'fails_when_all'; conditions: FieldCondition[] }
  | { kind: 'clause_present'; clauseType: ClauseCategory };

export type CheckBasis =
  | { kind: 'criterion' | 'practice' | 'policy'; statement: string; references?: LegalArticleRef[] }
  | { kind: 'law'; statement: string; articles: LegalArticleRef[] };

export interface FallbackRule {
  contractTypes: string[];
  facts?: ContractFact[];
  statement: string;
  article: LegalArticleRef;
}

export const REVIEW_STATUSES = ['draft', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface CheckReview {
  status: ReviewStatus;
  note?: string;
}

export interface PlaybookCheck {
  code: string;
  group: CheckGroup;
  title: string;
  appliesTo: Applicability;
  test: CheckTest;
  basis: CheckBasis;
  question?: string;
  whyItMatters: string;
  suggestion?: string;
  fallbackRules?: FallbackRule[];
  replacesRule?: string;
  review: CheckReview;
}

export interface ClausePlaybook {
  clauseTypes: ClauseCategory[];
  title: string;
  fields: PlaybookField[];
  notApplicable: NotApplicableAspect[];
  checks: PlaybookCheck[];
}

export interface ContractPlaybook {
  contractType: string;
  title: string;
  fields: PlaybookField[];
  checks: PlaybookCheck[];
}
