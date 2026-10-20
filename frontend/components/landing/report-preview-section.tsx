"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";

const tabs = [
  { id: "overview", label: "Tổng quan", heading: "Những điều cần biết trước", text: "Hợp đồng dịch vụ 12 tháng, thanh toán theo nghiệm thu. Có 3 điểm cần làm rõ trước khi ký.", items: ["Phạm vi: cung cấp dịch vụ", "Thời hạn: 12 tháng", "Thanh toán: sau nghiệm thu"] },
  { id: "risks", label: "Rủi ro", heading: "3 điểm cần ưu tiên kiểm tra", text: "Mức độ giúp sắp xếp thứ tự xem lại, không phải kết luận pháp lý cuối cùng.", items: ["Cao · Điều kiện chấm dứt", "Trung bình · Thời hạn thanh toán", "Thấp · Tiêu chí nghiệm thu"] },
  { id: "sources", label: "Nguồn", heading: "Nguồn đặt cạnh nhận định", text: "Mỗi nguồn là điểm bắt đầu để người dùng đọc, đối chiếu phạm vi và kiểm tra hiệu lực.", items: ["Văn bản quy phạm liên quan", "Điều khoản được đối chiếu", "Thời điểm truy xuất nguồn"] },
  { id: "edits", label: "Đề xuất", heading: "Câu chữ cụ thể để xem xét", text: "Gợi ý tập trung vào việc làm rõ thời hạn, điều kiện và trách nhiệm giữa các bên.", items: ["Thêm số ngày thanh toán", "Mô tả tiêu chí nghiệm thu", "Quy định thời gian báo trước"] },
] as const;

export function ReportPreviewSection() {
  const [active, setActive] = useState(0);
  const tab = tabs[active];
  return (
    <section id="bao-cao" className="text-white [background:radial-gradient(ellipse_at_78%_46%,#173868,transparent_45%),#0b1730] overflow-hidden px-0 py-[95px] [@media_(max-width:_900px)]:[padding-block:70px] [@media_(max-width:_600px)]:[padding-block:56px]" aria-labelledby="report-heading">
      <div className={`w-[min(1380px,calc(100%_-_112px))] mx-auto max-[1199px]:w-[calc(100%_-_64px)] max-[600px]:w-[calc(100%_-_40px)] ${"grid grid-cols-[0.85fr_1.15fr] gap-[clamp(50px,8vw,120px)] items-center [@media_(max-width:_900px)]:grid-cols-[1fr] [@media_(max-width:_600px)]:gap-[38px]"}`}>
        <div className="[&_h2]:text-[length:clamp(36px,4vw,55px)] [&_h2]:leading-[1.12] [&_h2]:tracking-[-2px] [&_h2]:font-[730] [&_h2_span]:text-[#697891] [&>_p]:text-[#60708b] [&>_p]:text-[length:17px] [&>_p]:mt-[18px] [&_h2_span]:text-[#93acd0] [&>_p]:text-[#afc0d8] [&>_p]:max-w-[520px] [&>_ul]:grid [&>_ul]:gap-[13px] [&>_ul]:mt-[27px] [&>_ul]:mb-[30px] [&>_ul]:mx-0 [&>_ul_li]:flex [&>_ul_li]:gap-3 [&>_ul_li]:text-[#c8d5e7] [&>_ul_li]:text-[length:13px] [&>_ul_svg]:text-[#63a2ff] [&>_ul_svg]:w-[19px] [@media_(max-width:_900px)]:max-w-[650px] [&_h2]:[@media_(max-width:_600px)]:text-[length:32px] [&_h2]:[@media_(max-width:_600px)]:tracking-[-1.2px] [&>_p]:[@media_(max-width:_600px)]:text-[length:14px]" data-reveal>
          <p className="flex gap-[11px] items-center text-[#7382a5] text-[length:11px] font-semibold uppercase tracking-[1.8px] mb-4 before:content-[''] before:w-5 before:h-0.5 before:[background:var(--ls-blue)] text-[#bbc7db] [@media_(max-width:_600px)]:text-[length:10px] [@media_(max-width:_600px)]:tracking-[1.2px]">05 / Kết quả nhận được</p>
          <h2 id="report-heading">Từ phân tích rời rạc<br /><span>thành báo cáo dễ kiểm tra.</span></h2>
          <p>Thông tin quan trọng được gom lại theo từng nhóm để bạn xem, trao đổi và lưu lại quyết định.</p>
          <ul><li><Icon name="shield" />AI hỗ trợ rà soát sơ bộ</li><li><Icon name="scales" />Nguồn tham chiếu để đối chiếu</li><li><Icon name="download" />Bản báo cáo thuận tiện chia sẻ</li></ul>
          <Link href="/bao-cao-mau" className="inline-flex justify-center items-center gap-[15px] min-h-[52px] [background:var(--ls-blue)] text-[white] border border-[color:var(--ls-blue)] font-[550] text-center [text-decoration:none] [transition:background-color_0.2s,color_0.2s,border-color_0.2s,box-shadow_0.25s,transform_0.25s] px-[25px] py-3 rounded-[9px] border-solid hover:text-[white] hover:[background:#0054d4] hover:[transform:translateY(-1px)] hover:border-[#0054d4] min-w-[124px] rounded-[13px] min-h-16 text-[length:19px] py-4 rounded-xl [@media_(hover:_hover)_and_(pointer:_fine)]:hover:[transform:translateY(-3px)] [@media_(hover:_hover)_and_(pointer:_fine)]:hover:shadow-[0_10px_24px_-10px_#0066ff80] [@media_(max-width:_1199px)]:text-[length:16px] [@media_(max-width:_1199px)]:[padding-inline:18px] [@media_(max-width:_1199px)]:min-h-[54px] [@media_(max-width:_600px)]:text-[length:16px] [@media_(max-width:_600px)]:text-[length:14px] [@media_(max-width:_600px)]:mt-2 motion-reduce:hover:transform-none">Mở báo cáo mẫu <Icon name="arrow" /></Link>
        </div>
        <div className="border [background:#ffffff0c] shadow-[0_35px_70px_-30px_#0009] p-2 rounded-[18px] border-solid border-[#7aa5df52]" data-reveal data-reveal-delay="100">
          <div className="flex items-center gap-1.5 min-h-[38px] px-2.5 py-0 [&>_span]:w-[7px] [&>_span]:h-[7px] [&>_span]:[background:#55708f] [&>_span]:rounded-[50%] [&>_span]:first:[background:#ffb454] [&>_span:nth-child(2)]:[background:#6b95cc] [&_small]:text-[#7890af] [&_small]:text-[length:8px] [&_small]:tracking-[1.3px] [&_small]:ml-auto [&_small]:[@media_(max-width:_600px)]:hidden"><span /><span /><span /><small>BÁO CÁO RÀ SOÁT · MINH HỌA</small></div>
          <div className="flex gap-1 [background:#edf2f8] overflow-x-auto p-1.5 rounded-[12px_12px_0_0] [&_button]:flex-1 [&_button]:min-w-[86px] [&_button]:min-h-[38px] [&_button]:text-[#5b6a80] [&_button]:text-[length:11px] [&_button]:rounded-lg [&_button]:aria-selected:[background:#fff] [&_button]:aria-selected:text-[#0f1d38] [&_button]:aria-selected:shadow-[0_2px_7px_#17335318] [&_button]:focus-visible:[outline:2px_solid_#0066ff] [&_button]:focus-visible:outline-offset-0 [&_button]:[@media_(max-width:_600px)]:min-w-[74px]" role="tablist" aria-label="Nội dung báo cáo mẫu">{tabs.map((item, index) => <button key={item.id} type="button" role="tab" id={`report-tab-${item.id}`} aria-selected={active === index} aria-controls="report-panel" onClick={() => setActive(index)}>{item.label}</button>)}</div>
          <div className="min-h-[360px] text-[#101b35] [background:#fff] animate-[content-swap_0.35s_ease-out_both] p-8 rounded-[0_0_12px_12px] [&_h3]:text-[length:19px] [&_h3]:mt-[3px] [&>_p]:text-[#64728a] [&>_p]:text-[length:13px] [&>_p]:leading-[1.65] [&>_p]:mx-0 [&>_p]:my-[23px] [&>_ul]:grid [&>_ul]:gap-2 [&>_ul_li]:flex [&>_ul_li]:items-center [&>_ul_li]:gap-3 [&>_ul_li]:text-[#40516c] [&>_ul_li]:[background:#f6f8fb] [&>_ul_li]:text-[length:12px] [&>_ul_li]:px-3 [&>_ul_li]:py-2.5 [&>_ul_li]:rounded-lg [&>_ul_span]:text-[#0066ff] [&>_ul_span]:text-[length:10px] [&>_ul_span]:font-[650] [@media_(max-width:_600px)]:min-h-[350px] [@media_(max-width:_600px)]:px-[18px] [@media_(max-width:_600px)]:py-[23px] [&_h3]:[@media_(max-width:_600px)]:text-[length:16px] motion-reduce:animate-none" role="tabpanel" id="report-panel" aria-labelledby={`report-tab-${tab.id}`} key={tab.id}>
            <div className="flex items-center gap-[17px] [&_small]:text-[#0066ff] [&_small]:uppercase [&_small]:tracking-[1.2px] [&_small]:text-[length:9px] [@media_(max-width:_600px)]:items-start"><span className="w-[58px] h-[58px] grid place-items-center shrink-0 text-[#0066ff] text-[length:13px] font-bold rounded-[50%] border-t-[#0066ff] border-[5px] border-solid border-[#dbeaff] [@media_(max-width:_600px)]:w-12 [@media_(max-width:_600px)]:h-12">{active === 1 ? "03" : active === 2 ? "Nguồn" : active === 3 ? "Sửa" : "LS"}</span><div><small>{tab.label}</small><h3>{tab.heading}</h3></div></div>
            <p>{tab.text}</p>
            <ul>{tab.items.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ul>
            <div className="flex justify-between gap-[15px] text-[#7a879b] [border-top:1px_solid_#e5eaf1] text-[length:10px] mt-6 pt-[18px] [&_span]:last:flex [&_span]:last:items-center [&_span]:last:gap-[5px] [&_span]:last:text-[#0066ff] [&_svg]:w-[13px]"><span>Kiểm tra bởi người dùng</span><span><Icon name="download" /> PDF</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
