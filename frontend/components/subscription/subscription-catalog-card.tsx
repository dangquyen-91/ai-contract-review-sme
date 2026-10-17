"use client";

import Link from "next/link";
import { ArrowUpRight, CalendarDays, FileSearch, MessagesSquare, Sparkles, UserRound, Users, WalletCards } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DisplaySubscriptionPlan } from "@/lib/subscription-plans";

export function SubscriptionCatalogCard({ plan, onSelect }: {
  plan: DisplaySubscriptionPlan;
  onSelect: (plan: DisplaySubscriptionPlan) => void;
}) {
  const personal = plan.audience === "personal";
  const free = plan.price === 0;
  const highlighted = plan.recommended || plan.code === "personal_pro";
  const FeatureIcons = [FileSearch, MessagesSquare, personal ? UserRound : Users, WalletCards];
  const headline = personal ? free ? "Bắt đầu thật đơn giản" : "Chủ động rà soát mỗi ngày" : plan.code === "business_starter" ? "Cùng đội ngũ làm việc" : "Sẵn sàng cho nhiều hợp đồng hơn";

  return <article data-plan-code={plan.code} data-plan-variant="catalog" aria-labelledby={`catalog-plan-${plan.code}`} className={cn(
    "relative flex min-w-0 flex-col rounded-[28px] border p-6 text-[#080e2f] transition-shadow sm:p-8 motion-reduce:transition-none",
    highlighted ? "border-[#8ab5f4] bg-linear-to-b from-[#f5f9ff] via-[#eaf3ff] to-[#d6e8ff] shadow-[0_18px_60px_-35px_#2864dc70]" : "border-[#dce4ef] bg-white shadow-[0_8px_32px_-24px_#14213d30]",
  )}>
    <header className="flex min-h-16 flex-wrap content-start items-start justify-between gap-2">
      <h3 id={`catalog-plan-${plan.code}`} className="text-lg font-semibold tracking-tight">{plan.name}</h3>
      {highlighted && <span className="rounded-full border border-[#2864dc20] bg-white/70 px-3 py-1 text-[11px] font-semibold text-[#245bb7]">{plan.recommended ? "Đề xuất cho SME" : "Cho nhu cầu thường xuyên"}</span>}
    </header>
    <div className="mt-4 @min-[680px]/plans:min-h-44">
      <p className="max-w-sm text-[clamp(26px,3vw,34px)] font-semibold leading-[1.2] tracking-[-1px]">{headline}</p>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[#52647d]">{plan.description}</p>
    </div>
    <div className="mt-7">
      <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1 tabular-nums"><span className="text-[clamp(38px,4vw,50px)] font-semibold leading-tight tracking-[-2px]">{new Intl.NumberFormat("vi-VN").format(plan.price)}<span className="ml-1 align-top text-xl leading-10 tracking-normal">đ</span></span><span className="text-sm text-[#52647d]">/ tháng</span></p>
      <p className="mt-2 text-xs leading-5 text-[#52647d]">{free ? "Miễn phí theo tháng, không cần thẻ." : personal ? "Giá cho một tài khoản cá nhân." : "Giá cho cả tổ chức, không tính theo từng người."}</p>
    </div>
    {free ? <Button variant="outline" className="mt-6 h-auto min-h-12 w-full whitespace-normal rounded-full border-[#ccd8e7] bg-white py-3 text-[#17253e] hover:bg-[#f5f8fc]" asChild><Link href="/dang-ky">Bắt đầu miễn phí<ArrowUpRight aria-hidden="true" /></Link></Button> : <Button variant={highlighted ? "default" : "outline"} className={cn("mt-6 h-auto min-h-12 w-full whitespace-normal rounded-full py-3", highlighted && "bg-[#2864dc] text-white hover:bg-[#1f4fb2]")} aria-haspopup="dialog" onClick={() => onSelect(plan)}><Sparkles aria-hidden="true" />Xem gói {plan.name}</Button>}
    <div className="mt-7 border-t border-[#bccce2]/60 pt-6">
      <p className="mb-5 text-xs font-semibold text-[#33445d]">{plan.featureHeading}</p>
      <ul className="m-0 grid list-none !gap-5 p-0">{plan.features.map((feature, index) => {
        const FeatureIcon = FeatureIcons[index] ?? FileSearch;
        return <li key={feature} className="flex items-start !gap-3 !text-sm !leading-6"><FeatureIcon className="!mt-0.5 size-5 shrink-0 !text-[#315c96]" strokeWidth={1.7} aria-hidden="true" /><span>{feature}</span></li>;
      })}</ul>
    </div>
    <p className="mt-auto flex items-start gap-2 pt-8 text-xs leading-5 text-[#52647d]"><CalendarDays className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{personal ? "Hạn mức được tính riêng trong mỗi kỳ tháng." : "Hạn mức chia sẻ cho tổ chức. Số thành viên đã bao gồm Owner."}</p>
  </article>;
}
