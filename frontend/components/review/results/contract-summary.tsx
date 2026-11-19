"use client";

import { Button } from "@/components/ui/button";
import type { ContractQuote, ContractReviewResult, SummarySource } from "@/types/contracts";
import { clauseLabel } from "@/lib/review/clause-label";
import styles from "@/styles/review/review-design.module.css";

export function ContractSummary({ points, sources, clauses, complete, onSource }: {
  points?: string[];
  sources?: SummarySource[];
  clauses?: Pick<ContractReviewResult["clauses"][number], "index" | "label">[];
  complete?: boolean;
  onSource?: (source: ContractQuote) => void;
}) {
  return (
    <section className={`${styles.scope} min-w-0`}>
      <h3 className={styles.sectionHeading}>Tóm tắt hợp đồng</h3>
      {points?.length ? (
        <ol className={styles.summaryList}>
          {points.map((point, index) => {
            const quotes = sources?.filter((source) => source.pointIndex === index) ?? [];
            return (
              <li key={index} className={styles.summaryRow}>
                <span aria-hidden="true" className={styles.summaryIndex}>{String(index + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className={styles.summaryText}>{point}</p>
                  {quotes.length > 0 && (
                    <details className="mt-1 text-ui-meta leading-6">
                      <summary className={`${styles.textAction} list-item w-fit`}>Xem nguồn ({quotes.length})</summary>
                      {quotes.map((source, quoteIndex) => (
                        <div key={quoteIndex} className={styles.sourceQuote}>
                          <blockquote className="m-0 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">“{source.quote}”</blockquote>
                          {onSource ? (
                            <Button type="button" variant="link" size="sm" className="h-auto px-0 py-1 text-xs text-primary" onClick={() => onSource(source)}>
                              Xem vị trí · {clauseLabel(clauses?.find((clause) => clause.index === source.clauseIndex) ?? { index: source.clauseIndex })}
                            </Button>
                          ) : <p className="m-0 text-muted-foreground">{clauseLabel(clauses?.find((clause) => clause.index === source.clauseIndex) ?? { index: source.clauseIndex })}</p>}
                        </div>
                      ))}
                    </details>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="mb-0 mt-3 text-ui-meta leading-6 text-muted-foreground">
          {complete ? "Chưa có ý tóm tắt đủ nguồn để hiển thị." : "Tóm tắt chưa hoàn tất."}
        </p>
      )}
    </section>
  );
}
