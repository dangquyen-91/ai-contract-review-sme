import { analysisCoverageNotes } from "@/lib/review/analysis-coverage";
import type { CheckCoverage } from "@/types/contracts";
import styles from "@/styles/review/review-design.module.css";

function CoverageList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null;
  return (
    <section>
      <h4 className="m-0 text-ui-caption font-semibold text-foreground">{title}</h4>
      <ul className="mb-0 mt-2 list-disc space-y-1 pl-4 text-muted-foreground sm:columns-2 sm:gap-x-8">
        {items.map((item) => <li key={item} className="break-inside-avoid">{item}</li>)}
      </ul>
    </section>
  );
}

export function ReviewCoverage({ coverage }: { coverage?: CheckCoverage | null }) {
  if (!coverage) return null;
  const notes = analysisCoverageNotes({ checkCoverage: coverage });
  const applicable = coverage.checks - coverage.notApplicable;
  const statuses = [
    { label: "đạt", value: coverage.passed, color: "bg-emerald-500", text: "text-emerald-700" },
    { label: "không đạt", value: coverage.failed, color: "bg-rose-400", text: "text-rose-700" },
    { label: "chưa xác minh", value: coverage.unverified, color: "bg-amber-200", text: "text-amber-700" },
    { label: "không kiểm tra được", value: coverage.notChecked, color: "bg-amber-400", text: "text-amber-700" },
  ];
  const shown = statuses.filter((item) => item.value > 0);

  return (
    <details className={`${styles.scope} ${styles.coverage}`}>
      <summary className={styles.coverageSummary}>
        <span className="ml-1 inline-flex max-w-full flex-wrap items-center gap-x-3 gap-y-1 align-middle">
          <span>Đã kiểm {applicable} tiêu chí:</span>
          {shown.map((item, i) => (
            <span key={item.label} className={`font-medium tabular-nums ${item.text}`}>
              {i > 0 && <span aria-hidden="true" className="mr-3 font-normal text-muted-foreground">·</span>}
              {item.value} {item.label}
            </span>
          ))}
        </span>
      </summary>
      <div className="mt-4 space-y-4">
        {applicable > 0 && (
          <div aria-hidden="true" className={styles.coverageBar}>
            {shown.map((item) => <span key={item.label} className={item.color} style={{ flexGrow: item.value, flexBasis: 0 }} />)}
          </div>
        )}
        <p className="m-0 text-muted-foreground">
          {coverage.notApplicable > 0 && `${coverage.notApplicable} tiêu chí không áp dụng cho hợp đồng này nên không tính. `}
          Ngoài ra có {coverage.documentChecks} kiểm tra tự động trên toàn văn (chỗ trống, dẫn chiếu, số tiền, từ ngữ mơ hồ…).
        </p>
        {notes.length > 0 && (
          <div role="note" className="border-l-2 border-amber-300 bg-amber-50 px-3.5 py-2 text-ui-caption leading-relaxed text-amber-800">
            {notes.map((note) => <p key={note} className="m-0">{note}</p>)}
          </div>
        )}
        <CoverageList
          title="Không kiểm tra được"
          items={(coverage.notCheckedItems ?? []).map((item) => `${item.title}${item.reason ? `: ${item.reason}` : ""}`)}
        />
        <CoverageList title={`Đã đạt (${coverage.passed})`} items={(coverage.passedItems ?? []).map((item) => item.title)} />
        <p className="m-0 text-muted-foreground">Kết quả phản ánh các tiêu chí đã kiểm tra, không bao quát mọi vấn đề của hợp đồng.</p>
      </div>
    </details>
  );
}
