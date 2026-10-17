"use client";

import { useRef } from "react";
import { toast } from "sonner";
import { useUpdateOrganization } from "@/hooks/use-organizations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export function OrganizationEditDialog({ organization, onClose }: { organization: { id: string; name: string; taxCode: string | null; address: string | null }; onClose: () => void }) {
  const mutation = useUpdateOrganization(organization.id);
  const lock = useRef(false);
  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }}><DialogContent busy={mutation.isPending}>
    <DialogHeader><DialogTitle>Chỉnh sửa tổ chức</DialogTitle><DialogDescription>Cập nhật thông tin dùng chung của tổ chức.</DialogDescription></DialogHeader>
    <form className="grid gap-4" onSubmit={async (event) => {
      event.preventDefault();
      if (lock.current) return;
      const form = new FormData(event.currentTarget);
      const name = String(form.get("name") ?? "").trim();
      if (name.length < 2) { toast.error("Tên tổ chức cần ít nhất 2 ký tự."); return; }
      lock.current = true;
      try {
        await mutation.mutateAsync({ name, taxCode: String(form.get("taxCode") ?? "").trim() || null, address: String(form.get("address") ?? "").trim() || null });
        toast.success("Đã cập nhật tổ chức."); onClose();
      } catch { /* Mutation error is displayed in the dialog. */ }
      finally { lock.current = false; }
    }}>
      <label className="grid gap-2 text-sm">Tên tổ chức<Input name="name" required minLength={2} maxLength={200} defaultValue={organization.name} disabled={mutation.isPending} /></label>
      <label className="grid gap-2 text-sm">Mã số thuế<Input name="taxCode" maxLength={50} defaultValue={organization.taxCode ?? ""} disabled={mutation.isPending} /></label>
      <label className="grid gap-2 text-sm">Địa chỉ<Input name="address" maxLength={500} defaultValue={organization.address ?? ""} disabled={mutation.isPending} /></label>
      {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
      <DialogFooter className="gap-2"><Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>Đóng</Button><Button type="submit" loading={mutation.isPending}>Lưu thay đổi</Button></DialogFooter>
    </form>
  </DialogContent></Dialog>;
}
