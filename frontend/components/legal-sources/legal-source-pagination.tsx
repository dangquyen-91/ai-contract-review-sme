"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LegalSourcePagination({ total, currentPage, totalPages, onPage }: {
  total: number; currentPage: number; totalPages: number; onPage: (page: number) => void;
}) {
  return <nav aria-label="Phân trang kho pháp lý" className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-4 text-ui-meta text-muted-foreground">
    <span>{total} nguồn · Trang {currentPage}/{totalPages}</span>
    <div className="flex gap-2">
      <Button variant="outline" size="sm" className="h-11 min-w-24 sm:h-9" disabled={currentPage === 1} onClick={() => onPage(currentPage - 1)}><ChevronLeft aria-hidden="true" />Trước</Button>
      <Button variant="outline" size="sm" className="h-11 min-w-24 sm:h-9" disabled={currentPage === totalPages} onClick={() => onPage(currentPage + 1)}>Sau<ChevronRight aria-hidden="true" /></Button>
    </div>
  </nav>;
}
