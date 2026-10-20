"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

const steps = [
  {
    id: "extract", number: "01", title: "Đọc và sắp xếp điều khoản", icon: "document", meta: "24 điều khoản",
    clause: "Điều 4. Phạm vi công việc", prefix: "Bên B thực hiện công việc theo", highlight: "Phụ lục 01 đính kèm hợp đồng.",
    status: "Đã nhận diện nội dung", label: "Nội dung được liên kết đúng vị trí",
    detail: "Phạm vi công việc được nối với phụ lục liên quan để bạn mở và đối chiếu ngay.",
  },
  {
    id: "risk", number: "02", title: "Đánh dấu điểm cần xem lại", icon: "search", meta: "3 điểm cần lưu ý",
    clause: "Điều 7. Thanh toán", prefix: "Bên mua thanh toán", highlight: "sau khi hoàn thành nghĩa vụ.",
    status: "Cần làm rõ", label: "Chưa có thời hạn thanh toán",
    detail: "Điều khoản chưa nêu số ngày thanh toán kể từ khi hai bên hoàn tất nghiệm thu.",
  },
  {
    id: "explain", number: "03", title: "Giải thích bằng ngôn ngữ dễ hiểu", icon: "sparkle", meta: "Lý do và ảnh hưởng",
    clause: "Điều 9. Nghiệm thu", prefix: "Sản phẩm được nghiệm thu khi", highlight: "đáp ứng yêu cầu của Bên A.",
    status: "Cách hiểu có thể khác nhau", label: "Tiêu chí nghiệm thu còn chung chung",
    detail: "Hai bên nên thống nhất tiêu chí, thời hạn phản hồi và cách ghi nhận kết quả nghiệm thu.",
  },
  {
    id: "source", number: "04", title: "Đặt căn cứ cạnh nhận định", icon: "scales", meta: "Mở để đối chiếu",
    clause: "Điều 12. Phạt vi phạm", prefix: "Mức phạt được áp dụng theo", highlight: "quy định pháp luật hiện hành.",
    status: "Có nguồn tham khảo", label: "Kiểm tra căn cứ trước khi áp dụng",
    detail: "Nguồn tham khảo nằm cạnh nhận định để người phụ trách có thể đọc và xác nhận lại.",
  },
  {
    id: "suggest", number: "05", title: "Chuẩn bị nội dung cần trao đổi", icon: "check", meta: "1 đề xuất chỉnh sửa",
    clause: "Điều 7. Thanh toán", prefix: "Bên mua thanh toán", highlight: "trong 07 ngày làm việc kể từ ngày nghiệm thu.",
    status: "Đề xuất chỉnh sửa", label: "Bổ sung một mốc thời gian cụ thể",
    detail: "Bạn có thể dùng đề xuất làm điểm bắt đầu rồi chỉnh lại cho phù hợp với thỏa thuận thực tế.",
  },
] as const;

export function AnalysisWalkthrough() {
  const [active, setActive] = useState(1);
  const current = steps[active];

  return (
    <section id="phan-tich" className="[background:#f8fafc] [border-top:1px_solid_#e8eef6] pt-24 pb-[110px] px-0 [@media_(max-width:_900px)]:[padding-block:70px] [@media_(max-width:_600px)]:[padding-block:56px] [background:#f7f9fc] pt-[92px] pb-[104px] [@media_(max-width:_600px)]:[padding-block:58px]" aria-labelledby="walkthrough-heading">
      <div className="w-[min(1380px,calc(100%_-_112px))] [margin-inline:auto] [@media_(max-width:_1199px)]:w-[calc(100%_-_64px)] [@media_(max-width:_600px)]:w-[calc(100%_-_40px)]">
        <header className="max-w-[760px] mb-[46px] [&_h2]:text-[length:clamp(36px,4vw,55px)] [&_h2]:leading-[1.12] [&_h2]:tracking-[-2px] [&_h2]:font-[730] [&_h2_span]:text-[#697891] [&>_p:last-child]:text-[#60708b] [&>_p:last-child]:text-[length:17px] [&>_p:last-child]:mt-[18px] [@media_(max-width:_600px)]:mb-[30px] [&_h2]:[@media_(max-width:_600px)]:text-[length:32px] [&_h2]:[@media_(max-width:_600px)]:tracking-[-1.2px] [&>_p:last-child]:[@media_(max-width:_600px)]:text-[length:14px] max-w-[680px] mb-[38px]" data-reveal>
          <p className="flex gap-[11px] items-center text-[#7382a5] text-[length:11px] font-semibold uppercase tracking-[1.8px] mb-4 before:content-[''] before:w-5 before:h-0.5 before:[background:var(--ls-blue)] text-[#bbc7db] [@media_(max-width:_600px)]:text-[length:10px] [@media_(max-width:_600px)]:tracking-[1.2px]">02 / Từ hợp đồng đến việc cần làm</p>
          <h2 id="walkthrough-heading">Rà soát theo từng bước.<br /><span>Không bỏ sót ngữ cảnh.</span></h2>
          <p>Mỗi nhận định đều trở về đúng điều khoản gốc, kèm lý do và nội dung cần trao đổi.</p>
        </header>

        <div className="overflow-hidden border [background:#fff] shadow-[0_28px_70px_-48px_#173b7066] rounded-[22px] border-solid border-[#dbe3ee] [@media_(max-width:_600px)]:rounded-2xl" data-reveal>
          <div className="min-h-[72px] flex items-center justify-between gap-6 [border-bottom:1px_solid_#e5eaf1] [background:#fff] px-[22px] py-[13px] [@media_(max-width:_600px)]:min-h-16 [@media_(max-width:_600px)]:px-3.5 [@media_(max-width:_600px)]:py-[11px]">
            <div className="flex items-center gap-3 min-w-0 [&>_span]:w-10 [&>_span]:h-10 [&>_span]:grid [&>_span]:place-items-center [&>_span]:flex-none [&>_span]:text-[#0868ed] [&>_span]:border [&>_span]:[background:#f2f7ff] [&>_span]:rounded-[10px] [&>_span]:border-solid [&>_span]:border-[#cfe0f9] [&_svg]:w-5 [&_strong]:block [&_small]:block [&_strong]:text-[#13203a] [&_strong]:text-[length:14px] [&_small]:text-[#78869a] [&_small]:text-[length:10px] [&_small]:mt-[3px] [&>_span]:[@media_(max-width:_600px)]:w-9 [&>_span]:[@media_(max-width:_600px)]:h-9 [&_strong]:[@media_(max-width:_600px)]:max-w-[175px] [&_strong]:[@media_(max-width:_600px)]:overflow-hidden [&_strong]:[@media_(max-width:_600px)]:text-ellipsis [&_strong]:[@media_(max-width:_600px)]:whitespace-nowrap [&_strong]:[@media_(max-width:_600px)]:text-[length:12px] [&_small]:[@media_(max-width:_600px)]:text-[length:8px]">
              <span><Icon name="document" /></span>
              <div><strong>Hợp đồng mua bán.docx</strong><small>12 trang · cập nhật lúc 09:42</small></div>
            </div>
            <span className="flex items-center gap-[7px] flex-none text-[#14745d] border [background:#f1faf7] text-[length:11px] font-[650] px-2.5 py-[7px] rounded-[999px] border-solid border-[#cce9df] [&_i]:w-[7px] [&_i]:h-[7px] [&_i]:[background:#20a77f] [&_i]:shadow-[0_0_0_3px_#d8f2e9] [&_i]:rounded-[50%] [@media_(max-width:_600px)]:text-[length:9px] [@media_(max-width:_600px)]:px-2 [@media_(max-width:_600px)]:py-1.5"><i />Đã rà soát</span>
          </div>

          <div className="grid grid-cols-[minmax(0,1.08fr)_minmax(390px,0.92fr)] min-h-[585px] [@media_(max-width:_900px)]:grid-cols-[1fr]">
            <div className="min-w-0 [border-right:1px_solid_#e1e7ef] [background:#eef2f6] pt-[26px] pb-[18px] px-[34px] [@media_(max-width:_900px)]:[border-right:0] [@media_(max-width:_900px)]:[border-bottom:1px_solid_#e1e7ef] [@media_(max-width:_600px)]:pt-5 [@media_(max-width:_600px)]:pb-3.5 [@media_(max-width:_600px)]:px-4">
              <div className="flex justify-between gap-5 text-[#68788f] text-[length:10px] mb-3.5"><span>Điều khoản {active + 1}/5</span><span>Trang {Math.min(active + 3, 12)}</span></div>
              <article className="min-h-[475px] border [background:#fff] shadow-[0_16px_36px_-30px_#10284b99] animate-[document-swap_0.28s_ease-out_both] px-[58px] py-[62px] rounded-[3px] border-solid border-[#dfe4eb] [&>_small]:text-[#64738a] [&>_small]:text-[length:11px] [&>_small]:font-[650] [&_h3]:text-[#101a31] [&_h3]:text-[length:21px] [&_h3]:tracking-[-0.4px] [&_h3]:mt-[9px] [&>_p]:text-[#283750] [&>_p]:text-[length:15px] [&>_p]:leading-[1.9] [&>_p]:mt-[30px] [&_mark]:text-[#17253d] [&_mark]:[background:#fff0bd] [&_mark]:box-decoration-clone [&_mark]:[-webkit-box-decoration-break:clone] [&_mark]:px-1 [&_mark]:py-[3px] [@media_(max-width:_900px)]:min-h-[390px] [@media_(max-width:_600px)]:min-h-[315px] [@media_(max-width:_600px)]:px-[27px] [@media_(max-width:_600px)]:py-[38px] [&_h3]:[@media_(max-width:_600px)]:text-[length:18px] [&>_p]:[@media_(max-width:_600px)]:text-[length:13px] [&>_p]:[@media_(max-width:_600px)]:mt-[22px] motion-reduce:animate-none" key={`document-${current.id}`}>
                <small>{current.clause}</small>
                <h3>{current.clause.replace(/^Điều \d+\. /, "")}</h3>
                <p>{current.prefix} <mark>{current.highlight}</mark></p>
                <div className="grid gap-2.5 mt-[42px] [&_i]:block [&_i]:w-[94%] [&_i]:h-1.5 [&_i]:[background:#e6e9ee] [&_i]:rounded-[99px] [&_i:nth-child(2)]:w-[78%] [&_i:nth-child(3)]:w-[88%] [&_i:nth-child(4)]:w-[70%] [&_i:nth-child(5)]:w-[48%] [&_i:nth-child(5)]:mt-[18px] [@media_(max-width:_600px)]:mt-[30px]" aria-hidden="true"><i /><i /><i /><i /><i /></div>
              </article>
              <p className="text-center text-[#718097] text-[length:11px] mt-[13px] text-[#758399] text-[length:10px] mt-3">Nội dung dùng để minh họa cách hiển thị kết quả.</p>
            </div>

            <div className="min-w-0 [background:#fff] pt-7 pb-6 px-7 [@media_(max-width:_600px)]:pt-[22px] [@media_(max-width:_600px)]:pb-[18px] [@media_(max-width:_600px)]:px-3.5">
              <div className="flex items-center justify-between gap-5 [border-bottom:1px_solid_#e7ebf1] pt-0 pb-[18px] px-0.5 [&_small]:block [&_strong]:block [&_small]:text-[#74839a] [&_small]:text-[length:10px] [&_strong]:text-[#12203a] [&_strong]:text-[length:16px] [&_strong]:mt-[3px] [&>_span]:text-[#64758d] [&>_span]:text-[length:11px] [&>_span]:[font-variant-numeric:tabular-nums]"><div><small>Kết quả rà soát</small><strong>5 bước để kiểm tra lại</strong></div><span>{active + 1}/5</span></div>
              <ol className="grid gap-[26px] pb-[130px] [&_li]:min-h-[155px] [&_button]:w-full [&_button]:grid [&_button]:grid-cols-[72px_1fr] [&_button]:gap-5 [&_button]:text-left [&_button]:[border-left:2px_solid_#d7e0eb] [&_button]:text-[#60708a] [&_button]:[transition:color_0.25s,border-color_0.25s,background_0.25s,transform_0.25s] [&_button]:px-[22px] [&_button]:py-[27px] [&_button]:hover:text-[#172542] [&_button]:hover:[background:#fff] [&_button]:focus-visible:[outline:3px_solid_#0066ff] [&_button]:focus-visible:outline-offset-[3px] [&_button]:focus-visible:rounded-[0_12px_12px_0] [&_strong]:block [&_strong]:text-inherit [&_strong]:text-[length:22px] [&_strong]:tracking-[-0.5px] [&_small]:block [&_small]:text-[#65738a] [&_small]:text-[length:14px] [&_small]:leading-[1.7] [&_small]:mt-2.5 [@media_(max-width:_900px)]:grid-cols-[repeat(2,1fr)] [@media_(max-width:_900px)]:gap-3.5 [@media_(max-width:_900px)]:pb-0 [&_li]:[@media_(max-width:_900px)]:min-h-0 [&_button]:[@media_(max-width:_900px)]:h-full [&_button]:[@media_(max-width:_900px)]:grid-cols-[52px_1fr] [&_button]:[@media_(max-width:_900px)]:px-[15px] [&_button]:[@media_(max-width:_900px)]:py-5 [@media_(max-width:_600px)]:grid-cols-[1fr] [&_button]:[@media_(max-width:_600px)]:grid-cols-[46px_1fr] [&_strong]:[@media_(max-width:_600px)]:text-[length:18px] [&_small]:[@media_(max-width:_600px)]:text-[length:12px] [&_button]:motion-reduce:transition-none gap-[5px] pt-[13px] pb-[15px] px-0 [&_li]:min-h-0 [&_button]:grid-cols-[34px_minmax(0,1fr)_auto] [&_button]:items-center [&_button]:gap-[11px] [&_button]:min-h-[54px] [&_button]:text-[#34445d] [&_button]:border [&_button]:[background:transparent] [&_button]:transform-none [&_button]:[transition:border-color_0.2s,background_0.2s,color_0.2s] [&_button]:px-2.5 [&_button]:py-[7px] [&_button]:rounded-[10px] [&_button]:border-solid [&_button]:border-transparent [&_button]:hover:text-[#11213d] [&_button]:hover:[background:#f8fafc] [&_button]:hover:border-[#d9e4f2] [&_button]:focus-visible:[outline:3px_solid_#9ac2ff] [&_button]:focus-visible:outline-offset-1 [&_button]:focus-visible:rounded-[10px] [&_small]:text-inherit [&_strong]:text-[length:12px] [&_strong]:tracking-[0] [&_small]:text-[#7a8799] [&_small]:text-[length:9px] [&_small]:leading-[1.4] [&_small]:mt-[3px] [&_button]:[@media_(max-width:_600px)]:grid-cols-[32px_minmax(0,1fr)_auto] [&_button]:[@media_(max-width:_600px)]:[padding-inline:8px]">
                {steps.map((step, index) => (
                  <li key={step.id}>
                    <button type="button" data-step-index={index} className={active === index ? "text-[#0b1733] [background:linear-gradient(90deg,#eef5ff,transparent)] [transform:translateX(6px)] border-[#0066ff] [@media_(max-width:_900px)]:transform-none motion-reduce:transform-none text-[#0c1d3b] [background:#edf5ff] transform-none border-[#bed5f8]" : ""} aria-pressed={active === index} onClick={() => setActive(index)}>
                      <span className="w-[34px] h-[34px] grid place-items-center text-[#5d708c] border [background:#fff] rounded-[9px] border-solid border-[#e0e6ee] [&_svg]:w-[17px] text-[#0868ed] border-[#bfd7fa]"><Icon name={step.icon} /></span>
                      <span><strong>{step.title}</strong><small>{step.meta}</small></span>
                      <span className="text-[#8b98aa] text-[length:9px] [font-variant-numeric:tabular-nums] text-[#0868ed]">{step.number}</span>
                    </button>
                  </li>
                ))}
              </ol>

              <div className="border [background:#fffbef] animate-[finding-swap_0.28s_ease-out_both] px-[18px] py-[17px] rounded-xl border-solid border-[#eedaa6] [&>_strong]:block [&>_strong]:text-[#212d41] [&>_strong]:text-[length:15px] [&>_strong]:mt-[11px] [&>_p]:text-[#5c6879] [&>_p]:text-[length:11px] [&>_p]:leading-[1.6] [&>_p]:mt-1.5 [&>_small]:block [&>_small]:text-[#7c8796] [&>_small]:[border-top:1px_solid_#eadfbe] [&>_small]:text-[length:9px] [&>_small]:mt-3 [&>_small]:pt-[11px] [@media_(max-width:_600px)]:p-4 motion-reduce:animate-none" key={current.id}>
                <div className="flex items-center gap-2 text-[#9b6900] text-[length:9px] font-bold tracking-[0.55px] uppercase [&>_span]:w-[25px] [&>_span]:h-[25px] [&>_span]:grid [&>_span]:place-items-center [&>_span]:text-[#9b6900] [&>_span]:[background:#ffedb7] [&>_span]:rounded-[7px] [&_svg]:w-[13px]"><span><Icon name={current.icon} /></span>{current.status}</div>
                <strong>{current.label}</strong>
                <p>{current.detail}</p>
                <small>Người phụ trách sẽ kiểm tra và quyết định nội dung cuối cùng.</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
