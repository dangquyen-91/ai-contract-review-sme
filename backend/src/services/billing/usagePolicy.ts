import { AppError } from '../../errors/AppError';

export type UsageKind = 'analysis' | 'chat' | 'drafting';
type CounterField = `${UsageKind}Used` | `${UsageKind}Reserved` | `${UsageKind}Bonus`;
type LimitField = `${UsageKind}Limit`;
type UsagePeriod = Partial<Record<CounterField, number | null>> & {
  plan: Partial<Record<LimitField, number | null>>;
};

const usageLabels = {
  analysis: 'rà soát AI',
  chat: 'trò chuyện với AI',
  drafting: 'soạn hợp đồng AI',
} as const;

const quotaErrorCodes = {
  analysis: 'ANALYSIS_QUOTA_EXHAUSTED',
  chat: 'CHAT_QUOTA_EXHAUSTED',
  drafting: 'DRAFTING_QUOTA_EXHAUSTED',
} as const;

export function readUsageCounter(period: UsagePeriod | null | undefined, kind: UsageKind) {
  const used = period?.[`${kind}Used`] ?? 0;
  const reserved = period?.[`${kind}Reserved`] ?? 0;
  const planLimit = period?.plan[`${kind}Limit`] ?? 0;
  const bonus = period?.[`${kind}Bonus`] ?? 0;
  const limit = planLimit + bonus;
  return {
    used,
    reserved,
    limit,
    planLimit,
    bonus,
    available: Math.max(0, limit - used - reserved),
  };
}

// Plan units are spent first, so whatever remains up to the purchased bonus is
// still the customer's paid top-up.
export function unusedBonus(period: UsagePeriod | null | undefined, kind: UsageKind) {
  const { bonus, available } = readUsageCounter(period, kind);
  return Math.min(bonus, available);
}

export function assertUsageAvailable(period: UsagePeriod, kind: UsageKind, units: number) {
  const { available } = readUsageCounter(period, kind);
  if (units > available) {
    throw AppError.forbidden(
      `Không đủ lượt ${usageLabels[kind]}. Cần ${units} lượt, còn ${available} lượt trong kỳ. Vui lòng mua thêm lượt, nâng cấp gói hoặc chờ kỳ tiếp theo.`,
      quotaErrorCodes[kind],
    );
  }
}
