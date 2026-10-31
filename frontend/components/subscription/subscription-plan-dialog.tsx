"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";
import {
  formatMoney,
  type DisplaySubscriptionPlan,
} from "@/lib/subscription/subscription-plans";

export function SubscriptionPlanDialog({
  plan,
  onClose,
}: {
  plan: DisplaySubscriptionPlan;
  onClose: () => void;
}) {
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="rounded-[22px] border-[#d5e1f2] bg-white p-7 text-[#080e2f] shadow-[0_30px_100px_#0003] sm:max-w-[480px]">
        <DialogHeader className="text-left">
          <span className="text-[11px] font-semibold uppercase tracking-[1.5px] text-[#0066ff]">
            {plan.audience === "personal"
              ? "Dành cho cá nhân"
              : "Dành cho tổ chức"}
          </span>
          <DialogTitle className="text-[29px] font-semibold tracking-[-0.8px]">
            {plan.name}
          </DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed text-[#62718a]">
            {plan.description}
          </DialogDescription>
        </DialogHeader>
        <dl className="grid gap-3 rounded-xl bg-[#f5f8fc] p-5 text-[13px] [&>div]:flex [&>div]:justify-between [&>div]:gap-3 [&_dt]:text-[#63718a] [&_dd]:text-right [&_dd]:font-semibold">
          <div>
            <dt>Chu kỳ</dt>
            <dd>Hàng tháng</dd>
          </div>
          <div>
            <dt>Giá gói</dt>
            <dd>{formatMoney(plan.price)} / tháng</dd>
          </div>
        </dl>
        <ul className="grid gap-3 text-[13px] text-[#43536c]">
          {plan.features.map((feature) => (
            <li key={feature} className="flex items-start gap-2.5">
              <Icon
                name="check"
                className="mt-0.5 size-4 shrink-0 text-[#0066ff]"
              />
              <span>{feature}</span>
            </li>
          ))}
        </ul>
        <Link
          href={`/goi-dich-vu/xac-nhan?plan=${plan.code}&cycle=monthly`}
          className="flex min-h-[49px] w-full items-center justify-center gap-2.5 rounded-[10px] bg-[#0066ff] px-[15px] py-3 text-center text-[14px] font-semibold text-white shadow-[0_5px_12px_-5px_#0066ff60] transition-colors hover:bg-[#0058dd] hover:text-white"
        >
          Xem chi tiết gói
          <Icon name="arrow" className="size-[18px] shrink-0" />
        </Link>
      </DialogContent>
    </Dialog>
  );
}
