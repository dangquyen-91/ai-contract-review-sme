"use client";

import { useState } from "react";
import { AlertTriangle, BookOpen, RefreshCw, ScanText } from "lucide-react";
import type { StudioProposal } from "@/types/template-studio";
import type { TemplateStudioState } from "@/hooks/contract-drafts/use-template-studio";
import { StudioLawPreview } from "./studio-law-preview";

export function StudioClauseReview({
  proposal,
  studio,
  stale,
}: {
  proposal: StudioProposal;
  studio: TemplateStudioState;
  stale: boolean;
}) {
  const [previewId, setPreviewId] = useState<string | null>(null);
  const review = proposal.review;
  if (!review) return null;
  return (
    <section
      aria-label="Kết quả kiểm tra điều khoản"
      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3"
    >
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-800">
        <ScanText size={15} />
        Kết quả kiểm tra điều khoản
      </div>
      {stale && (
        <p
          role="status"
          className="rounded-lg bg-amber-50 p-2 text-[11px] leading-5 text-amber-800"
        >
          Nội dung hoặc luật đã chọn đã thay đổi. Kết quả này thuộc phiên bản
          trước; hãy kiểm tra lại.
        </p>
      )}
      <p className="whitespace-pre-wrap text-xs leading-6 text-slate-600">
        {review.summary}
      </p>
      {!review.findings.length && (
        <p className="text-xs leading-5 text-slate-500">
          Chưa có điểm cần xem xét được trả về trong phạm vi đã kiểm tra. Kết
          quả này không xác nhận toàn bộ hợp đồng đã tuân thủ pháp luật.
        </p>
      )}
      {review.findings.map((finding, index) => (
        <article
          key={`${finding.blockId}-${index}`}
          className="space-y-2 rounded-lg border border-slate-200 bg-white p-3"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle
              size={14}
              className={`mt-0.5 shrink-0 ${finding.severity === "high" ? "text-red-500" : finding.severity === "medium" ? "text-amber-500" : "text-blue-500"}`}
            />
            <h4 className="text-xs font-semibold leading-5 text-slate-800">
              {finding.title}
            </h4>
          </div>
          <span
            className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium ${finding.severity === "high" ? "bg-red-50 text-red-700" : finding.severity === "medium" ? "bg-amber-50 text-amber-800" : "bg-blue-50 text-blue-700"}`}
          >
            {finding.severity === "high"
              ? "Cần chú ý"
              : finding.severity === "medium"
                ? "Cần xem xét"
                : "Lưu ý"}
          </span>
          <p className="whitespace-pre-wrap text-xs leading-6 text-slate-600">
            {finding.reason}
          </p>
          <details className="text-[11px] leading-5 text-slate-500">
            <summary className="cursor-pointer font-medium">
              Đoạn hợp đồng được kiểm tra
            </summary>
            <p className="mt-1 whitespace-pre-wrap rounded-md bg-slate-50 p-2">
              {finding.contractText}
            </p>
          </details>
          {finding.verification === "insufficient_basis" && (
            <p className="text-[11px] leading-5 text-amber-700">
              Chưa đủ căn cứ trong các trích đoạn đã lấy. Cần bổ sung văn bản
              hoặc kiểm tra thêm.
            </p>
          )}
          {finding.citations.map((citation) => (
            <div
              key={citation.chunkId}
              className="rounded-lg border border-blue-100 bg-blue-50/40 p-2.5"
            >
              <button
                type="button"
                onClick={() => setPreviewId(citation.sourceId)}
                className="flex items-start gap-1.5 text-left text-[11px] font-semibold leading-5 text-blue-700 hover:underline"
              >
                <BookOpen size={13} className="mt-1 shrink-0" />
                {[
                  citation.documentNumber || citation.title,
                  citation.articleRef,
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </button>
              <blockquote className="mt-1.5 max-h-44 overflow-y-auto whitespace-pre-wrap text-[11px] leading-5 text-slate-600">
                {citation.quote}
              </blockquote>
            </div>
          ))}
        </article>
      ))}
      <p className="text-[10px] leading-4 text-slate-400">
        Kết quả AI dựa trên vùng chọn và trích đoạn từ kho luật. Đề xuất sửa chỉ
        có hiệu lực khi bạn bấm Áp dụng.
      </p>
      {stale && (
        <button
          type="button"
          disabled={
            !!studio.busy ||
            studio.draft.status !== "draft" ||
            !studio.values.legalSourceIds.length ||
            !proposal.blockIds?.length
          }
          onClick={() => void studio.checkClauses(proposal.blockIds ?? [])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-white px-3 py-2 text-xs font-semibold text-blue-700 disabled:opacity-40"
        >
          <RefreshCw size={13} />
          Kiểm tra lại · 1 lượt soạn
        </button>
      )}
      {previewId && (
        <StudioLawPreview id={previewId} onBack={() => setPreviewId(null)} />
      )}
    </section>
  );
}
