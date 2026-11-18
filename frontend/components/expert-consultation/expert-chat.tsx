"use client";

import { LockKeyhole, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useExpertChat } from "@/hooks/expert-consultation/use-expert-chat";
import { expertChatError } from "@/lib/expert-consultation/chat";
import { ExpertChatComposer } from "./expert-chat-composer";
import { ExpertChatMessages } from "./expert-chat-messages";
import type { ChatParticipant } from "@/types/expert-consultation";

export function ExpertChat({ reviewId, attempt, participant }: { reviewId: string; attempt: number; participant: ChatParticipant }) {
  const chat = useExpertChat(reviewId, attempt, participant);
  const { query, metadata, mutation } = chat;
  const inaccessible = query.isError && !query.data;
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-card px-4 py-2">
        <p role="status" className="m-0 text-ui-meta text-muted-foreground">
          {query.isPending ? "Đang tải cuộc trao đổi…" : metadata?.canSend ? "Tự cập nhật tin nhắn mỗi 5 giây" : metadata?.status === "requested" ? "Chờ chuyên gia tiếp nhận để bắt đầu trao đổi" : "Lịch sử trao đổi"}
        </p>
        <Button variant="ghost" size="sm" loading={query.isFetching && !query.isFetchingNextPage} onClick={() => { void query.refetch(); }}>
          <RefreshCw aria-hidden="true" className="size-3.5" />Làm mới
        </Button>
      </div>
      {query.isError && (
        <p role="alert" className="m-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-ui-meta leading-6 text-amber-950">
          {expertChatError(query.error)}
          {query.data && " Dữ liệu bên dưới là lần tải gần nhất; gửi tin đang tạm khóa."}
        </p>
      )}
      {!query.isPending && !inaccessible && (
        <ExpertChatMessages
          messages={chat.messages}
          participant={participant}
          hasOlder={query.hasNextPage}
          loadingOlder={query.isFetchingNextPage}
          latestSentId={mutation.data?.message.id}
          onLoadOlder={() => { if (!query.isFetching) void query.fetchNextPage(); }}
        />
      )}
      {(query.isPending || inaccessible) && <div className="min-h-36 flex-1" />}
      <span role="status" className="sr-only">{chat.messages.length} tin nhắn đã tải.</span>
      {chat.canSend ? (
        <ExpertChatComposer
          draft={chat.draft}
          onChange={chat.setDraft}
          onSend={() => { void chat.send(); }}
          sending={mutation.isPending}
          error={mutation.error ? expertChatError(mutation.error) : undefined}
          validationError={chat.validationError}
        />
      ) : metadata && !query.isError ? (
        <p className="m-0 flex items-start gap-2 border-t border-border p-4 text-ui-meta leading-6 text-muted-foreground">
          <LockKeyhole aria-hidden="true" className="mt-1 size-4 shrink-0" />
          {metadata.status === "requested" ? "Bạn có thể gửi tin nhắn sau khi chuyên gia tiếp nhận yêu cầu." : "Lần xác minh này đã kết thúc. Bạn vẫn có thể đọc lịch sử trao đổi."}
        </p>
      ) : null}
    </div>
  );
}
