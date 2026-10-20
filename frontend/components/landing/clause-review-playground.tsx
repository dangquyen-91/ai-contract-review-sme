"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

const scenarios = [
  {
    id: "payment",
    label: "Thanh toán",
    title: "Điều 7. Thanh toán",
    prefix: "Bên A thực hiện thanh toán ",
    highlight: "sau khi Bên B hoàn thành nghĩa vụ.",
    suffix: "",
    risk: "Chưa xác định thời hạn thanh toán",
    reason: "Cụm “sau khi hoàn thành” chưa nêu số ngày và sự kiện bắt đầu tính thời hạn.",
    source: "Đối chiếu điều khoản thanh toán, nghiệm thu và bộ hồ sơ thanh toán của hợp đồng.",
    suggestion: "Bên A thanh toán trong 15 ngày làm việc kể từ ngày ký biên bản nghiệm thu hợp lệ.",
  },
  {
    id: "acceptance",
    label: "Nghiệm thu",
    title: "Điều 9. Nghiệm thu",
    prefix: "Sản phẩm được xem là đạt yêu cầu ",
    highlight: "khi đáp ứng mong đợi của Bên A.",
    suffix: "",
    risk: "Tiêu chí nghiệm thu còn định tính",
    reason: "“Đáp ứng mong đợi” khó đo lường và có thể khiến hai bên hiểu khác nhau về kết quả.",
    source: "Đối chiếu phạm vi công việc, phụ lục tiêu chí và quy trình phản hồi khi nghiệm thu.",
    suggestion: "Sản phẩm được nghiệm thu theo tiêu chí tại Phụ lục 01 trong 05 ngày làm việc.",
  },
  {
    id: "termination",
    label: "Chấm dứt",
    title: "Điều 12. Chấm dứt",
    prefix: "Một bên có quyền chấm dứt hợp đồng ",
    highlight: "vào bất kỳ thời điểm nào khi thấy cần thiết.",
    suffix: "",
    risk: "Điều kiện chấm dứt chưa cân bằng",
    reason: "Điều khoản chưa nêu căn cứ, thời gian báo trước và nghĩa vụ còn lại của mỗi bên.",
    source: "Đối chiếu điều khoản vi phạm, khắc phục, thông báo và hậu quả sau chấm dứt.",
    suggestion: "Một bên được chấm dứt nếu vi phạm không được khắc phục trong 15 ngày kể từ thông báo.",
  },
] as const;

const decisions = [
  { id: "accept", label: "Chấp nhận gợi ý" },
  { id: "discuss", label: "Cần trao đổi" },
  { id: "keep", label: "Giữ nguyên" },
] as const;

type Decision = (typeof decisions)[number]["id"] | null;

export function ClauseReviewPlayground() {
  const [selected, setSelected] = useState(0);
  const [decision, setDecision] = useState<Decision>(null);
  const scenario = scenarios[selected];

  function selectScenario(index: number) {
    setSelected(index);
    setDecision(null);
  }

  return (
    <section id="kiem-tra-dieu-khoan" className="[border-bottom:1px_solid_#dfe8f3] [background:linear-gradient(180deg,#f8fbff_0%,#fff_100%)] pt-[92px] pb-[86px] px-0 [@media_(max-width:_700px)]:pt-[68px] [@media_(max-width:_700px)]:pb-16 [@media_(max-width:_700px)]:px-0" aria-labelledby="playground-heading">
      <div className={`w-[min(1380px,calc(100%_-_112px))] mx-auto max-[1199px]:w-[calc(100%_-_64px)] max-[600px]:w-[calc(100%_-_40px)] ${"grid"}`}>
        <header className="grid grid-cols-[minmax(0,1fr)_minmax(300px,470px)] [align-items:end] gap-[70px] [&_h2]:text-[#08132f] [&_h2]:text-[length:clamp(39px,4.3vw,62px)] [&_h2]:leading-[1.05] [&_h2]:tracking-[-0.047em] [&_h2_span]:text-[#0868ed] [&>_p]:text-[#53647d] [&>_p]:text-[length:17px] [&>_p]:leading-[1.7] [&>_p]:pb-[5px] [&>_p]:[@media_(max-width:_1050px)]:max-w-[680px] [@media_(max-width:_1050px)]:grid-cols-[1fr] [@media_(max-width:_1050px)]:gap-5 [&_h2]:[@media_(max-width:_700px)]:text-[length:38px] [&>_p]:[@media_(max-width:_700px)]:text-[length:15px]" data-reveal>
          <div>
            <p className="flex gap-[11px] items-center text-[#7382a5] text-[length:11px] font-semibold uppercase tracking-[1.8px] mb-4 before:content-[''] before:w-5 before:h-0.5 before:[background:var(--ls-blue)] text-[#bbc7db] [@media_(max-width:_600px)]:text-[length:10px] [@media_(max-width:_600px)]:tracking-[1.2px]">01 / Trải nghiệm cách LawScan rà soát</p>
            <h2 id="playground-heading">Một điều khoản.<br /><span>Từ cảnh báo đến quyết định.</span></h2>
          </div>
          <p>LawScan đặt điều khoản gốc, lý do, nguồn cần kiểm tra và cách diễn đạt cạnh nhau để bạn chủ động đánh giá.</p>
        </header>

        <div className="w-fit flex gap-2 border [background:#fff] shadow-[0_12px_35px_-30px_#0d315f80] mt-[38px] p-1.5 rounded-[15px] border-solid border-[#dce5f0] [&_button]:min-h-[45px] [&_button]:text-[#50617a] [&_button]:text-[length:13px] [&_button]:font-[620] [&_button]:px-[18px] [&_button]:py-0 [&_button]:rounded-[10px] [&_button_span]:text-[#8a98ab] [&_button_span]:[font-family:var(--font-geist-mono),monospace] [&_button_span]:text-[length:9px] [&_button_span]:mr-[9px] [&_button]:aria-selected:text-white [&_button]:aria-selected:[background:#0c65e8] [&_button]:aria-selected:shadow-[0_9px_18px_-12px_#064ba9] [&_button[aria-selected='true']_span]:text-[#bdd8ff] [@media_(max-width:_700px)]:w-full [@media_(max-width:_700px)]:overflow-x-auto [&_button]:[@media_(max-width:_700px)]:flex-[1_0_auto]" role="tablist" aria-label="Chọn tình huống hợp đồng" data-reveal>
          {scenarios.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`scenario-tab-${item.id}`}
              aria-selected={selected === index}
              aria-controls="clause-review-panel"
              onClick={() => selectScenario(index)}
            >
              <span>0{index + 1}</span>{item.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-[minmax(0,0.88fr)_minmax(520px,1.12fr)] gap-6 border [background:#eef4fb] shadow-[0_34px_80px_-64px_#0d2f5d99] mt-[22px] p-[22px] rounded-[25px] border-solid border-[#dbe5f0] [@media_(max-width:_1050px)]:grid-cols-[1fr] [@media_(max-width:_700px)]:p-2.5 [@media_(max-width:_700px)]:rounded-[18px]" data-reveal>
          <article className="relative min-h-[610px] overflow-hidden border bg-white bg-[linear-gradient(#eaf0f7_1px,transparent_1px),linear-gradient(90deg,#eaf0f7_1px,transparent_1px)] bg-[length:46px_46px] shadow-[0_25px_55px_-45px_#092b5999] px-[43px] py-10 rounded-[17px] border-solid border-[#e0e6ed] before:content-[''] before:absolute before:z-0 before:pointer-events-none before:rounded-[50%] after:content-[''] after:absolute after:z-0 after:pointer-events-none after:rounded-[50%] before:w-[220px] before:h-[220px] before:right-[-120px] before:top-[-105px] before:border-[38px] before:border-solid before:border-[#e9f3ff] after:w-[180px] after:h-[180px] after:left-[-110px] after:bottom-[-110px] after:[background:#f1f6fc] [@media_(max-width:_1050px)]:min-h-[520px] [@media_(max-width:_700px)]:min-h-[500px] [@media_(max-width:_700px)]:px-[22px] [@media_(max-width:_700px)]:py-7" aria-label={`Điều khoản minh họa: ${scenario.label}`}>
            <div className="relative z-[1] flex items-center justify-between gap-[18px] [border-bottom:1px_solid_#dce4ed] pb-[22px] [&>_span]:flex [&>_span]:items-center [&>_span]:gap-[11px] [&>_span]:text-[#14223d] [&>_span]:text-[length:14px] [&>_span]:font-[750] [&>_span]:uppercase [&_svg]:w-[21px] [&_svg]:text-[#0868ed] [&_small]:text-[#0868ed] [&_small]:[background:#eaf3ff] [&_small]:text-[length:8px] [&_small]:font-[720] [&_small]:tracking-[1px] [&_small]:px-[9px] [&_small]:py-1.5 [&_small]:rounded-[999px]">
              <span><Icon name="document" />Hợp đồng dịch vụ</span>
              <small>MINH HỌA</small>
            </div>
            <div className="relative z-[1] grid gap-[9px] mt-7 [&_i]:block [&_i]:w-[91%] [&_i]:h-[7px] [&_i]:[background:#e3e8ef] [&_i]:rounded-[99px] [&_i:nth-child(2)]:w-[76%] [&_i:nth-child(3)]:w-[58%] [&_i:nth-child(4)]:w-[83%]" aria-hidden="true"><i /><i /><i /></div>
            <div className="relative z-[1] overflow-hidden border [background:#f8fbff] mt-[38px] mb-[35px] mx-0 pt-6 pb-[27px] px-6 rounded-[14px] border-solid border-[#bfd7fa] [&_small]:text-[#547092] [&_small]:text-[length:10px] [&_small]:font-bold [&_p]:text-[#17243e] [&_p]:[font-family:var(--font-lora),Georgia,serif] [&_p]:text-[length:20px] [&_p]:leading-[1.75] [&_p]:mt-[15px] [&_mark]:text-[#17243e] [&_mark]:[background:#ffedbd] [&_mark]:shadow-[inset_0_-1px_#e8be55] [&_mark]:box-decoration-clone [&_mark]:[-webkit-box-decoration-break:clone] [&_mark]:px-1 [&_mark]:py-0.5 [@media_(max-width:_700px)]:mt-[30px] [@media_(max-width:_700px)]:p-5 [&_p]:[@media_(max-width:_700px)]:text-[length:17px]" key={scenario.id}>
              <small>{scenario.title}</small>
              <p>{scenario.prefix}<mark>{scenario.highlight}</mark>{scenario.suffix}</p>
              <span className="absolute left-[-22%] w-[18%] opacity-0 [background:linear-gradient(90deg,transparent,#2c86ff20,transparent)] [transform:skewX(-12deg)] animate-[scan_1.25s_cubic-bezier(.22,1,0.36,1)_0.2s_1_both] right-auto inset-y-0 motion-reduce:animate-none" aria-hidden="true" />
            </div>
            <div className="relative z-[1] grid gap-[9px] mt-7 [&_i]:block [&_i]:w-[91%] [&_i]:h-[7px] [&_i]:[background:#e3e8ef] [&_i]:rounded-[99px] [&_i:nth-child(2)]:w-[76%] [&_i:nth-child(3)]:w-[58%] [&_i:nth-child(4)]:w-[83%]" aria-hidden="true"><i /><i /><i /><i /></div>
            <p className="relative z-[1] absolute flex items-center gap-2 text-[#7a899d] text-[length:10px] bottom-[30px] inset-x-[43px] [&_svg]:w-[15px] [&_svg]:text-[#3f79bf] [@media_(max-width:_700px)]:inset-x-[22px]"><Icon name="shield" />Dữ liệu trong trải nghiệm này được chuẩn bị sẵn.</p>
          </article>

          <div
            id="clause-review-panel"
            role="tabpanel"
            aria-labelledby={`scenario-tab-${scenario.id}`}
            className="grid [align-content:start] gap-2.5 p-1.5 [@media_(max-width:_1050px)]:pt-[15px]"
            key={`review-${scenario.id}`}
          >
            <div className="min-h-[72px] flex items-center justify-between gap-5 pt-[7px] pb-3 px-3 [&_small]:block [&_strong]:block [&_small]:text-[#0870f6] [&_small]:[font-family:var(--font-geist-mono),monospace] [&_small]:text-[length:8px] [&_small]:font-bold [&_small]:tracking-[1px] [&_strong]:text-[#172641] [&_strong]:text-[length:15px] [&_strong]:mt-1.5 [&>_span]:flex-none [&>_span]:text-[#43607f] [&>_span]:border [&>_span]:[background:#fff] [&>_span]:text-[length:9px] [&>_span]:px-2.5 [&>_span]:py-[7px] [&>_span]:rounded-[999px] [&>_span]:border-solid [&>_span]:border-[#cfdeef] [@media_(max-width:_700px)]:items-start [@media_(max-width:_700px)]:flex-col [@media_(max-width:_700px)]:gap-2.5">
              <div><small>DÒNG KIỂM TRA LAWSCAN</small><strong>Mỗi nhận định đều có đường để kiểm tra lại</strong></div>
              <span>4 lớp thông tin</span>
            </div>

            <div className={`${"relative grid grid-cols-[31px_38px_minmax(0,1fr)] gap-3 border [background:#fff] animate-[layerIn_0.5s_cubic-bezier(.22,1,0.36,1)_both] p-[18px] rounded-[14px] border-solid border-[#dce5ef] before:content-[''] before:absolute before:w-px before:[background:#cbd9e9] before:left-8 before:top-14 before:-bottom-3 last:before:hidden [&:nth-of-type(2)]:[animation-delay:0.08s] [&:nth-of-type(3)]:[animation-delay:0.16s] [&:nth-of-type(4)]:[animation-delay:0.24s] [&:nth-of-type(5)]:[animation-delay:0.32s] [&>_span]:text-[#7e8da2] [&>_span]:[font-family:var(--font-geist-mono),monospace] [&>_span]:text-[length:9px] [&>_span]:font-bold [&>_span]:pt-[3px] [&>_svg]:w-[21px] [&>_svg]:text-[#0868ed] [&>_svg]:mt-px [&_small]:block [&_strong]:block [&_small]:text-[#718199] [&_small]:text-[length:8px] [&_small]:font-[750] [&_small]:tracking-[0.9px] [&_strong]:text-[#17243d] [&_strong]:text-[length:14px] [&_strong]:mt-[5px] [&_p]:text-[#617087] [&_p]:text-[length:12px] [&_p]:leading-[1.55] [&_p]:mt-1.5 [@media_(max-width:_700px)]:grid-cols-[24px_30px_minmax(0,1fr)] [@media_(max-width:_700px)]:px-[13px] [@media_(max-width:_700px)]:py-[15px] [@media_(max-width:_700px)]:before:left-6 [&>_svg]:[@media_(max-width:_700px)]:w-[19px] [&_strong]:[@media_(max-width:_700px)]:text-[length:13px] motion-reduce:animate-none"} ${"[border-left:4px_solid_#e7a315] [&>_svg]:text-[#c98200]"}`}>
              <span>01</span><Icon name="search" />
              <div><small>ĐIỂM CẦN XEM</small><strong>{scenario.risk}</strong><p>{scenario.reason}</p></div>
            </div>
            <div className={`${"relative grid grid-cols-[31px_38px_minmax(0,1fr)] gap-3 border [background:#fff] animate-[layerIn_0.5s_cubic-bezier(.22,1,0.36,1)_both] p-[18px] rounded-[14px] border-solid border-[#dce5ef] before:content-[''] before:absolute before:w-px before:[background:#cbd9e9] before:left-8 before:top-14 before:-bottom-3 last:before:hidden [&:nth-of-type(2)]:[animation-delay:0.08s] [&:nth-of-type(3)]:[animation-delay:0.16s] [&:nth-of-type(4)]:[animation-delay:0.24s] [&:nth-of-type(5)]:[animation-delay:0.32s] [&>_span]:text-[#7e8da2] [&>_span]:[font-family:var(--font-geist-mono),monospace] [&>_span]:text-[length:9px] [&>_span]:font-bold [&>_span]:pt-[3px] [&>_svg]:w-[21px] [&>_svg]:text-[#0868ed] [&>_svg]:mt-px [&_small]:block [&_strong]:block [&_small]:text-[#718199] [&_small]:text-[length:8px] [&_small]:font-[750] [&_small]:tracking-[0.9px] [&_strong]:text-[#17243d] [&_strong]:text-[length:14px] [&_strong]:mt-[5px] [&_p]:text-[#617087] [&_p]:text-[length:12px] [&_p]:leading-[1.55] [&_p]:mt-1.5 [@media_(max-width:_700px)]:grid-cols-[24px_30px_minmax(0,1fr)] [@media_(max-width:_700px)]:px-[13px] [@media_(max-width:_700px)]:py-[15px] [@media_(max-width:_700px)]:before:left-6 [&>_svg]:[@media_(max-width:_700px)]:w-[19px] [&_strong]:[@media_(max-width:_700px)]:text-[length:13px] motion-reduce:animate-none"} ${"[border-left:4px_solid_#3486ed] [background:#fbfdff]"}`}>
              <span>02</span><Icon name="scales" />
              <div><small>NGUỒN CẦN ĐỐI CHIẾU</small><strong>Kiểm tra trong đúng ngữ cảnh hợp đồng</strong><p>{scenario.source}</p></div>
            </div>
            <div className={`${"relative grid grid-cols-[31px_38px_minmax(0,1fr)] gap-3 border [background:#fff] animate-[layerIn_0.5s_cubic-bezier(.22,1,0.36,1)_both] p-[18px] rounded-[14px] border-solid border-[#dce5ef] before:content-[''] before:absolute before:w-px before:[background:#cbd9e9] before:left-8 before:top-14 before:-bottom-3 last:before:hidden [&:nth-of-type(2)]:[animation-delay:0.08s] [&:nth-of-type(3)]:[animation-delay:0.16s] [&:nth-of-type(4)]:[animation-delay:0.24s] [&:nth-of-type(5)]:[animation-delay:0.32s] [&>_span]:text-[#7e8da2] [&>_span]:[font-family:var(--font-geist-mono),monospace] [&>_span]:text-[length:9px] [&>_span]:font-bold [&>_span]:pt-[3px] [&>_svg]:w-[21px] [&>_svg]:text-[#0868ed] [&>_svg]:mt-px [&_small]:block [&_strong]:block [&_small]:text-[#718199] [&_small]:text-[length:8px] [&_small]:font-[750] [&_small]:tracking-[0.9px] [&_strong]:text-[#17243d] [&_strong]:text-[length:14px] [&_strong]:mt-[5px] [&_p]:text-[#617087] [&_p]:text-[length:12px] [&_p]:leading-[1.55] [&_p]:mt-1.5 [@media_(max-width:_700px)]:grid-cols-[24px_30px_minmax(0,1fr)] [@media_(max-width:_700px)]:px-[13px] [@media_(max-width:_700px)]:py-[15px] [@media_(max-width:_700px)]:before:left-6 [&>_svg]:[@media_(max-width:_700px)]:w-[19px] [&_strong]:[@media_(max-width:_700px)]:text-[length:13px] motion-reduce:animate-none"} ${"[border-left:4px_solid_#1ba07b] [&>_svg]:text-[#168467] [&_blockquote]:text-[#285347] [&_blockquote]:[background:#eef9f5] [&_blockquote]:[font-family:var(--font-lora),Georgia,serif] [&_blockquote]:text-[length:12px] [&_blockquote]:italic [&_blockquote]:leading-[1.55] [&_blockquote]:mt-[9px] [&_blockquote]:mb-0 [&_blockquote]:mx-0 [&_blockquote]:px-3 [&_blockquote]:py-2.5 [&_blockquote]:rounded-lg"}`}>
              <span>03</span><Icon name="sparkle" />
              <div><small>GỢI Ý DIỄN ĐẠT</small><strong>Rõ thời hạn và điều kiện thực hiện</strong><blockquote>{scenario.suggestion}</blockquote></div>
            </div>
            <div className={`${"relative grid grid-cols-[31px_38px_minmax(0,1fr)] gap-3 border [background:#fff] animate-[layerIn_0.5s_cubic-bezier(.22,1,0.36,1)_both] p-[18px] rounded-[14px] border-solid border-[#dce5ef] before:content-[''] before:absolute before:w-px before:[background:#cbd9e9] before:left-8 before:top-14 before:-bottom-3 last:before:hidden [&:nth-of-type(2)]:[animation-delay:0.08s] [&:nth-of-type(3)]:[animation-delay:0.16s] [&:nth-of-type(4)]:[animation-delay:0.24s] [&:nth-of-type(5)]:[animation-delay:0.32s] [&>_span]:text-[#7e8da2] [&>_span]:[font-family:var(--font-geist-mono),monospace] [&>_span]:text-[length:9px] [&>_span]:font-bold [&>_span]:pt-[3px] [&>_svg]:w-[21px] [&>_svg]:text-[#0868ed] [&>_svg]:mt-px [&_small]:block [&_strong]:block [&_small]:text-[#718199] [&_small]:text-[length:8px] [&_small]:font-[750] [&_small]:tracking-[0.9px] [&_strong]:text-[#17243d] [&_strong]:text-[length:14px] [&_strong]:mt-[5px] [&_p]:text-[#617087] [&_p]:text-[length:12px] [&_p]:leading-[1.55] [&_p]:mt-1.5 [@media_(max-width:_700px)]:grid-cols-[24px_30px_minmax(0,1fr)] [@media_(max-width:_700px)]:px-[13px] [@media_(max-width:_700px)]:py-[15px] [@media_(max-width:_700px)]:before:left-6 [&>_svg]:[@media_(max-width:_700px)]:w-[19px] [&_strong]:[@media_(max-width:_700px)]:text-[length:13px] motion-reduce:animate-none"} ${"[border-left:4px_solid_#0868ed] [background:#f5f9ff] border-[#bcd6fa]"}`}>
              <span>04</span><Icon name="user" />
              <div className="min-w-0">
                <small>QUYẾT ĐỊNH CỦA BẠN</small>
                <strong>AI đưa ra gợi ý. Bạn chọn cách xử lý.</strong>
                <div className="flex flex-wrap gap-[7px] mt-3 [&_button]:min-h-[35px] [&_button]:text-[#40536e] [&_button]:border [&_button]:[background:#fff] [&_button]:text-[length:10px] [&_button]:font-[620] [&_button]:px-[11px] [&_button]:py-[7px] [&_button]:rounded-lg [&_button]:border-solid [&_button]:border-[#ccdae9] [&_button]:hover:text-[#0868ed] [&_button]:hover:border-[#8db9f7] [&_button]:aria-pressed:text-white [&_button]:aria-pressed:[background:#0868ed] [&_button]:aria-pressed:border-[#0868ed]" role="group" aria-label="Chọn cách xử lý minh họa">
                  {decisions.map((item) => <button type="button" key={item.id} aria-pressed={decision === item.id} onClick={() => setDecision(item.id)}>{item.label}</button>)}
                </div>
                <p className="min-h-[19px] flex items-center gap-1.5 [&_svg]:w-3.5 [&_svg]:text-[#138060]" aria-live="polite">
                  {decision ? <><Icon name="check" />Đã ghi nhận lựa chọn “{decisions.find((item) => item.id === decision)?.label}” trong bản minh họa.</> : "Chọn một phương án để hoàn tất dòng kiểm tra."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[1.05fr_repeat(3,1fr)] items-center gap-[18px] text-[#d6e4f8] [background:#0b1a35] mt-[22px] px-6 py-[21px] rounded-2xl [&>_p]:text-white [&>_p]:text-[length:15px] [&>_p]:font-bold [&>_p]:[@media_(max-width:_1050px)]:col-span-full [&>_div]:flex [&>_div]:items-center [&>_div]:gap-[11px] [&_svg]:w-[22px] [&_svg]:flex-none [&_svg]:text-[#6da9ff] [&_span]:block [&_strong]:block [&_small]:block [&_strong]:text-[length:11px] [&_small]:text-[#879cb9] [&_small]:text-[length:9px] [&_small]:mt-[3px] [@media_(max-width:_1050px)]:grid-cols-[repeat(3,1fr)] [@media_(max-width:_700px)]:grid-cols-[1fr] [@media_(max-width:_700px)]:p-[23px] [&>_p]:[@media_(max-width:_700px)]:col-auto [&>_p]:[@media_(max-width:_700px)]:[border-bottom:1px_solid_#ffffff1c] [&>_p]:[@media_(max-width:_700px)]:pb-[11px] [&>_div]:[@media_(max-width:_700px)]:min-h-[47px]" data-reveal>
          <p>Điểm khác biệt của LawScan</p>
          <div><Icon name="document" /><span><strong>Quay về câu chữ gốc</strong><small>Nhận định gắn với đúng điều khoản.</small></span></div>
          <div><Icon name="scales" /><span><strong>Đặt nguồn cạnh kết quả</strong><small>Dễ đối chiếu phạm vi áp dụng.</small></span></div>
          <div><Icon name="user" /><span><strong>Giữ quyền quyết định</strong><small>Người phụ trách xác nhận cách xử lý.</small></span></div>
        </div>
      </div>
    </section>
  );
}
