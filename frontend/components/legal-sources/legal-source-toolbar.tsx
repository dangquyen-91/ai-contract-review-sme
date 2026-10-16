"use client";

import { Button } from "@/components/ui/button";

export function LegalSourceToolbar({ showForm, fetching, onAdd, onRefresh }: { showForm: boolean; fetching: boolean; onAdd: () => void; onRefresh: () => void }) {
  return (<div className="flex gap-2">
          <Button variant="outline" size="default"
            type="button"
            disabled={showForm}
            onClick={onAdd}
            
          >
            Thêm nguồn
          </Button>
          <Button variant="outline" size="default"
            type="button"
            onClick={onRefresh}
            disabled={fetching}
            
          >
            {fetching ? "Đang tải…" : "Làm mới"}
          </Button>
        </div>);
}
