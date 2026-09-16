const steps = [
  { number: "01", title: "Tải hợp đồng", description: "Hỗ trợ các định dạng phổ biến." },
  { number: "02", title: "Xem phân tích", description: "Phát hiện rủi ro, điểm cần làm rõ." },
  { number: "03", title: "Kiểm tra và xuất báo cáo", description: "Tổng hợp rõ ràng, dễ chia sẻ." },
];

export function HowItWorksSection() {
  return <section id="quy-trinh" className="how-section ls-container" aria-labelledby="how-heading"><h2 id="how-heading">Một quy trình rõ ràng, từ đầu đến cuối.</h2><ol className="steps grid gap-8 md:grid-cols-3">{steps.map(step => <li key={step.number} className="flex items-start gap-6"><span className="step-number">{step.number}</span><div><h3>{step.title}</h3><p>{step.description}</p></div></li>)}</ol></section>;
}
