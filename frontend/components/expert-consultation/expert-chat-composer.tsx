"use client";

import { useId, type KeyboardEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export function ExpertChatComposer({ draft, onChange, onSend, sending, error, validationError }: {
  draft: string;
  onChange: (value: string) => void;
  onSend: () => void;
  sending: boolean;
  error?: string;
  validationError?: string;
}) {
  const id = useId();
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
      event.preventDefault();
      if (!sending) onSend();
    }
  }
  return (
    <form className="shrink-0 space-y-2 border-t border-border bg-card p-4" onSubmit={(event) => { event.preventDefault(); onSend(); }}>
      <label htmlFor={id} className="text-ui-meta font-semibold">Tin nhắn của bạn</label>
      <textarea
        id={id}
        value={draft}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={keyDown}
        maxLength={2000}
        rows={3}
        readOnly={sending}
        aria-invalid={Boolean(validationError)}
        aria-describedby={`${id}-help`}
        placeholder="Nhập nội dung muốn trao đổi về hợp đồng…"
        className="block max-h-40 min-h-20 w-full resize-y rounded-xl border border-input bg-white px-3 py-2.5 text-ui leading-6 text-slate-800 outline-none placeholder:text-slate-400 [color-scheme:light] focus-visible:ring-2 focus-visible:ring-ring/50"
      />
      {(error || validationError) && <p role="alert" className="m-0 text-ui-meta leading-5 text-rose-800">{validationError || error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={`${id}-help`} className="m-0 text-ui-caption text-muted-foreground">
          {draft.length.toLocaleString("vi-VN")} / 2.000 · Enter để gửi, Shift + Enter để xuống dòng
        </p>
        <Button type="submit" size="sm" loading={sending} disabled={!draft.trim() || Boolean(validationError)}>
          <Send aria-hidden="true" className="size-4" />
          {error ? "Thử gửi lại" : "Gửi tin nhắn"}
        </Button>
      </div>
    </form>
  );
}
