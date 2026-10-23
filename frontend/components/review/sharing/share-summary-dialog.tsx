"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Copy, Check, FileText, ShieldCheck, Share2, Mail, Pencil, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useContractShareSummary } from "@/hooks/use-contract-share-summary";
import { ShareSummaryPreview } from "@/components/review/sharing/share-summary-preview";

export function ShareSummaryDialog({ contractId, version, onClose }: {
  contractId: string; version?: string; onClose: () => void;
}) {
  const query = useContractShareSummary(contractId, version);
  const [draft, setDraft] = useState<string | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [copyError, setCopyError] = useState("");
  const [editing, setEditing] = useState(false);
  const [sharing, setSharing] = useState(false);
  const shareId = useId();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const text = draft ?? query.data?.text ?? "";
  const ready = !query.isPending && !query.isError && query.data?.redacted === true;

  useLayoutEffect(() => {
    const input = textarea.current;
    if (!editing || !input) return;
    input.style.height = "auto";
    input.style.height = `${input.scrollHeight}px`;
  }, [editing, text]);

  useEffect(() => {
    if (editing && copyError) { textarea.current?.focus(); textarea.current?.select(); }
  }, [editing, copyError]);

  async function copy() {
    if (!ready || !text.trim()) return;
    const snapshot = text;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(snapshot);
      setCopiedText(snapshot); setCopyError("");
    } catch {
      setCopiedText(null);
      setEditing(true);
      setCopyError("Chưa sao chép tự động được. Nội dung đã được chọn; nhấn Ctrl+C hoặc ⌘C để sao chép.");
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
    <DialogContent className="flex h-[min(860px,calc(100dvh-2rem))] flex-col gap-0 overflow-hidden p-0 font-sans sm:max-w-[800px]">
      <DialogHeader className="shrink-0 border-b border-border p-4 pr-10 text-left sm:p-6 sm:pr-12">
        <span className="mb-1 grid size-10 place-items-center rounded-xl bg-accent text-primary"><FileText className="size-5" /></span>
        <DialogTitle className="text-ui-dialog">Tóm tắt để chia sẻ</DialogTitle>
        <DialogDescription>Bản nội bộ từ kết quả đã lưu. Chỉnh nội dung rồi sao chép vào email hoặc tin nhắn; không sử dụng thêm lượt AI.</DialogDescription>
      </DialogHeader>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 sm:p-6">
      {query.isPending ? <p role="status" className="py-10 text-center text-ui text-muted-foreground">Đang chuẩn bị bản tóm tắt…</p>
        : query.isError ? <div role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-ui leading-6 text-amber-950">
          <p>Chưa lấy được bản tóm tắt đã che. Nếu kết quả đã thay đổi hoặc chưa hoàn tất, hãy tải lại trang để xem kết quả mới nhất.</p>
          <Button variant="outline" size="sm" disabled={query.isFetching} onClick={() => { void query.refetch(); }} className="mt-3">{query.isFetching ? "Đang tải lại…" : "Tải lại tóm tắt"}</Button>
        </div> : ready && <>
          <div className="flex items-start gap-2 rounded-lg border border-border bg-muted p-3 text-ui-meta leading-5 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" /><p>Thông tin được nhận diện đã được thay thế. Kiểm tra nội dung trước khi gửi; phần bạn chỉnh sửa có thể chứa lại thông tin cá nhân.</p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-ui font-semibold">{editing ? "Chỉnh nội dung tóm tắt" : "Nội dung tóm tắt"}</h2>
            <Button variant="ghost" size="sm" aria-pressed={editing} onClick={() => { setEditing(!editing); setCopyError(""); }}>{editing ? <Eye /> : <Pencil />}{editing ? "Xem trước" : "Chỉnh nội dung"}</Button>
          </div>
          {editing ? <>
          <label htmlFor="share-summary-text" className="sr-only">Nội dung tóm tắt có thể chỉnh sửa</label>
          <textarea ref={textarea} id="share-summary-text" value={text} onChange={(event) => { setDraft(event.target.value); setCopyError(""); }}
            spellCheck={false} maxLength={10000} rows={15}
            aria-describedby="share-summary-draft-note"
            className="min-h-64 w-full resize-none overflow-hidden rounded-xl border border-input bg-card p-4 text-ui leading-6 text-card-foreground focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2" />
          </> : <ShareSummaryPreview text={text} counts={query.data?.findingCounts} />}
          <div id="share-summary-draft-note" className="flex flex-wrap items-center justify-between gap-2 text-ui-meta text-muted-foreground">
            <span>Bản chỉnh sửa chỉ giữ trong hộp này, không đổi báo cáo đầy đủ.</span>
            {draft !== null && <Button variant="ghost" size="sm" onClick={() => { setDraft(null); setCopyError(""); setCopiedText(null); }}>Khôi phục bản tóm tắt</Button>}
          </div>
        </>}
      {sharing && ready && <section id={shareId} aria-label="Chia sẻ tóm tắt" className="rounded-xl border border-border bg-muted p-4 text-ui leading-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-semibold">Chia sẻ tóm tắt</h3><span className="rounded-md bg-card px-2 py-0.5 text-ui-caption text-muted-foreground">Giao diện thử</span></div>
        <p className="mb-3 mt-1 text-muted-foreground">Chia sẻ qua email đang được chuẩn bị. Hiện bạn có thể sao chép nội dung để gửi thủ công.</p>
        <Button variant="outline" size="sm" disabled><Mail />Chia sẻ qua email · Sắp có</Button>
        <p className="mb-0 mt-2 text-ui-meta text-muted-foreground">Chưa gửi email hoặc tạo liên kết chia sẻ.</p>
      </section>}
      </div>
      <footer className="shrink-0 space-y-2 border-t border-border bg-card p-4 sm:px-6">
        <p role="status" aria-live="polite" className="m-0 text-ui-meta leading-5 text-muted-foreground">{copyError || (copiedText === text && copiedText !== null ? "Đã sao chép. Bạn có thể dán vào email hoặc tin nhắn." : "")}</p>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onClose}>Đóng</Button>
        <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!ready || !text.trim()} onClick={() => { void copy(); }}>{copiedText === text && copiedText !== null ? <Check /> : <Copy />}{copiedText === text && copiedText !== null ? "Đã sao chép" : "Sao chép tóm tắt"}</Button>
        <Button variant="outline" size="sm" disabled={!ready || !text.trim()} aria-expanded={sharing} aria-controls={shareId} onClick={() => setSharing(!sharing)}><Share2 />Chia sẻ</Button>
        </div>
      </div>
      </footer>
    </DialogContent>
  </Dialog>;
}
