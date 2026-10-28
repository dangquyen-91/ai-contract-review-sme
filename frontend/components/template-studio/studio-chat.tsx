"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Check,
  Mic,
  MicOff,
  Sparkles,
  X,
  MessageSquare,
  LoaderCircle,
} from "lucide-react";
import { useReviewAllowance } from "@/hooks/review/use-review-allowance";
import { useStudioVoice } from "@/hooks/contract-drafts/use-studio-voice";
import type { TemplateStudioState } from "@/hooks/contract-drafts/use-template-studio";
import type {
  StudioProposal,
  StudioSelection,
  StudioReference,
} from "@/types/template-studio";
import { studioFieldText } from "@/lib/studio-document";
import { StudioChatTools, StudioReferenceList } from "./studio-chat-tools";

function ProposalCard({
  proposal,
  studio,
}: {
  proposal: StudioProposal;
  studio: TemplateStudioState;
}) {
  const changed =
    proposal.changes.fields.length + proposal.changes.blocks.length;
  const stale = proposal.baseRevision !== studio.draft.revision || studio.dirty;
  const canAct = studio.draft.status === "draft" && !studio.busy;
  return (
    <div className="space-y-3">
      <div className="ml-8 rounded-2xl rounded-tr-sm bg-[#f0f3f9] px-4 py-3 text-[13px] leading-6 text-slate-700 whitespace-pre-wrap">
        {proposal.userMessage}
        {!!proposal.referenceNames?.length && (
          <span className="mt-2 block text-[10px] text-slate-400">
            Tệp tham khảo: {proposal.referenceNames.join(", ")}
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
        <span className="grid size-6 place-items-center rounded-lg bg-blue-50 text-blue-600">
          <Sparkles size={13} />
        </span>
        Trợ lý LawScan
        <span className="ml-auto text-[10px] font-normal text-slate-400">
          1 lượt soạn
        </span>
      </div>
      <p className="text-[13px] leading-6 whitespace-pre-wrap text-slate-600">
        {proposal.message}
      </p>
      {changed > 0 && (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <p className="border-b border-slate-100 px-3 py-2 text-[11px] font-semibold text-slate-500">
            {changed} thay đổi được đề xuất
          </p>
          <div className="max-h-80 space-y-3 overflow-y-auto p-3">
            {proposal.changes.fields.map((field) => (
              <div key={field.key} className="space-y-1 text-xs leading-5">
                <p className="font-semibold text-slate-700">
                  {studio.draft.template.fields.find(
                    (item) => item.key === field.key,
                  )?.label ?? field.key}
                </p>
                <p className="rounded-md bg-red-50 px-2 py-1 text-red-500 line-through break-words">
                  {field.before
                    ? studioFieldText(
                        field.key,
                        field.before,
                        studio.draft.template,
                      ).slice(0, 500)
                    : "Chưa điền"}
                </p>
                <p className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800 break-words">
                  {studioFieldText(
                    field.key,
                    field.after,
                    studio.draft.template,
                  ).slice(0, 500)}
                </p>
              </div>
            ))}
            {proposal.changes.blocks.map((block, index) => (
              <div
                key={`${block.blockId}-${index}`}
                className="space-y-1 text-xs leading-5"
              >
                <p className="font-semibold text-slate-700">
                  {block.action === "replace"
                    ? "Chỉnh đoạn văn"
                    : "Thêm đoạn văn"}
                </p>
                {block.action === "replace" && (
                  <p className="rounded-md bg-red-50 px-2 py-1 text-red-500 line-through whitespace-pre-wrap">
                    {block.before.slice(0, 800)}
                  </p>
                )}
                <p className="rounded-md bg-emerald-50 px-2 py-1 text-emerald-800 whitespace-pre-wrap">
                  {block.after.slice(0, 1500)}
                </p>
              </div>
            ))}
          </div>
          {proposal.status === "pending" && (
            <div className="flex gap-2 border-t border-slate-100 p-3">
              <button
                type="button"
                disabled={!canAct || stale}
                onClick={() => void studio.proposalAction(proposal, "apply")}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white disabled:opacity-40"
              >
                <Check size={13} />
                Áp dụng
              </button>
              <button
                type="button"
                disabled={!canAct}
                onClick={() => void studio.proposalAction(proposal, "dismiss")}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-500 disabled:opacity-40"
              >
                Bỏ qua
              </button>
            </div>
          )}
          {proposal.status === "pending" && stale && (
            <p className="px-3 pb-3 text-[11px] leading-5 text-amber-700">
              Văn bản đã thay đổi. Hãy yêu cầu đề xuất mới để tránh ghi đè nội
              dung.
            </p>
          )}
          {proposal.status !== "pending" && (
            <p className="border-t border-slate-100 px-3 py-2 text-[11px] text-slate-500">
              {proposal.status === "applied"
                ? "Đã áp dụng vào văn bản"
                : "Đã bỏ qua đề xuất"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export function StudioChat({
  studio,
  orgId,
  selection,
  onClearSelection,
}: {
  studio: TemplateStudioState;
  orgId?: string;
  selection: StudioSelection;
  onClearSelection: () => void;
}) {
  const [message, setMessage] = useState("");
  const [references, setReferences] = useState<StudioReference[]>([]);
  const [uploading, setUploading] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const quota = useReviewAllowance(orgId);
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
  useEffect(() => {
    if (scroll.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [rows.length, studio.busy]);
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
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-slate-100 px-5">
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
        className="min-h-0 flex-1 space-y-7 overflow-y-auto px-5 py-6"
      >
        {!rows.length && !studio.history.isPending && (
          <div className="flex min-h-80 flex-col justify-center">
            <div className="mb-5 flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-100 text-blue-600">
              <MessageSquare size={22} />
            </div>
            <p className="text-lg font-semibold tracking-tight text-slate-800">
              Cùng bạn hoàn thiện
              <br />
              từng điều khoản.
            </p>
            <p className="mt-3 text-[13px] leading-6 text-slate-500">
              Chỉnh ngay trên mẫu, hoặc nói cho tôi biết bạn muốn thay đổi điều
              gì.
            </p>
            <div className="mt-6 grid gap-2">
              {[
                studio.draft.templateCode === "labor"
                  ? "Điền mức lương 15.000.000 đồng mỗi tháng"
                  : "Điền giá trị hợp đồng 15.000.000 đồng",
                "Làm rõ cách bàn giao và nghiệm thu",
                "Thêm trách nhiệm bảo mật phù hợp",
              ].map((text) => (
                <button
                  key={text}
                  type="button"
                  disabled={readOnly || Boolean(studio.busy)}
                  onClick={() => setMessage(text)}
                  className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-3 text-left text-xs leading-5 text-slate-600 transition-colors hover:border-blue-200 hover:bg-blue-50/50 disabled:opacity-40"
                >
                  {text}
                  <span className="ml-2 text-blue-400">↗</span>
                </button>
              ))}
            </div>
          </div>
        )}
        {rows.map((proposal) => (
          <ProposalCard key={proposal.id} proposal={proposal} studio={studio} />
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
      <div className="shrink-0 border-t border-slate-100 p-4">
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
          className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_4px_20px_-12px_#33415550] focus-within:border-blue-300 focus-within:ring-2 focus-within:ring-blue-50"
        >
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
            rows={3}
            maxLength={5000}
            disabled={readOnly || Boolean(studio.busy)}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            className="w-full resize-none border-0 bg-transparent text-[13px] leading-6 text-slate-700 outline-none placeholder:text-slate-400 disabled:opacity-50"
          />
          <div className="relative mt-1 flex items-center gap-1">
            <StudioChatTools
              draftId={studio.draft.id}
              legalBasis={studio.draft.template.legalBasis}
              reviewNotes={studio.draft.template.reviewNotes}
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
        <p className="mt-2 text-[10px] leading-4 text-slate-400">
          {quota.isPending ? "Đang tải lượt…" : `${available} lượt còn lại.`} 1
          lượt khi AI trả đề xuất thành công. Kiểm tra rồi áp dụng; sửa thủ công
          không trừ lượt.
        </p>
        {!canAsk && !quota.isPending && !readOnly && (
          <p className="mt-1 text-[10px] leading-4 text-amber-700">
            Cần gói đang hoạt động và đủ lượt soạn. Bạn vẫn chỉnh trực tiếp trên
            văn bản được.
          </p>
        )}
        {voice.supported && (
          <p className="mt-1 text-[10px] leading-4 text-slate-400">
            Dịch vụ trình duyệt xử lý giọng nói. Kiểm tra chữ trước khi bấm gửi.
          </p>
        )}
      </div>
    </section>
  );
}
