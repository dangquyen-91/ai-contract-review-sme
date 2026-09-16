import { Icon } from "@/components/ui/icon";
import { ContractDemo } from "./contract-demo";

export function HeroSection() {
  return (
    <section className="hero-section" aria-labelledby="hero-heading">
      <div className="hero ls-container grid items-center">
      <div className="hero-copy">
        <p className="hero-eyebrow">Trợ lý rà soát hợp đồng.</p>
        <h1 id="hero-heading">Nhìn rõ rủi ro.<br />Trước khi<br /><span className="hero-signature">bạn ký.</span></h1>
        <p className="hero-description">Hiểu điều khoản, đối chiếu căn cứ và chủ động kiểm tra trước khi đưa ra quyết định.</p>
        <div className="hero-actions flex flex-wrap items-center gap-6"><a className="ls-button" href="#minh-hoa">Trải nghiệm bản mẫu <Icon name="arrow" /></a><a className="text-link" href="#quy-trinh">Khám phá LawScan.</a></div>
        <ul className="hero-tags flex flex-wrap gap-3" aria-label="Phạm vi hỗ trợ"><li>Tiếng Việt</li><li>Mua bán</li><li>Dịch vụ</li></ul>
      </div>
      <ContractDemo />
      </div>
    </section>
  );
}
