import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";

function ReviewAnnotationCard({ tone, title, children }: { tone: "warning" | "suggestion"; title: string; children: React.ReactNode }) {
  return (
    <div className={`${"flex gap-2.5 border border-[color:var(--auth-border)] [background:#fff] shadow-[0_17px_35px_-22px_#061730cc] p-3.5 rounded-xl border-solid [&>_span]:w-[31px] [&>_span]:h-[31px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:rounded-[9px] [&_svg]:w-4 [&_strong]:block [&_p]:block [&_strong]:text-[length:10px] [&_p]:text-[#53637a] [&_p]:text-[length:8px] [&_p]:leading-normal [&_p]:mt-[5px] [@media_(max-width:_1050px)]:p-[11px] [&>_span]:[@media_(max-width:_1050px)]:hidden"} ${tone === "warning" ? "[&>_span]:text-[#9a6100] [&>_span]:[background:#fff0c7] [&_strong]:text-[#8a5700]" : "[&>_span]:text-[#075fcf] [&>_span]:[background:#e7f1ff] [&_strong]:text-[#075fcf]"}`}>
      <span><Icon name={tone === "warning" ? "search" : "check"} /></span>
      <div><strong>{title}</strong><p>{children}</p></div>
    </div>
  );
}

function ContractPreview() {
  return (
    <div className="relative w-[min(590px,100%)] h-[405px] mt-[23px] [@media_(max-width:_1050px)]:h-[365px]" aria-hidden="true">
      <div className={`${"absolute w-[365px] h-[348px] border [background:#1b3d69] shadow-[0_25px_55px_-35px_#000b] rounded-[14px] border-solid border-[#83a8d933] left-[19px] top-7 [@media_(max-width:_1050px)]:w-[285px] [@media_(max-width:_1050px)]:left-[5px]"} ${"[transform:rotate(8deg)_translate(18px,3px)] opacity-[0.72]"}`} />
      <div className={`${"absolute w-[365px] h-[348px] border [background:#1b3d69] shadow-[0_25px_55px_-35px_#000b] rounded-[14px] border-solid border-[#83a8d933] left-[19px] top-7 [@media_(max-width:_1050px)]:w-[285px] [@media_(max-width:_1050px)]:left-[5px]"} ${"[transform:rotate(-8deg)_translate(-14px,9px)] [background:#28517e] opacity-[0.78]"}`} />
      <article className="absolute z-[2] w-[365px] h-[350px] overflow-hidden text-[#19304f] border [background:linear-gradient(145deg,#fff,#f8fafc)] shadow-[0_24px_50px_-28px_#000c] [transform:rotate(-2.5deg)] px-7 py-[25px] rounded-[13px] border-solid border-[#eef3f8] left-[26px] top-[18px] [&_header]:flex [&_header]:items-center [&_header]:justify-between [&_header]:gap-3.5 [&_header]:[border-bottom:1px_solid_#dfe6ef] [&_header]:pb-[15px] [&_header_strong]:text-[length:14px] [&_header_strong]:tracking-[-0.2px] [&_header_span]:text-[#657a96] [&_header_span]:[background:#edf2f7] [&_header_span]:text-[length:7px] [&_header_span]:px-2 [&_header_span]:py-[5px] [&_header_span]:rounded-[999px] [&_section]:grid [&_section]:gap-1.5 [&_section]:mt-4 [&_section]:px-2 [&_section]:py-0 [&_section_small]:text-[#5f728e] [&_section_small]:text-[length:8px] [&_section_i]:block [&_section_i]:w-[92%] [&_section_i]:h-[5px] [&_section_i]:[background:#dfe5ed] [&_section_i]:rounded-[99px] [&_footer_i]:block [&_footer_i]:w-[92%] [&_footer_i]:h-[5px] [&_footer_i]:[background:#dfe5ed] [&_footer_i]:rounded-[99px] [&_section_i:nth-of-type(2)]:w-[76%] [&_section_i:nth-of-type(3)]:w-[57%] [&_footer]:grid [&_footer]:gap-1.5 [&_footer]:pt-[15px] [&_footer]:pb-0 [&_footer]:px-[9px] [&_footer_i]:last:w-[45%] [@media_(max-width:_1050px)]:w-[285px] [@media_(max-width:_1050px)]:[padding-inline:20px] [@media_(max-width:_1050px)]:left-2">
        <header><strong>HỢP ĐỒNG DỊCH VỤ</strong><span>Minh họa</span></header>
        <section><small>1. Phạm vi công việc</small><i /><i /><i /></section>
        <section className="mt-3.5 p-2.5 rounded-[7px] [background:#fff3d8] shadow-[inset_3px_0_var(--auth-warning)] [&_i]:[background:#edd49b]"><small>2. Thanh toán và thời hạn</small><i /><i /><i /></section>
        <section className="mt-3.5 p-2.5 rounded-[7px] [background:var(--auth-primary-soft)] shadow-[inset_3px_0_var(--auth-primary)] [&_i]:[background:#bfd9fb]"><small>3. Quyền và nghĩa vụ của các bên</small><i /><i /><i /></section>
        <footer><i /><i /></footer>
      </article>
      <div className="absolute z-[3] w-[34px] h-px origin-[right_center] right-[218px] [background:var(--auth-warning)] [transform:rotate(-38deg)] top-[145px] before:content-[''] before:absolute before:w-[9px] before:h-[9px] before:rounded-[50%] before:border-2 before:border-solid before:border-white before:-left-1 before:-top-1 before:[background:var(--auth-warning)] [@media_(max-width:_1050px)]:right-[155px]" />
      <div className="absolute z-[3] w-[34px] h-px origin-[right_center] right-[218px] [background:var(--auth-primary)] [transform:rotate(-38deg)] top-[270px] before:content-[''] before:absolute before:w-[9px] before:h-[9px] before:rounded-[50%] before:border-2 before:border-solid before:border-white before:-left-1 before:-top-1 before:[background:var(--auth-primary)] [@media_(max-width:_1050px)]:right-[155px]" />
      <div className="absolute z-[4] w-[235px] right-0 top-[82px] [@media_(max-width:_1050px)]:w-[174px] [@media_(max-width:_1050px)]:-right-1">
        <ReviewAnnotationCard tone="warning" title="Điểm cần xem xét">Thời hạn thanh toán chưa rõ.</ReviewAnnotationCard>
      </div>
      <div className="absolute z-[4] w-[235px] right-0 top-[197px] [@media_(max-width:_1050px)]:w-[174px] [@media_(max-width:_1050px)]:-right-1">
        <ReviewAnnotationCard tone="suggestion" title="Gợi ý chỉnh sửa">Bổ sung thời hạn và điều kiện thanh toán.</ReviewAnnotationCard>
      </div>
      <div className="absolute z-[4] flex items-center gap-[7px] text-[#355170] border [background:#eff5fc] text-[length:8px] shadow-[0_12px_24px_-18px_#000a] px-3 py-2 rounded-[9px] border-solid border-[#cbd9ea] right-[17px] top-[299px] [&_svg]:w-3.5 [&_svg]:text-[color:var(--auth-primary)]"><Icon name="scales" /><span>Nguồn tham chiếu</span></div>
    </div>
  );
}

function ReviewSteps() {
  const steps = [
    { icon: "upload" as const, label: "Tải hợp đồng" },
    { icon: "sparkle" as const, label: "AI phân tích" },
    { icon: "document" as const, label: "Bạn rà soát" },
  ];
  return (
    <div className="w-[min(590px,100%)] mt-auto pt-2 [&>_p]:text-[#8fa4c1] [&>_p]:text-center [&>_p]:text-[length:9px] [&>_p]:mt-[18px]" aria-hidden="true">
      <div className="grid grid-cols-[repeat(3,1fr)] gap-[15px] [@media_(max-width:_1050px)]:gap-[7px]">
        {steps.map((step, index) => (
          <div className="relative min-w-0 grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-[9px] text-[#d8e5f6] [&>_span]:w-[38px] [&>_span]:h-[38px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[#78aff9] [&>_span]:border [&>_span]:[background:#16345b] [&>_span]:rounded-[50%] [&>_span]:border-solid [&>_span]:border-[#5278a94d] [&_svg]:w-[18px] [&_strong]:text-[length:9px] [&_strong]:whitespace-nowrap [&>_i]:w-5 [&>_i]:h-px [&>_i]:[background:#45668f] [@media_(max-width:_1050px)]:grid-cols-[34px_1fr] [@media_(max-width:_1050px)]:gap-1.5 [&>_span]:[@media_(max-width:_1050px)]:w-[34px] [&>_span]:[@media_(max-width:_1050px)]:h-[34px] [&>_i]:[@media_(max-width:_1050px)]:hidden [&_strong]:[@media_(max-width:_1050px)]:text-[length:7px]" key={step.label}>
            <span><Icon name={step.icon} /></span><strong>{step.label}</strong>
            {index < steps.length - 1 && <i />}
          </div>
        ))}
      </div>
      <p>Bạn quyết định sau khi xem xét gợi ý.</p>
    </div>
  );
}

export function AuthBrandPanel() {
  return (
    <div className="relative z-[1] min-h-[calc(100dvh_-_68px)] flex flex-col">
      <Link className="relative z-[2] inline-flex w-fit text-white [text-decoration:none] [&>_span]:flex [&>_span]:items-center [&>_span]:gap-2.5 [&>_span]:text-[length:25px] [&>_span]:font-[730] [&>_span]:tracking-[-0.8px] [&_svg]:w-[31px] [&_svg]:h-[37px] [&_.brand-image_img]:[filter:grayscale(1)_brightness(0)_invert(1)] [&_.brand-image_img]:opacity-[0.94]" href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
      <div className="max-w-[600px] mt-[clamp(40px,6vh,64px)] [&_h2]:text-[length:clamp(39px,3.65vw,56px)] [&_h2]:leading-[1.08] [&_h2]:tracking-[-2.2px] [&_h2]:font-[720] [&_h2_span]:block [&_h2_span]:last:text-[#62a4ff] [&>_p]:text-[color:var(--auth-panel-muted)] [&>_p]:text-[length:14px] [&>_p]:leading-[1.65] [&>_p]:mt-[15px] [@media_(max-width:_1050px)]:mt-9 [&_h2]:[@media_(max-width:_1050px)]:text-[length:39px]">
        <h2><span>Rõ từng điều khoản.</span><span>Vững mỗi quyết định.</span></h2>
        <p>Rà soát hợp đồng với giải thích rõ ràng và nguồn tham chiếu.</p>
      </div>
      <ContractPreview />
      <ReviewSteps />
    </div>
  );
}
