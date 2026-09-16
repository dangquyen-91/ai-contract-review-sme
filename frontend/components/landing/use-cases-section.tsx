import { Icon } from "@/components/ui/icon";
import styles from "./landing-depth.module.css";

const cases = [
  { icon: "briefcase", role: "Chủ doanh nghiệp", title: "Nắm nhanh điều cần quyết định", text: "Xem nghĩa vụ, thời hạn và các điểm cần hỏi lại trước khi đồng ý với đối tác.", items: ["Tóm tắt nội dung chính", "Ưu tiên rủi ro cần xử lý"] },
  { icon: "user", role: "Người quản lý", title: "Theo dõi cam kết thực hiện", text: "Kiểm tra phạm vi công việc, thanh toán, nghiệm thu và điều kiện chấm dứt.", items: ["Đối chiếu trách nhiệm hai bên", "Chia sẻ báo cáo cho đội ngũ"] },
  { icon: "scales", role: "Nhân sự pháp chế", title: "Có điểm bắt đầu để rà soát", text: "Tổng hợp sơ bộ các vấn đề, nguồn tham chiếu và lịch sử chỉnh sửa trong một nơi.", items: ["Xem lại từng nhận định", "Ghi nhận quyết định cuối cùng"] },
] as const;

export function UseCasesSection() {
  return (
    <section id="doi-tuong" className={styles.useCases} aria-labelledby="use-case-heading">
      <div className="ls-container">
        <div className={styles.useCaseHeading} data-reveal><div><p className="section-eyebrow">04 / Dành cho đội ngũ</p><h2 id="use-case-heading">Mỗi vai trò một góc nhìn.<br /><span>Cùng một nguồn thông tin.</span></h2></div><p>LawScan giúp các bên trao đổi trên cùng nội dung hợp đồng và ghi nhận rõ điều cần xử lý.</p></div>
        <div className={styles.useCaseGrid}>{cases.map((item, index) => <article key={item.role} className={styles.useCaseCard} data-reveal data-reveal-delay={index * 80}><span className={styles.roleIcon}><Icon name={item.icon} /></span><p className={styles.role}>{item.role}</p><h3>{item.title}</h3><p>{item.text}</p><ul>{item.items.map(value => <li key={value}><Icon name="check" />{value}</li>)}</ul></article>)}</div>
      </div>
    </section>
  );
}
