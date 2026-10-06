import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { PrintReportButton } from "@/components/report/print-report-button";

export const metadata: Metadata = {
  title: "Báo cáo rà soát mẫu | LawScan",
  description: "Xem cấu trúc báo cáo rà soát hợp đồng minh họa của LawScan.",
};

const findings = [
  {
    level: "Ưu tiên cao",
    tone: "high",
    title: "Quyền chấm dứt chưa cân bằng",
    clause: "Bên A có quyền chấm dứt hợp đồng vào bất kỳ thời điểm nào khi xét thấy cần thiết.",
    reason: "Điều khoản chưa nêu trường hợp áp dụng, thời gian báo trước và cách xử lý nghĩa vụ đang thực hiện.",
    suggestion: "Xác định rõ căn cứ chấm dứt, thời hạn thông báo và trách nhiệm thanh toán cho phần công việc đã hoàn thành.",
  },
  {
    level: "Cần làm rõ",
    tone: "medium",
    title: "Chưa có thời hạn thanh toán",
    clause: "Bên mua thanh toán sau khi hoàn thành nghĩa vụ và nghiệm thu.",
    reason: "Cụm từ “sau khi” không xác định số ngày thanh toán hoặc thời điểm bắt đầu tính hạn.",
    suggestion: "Cân nhắc quy định thanh toán trong 07 ngày làm việc kể từ ngày ký biên bản nghiệm thu hợp lệ.",
  },
  {
    level: "Nên thống nhất",
    tone: "low",
    title: "Tiêu chí nghiệm thu còn chung chung",
    clause: "Dịch vụ được nghiệm thu khi đáp ứng yêu cầu của Bên A.",
    reason: "Hai bên có thể hiểu khác nhau về phạm vi yêu cầu và cách xác nhận kết quả.",
    suggestion: "Dẫn chiếu phụ lục tiêu chí, quy định thời hạn phản hồi và hình thức biên bản nghiệm thu.",
  },
] as const;

const findingToneClasses = {
  high: "border-l-[#d84d60] [&_header]:bg-[#fff7f8] [&_header_small]:text-[#b63a4b]",
  medium: "border-l-[#e2a21b] [&_header]:bg-[#fffbf0] [&_header_small]:text-[#a56b00]",
  low: "border-l-[#278bc0] [&_header]:bg-[#f3faff] [&_header_small]:text-[#146c99]",
} as const;

export default function SampleReportPage() {
  return (
    <main id="main-content" className="text-[#101a35] [background:#f5f7fa] print:![background:#fff] print:!text-[#111]">
      <section className="text-white [background:radial-gradient(circle_at_82%_20%,#1d5cac99,transparent_34%),#0b1832] pt-[78px] pb-[62px] px-0 [&_h1]:text-[length:clamp(42px,5vw,68px)] [&_h1]:leading-[1.06] [&_h1]:tracking-[-2.8px] [&_h1]:mt-3.5 [@media_(max-width:_600px)]:pt-12 [@media_(max-width:_600px)]:pb-[42px] [@media_(max-width:_600px)]:px-0 [&_h1]:[@media_(max-width:_600px)]:text-[length:39px] [&_h1]:[@media_(max-width:_600px)]:tracking-[-1.7px] print:![background:#fff] print:!text-[#111] print:pt-5 print:pb-[30px] print:px-0 [&_h1]:print:text-[length:38px]">
        <div className={`w-[min(1380px,calc(100%_-_112px))] mx-auto max-[1199px]:w-[calc(100%_-_64px)] max-[600px]:w-[calc(100%_-_40px)] ${"flex [align-items:end] justify-between gap-[60px] [@media_(max-width:_900px)]:items-start [@media_(max-width:_900px)]:flex-col [@media_(max-width:_900px)]:gap-[30px] print:block"}`}>
          <div>
            <Link className="w-fit inline-flex items-center gap-[9px] min-h-[38px] text-[#d5e5fa] border [background:#ffffff0a] text-[length:11px] font-[620] mb-[35px] pl-[9px] pr-3 py-[7px] rounded-[999px] border-solid border-[#7ca3d552] hover:text-white hover:[background:#ffffff14] hover:border-[#7eb3ff] [&_svg]:w-[18px] [&_svg]:[transform:rotate(180deg)] [@media_(max-width:_600px)]:mb-[27px] print:hidden" href="/"><Icon name="arrow" />Quay về trang chủ</Link>
            <p className="text-[#83b5ff] [font-family:var(--font-geist-mono),monospace] text-[length:9px] font-[650] tracking-[1.5px] print:!text-[#444] text-[length:10px] font-[680]">BÁO CÁO RÀ SOÁT · DỮ LIỆU MINH HỌA</p>
            <h1>Hợp đồng cung cấp<br />dịch vụ vận hành</h1>
            <p className="max-w-[670px] text-[#b7c7dd] text-[length:16px] leading-[1.7] mt-5 [@media_(max-width:_600px)]:text-[length:13px] print:!text-[#444] max-w-[690px] text-[#c4d2e5] text-[length:17px] [@media_(max-width:_600px)]:text-[length:14px]">Một ví dụ hoàn chỉnh về cách LawScan sắp xếp tổng quan, điểm cần xem lại, nguồn và đề xuất chỉnh sửa.</p>
          </div>
          <div className="flex flex-col items-stretch gap-[11px] w-[215px] flex-none [&>_a]:min-h-12 [&>_a]:flex [&>_a]:items-center [&>_a]:justify-between [&>_a]:gap-2.5 [&>_a]:border [&>_a]:[font:inherit] [&>_a]:px-[15px] [&>_a]:py-0 [&>_a]:rounded-[10px] [&>_a]:border-solid [&>_a]:border-[#77a6e55c] [&>_a]:[font-size:11px] [&>_a]:[font-weight:650] [&>_a]:text-white [&>_a]:[background:#096df0] [&_svg]:w-[17px] [@media_(max-width:_900px)]:w-full [@media_(max-width:_900px)]:max-w-[440px] [@media_(max-width:_900px)]:flex-row [&>_*]:[@media_(max-width:_900px)]:flex-1 [@media_(max-width:_600px)]:flex-col print:!hidden">
            <PrintReportButton />
            <Link href="/dang-ky">Đăng ký dùng thử <Icon name="arrow" /></Link>
          </div>
        </div>
      </section>

      <div className={`w-[min(1380px,calc(100%_-_112px))] mx-auto max-[1199px]:w-[calc(100%_-_64px)] max-[600px]:w-[calc(100%_-_40px)] ${"grid grid-cols-[270px_minmax(0,1fr)] gap-10 [align-items:start] pt-[42px] pb-[90px] [@media_(max-width:_900px)]:grid-cols-[1fr] [@media_(max-width:_600px)]:pt-[22px] [@media_(max-width:_600px)]:pb-[58px] print:block print:p-0"}`}>
        <aside className="sticky grid gap-[17px] top-[22px] [&>_nav]:grid [&>_nav]:border [&>_nav]:[background:#fff] [&>_nav]:p-[7px] [&>_nav]:rounded-[13px] [&>_nav]:border-solid [&>_nav]:border-[#dce4ed] [&>_nav_a]:text-[#596981] [&>_nav_a]:text-[length:9px] [&>_nav_a]:p-2.5 [&>_nav_a]:rounded-lg [&>_nav_a]:hover:text-[#0868ed] [&>_nav_a]:hover:[background:#f1f6fd] [&>_p]:text-[#7c899b] [&>_p]:text-[length:8px] [&>_p]:leading-[1.6] [&>_p]:px-[7px] [&>_p]:py-0 [&>_p]:[@media_(max-width:_900px)]:col-span-full [@media_(max-width:_900px)]:static [@media_(max-width:_900px)]:grid-cols-[1fr_1fr] [@media_(max-width:_600px)]:grid-cols-[1fr] [&>_p]:[@media_(max-width:_600px)]:col-auto print:!hidden [&>_nav]:p-[9px] [&>_nav]:rounded-[15px] [&>_nav_a]:text-[#40536f] [&>_nav_a]:text-[length:13px] [&>_nav_a]:font-[620] [&>_nav_a]:leading-[1.35] [&>_nav_a]:px-3 [&>_nav_a]:py-[13px] [&>_nav_a]:hover:[background:#edf5ff] [&>_p]:text-[#5f6f85] [&>_p]:text-[length:12px] [&>_p]:leading-[1.65] [&>_p]:pt-0.5 [&>_p]:pb-0 [&>_p]:px-[9px]" aria-label="Mục lục báo cáo">
          <div className="flex gap-2.5 border [background:#fff] p-3.5 rounded-[13px] border-solid border-[#dce4ed] [&>_span]:w-[34px] [&>_span]:h-[34px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:text-[#0868ed] [&>_span]:[background:#edf5ff] [&>_span]:rounded-[9px] [&_svg]:w-[17px] [&_small]:block [&_strong]:block [&_small]:text-[#0870f6] [&_small]:text-[length:7px] [&_small]:tracking-[0.8px] [&_strong]:max-w-[140px] [&_strong]:overflow-hidden [&_strong]:text-[length:9px] [&_strong]:text-ellipsis [&_strong]:whitespace-nowrap [&_strong]:mt-[5px] [&_p]:text-[#8792a3] [&_p]:text-[length:7px] [&_p]:mt-[3px] gap-[13px] p-[17px] rounded-[15px] [&>_span]:w-10 [&>_span]:h-10 [&>_span]:rounded-[11px] [&_svg]:w-5 [&_small]:text-[length:9px] [&_small]:font-bold [&_strong]:max-w-[175px] [&_strong]:text-[length:13px] [&_strong]:mt-1.5 [&_strong]:[@media_(max-width:_600px)]:max-w-none [&_p]:text-[#68778d] [&_p]:text-[length:11px] [&_p]:mt-[5px]"><span><Icon name="document" /></span><div><small>TỆP MẪU</small><strong>Hop-dong-dich-vu.docx</strong><p>12 trang · Tiếng Việt</p></div></div>
          <nav><a href="#tong-quan">01 · Tổng quan</a><a href="#diem-can-xem">02 · Điểm cần xem</a><a href="#nguon">03 · Nguồn tham chiếu</a><a href="#pham-vi-bao-cao">04 · Phạm vi báo cáo</a></nav>
          <p>Đây là báo cáo tĩnh để minh họa cấu trúc đầu ra dự kiến. Không có tài liệu thật được tải lên.</p>
        </aside>

        <article className="border [background:#fff] shadow-[0_26px_65px_-52px_#102c5888] px-[50px] py-11 rounded-[3px] border-solid border-[#dce4ed] [@media_(max-width:_900px)]:p-9 [@media_(max-width:_600px)]:px-[17px] [@media_(max-width:_600px)]:py-6 [@media_(max-width:_600px)]:rounded-[10px] print:shadow-none print:p-0 print:border-0 print:border-none print:border-current">
          <div className="flex items-center gap-3 text-[#664c16] border [background:#fffaf0] px-[15px] py-[13px] rounded-[10px] border-solid border-[#eedcae] [&>_svg]:w-5 [&>_svg]:flex-none [&>_svg]:text-[#c98800] [&_p_strong]:block [&_p_span]:block [&_strong]:text-[length:10px] [&_span]:text-[#81704d] [&_span]:text-[length:8px] [&_span]:mt-[3px] [@media_(max-width:_600px)]:items-start [&_strong]:text-[length:12px] [&_p_span]:text-[#74623f] [&_p_span]:text-[length:10px] [&_p_span]:leading-normal [&_p_span]:mt-1"><Icon name="shield" /><p><strong>Báo cáo minh họa</strong><span>Nội dung không phải kết luận pháp lý và không thay thế việc kiểm tra của người phụ trách.</span></p></div>

          <section id="tong-quan" className="pt-[50px] pb-2 px-0 scroll-mt-6 [border-top:1px_solid_#e4e9ef] mt-5">
            <div className="flex items-start gap-4 [&>_span]:w-8 [&>_span]:h-8 [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:text-[#0868ed] [&>_span]:border [&>_span]:[background:#edf5ff] [&>_span]:text-[length:8px] [&>_span]:font-bold [&>_span]:rounded-[9px] [&>_span]:border-solid [&>_span]:border-[#c5daf8] [&_small]:text-[#0870f6] [&_small]:text-[length:7px] [&_small]:font-bold [&_small]:tracking-[1px] [&_h2]:text-[length:24px] [&_h2]:tracking-[-0.7px] [&_h2]:mt-1 [&_h2]:[@media_(max-width:_600px)]:text-[length:20px] gap-[17px] [&>_span]:w-[38px] [&>_span]:h-[38px] [&>_span]:text-[length:10px] [&_small]:text-[#0768e6] [&_small]:text-[length:9px] [&_small]:font-[720] [&_h2]:text-[#101c38] [&_h2]:text-[length:29px] [&_h2]:tracking-[-0.9px] [&_h2]:mt-[5px] [&_h2]:[@media_(max-width:_600px)]:text-[length:23px]"><span>01</span><div><small>TỔNG QUAN</small><h2>Những điều cần biết trước</h2></div></div>
            <div className="grid grid-cols-[repeat(3,1fr)] gap-2.5 mt-[27px] [&>_div]:border [&>_div]:[background:#f8fafc] [&>_div]:p-[17px] [&>_div]:rounded-[11px] [&>_div]:border-solid [&>_div]:border-[#e0e6ee] [&_small]:block [&_strong]:block [&_small]:text-[#728197] [&_small]:text-[length:7px] [&_small]:tracking-[0.75px] [&_strong]:text-[#14213b] [&_strong]:text-[length:16px] [&_strong]:mt-[9px] [&_p]:text-[#8290a2] [&_p]:text-[length:8px] [&_p]:mt-[5px] [@media_(max-width:_600px)]:grid-cols-[1fr] gap-3 mt-[29px] [&>_div]:p-5 [&>_div]:rounded-xl [&>_div]:border-[#dce4ed] [&>_div:nth-child(3)]:[background:#eef6ff] [&>_div:nth-child(3)]:border-[#bcd5fa] [&_small]:text-[#65758d] [&_small]:text-[length:9px] [&_small]:font-[650] [&_strong]:text-[#101e3a] [&_strong]:text-[length:21px] [&_strong]:mt-2.5 [&_p]:text-[#6f7e92] [&_p]:text-[length:10px] [&_p]:leading-normal [&_p]:mt-1.5">
              <div><small>THỜI HẠN</small><strong>12 tháng</strong><p>Tự động gia hạn nếu không thông báo</p></div>
              <div><small>THANH TOÁN</small><strong>Theo nghiệm thu</strong><p>Chưa có số ngày thanh toán</p></div>
              <div><small>ĐIỂM CẦN XEM</small><strong>03</strong><p>Sắp xếp theo mức ưu tiên</p></div>
            </div>
            <p className="text-[#53627a] text-[length:12px] leading-[1.75] ml-12 mr-0 mt-[23px] mb-0 [@media_(max-width:_600px)]:ml-0 text-[#40516b] text-[length:14px] leading-[1.8] ml-[55px] mt-[25px] [@media_(max-width:_600px)]:text-[length:13px]">Hợp đồng quy định việc cung cấp dịch vụ vận hành trong 12 tháng. Trước khi ký, hai bên nên làm rõ quyền chấm dứt, thời hạn thanh toán và tiêu chí nghiệm thu.</p>
          </section>

          <section id="diem-can-xem" className="pt-[50px] pb-2 px-0 scroll-mt-6 [border-top:1px_solid_#e4e9ef] mt-5">
            <div className="flex items-start gap-4 [&>_span]:w-8 [&>_span]:h-8 [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:text-[#0868ed] [&>_span]:border [&>_span]:[background:#edf5ff] [&>_span]:text-[length:8px] [&>_span]:font-bold [&>_span]:rounded-[9px] [&>_span]:border-solid [&>_span]:border-[#c5daf8] [&_small]:text-[#0870f6] [&_small]:text-[length:7px] [&_small]:font-bold [&_small]:tracking-[1px] [&_h2]:text-[length:24px] [&_h2]:tracking-[-0.7px] [&_h2]:mt-1 [&_h2]:[@media_(max-width:_600px)]:text-[length:20px] gap-[17px] [&>_span]:w-[38px] [&>_span]:h-[38px] [&>_span]:text-[length:10px] [&_small]:text-[#0768e6] [&_small]:text-[length:9px] [&_small]:font-[720] [&_h2]:text-[#101c38] [&_h2]:text-[length:29px] [&_h2]:tracking-[-0.9px] [&_h2]:mt-[5px] [&_h2]:[@media_(max-width:_600px)]:text-[length:23px]"><span>02</span><div><small>ĐIỂM CẦN XEM LẠI</small><h2>Ba nội dung cần ưu tiên trao đổi</h2></div></div>
            <div className="grid gap-[13px] mt-7">
              {findings.map((finding, index) => (
                <article className={`${"overflow-hidden border rounded-[13px] border-solid border-[#dfe6ef] [&_header]:flex [&_header]:items-center [&_header]:gap-3 [&_header]:[background:#f8fafc] [&_header]:px-[17px] [&_header]:py-[15px] [&_header_>_span]:text-[#8290a4] [&_header_>_span]:text-[length:9px] [&_header_small]:text-[length:7px] [&_header_small]:font-bold [&_header_small]:tracking-[0.75px] [&_header_small]:uppercase [&_h3]:text-[length:14px] [&_h3]:mt-[3px] [&_blockquote]:[border-top:1px_solid_#e6ebf1] [&_blockquote]:[border-bottom:1px_solid_#e6ebf1] [&_blockquote]:[background:#fff] [&_blockquote]:m-0 [&_blockquote]:px-5 [&_blockquote]:py-[17px] [&_blockquote_small]:text-[#7e8a9c] [&_blockquote_small]:text-[length:7px] [&_blockquote_small]:font-[650] [&_blockquote_small]:tracking-[0.7px] [&_blockquote_p]:text-[#34435b] [&_blockquote_p]:[font-family:var(--font-lora),Georgia,serif] [&_blockquote_p]:text-[length:12px] [&_blockquote_p]:italic [&_blockquote_p]:leading-[1.7] [&_blockquote_p]:mt-[7px] print:break-inside-avoid border-l-4 border-[#d9e2ed] [&_header]:gap-[13px] [&_header]:px-[19px] [&_header]:py-[17px] [&_header_>_span]:text-[#66768d] [&_header_>_span]:text-[length:11px] [&_header_>_span]:font-[650] [&_header_small]:text-[length:9px] [&_header_small]:font-[720] [&_h3]:text-[#16223b] [&_h3]:text-[length:18px] [&_h3]:mt-1 [&_blockquote]:px-[22px] [&_blockquote]:py-[19px] [&_blockquote_small]:text-[#67778e] [&_blockquote_small]:text-[length:9px] [&_blockquote_small]:font-bold [&_blockquote_p]:text-[#273852] [&_blockquote_p]:text-[length:15px] [&_blockquote_p]:font-[550] [&_blockquote_p]:leading-[1.75] [&_blockquote_p]:mt-[9px] [&_h3]:[@media_(max-width:_600px)]:text-[length:16px] [&_blockquote_p]:[@media_(max-width:_600px)]:text-[length:14px]"} ${findingToneClasses[finding.tone]}`} key={finding.title}>
                  <header><span>{String(index + 1).padStart(2, "0")}</span><div><small>{finding.level}</small><h3>{finding.title}</h3></div></header>
                  <blockquote><small>ĐIỀU KHOẢN GỐC</small><p>“{finding.clause}”</p></blockquote>
                  <div className="[&_small]:text-[#7e8a9c] [&_small]:text-[length:7px] [&_small]:font-[650] [&_small]:tracking-[0.7px] grid grid-cols-[1fr_1fr] [&>_div]:px-5 [&>_div]:py-[17px] [&>_div_+_div]:[border-left:1px_solid_#e6ebf1] [&_p]:text-[#59687e] [&_p]:text-[length:10px] [&_p]:leading-[1.65] [&_p]:mt-[7px] [@media_(max-width:_600px)]:grid-cols-[1fr] [&>_div_+_div]:[@media_(max-width:_600px)]:[border-left:0] [&>_div_+_div]:[@media_(max-width:_600px)]:[border-top:1px_solid_#e6ebf1] [&_small]:text-[#67778e] [&_small]:text-[length:9px] [&_small]:font-bold [&>_div]:px-[22px] [&>_div]:py-[19px] [&>_div_+_div]:[background:#f4f8fe] [&>_div_+_div]:border-[#dbe6f3] [&>_div_+_div_small]:text-[#0868ed] [&_p]:text-[#45566f] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mt-[9px] [&_p]:[@media_(max-width:_600px)]:text-[length:12px]"><div><small>VÌ SAO CẦN XEM LẠI</small><p>{finding.reason}</p></div><div><small>GỢI Ý TRAO ĐỔI</small><p>{finding.suggestion}</p></div></div>
                </article>
              ))}
            </div>
          </section>

          <section id="nguon" className="pt-[50px] pb-2 px-0 scroll-mt-6 [border-top:1px_solid_#e4e9ef] mt-5">
            <div className="flex items-start gap-4 [&>_span]:w-8 [&>_span]:h-8 [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:text-[#0868ed] [&>_span]:border [&>_span]:[background:#edf5ff] [&>_span]:text-[length:8px] [&>_span]:font-bold [&>_span]:rounded-[9px] [&>_span]:border-solid [&>_span]:border-[#c5daf8] [&_small]:text-[#0870f6] [&_small]:text-[length:7px] [&_small]:font-bold [&_small]:tracking-[1px] [&_h2]:text-[length:24px] [&_h2]:tracking-[-0.7px] [&_h2]:mt-1 [&_h2]:[@media_(max-width:_600px)]:text-[length:20px] gap-[17px] [&>_span]:w-[38px] [&>_span]:h-[38px] [&>_span]:text-[length:10px] [&_small]:text-[#0768e6] [&_small]:text-[length:9px] [&_small]:font-[720] [&_h2]:text-[#101c38] [&_h2]:text-[length:29px] [&_h2]:tracking-[-0.9px] [&_h2]:mt-[5px] [&_h2]:[@media_(max-width:_600px)]:text-[length:23px]"><span>03</span><div><small>NGUỒN THAM CHIẾU</small><h2>Điểm bắt đầu để kiểm tra lại</h2></div></div>
            <div className="flex gap-4 text-[#dce8f8] [background:#0e1d38] mt-[27px] p-[21px] rounded-[13px] [&>_svg]:w-[26px] [&>_svg]:flex-none [&>_svg]:text-[#72aaff] [&_strong]:text-[length:13px] [&_p]:text-[#aabbd3] [&_p]:text-[length:10px] [&_p]:leading-[1.65] [&_p]:mt-[7px] [&_small]:block [&_small]:text-[#7394c0] [&_small]:text-[length:7px] [&_small]:tracking-[0.65px] [&_small]:mt-3 print:break-inside-avoid print:text-[#111] print:border print:[background:#f6f6f6] print:border-solid print:border-[#ccc] [&_p]:print:text-[#444] gap-[17px] text-[#e4edf9] mt-[29px] p-6 [&>_svg]:w-[29px] [&_strong]:text-[length:16px] [&_p]:text-[#b7c6da] [&_p]:text-[length:13px] [&_p]:leading-[1.7] [&_p]:mt-2 [&_small]:text-[#88a5ca] [&_small]:text-[length:9px] [&_small]:mt-3.5"><Icon name="scales" /><div><strong>Văn bản và điều khoản liên quan</strong><p>Trong sản phẩm hoàn chỉnh, nguồn sẽ được đặt cạnh từng nhận định để người dùng đọc phạm vi áp dụng và kiểm tra hiệu lực.</p><small>TRẠNG THÁI · Nguồn trong báo cáo này là nội dung minh họa</small></div></div>
          </section>

          <section id="pham-vi-bao-cao" className="pt-[50px] pb-2 px-0 scroll-mt-6 [border-top:1px_solid_#e4e9ef] mt-5">
            <div className="flex items-start gap-4 [&>_span]:w-8 [&>_span]:h-8 [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:text-[#0868ed] [&>_span]:border [&>_span]:[background:#edf5ff] [&>_span]:text-[length:8px] [&>_span]:font-bold [&>_span]:rounded-[9px] [&>_span]:border-solid [&>_span]:border-[#c5daf8] [&_small]:text-[#0870f6] [&_small]:text-[length:7px] [&_small]:font-bold [&_small]:tracking-[1px] [&_h2]:text-[length:24px] [&_h2]:tracking-[-0.7px] [&_h2]:mt-1 [&_h2]:[@media_(max-width:_600px)]:text-[length:20px] gap-[17px] [&>_span]:w-[38px] [&>_span]:h-[38px] [&>_span]:text-[length:10px] [&_small]:text-[#0768e6] [&_small]:text-[length:9px] [&_small]:font-[720] [&_h2]:text-[#101c38] [&_h2]:text-[length:29px] [&_h2]:tracking-[-0.9px] [&_h2]:mt-[5px] [&_h2]:[@media_(max-width:_600px)]:text-[length:23px]"><span>04</span><div><small>PHẠM VI BÁO CÁO</small><h2>Điều báo cáo này có và chưa có</h2></div></div>
            <div className="grid grid-cols-[1fr_1fr] gap-3 mt-[27px] [&>_div]:border [&>_div]:p-5 [&>_div]:rounded-xl [&>_div]:border-solid [&>_div]:border-[#dfe6ef] [&_svg]:w-[19px] [&_svg]:text-[#0868ed] [&_strong]:block [&_strong]:text-[length:12px] [&_strong]:mt-[13px] [&_ul]:grid [&_ul]:gap-[7px] [&_ul]:text-[#68768a] [&_ul]:text-[length:9px] [&_ul]:mt-[13px] [&_li]:before:content-['·'] [&_li]:before:text-[#0868ed] [&_li]:before:mr-[7px] [@media_(max-width:_600px)]:grid-cols-[1fr] [&>_div]:print:break-inside-avoid gap-[13px] mt-[29px] [&>_div]:p-[23px] [&>_div]:border-[#dbe4ee] [&_svg]:w-[22px] [&_strong]:text-[#17243d] [&_strong]:text-[length:15px] [&_strong]:mt-3.5 [&_ul]:gap-2 [&_ul]:text-[#56667e] [&_ul]:text-[length:12px] [&_ul]:mt-3.5"><div><Icon name="check" /><strong>Có trong bản mẫu</strong><ul><li>Tóm tắt nội dung chính</li><li>Sắp xếp điểm cần xem</li><li>Giải thích và đề xuất</li></ul></div><div><Icon name="search" /><strong>Cần được kiểm tra thêm</strong><ul><li>Hiệu lực nguồn áp dụng</li><li>Bối cảnh giao dịch thực tế</li><li>Ý kiến chuyên gia khi cần</li></ul></div></div>
          </section>

          <footer className="flex justify-between gap-5 text-[#8995a5] [border-top:1px_solid_#e3e8ef] text-[length:8px] mt-[58px] pt-[18px] [@media_(max-width:_600px)]:items-start [@media_(max-width:_600px)]:flex-col text-[#748297] text-[length:10px] mt-[60px] pt-[19px] border-[#dfe6ee]"><span>LawScan · Báo cáo minh họa</span><span>Người dùng kiểm tra và quyết định nội dung cuối cùng.</span></footer>
        </article>
      </div>
    </main>
  );
}
