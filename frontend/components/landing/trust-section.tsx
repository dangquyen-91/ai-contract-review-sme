import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import styles from "./trust-section.module.css";

const principles = [
  {
    icon: "shield" as const,
    title: "Bản demo không nhận tài liệu thật",
    text: "Các hợp đồng và kết quả trên website đều là dữ liệu minh họa được chuẩn bị sẵn.",
  },
  {
    icon: "document" as const,
    title: "Phạm vi được nói rõ",
    text: "Bản mẫu tập trung vào hợp đồng mua bán, dịch vụ bằng tiếng Việt và rà soát sơ bộ.",
  },
  {
    icon: "check" as const,
    title: "Bạn là người quyết định",
    text: "Nhận định, nguồn và đề xuất luôn cần được người phụ trách kiểm tra trước khi sử dụng.",
  },
];

export function TrustSection() {
  return (
    <section id="pham-vi" className={styles.section} aria-labelledby="trust-heading">
      <div className="ls-container">
        <div className={styles.heading} data-reveal>
          <div>
            <p className="section-eyebrow">06 / Phạm vi và dữ liệu</p>
            <h2 id="trust-heading">Minh bạch trước khi<br /><span>bạn dùng tài liệu thật.</span></h2>
          </div>
          <p>LawScan đang ở giai đoạn bản mẫu. Chúng tôi nói rõ phần nào đã có, phần nào đang được hoàn thiện cùng backend.</p>
        </div>

        <div className={styles.principleGrid}>
          {principles.map((item, index) => (
            <article className={styles.principleCard} data-reveal data-reveal-delay={String(index * 70)} key={item.title}>
              <span><Icon name={item.icon} /></span>
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          ))}
        </div>

        <div className={styles.statusPanel} data-reveal>
          <div className={styles.statusIntro}>
            <small>TRẠNG THÁI HIỆN TẠI</small>
            <strong>Biết rõ trước khi trải nghiệm</strong>
            <Link href="/bao-cao-mau">Mở báo cáo mẫu <Icon name="arrow" /></Link>
          </div>
          <dl>
            <div><dt>Loại hợp đồng</dt><dd>Mua bán và dịch vụ <span className={styles.available}>Có trong bản mẫu</span></dd></div>
            <div><dt>Ngôn ngữ</dt><dd>Tiếng Việt <span className={styles.available}>Có trong bản mẫu</span></dd></div>
            <div><dt>PDF và DOCX</dt><dd>Tải tài liệu của bạn <span className={styles.planned}>Đang hoàn thiện</span></dd></div>
            <div><dt>Lưu và xóa dữ liệu</dt><dd>Chính sách cùng backend <span className={styles.planned}>Chưa công bố</span></dd></div>
          </dl>
        </div>
      </div>
    </section>
  );
}
