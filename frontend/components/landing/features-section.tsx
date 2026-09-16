import { Icon } from "@/components/ui/icon";

const features = [
  { title: "Hiểu nội dung", icon: "document", description: "Trích xuất văn bản, tóm tắt điều khoản và nêu rõ ý chính bằng ngôn ngữ dễ hiểu." },
  { title: "Nhận diện rủi ro", icon: "search", description: "Phát hiện điều khoản chưa rõ ràng hoặc có rủi ro, kèm gợi ý chỉnh sửa." },
  { title: "Xem căn cứ", icon: "scales", description: "Giải thích kèm nguồn tham chiếu để bạn kiểm tra và có thêm góc nhìn." },
] as const;

export function FeaturesSection() {
  return (
    <section id="tinh-nang" className="features-section ls-container grid" aria-labelledby="features-heading">
      <div className="features-main">
        <p className="section-eyebrow">01 / Khám phá LawScan</p>
        <h2 id="features-heading">Điều khoản rõ hơn.<br />Quyết định chủ động hơn.</h2>
        <p className="section-description">Hiểu đúng nội dung, phát hiện rủi ro và xem căn cứ pháp lý<br className="hidden xl:block" /> dễ dàng — để bạn luôn nắm thế chủ động trong mọi quyết định.</p>
        <div className="feature-illustration" role="img" aria-label="Minh họa một hợp đồng với điều khoản gia hạn chưa cụ thể được đánh dấu">
          <div className="leaf-blur" aria-hidden="true" />
          <div className="feature-paper back-paper" aria-hidden="true" />
          <div className="feature-paper"><h3>Điều 4. Thời hạn hợp đồng</h3><p>Hợp đồng có hiệu lực từ ngày ký và kéo dài đến khi các bên hoàn thành nghĩa vụ theo thỏa thuận.</p><mark>Việc gia hạn (nếu có) sẽ được hai bên thỏa thuận bằng văn bản vào thời điểm phù hợp.</mark><h3>Điều 5. Giá trị hợp đồng</h3><p>Tổng giá trị hợp đồng được hai bên thống nhất theo phụ lục đính kèm. Các khoản thanh toán sẽ được thực hiện theo tiến độ công việc.</p><span>···</span></div>
          <div className="feature-callout"><span className="warning-dot">!</span><div><strong>Thời hạn chưa cụ thể</strong><p>Điều khoản chưa nêu rõ thời điểm, điều kiện hoặc thời hạn gia hạn. Nên làm rõ để tránh rủi ro phát sinh khi thực hiện.</p></div></div>
          <span className="illustration-caption">Ví dụ minh họa</span>
        </div>
      </div>
      <ol className="feature-list">{features.map((feature, index) => <li key={feature.title}><span className="feature-number">0{index + 1}</span><Icon name={feature.icon} width="40" height="40" /><div><h3>{feature.title}</h3><p>{feature.description}</p></div></li>)}</ol>
    </section>
  );
}
