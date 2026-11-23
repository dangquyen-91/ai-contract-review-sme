"use client";

import { Button } from "@/components/ui/button";
import { useExpertFullText } from "@/hooks/expert-verification/use-expert-original-file";

export function ExpertFullText({ reviewId, attempt }: { reviewId: string; attempt: number }) {
  const query = useExpertFullText(reviewId, attempt);
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      {query.isPending ? (
        <p role="status" className="text-ui text-muted-foreground">Đang tải văn bản đầy đủ…</p>
      ) : query.isError ? (
        <div role="alert" className="space-y-2 text-ui">
          <p>Chưa mở được văn bản đầy đủ. Vui lòng kiểm tra quyền chia sẻ và thử lại.</p>
          <Button variant="outline" size="sm" loading={query.isFetching} onClick={() => { void query.refetch(); }}>Thử tải lại</Button>
        </div>
      ) : query.data.text.trim() ? (
        <div className="whitespace-pre-wrap break-words font-serif text-ui-document leading-8 [overflow-wrap:anywhere]">{query.data.text}</div>
      ) : (
        <p role="status" className="text-ui text-muted-foreground">Chưa có nội dung trích xuất. Hãy chọn “Xem file gốc” để đối chiếu.</p>
      )}
    </div>
  );
}
