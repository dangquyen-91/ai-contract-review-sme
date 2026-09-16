import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="ls-container">
        <div className="footer-columns grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="footer-brand-block">
            <Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
            <p className="brand-description">Hiểu rõ điều khoản.<br />Chủ động trước khi ký.</p>
            <Link className="footer-explore" href="/bao-cao-mau">
              Khám phá LawScan <Icon name="diagonal" width="18" height="18" />
            </Link>
          </div>
          <nav aria-label="Sản phẩm">
            <h2>Sản phẩm</h2>
            <Link href="/#tinh-nang">Tính năng</Link>
            <Link href="/#quy-trinh">Cách hoạt động</Link>
            <Link href="/#goi-dich-vu">Gói dịch vụ</Link>
          </nav>
          <nav aria-label="Hỗ trợ">
            <h2>Hỗ trợ</h2>
            <Link href="/#cau-hoi">Câu hỏi thường gặp</Link>
            <Link href="/bao-cao-mau">Khám phá bản mẫu</Link>
          </nav>
          <div className="footer-policies">
            <h2>Thông tin sử dụng</h2>
            <details>
              <summary>Phạm vi hỗ trợ <span aria-hidden="true">+</span></summary>
              <p>LawScan hỗ trợ rà soát sơ bộ hợp đồng mua bán và dịch vụ tiếng Việt. Nội dung trên trang là minh họa.</p>
            </details>
            <details>
              <summary>Dữ liệu bản mẫu <span aria-hidden="true">+</span></summary>
              <p>Trang này chỉ sử dụng dữ liệu mẫu, không yêu cầu tải hợp đồng hoặc nhập thông tin cá nhân.</p>
            </details>
          </div>
        </div>
        <div className="footer-signoff flex items-center justify-between gap-6">
          <div className="footer-principle">
            <span><Icon name="shield" /></span>
            <div>
              <small>NGUYÊN TẮC CỦA LAWSCAN</small>
              <strong>Quyết định cuối cùng luôn thuộc về bạn.</strong>
              <p>LawScan giúp sắp xếp thông tin để đội ngũ kiểm tra và trao đổi rõ ràng hơn.</p>
            </div>
          </div>
          <a className="back-to-top" href="#top" aria-label="Về đầu trang">
            <span>Về đầu trang</span><Icon name="arrow" />
          </a>
        </div>
        <div className="footer-bottom flex flex-wrap justify-between gap-3">
          <p>© 2026 LawScan</p>
          <p>AI hỗ trợ rà soát, không thay thế tư vấn pháp lý chuyên nghiệp.</p>
        </div>
      </div>
    </footer>
  );
}
