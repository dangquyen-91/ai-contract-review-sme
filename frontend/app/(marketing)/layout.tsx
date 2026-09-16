import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LandingMotion } from "@/components/landing/landing-motion";
import "./marketing.css";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="lawscan" id="top">
      <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
      <Header />
      {children}
      <Footer />
      <LandingMotion />
    </div>
  );
}
