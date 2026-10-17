"use client";

import { Button } from "@/components/ui/button";

import { ContractTable } from "@/components/contract/contract-table";
import { Icon } from "@/components/ui/icon";

import type { DashboardContract } from "@/types/contracts";

export function RecentContracts({ contracts, canReview, onReview, isReviewing, onViewAll }: { contracts: DashboardContract[]; canReview: boolean; onReview: (contract: DashboardContract, rerun?: boolean) => void; isReviewing: boolean; onViewAll: () => void }) {
  return <section className="border border-[color:var(--line)] [background:white] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid min-w-0 overflow-hidden mt-5"><header className="flex flex-wrap items-center justify-between gap-3 [border-bottom:1px_solid_var(--line)] px-[21px] py-[18px] [&_h2]:text-[length:14px] [&_h2]:m-0 [&_p]:text-[color:var(--muted)] [&_p]:text-[length:10px] [&_p]:mt-[3px] [&_p]:mb-0 [&_p]:mx-0 [&>_button:not([data-slot=button])]:inline-flex [&>_button:not([data-slot=button])]:items-center [&>_button:not([data-slot=button])]:gap-[9px] [&>_button:not([data-slot=button])]:text-[color:var(--accent)] [&>_button:not([data-slot=button])]:[background:transparent] [&>_button:not([data-slot=button])]:cursor-pointer [&>_button:not([data-slot=button])]:border-0 [&>_button:not([data-slot=button])]:border-none [&>_button:not([data-slot=button])]:border-current [&>_button:not([data-slot=button])]:[font-size:10px] [&>_button:not([data-slot=button])]:[font-weight:700] [&>_button:not([data-slot=button])_svg]:w-3.5 [@media_(max-width:_580px)]:[padding-inline:16px]"><div><h2>Hợp đồng gần đây</h2><p>Tiếp tục công việc đang dở hoặc xem lại kết quả.</p></div><Button variant="default" size="sm" type="button" onClick={onViewAll}>Xem tất cả <Icon name="arrow" /></Button></header><ContractTable contracts={contracts} canReview={canReview} onReview={onReview} isReviewing={isReviewing} /></section>;
}
