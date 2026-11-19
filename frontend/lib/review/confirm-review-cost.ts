import { contractsApi } from '@/lib/api/contracts';
import { billingApi } from '@/lib/api/billing';
import { ApiClientError } from '@/lib/api/client';
import type { ReviewBillingConfirmation } from '@/types/contracts';

export type ReviewCostPrompt = {
  contractTitle: string;
  pageCount: number | null;
  units: number;
  available: number | null;
  prepaid: boolean;
};

export type ConfirmReviewCost = (details: ReviewCostPrompt, signal: AbortSignal) => Promise<boolean>;

export async function confirmReviewCost(contractId: string, confirm: ConfirmReviewCost, signal: AbortSignal): Promise<ReviewBillingConfirmation> {
  signal.throwIfAborted();
  const contract = await contractsApi.getContract(contractId);
  const quote = contract.reviewBilling;
  if (!quote?.ready || quote.units === null || !contract.orgId) throw new Error(quote?.reason ?? 'Chưa xác định được số trang. Vui lòng tải lại hợp đồng.');
  const prepaid = quote.purchaseStatus === 'available';
  let available: number | null = null;
  if (!prepaid) {
    const subscription = await billingApi.subscription(contract.orgId);
    if (subscription.status !== 'active') throw new ApiClientError('Cần gói dịch vụ AI đang hoạt động để bắt đầu rà soát.', { status: 403, serverCode: 'AI_PLAN_REQUIRED' });
    if (subscription.analysis.available < quote.units) throw new ApiClientError(`Không đủ lượt rà soát AI. Cần ${quote.units} lượt, còn ${subscription.analysis.available} lượt.`, { status: 403, serverCode: 'ANALYSIS_QUOTA_EXHAUSTED' });
    available = subscription.analysis.available;
  }
  signal.throwIfAborted();
  const accepted = await confirm({ contractTitle: contract.title, pageCount: quote.pageCount, units: quote.units, available, prepaid }, signal);
  signal.throwIfAborted();
  if (!accepted) throw new DOMException('Đã hủy', 'AbortError');
  return { versionId: quote.versionId, units: quote.units };
}
