import { HeroSection } from "@/components/landing/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { CollaborationSection } from "@/components/landing/collaboration-section";
import { AnalysisWalkthrough } from "@/components/landing/analysis-walkthrough";
import { UseCasesSection } from "@/components/landing/use-cases-section";
import { ReportPreviewSection } from "@/components/landing/report-preview-section";
import { TrustSection } from "@/components/landing/trust-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { FAQSection } from "@/components/landing/faq-section";
import { CTASection } from "@/components/landing/cta-section";

export default function Home() {
  return (
    <main id="main-content">
      <HeroSection />
      <HowItWorksSection />
      <FeaturesSection />
      <AnalysisWalkthrough />
      <CollaborationSection />
      <UseCasesSection />
      <ReportPreviewSection />
      <TrustSection />
      <PricingSection />
      <FAQSection />
      <CTASection />
    </main>
  );
}
