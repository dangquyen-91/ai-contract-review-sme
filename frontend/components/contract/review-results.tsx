"use client";

import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useContractText } from "@/hooks/use-contracts";
import workspaceStyles from "./review-workspace.module.css";
import { Icon } from "@/components/ui/icon";
import { ContractChat, RiskDetails } from "@/components/contract/review-extras";
import { OriginalContractPreview } from "@/components/contract/original-contract-preview";
import { KeyTerms } from "@/components/contract/key-terms";
import { RedactedDocument } from "@/components/contract/redacted-document";
import { DocumentDisclosureDialog } from "@/components/contract/document-disclosure-dialog";
import type { ContractReviewResult, RiskFinding } from "@/types/contracts";

const severityLabels = { high: "Rủi ro cao", medium: "Trung bình", low: "Rủi ro thấp" };

const severityClasses: Record<RiskFinding["severity"], string> = {
  high: "text-[#a83248] bg-[#fff0f2]",
  medium: "text-[#875c08] bg-[#fff4dc]",
  low: "text-[#21715d] bg-[#eaf6f2]",
};

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

function findingClauseIndex(finding: RiskFinding, clauses: ClausePosition[]): number | null {
  if (finding.findingType === "missing_clause") return null;
  const linked = clauses.find((clause) => (clause.id ?? clause._id) === finding.clauseId);
  return linked?.index ?? finding.clause?.index ?? null;
}

type ReviewResultsProps = { result: ContractReviewResult; canAsk?: boolean; showAiContext?: boolean };

function FullDocument({ query, children }: { query: ReturnType<typeof useContractText>; children: ReactNode }) {
  if (query.isPending) return <p role="status" className="m-0 p-5 text-ui text-[#607087]">Đang tải văn bản đầy đủ…</p>;
  if (query.isError || !query.data || query.data.redacted !== false) return <div role="alert" className="rounded-xl border border-[#f0d5aa] bg-[#fffbf3] p-5 text-ui leading-6 text-[#79581b]">
    <p className="m-0 font-semibold">Chưa tải được văn bản đầy đủ</p>
    <p className="mb-0 mt-1">Bạn có thể thử lại hoặc chọn “Văn bản đã che”.</p>
    <button type="button" disabled={query.isFetching} onClick={() => { void query.refetch(); }} className="mt-3 rounded-lg border border-[#dcc69f] bg-white px-3 py-2 font-semibold disabled:opacity-60">{query.isFetching ? "Đang tải lại…" : "Tải lại văn bản đầy đủ"}</button>
  </div>;
  if (!query.data.text.trim()) return <p role="status" className="m-0 p-5 text-ui text-[#607087]">Chưa có văn bản trích xuất để hiển thị.</p>;
  return children;
}

export function ReviewResults(props: ReviewResultsProps) {
  return <ReviewResultsContent key={props.result.contract.id ?? props.result.contract._id} {...props} />;
}

function ReviewResultsContent({ result, canAsk = false, showAiContext = false }: ReviewResultsProps) {
  const [activeClause, setActiveClause] = useState<number | null>(null);
  const [originalTarget, setOriginalTarget] = useState<{ index: number; requestId: number } | null>(null);
  const [viewMode, setViewMode] = useState<"original" | "text" | "redacted">("redacted");
  const [disclosure, setDisclosure] = useState<{ mode: "text" | "original"; clauseIndex?: number } | null>(null);
  const [findingUpdates, setFindingUpdates] = useState<Record<string, RiskFinding>>({});
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | RiskFinding["severity"]>("all");
  const sectionId = useId();
  const findings = result.findings.map((finding) => findingUpdates[finding.id ?? finding._id ?? ""] ?? finding);
  const visibleFindings = findings.filter((finding) => severityFilter === "all" || finding.severity === severityFilter);
  const contractBodyRef = useRef<HTMLDivElement>(null);
  const savedScroll = useRef(0);
  const restoreScroll = useRef<number | null>(null);
  const clauses = useMemo(() => [...result.clauses].sort((a, b) => a.index - b.index), [result.clauses]);
  const highCount = findings.filter((finding) => finding.severity === "high").length;
  const summaryComplete = result.contract.currentVersion?.summaryStatus === "completed";
  const risksComplete = result.contract.currentVersion?.riskDetectionStatus === "completed";
  const contractId = result.contract.id ?? result.contract._id;
  const redactedQuery = useContractText(contractId ?? "", {
    redacted: true,
    redactionMode: "partial",
    enabled: viewMode === "redacted",
    version: result.contract.updatedAt,
  });
  const fullQuery = useContractText(contractId ?? "", {
    redacted: false,
    enabled: viewMode === "text" || (viewMode === "original" && originalTarget !== null),
    version: result.contract.updatedAt,
  });
  const text = fullQuery.isError ? "" : fullQuery.data?.text ?? "";
  const located = useMemo(() => locateClauses(clauses, text), [clauses, text]);
  const originalClause = originalTarget ? clauses.find((clause) => clause.index === originalTarget.index) : undefined;
  const previewTarget = originalClause && originalTarget && text ? {
    text: text.slice(originalClause.startOffset, originalClause.endOffset), requestId: originalTarget.requestId,
  } : null;
  const mimeType = result.contract.currentVersion?.mimeType;
  const isDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const canShowOriginal = Boolean(contractId && mimeType && [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/png",
    "image/jpeg",
  ].includes(mimeType));
  const showOriginal = canShowOriginal && viewMode === "original";

  function applyDocumentMode(mode: typeof viewMode, clauseIndex?: number) {
    const body = contractBodyRef.current;
    if (body) savedScroll.current = body.scrollTop / Math.max(1, body.scrollHeight - body.clientHeight);
    restoreScroll.current = savedScroll.current;
    setActiveClause(clauseIndex ?? null);
    setOriginalTarget((current) => mode === "original" && clauseIndex !== undefined ? { index: clauseIndex, requestId: (current?.requestId ?? 0) + 1 } : null);
    setViewMode(mode);
    if (mode === "text" && clauseIndex !== undefined && !fullQuery.isPending) scrollToClause(clauseIndex);
  }

  function selectDocumentMode(mode: typeof viewMode) {
    if (mode === viewMode) return;
    if (mode === "redacted") applyDocumentMode(mode);
    else setDisclosure({ mode });
  }

  useLayoutEffect(() => {
    if (showOriginal || (viewMode === "redacted" ? redactedQuery.isPending : fullQuery.isPending)) return;
    const body = contractBodyRef.current;
    if (body && restoreScroll.current !== null) {
      body.scrollTo({ top: restoreScroll.current * Math.max(0, body.scrollHeight - body.clientHeight), behavior: "instant" });
      restoreScroll.current = null;
    }
  }, [viewMode, showOriginal, redactedQuery.isPending, fullQuery.isPending]);

  function scrollToClause(index: number) {
    const target = contractBodyRef.current?.querySelector<HTMLElement>(`[data-clause-index="${index}"]`);
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    target?.focus({ preventScroll: true });
  }

  useEffect(() => {
    if (viewMode !== "text" || activeClause === null) return;
    scrollToClause(activeClause);
  }, [activeClause, viewMode, text]);

  function replaceFinding(next: RiskFinding) {
    const id = next.id ?? next._id;
    if (id) setFindingUpdates((current) => ({ ...current, [id]: next }));
  }

  function findingDescription(finding: RiskFinding) {
    return [...(finding.problem ?? []), ...(finding.consequences ?? [])].join(" ");
  }

  function jumpToClause(index: number) {
    const mode = isDocx && canShowOriginal ? "original" : "text";
    if (viewMode !== mode) setDisclosure({ mode, clauseIndex: index });
    else applyDocumentMode(mode, index);
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
    <section className={`overflow-hidden border [background:#fff] shadow-[0_22px_50px_-48px_rgb(23_45_78_/_0.7)] rounded-[14px] border-solid border-[#e4e8ef] ${showAiContext ? workspaceStyles.workspace : ""}`}>
      {showAiContext && <p className="m-0 border-b border-[#dce7f6] bg-[#f4f8ff] px-5 py-3 text-ui leading-6 text-[#536881]">Kết quả do AI phân tích, chưa thể hiện phê duyệt của chuyên viên. Cập nhật hợp đồng: {Number.isNaN(new Date(result.contract.updatedAt).getTime()) ? "chưa rõ" : new Date(result.contract.updatedAt).toLocaleString("vi-VN")}.</p>}
      <header className="flex items-center justify-between gap-5 [border-bottom:1px_solid_#e4e8ef] px-[22px] py-5 [&_h2]:text-ui-dialog [&_h2]:font-semibold [&_h2]:mt-[5px] [&_h2]:mb-0 [&_h2]:mx-0 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col">
        <div><p className="text-[#2864dc] text-ui-caption font-semibold tracking-[1.1px] uppercase m-0">Kết quả AI review</p><h2>{result.contract.title}</h2></div>
        <span className={!risksComplete ? "min-h-[30px] inline-flex items-center gap-[7px] flex-none text-ui-caption font-bold px-2.5 py-0 rounded-lg text-[#875c08] [background:#fff4dc] [&_svg]:w-[15px]" : highCount ? "min-h-[30px] inline-flex items-center gap-[7px] flex-none text-ui-caption font-bold px-2.5 py-0 rounded-lg text-[#a53348] [background:#fff0f2] [&_svg]:w-[15px]" : "min-h-[30px] inline-flex items-center gap-[7px] flex-none text-ui-caption font-bold px-2.5 py-0 rounded-lg text-[#24705d] [background:#eaf6f2] [&_svg]:w-[15px]"}>
          <Icon name="shield" />{!risksComplete ? "Chưa hoàn tất đánh giá rủi ro" : highCount ? `${highCount} rủi ro cao` : "Không có rủi ro cao"}
        </span>
      </header>
      {showAiContext && <nav className={workspaceStyles.navigation} aria-label="Điều hướng kết quả"><a href={`#${sectionId}-analysis`}>Tóm tắt & rủi ro</a><a href={`#${sectionId}-document`}>Nội dung hợp đồng</a></nav>}
      <div className={`${workspaceStyles.resultColumns} grid grid-cols-[minmax(0,0.88fr)_minmax(0,1.12fr)] items-stretch [@media_(max-width:_1080px)]:grid-cols-[1fr] ${showAiContext ? workspaceStyles.splitPane : ""}`}>
        <div id={`${sectionId}-analysis`} className={`min-w-0 [border-right:1px_solid_#e4e8ef] [@media_(max-width:_1080px)]:[border-right:0] [@media_(max-width:_1080px)]:[border-bottom:1px_solid_#e4e8ef] ${showAiContext ? workspaceStyles.analysisPane : ""}`}>
          <article className="[border-bottom:1px_solid_#e4e8ef] [background:#fbfcff] px-[22px] py-5 [&_h3]:text-ui-section [&_h3]:font-semibold [&_h3]:m-0 [&_p]:text-[#5e6e84] [&_p]:text-ui [&_p]:leading-[1.7] [&_p]:whitespace-pre-wrap [&_p]:mt-[9px] [&_p]:mb-0 [&_p]:mx-0 [&_ul]:text-[#5e6e84] [&_ul]:text-ui [&_ul]:leading-[1.7] [&_ul]:mt-[9px] [&_ul]:mb-0 [&_ul]:mx-0 [&_ul]:pl-[18px] [&_li_+_li]:mt-[5px]">
            <h3>Tóm tắt điều hành</h3>
            {result.contract.currentVersion?.summaryPoints?.length ?
              <ul>{result.contract.currentVersion.summaryPoints.map((point, index) => <li key={index}>{point}</li>)}</ul> :
              <p>{summaryComplete ? "Không có điểm tóm tắt để hiển thị." : "Tóm tắt chưa hoàn tất. Bạn có thể thử rà soát lại hợp đồng."}</p>}
            {!!result.contract.currentVersion?.overallAssessment?.length && <div className="[border-top:1px_solid_#e4e8ef] mt-[15px] pt-3 [&_h4]:text-[#31445f] [&_h4]:text-ui-section [&_h4]:font-semibold [&_h4]:m-0"><h4>Đánh giá tổng quan</h4><ul>{result.contract.currentVersion.overallAssessment.map((point, index) => <li key={index}>{point}</li>)}</ul></div>}
          </article>
          <section className="pt-5 pb-[25px] px-[22px] [&_ul]:grid [&_ul]:gap-3 [&_ul]:[list-style:none] [&_ul]:mt-[15px] [&_ul]:mb-0 [&_ul]:mx-0 [&_ul]:p-0 [&_li]:grid [&_li]:grid-cols-[96px_minmax(0,1fr)] [&_li]:gap-2.5 [&_li]:[border-top:1px_solid_#edf0f4] [&_li]:pt-3 [&_li]:[@media_(max-width:_580px)]:grid-cols-[1fr]" aria-labelledby="review-findings-heading">
            <div className="[&_h3]:text-ui-section [&_h3]:font-semibold [&_h3]:m-0 flex items-center gap-[7px] [&>_span]:grid [&>_span]:min-w-5 [&>_span]:h-5 [&>_span]:place-items-center [&>_span]:text-[#2859aa] [&>_span]:[background:#eaf1ff] [&>_span]:text-ui-caption [&>_span]:font-bold [&>_span]:rounded-[10px]"><h3 id="review-findings-heading">Điểm cần lưu ý</h3><span>{findings.length}</span></div>
            {showAiContext && <div className={workspaceStyles.filters} aria-label="Lọc mức rủi ro">{(["all", "high", "medium", "low"] as const).map((severity) => <button type="button" key={severity} aria-pressed={severityFilter === severity} onClick={() => { setSeverityFilter(severity); setExpandedFinding(null); }}>{severity === "all" ? "Tất cả" : severityLabels[severity]} · {severity === "all" ? findings.length : findings.filter((finding) => finding.severity === severity).length}</button>)}</div>}
            {visibleFindings.length ? <ul>{visibleFindings.map((finding, index) => {
              const clauseIndex = findingClauseIndex(finding, clauses);
              const canJump = clauseIndex !== null && clauses.some((clause) => clause.index === clauseIndex);
              const findingKey = finding.id ?? finding._id ?? `${finding.title}-${index}`;
              const expanded = expandedFinding === findingKey;
              return <li key={finding.id ?? finding._id ?? `${finding.title}-${index}`}>
                <span className={`${"h-fit text-ui-caption font-semibold text-center px-1.5 py-1 rounded-[5px] [@media_(max-width:_580px)]:w-fit"} ${severityClasses[finding.severity]}`}>{severityLabels[finding.severity]}</span>
                <div className="min-w-0">{canJump ? <button
                  type="button"
                  className={`${"min-w-0 block text-left p-0 w-full text-inherit [background:transparent] [font:inherit] cursor-pointer rounded-md border-0 border-none border-current focus-visible:[outline:3px_solid_#9bbcf8] focus-visible:outline-offset-[3px] [&:hover_strong]:text-[#245abf] [&_strong]:block [&_strong]:text-ui-section [&>_span]:block [&>_span]:text-[#66758a] [&>_span]:text-ui [&>_span]:leading-[1.6] [&>_span]:mt-[5px] [&>_span]:mb-0 [&>_span]:mx-0 [&_small]:block [&_small]:text-[#345e92] [&_small]:text-ui-meta [&_small]:leading-normal [&_small]:mt-1.5 [&_em]:block [&_em]:text-[#2864dc] [&_em]:text-ui [&_em]:not-italic [&_em]:font-bold [&_em]:mt-2"} ${activeClause === clauseIndex ? "[&_strong]:text-[#245abf]" : ""}`}
                  onClick={() => jumpToClause(clauseIndex)}
                  aria-label={`${finding.title}. ${isDocx ? "Xem vị trí trong file gốc" : "Xem vị trí trong văn bản đầy đủ"}`}
                ><strong>{finding.title}</strong><span>{findingDescription(finding)}</span><em>{isDocx ? "Xem vị trí trong file gốc →" : "Xem vị trí trong văn bản đầy đủ →"}</em></button> : <div className="min-w-0 block text-left p-0 [&_strong]:block [&_strong]:text-ui-section [&_p]:block [&_p]:text-[#66758a] [&_p]:text-ui [&_p]:leading-[1.6] [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0 [&_small]:block [&_small]:text-[#345e92] [&_small]:text-ui-meta [&_small]:leading-normal [&_small]:mt-1.5 [&_em]:block [&_em]:text-[#2864dc] [&_em]:text-ui [&_em]:not-italic [&_em]:font-bold [&_em]:mt-2 [&_em]:text-[#8a94a3]"><strong>{finding.title}</strong><p>{findingDescription(finding)}</p>{finding.findingType === "missing_clause" && <em>Điều khoản này chưa có trong hợp đồng.</em>}</div>}
                <button className="text-[#2864dc] [background:none] [font:inherit] cursor-pointer mt-[9px] p-0 border-0 border-none border-current text-ui font-semibold focus-visible:[outline:2px_solid_#2864dc] focus-visible:outline-offset-[3px]" type="button" aria-expanded={expanded} onClick={() => setExpandedFinding(expanded ? null : findingKey)}>{expanded ? "Ẩn chi tiết" : "Xem phân tích và đề xuất"}</button>
                {expanded && <RiskDetails contractId={contractId} finding={finding} onChange={replaceFinding} allowProposalEditing={isDocx && canJump} />}</div>
              </li>;
            })}</ul> : <p className="text-[#66758a] text-ui mt-3.5 mb-0 mx-0">{severityFilter !== "all" ? "Không có rủi ro trong nhóm đang chọn." : risksComplete ? "Chưa phát hiện điểm rủi ro đáng kể." : "Đánh giá rủi ro chưa hoàn tất."}</p>}
          </section>
        </div>
        <section className={`${workspaceStyles.documentPane} min-w-0 min-h-0 grid ${showAiContext ? "grid-rows-[auto_auto_minmax(0,1fr)]" : "grid-rows-[auto_auto_minmax(390px,1fr)]"} [@media_(max-width:_1080px)]:block`} id={`${sectionId}-document`} aria-label="Nội dung hợp đồng">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e8ef] bg-[#fbfcfe] px-5 py-4">
            <div className="min-w-0"><h3 className="m-0 text-ui-section font-semibold">Nội dung hợp đồng</h3><p className="mb-0 mt-1 max-w-[360px] truncate text-ui-meta text-[#778398]">{result.contract.currentVersion?.fileName ?? result.contract.title}</p></div>
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#f0f4fa] px-2.5 py-1.5 text-ui font-semibold text-[#536881]"><Icon name={viewMode === "redacted" ? "shield" : "document"} className="h-4 w-4" />{viewMode === "redacted" ? "Đối chiếu nội bộ" : showOriginal ? "Đang xem file gốc" : "Nội dung đầy đủ"}</span>
          </div>
          <div className="border-b border-[#e4e8ef] bg-white px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3 [@media_(max-width:_580px)]:items-start [@media_(max-width:_580px)]:flex-col">
              <div className="inline-flex max-w-full gap-1 rounded-xl border border-[#dbe3ed] bg-[#f4f7fc] p-1" role="group" aria-label="Chế độ xem văn bản">
                {(["redacted", "text"] as const).map((mode) => <button type="button" key={mode} aria-pressed={viewMode === mode} onClick={() => selectDocumentMode(mode)} className={`min-h-10 rounded-lg border px-3 py-2 text-ui font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2864dc] ${viewMode === mode ? "border-[#c8d9f5] bg-white text-[#245abf] shadow-sm" : "border-transparent bg-transparent text-[#536881] hover:bg-white"}`}>{mode === "redacted" ? "Văn bản đã che" : "Văn bản đầy đủ"}</button>)}
              </div>
              {canShowOriginal && <button type="button" aria-pressed={showOriginal} onClick={() => selectDocumentMode("original")} className={`inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 py-2 text-ui font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2864dc] ${showOriginal ? "border-[#aac7fa] bg-[#eaf1ff] text-[#1e53b8]" : "border-[#dbe3ed] bg-white text-[#536881] hover:bg-[#f4f7fc]"}`}><Icon name="document" className="h-4 w-4" />Xem file gốc</button>}
            </div>
            {viewMode === "redacted" && <p className="mb-0 mt-3 text-ui-meta leading-5 text-[#607087]">Bản đã che vẫn giữ một phần thông tin để đối chiếu.</p>}
            <p className="mb-0 mt-3 text-ui leading-6 text-[#607087]">{viewMode === "redacted" ? "Giữ 4 số cuối tài khoản và 3 số cuối điện thoại để đối chiếu. Tên dùng nhãn thay thế; email giữ ký tự đầu và tên miền; CCCD, ngày sinh, địa chỉ được che hoàn toàn khi nhận diện." : showOriginal ? "File gốc hiển thị nội dung đầy đủ để đối chiếu và không được che trong chế độ này." : "Bạn đang xem văn bản đầy đủ trong phạm vi quyền đọc hợp đồng hiện tại."}</p>
            {viewMode === "redacted" && <p role="note" className="mb-0 mt-2 border-l-2 border-[#e1b96d] pl-3 text-ui-meta leading-6 text-[#79581b]">Chỉ áp dụng cho khung văn bản này. Tóm tắt, rủi ro, chat và file gốc có thể còn thông tin đầy đủ.</p>}
            <details className="mt-2 text-ui leading-6 text-[#607087]"><summary className="w-fit cursor-pointer font-semibold text-[#315eac]">Cách dữ liệu được bảo vệ</summary><p className="mb-0 mt-2">Việc nhận diện phụ thuộc cấu hình hợp đồng. Tên dùng nhãn Cá nhân 1 nhất quán trong bản xem. Email chỉ giữ ký tự đầu và tên miền, ví dụ m•••@gmail.com. Khi số cuối trùng nhau, nhãn Tài khoản hoặc Điện thoại giúp phân biệt các giá trị. Dấu chấm có độ dài cố định, không phản ánh số ký tự thật. Đây là bản đối chiếu nội bộ, không phải bản báo cáo chia sẻ đã che toàn bộ.</p></details>
          </div>
          <div className={`${workspaceStyles.documentBody} min-h-0 overflow-hidden [@media_(max-width:_1080px)]:h-[min(58vh,650px)] [@media_(max-width:_1080px)]:min-h-[390px]`}>
            {showOriginal && contractId && mimeType ? originalTarget ? <FullDocument query={fullQuery}><OriginalContractPreview contractId={contractId} mimeType={mimeType} fileName={result.contract.currentVersion?.fileName} target={previewTarget} /></FullDocument> : <OriginalContractPreview contractId={contractId} mimeType={mimeType} fileName={result.contract.currentVersion?.fileName} /> :
              <div ref={contractBodyRef} className="h-full overflow-y-auto scroll-smooth p-[26px] [@media_(max-width:_580px)]:p-[18px] motion-reduce:scroll-auto">
                {viewMode === "redacted" ? <RedactedDocument data={redactedQuery.data} isPending={redactedQuery.isPending && Boolean(contractId)} isError={redactedQuery.isError} isFetching={redactedQuery.isFetching} onRetry={() => { void redactedQuery.refetch(); }} /> : <FullDocument query={fullQuery}><div className="text-[#263750] [font-family:Georgia,'Times_New_Roman',serif] text-ui-document leading-[1.85] [overflow-wrap:anywhere] whitespace-pre-wrap">{contractParts}</div></FullDocument>}
              </div>}
          </div>
        </section>
      </div>
      {disclosure && <DocumentDisclosureDialog mode={disclosure.mode} onCancel={() => setDisclosure(null)} onConfirm={() => { applyDocumentMode(disclosure.mode, disclosure.clauseIndex); setDisclosure(null); }} />}
      {contractId && <KeyTerms contractId={contractId} />}
      {contractId && <ContractChat key={contractId} contractId={contractId} canAsk={canAsk} />}
      <p className="text-[#8a94a3] [border-top:1px_solid_#edf0f4] [background:#fafbfc] text-ui-meta text-right m-0 px-[22px] py-[9px]">Kết quả do AI hỗ trợ, không thay thế ý kiến tư vấn pháp lý chuyên môn.</p>
    </section>
  );
}
