"use client";

import { toast } from "sonner";
import { FilePlus2 } from "lucide-react";
import { LegalSourceUploadActions } from "./legal-source-upload-actions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAppendLegalSourcePartMutation } from "@/hooks/legal-sources/use-legal-sources";
import { useLegalSourceUpload } from "@/hooks/legal-sources/use-legal-source-upload";
import { LegalSourceFileFields } from "./legal-source-file-fields";
import { LegalSourcePreview } from "./legal-source-preview";

export function LegalSourceAppendDialog({ id, title, onClose }: { id: string; title: string; onClose: () => void }) {
  const mutation = useAppendLegalSourcePartMutation(id);
  const upload = useLegalSourceUpload(false, mutation.mutateAsync, () => { toast.success("Đã tiếp nhận tài liệu bổ sung. Theo dõi tiến trình trong chi tiết nguồn."); onClose(); });
  return <Dialog open onOpenChange={(open) => { if (!open && !upload.pending) onClose(); }}>
    <DialogContent busy={upload.pending} className="flex flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
      <DialogHeader className="shrink-0 p-5 pr-12 text-left sm:p-6 sm:pr-12"><span className="mb-2 grid size-11 place-items-center rounded-xl bg-accent text-primary"><FilePlus2 className="size-5" aria-hidden="true" /></span><DialogTitle>Bổ sung tài liệu</DialogTitle><DialogDescription className="break-words">{title} · Phần xem trước chỉ đánh giá tệp bổ sung; độ đầy đủ của toàn bộ nguồn được cập nhật sau khi lưu.</DialogDescription></DialogHeader>
      <form onSubmit={upload.submit} onChange={upload.reset} className="flex min-h-0 flex-col">
        <div className="min-h-0 space-y-4 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6">
        <fieldset disabled={upload.pending} className="grid gap-4"><LegalSourceFileFields /></fieldset>
        {upload.preview && <LegalSourcePreview data={upload.preview} />}
        {upload.error && <p role="alert" className="text-ui text-destructive">{upload.error}</p>}
        </div>
        <div className="shrink-0 px-5 pb-5 sm:px-6"><LegalSourceUploadActions pending={upload.pending} previewed={Boolean(upload.preview)} saveLabel="Bổ sung vào nguồn" onCancel={onClose} /></div>
      </form>
    </DialogContent>
  </Dialog>;
}
