"use client";

import { useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function LegalSourceToolbar({ showForm, fetching, onAdd, onRefresh }: {
  showForm: boolean; fetching: boolean; onAdd: () => void; onRefresh: () => Promise<unknown>;
}) {
  const [refreshing, setRefreshing] = useState(false);
  async function refresh() {
    setRefreshing(true);
    try { await onRefresh(); } finally { setRefreshing(false); }
  }
  return <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto">
    <Button variant="outline" loading={refreshing} disabled={fetching} onClick={() => void refresh()} className="min-w-32">
      {!refreshing && <RefreshCw aria-hidden="true" />}Làm mới
    </Button>
    <Button disabled={showForm} onClick={onAdd}><Plus aria-hidden="true" />Thêm nguồn</Button>
  </div>;
}
