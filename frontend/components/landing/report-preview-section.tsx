"use client";

import { useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import styles from "./landing-depth.module.css";

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
    <section id="bao-cao" className={styles.reportSection} aria-labelledby="report-heading">
      <div className={`ls-container ${styles.reportGrid}`}>
        <div className={styles.reportCopy} data-reveal>
          <p className="section-eyebrow">05 / Kết quả nhận được</p>
          <h2 id="report-heading">Từ phân tích rời rạc<br /><span>thành báo cáo dễ kiểm tra.</span></h2>
          <p>Thông tin quan trọng được gom lại theo từng nhóm để bạn xem, trao đổi và lưu lại quyết định.</p>
          <ul><li><Icon name="shield" />AI hỗ trợ rà soát sơ bộ</li><li><Icon name="scales" />Nguồn tham chiếu để đối chiếu</li><li><Icon name="download" />Bản báo cáo thuận tiện chia sẻ</li></ul>
          <Link href="/bao-cao-mau" className="ls-button">Mở báo cáo mẫu <Icon name="arrow" /></Link>
        </div>
        <div className={styles.reportWindow} data-reveal data-reveal-delay="100">
          <div className={styles.windowBar}><span /><span /><span /><small>BÁO CÁO RÀ SOÁT · MINH HỌA</small></div>
          <div className={styles.reportTabs} role="tablist" aria-label="Nội dung báo cáo mẫu">{tabs.map((item, index) => <button key={item.id} type="button" role="tab" id={`report-tab-${item.id}`} aria-selected={active === index} aria-controls="report-panel" onClick={() => setActive(index)}>{item.label}</button>)}</div>
          <div className={styles.reportPanel} role="tabpanel" id="report-panel" aria-labelledby={`report-tab-${tab.id}`} key={tab.id}>
            <div className={styles.reportPanelTop}><span className={styles.scoreRing}>{active === 1 ? "03" : active === 2 ? "Nguồn" : active === 3 ? "Sửa" : "LS"}</span><div><small>{tab.label}</small><h3>{tab.heading}</h3></div></div>
            <p>{tab.text}</p>
            <ul>{tab.items.map((item, index) => <li key={item}><span>{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ul>
            <div className={styles.reportFooter}><span>Kiểm tra bởi người dùng</span><span><Icon name="download" /> PDF</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}
