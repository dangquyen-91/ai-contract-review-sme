"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import { useSubscriptionManagement } from "@/hooks/subscription/use-subscription-management";
import { useSubscriptionPlans } from "@/hooks/subscription/use-subscription-plans";
import type { SubscriptionPlan } from "@/types/subscription";
import { PaymentHistory } from "./payment-history";

const date = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

export function SubscriptionManagement({ orgId }: { orgId: string }) {
  const { subscription, schedule, cancel } = useSubscriptionManagement(orgId);
  const plans = useSubscriptionPlans();
  const [action, setAction] = useState<SubscriptionPlan | "cancel" | null>(
    null,
  );
  const lock = useRef(false);
  const pending = schedule.isPending || cancel.isPending;
  const current = subscription.data;
  const targets =
    plans.data?.filter(
      (plan) =>
        current?.plan &&
        plan.audience === current.plan.audience &&
        plan.price < current.plan.price,
    ) ?? [];
  return (
    <>
      <section className="mt-6 rounded-xl border border-border bg-card p-5 text-card-foreground">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Gói dịch vụ hiện tại</h2>
          <Button variant="outline" size="sm" asChild>
            <Link
              href={`/goi-dich-vu?audience=${current?.plan?.audience ?? "personal"}`}
            >
              Xem các gói
            </Link>
          </Button>
        </div>
        {subscription.isPending ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Đang tải gói dịch vụ…
          </p>
        ) : subscription.error ? (
          <div role="alert" className="mt-3 text-sm text-destructive">
            {subscription.error.message}{" "}
            <Button variant="link" onClick={() => subscription.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          current && (
            <div className="mt-3 space-y-3 text-sm">
              <p>
                <strong>
                  {current.plan?.name ?? "Chưa có gói đang hoạt động"}
                </strong>
                {current.endsAt && ` · Kết thúc kỳ: ${date(current.endsAt)}`}
              </p>
              <p className="text-muted-foreground">
                Rà soát còn {current.analysis.available}/
                {current.analysis.limit} lượt (1 lượt/5 trang) · Chat còn{" "}
                {current.chat.available}/{current.chat.limit}
                {current.plan?.audience === "business" &&
                  ` · Thành viên ${current.members.count}/${current.members.limit}`}
              </p>
              {current.plan?.audience === "business" && (
                <p className="text-muted-foreground">
                  Soạn hợp đồng AI còn {current.drafting?.available ?? 0}/
                  {current.drafting?.limit ?? 0} lượt · Dùng chung trong tổ chức
                </p>
              )}
              {current.plan &&
                current.plan.price > 0 &&
                !current.scheduledDowngrade && (
                  <Button asChild variant="outline">
                    <Link
                      href={`/goi-dich-vu/xac-nhan?plan=${current.plan.code}`}
                    >
                      Gia hạn gói hiện tại
                    </Link>
                  </Button>
                )}
              {current.scheduledDowngrade &&
                plans.data?.find(
                  (plan) => plan.code === current.scheduledDowngrade?.planCode,
                )?.price !== 0 && (
                  <Button asChild>
                    <Link
                      href={`/goi-dich-vu/xac-nhan?plan=${current.scheduledDowngrade.planCode}`}
                    >
                      Thanh toán kỳ hạ gói
                    </Link>
                  </Button>
                )}
              {current.scheduledDowngrade && (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3">
                  <p>
                    Đã lên lịch chuyển sang{" "}
                    <strong>
                      {plans.data?.find(
                        (plan) =>
                          plan.code === current.scheduledDowngrade?.planCode,
                      )?.name ?? current.scheduledDowngrade.planCode}
                    </strong>{" "}
                    từ {date(current.scheduledDowngrade.effectiveAt)}.
                  </p>
                  <Button
                    variant="outline"
                    disabled={pending}
                    onClick={() => {
                      cancel.reset();
                      setAction("cancel");
                    }}
                  >
                    Hủy lịch hạ gói
                  </Button>
                </div>
              )}
              {plans.error && (
                <p role="alert">
                  Không tải được các gói.{" "}
                  <Button variant="link" onClick={() => plans.refetch()}>
                    Thử lại
                  </Button>
                </p>
              )}
              {current.status === "active" && targets.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {targets.map((plan) => (
                    <Button
                      key={plan.code}
                      variant="outline"
                      disabled={
                        pending || current.members.count > plan.memberLimit
                      }
                      onClick={() => {
                        schedule.reset();
                        setAction(plan);
                      }}
                    >
                      Hạ xuống {plan.name}
                      {current.members.count > plan.memberLimit
                        ? ` (tối đa ${plan.memberLimit} thành viên)`
                        : ""}
                    </Button>
                  ))}
                </div>
              )}
              {current.plan && current.plan.price > 0 && (
                <p className="text-xs leading-5 text-muted-foreground">
                  Hạ gói có hiệu lực sau các kỳ đã thanh toán. Gói trả phí ở kỳ
                  tiếp theo vẫn cần thanh toán; đặt lịch chưa kích hoạt gói mới.
                </p>
              )}
            </div>
          )
        )}
        {action && (
          <ConfirmActionDialog
            title={
              action === "cancel" ? "Hủy lịch hạ gói?" : "Đặt lịch hạ gói?"
            }
            description={
              action === "cancel"
                ? "Lịch hạ gói hiện tại sẽ được gỡ bỏ. Gói đang sử dụng giữ nguyên đến hết kỳ."
                : `Chuyển sang ${action.name} sau các kỳ đã thanh toán. Hạn mức hiện tại không thay đổi ngay.`
            }
            confirmLabel={
              action === "cancel" ? "Hủy lịch hạ gói" : "Đặt lịch hạ gói"
            }
            pending={pending}
            error={
              (action === "cancel" ? cancel.error : schedule.error)?.message
            }
            onCancel={() => setAction(null)}
            onConfirm={async () => {
              if (lock.current) return;
              lock.current = true;
              try {
                if (action === "cancel") await cancel.mutateAsync();
                else await schedule.mutateAsync(action.code);
                setAction(null);
                toast.success("Đã cập nhật lịch hạ gói.");
              } catch {
                /* Keep error visible for retry. */
              } finally {
                lock.current = false;
              }
            }}
          />
        )}
      </section>
      <div className="mt-6">
        <PaymentHistory orgId={orgId} />
      </div>
    </>
  );
}
