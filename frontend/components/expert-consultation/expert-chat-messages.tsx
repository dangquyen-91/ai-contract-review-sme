"use client";

import { useEffect, useRef } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatParticipant, ExpertChatMessage } from "@/types/expert-consultation";

export function ExpertChatMessages({ messages, participant, hasOlder, loadingOlder, onLoadOlder, latestSentId }: {
  messages: ExpertChatMessage[];
  participant: ChatParticipant;
  hasOlder: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  latestSentId?: string;
}) {
  const viewport = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const previous = useRef({ first: "", last: "", height: 0, top: 0 });
  const previousSent = useRef<string | undefined>(undefined);
  const first = messages[0]?.id ?? "";
  const last = messages[messages.length - 1]?.id ?? "";
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const old = previous.current;
    if (latestSentId && latestSentId !== previousSent.current) {
      following.current = true;
      element.scrollTop = element.scrollHeight;
    } else if (old.first && first !== old.first && last === old.last) {
      element.scrollTop = old.top + element.scrollHeight - old.height;
    } else if (following.current && last !== old.last) {
      element.scrollTop = element.scrollHeight;
    }
    previous.current = { first, last, height: element.scrollHeight, top: element.scrollTop };
    previousSent.current = latestSentId;
  }, [first, last, latestSentId]);

  return (
    <div
      ref={viewport}
      className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-muted/20 p-4 sm:p-5"
      onScroll={(event) => {
        const element = event.currentTarget;
        following.current = element.scrollHeight - element.scrollTop - element.clientHeight < 80;
        previous.current.top = element.scrollTop;
        previous.current.height = element.scrollHeight;
      }}
    >
      {hasOlder && (
        <div className="mb-4 text-center">
          <Button variant="outline" size="sm" loading={loadingOlder} onClick={onLoadOlder}>
            Tải tin nhắn cũ
          </Button>
        </div>
      )}
      {!messages.length && (
        <div className="grid min-h-48 content-center justify-items-center gap-3 px-4 text-center">
          <span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary">
            <MessageCircle aria-hidden="true" className="size-6" />
          </span>
          <p className="m-0 text-ui font-semibold">Chưa có tin nhắn</p>
          <p className="m-0 max-w-sm text-ui-meta leading-6 text-muted-foreground">
            Trao đổi về điều khoản cần làm rõ và kết quả xác minh của hợp đồng này.
          </p>
        </div>
      )}
      <ol aria-label="Tin nhắn trao đổi với chuyên gia" className="m-0 grid list-none gap-4 p-0">
        {messages.map((message) => {
          const own = message.senderType === participant;
          return (
            <li key={message.id} className={`flex min-w-0 ${own ? "justify-end" : "justify-start"}`}>
              <article className={`max-w-[90%] rounded-2xl border px-4 py-3 sm:max-w-[80%] ${own ? "rounded-br-md border-primary/15 bg-primary/10" : "rounded-bl-md border-border bg-card"}`}>
                <p className={`m-0 text-ui-caption font-semibold ${own ? "text-primary" : "text-card-foreground"}`}>
                  {own ? "Bạn" : message.senderName?.trim() || (message.senderType === "expert" ? "Chuyên gia LawScan" : "Người gửi yêu cầu")}
                </p>
                <p className="mb-0 mt-1.5 whitespace-pre-wrap break-words text-ui leading-6 text-card-foreground [overflow-wrap:anywhere]">{message.content}</p>
                <time dateTime={message.createdAt} className="mt-2 block text-[11px] text-muted-foreground">
                  {new Date(message.createdAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                </time>
              </article>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
