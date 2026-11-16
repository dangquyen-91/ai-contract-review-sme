import { LoaderCircle, ScanText } from "lucide-react";
import type { TemplateStudioState } from "@/hooks/contract-drafts/use-template-studio";
import type { StudioSelection } from "@/types/template-studio";

export function StudioClauseCheckButton({
  studio,
  selection,
  canAsk,
  loadingAllowance = false,
  allowanceError = false,
  blocked,
}: {
  studio: TemplateStudioState;
  selection: StudioSelection;
  canAsk: boolean;
  loadingAllowance?: boolean;
  allowanceError?: boolean;
  blocked: boolean;
}) {
  const hint = loadingAllowance
    ? "Đang tải hạn mức soạn AI…"
    : allowanceError
      ? "Chưa tải được hạn mức. Hãy thử tải lại."
      : !selection.blockIds.length
        ? "Bôi đen điều khoản cần kiểm tra."
        : !studio.values.legalSourceIds.length
          ? "Chọn luật áp dụng trước khi kiểm tra."
          : !canAsk
            ? "Bạn cần lượt soạn AI để kiểm tra điều khoản."
            : "1 lượt soạn khi AI trả kết quả thành công.";
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-slate-100 pb-2.5">
      <button
        type="button"
        disabled={
          blocked ||
          !canAsk ||
          !selection.blockIds.length ||
          !studio.values.legalSourceIds.length
        }
        onClick={() => void studio.checkClauses(selection.blockIds)}
        title={hint}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/70 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 transition hover:border-blue-200 hover:bg-blue-100/60 disabled:cursor-not-allowed disabled:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
      >
        {studio.busy === "assistant" ? (
          <LoaderCircle size={15} className="animate-spin" />
        ) : (
          <ScanText size={15} />
        )}
        Kiểm tra điều khoản
      </button>
      <p className="max-w-40 text-[10px] leading-4 text-slate-400">{hint}</p>
    </div>
  );
}
