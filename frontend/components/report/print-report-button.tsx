"use client";

import { Icon } from "@/components/ui/icon";

export function PrintReportButton() {
  return <button className="min-h-12 flex items-center justify-between gap-2.5 border [font:inherit] px-[15px] py-0 rounded-[10px] border-solid border-[#77a6e55c] [font-size:11px] [font-weight:650] [&_svg]:w-[17px] text-[#ccdaec] [background:#ffffff0b] cursor-pointer hover:text-white hover:[background:#ffffff14]" type="button" onClick={() => window.print()}><Icon name="download" />In hoặc lưu PDF</button>;
}
