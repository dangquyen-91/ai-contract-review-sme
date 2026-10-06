import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const principles = [
  {
    icon: "shield" as const,
    title: "Bản demo không nhận tài liệu thật",
    text: "Các hợp đồng và kết quả trên website đều là dữ liệu minh họa được chuẩn bị sẵn.",
  },
  {
    icon: "document" as const,
    title: "Phạm vi được nói rõ",
    text: "Bản mẫu tập trung vào hợp đồng mua bán, dịch vụ bằng tiếng Việt và rà soát sơ bộ.",
  },
  {
    icon: "check" as const,
    title: "Bạn là người quyết định",
    text: "Nhận định, nguồn và đề xuất luôn cần được người phụ trách kiểm tra trước khi sử dụng.",
  },
];

export function TrustSection() {
  return (
    <section id="pham-vi" className="[background:#f7f9fc] [border-top:1px_solid_#e7edf5] pt-24 pb-[104px] px-0 [@media_(max-width:_600px)]:px-0 [@media_(max-width:_600px)]:py-[58px]" aria-labelledby="trust-heading">
      <div className="w-[min(1380px,calc(100%_-_112px))] [margin-inline:auto] [@media_(max-width:_1199px)]:w-[calc(100%_-_64px)] [@media_(max-width:_600px)]:w-[calc(100%_-_40px)]">
        <div className="flex [align-items:end] justify-between gap-[60px] [&_h2]:text-[#0b1733] [&_h2]:text-[length:clamp(36px,4vw,55px)] [&_h2]:leading-[1.12] [&_h2]:tracking-[-2px] [&_h2]:font-[730] [&_h2_span]:text-[#697891] [&>_p]:max-w-[510px] [&>_p]:text-[#60708b] [&>_p]:text-[length:16px] [&>_p]:leading-[1.7] [&>_p]:mb-[5px] [@media_(max-width:_900px)]:items-start [@media_(max-width:_900px)]:flex-col [@media_(max-width:_900px)]:gap-5 [&_h2]:[@media_(max-width:_600px)]:text-[length:32px] [&_h2]:[@media_(max-width:_600px)]:tracking-[-1.2px] [&>_p]:[@media_(max-width:_600px)]:text-[length:14px]" data-reveal>
          <div>
            <p className="flex gap-[11px] items-center text-[#7382a5] text-[length:11px] font-semibold uppercase tracking-[1.8px] mb-4 before:content-[''] before:w-5 before:h-0.5 before:[background:var(--ls-blue)] text-[#bbc7db] [@media_(max-width:_600px)]:text-[length:10px] [@media_(max-width:_600px)]:tracking-[1.2px]">06 / Phạm vi và dữ liệu</p>
            <h2 id="trust-heading">Minh bạch trước khi<br /><span>bạn dùng tài liệu thật.</span></h2>
          </div>
          <p>LawScan đang ở giai đoạn bản mẫu. Chúng tôi nói rõ phần nào đã có, phần nào đang được hoàn thiện cùng backend.</p>
        </div>

        <div className="grid grid-cols-[repeat(3,1fr)] gap-[18px] mt-11 [@media_(max-width:_900px)]:grid-cols-[1fr] [@media_(max-width:_900px)]:max-w-[650px] [@media_(max-width:_600px)]:mt-[30px]">
          {principles.map((item, index) => (
            <article className="min-h-[218px] border [background:#fff] shadow-[0_18px_45px_-40px_#173b7066] p-[27px] rounded-[17px] border-solid border-[#dce5f0] [@media_(max-width:_900px)]:min-h-0 [&>_span]:w-[43px] [&>_span]:h-[43px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[#0868ed] [&>_span]:border [&>_span]:[background:#edf5ff] [&>_span]:rounded-xl [&>_span]:border-solid [&>_span]:border-[#cfe0f8] [&_svg]:w-[21px] [&_h3]:text-[#14213c] [&_h3]:text-[length:17px] [&_h3]:tracking-[-0.25px] [&_h3]:mt-6 [&_p]:text-[#68768c] [&_p]:text-[length:12px] [&_p]:leading-[1.7] [&_p]:mt-[9px] [@media_(max-width:_600px)]:p-[22px] [&_h3]:[@media_(max-width:_600px)]:mt-[18px]" data-reveal data-reveal-delay={String(index * 70)} key={item.title}>
              <span><Icon name={item.icon} /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <div className="grid grid-cols-[0.7fr_1.3fr] gap-10 text-white [background:radial-gradient(circle_at_92%_10%,#1b4c8a80,transparent_35%),#0c1a34] mt-[18px] px-[29px] py-[27px] rounded-[17px] [&_dl]:grid [&_dl]:grid-cols-[1fr_1fr] [&_dl]:gap-[9px] [&_dl_>_div]:min-w-0 [&_dl_>_div]:border [&_dl_>_div]:[background:#ffffff08] [&_dl_>_div]:px-3.5 [&_dl_>_div]:py-3 [&_dl_>_div]:rounded-[10px] [&_dl_>_div]:border-solid [&_dl_>_div]:border-[#7699c52e] [&_dt]:text-[#91a6c4] [&_dt]:text-[length:9px] [&_dd]:flex [&_dd]:items-center [&_dd]:justify-between [&_dd]:gap-2.5 [&_dd]:text-[#e6eef9] [&_dd]:text-[length:11px] [&_dd]:mt-[5px] [&_dd_span]:flex-none [&_dd_span]:text-[length:7px] [&_dd_span]:font-[650] [&_dd_span]:px-[7px] [&_dd_span]:py-1 [&_dd_span]:rounded-[999px] [@media_(max-width:_900px)]:grid-cols-[1fr] [@media_(max-width:_600px)]:gap-6 [@media_(max-width:_600px)]:px-[18px] [@media_(max-width:_600px)]:py-[22px] [&_dl]:[@media_(max-width:_600px)]:grid-cols-[1fr]" data-reveal>
          <div className="flex flex-col items-start justify-center [&_small]:text-[#80aff2] [&_small]:[font-family:var(--font-geist-mono),monospace] [&_small]:text-[length:8px] [&_small]:font-[650] [&_small]:tracking-[1.3px] [&_strong]:text-[length:17px] [&_strong]:mt-[7px] [&_a]:inline-flex [&_a]:items-center [&_a]:gap-[9px] [&_a]:text-[#83b6ff] [&_a]:text-[length:11px] [&_a]:mt-[21px] [&_a]:hover:text-white [&_svg]:w-[15px]">
            <small>TRẠNG THÁI HIỆN TẠI</small>
            <strong>Biết rõ trước khi trải nghiệm</strong>
            <Link href="/bao-cao-mau">Mở báo cáo mẫu <Icon name="arrow" /></Link>
          </div>
          <dl>
            <div><dt>Loại hợp đồng</dt><dd>Mua bán và dịch vụ <span className="text-[#7de0c0] [background:#0b8a6825]">Có trong bản mẫu</span></dd></div>
            <div><dt>Ngôn ngữ</dt><dd>Tiếng Việt <span className="text-[#7de0c0] [background:#0b8a6825]">Có trong bản mẫu</span></dd></div>
            <div><dt>PDF và DOCX</dt><dd>Tải tài liệu của bạn <span className="text-[#e3bd6a] [background:#bb7b1425]">Đang hoàn thiện</span></dd></div>
            <div><dt>Lưu và xóa dữ liệu</dt><dd>Chính sách cùng backend <span className="text-[#e3bd6a] [background:#bb7b1425]">Chưa công bố</span></dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}
