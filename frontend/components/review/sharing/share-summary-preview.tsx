import { IssueSummary } from "@/components/review/results/issue-summary";
import { issueDisplay, issueGroups } from "@/config/issue-display";
import type { ContractShareSummary } from "@/types/contracts";

const headings = new Set(["TỔNG QUAN", "VẤN ĐỀ CẦN XỬ LÝ", "HƯỚNG XỬ LÝ ĐỀ XUẤT"]);

export function ShareSummaryPreview({ text, counts }: { text: string; counts?: ContractShareSummary["issueCounts"] }) {
  return (
    <article aria-label="Bản xem trước tóm tắt" className="space-y-3 rounded-xl border border-border bg-card p-4 text-ui leading-6 text-card-foreground sm:p-5">
      {counts && <IssueSummary counts={counts} />}
      {text.split(/\r?\n/).map((raw, index) => {
        const line = raw.trim();
        if (!line) return null;
        if (index === 0) return <p key={index} className="font-semibold">{line}</p>;
        if (headings.has(line)) return <h3 key={index} className="border-t border-border pt-4 text-ui-section font-semibold">{line}</h3>;
        const finding = line.match(/^\d+\.\s*\[([^\]]+)\]\s*(.*)$/);
        const group = finding && issueGroups.find((key) => issueDisplay[key].label === finding[1]);
        if (finding && group) {
          const display = issueDisplay[group];
          return <div key={index} className={`rounded-lg border border-l-[3px] border-border p-3 ${display.border}`}>
            <span className={`inline-flex rounded-md px-2 py-0.5 text-ui-caption font-semibold ${display.badge}`}>{display.label}</span>
            <p className="mb-0 mt-2 break-words font-medium">{finding[2]}</p>
          </div>;
        }
        if (line.startsWith("• ")) return <p key={index} className="flex items-start gap-2 text-muted-foreground"><span aria-hidden="true">•</span><span className="min-w-0 break-words">{line.slice(2)}</span></p>;
        return <p key={index} className="break-words text-muted-foreground">{line}</p>;
      })}
    </article>
  );
}
