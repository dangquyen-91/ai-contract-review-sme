import { AppError } from '../../errors/AppError';

export type UsageKind = 'analysis' | 'chat' | 'drafting';
type CounterField = `${UsageKind}Used` | `${UsageKind}Reserved`;
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
  const limit = period?.plan[`${kind}Limit`] ?? 0;
  return { used, reserved, limit, available: Math.max(0, limit - used - reserved) };
}

export function assertUsageAvailable(period: UsagePeriod, kind: UsageKind, units: number) {
  const { available } = readUsageCounter(period, kind);
  if (units > available) {
    throw AppError.forbidden(
      `Không đủ lượt ${usageLabels[kind]}. Cần ${units} lượt, còn ${available} lượt trong kỳ. Vui lòng nâng cấp gói hoặc chờ kỳ tiếp theo.`,
      quotaErrorCodes[kind],
    );
  }
}
