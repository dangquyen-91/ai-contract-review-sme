import { useMemo, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { useContractText } from "@/hooks/use-contracts";
import type { ContractReviewResult } from "@/types/contracts";

type ClausePosition = ContractReviewResult["clauses"][number];
type LocatedClause = ClausePosition & { start: number; end: number };

function locateClauses(clauses: ClausePosition[], text: string): LocatedClause[] {
  let cursor = 0;
  const located: LocatedClause[] = [];

  for (const clause of [...clauses].sort((a, b) => a.index - b.index)) {
    const { startOffset: start, endOffset: end } = clause;
    if (start >= cursor && end > start && end <= text.length) {
      located.push({ ...clause, start, end });
      cursor = end;
    }
  }

  return located;
}

export function FullDocument({ query, children }: { query: ReturnType<typeof useContractText>; children: ReactNode }) {
  if (query.isPending) return <p role="status" className="m-0 p-5 text-ui text-[#607087]">Đang tải văn bản đầy đủ…</p>;
  if (query.isError || !query.data || query.data.redacted !== false) return <div role="alert" className="rounded-xl border border-[#f0d5aa] bg-[#fffbf3] p-5 text-ui leading-6 text-[#79581b]">
    <p className="m-0 font-semibold">Chưa tải được văn bản đầy đủ</p>
    <p className="mb-0 mt-1">Bạn có thể thử lại hoặc chọn “Văn bản đã che”.</p>
    <Button variant="outline" size="sm" type="button" disabled={query.isFetching} onClick={() => { void query.refetch(); }} className="mt-3">{query.isFetching ? "Đang tải lại…" : "Tải lại văn bản đầy đủ"}</Button>
  </div>;
  if (!query.data.text.trim()) return <p role="status" className="m-0 p-5 text-ui text-[#607087]">Chưa có văn bản trích xuất để hiển thị.</p>;
  return children;
}

export function ContractDocumentText({ clauses, text, activeClause }: {
  clauses: ContractReviewResult["clauses"];
  text: string;
  activeClause: number | null;
}) {
  const located = useMemo(() => locateClauses(clauses, text), [clauses, text]);
  const contractParts = located.flatMap((clause, index) => {
    const previousEnd = located[index - 1]?.end ?? 0;
    const parts = [];
    if (clause.start > previousEnd) {
      parts.push(<span key={`gap-${previousEnd}`} className="whitespace-pre-wrap">{text.slice(previousEnd, clause.start)}</span>);
    }
    parts.push(
      <span
        key={`clause-${clause.index}`}
        className={`whitespace-pre-wrap [scroll-margin-block:35px] rounded-[3px] focus:[outline:none] ${activeClause === clause.index ? "[background:#fff0bf] shadow-[0_0_0_4px_#fff0bf]" : ""}`}
        data-clause-index={clause.index}
        tabIndex={-1}
      >{text.slice(clause.start, clause.end)}</span>,
    );
    return parts;
  });
  const finalEnd = located.at(-1)?.end ?? 0;
  if (text && finalEnd < text.length) {
    contractParts.push(<span key={`gap-${finalEnd}`} className="whitespace-pre-wrap">{text.slice(finalEnd)}</span>);
  }

  return <div className="text-[#263750] [font-family:Georgia,'Times_New_Roman',serif] text-ui-document leading-[1.85] [overflow-wrap:anywhere] whitespace-pre-wrap">{contractParts}</div>;
}
