"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RiskDetails } from "@/components/review/results/risk-details";
import { RiskFindingCard } from "@/components/review/results/risk-finding-card";
import workspaceStyles from "@/styles/review/review-workspace.module.css";
import type { ContractReviewResult, RiskFinding } from "@/types/contracts";

const severityLabels = { high: "Rủi ro cao", medium: "Rủi ro trung bình", low: "Rủi ro thấp" };

const severityOrder = { high: 0, medium: 1, low: 2 };

function findingClauseIndex(finding: RiskFinding, clauses: ContractReviewResult["clauses"]): number | null {
  if (finding.findingType === "missing_clause") return null;
  const linked = clauses.find((clause) => (clause.id ?? clause._id) === finding.clauseId);
  return linked?.index ?? finding.clause?.index ?? null;
}

type ReviewAnalysisPaneProps = {
  result: ContractReviewResult;
  sectionId: string;
  isDocx: boolean;
  onJumpToClause: (index: number) => void;
};

export function ReviewAnalysisPane({ result, sectionId, isDocx, onJumpToClause }: ReviewAnalysisPaneProps) {
  const [expandedFinding, setExpandedFinding] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<"all" | RiskFinding["severity"]>("all");
  const clauses = result.clauses;
  const contractId = result.contract.id ?? result.contract._id;
  const summaryComplete = result.contract.currentVersion?.summaryStatus === "completed";
  const risksComplete = result.contract.currentVersion?.riskDetectionStatus === "completed";
  const findings = result.findings;
  const visibleFindings = findings
    .filter((finding) => severityFilter === "all" || finding.severity === severityFilter)
    .sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]
      || (findingClauseIndex(a, result.clauses) ?? Number.MAX_SAFE_INTEGER)
        - (findingClauseIndex(b, result.clauses) ?? Number.MAX_SAFE_INTEGER));

  return (
    <div id={`${sectionId}-analysis`} className={`min-w-0 [border-right:1px_solid_#e4e8ef] [@media_(max-width:_1080px)]:[border-right:0] [@media_(max-width:_1080px)]:[border-bottom:1px_solid_#e4e8ef] ${workspaceStyles.analysisPane}`}>
      <article className="[border-bottom:1px_solid_#e4e8ef] [background:#fbfcff] px-[22px] py-5 [&_h3]:text-ui-section [&_h3]:font-semibold [&_h3]:m-0 [&_p]:text-[#5e6e84] [&_p]:text-ui [&_p]:leading-[1.7] [&_p]:whitespace-pre-wrap [&_p]:mt-[9px] [&_p]:mb-0 [&_p]:mx-0 [&_ul]:text-[#5e6e84] [&_ul]:text-ui [&_ul]:leading-[1.7] [&_ul]:mt-[9px] [&_ul]:mb-0 [&_ul]:mx-0 [&_ul]:pl-[18px] [&_li_+_li]:mt-[5px]">
        <h3>Tóm tắt điều hành</h3>
        {result.contract.currentVersion?.summaryPoints?.length ?
          <ul>{result.contract.currentVersion.summaryPoints.map((point, index) => <li key={index}>{point}</li>)}</ul> :
          <p>{summaryComplete ? "Không có điểm tóm tắt để hiển thị." : "Tóm tắt chưa hoàn tất. Bạn có thể thử rà soát lại hợp đồng."}</p>}
        {!!result.contract.currentVersion?.overallAssessment?.length && <div className="[border-top:1px_solid_#e4e8ef] mt-[15px] pt-3 [&_h4]:text-[#31445f] [&_h4]:text-ui-section [&_h4]:font-semibold [&_h4]:m-0"><h4>Đánh giá tổng quan</h4><ul>{result.contract.currentVersion.overallAssessment.map((point, index) => <li key={index}>{point}</li>)}</ul></div>}
      </article>
      <section className="px-[22px] pb-[25px] pt-5" aria-labelledby="review-findings-heading">
        <div className="[&_h3]:text-ui-section [&_h3]:font-semibold [&_h3]:m-0 flex items-center gap-[7px] [&>_span]:grid [&>_span]:min-w-5 [&>_span]:h-5 [&>_span]:place-items-center [&>_span]:text-[#2859aa] [&>_span]:[background:#eaf1ff] [&>_span]:text-ui-caption [&>_span]:font-bold [&>_span]:rounded-[10px]"><h3 id="review-findings-heading">Điểm cần lưu ý</h3><span>{findings.length}</span></div>
        {findings.length > 0 && <p className="mb-0 mt-2 text-ui-meta leading-5 text-muted-foreground">Sắp xếp theo mức độ: Cao → Trung bình → Thấp. Mỗi mục hiển thị ý chính; mở chi tiết để xem toàn bộ phân tích.</p>}
        <div role="group" className={workspaceStyles.filters} aria-label="Lọc mức rủi ro">{(["all", "high", "medium", "low"] as const).map((severity) => <Button variant={severityFilter === severity ? "default" : "outline"} size="sm" type="button" key={severity} aria-pressed={severityFilter === severity} onClick={() => { setSeverityFilter(severity); setExpandedFinding(null); }}>{severity === "all" ? "Tất cả" : severityLabels[severity]} · {severity === "all" ? findings.length : findings.filter((finding) => finding.severity === severity).length}</Button>)}</div>
        {visibleFindings.length ? <ul className="m-0 mt-4 grid list-none gap-3 p-0">{visibleFindings.map((finding) => {
          const clauseIndex = findingClauseIndex(finding, clauses);
          const canJump = clauseIndex !== null && clauses.some((clause) => clause.index === clauseIndex);
          const findingKey = finding.id ?? finding._id ?? `${finding.title}-${findings.indexOf(finding)}`;
          const expanded = expandedFinding === findingKey;
          return <RiskFindingCard key={findingKey} finding={finding} expanded={expanded}
            detailId={`${sectionId}-finding-${findings.indexOf(finding)}`}
            onToggle={() => setExpandedFinding(expanded ? null : findingKey)}
            onJump={canJump ? () => onJumpToClause(clauseIndex) : undefined}
            jumpLabel={`${finding.title}. ${isDocx ? "Xem vị trí trong file gốc" : "Xem vị trí trong văn bản đầy đủ"}`}>
            <RiskDetails contractId={contractId} finding={finding} allowProposalEditing={isDocx && canJump} />
          </RiskFindingCard>;
        })}</ul> : <p className="text-[#66758a] text-ui mt-3.5 mb-0 mx-0">{severityFilter !== "all" ? "Không có rủi ro trong nhóm đang chọn." : risksComplete ? "Chưa phát hiện điểm rủi ro đáng kể." : "Đánh giá rủi ro chưa hoàn tất."}</p>}
      </section>
    </div>
  );
}
