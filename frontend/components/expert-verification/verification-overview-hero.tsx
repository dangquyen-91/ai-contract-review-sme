import Link from "next/link";
import { ArrowRight, ClipboardCheck, ListChecks, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function VerificationOverviewHero() {
  return (
    <section aria-labelledby="verification-overview-title" className="relative overflow-hidden rounded-[20px] border border-[#cbdcf7] bg-[linear-gradient(112deg,#eaf2ff_0%,#f6f9ff_67%,#e7f5f2_100%)] px-5 py-6 shadow-[0_22px_45px_-40px_#284d80] sm:px-7">
      <div className="relative z-10 max-w-2xl lg:pr-12">
        <p className="m-0 text-ui-caption font-bold tracking-wide text-primary">Không gian chuyên gia · LawScan</p>
        <h1 id="verification-overview-title" className="mb-0 mt-3 text-[clamp(26px,2.4vw,32px)] font-bold leading-tight tracking-tight text-card-foreground">Kiểm tra rủi ro hợp đồng</h1>
        <p className="mb-0 mt-3 max-w-xl text-ui leading-6 text-muted-foreground">Đối chiếu kết quả AI, xác minh từng rủi ro và gửi kết luận cho người yêu cầu. Ưu tiên hoàn tất các yêu cầu bạn đã nhận.</p>
        <div className="mt-4 flex flex-wrap gap-2.5">
          <Button asChild><Link href="/expert-verification?status=in_progress"><ClipboardCheck aria-hidden="true" />Tiếp tục xác minh</Link></Button>
          <Button asChild variant="outline"><Link href="/expert-verification?status=requested">Xem hàng đợi<ArrowRight aria-hidden="true" /></Link></Button>
        </div>
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-80 rounded-full border border-[#bad1f2]" />
      <div aria-hidden="true" className="pointer-events-none absolute bottom-0 right-12 hidden h-56 w-48 items-center justify-center xl:flex">
        <span className="absolute size-44 rounded-full border-[20px] border-[#d4e5fb] opacity-70" />
        <div className="relative flex h-40 w-32 rotate-6 flex-col gap-3 rounded-xl border border-[#c7d8f2] bg-white px-4 py-5 shadow-[0_23px_33px_-20px_#5374a6]">
          <ListChecks className="size-7 text-primary" /><span className="h-1.5 rounded bg-slate-200" /><span className="h-1.5 w-3/4 rounded bg-slate-200" /><span className="h-1.5 rounded bg-slate-200" />
          <span className="absolute -right-4 bottom-3 grid size-12 place-items-center rounded-full border-4 border-emerald-50 bg-emerald-600 text-white"><ShieldCheck className="size-6" /></span>
        </div>
      </div>
    </section>
  );
}
