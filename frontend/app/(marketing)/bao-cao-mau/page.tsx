import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { PrintReportButton } from "@/components/report/print-report-button";
import styles from "./sample-report.module.css";

export const metadata: Metadata = {
  title: "Báo cáo rà soát mẫu | LawScan",
  description: "Xem cấu trúc báo cáo rà soát hợp đồng minh họa của LawScan.",
};

const findings = [
  {
    level: "Ưu tiên cao",
    tone: "high",
    title: "Quyền chấm dứt chưa cân bằng",
    clause: "Bên A có quyền chấm dứt hợp đồng vào bất kỳ thời điểm nào khi xét thấy cần thiết.",
    reason: "Điều khoản chưa nêu trường hợp áp dụng, thời gian báo trước và cách xử lý nghĩa vụ đang thực hiện.",
    suggestion: "Xác định rõ căn cứ chấm dứt, thời hạn thông báo và trách nhiệm thanh toán cho phần công việc đã hoàn thành.",
  },
  {
    level: "Cần làm rõ",
    tone: "medium",
    title: "Chưa có thời hạn thanh toán",
    clause: "Bên mua thanh toán sau khi hoàn thành nghĩa vụ và nghiệm thu.",
    reason: "Cụm từ “sau khi” không xác định số ngày thanh toán hoặc thời điểm bắt đầu tính hạn.",
    suggestion: "Cân nhắc quy định thanh toán trong 07 ngày làm việc kể từ ngày ký biên bản nghiệm thu hợp lệ.",
  },
  {
    level: "Nên thống nhất",
    tone: "low",
    title: "Tiêu chí nghiệm thu còn chung chung",
    clause: "Dịch vụ được nghiệm thu khi đáp ứng yêu cầu của Bên A.",
    reason: "Hai bên có thể hiểu khác nhau về phạm vi yêu cầu và cách xác nhận kết quả.",
    suggestion: "Dẫn chiếu phụ lục tiêu chí, quy định thời hạn phản hồi và hình thức biên bản nghiệm thu.",
  },
] as const;

export default function SampleReportPage() {
  return (
    <main id="main-content" className={styles.page}>
      <section className={styles.hero}>
        <div className={`ls-container ${styles.heroInner}`}>
          <div>
            <Link className={styles.homeButton} href="/"><Icon name="arrow" />Quay về trang chủ</Link>
            <p className={styles.eyebrow}>BÁO CÁO RÀ SOÁT · DỮ LIỆU MINH HỌA</p>
            <h1>Hợp đồng cung cấp<br />dịch vụ vận hành</h1>
            <p className={styles.lead}>Một ví dụ hoàn chỉnh về cách LawScan sắp xếp tổng quan, điểm cần xem lại, nguồn và đề xuất chỉnh sửa.</p>
          </div>
          <div className={styles.heroActions}>
            <PrintReportButton />
            <Link href="/dang-ky">Đăng ký dùng thử <Icon name="arrow" /></Link>
          </div>
        </div>
      </section>

      <div className={`ls-container ${styles.reportLayout}`}>
        <aside className={styles.reportNav} aria-label="Mục lục báo cáo">
          <div className={styles.fileCard}><span><Icon name="document" /></span><div><small>TỆP MẪU</small><strong>Hop-dong-dich-vu.docx</strong><p>12 trang · Tiếng Việt</p></div></div>
          <nav><a href="#tong-quan">01 · Tổng quan</a><a href="#diem-can-xem">02 · Điểm cần xem</a><a href="#nguon">03 · Nguồn tham chiếu</a><a href="#pham-vi-bao-cao">04 · Phạm vi báo cáo</a></nav>
          <p>Đây là báo cáo tĩnh để minh họa cấu trúc đầu ra dự kiến. Không có tài liệu thật được tải lên.</p>
        </aside>

        <article className={styles.report}>
          <div className={styles.demoNotice}><Icon name="shield" /><p><strong>Báo cáo minh họa</strong><span>Nội dung không phải kết luận pháp lý và không thay thế việc kiểm tra của người phụ trách.</span></p></div>

          <section id="tong-quan" className={styles.reportSection}>
            <div className={styles.sectionTitle}><span>01</span><div><small>TỔNG QUAN</small><h2>Những điều cần biết trước</h2></div></div>
            <div className={styles.summaryGrid}>
              <div><small>THỜI HẠN</small><strong>12 tháng</strong><p>Tự động gia hạn nếu không thông báo</p></div>
              <div><small>THANH TOÁN</small><strong>Theo nghiệm thu</strong><p>Chưa có số ngày thanh toán</p></div>
              <div><small>ĐIỂM CẦN XEM</small><strong>03</strong><p>Sắp xếp theo mức ưu tiên</p></div>
            </div>
            <p className={styles.summaryText}>Hợp đồng quy định việc cung cấp dịch vụ vận hành trong 12 tháng. Trước khi ký, hai bên nên làm rõ quyền chấm dứt, thời hạn thanh toán và tiêu chí nghiệm thu.</p>
          </section>

          <section id="diem-can-xem" className={styles.reportSection}>
            <div className={styles.sectionTitle}><span>02</span><div><small>ĐIỂM CẦN XEM LẠI</small><h2>Ba nội dung cần ưu tiên trao đổi</h2></div></div>
            <div className={styles.findings}>
              {findings.map((finding, index) => (
                <article className={`${styles.finding} ${styles[finding.tone]}`} key={finding.title}>
                  <header><span>{String(index + 1).padStart(2, "0")}</span><div><small>{finding.level}</small><h3>{finding.title}</h3></div></header>
                  <blockquote><small>ĐIỀU KHOẢN GỐC</small><p>“{finding.clause}”</p></blockquote>
                  <div className={styles.findingDetails}><div><small>VÌ SAO CẦN XEM LẠI</small><p>{finding.reason}</p></div><div><small>GỢI Ý TRAO ĐỔI</small><p>{finding.suggestion}</p></div></div>
                </article>
              ))}
            </div>
          </section>

          <section id="nguon" className={styles.reportSection}>
            <div className={styles.sectionTitle}><span>03</span><div><small>NGUỒN THAM CHIẾU</small><h2>Điểm bắt đầu để kiểm tra lại</h2></div></div>
            <div className={styles.sourceCard}><Icon name="scales" /><div><strong>Văn bản và điều khoản liên quan</strong><p>Trong sản phẩm hoàn chỉnh, nguồn sẽ được đặt cạnh từng nhận định để người dùng đọc phạm vi áp dụng và kiểm tra hiệu lực.</p><small>TRẠNG THÁI · Nguồn trong báo cáo này là nội dung minh họa</small></div></div>
          </section>

          <section id="pham-vi-bao-cao" className={styles.reportSection}>
            <div className={styles.sectionTitle}><span>04</span><div><small>PHẠM VI BÁO CÁO</small><h2>Điều báo cáo này có và chưa có</h2></div></div>
            <div className={styles.scopeGrid}><div><Icon name="check" /><strong>Có trong bản mẫu</strong><ul><li>Tóm tắt nội dung chính</li><li>Sắp xếp điểm cần xem</li><li>Giải thích và đề xuất</li></ul></div><div><Icon name="search" /><strong>Cần được kiểm tra thêm</strong><ul><li>Hiệu lực nguồn áp dụng</li><li>Bối cảnh giao dịch thực tế</li><li>Ý kiến chuyên gia khi cần</li></ul></div></div>
          </section>

          <footer className={styles.reportFooter}><span>LawScan · Báo cáo minh họa</span><span>Người dùng kiểm tra và quyết định nội dung cuối cùng.</span></footer>
        </article>
      </div>
    </main>
  );
}
