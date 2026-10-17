import Link from "next/link";
import { ArrowUpRight, FileSearch, Languages, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContractDemo } from "./contract-demo";
import { HeroBackground } from "./hero-background";
import styles from "./hero-slogan.module.css";

export function HeroSection() {
  return <section className="relative isolate pb-10 pt-5 [--ls-blue:#2864dc] sm:pb-12 lg:pt-7 xl:pb-14" aria-labelledby="hero-heading">
    <HeroBackground />
    <div className="mx-auto grid w-[calc(100%_-_40px)] max-w-[1380px] min-w-0 items-center gap-8 sm:w-[calc(100%_-_64px)] lg:w-[calc(100%_-_112px)] lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-9 xl:gap-14">
      <div className="min-w-0 pb-3 pt-2 lg:pb-10 lg:pt-5">
        <p className="mb-6 inline-flex max-w-full items-center gap-2 rounded-full border border-[#dce4ee] bg-white/80 px-3.5 py-2 text-xs font-medium text-[#315b96]"><Sparkles className="size-3.5 shrink-0" aria-hidden="true" />Trợ lý rà soát hợp đồng</p>
        <h1 id="hero-heading" className="font-[family-name:var(--font-be-vietnam-pro)] text-[clamp(43px,7.4vw,76px)] font-bold leading-[1.14] tracking-[-0.035em] text-[#14213d] sm:text-[clamp(56px,7.8vw,86px)] lg:text-[clamp(50px,5.15vw,78px)]">
          <span className={`${styles.firstLine} block`}>Nhìn rõ rủi ro.</span>
          <span className={`${styles.secondLine} block`}>Trước khi <em className={`${styles.accent} relative inline-block pb-2 pr-1 font-[family-name:var(--font-lora)] font-semibold text-[#2864dc] after:absolute after:inset-x-1 after:bottom-1 after:h-1.5 after:-rotate-2 after:rounded-[50%] after:border-t after:border-[#2864dc]/50`}>bạn ký.</em></span>
        </h1>
        <p className="mt-6 max-w-[490px] text-base font-normal leading-7 text-[#52647d] sm:text-lg sm:leading-[1.8]">Mỗi cảnh báo quay về đúng điều khoản, kèm lý do và nguồn cần đối chiếu để bạn chủ động quyết định.</p>
        <div className="mt-8 flex flex-wrap items-center gap-3 max-sm:flex-col max-sm:items-stretch">
          <Button asChild className="min-h-12 rounded-full bg-[#2864dc] px-5 text-sm text-white shadow-[0_5px_14px_-8px_#2864dc70] hover:bg-[#1f4fb2] hover:!text-white"><Link href="/dashboard"><FileSearch aria-hidden="true" />Bắt đầu rà soát</Link></Button>
          <Button asChild variant="outline" className="min-h-12 rounded-full border-[#c9d8ed] bg-white px-5 text-sm text-[#14213d] shadow-none hover:border-[#a9c3e8] hover:bg-[#f6f9ff]"><Link href="/bao-cao-mau">Xem báo cáo mẫu<ArrowUpRight aria-hidden="true" /></Link></Button>
        </div>
        <ul className="mt-6 flex list-none flex-wrap items-center gap-x-4 gap-y-2 p-0 text-xs text-[#526987]" aria-label="Phạm vi hỗ trợ">
          <li className="flex items-center gap-1.5"><Languages className="size-3.5" aria-hidden="true" />Tiếng Việt</li>
          <li className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-[#7995b8]" aria-hidden="true" />Mua bán</li>
          <li className="flex items-center gap-1.5"><span className="size-1 rounded-full bg-[#7995b8]" aria-hidden="true" />Dịch vụ</li>
        </ul>
        <a href="#kiem-tra-dieu-khoan" className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-[#315b96] underline decoration-[#315b96]/30 underline-offset-4 hover:decoration-[#315b96]">Hoặc thử nhanh một điều khoản<ArrowUpRight className="size-3.5" aria-hidden="true" /></a>
      </div>
      <div className="relative min-w-0 lg:pt-4">
        <ContractDemo />
      </div>
    </div>
  </section>;
}
