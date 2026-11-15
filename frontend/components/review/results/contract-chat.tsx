"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowDown, ArrowRight, ArrowUp, BookOpen, CircleAlert, FileText, LockKeyhole, MessageSquareText, Scale, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContractChatMessageView } from "@/components/review/results/contract-chat-message";
import { useContractChat } from "@/hooks/review/use-contract-chat";

const suggestions = [
  {
    icon: ShieldCheck,
    title: "Nhận diện rủi ro",
    description: "Những điểm cần lưu ý trước khi ký",
    question: "Những rủi ro nào trong hợp đồng này cần ưu tiên xử lý trước khi ký?",
  },
  {
    icon: BookOpen,
    title: "Hiểu rõ điều khoản",
    description: "Làm rõ quyền lợi và nghĩa vụ của bạn",
    question: "Hãy giải thích các quyền lợi và nghĩa vụ chính của các bên trong hợp đồng này.",
  },
  {
    icon: Scale,
    title: "Gợi ý thương lượng",
    description: "Điều khoản nào nên được điều chỉnh?",
    question: "Tôi nên thương lượng điều chỉnh những điều khoản nào để hợp đồng cân bằng hơn?",
  },
];

export function ContractChat({ contractId, canAsk, contractTitle }: {
  contractId: string;
  canAsk: boolean;
  contractTitle?: string;
}) {
  const chat = useContractChat(contractId, canAsk);
  const id = useId();
  const input = useRef<HTMLTextAreaElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const content = useRef<HTMLDivElement>(null);
  const followAnswer = useRef(true);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const empty = !chat.isLoading && !chat.error && !chat.messages.length && !chat.pendingQuestion;
  const disabled = chat.isSending || chat.isLoading || Boolean(chat.error);

  // Follow new tokens while reading the latest answer; preserve the reader's position above it.
  useEffect(() => {
    const element = viewport.current;
    const body = content.current;
    if (!element || !body) return;
    const observer = new ResizeObserver(() => {
      if (followAnswer.current && body.querySelector('[role="log"]')?.childElementCount) {
        element.scrollTop = element.scrollHeight;
      }
    });
    observer.observe(body);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!input.current) return;
    input.current.style.height = "auto";
    input.current.style.height = `${Math.min(input.current.scrollHeight, 160)}px`;
  }, [chat.draft]);

  function scrollToLatest() {
    followAnswer.current = true;
    if (viewport.current) viewport.current.scrollTop = viewport.current.scrollHeight;
    setShowScrollDown(false);
  }

  function submit(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (disabled || !chat.draft.trim()) return;
    scrollToLatest();
    void chat.ask();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing && event.nativeEvent.keyCode !== 229) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <section aria-labelledby={`${id}-heading`} className="flex min-w-0 flex-col bg-white text-slate-800">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
        <div className="flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-[0_4px_12px_-5px_#2864dc80]">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h3 id={`${id}-heading`} className="m-0 text-ui-section font-semibold tracking-tight">Trợ lý hợp đồng</h3>
            <p className="m-0 mt-0.5 text-ui-meta text-slate-500">Cùng LawScan AI làm rõ từng điều khoản</p>
          </div>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-ui-caption text-slate-500">
          <FileText aria-hidden="true" className="size-3.5" />
          Theo nội dung hợp đồng
        </span>
      </header>

      {contractTitle && (
        <div className="flex min-w-0 items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-2.5 text-ui-meta sm:px-7">
          <FileText aria-hidden="true" className="size-3.5 shrink-0 text-slate-400" />
          <span className="shrink-0 text-slate-500">Đang trao đổi:</span>
          <span className="truncate font-medium text-slate-700" title={contractTitle}>{contractTitle}</span>
        </div>
      )}

      <div className="relative">
        <div
          ref={viewport}
          className={`${empty ? "min-h-[420px]" : "h-[clamp(360px,52dvh,580px)]"} overflow-y-auto overscroll-contain [scrollbar-gutter:stable] sm:h-[clamp(380px,52dvh,580px)]`}
          onScroll={(event) => {
            const element = event.currentTarget;
            followAnswer.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
            setShowScrollDown(!followAnswer.current);
          }}
        >
          <div ref={content} className="mx-auto flex min-h-full w-full max-w-[880px] flex-col px-5 py-7 sm:px-8 sm:py-9">
            {chat.isLoading && (
              <div role="status" className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-ui text-slate-500">
                <MessageSquareText aria-hidden="true" className="size-7 animate-pulse text-blue-300 motion-reduce:animate-none" />
                Đang tải cuộc trò chuyện…
              </div>
            )}
            {chat.error && (
              <div role="alert" className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
                <CircleAlert aria-hidden="true" className="size-7 text-amber-500" />
                <p className="m-0 text-ui text-slate-600">Chưa tải được cuộc trò chuyện. Vui lòng thử lại.</p>
                <Button variant="outline" size="sm" onClick={() => void chat.refetch()}>Thử lại</Button>
              </div>
            )}
            {empty && (
              <div className="flex flex-1 flex-col items-center justify-center py-3 text-center">
                <div className="relative mb-5 grid size-16 place-items-center rounded-[20px] border border-blue-100 bg-[linear-gradient(145deg,#f5f9ff,#eaf1ff)] text-primary">
                  <MessageSquareText aria-hidden="true" className="size-7" strokeWidth={1.5} />
                  <span className="absolute -right-1.5 -top-1.5 grid size-6 place-items-center rounded-lg border-[3px] border-white bg-primary text-white">
                    <Sparkles aria-hidden="true" className="size-3" />
                  </span>
                </div>
                <h4 className="m-0 text-[22px] font-semibold leading-snug tracking-tight text-slate-800 sm:text-[26px]">Hiểu rõ hợp đồng của bạn</h4>
                <p className="mb-0 mt-2 max-w-[410px] text-ui leading-6 text-slate-500">
                  Hỏi về điều khoản, tìm hiểu rủi ro và chuẩn bị cho bước thương lượng tiếp theo.
                </p>
                {canAsk && (
                  <div className="mt-7 grid w-full gap-2.5 text-left sm:grid-cols-3">
                    {suggestions.map(({ icon: SuggestionIcon, title, description, question }) => (
                      <button
                        key={title}
                        type="button"
                        onClick={() => { chat.setDraft(question); input.current?.focus(); }}
                        className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50/40 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/30 sm:block sm:p-4"
                      >
                        <SuggestionIcon aria-hidden="true" className="size-[18px] shrink-0 text-primary sm:mb-3" strokeWidth={1.7} />
                        <span className="min-w-0 flex-1 sm:block">
                          <span className="flex items-center justify-between gap-1 text-ui-meta font-semibold text-slate-700">
                            {title}
                            <ArrowRight aria-hidden="true" className="hidden size-3.5 text-slate-300 transition-colors group-hover:text-primary sm:block" />
                          </span>
                          <span className="mt-1 block text-ui-caption leading-5 text-slate-500">{description}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div role="log" aria-label="Cuộc trò chuyện về hợp đồng" aria-live="polite" aria-relevant="additions text" className="grid gap-7">
              {chat.messages.map((message) => (
                <ContractChatMessageView key={message._id} role={message.role} content={message.content} sources={message.legalSources} />
              ))}
              {chat.pendingQuestion && (
                <>
                  <ContractChatMessageView role="user" content={chat.pendingQuestion} />
                  <ContractChatMessageView role="assistant" content={chat.answer} pending />
                </>
              )}
            </div>
          </div>
        </div>
        {showScrollDown && (
          <Button variant="outline" size="sm" onClick={scrollToLatest} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-white shadow-sm">
            <ArrowDown aria-hidden="true" className="size-3.5" />
            Tin nhắn mới nhất
          </Button>
        )}
      </div>

      <div className="border-t border-slate-100 bg-[#fbfcfe] px-4 pb-4 pt-4 sm:px-7 sm:pb-5">
        {canAsk ? (
          <form onSubmit={submit} className="mx-auto max-w-[816px]">
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_2px_6px_-3px_#172d4e15] transition-[border-color,box-shadow] focus-within:border-blue-300 focus-within:ring-[3px] focus-within:ring-blue-50 sm:p-3.5">
              <label htmlFor={`${id}-question`} className="sr-only">Câu hỏi của bạn</label>
              <textarea
                ref={input}
                id={`${id}-question`}
                rows={2}
                value={chat.draft}
                onChange={(event) => chat.setDraft(event.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Bạn muốn làm rõ điều gì trong hợp đồng?"
                maxLength={2000}
                disabled={chat.isLoading || Boolean(chat.error)}
                readOnly={chat.isSending}
                aria-describedby={`${id}-input-help`}
                className="block max-h-40 min-h-14 w-full resize-none border-0 bg-transparent px-1 py-0.5 text-ui leading-6 text-slate-700 outline-none placeholder:text-slate-400 disabled:cursor-wait disabled:opacity-60"
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="pl-1 text-ui-caption tabular-nums text-slate-400">{chat.draft.length.toLocaleString("vi-VN")} / 2.000</span>
                <Button type="submit" size="sm" disabled={disabled || !chat.draft.trim()} className="gap-2 rounded-xl px-3.5">
                  {chat.isSending ? "Đang trả lời…" : "Gửi câu hỏi"}
                  <ArrowUp aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </div>
            <div id={`${id}-input-help`} className="mt-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[11px] leading-5 text-slate-400">
              <span>AI hỗ trợ tham khảo, không thay thế tư vấn pháp lý.</span>
              <span className="hidden sm:inline">Enter để gửi · Shift + Enter để xuống dòng</span>
            </div>
          </form>
        ) : (
          <p className="m-0 flex items-center justify-center gap-2 py-2 text-ui-meta text-slate-500">
            <LockKeyhole aria-hidden="true" className="size-4 shrink-0" />
            Vai trò hiện tại chỉ có thể xem cuộc trò chuyện.
          </p>
        )}
      </div>
    </section>
  );
}
