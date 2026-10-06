import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { LandingMotion } from "@/components/landing/landing-motion";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="[--ls-blue:#0066ff] [--ls-ink:#080e2f] [--ls-muted:#5e6c8e] [--ls-line:#dce4ef] text-[color:var(--ls-ink)] [background:#fdfdfc] [font-family:var(--font-geist-sans),Arial,Helvetica,sans-serif] text-[length:16px] leading-[1.55] overflow-clip [&_section[id]]:scroll-mt-7 [&[id='minh-hoa']]:scroll-mt-7 [&_a]:[-webkit-tap-highlight-color:transparent] [&_button]:[-webkit-tap-highlight-color:transparent] [&_summary]:[-webkit-tap-highlight-color:transparent] [&_a]:[transition:color_0.18s,background-color_0.18s,border-color_0.18s,transform_0.18s] [&_button]:[transition:color_0.18s,background-color_0.18s,border-color_0.18s,transform_0.18s] [&_button]:cursor-pointer [&_summary]:cursor-pointer [&_a]:hover:text-[color:var(--ls-blue)] [&:is(a,_button,_summary)]:focus-visible:[outline:3px_solid_#0066ff] [&:is(a,_button,_summary)]:focus-visible:outline-offset-[5px] [&:is(a,_button,_summary)]:focus-visible:rounded [&_*]:motion-reduce:!transition-none [&_*]:motion-reduce:!animate-none [&_*]:motion-reduce:!scroll-auto [&_*::before]:motion-reduce:!transition-none [&_*::before]:motion-reduce:!animate-none [&_*::before]:motion-reduce:!scroll-auto [&_*::after]:motion-reduce:!transition-none [&_*::after]:motion-reduce:!animate-none [&_*::after]:motion-reduce:!scroll-auto" id="top">
      <a className="absolute top-[-100px] z-30 [background:white] px-5 py-3 left-5 focus:top-3" href="#main-content">Bỏ qua điều hướng</a>
      <Header />
      {children}
      <Footer />
      <LandingMotion />
    </div>
  );
}
