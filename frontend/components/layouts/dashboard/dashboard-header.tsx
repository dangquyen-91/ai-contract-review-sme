"use client";

import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";

type DashboardHeaderProps = {
  workspaceName: string;
  sectionLabel: string;
  name: string;
  roleLabel: string;
  onLogout: () => void;
  loggingOut: boolean;
};

function initials(name: string) {
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase() || "LS";
}

export function DashboardHeader({ workspaceName, sectionLabel, name, roleLabel, onLogout, loggingOut }: DashboardHeaderProps) {
  return <header className="min-h-[68px] flex items-center justify-between gap-5 [border-bottom:1px_solid_var(--line)] [background:rgb(255_255_255_/_0.94)] px-[clamp(24px,4vw,52px)] py-[13px] [&>_p]:flex [&>_p]:items-center [&>_p]:gap-2.5 [&>_p]:text-[color:var(--muted)] [&>_p_i]:text-[#bdc5d0] [&>_p_i]:not-italic [&>_p_strong]:text-[color:var(--ink)] [@media_(max-width:_820px)]:min-h-[62px] [@media_(max-width:_820px)]:[padding-inline:18px] [&>_p]:[@media_(max-width:_820px)]:hidden">
    <div className="hidden [@media_(max-width:_820px)]:flex [@media_(max-width:_820px)]:items-center [@media_(max-width:_820px)]:gap-2 [&_.brand-image]:[@media_(max-width:_820px)]:w-[33px] [&_.brand-image]:[@media_(max-width:_820px)]:h-[33px] [&_strong]:[@media_(max-width:_820px)]:text-[length:15px]"><Brand markOnly /><strong>LawScan</strong></div>
    <p><span>{workspaceName}</span><i>/</i><strong>{sectionLabel}</strong></p>
    <div className="flex items-center gap-[13px]"><span className="min-h-[30px] inline-flex items-center gap-[7px] text-[#345981] border [background:#f6f9fc] px-2.5 py-0 rounded-[20px] border-solid border-[#d9e4f0] [&_svg]:w-3.5 [@media_(max-width:_820px)]:hidden"><Icon name="shield" />{roleLabel}</span><span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-[#1b3154] text-[10px] font-extrabold text-white [@media_(max-width:_820px)]:hidden">{initials(name)}</span><button className="hidden [@media_(max-width:_820px)]:w-[35px] [@media_(max-width:_820px)]:h-[35px] [@media_(max-width:_820px)]:grid [@media_(max-width:_820px)]:place-items-center [@media_(max-width:_820px)]:text-[#607087] [@media_(max-width:_820px)]:border [@media_(max-width:_820px)]:border-[color:var(--line)] [@media_(max-width:_820px)]:[background:white] [@media_(max-width:_820px)]:rounded-[9px] [@media_(max-width:_820px)]:border-solid [&_svg]:[@media_(max-width:_820px)]:w-[15px] [&_svg]:[@media_(max-width:_820px)]:[transform:rotate(180deg)]" type="button" onClick={onLogout} disabled={loggingOut} aria-label="Đăng xuất"><Icon name="arrow" /></button></div>
  </header>;
}
