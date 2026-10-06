import Link from "next/link";
import { PricingPlans } from "./pricing-plans";

export function PricingSection() {
  return (
    <section id="goi-dich-vu" className="[background:radial-gradient(ellipse_at_50%_45%,#eaf1ff80,transparent_65%),#f7f9fc] [border-block:1px_solid_#e9eef5] mt-[76px] pt-[76px] pb-16 px-0 [@media_(max-width:_800px)]:[padding-block:56px_44px] [@media_(max-width:_800px)]:mt-12" aria-labelledby="pricing-heading">
      <div className={`w-[min(1380px,calc(100%_-_112px))] mx-auto max-[1199px]:w-[calc(100%_-_64px)] max-[600px]:w-[calc(100%_-_40px)] ${"max-w-[1200px]"}`}>
        <div className="text-center [&_h2]:text-[length:clamp(34px,3.4vw,49px)] [&_h2]:font-[720] [&_h2]:leading-[1.16] [&_h2]:tracking-[-1.8px] [&_h2_span]:text-slate-500 [&>_p]:last:text-[#61708b] [&>_p]:last:text-[length:16px] [&>_p]:last:mt-5 [&_h2]:[@media_(max-width:_800px)]:text-[length:38px] [&>_p]:[@media_(max-width:_800px)]:last:max-w-[400px] [&>_p]:[@media_(max-width:_800px)]:last:[margin-inline:auto] [&>_p]:[@media_(max-width:_800px)]:last:text-[length:15px] [&_h2]:[@media_(max-width:_420px)]:text-[length:32px] [&_h2]:[@media_(max-width:_420px)]:tracking-[-1.1px]" data-reveal>
          <p className={`flex items-center gap-[11px] mb-4 text-[11px] font-semibold tracking-[1.8px] text-[#7382a5] uppercase before:h-0.5 before:w-5 before:bg-[var(--ls-blue)] before:content-[''] max-[600px]:text-[10px] max-[600px]:tracking-[1.2px] ${"justify-center text-[#52688b] mb-[18px]"}`}>07 / Gói dịch vụ</p>
          <h2 id="pricing-heading">Chọn gói phù hợp.<br /><span>Chủ động mỗi lần ký.</span></h2>
          <p>Bắt đầu với bản mẫu, mở rộng khi đội ngũ của bạn cần thêm.</p>
        </div>
        <PricingPlans />
        <p className="text-center text-[length:12px] text-[#6c7a91] mt-7">
          Giá và hạn mức minh họa. LawScan chưa mở đăng ký gói hoặc thanh toán.
          {" "}<Link href="/goi-dich-vu" className="text-[color:var(--ls-blue)] text-[length:17px] [@media_(max-width:_600px)]:text-[length:14px]">Xem trang gói dịch vụ →</Link>
        </p>
      </div>
    </section>
  );
}
