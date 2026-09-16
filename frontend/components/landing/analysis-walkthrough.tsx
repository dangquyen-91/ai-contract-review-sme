"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import styles from "./landing-depth.module.css";

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
    <section id="phan-tich" className={styles.walkthrough} aria-labelledby="walkthrough-heading">
      <div className="ls-container">
        <header className={styles.sectionHeading} data-reveal>
          <p className="section-eyebrow">02 / Từ hợp đồng đến việc cần làm</p>
          <h2 id="walkthrough-heading">Rà soát theo từng bước.<br /><span>Không bỏ sót ngữ cảnh.</span></h2>
          <p>Mỗi nhận định đều trở về đúng điều khoản gốc, kèm lý do và nội dung cần trao đổi.</p>
        </header>

        <div className={styles.reviewWorkspace} data-reveal>
          <div className={styles.workspaceBar}>
            <div className={styles.fileMeta}>
              <span><Icon name="document" /></span>
              <div><strong>Hợp đồng mua bán.docx</strong><small>12 trang · cập nhật lúc 09:42</small></div>
            </div>
            <span className={styles.reviewStatus}><i />Đã rà soát</span>
          </div>

          <div className={styles.workspaceBody}>
            <div className={styles.documentPane}>
              <div className={styles.documentMeta}><span>Điều khoản {active + 1}/5</span><span>Trang {Math.min(active + 3, 12)}</span></div>
              <article className={styles.documentSheet} key={`document-${current.id}`}>
                <small>{current.clause}</small>
                <h3>{current.clause.replace(/^Điều \d+\. /, "")}</h3>
                <p>{current.prefix} <mark>{current.highlight}</mark></p>
                <div className={styles.documentCopy} aria-hidden="true"><i /><i /><i /><i /><i /></div>
              </article>
              <p className={styles.illustrationNote}>Nội dung dùng để minh họa cách hiển thị kết quả.</p>
            </div>

            <div className={styles.reviewPane}>
              <div className={styles.reviewPaneHeading}><div><small>Kết quả rà soát</small><strong>5 bước để kiểm tra lại</strong></div><span>{active + 1}/5</span></div>
              <ol className={styles.walkthroughSteps}>
                {steps.map((step, index) => (
                  <li key={step.id}>
                    <button type="button" data-step-index={index} className={active === index ? styles.activeStep : ""} aria-pressed={active === index} onClick={() => setActive(index)}>
                      <span className={styles.stepIcon}><Icon name={step.icon} /></span>
                      <span><strong>{step.title}</strong><small>{step.meta}</small></span>
                      <span className={styles.stepNumber}>{step.number}</span>
                    </button>
                  </li>
                ))}
              </ol>

              <div className={styles.findingCard} key={current.id}>
                <div className={styles.findingLabel}><span><Icon name={current.icon} /></span>{current.status}</div>
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
