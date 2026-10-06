import type { Metadata } from "next";
import Link from "next/link";
import { CompanyChoice } from "@/components/onboarding/company-choice";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";

export const metadata: Metadata = {
  title: "Thiết lập tổ chức | LawScan",
  description: "Chọn cách thiết lập không gian làm việc LawScan của bạn.",
};

export default function ChooseOrganizationPage() {
  return (
    <main className="[--onboarding-accent:#0b67e3] [--onboarding-accent-deep:#0758c9] [--onboarding-ink:#0c1730] [--onboarding-muted:#65748b] [--onboarding-line:#dce4ef] min-h-dvh grid grid-cols-[minmax(360px,0.82fr)_minmax(520px,1.18fr)] text-[color:var(--onboarding-ink)] [background:#f8fafc] [@media_(max-width:_900px)]:block [@media_(max-width:_900px)]:[background:#f5f8fc]">
      <aside className="min-h-dvh flex flex-col text-[#edf5ff] [background:radial-gradient(circle_at_12%_82%,rgb(32_111_218_/_0.22),transparent_35%),#0b1b35] pt-9 pb-[42px] px-[clamp(34px,5vw,74px)] [@media_(max-width:_900px)]:hidden">
        <Link className="relative z-[2] inline-flex w-fit text-white [text-decoration:none] [&_.brand-image_img]:[filter:grayscale(1)_brightness(0)_invert(1)] [&_.brand-image_img]:opacity-[0.94]" href="/" aria-label="LawScan — về trang chủ">
          <Brand />
        </Link>

        <div className="max-w-[510px] [margin-block:auto] [padding-block:72px] [&>_p]:text-[#76adf7] [&>_p]:text-[length:11px] [&>_p]:font-[720] [&>_p]:tracking-[1.2px] [&>_p]:uppercase [&_h2]:max-w-[470px] [&_h2]:text-[length:clamp(35px,3.2vw,52px)] [&_h2]:font-[690] [&_h2]:leading-[1.08] [&_h2]:tracking-[-2px] [&_h2]:mt-[15px]">
          <p>Thiết lập một lần</p>
          <h2>Hợp đồng rõ ràng hơn khi đúng người cùng xem.</h2>
          <div className="grid gap-[22px] mt-[46px] [&>_div]:grid [&>_div]:grid-cols-[42px_minmax(0,1fr)] [&>_div]:gap-3.5 [&>_div]:[align-items:start] [&_svg]:w-5 [&_svg]:h-5 [&_svg]:box-content [&_svg]:text-[#85b8fa] [&_svg]:border [&_svg]:[background:rgb(20_57_103_/_0.72)] [&_svg]:p-2.5 [&_svg]:rounded-xl [&_svg]:border-solid [&_svg]:border-[rgb(125_174_239_/_0.25)] [&_strong]:block [&_small]:block [&_strong]:text-[length:13px] [&_small]:max-w-[330px] [&_small]:text-[#92a8c5] [&_small]:text-[length:11px] [&_small]:leading-[1.55] [&_small]:mt-[5px]">
            <div><Icon name="team" /><span><strong>Làm việc cùng đội ngũ</strong><small>Mời thành viên và thống nhất quy trình rà soát.</small></span></div>
            <div><Icon name="shield" /><span><strong>Phân tách dữ liệu</strong><small>Hợp đồng được quản lý theo từng tổ chức.</small></span></div>
          </div>
        </div>

        <p className="text-[#7086a4] text-[length:10px]">Bạn có thể hoàn tất thiết lập trong chưa đầy một phút.</p>
      </aside>

      <section className="min-w-0 min-h-dvh grid place-items-center [background:#ffffff] px-[clamp(42px,7vw,104px)] py-16 [@media_(max-width:_900px)]:min-h-dvh [@media_(max-width:_900px)]:block [@media_(max-width:_900px)]:[background:linear-gradient(180deg,#edf5ff_0,#ffffff_260px)] [@media_(max-width:_900px)]:pt-6 [@media_(max-width:_900px)]:pb-12 [@media_(max-width:_900px)]:px-[22px] [@media_(max-width:_520px)]:pt-5 [@media_(max-width:_520px)]:pb-[34px] [@media_(max-width:_520px)]:px-[15px]">
        <Link className="hidden w-fit text-[color:var(--onboarding-ink)] [text-decoration:none] [@media_(max-width:_900px)]:block [@media_(max-width:_900px)]:mb-[54px] [&_.brand-image]:[@media_(max-width:_900px)]:w-[185px] [@media_(max-width:_520px)]:[padding-inline:5px] [@media_(max-width:_520px)]:mb-7" href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
        <CompanyChoice />
      </section>
    </main>
  );
}
