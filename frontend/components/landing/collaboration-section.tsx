import { Icon } from "@/components/ui/icon";

const events = [
  { title: "Cần chỉnh sửa", date: "10 thg 3, 09:15", description: "Một số điều khoản cần làm rõ về thời hạn và nghiệm thu.", color: "amber" },
  { title: "Đã cập nhật", date: "11 thg 3, 14:20", description: "Đã chỉnh sửa theo góp ý của đội ngũ.", color: "blue" },
  { title: "Hoàn tất rà soát", date: "12 thg 3, 16:05", description: "Đã bổ sung điều kiện nghiệm thu.", color: "green" },
];

export function CollaborationSection() {
  return (
    <section id="phoi-hop" className="collaboration-section ls-container grid items-center" aria-labelledby="collaboration-heading">
      <svg className="collaboration-curve" viewBox="0 0 1200 460" preserveAspectRatio="none" fill="none" aria-hidden="true"><path d="M0 470C180 280 600 430 510 195S650 5 860 80" stroke="#0875ff" strokeWidth="1.5" /></svg>
      <div className="collaboration-copy"><p className="section-eyebrow">03 / AI hỗ trợ phân tích</p><h2 id="collaboration-heading">AI phân tích.<br />Bạn quyết định.</h2><p>Cùng rà soát, thảo luận và thống nhất cách xử lý,<br className="hidden xl:block" /> mọi bước đều được ghi nhận rõ ràng.</p><a href="#quy-trinh" className="underlined-link">Khám phá quy trình <Icon name="arrow" /></a><span className="handwritten">Từ điều khoản<br />đến quyết định tốt hơn.</span></div>
      <div className="review-illustration">
        <div className="review-back-sheet sheet-one" aria-hidden="true" /><div className="review-back-sheet sheet-two" aria-hidden="true" />
        <article className="review-card" aria-label="Minh họa ghi nhận rà soát hợp đồng">
          <div className="review-title flex items-start gap-3"><span className="file-badge"><Icon name="document" /></span><div><p className="review-kicker">Ghi nhận rà soát</p><h3>Rà soát hợp đồng dịch vụ</h3><p>Tạo ngày 10 thg 3, 2026</p></div><span className="review-status">Minh họa</span></div>
          <h4>Người phụ trách</h4><div className="review-owner flex items-center gap-3"><span className="avatar">NT</span><div><strong>Nguyễn Thị An</strong><p>Phòng pháp chế</p></div></div>
          <ol className="review-timeline">{events.map(event => <li key={event.title}><span className={`timeline-dot ${event.color}`} /><div><strong>{event.title}</strong><p>{event.date}</p></div><p>{event.description}</p></li>)}</ol>
        </article>
        <span className="review-handwritten handwritten">Rõ ràng<br />hơn mỗi ngày</span>
      </div>
    </section>
  );
}
