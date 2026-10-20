import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";

export function Footer() {
  return (
    <footer className="relative print:hidden [&_.brand-image_img]:grayscale [&_.brand-image_img]:brightness-0 [&_.brand-image_img]:invert print:hidden [&_.brand-image_img]:grayscale [&_.brand-image_img]:brightness-0 [&_.brand-image_img]:invert print:hidden [&_.brand-image_img]:grayscale [&_.brand-image_img]:brightness-0 [&_.brand-image_img]:invert print:hidden [&_.brand-image_img]:grayscale [&_.brand-image_img]:brightness-0 [&_.brand-image_img]:invert text-[#f6f8ff] [background:radial-gradient(ellipse_at_12%_0%,#16376590,transparent_58%),#0b1730] isolate pt-16 before:content-[''] before:absolute before:h-px before:[background:linear-gradient(90deg,transparent,#438fff,#8ebbff,transparent)] before:top-0 before:bottom-auto before:inset-x-0 [&:is(a,_summary)]:focus-visible:outline-[#83b8ff] [@media_(max-width:_600px)]:pt-10">
      <div className="w-[min(1380px,calc(100%_-_112px))] [margin-inline:auto] [@media_(max-width:_1199px)]:w-[calc(100%_-_64px)] [@media_(max-width:_600px)]:w-[calc(100%_-_40px)]">
        <div className="grid-cols-[1.5fr_0.9fr_0.9fr_1fr] [&_h2]:font-semibold [&_h2]:text-[length:13px] [&_h2]:tracking-[1px] [&_h2]:uppercase [&_h2]:text-[#f0f5ff] [&_h2]:mt-2 [&_h2]:mb-5 [&_h2]:mx-0 [&_nav_a]:block [&_nav_a]:w-fit [&_nav_a]:text-[#abbdd8] [&_nav_a]:text-[length:14px] [&_nav_a]:leading-[2.3] [&_nav_a]:hover:text-white [@media_(max-width:_600px)]:grid-cols-[1fr_1fr] [@media_(max-width:_600px)]:gap-[28px_18px] [&>_div]:[@media_(max-width:_600px)]:first:col-span-full [&_h2]:[@media_(max-width:_600px)]:text-[length:11px] [&_h2]:[@media_(max-width:_600px)]:mb-3 [&_nav_a]:[@media_(max-width:_600px)]:text-[length:13px] grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="footer-brand-block">
            <Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
            <p className="text-[#c4d2e9] text-[length:19px] leading-[1.55] tracking-[-0.3px] mt-5 [@media_(max-width:_600px)]:text-[length:18px] [@media_(max-width:_600px)]:mt-4">Hiểu rõ điều khoản.<br />Chủ động trước khi ký.</p>
            <Link className="inline-flex gap-3 items-center text-[#88baff] text-[length:14px] mt-5 hover:text-[white]" href="/bao-cao-mau">
              Khám phá LawScan <Icon name="diagonal" width="18" height="18" />
            </Link>
          </div>
          <nav aria-label="Sản phẩm">
            <h2>Sản phẩm</h2>
            <Link href="/#tinh-nang">Tính năng</Link>
            <Link href="/#quy-trinh">Cách hoạt động</Link>
            <Link href="/#goi-dich-vu">Gói dịch vụ</Link>
          </nav>
          <nav aria-label="Hỗ trợ">
            <h2>Hỗ trợ</h2>
            <Link href="/#cau-hoi">Câu hỏi thường gặp</Link>
            <Link href="/bao-cao-mau">Khám phá bản mẫu</Link>
          </nav>
          <div className="[&_details]:text-[length:14px] [&_details]:text-[#abbdd8] [&_summary]:[list-style:none] [&_summary]:leading-[2.3] [&_summary]:flex [&_summary]:justify-between [&_summary]:gap-3 [&_summary_span]:text-[#79acfa] [&_summary_span]:transition-transform [&_summary_span]:duration-200 [&_summary_span]:ease-[ease] [&_summary_span]:delay-0 [&_details[open]_summary_span]:[transform:rotate(45deg)] [&_summary::-webkit-details-marker]:hidden [&_summary]:hover:text-white [&_p]:text-[length:12px] [&_p]:[padding-block:8px] [&_p]:max-w-[300px] [&_details]:[@media_(max-width:_600px)]:text-[length:13px] [@media_(max-width:_600px)]:col-span-full [@media_(max-width:_600px)]:max-w-xs">
            <h2>Thông tin sử dụng</h2>
            <details>
              <summary>Phạm vi hỗ trợ <span aria-hidden="true">+</span></summary>
              <p>LawScan hỗ trợ rà soát sơ bộ hợp đồng mua bán và dịch vụ tiếng Việt. Nội dung trên trang là minh họa.</p>
            </details>
            <details>
              <summary>Dữ liệu bản mẫu <span aria-hidden="true">+</span></summary>
              <p>Trang này chỉ sử dụng dữ liệu mẫu, không yêu cầu tải hợp đồng hoặc nhập thông tin cá nhân.</p>
            </details>
          </div>
        </div>
        <div className="border [background:linear-gradient(105deg,#ffffff08,#0f28500d)] mt-[46px] px-6 py-[22px] rounded-2xl border-solid border-[#8db3e526] [@media_(max-width:_600px)]:items-stretch [@media_(max-width:_600px)]:flex-col [@media_(max-width:_600px)]:gap-3 [@media_(max-width:_600px)]:mt-[34px] [@media_(max-width:_600px)]:p-[18px] flex items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0 [&>_span]:w-[46px] [&>_span]:h-[46px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:text-[#72aaff] [&>_span]:border [&>_span]:[background:#17345d80] [&>_span]:rounded-xl [&>_span]:border-solid [&>_span]:border-[#6097e34a] [&_svg]:w-[21px] [&_small]:block [&_strong]:block [&_small]:text-[#77a9ef] [&_small]:[font-family:var(--font-geist-mono),monospace] [&_small]:text-[length:8px] [&_small]:font-[650] [&_small]:tracking-[1.25px] [&_strong]:text-[#f0f5ff] [&_strong]:text-[length:15px] [&_strong]:font-[630] [&_strong]:mt-[5px] [&_p]:text-[#8fa3c0] [&_p]:text-[length:11px] [&_p]:mt-1 [@media_(max-width:_600px)]:items-start [&>_span]:[@media_(max-width:_600px)]:w-10 [&>_span]:[@media_(max-width:_600px)]:h-10 [&_strong]:[@media_(max-width:_600px)]:text-[length:13px] [&_p]:[@media_(max-width:_600px)]:text-[length:10px] [&_p]:[@media_(max-width:_600px)]:leading-normal">
            <span><Icon name="shield" /></span>
            <div>
              <small>NGUYÊN TẮC CỦA LAWSCAN</small>
              <strong>Quyết định cuối cùng luôn thuộc về bạn.</strong>
              <p>LawScan giúp sắp xếp thông tin để đội ngũ kiểm tra và trao đổi rõ ràng hơn.</p>
            </div>
          </div>
          <a className="shrink-0 inline-flex items-center gap-[11px] min-h-[43px] text-[#b6c7df] border [background:#ffffff05] text-[length:11px] pl-[15px] pr-[9px] py-2 rounded-[999px] border-solid border-[#536c9266] hover:text-[white] [&>_svg]:[transform:rotate(-90deg)] [&>_svg]:w-[27px] [&>_svg]:h-[27px] [&>_svg]:[background:#17345d] [&>_svg]:[transition:background_0.25s,border-color_0.25s] [&>_svg]:p-1.5 [&>_svg]:rounded-[50%] [&:hover_>_svg]:[background:#0066ff] [@media_(max-width:_600px)]:w-full [@media_(max-width:_600px)]:justify-between" href="#top" aria-label="Về đầu trang">
            <span>Về đầu trang</span><Icon name="arrow" />
          </a>
        </div>
        <div className="[padding-block:22px_26px] [border-top:1px_solid_#8db3e52b] text-[length:12px] text-[#96aac8] [@media_(max-width:_600px)]:text-[length:11px] [@media_(max-width:_600px)]:[padding-block:20px_26px] flex flex-wrap justify-between gap-3">
          <p>© 2026 LawScan</p>
          <p>AI hỗ trợ rà soát, không thay thế tư vấn pháp lý chuyên nghiệp.</p>
        </div>
      </div>
    </footer>
  );
}
