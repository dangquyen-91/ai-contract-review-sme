"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Mic, MicOff, Sparkles, X, LoaderCircle } from "lucide-react";
import { useReviewAllowance } from "@/hooks/review/use-review-allowance";
import { useStudioVoice } from "@/hooks/contract-drafts/use-studio-voice";
import type { TemplateStudioState } from "@/hooks/contract-drafts/use-template-studio";
import type { StudioSelection, StudioReference } from "@/types/template-studio";
import { StudioChatTools, StudioReferenceList } from "./studio-chat-tools";
import { StudioProposalCard } from "./studio-proposal-card";
import { StudioClauseCheckButton } from "./studio-clause-check-button";
import { StudioChatWelcome } from "./studio-chat-welcome";
import styles from "@/styles/template-studio.module.css";

export function StudioChat({
  studio,
  accountId,
  selection,
  onClearSelection,
}: {
  studio: TemplateStudioState;
  accountId?: string;
  selection: StudioSelection;
  onClearSelection: () => void;
}) {
  const [message, setMessage] = useState("");
  const [references, setReferences] = useState<StudioReference[]>([]);
  const [uploading, setUploading] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const quota = useReviewAllowance(accountId);
  const voice = useStudioVoice((text) =>
    setMessage((current) =>
      `${current}${current ? " " : ""}${text}`.slice(0, 5000),
    ),
  );
  const available = quota.data?.drafting?.available ?? 0;
  const canAsk =
    quota.data?.status === "active" && (available > 0 || studio.canRetry);
  const readOnly = studio.draft.status !== "draft";
  const rows = studio.history.data ?? [];
  const latestProposalId = rows.at(-1)?.id;
  const latestProposalMode = rows.at(-1)?.mode;
  useEffect(() => {
    const panel = scroll.current;
    if (!panel) return;
    const result =
      latestProposalMode === "check" && !studio.busy
        ? panel.querySelector(`[data-proposal-id="${latestProposalId}"]`)
        : null;
    if (result)
      panel.scrollTop +=
        result.getBoundingClientRect().top - panel.getBoundingClientRect().top;
    else panel.scrollTop = panel.scrollHeight;
  }, [latestProposalId, latestProposalMode, studio.busy]);
  async function send() {
    if (
      !message.trim() ||
      studio.busy ||
      voice.listening ||
      uploading ||
      readOnly ||
      !canAsk
    )
      return;
    if (await studio.ask(message.trim(), selection.blockIds, references)) {
      setMessage("");
      setReferences([]);
    }
  }
  return (
    <section
      className="flex h-full min-h-0 flex-col bg-white"
      aria-label="Trợ lý chỉnh hợp đồng"
    >
      <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-slate-100 px-4">
        <span className="grid size-7 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <Sparkles size={15} />
        </span>
        <h2 className="text-sm font-semibold tracking-tight text-slate-800">
          Trợ lý soạn thảo
        </h2>
        <span className="ml-auto rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-medium text-emerald-700">
          AI
        </span>
      </header>
      <div
        ref={scroll}
        className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5"
        data-studio-messages
      >
        {!rows.length && !studio.history.isPending && (
          <StudioChatWelcome
            templateCode={studio.draft.templateCode}
            disabled={readOnly || !!studio.busy}
            onSuggestion={setMessage}
          />
        )}
        {rows.map((proposal) => (
          <StudioProposalCard
            key={proposal.id}
            proposal={proposal}
            studio={studio}
          />
        ))}
        {studio.history.isError && (
          <button
            type="button"
            className="text-xs text-red-600"
            onClick={() => void studio.history.refetch()}
          >
            Chưa tải được lịch sử. Bấm để thử lại.
          </button>
        )}
        {studio.busy === "assistant" && (
          <div
            role="status"
            className="flex items-center gap-2 text-xs text-blue-600"
          >
            <LoaderCircle size={15} className="animate-spin" />
            Đang chuẩn bị đề xuất cho bạn…
          </div>
        )}
      </div>
      <div className={styles.chatComposer} data-studio-composer>
        {selection.blockIds.length > 0 && (
          <div className="mb-2 flex items-start gap-2 rounded-lg bg-blue-50 p-2 text-[11px] leading-5 text-blue-700">
            <span className="line-clamp-2 flex-1">
              Đang chỉnh vùng chọn:{" "}
              {selection.text || `${selection.blockIds.length} đoạn văn`}
            </span>
            <button
              type="button"
              aria-label="Bỏ vùng chọn"
              onClick={onClearSelection}
            >
              <X size={13} />
            </button>
          </div>
        )}
        {voice.listening && (
          <p role="status" className="mb-2 text-xs leading-5 text-blue-600">
            Đang nghe… {voice.interim}
          </p>
        )}
        {voice.error && (
          <p role="alert" className="mb-2 text-xs leading-5 text-amber-700">
            {voice.error}
          </p>
        )}
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_3px_16px_-10px_#33415535] focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-50"
        >
          <StudioClauseCheckButton
            studio={studio}
            selection={selection}
            canAsk={canAsk}
            loadingAllowance={quota.isPending && Boolean(accountId)}
            allowanceError={quota.isError}
            blocked={readOnly || !!studio.busy || uploading || voice.listening}
          />
          <StudioReferenceList
            references={references}
            disabled={uploading || Boolean(studio.busy)}
            onChange={setReferences}
          />
          <textarea
            aria-label="Yêu cầu chỉnh hợp đồng"
            placeholder={
              readOnly
                ? "Văn bản đang được khóa chỉnh sửa"
                : "Bạn muốn sửa điều gì?"
            }
            rows={2}
            maxLength={5000}
            disabled={readOnly || Boolean(studio.busy)}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="mt-2.5 min-h-14 max-h-36 w-full resize-none border-0 bg-transparent text-[13px] leading-6 text-slate-700 outline-none placeholder:text-slate-400 disabled:opacity-50"
          />
          <div className="relative mt-1 flex items-center gap-1">
            <StudioChatTools
              draftId={studio.draft.id}
              templateCode={studio.draft.templateCode}
              legalSourceIds={studio.values.legalSourceIds}
              onLegalSourcesChange={studio.changeLegalSources}
              disabled={readOnly || Boolean(studio.busy)}
              references={references}
              onChange={setReferences}
              onUploading={setUploading}
            />
            <span className="ml-auto text-[9px] text-slate-400">
              {message.length}/5.000
            </span>
            <button
              type="button"
              aria-label={
                voice.listening ? "Dừng ghi âm" : "Nhập bằng giọng nói"
              }
              title={
                voice.supported
                  ? "Nhập bằng giọng nói tiếng Việt"
                  : "Trình duyệt chưa hỗ trợ giọng nói"
              }
              disabled={!voice.supported || readOnly || Boolean(studio.busy)}
              onClick={voice.toggle}
              className={`grid size-8 place-items-center rounded-full disabled:opacity-30 ${voice.listening ? "animate-pulse bg-red-50 text-red-500" : "text-slate-500 hover:bg-slate-100"}`}
            >
              {voice.listening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
            <button
              type="submit"
              aria-label="Gửi yêu cầu cho trợ lý"
              disabled={
                readOnly ||
                Boolean(studio.busy) ||
                voice.listening ||
                uploading ||
                message.trim().length < 2 ||
                !canAsk
              }
              className="grid size-8 place-items-center rounded-full bg-slate-900 text-white transition hover:bg-blue-600 disabled:opacity-25"
            >
              <ArrowUp size={17} />
            </button>
          </div>
        </form>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[10px] leading-4 text-slate-500">
          <span>
            {quota.isError
              ? "Chưa tải được hạn mức"
              : quota.isPending && accountId
                ? "Đang tải lượt…"
                : `${available} lượt soạn còn lại`}
          </span>
          <span title="Trừ 1 lượt khi AI trả kết quả thành công. Sửa thủ công không trừ lượt.">
            1 lượt/kết quả AI · Sửa tay miễn phí
          </span>
        </div>
        {quota.isError && (
          <button
            type="button"
            disabled={quota.isFetching}
            onClick={() => void quota.refetch()}
            className="mt-1 text-[11px] font-medium text-blue-600 hover:underline disabled:opacity-50"
          >
            {quota.isFetching ? "Đang tải lại hạn mức…" : "Thử tải lại hạn mức"}
          </button>
        )}
        {!canAsk && !quota.isPending && !quota.isError && !readOnly && (
          <p className="mt-1 text-[10px] leading-4 text-amber-700">
            Cần gói đang hoạt động và đủ lượt soạn. Bạn vẫn chỉnh trực tiếp trên
            văn bản được.
          </p>
        )}
        {voice.supported && (
          <p
            className="mt-1 line-clamp-1 text-[10px] leading-4 text-slate-400"
            title="Dịch vụ trình duyệt xử lý giọng nói. Kiểm tra chữ trước khi bấm gửi."
          >
            Dịch vụ trình duyệt xử lý giọng nói. Kiểm tra chữ trước khi bấm gửi.
          </p>
        )}
      </div>
    </section>
  );
}
