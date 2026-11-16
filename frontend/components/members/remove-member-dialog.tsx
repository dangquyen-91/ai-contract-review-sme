"use client";

import { UserRoundMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { OrganizationMember } from "@/types/invitations";

export function RemoveMemberDialog({ member, organizationName, busy, error, onConfirm, onClose }: {
  member: OrganizationMember;
  organizationName: string;
  busy: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent busy={busy} className="sm:max-w-[480px]">
      <DialogHeader className="text-left">
        <span className="mb-2 grid size-11 place-items-center rounded-xl bg-red-50 text-red-600"><UserRoundMinus size={22} aria-hidden="true" /></span>
        <DialogTitle>Xóa thành viên khỏi tổ chức?</DialogTitle>
        <DialogDescription>Thành viên sẽ mất quyền truy cập không gian làm việc của {organizationName}.</DialogDescription>
      </DialogHeader>
      <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3"><p className="break-words text-sm font-semibold">{member.name}</p><p className="mt-1 break-all text-sm text-slate-500">{member.email}</p></div>
      <p className="text-sm leading-6 text-slate-500">Tài khoản cá nhân vẫn được giữ. Hợp đồng và báo cáo vẫn thuộc tổ chức. Bạn có thể gửi lời mời lại sau.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <div className="flex flex-wrap justify-end gap-3 pt-2"><Button variant="outline" disabled={busy} onClick={onClose}>Hủy</Button><Button variant="destructive" loading={busy} onClick={onConfirm}>Xóa khỏi tổ chức</Button></div>
    </DialogContent>
  </Dialog>;
}
