"use client";

import { useEffect, useRef, useState } from "react";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";

const examples = [
  { label: "Thanh toán", title: "Điều 2. Thanh toán", prefix: "Bên A thanh toán", clause: "sau khi hoàn thành dịch vụ.", risk: "Thời hạn chưa cụ thể", detail: "Cần làm rõ thời điểm thanh toán.", suggestion: "Bổ sung số ngày và điều kiện thanh toán." },
  { label: "Nghiệm thu", title: "Điều 2. Nghiệm thu", prefix: "Dịch vụ được nghiệm thu", clause: "khi đạt yêu cầu của Bên A.", risk: "Tiêu chí chưa rõ ràng", detail: "Cần thống nhất tiêu chí nghiệm thu.", suggestion: "Bổ sung tiêu chí, thời hạn và biên bản nghiệm thu." },
  { label: "Chấm dứt", title: "Điều 2. Chấm dứt", prefix: "Một bên được chấm dứt", clause: "bất cứ khi nào cần thiết.", risk: "Điều kiện chưa cụ thể", detail: "Cần làm rõ nghĩa vụ thông báo.", suggestion: "Làm rõ điều kiện, thời gian báo trước và nghĩa vụ còn lại." },
];

export function ContractDemo() {
  const [selected, setSelected] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const example = examples[selected];

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !("IntersectionObserver" in window)) return;

    // Start the one-shot illustration only when it is visible, including on mobile.
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        stage.dataset.demoReady = "true";
        observer.disconnect();
      }
    }, { threshold: 0.15 });
    observer.observe(stage);
    return () => observer.disconnect();
  }, []);

  return (
    <div id="minh-hoa" className="contract-demo">
      <div ref={stageRef} className="demo-stage" id="clause-preview" aria-live="polite" aria-atomic="true">
        <div className="background-arrow" aria-hidden="true">↗</div>
        <article className="contract-paper">
          <div className="paper-heading"><Brand markOnly /><strong>HỢP ĐỒNG DỊCH VỤ</strong><small>LS · 2026</small></div>
          <div className="paper-muted"><b>Điều 1. Phạm vi công việc</b><div className="document-lines" aria-hidden="true"><i /><i /><i /></div></div>
          <div key={`clause-${selected}`} className="selected-clause"><h2>{example.title}</h2><p>{example.prefix} <mark>{example.clause}</mark></p></div>
          <div className="paper-muted"><b>Điều 3. Quyền và nghĩa vụ của các bên</b><div className="document-lines" aria-hidden="true"><i /><i /><i /><i /></div></div>
          <div className="scan-track" aria-hidden="true"><div key={`scan-${selected}`} className="scan-beam" /></div>
        </article>
        <svg key={`line-${selected}`} className="annotation-line" viewBox="0 0 120 120" fill="none" aria-hidden="true"><path pathLength="1" d="M5 112C48 112 26 12 111 12" stroke="#0066ff" strokeWidth="3" /><circle cx="5" cy="112" r="5" fill="#0066ff" /><circle cx="111" cy="12" r="5" fill="#0066ff" /></svg>
        <div key={`risk-${selected}`} className="risk-note"><span className="warning-dot" /><div><strong>{example.risk}</strong><p>{example.detail}</p></div></div>
        <div key={`suggestion-${selected}`} className="suggestion-note"><Icon name="sparkle" /><div><strong>Gợi ý làm rõ</strong><p>{example.suggestion}</p></div></div>
        <div className="pen-marks" aria-hidden="true"><i /><i /></div>
      </div>
      <div className="demo-controls flex flex-wrap items-center justify-between gap-4">
        <div className="demo-options flex gap-2" role="group" aria-label="Chọn điều khoản minh họa">
          {examples.map((item, index) => <button type="button" key={item.label} aria-pressed={selected === index} aria-controls="clause-preview" onClick={() => setSelected(index)}>{item.label}</button>)}
        </div>
        <a href="#tinh-nang" className="demo-caption">Ví dụ minh họa <Icon name="arrow" width="17" /></a>
      </div>
    </div>
  );
}
