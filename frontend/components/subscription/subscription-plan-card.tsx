"use client";

import { Icon } from "@/components/ui/icon";
import type { DisplaySubscriptionPlan } from "@/lib/subscription-plans";

export function SubscriptionPlanCard({ plan, onSelect }: {
  plan: DisplaySubscriptionPlan;
  onSelect: (plan: DisplaySubscriptionPlan) => void;
}) {
  const isFree = plan.price === 0;
  const price = plan.price;

  return (
    <article
      className={`${plan.recommended ? "border-[#0066ff]" : "border-[#dce4ef]"} ${"relative flex flex-col min-w-0 border [background:#fff] shadow-[0_5px_15px_-9px_#162c4e20] [transition:border-color_0.25s,box-shadow_0.25s,translate_0.25s] pt-[30px] pb-[25px] px-7 rounded-[22px] border-solid [@media_(hover:_hover)_and_(pointer:_fine)]:hover:[translate:0_-5px] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:shadow-[0_20px_40px_-22px_#1e3e6f40] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:border-[#a9c1e6] focus-within:border-[#0066ff] [@media_(max-width:_1100px)]:px-5 [@media_(max-width:_1100px)]:py-[25px] [@media_(max-width:_800px)]:p-7 [@media_(max-width:_420px)]:px-[22px] [@media_(max-width:_420px)]:py-[25px] motion-reduce:transition-none hover:motion-reduce:[translate:none]"} ${plan.recommended ? "[background:linear-gradient(180deg,#f0f6ff,#fff_40%)] shadow-[0_0_0_1px_#0066ff,0_18px_45px_-25px_#0066ff50] border-[#0066ff] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:shadow-[0_0_0_1px_#0066ff,0_24px_48px_-22px_#0066ff50] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:border-[#0066ff]" : ""}`}
      aria-labelledby={`plan-${plan.id}`}
      data-plan-code={plan.code}
    >
      <div className="flex items-center gap-2.5 min-h-9 flex-wrap [&_h3]:text-[length:22px] [&_h3]:font-[650] [&_h3]:tracking-[-0.6px] [@media_(max-width:_1100px)]:gap-2 [&_h3]:[@media_(max-width:_1100px)]:text-[length:20px]">
        <span className="grid place-items-center text-[#0066ff]"><Icon name={plan.icon} width="22" height="22" /></span>
        <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
        {plan.recommended && <span className="text-[#075ada] [background:#e0ecff] border text-[length:10px] font-[650] whitespace-nowrap ml-auto px-[9px] py-[5px] rounded-[20px] border-solid border-[#c6dcff] [@media_(max-width:_1100px)]:text-[length:9px] [@media_(max-width:_1100px)]:px-1.5 [@media_(max-width:_1100px)]:py-1 [@media_(max-width:_800px)]:text-[length:10px] [@media_(max-width:_800px)]:px-[9px] [@media_(max-width:_800px)]:py-[5px]">Đề xuất cho SME</span>}
      </div>
      <p className="text-[#63718a] text-[length:14px] leading-[1.65] min-h-[47px] mt-[15px] [@media_(max-width:_800px)]:min-h-0">{plan.description}</p>

      <div className="mt-7 motion-safe:animate-[price-in_0.3s_ease-out_both]" key={plan.code}>
        <p className="flex items-baseline gap-[3px] flex-wrap [font-variant-numeric:tabular-nums] [&>_span]:first:text-[length:clamp(40px,3.7vw,54px)] [&>_span]:first:leading-[1.2] [&>_span]:first:font-[650] [&>_span]:first:tracking-[-2.8px] [&_sup]:static [&_sup]:text-[length:22px] [&_sup]:font-medium [&_sup]:leading-none [&_sup]:self-start [&_sup]:ml-0.5 [&_sup]:pt-2.5 [&>_span]:[@media_(max-width:_1100px)]:first:text-[length:40px] [&>_span]:[@media_(max-width:_800px)]:first:text-[length:52px] [&>_span]:[@media_(max-width:_420px)]:first:text-[length:45px] [&_sup]:[@media_(max-width:_420px)]:text-[length:18px]">
          <span>{new Intl.NumberFormat("vi-VN").format(price)}</span><sup>đ</sup>
          <span className="text-[#738096] text-[length:12px] ml-[5px] [@media_(max-width:_1100px)]:w-full [@media_(max-width:_1100px)]:mt-[5px] [@media_(max-width:_1100px)]:mb-0 [@media_(max-width:_1100px)]:mx-0 [@media_(max-width:_800px)]:w-auto [@media_(max-width:_800px)]:ml-[5px] [@media_(max-width:_800px)]:mr-0 [@media_(max-width:_800px)]:my-0 [@media_(max-width:_420px)]:text-[length:11px]">{"/ tháng"}</span>
        </p>
        <p className="text-[#63718a] text-[length:12px] leading-[1.65] min-h-10 mt-2.5 [@media_(max-width:_800px)]:min-h-0">
          {isFree ? "Miễn phí theo tháng, không cần thẻ." : plan.audience === "personal" ? "Cho một tài khoản cá nhân, theo kỳ tháng." : "Cho cả tổ chức, theo kỳ tháng."}
        </p>
      </div>

      {isFree ? (
        <a className={`${"flex items-center justify-center gap-2.5 w-full min-h-[49px] border text-[length:14px] font-semibold leading-[1.4] text-center cursor-pointer [transition:background_0.2s,box-shadow_0.2s,translate_0.2s] mt-[23px] px-[15px] py-3 rounded-[10px] border-solid [&>_svg]:shrink-0 [&>_svg]:transition-[translate] [&>_svg]:duration-200 [&>_svg]:ease-[ease] [&>_svg]:delay-0 [&:hover_>_svg]:[@media_(hover:_hover)_and_(pointer:_fine)]:[translate:3px_0] motion-reduce:transition-none [&>_svg]:motion-reduce:transition-none [&:hover_>_svg]:motion-reduce:[translate:none]"} ${"[background:#fff] text-[#17253e] border-[#d3dce9] hover:[background:#f5f8fc] hover:text-[#17253e] hover:border-[#94b5e5]"}`} href="/dang-ky">
          Bắt đầu miễn phí <Icon name="arrow" width="18" height="18" />
        </a>
      ) : (
        <button
          className={`${"flex items-center justify-center gap-2.5 w-full min-h-[49px] border text-[length:14px] font-semibold leading-[1.4] text-center cursor-pointer [transition:background_0.2s,box-shadow_0.2s,translate_0.2s] mt-[23px] px-[15px] py-3 rounded-[10px] border-solid [&>_svg]:shrink-0 [&>_svg]:transition-[translate] [&>_svg]:duration-200 [&>_svg]:ease-[ease] [&>_svg]:delay-0 [&:hover_>_svg]:[@media_(hover:_hover)_and_(pointer:_fine)]:[translate:3px_0] motion-reduce:transition-none [&>_svg]:motion-reduce:transition-none [&:hover_>_svg]:motion-reduce:[translate:none]"} ${plan.recommended ? "[background:#0066ff] text-[white] shadow-[0_5px_12px_-5px_#0066ff60] hover:[background:#0058dd] hover:text-[white]" : "[background:#fff] text-[#17253e] border-[#d3dce9] hover:[background:#f5f8fc] hover:text-[#17253e] hover:border-[#94b5e5]"}`}
          type="button"
          aria-haspopup="dialog"
          onClick={() => onSelect(plan)}
        >
          Xem gói {plan.name} <Icon name="arrow" width="18" height="18" />
        </button>
      )}

      <div className="[border-top:1px_solid_#e5ebf3] mt-[26px] pt-6 [&>_p]:text-[#33445d] [&>_p]:text-[length:12px] [&>_p]:font-semibold [&>_p]:mb-[19px] [&_ul]:grid [&_ul]:gap-3.5 [&_li]:flex [&_li]:gap-2.5 [&_li]:items-start [&_li]:text-[#455670] [&_li]:text-[length:13px] [&_li]:leading-normal [&_li_svg]:shrink-0 [&_li_svg]:mt-0.5 [&_li_svg]:text-[#0066ff] [&_li]:[@media_(max-width:_420px)]:text-[length:13px]">
        <p>{plan.featureHeading}</p>
        <ul>
          {plan.features.map((feature) => (
            <li key={feature}><Icon name="check" width="17" height="17" /><span>{feature}</span></li>
          ))}
        </ul>
      </div>
      <p className="text-[length:11px] text-[#758197] mt-auto pt-7">{plan.audience === "personal" ? "Dành cho không gian cá nhân." : "Số thành viên đã bao gồm Owner."}</p>
    </article>
  );
}

