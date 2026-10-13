"use client";

import { Button } from "@/components/ui/button";

export function LegalSourcePagination({ total, currentPage, totalPages, onPage }: { total: number; currentPage: number; totalPages: number; onPage: (page: number) => void }) {
  return (<div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-4 text-xs text-slate-500">
              <span>
                {total} nguồn · Trang {currentPage}/{totalPages}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="default"
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => onPage(currentPage - 1)}
                  
                >
                  Trước
                </Button>
                <Button variant="outline" size="default"
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => onPage(currentPage + 1)}
                  
                >
                  Sau
                </Button>
              </div>
            </div>);
}
