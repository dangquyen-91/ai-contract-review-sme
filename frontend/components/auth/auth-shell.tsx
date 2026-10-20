import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";

export function AuthShell({ panel, children }: { panel: ReactNode; children: ReactNode }) {
  return (
    <main className="[--auth-primary:#0868ed] [--auth-primary-soft:#eaf3ff] [--auth-panel:#09162f] [--auth-panel-text:#ffffff] [--auth-panel-muted:#b8c8df] [--auth-warning:#e99b12] [--auth-border:#dbe5f1] min-h-dvh grid grid-cols-[minmax(470px,1.04fr)_minmax(480px,0.96fr)] text-[#0b1530] [background:#fff] [font-family:var(--font-geist-sans),Arial,sans-serif] [@media_(max-width:_1050px)]:grid-cols-[minmax(420px,0.92fr)_minmax(460px,1.08fr)] [@media_(max-width:_840px)]:block [@media_(max-width:_840px)]:min-h-dvh [@media_(max-width:_840px)]:[background:linear-gradient(180deg,#f2f7ff_0,#fff_280px)]">
      <aside className="relative min-h-dvh flex flex-col overflow-hidden text-white [background:radial-gradient(circle_at_86%_17%,#1d5bbd80_0,transparent_30%),radial-gradient(circle_at_12%_92%,#0066ff24_0,transparent_34%),#09162f] px-[clamp(42px,6vw,86px)] py-[34px] before:content-[''] before:absolute before:opacity-[0.16] before:bg-[linear-gradient(#8bb8ff33_1px,transparent_1px),linear-gradient(90deg,#8bb8ff33_1px,transparent_1px)] before:bg-[length:64px_64px] before:pointer-events-none before:inset-0 after:content-[''] after:absolute after:w-[360px] after:h-[360px] after:right-[-210px] after:pointer-events-none after:rounded-[50%] after:border-[70px] after:border-solid after:border-[#0d70ff16] after:bottom-[8%] [@media_(max-width:_1050px)]:[padding-inline:42px] [@media_(max-width:_840px)]:hidden">{panel}</aside>
      <section className="relative min-w-0 flex flex-col items-center justify-center [background:#fff] pt-[92px] pb-[52px] px-[clamp(38px,6vw,86px)] [@media_(max-width:_840px)]:min-h-dvh [@media_(max-width:_840px)]:justify-start [@media_(max-width:_840px)]:[background:transparent] [@media_(max-width:_840px)]:pt-[25px] [@media_(max-width:_840px)]:pb-10 [@media_(max-width:_840px)]:px-[22px] [@media_(max-width:_480px)]:[padding-inline:15px]">
        <div className="hidden [@media_(max-width:_840px)]:w-full [@media_(max-width:_840px)]:flex [@media_(max-width:_840px)]:items-center [@media_(max-width:_840px)]:justify-between [@media_(max-width:_840px)]:mb-[55px] [&>_a]:[@media_(max-width:_840px)]:first:text-[#0b1530] [&>_a]:[@media_(max-width:_840px)]:first:[text-decoration:none] [&>_a:first-child_>_span]:[@media_(max-width:_840px)]:flex [&>_a:first-child_>_span]:[@media_(max-width:_840px)]:items-center [&>_a:first-child_>_span]:[@media_(max-width:_840px)]:gap-2 [&>_a:first-child_>_span]:[@media_(max-width:_840px)]:text-[length:21px] [&>_a:first-child_>_span]:[@media_(max-width:_840px)]:font-[730] [&_svg]:[@media_(max-width:_840px)]:w-[27px] [&_svg]:[@media_(max-width:_840px)]:h-8 [&>_a]:[@media_(max-width:_840px)]:last:text-[#5f7089] [&>_a]:[@media_(max-width:_840px)]:last:text-[length:10px] [&>_a]:[@media_(max-width:_840px)]:last:font-semibold [&>_a]:[@media_(max-width:_840px)]:last:[text-decoration:none] [@media_(max-width:_480px)]:[padding-inline:7px] [@media_(max-width:_480px)]:mb-[35px]">
          <Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link>
          <Link href="/">Về trang chủ</Link>
        </div>
        <Link className="absolute inline-flex items-center gap-2 text-[#65738a] text-[length:11px] font-semibold [text-decoration:none] right-[clamp(34px,5vw,70px)] top-[37px] hover:text-[#0868ed] [&_svg]:w-[15px] [&_svg]:[transform:rotate(180deg)] focus-visible:[outline:3px_solid_#8ab8fa] focus-visible:outline-offset-[3px] [@media_(max-width:_840px)]:hidden" href="/"><Icon name="arrow" />Về trang chủ</Link>
        {children}
        <p className="flex items-center justify-center gap-[7px] text-[#8a96a8] text-center text-[length:8px] mt-7 [@media_(max-width:_480px)]:max-w-[300px] [@media_(max-width:_480px)]:leading-normal [&_svg]:w-[13px] [&_svg]:text-[#5d779c]"><Icon name="shield" />Kết nối được bảo vệ. LawScan không hiển thị mật khẩu của bạn.</p>
      </section>
    </main>
  );
}
