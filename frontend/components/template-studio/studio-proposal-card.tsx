"use client";

import { Check, Sparkles } from "lucide-react";
import type { TemplateStudioState } from "@/hooks/contract-drafts/use-template-studio";
import type { StudioProposal } from "@/types/template-studio";
import { studioFieldText } from "@/lib/contract-drafts/studio-document";
import { StudioClauseReview } from "./studio-clause-review";

export function StudioProposalCard({
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
    <div
      className="mx-auto w-full max-w-2xl space-y-3"
      data-proposal-id={proposal.id}
    >
      <div className="ml-8 rounded-2xl rounded-tr-sm bg-[#f0f3f9] px-4 py-3 text-[13px] leading-6 text-slate-700 whitespace-pre-wrap">
        {proposal.userMessage}
        {!!proposal.referenceNames?.length && (
          <span className="mt-2 block text-[10px] text-slate-400">
            Tệp tham khảo: {proposal.referenceNames.join(", ")}
          </span>
        )}
        {!!proposal.legalSources?.length && (
          <span className="mt-2 block text-[10px] text-slate-400">
            Luật tham khảo:{" "}
            {proposal.legalSources
              .map((law) => law.documentNumber || law.title)
              .join(", ")}
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
      {proposal.mode === "check" && (
        <StudioClauseReview proposal={proposal} studio={studio} stale={stale} />
      )}
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
