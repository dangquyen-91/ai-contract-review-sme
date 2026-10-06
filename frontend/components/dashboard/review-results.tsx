"use client";

import { useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import { ContractChat, RiskDetails } from "@/components/dashboard/review-extras";
import type { ContractClause, ContractReviewResult, RiskFinding } from "@/types/contracts";
import styles from "@/styles/review-results.module.css";

const severityLabels = { high: "Rủi ro cao", medium: "Trung bình", low: "Rủi ro thấp" };

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
      parts.push(<span key={`gap-${previousEnd}`} className={styles.plainText}>{text.slice(previousEnd, clause.start)}</span>);
    }
    parts.push(
      <span
        key={`clause-${clause.index}`}
        className={`${styles.contractClause} ${activeClause === clause.index ? styles.activeClause : ""}`}
        data-clause-index={clause.index}
        tabIndex={-1}
      >{text.slice(clause.start, clause.end)}</span>,
    );
    return parts;
  });
  const finalEnd = located.at(-1)?.end ?? 0;
  if (text && finalEnd < text.length) {
    contractParts.push(<span key={`gap-${finalEnd}`} className={styles.plainText}>{text.slice(finalEnd)}</span>);
  }

  return (
    <section className={styles.review} aria-live="polite">
      <header className={styles.header}>
        <div><p className={styles.eyebrow}>Kết quả AI review</p><h2>{result.contract.title}</h2></div>
        <span className={highCount ? styles.highRisk : styles.safeRisk}>
          <Icon name="shield" />{highCount ? `${highCount} rủi ro cao` : "Không có rủi ro cao"}
        </span>
      </header>
      <div className={styles.columns}>
        <div className={styles.analysis}>
          <article className={styles.summary}>
            <h3>Tóm tắt điều hành</h3>
            {result.contract.currentVersion?.summaryPoints?.length ?
              <ul>{result.contract.currentVersion.summaryPoints.map((point, index) => <li key={index}>{point}</li>)}</ul> :
              <p>AI đã phân tích hợp đồng. Xem các điểm cần lưu ý bên dưới.</p>}
            {!!result.contract.currentVersion?.overallAssessment?.length && <div className={styles.assessment}><h4>Đánh giá tổng quan</h4><ul>{result.contract.currentVersion.overallAssessment.map((point, index) => <li key={index}>{point}</li>)}</ul></div>}
          </article>
          <section className={styles.findings} aria-labelledby="review-findings-heading">
            <div className={styles.sectionTitle}><h3 id="review-findings-heading">Điểm cần lưu ý</h3><span>{findings.length}</span></div>
            {findings.length ? <ul>{findings.map((finding, index) => {
              const clauseIndex = findingClauseIndex(finding, clauses);
              const canJump = clauseIndex !== null && visibleIndices.has(clauseIndex);
              const findingKey = finding.id ?? finding._id ?? `${finding.title}-${index}`;
              const expanded = expandedFinding === findingKey;
              return <li key={finding.id ?? finding._id ?? `${finding.title}-${index}`}>
                <span className={`${styles.severity} ${styles[finding.severity]}`}>{severityLabels[finding.severity]}</span>
                <div className={styles.findingContent}>{canJump ? <button
                  type="button"
                  className={`${styles.findingButton} ${activeClause === clauseIndex ? styles.selectedFinding : ""}`}
                  onClick={() => jumpToClause(clauseIndex)}
                  aria-label={`${finding.title}. Xem vị trí trong hợp đồng`}
                ><strong>{finding.title}</strong><span>{findingDescription(finding)}</span><em>Xem trong hợp đồng →</em></button> : <div className={styles.findingWithoutLink}><strong>{finding.title}</strong><p>{findingDescription(finding)}</p>{finding.findingType === "missing_clause" && <em>Điều khoản này chưa có trong hợp đồng.</em>}</div>}
                <button className={styles.detailToggle} type="button" aria-expanded={expanded} onClick={() => setExpandedFinding(expanded ? null : findingKey)}>{expanded ? "Ẩn chi tiết" : "Xem phân tích và đề xuất"}</button>
                {expanded && <RiskDetails contractId={contractId} finding={finding} onChange={replaceFinding} />}</div>
              </li>;
            })}</ul> : <p className={styles.empty}>Chưa phát hiện điểm rủi ro đáng kể.</p>}
          </section>
        </div>
        <section className={styles.document} aria-label="Nội dung hợp đồng">
          <div className={styles.documentHeader}><div><h3>Nội dung hợp đồng</h3><p>{result.contract.currentVersion?.fileName ?? result.contract.title}</p></div><span>{clauses.length} điều khoản</span></div>
          <div ref={contractBodyRef} className={styles.documentBody}>
            {text ? <div className={styles.fullText}>{contractParts}</div> : clauses.length ? clauses.map((clause) => <article key={clause.id ?? clause._id ?? clause.index} className={`${styles.fallbackClause} ${activeClause === clause.index ? styles.activeClause : ""}`} data-clause-index={clause.index} tabIndex={-1}><h4>{clause.title || `Điều khoản ${clause.index + 1}`}</h4><p>{clause.text}</p></article>) : <p className={styles.empty}>Chưa có nội dung hợp đồng để hiển thị.</p>}
          </div>
        </section>
      </div>
      {contractId && <ContractChat key={contractId} contractId={contractId} canAsk={canAsk} />}
      <p className={styles.disclaimer}>Kết quả do AI hỗ trợ, không thay thế ý kiến tư vấn pháp lý chuyên môn.</p>
    </section>
  );
}
