"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function DraftApprovalDialog({ title, busy, onClose, onConfirm }: { title: string; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const [checked, setChecked] = useState(false);
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}><DialogContent busy={busy}><DialogHeader><DialogTitle>Duyệt bản nháp hợp đồng?</DialogTitle><DialogDescription>{title}. Bản đã duyệt sẽ được khóa chỉnh sửa để giữ nguyên nội dung khi xuất và chuyển rà soát.</DialogDescription></DialogHeader><label className="flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-600"><input type="checkbox" className="mt-1" checked={checked} disabled={busy} onChange={event => setChecked(event.target.checked)} />Tôi đã kiểm tra thông tin các bên, số tiền, thời hạn và nội dung điều khoản của bản nháp này.</label><div className="flex justify-end gap-3"><Button variant="outline" disabled={busy} onClick={onClose}>Quay lại</Button><Button disabled={!checked || busy} loading={busy} onClick={onConfirm}>Xác nhận duyệt</Button></div></DialogContent></Dialog>;
}
