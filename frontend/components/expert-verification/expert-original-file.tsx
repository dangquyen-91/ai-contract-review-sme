"use client";

import { Button } from "@/components/ui/button";
import { ContractFilePreview } from "@/components/review/document/original-contract-preview";
import { useExpertOriginalFile } from "@/hooks/expert-verification/use-expert-original-file";

const previewTypes = new Set(["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]);

export function ExpertOriginalFile({ reviewId, attempt, mimeType, onBack }: {
  reviewId: string; attempt: number; mimeType?: string; onBack: () => void;
}) {
  if (mimeType && previewTypes.has(mimeType)) {
    return <ExpertOriginalFilePreview reviewId={reviewId} attempt={attempt} mimeType={mimeType} onBack={onBack} />;
  }

  return (
    <div className="p-5 text-ui">
      <p>Định dạng này cần mở bằng ứng dụng trên thiết bị.</p>
      <Button asChild variant="outline" size="sm">
        <a href={`/api/reviews/${reviewId}/verification/original-file?attempt=${attempt}`}>Tải file gốc</a>
      </Button>
    </div>
  );
}

function ExpertOriginalFilePreview({ reviewId, attempt, mimeType, onBack }: {
  reviewId: string; attempt: number; mimeType: string; onBack: () => void;
}) {
  const fileQuery = useExpertOriginalFile(reviewId, attempt);
  const trustedMime = fileQuery.data?.type;
  return (
    <div className="min-h-0 flex-1 overflow-hidden">
      <ContractFilePreview fileQuery={fileQuery} mimeType={trustedMime && previewTypes.has(trustedMime) ? trustedMime : mimeType} onTextFallback={onBack} />
    </div>
  );
}
