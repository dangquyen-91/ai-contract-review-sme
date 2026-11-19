import { analysisCoverageNotes } from "@/lib/review/analysis-coverage";
import type { CheckCoverage } from "@/types/contracts";
import styles from "@/styles/review/review-design.module.css";

export function ReviewCoverage({ coverage }: { coverage?: CheckCoverage | null }) {
  if (!coverage) return null;
  const notes = analysisCoverageNotes({ checkCoverage: coverage });
  const statuses = [
    { label: "Đạt", value: coverage.passed, color: "bg-emerald-500", text: "text-emerald-700" },
    { label: "Không đạt", value: coverage.failed, color: "bg-rose-400", text: "text-rose-700" },
    { label: "Không áp dụng", value: coverage.notApplicable, color: "bg-slate-300", text: "text-muted-foreground" },
    { label: "Không kiểm tra được", value: coverage.notChecked, color: "bg-amber-400", text: "text-amber-700" },
    { label: "Chưa xác minh", value: coverage.unverified, color: "bg-amber-200", text: "text-amber-700" },
  ];
  const total = statuses.reduce((sum, item) => sum + item.value, 0);

  return (
    <details className={`${styles.scope} ${styles.coverage}`}>
      <summary className={styles.coverageSummary}>
        <span className="ml-1 inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 align-middle">
          <span>Phạm vi rà soát <span className="text-muted-foreground">/</span> {coverage.checks} phép kiểm</span>
          <span className="font-medium text-emerald-700">{coverage.passed} đạt</span>
          {coverage.notChecked + coverage.unverified > 0 && <span className="text-amber-700">{coverage.notChecked + coverage.unverified} cần làm rõ</span>}
        </span>
      </summary>
      <div className="mt-4 space-y-4">
        {total > 0 && (
          <div aria-hidden="true" className={styles.coverageBar}>
            {statuses.filter((item) => item.value > 0).map((item) => (
              <span key={item.label} className={item.color} style={{ flexGrow: item.value, flexBasis: 0 }} />
            ))}
          </div>
        )}
        <dl className="m-0 grid gap-x-5 sm:grid-cols-2">
          {statuses.map((item) => (
            <div key={item.label} className={styles.coverageMetric}>
              <dt className="flex items-center gap-2 text-muted-foreground">
                <span aria-hidden="true" className={`size-1.5 rounded-full ${item.color}`} />{item.label}
              </dt>
              <dd className={`m-0 font-semibold tabular-nums ${item.text}`}>{item.value}</dd>
            </div>
          ))}
        </dl>
        {notes.length > 0 && (
          <div role="note" className="border-l-2 border-amber-300 bg-amber-50 px-3.5 py-2 text-ui-caption leading-relaxed text-amber-800">
            {notes.map((note) => <p key={note} className="m-0">{note}</p>)}
          </div>
        )}
        {!!coverage.notCheckedItems?.length && (
          <ul className="m-0 space-y-2 pl-4 text-muted-foreground">
            {coverage.notCheckedItems.map((item) => (
              <li key={item.code}>
                <strong className="font-medium text-foreground">{item.title}</strong>{item.reason ? `: ${item.reason}` : ""}
              </li>
            ))}
          </ul>
        )}
        <p className="m-0 text-muted-foreground">Kết quả phản ánh các tiêu chí đã kiểm tra, không bao quát mọi vấn đề của hợp đồng.</p>
      </div>
    </details>
  );
}
