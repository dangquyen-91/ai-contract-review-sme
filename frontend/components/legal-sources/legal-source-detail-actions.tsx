"use client";

import { useState } from "react";
import { FilePlus2, Pencil, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LegalSourceDetailActions({ busy, fetching, onAppend, onEdit, onRefresh }: {
  busy: boolean; fetching: boolean; onAppend: () => void; onEdit: () => void; onRefresh: () => Promise<unknown>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }
  return <div className="flex flex-col gap-3 sm:flex-row">
    <Button onClick={onAppend} disabled={busy}><FilePlus2 aria-hidden="true" />Bổ sung tài liệu</Button>
    <Button variant="outline" onClick={onEdit} disabled={busy}><Pencil aria-hidden="true" />Sửa thông tin</Button>
    <Button variant="outline" className="min-w-32" loading={refreshing} disabled={fetching || busy} onClick={() => void refresh()}>
      {!refreshing && <RefreshCw aria-hidden="true" />}Làm mới
    </Button>
  </div>;
}

export function LegalSourceDeleteSection({ disabled, processing, onDelete }: {
  disabled: boolean; processing: boolean; onDelete: () => void;
}) {
  return <section className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
    <div><h2 className="text-ui-section font-semibold">Xóa nguồn pháp lý</h2>
      <p className="mt-1 text-ui text-muted-foreground">Xóa nguồn và các đoạn tham chiếu liên quan. Thao tác này không thể hoàn tác.</p>
      {processing && <p className="mt-2 text-ui-meta text-muted-foreground">Chờ quá trình xử lý kết thúc trước khi xóa nguồn.</p>}
    </div>
    <Button variant="outline" className="shrink-0 border-destructive/30 text-destructive hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive" disabled={disabled || processing} onClick={onDelete}>
      <Trash2 aria-hidden="true" />Xóa nguồn
    </Button>
  </section>;
}
