import type { Metadata } from "next";
import { MarketingShell } from "@/components/layouts/marketing-shell";

export const metadata: Metadata = {
  title: "Gói dịch vụ | LawScan",
  robots: { index: false, follow: false },
};

export default function SubscriptionLayout({ children }: { children: React.ReactNode }) {
  return (
    <MarketingShell>
      <main id="main-content" className="border-t border-[#e9eef5] bg-[radial-gradient(ellipse_at_50%_0%,#eaf1ff80,transparent_55%)]">
        <div id="subscription-content" className="mx-auto w-[calc(100%_-_40px)] max-w-[1200px] py-12 sm:w-[calc(100%_-_64px)] sm:py-16 lg:w-[calc(100%_-_112px)] lg:py-20">
          {children}
        </div>
      </main>
    </MarketingShell>
  );
}
