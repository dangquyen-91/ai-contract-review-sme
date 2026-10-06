"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";

type BillingCycle = "monthly" | "yearly";
type Plan = {
  id: string;
  name: string;
  description: string;
  monthlyPrice: number;
  annualMonthlyPrice: number;
  icon: "document" | "sparkle" | "team";
  features: string[];
  featureHeading: string;
  recommended?: boolean;
};

// Illustrative pricing only. No checkout or subscription API is connected.
const plans: Plan[] = [
  {
    id: "free",
    name: "Dùng thử",
    description: "Làm quen với cách LawScan đọc và rà soát hợp đồng.",
    monthlyPrice: 0,
    annualMonthlyPrice: 0,
    icon: "document",
    featureHeading: "Khám phá trước khi bắt đầu",
    features: [
      "Hợp đồng mẫu có sẵn",
      "3 tình huống điều khoản minh họa",
      "Xem rủi ro và gợi ý làm rõ",
      "Không cần tải tài liệu cá nhân",
    ],
  },
  {
    id: "basic",
    name: "Cơ bản",
    description: "Cho doanh nghiệp nhỏ cần rà soát hợp đồng thường xuyên.",
    monthlyPrice: 299000,
    annualMonthlyPrice: 249000,
    icon: "sparkle",
    recommended: true,
    featureHeading: "Đủ cho công việc hằng ngày",
    features: [
      "20 lượt phân tích, tối đa 300 trang mỗi tháng",
      "3 thành viên trong doanh nghiệp",
      "Phát hiện rủi ro, gợi ý chỉnh sửa",
      "Giải thích kèm nguồn tham chiếu",
      "Xuất báo cáo rà soát PDF",
    ],
  },
  {
    id: "team",
    name: "Nhóm",
    description: "Cho đội ngũ cùng phối hợp và xử lý nhiều hợp đồng hơn.",
    monthlyPrice: 799000,
    annualMonthlyPrice: 649000,
    icon: "team",
    featureHeading: "Mọi quyền lợi Cơ bản, cộng thêm",
    features: [
      "80 lượt phân tích, tối đa 1.500 trang mỗi tháng",
      "10 thành viên trong doanh nghiệp",
      "Hạn mức dùng chung cho đội ngũ",
      "Phân quyền theo vai trò",
      "Theo dõi lịch sử rà soát chung",
    ],
  },
];

const formatPrice = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount);
const priceFor = (plan: Plan, cycle: BillingCycle) =>
  cycle === "yearly" ? plan.annualMonthlyPrice : plan.monthlyPrice;

function PlanCard({ plan, cycle, index, onSelect }: {
  plan: Plan;
  cycle: BillingCycle;
  index: number;
  onSelect: (plan: Plan) => void;
}) {
  const isFree = plan.monthlyPrice === 0;
  const price = priceFor(plan, cycle);

  return (
    <article
      className={`${"relative flex flex-col min-w-0 border [background:#fff] shadow-[0_5px_15px_-9px_#162c4e20] [transition:border-color_0.25s,box-shadow_0.25s,translate_0.25s] pt-[30px] pb-[25px] px-7 rounded-[22px] border-solid border-[#dce4ef] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:[translate:0_-5px] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:shadow-[0_20px_40px_-22px_#1e3e6f40] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:border-[#a9c1e6] focus-within:border-[#0066ff] [@media_(max-width:_1100px)]:px-5 [@media_(max-width:_1100px)]:py-[25px] [@media_(max-width:_800px)]:p-7 [@media_(max-width:_420px)]:px-[22px] [@media_(max-width:_420px)]:py-[25px] motion-reduce:transition-none hover:motion-reduce:[translate:none]"} ${plan.recommended ? "[background:linear-gradient(180deg,#f0f6ff,#fff_40%)] shadow-[0_0_0_1px_#0066ff,0_18px_45px_-25px_#0066ff50] border-[#0066ff] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:shadow-[0_0_0_1px_#0066ff,0_24px_48px_-22px_#0066ff50] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:border-[#0066ff]" : ""}`}
      aria-labelledby={`plan-${plan.id}`}
      data-reveal
      data-reveal-delay={index * 90}
    >
      <div className="flex items-center gap-2.5 min-h-9 flex-wrap [&_h3]:text-[length:22px] [&_h3]:font-[650] [&_h3]:tracking-[-0.6px] [@media_(max-width:_1100px)]:gap-2 [&_h3]:[@media_(max-width:_1100px)]:text-[length:20px]">
        <span className="grid place-items-center text-[#536782] text-[#0066ff]"><Icon name={plan.icon} width="22" height="22" /></span>
        <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
        {plan.recommended && <span className="text-[#075ada] [background:#e0ecff] border text-[length:10px] font-[650] whitespace-nowrap ml-auto px-[9px] py-[5px] rounded-[20px] border-solid border-[#c6dcff] [@media_(max-width:_1100px)]:text-[length:9px] [@media_(max-width:_1100px)]:px-1.5 [@media_(max-width:_1100px)]:py-1 [@media_(max-width:_800px)]:text-[length:10px] [@media_(max-width:_800px)]:px-[9px] [@media_(max-width:_800px)]:py-[5px]">Đề xuất cho SME</span>}
      </div>
      <p className="text-[#63718a] text-[length:14px] leading-[1.65] min-h-[47px] mt-[15px] [@media_(max-width:_800px)]:min-h-0">{plan.description}</p>

      <div className="mt-7 motion-safe:animate-[price-in_0.3s_ease-out_both]" key={cycle}>
        <p className="flex items-baseline gap-[3px] flex-wrap [font-variant-numeric:tabular-nums] [&>_span]:first:text-[length:clamp(40px,3.7vw,54px)] [&>_span]:first:leading-[1.2] [&>_span]:first:font-[650] [&>_span]:first:tracking-[-2.8px] [&_sup]:static [&_sup]:text-[length:22px] [&_sup]:font-medium [&_sup]:leading-none [&_sup]:self-start [&_sup]:ml-0.5 [&_sup]:pt-2.5 [&>_span]:[@media_(max-width:_1100px)]:first:text-[length:40px] [&>_span]:[@media_(max-width:_800px)]:first:text-[length:52px] [&>_span]:[@media_(max-width:_420px)]:first:text-[length:45px] [&_sup]:[@media_(max-width:_420px)]:text-[length:18px]">
          <span>{formatPrice(price)}</span><sup>đ</sup>
          <span className="text-[#738096] text-[length:12px] ml-[5px] [@media_(max-width:_1100px)]:w-full [@media_(max-width:_1100px)]:mt-[5px] [@media_(max-width:_1100px)]:mb-0 [@media_(max-width:_1100px)]:mx-0 [@media_(max-width:_800px)]:w-auto [@media_(max-width:_800px)]:ml-[5px] [@media_(max-width:_800px)]:mr-0 [@media_(max-width:_800px)]:my-0 [@media_(max-width:_420px)]:text-[length:11px]">{isFree ? "/ bản mẫu" : "/ tháng"}</span>
        </p>
        <p className="text-[#63718a] text-[length:12px] leading-[1.65] min-h-10 mt-2.5 [@media_(max-width:_800px)]:min-h-0">
          {isFree ? "Trải nghiệm miễn phí, không cần thẻ." : cycle === "yearly"
            ? `${formatPrice(price * 12)}đ / năm, thanh toán một lần.`
            : "Cho cả doanh nghiệp, thanh toán hằng tháng."}
        </p>
      </div>

      {isFree ? (
        <a className={`${"flex items-center justify-center gap-2.5 w-full min-h-[49px] border text-[length:14px] font-semibold leading-[1.4] text-center cursor-pointer [transition:background_0.2s,box-shadow_0.2s,translate_0.2s] mt-[23px] px-[15px] py-3 rounded-[10px] border-solid border-transparent [&>_svg]:shrink-0 [&>_svg]:transition-[translate] [&>_svg]:duration-200 [&>_svg]:ease-[ease] [&>_svg]:delay-0 [&:hover_>_svg]:[@media_(hover:_hover)_and_(pointer:_fine)]:[translate:3px_0] motion-reduce:transition-none [&>_svg]:motion-reduce:transition-none [&:hover_>_svg]:motion-reduce:[translate:none]"} ${"[background:#fff] text-[#17253e] border-[#d3dce9] hover:[background:#f5f8fc] hover:text-[#17253e] hover:border-[#94b5e5]"}`} href="#minh-hoa">
          Trải nghiệm bản mẫu <Icon name="arrow" width="18" height="18" />
        </a>
      ) : (
        <button
          className={`${"flex items-center justify-center gap-2.5 w-full min-h-[49px] border text-[length:14px] font-semibold leading-[1.4] text-center cursor-pointer [transition:background_0.2s,box-shadow_0.2s,translate_0.2s] mt-[23px] px-[15px] py-3 rounded-[10px] border-solid border-transparent [&>_svg]:shrink-0 [&>_svg]:transition-[translate] [&>_svg]:duration-200 [&>_svg]:ease-[ease] [&>_svg]:delay-0 [&:hover_>_svg]:[@media_(hover:_hover)_and_(pointer:_fine)]:[translate:3px_0] motion-reduce:transition-none [&>_svg]:motion-reduce:transition-none [&:hover_>_svg]:motion-reduce:[translate:none]"} ${plan.recommended ? "[background:#0066ff] text-[white] shadow-[0_5px_12px_-5px_#0066ff60] hover:[background:#0058dd] hover:text-[white]" : "[background:#fff] text-[#17253e] border-[#d3dce9] hover:[background:#f5f8fc] hover:text-[#17253e] hover:border-[#94b5e5]"}`}
          type="button"
          aria-haspopup="dialog"
          onClick={() => onSelect(plan)}
        >
          Xem gói {plan.name} <Icon name="arrow" width="18" height="18" />
        </button>
      )}

      <div className="[border-top:1px_solid_#e5ebf3] mt-[26px] pt-6 [&>_p]:text-[#33445d] [&>_p]:text-[length:12px] [&>_p]:font-semibold [&>_p]:mb-[19px] [&_ul]:grid [&_ul]:gap-3.5 [&_li]:flex [&_li]:gap-2.5 [&_li]:items-start [&_li]:text-[#455670] [&_li]:text-[length:13px] [&_li]:leading-normal [&_li_svg]:text-[#405676] [&_li_svg]:shrink-0 [&_li_svg]:mt-0.5 [&_li_svg]:text-[#0066ff] [&_li]:[@media_(max-width:_420px)]:text-[length:13px]">
        <p>{plan.featureHeading}</p>
        <ul>
          {plan.features.map((feature) => (
            <li key={feature}><Icon name="check" width="17" height="17" /><span>{feature}</span></li>
          ))}
        </ul>
      </div>
      <p className="text-[length:11px] text-[#758197] mt-auto pt-7">{isFree ? "Tìm hiểu trước, quyết định sau." : "Quyền lợi và hạn mức dự kiến."}</p>
    </article>
  );
}

export function PricingPlans() {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [activePlan, setActivePlan] = useState<Plan>(plans[1]);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activePrice = priceFor(activePlan, cycle);

  function showPlan(plan: Plan) {
    setActivePlan(plan);
    dialogRef.current?.showModal();
  }

  return (
    <>
      <div className="flex flex-col items-center gap-3 mt-[30px] mb-10 mx-0">
        <fieldset className="grid grid-cols-[1fr_1fr] relative gap-1 border [background:#eaf0f6] min-w-[272px] p-[5px] rounded-[14px] border-solid border-[#e0e6ef] [&_label]:relative [&_label]:z-[1] [&_label]:cursor-pointer [&_label_>_span]:grid [&_label_>_span]:place-items-center [&_label_>_span]:min-h-[42px] [&_label_>_span]:text-[length:14px] [&_label_>_span]:font-[550] [&_label_>_span]:text-[#5e6c82] [&_label_>_span]:transition-[color] [&_label_>_span]:duration-[0.22s] [&_label_>_span]:ease-[ease] [&_label_>_span]:delay-0 [&_label_>_span]:px-[19px] [&_label_>_span]:py-2 [&_label_>_span]:rounded-[9px] [&_input:checked_+_span]:text-white [&_input:focus-visible_+_span]:[outline:3px_solid_#0066ff] [&_input:focus-visible_+_span]:outline-offset-4 [@media_(max-width:_420px)]:min-w-[250px] [&_label_>_span]:motion-reduce:transition-none" data-cycle={cycle}>
          <legend className="sr-only">Chu kỳ thanh toán</legend>
          <span className="absolute w-[calc((100%_-_14px)_/_2)] [background:#13233d] shadow-[0_2px_5px_#0b173020] transition-transform duration-300 ease-[cubic-bezier(.22,1,0.36,1)] delay-0 rounded-[9px] left-[5px] inset-y-[5px] [transform:translateX(calc(100%_+_4px))] motion-reduce:transition-none" aria-hidden="true" />
          {([['monthly', 'Hàng tháng'], ['yearly', 'Hàng năm']] as const).map(([value, label]) => (
            <label key={value}>
              <input
                type="radio"
                name="billing-cycle"
                value={value}
                checked={cycle === value}
                onChange={() => setCycle(value)}
                className="sr-only"
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <span className="inline-flex items-center gap-1.5 text-[#3768b1] text-[length:12px]">Trả năm, giá tốt hơn <Icon name="diagonal" width="15" height="15" /></span>
      </div>

      <p className="sr-only" role="status">
        {cycle === "yearly"
          ? "Giá minh họa theo năm: Cơ bản 249.000 đồng mỗi tháng, tổng 2.988.000 đồng mỗi năm. Nhóm 649.000 đồng mỗi tháng, tổng 7.788.000 đồng mỗi năm."
          : "Giá minh họa theo tháng: Cơ bản 299.000 đồng. Nhóm 799.000 đồng."}
      </p>

      <div className="grid grid-cols-3 items-stretch gap-[22px] [@media_(max-width:_1100px)]:gap-4 [@media_(max-width:_800px)]:grid-cols-[1fr] [@media_(max-width:_800px)]:max-w-[500px] [@media_(max-width:_800px)]:[margin-inline:auto] [@media_(max-width:_800px)]:gap-[22px]">
        {plans.map((plan, index) => (
          <PlanCard key={plan.id} plan={plan} cycle={cycle} index={index} onSelect={showPlan} />
        ))}
      </div>

      <dialog ref={dialogRef} className="w-[min(480px,calc(100%_-_32px))] max-h-[calc(100dvh_-_48px)] border text-[#080e2f] [background:white] shadow-[0_30px_100px_#0003] m-auto p-7 rounded-[22px] border-solid border-[#d5e1f2] backdrop:[background:#09172c80] backdrop:[backdrop-filter:blur(5px)] motion-safe:open:animate-[dialog-in_0.22s_ease-out] motion-safe:open:backdrop:animate-[backdrop-in_0.2s_ease-out] [&_h2]:text-[length:29px] [&_h2]:font-[650] [&_h2]:tracking-[-0.8px] [&:is(a,_button)]:focus-visible:[outline:3px_solid_#0066ff] [&:is(a,_button)]:focus-visible:outline-offset-4 [@media_(max-width:_420px)]:p-5" aria-labelledby="plan-dialog-title" aria-describedby="plan-dialog-description">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[length:11px] font-semibold text-[#0066ff] uppercase tracking-[1.5px]">Gói minh họa</span>
          <button type="button" className="grid place-items-center w-10 h-10 [background:#f2f5fa] text-[#43536c] text-[length:24px] rounded-[50%]" aria-label="Đóng thông tin gói" onClick={() => dialogRef.current?.close()}>×</button>
        </div>
        <h2 id="plan-dialog-title">LawScan {activePlan.name}</h2>
        <p id="plan-dialog-description" className="text-[#62718a] text-[length:14px] mt-2.5">
          Đây là thông tin gói dự kiến để bạn tham khảo. Chưa mở đăng ký hoặc thanh toán.
        </p>
        <dl className="grid gap-3 [background:#f5f8fc] text-[length:13px] mt-[22px] p-5 rounded-xl [&>_div]:flex [&>_div]:justify-between [&>_div]:gap-3 [&_dt]:text-[#63718a] [&_dd]:text-right [&_dd]:font-semibold [@media_(max-width:_420px)]:p-[15px]">
          <div><dt>Chu kỳ</dt><dd>{cycle === "yearly" ? "Hằng năm" : "Hằng tháng"}</dd></div>
          <div><dt>Giá mỗi tháng</dt><dd>{formatPrice(activePrice)}đ</dd></div>
          <div><dt>Tổng tiền minh họa</dt><dd>{formatPrice(activePrice * (cycle === "yearly" ? 12 : 1))}đ / {cycle === "yearly" ? "năm" : "tháng"}</dd></div>
        </dl>
        <ul className="grid gap-3 text-[#43536c] text-[length:13px] mt-[22px] [&_li]:flex [&_li]:items-start [&_li]:gap-2.5 [&_svg]:shrink-0 [&_svg]:text-[#0066ff] [&_svg]:mt-0.5">
          {activePlan.features.map((feature) => <li key={feature}><Icon name="check" width="17" height="17" />{feature}</li>)}
        </ul>
        <a href="#minh-hoa" className={`${"flex items-center justify-center gap-2.5 w-full min-h-[49px] border text-[length:14px] font-semibold leading-[1.4] text-center cursor-pointer [transition:background_0.2s,box-shadow_0.2s,translate_0.2s] mt-[23px] px-[15px] py-3 rounded-[10px] border-solid border-transparent [&>_svg]:shrink-0 [&>_svg]:transition-[translate] [&>_svg]:duration-200 [&>_svg]:ease-[ease] [&>_svg]:delay-0 [&:hover_>_svg]:[@media_(hover:_hover)_and_(pointer:_fine)]:[translate:3px_0] motion-reduce:transition-none [&>_svg]:motion-reduce:transition-none [&:hover_>_svg]:motion-reduce:[translate:none]"} ${"[background:#0066ff] text-[white] shadow-[0_5px_12px_-5px_#0066ff60] hover:[background:#0058dd] hover:text-[white]"}`} onClick={() => dialogRef.current?.close()}>
          Khám phá bản mẫu trước <Icon name="arrow" width="18" height="18" />
        </a>
      </dialog>
    </>
  );
}
