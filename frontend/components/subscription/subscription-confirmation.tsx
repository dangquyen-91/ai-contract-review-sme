"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useSubscriptionPlans } from "@/hooks/subscription/use-subscription-plans";
import {
  describePlan,
  formatMoney,
} from "@/lib/subscription/subscription-plans";
import { PaymentCheckout } from "./payment-checkout";
import { PaymentHistory } from "./payment-history";
import type { PlanCode } from "@/types/subscription";
import type { AuthUser } from "@/types/auth";

export function SubscriptionConfirmation({
  planCode,
  user,
}: {
  planCode: PlanCode;
  user: AuthUser | null;
}) {
  const query = useSubscriptionPlans();
  const source = query.data?.find((plan) => plan.code === planCode);
  const back = (
    <Link
      className="mb-6 inline-flex items-center gap-2 text-[12px] font-medium text-[#71809a] transition-colors hover:text-[#0066ff]"
      href="/goi-dich-vu"
    >
      <span aria-hidden="true">←</span> Quay lại gói dịch vụ
    </Link>
  );
  if (query.isPending)
    return (
      <>
        {back}
        <p
          role="status"
          className="rounded-2xl border border-[#e2e8f2] bg-white p-7 text-[#61708b]"
        >
          Đang tải thông tin gói…
        </p>
      </>
    );
  if (query.isError)
    return (
      <>
        {back}
        <div
          role="alert"
          className="rounded-2xl border border-[#e2e8f2] bg-white p-7 text-[#080e2f]"
        >
          <h1 className="text-xl font-semibold">Chưa thể tải thông tin gói</h1>
          <p className="mt-2 text-sm text-[#61708b]">{query.error.message}</p>
          <button
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            className="mt-5 min-h-11 rounded-lg border border-[#d3dce9] px-5 text-sm font-semibold disabled:opacity-50"
          >
            {query.isFetching ? "Đang tải…" : "Thử lại"}
          </button>
        </div>
      </>
    );
  if (!source)
    return (
      <>
        {back}
        <h1 className="text-2xl font-semibold text-[#080e2f]">
          Gói dịch vụ hiện không khả dụng
        </h1>
        <p className="mt-3 text-sm text-[#61708b]">
          Vui lòng quay lại danh sách để chọn gói khác.
        </p>
      </>
    );
  const plan = describePlan(source);
  const paymentOrgId =
    user?.orgId && ["owner", "user"].includes(user.role) ? user.orgId : null;

  return (
    <>
      {back}
      <header className="mb-7 text-[#080e2f]">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0066ff]">
          Hoàn tất lựa chọn của bạn
        </p>
        <h1 className="text-[clamp(28px,3vw,36px)] font-semibold leading-tight tracking-[-1.2px]">
          Xác nhận gói dịch vụ
        </h1>
        <p className="mt-2.5 text-[14px] leading-6 text-[#71809a]">
          Kiểm tra quyền lợi và chi phí trước khi thanh toán.
        </p>
      </header>

      <div className="grid items-start gap-5 text-[#080e2f] lg:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-[20px] border border-[#e0e7f2] bg-white">
          <div className="border-b border-[#edf1f7] bg-gradient-to-br from-[#f4f8ff] via-white to-white p-6 sm:p-7">
            <div className="flex items-start gap-3.5">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-[#dbe9ff] bg-white text-[#0066ff]">
                <Icon name={plan.icon} className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#7c8ca5]">
                  {plan.audience === "personal"
                    ? "Không gian cá nhân"
                    : "Không gian tổ chức"}
                </p>
                <h2 className="mt-1 text-[25px] font-semibold leading-tight tracking-[-0.7px]">
                  {plan.name}
                </h2>
              </div>
            </div>
            <p className="mt-4 max-w-md text-[13px] leading-6 text-[#71809a]">
              {plan.description}
            </p>
          </div>
          <div className="p-6 sm:p-7">
            <h3 className="text-[12px] font-semibold text-[#283b5a]">
              Quyền lợi trong mỗi tháng
            </h3>
            <ul className="mt-5 grid gap-4 text-[13px] text-[#455670]">
              {plan.features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-[#edf5ff]">
                    <Icon name="check" className="size-3 text-[#0066ff]" />
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 flex items-start gap-2.5 border-t border-[#edf1f7] pt-5 text-[12px] leading-6 text-[#7b89a0]">
              <Icon
                name="shield"
                className="mt-1 size-4 shrink-0 text-[#91a6c4]"
              />
              <p>
                {plan.audience === "business"
                  ? "Hạn mức dùng chung trong tổ chức. Giới hạn thành viên đã bao gồm Owner."
                  : "Hạn mức dành riêng cho tài khoản. Gói miễn phí được cấp theo tháng dương lịch, giờ Việt Nam."}
              </p>
            </div>
          </div>
        </section>

        <section
          data-checkout-summary
          className="rounded-[20px] border border-[#dce5f3] bg-white p-6 shadow-[0_8px_30px_-20px_#183b7633] sm:p-7 lg:sticky lg:top-6"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#8795ab]">
            Tóm tắt thanh toán
          </p>
          <div className="mt-4 flex items-center justify-between gap-3">
            <h2 className="text-[18px] font-semibold tracking-[-0.4px]">
              {plan.name}
            </h2>
            <span className="shrink-0 rounded-md bg-[#f3f6fb] px-2 py-1 text-[10px] font-medium text-[#71809a]">
              Hàng tháng
            </span>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3 border-t border-[#edf1f7] pt-5">
            <span className="pb-1 text-[12px] text-[#71809a]">
              Tổng thanh toán
            </span>
            <div className="text-right">
              <p className="whitespace-nowrap text-[30px] font-semibold leading-tight tracking-[-1px] tabular-nums">
                {formatMoney(plan.price)}
              </p>
              <p className="mt-1 text-[11px] text-[#8795ab]">cho 1 tháng</p>
            </div>
          </div>
          {plan.price === 0 ? (
            <>
              <p className="mt-5 rounded-lg bg-[#f5f8fc] p-3.5 text-[12px] leading-6 text-[#61708b]">
                Gói cá nhân miễn phí được cấp theo quy tắc tháng hiện tại, không
                cần thanh toán.
              </p>
              <Link
                href={user ? "/dashboard" : "/dang-ky"}
                className="mt-5 flex min-h-12 items-center justify-center rounded-xl bg-[#0066ff] px-4 py-3 text-sm font-semibold text-white"
              >
                {user ? "Về tài khoản" : "Tạo tài khoản miễn phí"}
              </Link>
            </>
          ) : (
            <PaymentCheckout plan={source} user={user} />
          )}
          <Link
            className="mt-5 block text-center text-[12px] font-medium text-[#7b89a0] transition-colors hover:text-[#0066ff]"
            href="/goi-dich-vu"
          >
            Chọn gói khác
          </Link>
        </section>
      </div>

      {plan.price > 0 && paymentOrgId && (
        <div className="mt-8">
          <PaymentHistory orgId={paymentOrgId} />
        </div>
      )}
    </>
  );
}
