"use client";

import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";

export default function OwnerError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const status = "status" in error && typeof error.status === "number" ? error.status : undefined;
  const isUnauthorized = status === 401;
  const needsOrganization = status === 403;
  const title = isUnauthorized
    ? "Phiên đăng nhập đã hết hạn"
    : needsOrganization
      ? "Cần thiết lập tổ chức"
      : "Dashboard đang tạm gián đoạn";
  const description = isUnauthorized
    ? "Vui lòng đăng nhập lại để tiếp tục quản lý hợp đồng của tổ chức."
    : needsOrganization
      ? "Tài khoản của bạn chưa có tổ chức để mở dashboard owner."
      : "Dữ liệu chưa thể tải lúc này. Bạn có thể thử lại sau ít phút.";

  return (
    <main className="min-h-dvh flex flex-col text-[#15223d] [background:radial-gradient(circle_at_50%_35%,#eef4ff_0,#f6f8fc_35%,#f8f9fb_70%)] [font-family:var(--font-geist-sans),Arial,sans-serif]">
      <header className="min-h-[76px] flex items-center justify-between gap-5 [border-bottom:1px_solid_#e6ebf2] [background:rgb(255_255_255_/_0.86)] px-[clamp(20px,5vw,64px)] py-2.5 [&_a]:block [&_.brand-image]:w-[145px] [&_.brand-image]:h-[52px] [&_.brand-image_img]:top-[-18px] [&_.brand-image_img]:w-[150px] [&_.brand-image_img]:h-[84px] [&>_span]:text-[#718097] [&>_span]:text-[length:11px] [&>_span]:font-[650] [@media_(max-width:_520px)]:min-h-[66px] [&>_span]:[@media_(max-width:_520px)]:hidden">
        <Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
        <span>Không gian tổ chức</span>
      </header>

      <div className="w-full max-w-[620px] grid justify-items-center gap-[18px] m-auto pt-12 pb-[68px] px-5 [@media_(max-width:_520px)]:pt-[30px] [@media_(max-width:_520px)]:pb-[50px] [@media_(max-width:_520px)]:px-4">
        <div className="w-full border [background:white] shadow-[0_25px_65px_-40px_rgb(27_61_110_/_0.35)] text-center p-[clamp(28px,6vw,48px)] rounded-[20px] border-solid border-[#e2e8f1] [&_h1]:text-[length:clamp(28px,4vw,36px)] [&_h1]:leading-[1.2] [&_h1]:tracking-[-1.1px] [&_h1]:mt-2.5 [&_h1]:mb-0 [&_h1]:mx-0" role="alert">
          <span className="w-16 h-16 grid place-items-center text-[#2864dc] border [background:#edf4ff] mt-0 mb-[22px] mx-auto rounded-[18px] border-solid border-[#dbe8ff] [&_svg]:w-[29px] [&_svg]:h-[29px]"><Icon name={isUnauthorized ? "lock" : needsOrganization ? "building" : "shield"} /></span>
          <p className="text-[#2864dc] text-[length:10px] font-[780] tracking-[1.1px] uppercase m-0">LawScan · Dashboard owner</p>
          <h1>{title}</h1>
          <p className="max-w-[420px] text-[#65748b] text-[length:13px] leading-[1.65] mt-3 mb-0 mx-auto">{description}</p>

          <div className="flex items-center justify-center flex-wrap gap-3 mt-7 [&:is(a,_button)]:min-h-11 [&:is(a,_button)]:inline-flex [&:is(a,_button)]:items-center [&:is(a,_button)]:justify-center [&:is(a,_button)]:gap-2.5 [&:is(a,_button)]:[font:inherit] [&:is(a,_button)]:[text-decoration:none] [&:is(a,_button)]:cursor-pointer [&:is(a,_button)]:px-[17px] [&:is(a,_button)]:py-0 [&:is(a,_button)]:rounded-[9px] [&:is(a,_button)]:focus-visible:[outline:3px_solid_#9bbcf8] [&:is(a,_button)]:focus-visible:outline-offset-[3px] [&:is(a,_button)]:[font-size:11px] [&:is(a,_button)]:[font-weight:700] [@media_(max-width:_520px)]:items-stretch [@media_(max-width:_520px)]:flex-col [&:is(a,_button)]:[@media_(max-width:_520px)]:w-full">
            {isUnauthorized ? (
              <Link className="text-[white] border [background:#2864dc] border-solid border-[#2864dc] hover:[background:#1e52bc] [&_svg]:w-4 [&_svg]:h-4" href="/dang-nhap">Đăng nhập lại <Icon name="arrow" /></Link>
            ) : needsOrganization ? (
              <Link className="text-[white] border [background:#2864dc] border-solid border-[#2864dc] hover:[background:#1e52bc] [&_svg]:w-4 [&_svg]:h-4" href="/chon-to-chuc">Thiết lập tổ chức <Icon name="arrow" /></Link>
            ) : (
              <button className="text-[white] border [background:#2864dc] border-solid border-[#2864dc] hover:[background:#1e52bc] [&_svg]:w-4 [&_svg]:h-4" type="button" onClick={retry}>Thử tải lại <Icon name="arrow" /></button>
            )}
            <Link className="text-[#4c5e79] border [background:white] border-solid border-[#dce3ed] hover:[background:#f6f8fb]" href="/">Về trang chủ</Link>
          </div>
        </div>
        <p className="text-[#8793a4] text-[length:10px] leading-normal text-center m-0">Nếu sự cố tiếp diễn, hãy thử đăng nhập lại hoặc liên hệ đội ngũ hỗ trợ LawScan.</p>
      </div>
    </main>
  );
}
