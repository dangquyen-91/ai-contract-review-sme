"use client";

import type { FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Icon } from "@/components/ui/icon";

export function InvitationFormDialog({ organizationName, email, submitting, onEmailChange, onSubmit, onClose }: {
  organizationName: string; email: string; submitting: boolean;
  onEmailChange: (email: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void; onClose: () => void;
}) {
  const field = "mt-2 h-11 w-full rounded-lg border border-input bg-card px-3 text-ui outline-none focus:border-ring focus:ring-2 focus:ring-ring/25 disabled:opacity-60";
  return <Dialog open onOpenChange={(open) => { if (!open && !submitting) onClose(); }}>
    <DialogContent busy={submitting} className="sm:max-w-[480px] sm:p-8">
      <DialogHeader className="text-left">
        <span className="mb-2 grid size-11 place-items-center rounded-xl bg-accent text-primary"><Icon name="mail" className="size-5" /></span>
        <DialogTitle className="text-ui-dialog font-bold">Mời thành viên</DialogTitle>
        <DialogDescription>Người nhận sẽ nhận email để tham gia {organizationName}.</DialogDescription>
      </DialogHeader>
      <form aria-busy={submitting} className="mt-2 space-y-5" onSubmit={onSubmit}>
        <label className="block text-ui font-semibold">Email người nhận
          <input disabled={submitting} type="email" required maxLength={254} value={email} onChange={(event) => onEmailChange(event.target.value)} placeholder="dongdoi@congty.vn" className={field} />
        </label>
        <div className="text-ui"><p className="font-semibold">Vai trò</p><p className="mt-2 rounded-lg border border-input bg-muted px-3 py-3">Staff — tải và rà soát</p><p className="mt-2 text-ui-meta text-muted-foreground">Thành viên được mời sẽ tham gia với vai trò Staff.</p></div>
        <p className="rounded-lg bg-muted px-3 py-2.5 text-ui-meta leading-5 text-muted-foreground">Lời mời có hiệu lực 7 ngày. Chỉ email được mời mới có thể chấp nhận.</p>
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" disabled={submitting} onClick={onClose}>Hủy</Button>
          <Button type="submit" loading={submitting}>{submitting ? "Đang gửi…" : "Gửi lời mời"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
