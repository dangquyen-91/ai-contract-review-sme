import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ContractTrackingController } from "@/hooks/contracts/use-contract-tracking-list";

export function ContractTrackingPagination({ controller }: { controller: ContractTrackingController }) {
  const { state, pages, total, query, setPage } = controller;
  if (!total) return null;
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4">
      <p className="m-0 text-ui-meta text-muted-foreground">Trang {state.page}/{pages} · {total} hợp đồng</p>
      <nav aria-label="Phân trang hợp đồng" className="flex gap-2">
        <Button variant="outline" size="sm" disabled={state.page <= 1 || query.isFetching} onClick={() => { void setPage(state.page - 1); }}><ChevronLeft aria-hidden="true" />Trước</Button>
        <Button variant="outline" size="sm" disabled={state.page >= pages || query.isFetching} onClick={() => { void setPage(state.page + 1); }}>Sau<ChevronRight aria-hidden="true" /></Button>
      </nav>
    </footer>
  );
}
