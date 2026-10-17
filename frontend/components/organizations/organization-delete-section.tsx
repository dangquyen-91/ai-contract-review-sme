"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { useDeleteOrganization } from "@/hooks/use-organizations";
import { clearSessionCache } from "@/lib/session-cache";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";

export function OrganizationDeleteSection({ organization }: { organization: { id: string; name: string } }) {
  const [deleting, setDeleting] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const lock = useRef(false);
  const mutation = useDeleteOrganization(organization.id);
  const client = useQueryClient();
  return <section className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-xl border border-destructive/25 bg-card p-5 sm:p-6" aria-labelledby="organization-delete-heading">
    <div className="min-w-0 max-w-2xl"><h2 id="organization-delete-heading" className="text-base font-semibold">Xóa tổ chức</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Chỉ có thể xóa khi không còn hợp đồng và thành viên khác. Các lời mời đang chờ sẽ bị thu hồi. Thao tác này không thể hoàn tác.</p></div>
    <Button variant="outline" className="shrink-0 border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive" onClick={() => { mutation.reset(); setDeleting(true); }}><Trash2 aria-hidden="true" />Xóa tổ chức</Button>
    {deleting && <ConfirmActionDialog title="Xóa tổ chức?" description={`Tổ chức “${organization.name}” chỉ có thể xóa khi không còn hợp đồng và thành viên khác. Các lời mời đang chờ sẽ bị thu hồi. Không thể hoàn tác. Sau khi xóa, bạn sẽ đăng xuất và cần đăng nhập lại.`} confirmLabel="Xóa tổ chức" destructive pending={mutation.isPending || navigating} error={mutation.error?.message} onCancel={() => setDeleting(false)} onConfirm={async () => {
      if (lock.current) return;
      lock.current = true;
      try { await mutation.mutateAsync(); setNavigating(true); await clearSessionCache(client); for (const key of Object.keys(sessionStorage)) { if (key.startsWith("lawscan_review_")) sessionStorage.removeItem(key); } window.location.replace("/dang-nhap"); }
      catch { lock.current = false; }
    }} />}
  </section>;
}
