"use client";

import { useId, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const copy = {
  approve: { title: "Hoàn tất kiểm tra?", description: "Xác nhận đã xử lý tất cả các rủi ro. Kết quả sẽ được gửi lại cho người yêu cầu và không còn chỉnh sửa trong phiên này.", action: "Hoàn tất kiểm tra", note: "Ghi chú kết luận (không bắt buộc)" },
  return: { title: "Trả lại yêu cầu", description: "Giải thích thông tin cần bổ sung để người gửi có thể xử lý và gửi lại.", action: "Trả lại yêu cầu", note: "Lý do trả lại" },
  reject: { title: "Bác bỏ rủi ro", description: "Rủi ro vẫn được giữ trong lịch sử và được đánh dấu đã bác bỏ.", action: "Bác bỏ rủi ro", note: "Lý do bác bỏ" },
  remove: { title: "Xóa rủi ro đã bổ sung?", description: "Chỉ xóa được rủi ro do chuyên gia thêm. Thao tác được lưu trong lịch sử xác minh.", action: "Xóa rủi ro", note: "" },
};

export function VerificationDecisionDialog({ mode, pending, error, onClose, onSubmit }: {
  mode: keyof typeof copy;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (note: string) => Promise<boolean>;
}) {
  const id = useId();
  const [note, setNote] = useState("");
  const lock = useRef(false);
  const required = mode === "return" || mode === "reject";
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent busy={pending} className="flex flex-col overflow-hidden [color-scheme:light]">
        <DialogHeader><DialogTitle>{copy[mode].title}</DialogTitle><DialogDescription className="leading-6">{copy[mode].description}</DialogDescription></DialogHeader>
        <form className="flex min-h-0 flex-col gap-4" onSubmit={async (event) => {
          event.preventDefault();
          if (pending || lock.current || (required && !note.trim())) return;
          lock.current = true;
          try { if (await onSubmit(note.trim())) onClose(); }
          finally { lock.current = false; }
        }}>
          <div className="min-h-0 space-y-3 overflow-y-auto">
            {mode !== "remove" && <label htmlFor={id} className="grid gap-2 text-ui font-medium">{copy[mode].note}<textarea id={id} value={note} onChange={(event) => setNote(event.target.value)} required={required} maxLength={2000} rows={4} disabled={pending} className="w-full resize-y rounded-lg border border-input bg-card px-3 py-2 text-ui font-normal leading-6 text-card-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50" /></label>}
            {error && <p role="alert" className="m-0 rounded-lg bg-rose-50 p-3 text-ui text-rose-900">{error}</p>}
          </div>
          <DialogFooter className="shrink-0 border-t border-border pt-4"><Button variant="outline" disabled={pending} onClick={onClose}>Hủy</Button><Button type="submit" variant={mode === "remove" ? "destructive" : "default"} loading={pending} disabled={required && !note.trim()}>{copy[mode].action}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
