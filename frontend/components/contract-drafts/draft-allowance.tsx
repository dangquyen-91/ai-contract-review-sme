import { Button } from "@/components/ui/button";
import type { OrganizationSubscription } from "@/types/subscription";

function quotaMessage(subscription?: OrganizationSubscription) {
  if (subscription?.status !== "active")
    return " Cần gói doanh nghiệp đang hoạt động.";
  if ((subscription.drafting?.available ?? 0) < 1)
    return " Đã hết lượt soạn trong kỳ.";
  return "";
}

export function DraftAllowance({
  subscription,
  loading,
  onRefresh,
}: {
  subscription?: OrganizationSubscription;
  loading: boolean;
  onRefresh: () => void;
}) {
  const quota = subscription?.drafting;
  const loadingMessage = loading
    ? "Đang tải hạn mức…"
    : "Chưa tải được hạn mức. Chọn Cập nhật để thử lại.";
  return (
    <div
      className="mt-4 rounded-xl border border-blue-100 bg-white/80 p-3 text-xs leading-5 text-slate-600"
      aria-label="Hạn mức soạn hợp đồng AI"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <strong>Lượt soạn AI của tổ chức</strong>
        <Button
          variant="ghost"
          size="sm"
          disabled={loading}
          onClick={onRefresh}
        >
          Cập nhật
        </Button>
      </div>
      {quota ? (
        <p>
          Còn{" "}
          <strong>
            {quota.available}/{quota.limit}
          </strong>{" "}
          lượt · Đang giữ {quota.reserved} lượt.
          {quotaMessage(subscription)}
        </p>
      ) : (
        <p>{loadingMessage}</p>
      )}
      <p className="mt-2">
        Mỗi lần AI tạo hoặc tạo lại thành công dùng <strong>1 lượt soạn</strong>
        . Lỗi không trừ lượt. Lưu, sửa, duyệt và tải file không trừ lượt.
      </p>
    </div>
  );
}
