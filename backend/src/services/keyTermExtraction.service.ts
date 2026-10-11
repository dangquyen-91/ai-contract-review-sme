import { Type } from '@google/genai';
import { z } from 'zod';
import { AppError } from '../errors/AppError';
import { ClauseModel } from '../models/clause.model';
import { ContractModel } from '../models/contract.model';
import { generateJson } from './llm.service';
import { describeReviewContext, ReviewContext } from './contractProfile.service';
import { placeholderInstruction, Redactor } from './redaction.service';
import { getCurrentVersion } from './contractVersion.service';

export type KeyTermType = 'number' | 'boolean';

export interface KeyTermDefinition {
  key: string;
  type: KeyTermType;
  label: string;
  description: string;
  min?: number;
  max?: number;
  absentValue?: boolean;
}

const percent = { min: 0, max: 1000 };

const TERMS = {
  penalty_percent: {
    type: 'number',
    label: 'Mức phạt vi phạm (%)',
    description: 'Contractual penalty for breach ("phạt vi phạm") as a percentage of the value of the breached obligation, e.g. 12 for 12%. If several rates are stated, return the highest. Only when the contract states a percentage; ignore late-payment interest.',
    ...percent,
  },
  penalty_agreed: {
    type: 'boolean',
    label: 'Có thoả thuận phạt vi phạm',
    description: 'true when the contract imposes a penalty for breach ("phạt vi phạm"). Quote the penalty sentence.',
  },
  damages_also_claimable: {
    type: 'boolean',
    label: 'Được đòi cả tiền phạt và bồi thường thiệt hại',
    description: 'true when the contract says the injured party may claim BOTH the penalty and compensation for damages ("bồi thường thiệt hại") for the same breach; false when it says only one of them applies. Omit it when the contract is silent.',
    absentValue: false,
  },
  late_payment_interest_percent_per_year: {
    type: 'number',
    label: 'Lãi chậm thanh toán (%/năm)',
    description: 'Interest charged on late payment, converted to percent per year (a monthly rate x 12, a daily rate x 365), e.g. 0.1%/day -> 36.5.',
    ...percent,
  },
  deposit_percent: {
    type: 'number',
    label: 'Tiền đặt cọc (% giá bán)',
    description: 'Deposit ("đặt cọc") as a percentage of the total price. Compute it from the amounts when only amounts are given, rounded to 2 decimals.',
    ...percent,
  },
  seller_is_developer: {
    type: 'boolean',
    label: 'Bên bán là chủ đầu tư dự án',
    description: 'true when the seller is a real estate developer / project investor ("chủ đầu tư"); false when the seller is an individual or an ordinary owner reselling a home.',
  },
  off_plan: {
    type: 'boolean',
    label: 'Nhà ở hình thành trong tương lai',
    description: 'true when the home is not built or not completed yet ("hình thành trong tương lai", sold off-plan); false when it already exists.',
  },
  first_payment_percent: {
    type: 'number',
    label: 'Lần thanh toán đầu (% giá trị, gồm cọc)',
    description: 'First payment including the deposit, as a percentage of the contract value.',
    ...percent,
  },
  paid_before_handover_percent: {
    type: 'number',
    label: 'Tổng thanh toán trước bàn giao (%)',
    description: 'Total share of the contract value the buyer must pay before the home is handed over.',
    ...percent,
  },
  paid_before_certificate_percent: {
    type: 'number',
    label: 'Tổng thanh toán trước khi cấp sổ (%)',
    description: 'Total share of the contract value the buyer must pay before the ownership certificate ("Giấy chứng nhận", "sổ hồng") is issued.',
    ...percent,
  },
  notarization_agreed: {
    type: 'boolean',
    label: 'Hợp đồng được công chứng, chứng thực',
    description: 'true when the contract says it will be notarized or certified ("công chứng", "chứng thực"); false when it says it will not be. Omit it when the contract is silent.',
    absentValue: false,
  },
  buyer_forfeits_deposit: {
    type: 'boolean',
    label: 'Bên mua mất cọc nếu không thực hiện',
    description: 'true when the buyer loses the deposit if the buyer refuses to sign or perform.',
  },
  seller_deposit_refund_multiple: {
    type: 'number',
    label: 'Bên bán trả lại bao nhiêu lần tiền cọc nếu từ chối',
    description: 'If the seller refuses to sign or perform, how many times the deposit the seller must pay back to the buyer: 1 = only returns the deposit, 2 = returns the deposit plus an equal amount.',
    min: 0,
    max: 100,
  },
  indefinite_term: {
    type: 'boolean',
    label: 'Hợp đồng không xác định thời hạn',
    description: 'true for an indefinite-term labor contract ("không xác định thời hạn"); false for a fixed term.',
  },
  term_months: {
    type: 'number',
    label: 'Thời hạn hợp đồng (tháng)',
    description: 'Length of a fixed-term contract in months (a year = 12, a day = 1/30).',
    min: 0,
    max: 1200,
  },
  probation_days: {
    type: 'number',
    label: 'Thời gian thử việc (ngày)',
    description: 'Probation length in days (a month = 30 days). 0 when the contract states there is no probation.',
    min: 0,
    max: 3650,
  },
  probation_wage_percent: {
    type: 'number',
    label: 'Lương thử việc (% lương chính thức)',
    description: 'Probation wage as a percentage of the official wage for the job. Compute it from the amounts when both are given.',
    ...percent,
  },
  working_hours_per_day: {
    type: 'number',
    label: 'Giờ làm việc bình thường mỗi ngày',
    description: 'Normal working hours per day, excluding overtime.',
    min: 0,
    max: 24,
  },
  working_hours_per_week: {
    type: 'number',
    label: 'Giờ làm việc bình thường mỗi tuần',
    description: 'Normal working hours per week, excluding overtime. Compute it from hours per day x working days when both are given.',
    min: 0,
    max: 168,
  },
  overtime_hours_per_month: {
    type: 'number',
    label: 'Giờ làm thêm tối đa mỗi tháng',
    description: 'Maximum overtime hours per month the employee may be required or agrees to work.',
    min: 0,
    max: 744,
  },
  overtime_hours_per_year: {
    type: 'number',
    label: 'Giờ làm thêm tối đa mỗi năm',
    description: 'Maximum overtime hours per year.',
    min: 0,
    max: 8784,
  },
  annual_leave_days: {
    type: 'number',
    label: 'Số ngày nghỉ hằng năm',
    description: 'Paid annual leave days per full year of work.',
    min: 0,
    max: 365,
  },
  employee_notice_days: {
    type: 'number',
    label: 'Thời hạn báo trước khi người lao động nghỉ (ngày)',
    description: 'Days of notice the employee must give to unilaterally terminate the contract.',
    min: 0,
    max: 3650,
  },
  wage_deduction_percent: {
    type: 'number',
    label: 'Mức khấu trừ lương tối đa mỗi tháng (%)',
    description: 'Maximum share of the monthly wage the employer may deduct (e.g. to compensate damage), as a percentage.',
    ...percent,
  },
  keeps_original_documents: {
    type: 'boolean',
    label: 'Người sử dụng lao động giữ bản chính giấy tờ',
    description: "true when the employer keeps the employee's original identity papers, diplomas or certificates.",
  },
  employee_deposit_required: {
    type: 'boolean',
    label: 'Người lao động phải đặt cọc, ký quỹ',
    description: 'true when the employee must pay a deposit, guarantee money or pledge property to the employer.',
  },
  monetary_fines: {
    type: 'boolean',
    label: 'Phạt tiền, trừ lương khi vi phạm kỷ luật',
    description: 'true when the employer may fine the employee or cut wages as a disciplinary measure.',
  },
  social_insurance_excluded: {
    type: 'boolean',
    label: 'Không tham gia bảo hiểm xã hội bắt buộc',
    description: 'true when the contract says the employee will not join compulsory social insurance, or receives the contribution as cash in the salary instead.',
  },
} satisfies Record<string, Omit<KeyTermDefinition, 'key'>>;

export type KeyTermKey = keyof typeof TERMS;

const definitionsOf = (keys: KeyTermKey[]): KeyTermDefinition[] =>
  keys.map((key) => ({ key, ...(TERMS[key] as Omit<KeyTermDefinition, 'key'>) }));

const CIVIL_PENALTY_TERMS: KeyTermKey[] = ['penalty_agreed', 'damages_also_claimable', 'late_payment_interest_percent_per_year'];

export const KEY_TERMS_BY_PROFILE: Record<string, KeyTermDefinition[]> = {
  sales: definitionsOf(['penalty_percent']),
  service: definitionsOf(['penalty_percent']),
  office_lease: definitionsOf(CIVIL_PENALTY_TERMS),
  housing_purchase: definitionsOf([
    ...CIVIL_PENALTY_TERMS,
    'deposit_percent',
    'seller_is_developer',
    'off_plan',
    'first_payment_percent',
    'paid_before_handover_percent',
    'paid_before_certificate_percent',
    'notarization_agreed',
    'buyer_forfeits_deposit',
    'seller_deposit_refund_multiple',
  ]),
  labor: definitionsOf([
    'indefinite_term',
    'term_months',
    'probation_days',
    'probation_wage_percent',
    'working_hours_per_day',
    'working_hours_per_week',
    'overtime_hours_per_month',
    'overtime_hours_per_year',
    'annual_leave_days',
    'employee_notice_days',
    'wage_deduction_percent',
    'keeps_original_documents',
    'employee_deposit_required',
    'monetary_fines',
    'social_insurance_excluded',
  ]),
  life_insurance: [],
};

export interface ExtractedKeyTerm {
  key: string;
  numberValue?: number;
  booleanValue?: boolean;
  clauseIndex?: number;
  quote?: string;
}

const extractionSchema = z.object({
  terms: z
    .array(
      z.object({
        key: z.string(),
        numberValue: z.number().nullable().optional(),
        booleanValue: z.boolean().nullable().optional(),
        clauseIndex: z.number().int().nullable().optional(),
        quote: z.string().nullable().optional(),
      }),
    )
    .nullable()
    .optional(),
});

const responseSchema = {
  type: Type.OBJECT,
  properties: {
    terms: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          key: { type: Type.STRING },
          numberValue: { type: Type.NUMBER, nullable: true },
          booleanValue: { type: Type.BOOLEAN, nullable: true },
          clauseIndex: { type: Type.INTEGER },
          quote: { type: Type.STRING },
        },
        required: ['key', 'clauseIndex', 'quote'],
      },
    },
  },
  required: ['terms'],
};

function buildPrompt(
  context: ReviewContext,
  definitions: KeyTermDefinition[],
  clauses: { index: number; text: string }[],
  redactionNote: string,
) {
  const termList = definitions
    .map((d) => `- key="${d.key}" (${d.type === 'number' ? 'numberValue' : 'booleanValue'}): ${d.description}`)
    .join('\n');
  const clauseList = clauses.map((c) => `[index=${c.index}] ${c.text}`).join('\n\n');

  return `You extract key terms from a Vietnamese contract so they can be checked against Vietnamese law by fixed rules.

${describeReviewContext(context)}

Terms to extract:
${termList}

Rules:
- Return a term only when the contract actually states it. Never guess or apply legal defaults; leave out terms the contract does not address.
- Put numbers in "numberValue" and true/false in "booleanValue", following each term's type.
- "clauseIndex" is the index of the clause that states the term.
- "quote" is the shortest exact sentence or phrase copied verbatim from that clause that states the term. It must appear word for word in the clause.
- Return each key at most once.${redactionNote}

Clauses:
"""
${clauseList}
"""`;
}

const normalizeForMatch = (value: string) => value.normalize('NFC').replace(/\s+/g, ' ').trim().toLowerCase();

export async function extractKeyTerms(
  context: ReviewContext,
  clauses: { index: number; text: string }[],
  redactor: Redactor,
  signal?: AbortSignal,
): Promise<ExtractedKeyTerm[]> {
  const definitions = KEY_TERMS_BY_PROFILE[context.profileCode] ?? [];
  if (definitions.length === 0 || clauses.length === 0) return [];

  const raw = await generateJson(
    buildPrompt(
      context,
      definitions,
      clauses.map((c) => ({ index: c.index, text: redactor.mask(c.text) })),
      placeholderInstruction(redactor),
    ),
    responseSchema,
    signal,
  );
  const parsed = extractionSchema.safeParse(raw);
  if (!parsed.success) {
    throw AppError.internal('LLM returned an unexpected key term format.');
  }

  const definitionByKey = new Map(definitions.map((d) => [d.key, d]));
  const clauseTextByIndex = new Map(clauses.map((c) => [c.index, normalizeForMatch(c.text)]));
  const terms = new Map<string, ExtractedKeyTerm>();

  for (const item of parsed.data.terms ?? []) {
    const definition = definitionByKey.get(item.key);
    if (!definition || terms.has(item.key)) continue;
    const quote = item.quote ? redactor.unmask(item.quote).trim() : '';
    const clauseText = item.clauseIndex == null ? undefined : clauseTextByIndex.get(item.clauseIndex);
    if (!quote || !clauseText || !clauseText.includes(normalizeForMatch(quote))) continue;

    if (definition.type === 'number') {
      const value = item.numberValue;
      if (typeof value !== 'number' || !Number.isFinite(value)) continue;
      if ((definition.min !== undefined && value < definition.min) || (definition.max !== undefined && value > definition.max)) continue;
      terms.set(item.key, { key: item.key, numberValue: value, clauseIndex: item.clauseIndex!, quote });
    } else {
      if (typeof item.booleanValue !== 'boolean') continue;
      terms.set(item.key, { key: item.key, booleanValue: item.booleanValue, clauseIndex: item.clauseIndex!, quote });
    }
  }

  for (const definition of definitions) {
    if (definition.absentValue !== undefined && !terms.has(definition.key)) {
      terms.set(definition.key, { key: definition.key, booleanValue: definition.absentValue });
    }
  }
  return [...terms.values()];
}

export async function listKeyTerms(orgId: string, contractId: string) {
  const contract = await ContractModel.findOne({ _id: contractId, orgId });
  if (!contract) throw AppError.notFound('Contract not found');
  const version = await getCurrentVersion(contractId);
  const terms = version.keyTerms ?? [];
  const clauseIds = terms.flatMap((t) => (t.clauseId ? [t.clauseId] : []));
  const clauses = clauseIds.length
    ? await ClauseModel.find({ _id: { $in: clauseIds } }).select('index title')
    : [];
  const clauseById = new Map(clauses.map((c) => [c._id.toString(), c]));
  const labelOf = (key: string) => (TERMS as Record<string, { label: string }>)[key]?.label ?? key;

  return {
    extractedAt: version.keyTermsExtractedAt ?? null,
    terms: terms.map((t) => {
      const clause = t.clauseId ? clauseById.get(t.clauseId.toString()) : undefined;
      return {
        key: t.key,
        label: labelOf(t.key),
        value: t.numberValue ?? t.booleanValue ?? null,
        inferredFromSilence: !t.clauseId,
        clause: clause ? { index: clause.index, title: clause.title ?? null } : null,
        quote: t.quote ?? null,
      };
    }),
  };
}
