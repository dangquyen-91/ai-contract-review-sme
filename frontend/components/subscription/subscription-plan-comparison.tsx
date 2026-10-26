import type { SubscriptionPlan } from "@/types/subscription";
import { formatMoney, formatPlanNumber } from "@/lib/subscription-plans";

export function SubscriptionPlanComparison({ plans }: { plans: SubscriptionPlan[] }) {
  const rows = [
    { label: "Giá mỗi tháng", values: plans.map((plan) => formatMoney(plan.price)) },
    { label: "Lượt rà soát / kỳ tháng (1 lượt/5 trang)", values: plans.map((plan) => formatPlanNumber(plan.analysisLimit)) },
    { label: "Lượt soạn hợp đồng AI / kỳ tháng", values: plans.map((plan) => plan.audience === 'business' ? formatPlanNumber(plan.draftingLimit ?? 0) : 'Chưa hỗ trợ') },
    { label: "Lượt chat / kỳ tháng", values: plans.map((plan) => formatPlanNumber(plan.chatLimit)) },
    { label: "Thành viên tối đa", values: plans.map((plan) => formatPlanNumber(plan.memberLimit)) },
    { label: "Phạm vi hạn mức", values: plans.map((plan) => plan.audience === "personal" ? "Cá nhân" : "Dùng chung tổ chức") },
  ];
  return <section className="mt-12 text-[#080e2f]" aria-labelledby="plan-comparison-heading"><h2 id="plan-comparison-heading" className="text-[26px] font-semibold tracking-[-0.8px]">Đúng nhu cầu, rõ hạn mức.</h2><p className="mt-1.5 text-[13px] text-[#61708b]">So sánh các gói theo thông tin đang được cung cấp.</p>
    <div tabIndex={0} role="region" aria-label="Bảng so sánh gói có thể cuộn ngang" className="mt-6 overflow-x-auto rounded-[22px] border border-[#dce4ef] bg-white focus-visible:outline-2 focus-visible:outline-[#0066ff]">
      <table className="w-full min-w-[480px] border-collapse text-[13px] [&_th]:px-5 [&_th]:py-4 [&_td]:px-5 [&_td]:py-4"><caption className="sr-only">So sánh {plans.map((plan) => plan.name).join(" và ")}</caption><thead className="bg-[#f0f5fc]"><tr><th scope="col" className="text-left">Hạn mức</th>{plans.map((plan) => <th scope="col" key={plan.code} className="text-center">{plan.name}</th>)}</tr></thead><tbody>{rows.map((row) => <tr key={row.label} className="border-t border-[#e5ebf3]"><th scope="row" className="text-left font-normal text-[#61708b]">{row.label}</th>{row.values.map((value, index) => <td key={plans[index].code} className="text-center tabular-nums">{value}</td>)}</tr>)}</tbody></table>
    </div>
  </section>;
}
