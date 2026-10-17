"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { useSubscriptionPlans } from "@/hooks/use-subscription-plans";
import { describePlan, formatMoney } from "@/lib/subscription-plans";
import type { PlanCode } from "@/types/subscription";

export function SubscriptionConfirmation({ planCode }: { planCode: PlanCode }) {
  const query = useSubscriptionPlans();
  const source = query.data?.find((plan) => plan.code === planCode);
  const back = <Link className="mb-[30px] inline-block text-[13px] text-[#61708b] hover:text-[#0066ff]" href="/goi-dich-vu">← Quay lại gói dịch vụ</Link>;
  if (query.isPending) return <>{back}<p role="status" className="rounded-[22px] border border-[#dce4ef] bg-white p-7 text-[#61708b]">Đang tải thông tin gói…</p></>;
  if (query.isError) return <>{back}<div role="alert" className="rounded-[22px] border border-[#dce4ef] bg-white p-7 text-[#080e2f]"><h1 className="text-xl font-semibold">Chưa thể tải thông tin gói</h1><p className="mt-2 text-[14px] text-[#61708b]">{query.error.message}</p><button type="button" disabled={query.isFetching} onClick={() => void query.refetch()} className="mt-5 min-h-11 rounded-[10px] border border-[#d3dce9] px-5 text-[14px] font-semibold disabled:opacity-50">{query.isFetching ? "Đang tải…" : "Thử lại"}</button></div></>;
  if (!source) return <>{back}<h1 className="text-2xl font-semibold text-[#080e2f]">Gói dịch vụ hiện không khả dụng</h1><p className="mt-3 text-[#61708b]">Vui lòng quay lại danh sách để chọn gói khác.</p></>;
  const plan = describePlan(source);
  return <>
    {back}
    <div className="mb-8 text-[#080e2f]"><p className="mb-3 text-[10px] font-bold tracking-[1.5px] text-[#0066ff]">{plan.audience === "personal" ? "DÀNH CHO CÁ NHÂN" : "DÀNH CHO TỔ CHỨC"}</p><h1 className="text-[clamp(30px,3.4vw,46px)] font-bold leading-[1.2] tracking-[-1.7px]">Xem lại trước khi<br /><span className="font-normal text-[#61708b]">bạn quyết định.</span></h1><p className="mt-[18px] text-[15px] text-[#61708b]">Giá và hạn mức của gói bạn vừa chọn.</p></div>
    <div className="grid items-start gap-6 text-[#080e2f] xl:grid-cols-[1.15fr_1fr]">
      <section className="rounded-[22px] border border-[#dce4ef] bg-white p-7"><span className="inline-flex rounded-xl border border-[#dbe9ff] bg-[#eef5ff] p-2.5 text-[#0066ff]"><Icon name={plan.icon} /></span><h2 className="mt-4 text-[25px] font-semibold tracking-[-0.6px]">{plan.name}</h2><p className="mt-2 text-[14px] leading-relaxed text-[#61708b]">{plan.description}</p><ul className="mt-6 grid gap-3 text-[13px] text-[#455670]">{plan.features.map((feature) => <li key={feature} className="flex items-start gap-2.5"><Icon name="check" className="mt-0.5 size-[18px] shrink-0 text-[#0066ff]" /><span>{feature}</span></li>)}</ul><div className="mt-7 flex items-start gap-2.5 rounded-[10px] bg-[#eef5ff] p-4 text-[12px] leading-relaxed text-[#61708b]"><Icon name="shield" className="size-[18px] shrink-0 text-[#0066ff]" /><p>{plan.audience === "business" ? "Hạn mức phân tích và chat dùng chung trong tổ chức. Số thành viên đã bao gồm Owner." : "Hạn mức dành riêng cho tài khoản cá nhân. Gói miễn phí được cấp theo tháng dương lịch theo giờ Việt Nam."}</p></div></section>
      <section className="rounded-[22px] border border-[#dce4ef] bg-white p-7"><p className="text-[10px] font-semibold tracking-[1px] text-[#61708b]">TÓM TẮT LỰA CHỌN</p><h2 className="mt-3 text-[25px] font-semibold">{plan.name}</h2><dl className="mt-6 grid gap-4 text-[13px] [&>div]:flex [&>div]:justify-between [&>div]:gap-3 [&_dt]:text-[#61708b] [&_dd]:text-right [&_dd]:font-semibold"><div><dt>Đối tượng</dt><dd>{plan.audience === "personal" ? "Cá nhân" : "Tổ chức"}</dd></div><div><dt>Chu kỳ</dt><dd>Hàng tháng</dd></div><div className="border-t border-[#dce4ef] pt-6"><dt>Giá gói</dt><dd className="text-[27px] tracking-[-1px] tabular-nums">{formatMoney(plan.price)}<small className="mt-1 block text-[12px] font-normal tracking-normal text-[#61708b]">/ tháng</small></dd></div></dl>
        <p className="mt-6 rounded-[10px] bg-[#f5f8fc] p-4 text-[12px] leading-relaxed text-[#61708b]">{plan.price === 0 ? "Tạo tài khoản để bắt đầu sử dụng gói cá nhân miễn phí." : "Trang này chưa hỗ trợ thanh toán hoặc kích hoạt gói trả phí. Xem thông tin tài khoản và hạn mức hiện tại sau khi đăng nhập."}</p>
        <Link href={plan.price === 0 ? "/dang-ky" : "/dang-nhap"} className="mt-6 flex min-h-12 w-full items-center justify-center gap-3 rounded-[10px] bg-[#0066ff] px-4 py-3 text-center text-[14px] font-semibold text-white transition-colors hover:bg-[#0056d9] hover:text-white">{plan.price === 0 ? "Tạo tài khoản miễn phí" : "Đăng nhập vào LawScan"}<Icon name="arrow" className="size-[18px] shrink-0" /></Link>
        <Link className="mt-[18px] block text-center text-[13px] text-[#61708b] hover:text-[#0066ff]" href="/goi-dich-vu">Chọn gói khác</Link>
      </section>
    </div>
  </>;
}
