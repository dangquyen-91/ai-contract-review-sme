"use client";

import { useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useDeleteContract } from "@/hooks/contracts/use-contracts";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";
import type { DashboardContract } from "@/types/contracts";

export function ContractDeleteButton({ contract, onDeleted }: { contract: DashboardContract; onDeleted?: () => void }) {
  const [open, setOpen] = useState(false);
  const lock = useRef(false);
  const mutation = useDeleteContract();
  const id = contract.id ?? contract._id;
  if (!id) return null;
  return <><Button variant="ghost" size="icon-sm" className="size-9 text-destructive hover:bg-destructive/10 hover:text-destructive" aria-label={`Xóa hợp đồng ${contract.title}`} title={`Xóa hợp đồng ${contract.title}`} onClick={() => { mutation.reset(); setOpen(true); }}><Trash2 aria-hidden="true" /></Button>
    {open && <ConfirmActionDialog title="Xóa hợp đồng?" description={`Hợp đồng “${contract.title}” và dữ liệu liên quan sẽ bị xóa. Không thể hoàn tác thao tác này.`} confirmLabel="Xóa hợp đồng" destructive pending={mutation.isPending} error={mutation.error?.message} onCancel={() => setOpen(false)} onConfirm={async () => {
      if (lock.current) return;
      lock.current = true;
      try { await mutation.mutateAsync(id); setOpen(false); toast.success("Đã xóa hợp đồng."); onDeleted?.(); }
      catch { /* Keep the confirmation and error visible. */ }
      finally { lock.current = false; }
    }} />}
  </>;
}
