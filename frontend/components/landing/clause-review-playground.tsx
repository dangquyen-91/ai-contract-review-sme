"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "./clause-review-playground.module.css";

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
    <section id="kiem-tra-dieu-khoan" className={styles.section} aria-labelledby="playground-heading">
      <div className={`ls-container ${styles.inner}`}>
        <header className={styles.heading} data-reveal>
          <div>
            <p className="section-eyebrow">01 / Trải nghiệm cách LawScan rà soát</p>
            <h2 id="playground-heading">Một điều khoản.<br /><span>Từ cảnh báo đến quyết định.</span></h2>
          </div>
          <p>LawScan đặt điều khoản gốc, lý do, nguồn cần kiểm tra và cách diễn đạt cạnh nhau để bạn chủ động đánh giá.</p>
        </header>

        <div className={styles.scenarioTabs} role="tablist" aria-label="Chọn tình huống hợp đồng" data-reveal>
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

        <div className={styles.workspace} data-reveal>
          <article className={styles.contract} aria-label={`Điều khoản minh họa: ${scenario.label}`}>
            <div className={styles.paperMeta}>
              <span><Icon name="document" />Hợp đồng dịch vụ</span>
              <small>MINH HỌA</small>
            </div>
            <div className={styles.paperLines} aria-hidden="true"><i /><i /><i /></div>
            <div className={styles.clauseCard} key={scenario.id}>
              <small>{scenario.title}</small>
              <p>{scenario.prefix}<mark>{scenario.highlight}</mark>{scenario.suffix}</p>
              <span className={styles.scanLine} aria-hidden="true" />
            </div>
            <div className={styles.paperLines} aria-hidden="true"><i /><i /><i /><i /></div>
            <p className={styles.contractCaption}><Icon name="shield" />Dữ liệu trong trải nghiệm này được chuẩn bị sẵn.</p>
          </article>

          <div
            id="clause-review-panel"
            role="tabpanel"
            aria-labelledby={`scenario-tab-${scenario.id}`}
            className={styles.review}
            key={`review-${scenario.id}`}
          >
            <div className={styles.reviewHeader}>
              <div><small>DÒNG KIỂM TRA LAWSCAN</small><strong>Mỗi nhận định đều có đường để kiểm tra lại</strong></div>
              <span>4 lớp thông tin</span>
            </div>

            <div className={`${styles.layer} ${styles.warningLayer}`}>
              <span>01</span><Icon name="search" />
              <div><small>ĐIỂM CẦN XEM</small><strong>{scenario.risk}</strong><p>{scenario.reason}</p></div>
            </div>
            <div className={`${styles.layer} ${styles.sourceLayer}`}>
              <span>02</span><Icon name="scales" />
              <div><small>NGUỒN CẦN ĐỐI CHIẾU</small><strong>Kiểm tra trong đúng ngữ cảnh hợp đồng</strong><p>{scenario.source}</p></div>
            </div>
            <div className={`${styles.layer} ${styles.suggestionLayer}`}>
              <span>03</span><Icon name="sparkle" />
              <div><small>GỢI Ý DIỄN ĐẠT</small><strong>Rõ thời hạn và điều kiện thực hiện</strong><blockquote>{scenario.suggestion}</blockquote></div>
            </div>
            <div className={`${styles.layer} ${styles.decisionLayer}`}>
              <span>04</span><Icon name="user" />
              <div className={styles.decisionContent}>
                <small>QUYẾT ĐỊNH CỦA BẠN</small>
                <strong>AI đưa ra gợi ý. Bạn chọn cách xử lý.</strong>
                <div className={styles.decisionButtons} role="group" aria-label="Chọn cách xử lý minh họa">
                  {decisions.map((item) => <button type="button" key={item.id} aria-pressed={decision === item.id} onClick={() => setDecision(item.id)}>{item.label}</button>)}
                </div>
                <p className={styles.decisionStatus} aria-live="polite">
                  {decision ? <><Icon name="check" />Đã ghi nhận lựa chọn “{decisions.find((item) => item.id === decision)?.label}” trong bản minh họa.</> : "Chọn một phương án để hoàn tất dòng kiểm tra."}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.difference} data-reveal>
          <p>Điểm khác biệt của LawScan</p>
          <div><Icon name="document" /><span><strong>Quay về câu chữ gốc</strong><small>Nhận định gắn với đúng điều khoản.</small></span></div>
          <div><Icon name="scales" /><span><strong>Đặt nguồn cạnh kết quả</strong><small>Dễ đối chiếu phạm vi áp dụng.</small></span></div>
          <div><Icon name="user" /><span><strong>Giữ quyền quyết định</strong><small>Người phụ trách xác nhận cách xử lý.</small></span></div>
        </div>
      </div>
    </section>
  );
}
