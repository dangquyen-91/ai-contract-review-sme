import Link from "next/link";
import { Icon } from "@/components/ui/icon";

export function CTASection() {
  return (
    <section className="cta-section">
      <div className="ls-container flex flex-wrap items-center justify-between gap-6">
        <div className="cta-copy">
          <h2>Bắt đầu từ <span>một điều khoản.</span></h2>
          <p>Xem cách LawScan làm rõ rủi ro, giải thích lý do và gợi ý bước kiểm tra tiếp theo.</p>
        </div>
        <Link href="/bao-cao-mau" className="ls-button">Xem báo cáo mẫu <Icon name="diagonal" width="19" /></Link>
      </div>
    </section>
  );
}
