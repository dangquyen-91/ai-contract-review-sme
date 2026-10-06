"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ContractChat, RiskDetails } from "@/components/dashboard/review-extras";
import type { ContractClause, ContractReviewResult, RiskFinding } from "@/types/contracts";

const severityLabels = { high: "Rủi ro cao", medium: "Trung bình", low: "Rủi ro thấp" };

const severityClasses: Record<RiskFinding["severity"], string> = {
  high: "text-[#a83248] bg-[#fff0f2]",
  medium: "text-[#875c08] bg-[#fff4dc]",
  low: "text-[#21715d] bg-[#eaf6f2]",
};

type LocatedClause = ContractClause & { start: number; end: number };

function locateClauses(clauses: ContractClause[], text: string): LocatedClause[] {
  let cursor = 0;
  const located: LocatedClause[] = [];

  for (const clause of [...clauses].sort((a, b) => a.index - b.index)) {
    const source = clause.text.trim();
    const savedStart = clause.startOffset;
    const savedEnd = clause.endOffset;
    let start = -1;
    let end = -1;

    if (typeof savedStart === "number" && typeof savedEnd === "number" &&
      savedStart >= cursor && savedEnd > savedStart && savedEnd <= text.length) {
      start = savedStart;
      end = savedEnd;
    } else if (source) {
      start = text.indexOf(source, cursor);
      if (start !== -1) end = start + source.length;
    }

    if (start !== -1 && end > start) {
      located.push({ ...clause, start, end });
      cursor = end;
    }
  }

  return located;
}

function findingClauseIndex(finding: RiskFinding, clauses: ContractClause[]): number | null {
  if (finding.findingType === "missing_clause") return null;
  const linked = clauses.find((clause) => (clause.id ?? clause._id) === finding.clauseId);
  return linked?.index ?? finding.clause?.index ?? null;
}

export function ReviewResults({ result, canAsk = false }: { result: ContractReviewResult; canAsk?: boolean }) {
  const [activeClause, setActiveClause] = useState<number | null>(null);
  const [findingUpdates, setFindingUpdates] = useState<Record<string, RiskFinding>>({});
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const findings = result.findings.map((finding) => findingUpdates[finding.id ?? finding._id ?? ""] ?? finding);
  const contractBodyRef = useRef<HTMLDivElement>(null);
  const text = result.extractedText ?? "";
  const clauses = useMemo(() => [...result.clauses].sort((a, b) => a.index - b.index), [result.clauses]);
  const located = useMemo(() => locateClauses(clauses, text), [clauses, text]);
  const visibleIndices = new Set((text ? located : clauses).map((clause) => clause.index));
  const highCount = findings.filter((finding) => finding.severity === "high").length;
  const contractId = result.contract.id ?? result.contract._id;

  function replaceFinding(next: RiskFinding) {
    const id = next.id ?? next._id;
    if (id) setFindingUpdates((current) => ({ ...current, [id]: next }));
  }

  function findingDescription(finding: RiskFinding) {
    return [...(finding.problem ?? []), ...(finding.consequences ?? [])].join(" ");
  }

  function jumpToClause(index: number) {
    setActiveClause(index);
    const target = contractBodyRef.current?.querySelector<HTMLElement>(`[data-clause-index="${index}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }

  const contractParts = located.flatMap((clause, index) => {
    const previousEnd = located[index - 1]?.end ?? 0;
    const parts = [];
    if (clause.start > previousEnd) {
      parts.push(<span key={`gap-${previousEnd}`} className="whitespace-pre-wrap">{text.slice(previousEnd, clause.start)}</span>);
    }
    parts.push(
      <span
        key={`clause-${clause.index}`}
        className={`${"whitespace-pre-wrap [scroll-margin-block:35px] rounded-[3px] focus:[outline:none]"} ${activeClause === clause.index ? "[background:#fff0bf] shadow-[0_0_0_4px_#fff0bf]" : ""}`}
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

  return (
    <section className="overflow-hidden border [background:#fff] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] mt-5 rounded-[14px] border-solid border-[#e4e8ef]" aria-live="polite">
      <header className="flex items-center justify-between gap-5 [border-bottom:1px_solid_#e4e8ef] px-[22px] py-5 [&_h2]:text-[length:18px] [&_h2]:mt-[5px] [&_h2]:mb-0 [&_h2]:mx-0 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col">
        <div><p className="text-[#2864dc] text-[length:10px] font-[780] tracking-[1.1px] uppercase m-0">Kết quả AI review</p><h2>{result.contract.title}</h2></div>
        <span className={highCount ? "min-h-[30px] inline-flex items-center gap-[7px] flex-none text-[length:9px] font-bold px-2.5 py-0 rounded-lg text-[#a53348] [background:#fff0f2] [&_svg]:w-[15px]" : "min-h-[30px] inline-flex items-center gap-[7px] flex-none text-[length:9px] font-bold px-2.5 py-0 rounded-lg text-[#24705d] [background:#eaf6f2] [&_svg]:w-[15px]"}>
          <Icon name="shield" />{highCount ? `${highCount} rủi ro cao` : "Không có rủi ro cao"}
        </span>
      </header>
      <div className="grid grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] [align-items:start] [@media_(max-width:_1080px)]:grid-cols-[1fr]">
        <div className="min-w-0 [border-right:1px_solid_#e4e8ef] [@media_(max-width:_1080px)]:[border-right:0] [@media_(max-width:_1080px)]:[border-bottom:1px_solid_#e4e8ef]">
          <article className="[border-bottom:1px_solid_#e4e8ef] [background:#fbfcff] px-[22px] py-5 [&_h3]:text-[length:13px] [&_h3]:m-0 [&_p]:text-[#5e6e84] [&_p]:text-[length:11px] [&_p]:leading-[1.7] [&_p]:whitespace-pre-wrap [&_p]:mt-[9px] [&_p]:mb-0 [&_p]:mx-0 [&_ul]:text-[#5e6e84] [&_ul]:text-[length:11px] [&_ul]:leading-[1.7] [&_ul]:mt-[9px] [&_ul]:mb-0 [&_ul]:mx-0 [&_ul]:pl-[18px] [&_li_+_li]:mt-[5px]">
            <h3>Tóm tắt điều hành</h3>
            {result.contract.currentVersion?.summaryPoints?.length ?
              <ul>{result.contract.currentVersion.summaryPoints.map((point, index) => <li key={index}>{point}</li>)}</ul> :
              <p>AI đã phân tích hợp đồng. Xem các điểm cần lưu ý bên dưới.</p>}
            {!!result.contract.currentVersion?.overallAssessment?.length && <div className="[border-top:1px_solid_#e4e8ef] mt-[15px] pt-3 [&_h4]:text-[#31445f] [&_h4]:text-[length:11px] [&_h4]:m-0"><h4>Đánh giá tổng quan</h4><ul>{result.contract.currentVersion.overallAssessment.map((point, index) => <li key={index}>{point}</li>)}</ul></div>}
          </article>
          <section className="pt-5 pb-[25px] px-[22px] [&_ul]:grid [&_ul]:gap-3 [&_ul]:[list-style:none] [&_ul]:mt-[15px] [&_ul]:mb-0 [&_ul]:mx-0 [&_ul]:p-0 [&_li]:grid [&_li]:grid-cols-[74px_minmax(0,1fr)] [&_li]:gap-2.5 [&_li]:[border-top:1px_solid_#edf0f4] [&_li]:pt-3 [&_li]:[@media_(max-width:_580px)]:grid-cols-[1fr]" aria-labelledby="review-findings-heading">
            <div className="[&_h3]:text-[length:13px] [&_h3]:m-0 flex items-center gap-[7px] [&>_span]:grid [&>_span]:min-w-5 [&>_span]:h-5 [&>_span]:place-items-center [&>_span]:text-[#2859aa] [&>_span]:[background:#eaf1ff] [&>_span]:text-[length:9px] [&>_span]:font-bold [&>_span]:rounded-[10px]"><h3 id="review-findings-heading">Điểm cần lưu ý</h3><span>{findings.length}</span></div>
            {findings.length ? <ul>{findings.map((finding, index) => {
              const clauseIndex = findingClauseIndex(finding, clauses);
              const canJump = clauseIndex !== null && visibleIndices.has(clauseIndex);
              const findingKey = finding.id ?? finding._id ?? `${finding.title}-${index}`;
              const expanded = expandedFinding === findingKey;
              return <li key={finding.id ?? finding._id ?? `${finding.title}-${index}`}>
                <span className={`${"h-fit text-[length:8px] font-[750] text-center px-1.5 py-1 rounded-[5px] [@media_(max-width:_580px)]:w-fit"} ${severityClasses[finding.severity]}`}>{severityLabels[finding.severity]}</span>
                <div className="min-w-0">{canJump ? <button
                  type="button"
                  className={`${"min-w-0 block text-left p-0 w-full text-inherit [background:transparent] [font:inherit] cursor-pointer rounded-md border-0 border-none border-current focus-visible:[outline:3px_solid_#9bbcf8] focus-visible:outline-offset-[3px] [&:hover_strong]:text-[#245abf] [&_strong]:block [&_strong]:text-[length:11px] [&>_span]:block [&>_span]:text-[#66758a] [&>_span]:text-[length:10px] [&>_span]:leading-[1.6] [&>_span]:mt-[5px] [&>_span]:mb-0 [&>_span]:mx-0 [&_small]:block [&_small]:text-[#345e92] [&_small]:text-[length:10px] [&_small]:leading-normal [&_small]:mt-1.5 [&_em]:block [&_em]:text-[#2864dc] [&_em]:text-[length:9px] [&_em]:not-italic [&_em]:font-bold [&_em]:mt-2"} ${activeClause === clauseIndex ? "[&_strong]:text-[#245abf]" : ""}`}
                  onClick={() => jumpToClause(clauseIndex)}
                  aria-label={`${finding.title}. Xem vị trí trong hợp đồng`}
                ><strong>{finding.title}</strong><span>{findingDescription(finding)}</span><em>Xem trong hợp đồng →</em></button> : <div className="min-w-0 block text-left p-0 [&_strong]:block [&_strong]:text-[length:11px] [&_p]:block [&_p]:text-[#66758a] [&_p]:text-[length:10px] [&_p]:leading-[1.6] [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0 [&_small]:block [&_small]:text-[#345e92] [&_small]:text-[length:10px] [&_small]:leading-normal [&_small]:mt-1.5 [&_em]:block [&_em]:text-[#2864dc] [&_em]:text-[length:9px] [&_em]:not-italic [&_em]:font-bold [&_em]:mt-2 [&_em]:text-[#8a94a3]"><strong>{finding.title}</strong><p>{findingDescription(finding)}</p>{finding.findingType === "missing_clause" && <em>Điều khoản này chưa có trong hợp đồng.</em>}</div>}
                <button className="text-[#2864dc] [background:none] [font:inherit] cursor-pointer mt-[9px] p-0 border-0 border-none border-current [font-size:10px] [font-weight:700] focus-visible:[outline:2px_solid_#2864dc] focus-visible:outline-offset-[3px]" type="button" aria-expanded={expanded} onClick={() => setExpandedFinding(expanded ? null : findingKey)}>{expanded ? "Ẩn chi tiết" : "Xem phân tích và đề xuất"}</button>
                {expanded && <RiskDetails contractId={contractId} finding={finding} onChange={replaceFinding} />}</div>
              </li>;
            })}</ul> : <p className="text-[#66758a] text-[length:11px] mt-3.5 mb-0 mx-0">Chưa phát hiện điểm rủi ro đáng kể.</p>}
          </section>
        </div>
        <section className="min-w-0" aria-label="Nội dung hợp đồng">
          <div className="[&_h3]:text-[length:13px] [&_h3]:m-0 flex items-center justify-between gap-3 [border-bottom:1px_solid_#e4e8ef] [background:#fbfcfe] px-5 py-[17px] [&_p]:max-w-[360px] [&_p]:overflow-hidden [&_p]:text-[#778398] [&_p]:text-[length:10px] [&_p]:text-ellipsis [&_p]:whitespace-nowrap [&_p]:mt-1 [&_p]:mb-0 [&_p]:mx-0 [&>_span]:flex-none [&>_span]:text-[#607087] [&>_span]:text-[length:9px]"><div><h3>Nội dung hợp đồng</h3><p>{result.contract.currentVersion?.fileName ?? result.contract.title}</p></div><span>{clauses.length} điều khoản</span></div>
          <div ref={contractBodyRef} className="h-[min(70vh,760px)] min-h-[390px] overflow-y-auto scroll-smooth p-[26px] [@media_(max-width:_1080px)]:h-[min(58vh,650px)] [@media_(max-width:_580px)]:p-[18px] motion-reduce:scroll-auto">
            {text ? <div className="text-[#263750] [font-family:Georgia,'Times_New_Roman',serif] text-[length:13px] leading-[1.85] [overflow-wrap:anywhere] whitespace-pre-wrap">{contractParts}</div> : clauses.length ? clauses.map((clause) => <article key={clause.id ?? clause._id ?? clause.index} className={`${"focus:[outline:none] border [scroll-margin-block:30px] mb-4 p-[15px] rounded-[9px] border-solid border-[#e4e8ef] [&_h4]:text-[length:12px] [&_h4]:mt-0 [&_h4]:mb-2 [&_h4]:mx-0 [&_p]:text-[#3e4c60] [&_p]:[font-family:Georgia,'Times_New_Roman',serif] [&_p]:text-[length:12px] [&_p]:leading-[1.8] [&_p]:whitespace-pre-wrap [&_p]:m-0"} ${activeClause === clause.index ? "[background:#fff0bf] shadow-[0_0_0_4px_#fff0bf]" : ""}`} data-clause-index={clause.index} tabIndex={-1}><h4>{clause.title || `Điều khoản ${clause.index + 1}`}</h4><p>{clause.text}</p></article>) : <p className="text-[#66758a] text-[length:11px] mt-3.5 mb-0 mx-0">Chưa có nội dung hợp đồng để hiển thị.</p>}
          </div>
        </section>
      </div>
      {contractId && <ContractChat key={contractId} contractId={contractId} canAsk={canAsk} />}
      <p className="text-[#8a94a3] [border-top:1px_solid_#edf0f4] [background:#fafbfc] text-[length:8px] text-right m-0 px-[22px] py-[9px]">Kết quả do AI hỗ trợ, không thay thế ý kiến tư vấn pháp lý chuyên môn.</p>
    </section>
  );
}
