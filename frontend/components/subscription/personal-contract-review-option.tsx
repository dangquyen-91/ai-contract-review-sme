"use client";

import Link from "next/link";
import { ArrowUpRight, Check, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { useSubscription } from "@/hooks/subscription/use-subscription";
import { formatMoney } from "@/lib/subscription/subscription-plans";

export function PersonalContractReviewOption({
  accountId,
}: {
  accountId: string;
}) {
  const subscription = useSubscription(accountId);
  const pricing = subscription.data?.contractReviewPricing;
  const hasPrice = pricing && pricing.unitPrice > 0 && pricing.pagesPerUnit > 0;

  return (
    <section
      data-review-payment-card
      aria-labelledby="contract-review-option-title"
      className="@container/one-off mt-6 overflow-hidden rounded-[24px] border border-blue-100 bg-white shadow-[0_8px_32px_-24px_#14213d30]"
    >
      <div className="grid @min-[820px]/one-off:grid-cols-[1fr_310px]">
        <div className="p-6 sm:p-8">
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
              <FileText size={22} strokeWidth={1.7} aria-hidden="true" />
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-medium text-slate-600">
              Linh hoạt · Không cần gói tháng
            </span>
          </div>
          <h3
            id="contract-review-option-title"
            className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl"
          >
            Chỉ cần rà soát một hợp đồng?
          </h3>
          <p className="mt-3 max-w-xl text-sm leading-6 text-slate-500">
            Khi lượt trong gói không đủ, bạn có thể thanh toán riêng cho hợp
            đồng cần rà soát, giữ nguyên lượt còn lại.
          </p>
          <ul className="mt-5 grid gap-2.5 text-sm text-slate-600">
            {[
              "Xem số trang và giá chính xác trước khi thanh toán",
              "Lưu kết quả để xem lại, không tính phí tải lại kết quả",
              "Chỉ thanh toán khi bạn xác nhận tiếp tục",
            ].map((text) => (
              <li key={text} className="flex items-start gap-2.5">
                <Check
                  size={16}
                  className="mt-0.5 shrink-0 text-blue-600"
                  aria-hidden="true"
                />
                {text}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col justify-center border-t border-blue-100 bg-blue-50/50 p-6 sm:p-8 @min-[820px]/one-off:border-l @min-[820px]/one-off:border-t-0">
          <p className="text-xs font-medium text-slate-500">
            Thanh toán theo hợp đồng
          </p>
          {subscription.isPending ? (
            <p role="status" className="mt-3 text-sm text-slate-500">
              Đang tải đơn giá…
            </p>
          ) : hasPrice ? (
            <>
              <p className="mt-3 text-[34px] font-semibold leading-tight tracking-tight text-slate-900">
                {formatMoney(pricing.unitPrice)}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                / mỗi {pricing.pagesPerUnit} trang · làm tròn lên
              </p>
              <p className="mt-4 rounded-lg border border-blue-100 bg-white/80 px-3 py-2.5 text-xs leading-5 text-slate-600">
                Ví dụ: hợp đồng 8 trang →{" "}
                <strong className="font-semibold text-slate-900">
                  {formatMoney(
                    Math.ceil(8 / pricing.pagesPerUnit) * pricing.unitPrice,
                  )}
                </strong>
              </p>
            </>
          ) : (
            <p className="mt-3 text-base font-semibold leading-6 text-slate-900">
              Xem giá chính xác sau khi tải hợp đồng
            </p>
          )}
          <Button
            asChild
            className="mt-5 h-auto min-h-11 w-full whitespace-normal px-4 py-3 text-center text-sm leading-5"
          >
            <Link href={routes.reviewWorkspace}>
              <Upload size={16} aria-hidden="true" />
              Tải hợp đồng để xem giá
              <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </Button>
          <p className="mt-3 text-center text-[11px] leading-5 text-slate-500">
            Tải file để kiểm tra số trang chưa chạy rà soát và chưa trừ lượt.
            Chat AI dùng hạn mức gói hiện tại.
          </p>
        </div>
      </div>
    </section>
  );
}
