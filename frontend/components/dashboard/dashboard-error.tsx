"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { isApiClientError } from "@/lib/api/client";

export function DashboardError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const needsOrganization = isApiClientError(error) && error.status === 403;
  return <section className="min-h-dvh flex flex-col items-center justify-center text-[#14213d] bg-[#f6f7f9] text-center p-7 [&_svg]:w-4">
    <span className="grid size-14 place-items-center rounded-[15px] bg-[#e8f0ff] text-[#2864dc]"><Icon name="document" /></span>
    <h1 className="mt-[18px] text-[27px]">Chưa thể mở không gian làm việc</h1>
    <p className="mt-2 max-w-[470px] text-xs leading-relaxed text-[#6b778c]">{isApiClientError(error) ? error.message : "Không thể tải dữ liệu. Vui lòng thử lại."}</p>
    {needsOrganization
      ? <Link className="mt-5 rounded-[9px] bg-[#2864dc] px-[15px] py-3 text-white" href="/chon-to-chuc">Thiết lập tổ chức <Icon name="arrow" /></Link>
      : <button className="mt-5 rounded-[9px] bg-[#2864dc] px-[15px] py-3 text-white" type="button" onClick={onRetry}>Tải lại <Icon name="arrow" /></button>}
  </section>;
}
