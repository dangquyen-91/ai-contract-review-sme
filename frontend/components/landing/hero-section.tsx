import { Icon } from "@/components/ui/icon";
import { ContractDemo } from "./contract-demo";

export function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      <div className="hero ls-container grid items-center">
      <div className="hero-copy">
        <p className="hero-eyebrow">Trợ lý rà soát hợp đồng.</p>
        <h1 id="hero-heading">Nhìn rõ rủi ro.<br />Trước khi<br /><span className="hero-signature">bạn ký.</span></h1>
        <p className="hero-description">Mỗi cảnh báo quay về đúng điều khoản, kèm lý do và nguồn cần đối chiếu để bạn chủ động quyết định.</p>
        <div className="hero-actions flex flex-wrap items-center gap-6"><a className="ls-button" href="#kiem-tra-dieu-khoan">Thử một điều khoản <Icon name="arrow" /></a><a className="text-link" href="#quy-trinh">Khám phá LawScan.</a></div>
        <ul className="hero-tags flex flex-wrap gap-3" aria-label="Phạm vi hỗ trợ"><li>Tiếng Việt</li><li>Mua bán</li><li>Dịch vụ</li></ul>
      </div>
      <ContractDemo />
      </div>
    </section>
  );
}
