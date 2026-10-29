import { contractsApi } from '@/lib/api/contracts';
import { billingApi } from '@/lib/api/billing';
import { ApiClientError } from '@/lib/api/client';
import type { ReviewBillingConfirmation } from '@/types/contracts';

export async function confirmReviewCost(contractId: string): Promise<ReviewBillingConfirmation> {
  const contract = await contractsApi.getContract(contractId);
  const quote = contract.reviewBilling;
  if (!quote?.ready || quote.units === null || !contract.orgId) throw new Error(quote?.reason ?? 'Chưa xác định được số trang. Vui lòng tải lại hợp đồng.');
  if (quote.purchaseStatus === 'available') {
    if (!window.confirm(`Phiên bản hợp đồng ${quote.pageCount} trang đã được thanh toán riêng. Bắt đầu rà soát, không trừ lượt trong gói?`)) throw new DOMException('Đã hủy', 'AbortError');
    return { versionId: quote.versionId, units: quote.units };
  }
  const subscription = await billingApi.subscription(contract.orgId);
  if (subscription.status !== 'active') throw new ApiClientError('Cần gói dịch vụ AI đang hoạt động để bắt đầu rà soát.', { status: 403, serverCode: 'AI_PLAN_REQUIRED' });
  if (subscription.analysis.available < quote.units) throw new ApiClientError(`Không đủ lượt rà soát AI. Cần ${quote.units} lượt, còn ${subscription.analysis.available} lượt.`, { status: 403, serverCode: 'ANALYSIS_QUOTA_EXHAUSTED' });
  if (!window.confirm(`Hợp đồng có ${quote.pageCount} trang, cần ${quote.units} lượt rà soát (1 lượt/5 trang). Bạn còn ${subscription.analysis.available} lượt. Chỉ trừ khi hoàn tất; lỗi hoặc hủy sẽ hoàn lượt. Tiếp tục?`)) throw new DOMException('Đã hủy', 'AbortError');
  return { versionId: quote.versionId, units: quote.units };
}
