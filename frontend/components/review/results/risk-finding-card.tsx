"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { riskCodeLabel } from "@/config/risk-display";
import type { RiskFinding } from "@/types/contracts";

const tones = {
  high: { label: "Rủi ro cao", card: "border-rose-200 border-l-rose-600", badge: "bg-rose-50 text-rose-800" },
  medium: { label: "Rủi ro trung bình", card: "border-border border-l-amber-500", badge: "bg-amber-50 text-amber-900" },
  low: { label: "Rủi ro thấp", card: "border-border border-l-blue-300", badge: "bg-blue-50 text-blue-800" },
};

function firstPoint(points?: string[]) {
  return points?.find((point) => point.trim())?.trim();
}

export function RiskFindingCard({ finding, expanded, detailId, onToggle, onJump, jumpLabel, children }: {
  finding: RiskFinding;
  expanded: boolean;
  detailId: string;
  onToggle: () => void;
  onJump?: () => void;
  jumpLabel: string;
  children: ReactNode;
}) {
  const tone = tones[finding.severity];
  const riskType = riskCodeLabel(finding.riskCode);
  const preview = [
    { label: "Vấn đề", text: firstPoint(finding.problem) ?? "Chưa có mô tả chi tiết cho vấn đề này." },
    { label: "Ảnh hưởng", text: firstPoint(finding.consequences) ?? "Chưa có mô tả ảnh hưởng trong kết quả phân tích." },
    { label: "Đề xuất", text: firstPoint(finding.recommendations) ?? (finding.proposedRevision?.revisedText.trim() || "Chưa có đề xuất xử lý trong kết quả phân tích.") },
  ];

  return <li data-risk-severity={finding.severity} className={`min-w-0 rounded-xl border border-l-4 bg-card p-4 ${tone.card}`}>
    <div className="flex flex-wrap items-center gap-2">
      <span className={`inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-ui-caption font-semibold ${tone.badge}`}>
        <Icon name="shield" className="size-3.5 shrink-0" />{tone.label}
      </span>
      {riskType && (
        <span data-risk-code={finding.riskCode} className="inline-flex w-fit items-center rounded-md border border-border px-2 py-1 text-ui-caption font-medium text-muted-foreground">
          {riskType}
        </span>
      )}
    </div>
    <h4 className="mb-0 mt-3 break-words text-ui-section font-semibold leading-6 text-card-foreground [overflow-wrap:anywhere]">{finding.title}</h4>
    {finding.findingType === "missing_clause" && <p className="mb-0 mt-2 text-ui-meta leading-5 text-muted-foreground">Điều khoản này chưa có trong hợp đồng.</p>}
    {!expanded && <dl className="mb-0 mt-3 grid gap-3">
      {preview.map(({ label, text }) => <div key={label} className="min-w-0">
        <dt className="text-ui-meta font-semibold text-card-foreground">{label}</dt>
        <dd className="m-0 mt-1 line-clamp-2 break-words text-ui leading-[1.65] text-muted-foreground [overflow-wrap:anywhere]">{text}</dd>
      </div>)}
    </dl>}
    <div className="mt-4 flex min-w-0 flex-wrap items-start gap-2 border-t border-border pt-3">
      <Button variant="outline" size="sm" className="h-auto min-h-9 max-w-full whitespace-normal text-left leading-5" type="button" aria-expanded={expanded} aria-controls={expanded ? detailId : undefined} onClick={onToggle}>{expanded ? "Ẩn chi tiết" : "Xem phân tích và đề xuất"}</Button>
      {onJump && <Button variant="ghost" size="sm" className="h-auto min-h-9 max-w-full whitespace-normal text-left leading-5 text-primary" type="button" onClick={onJump} aria-label={jumpLabel}>Xem vị trí <Icon name="arrow" className="size-4 shrink-0" /></Button>}
    </div>
    {expanded && <div id={detailId}>{children}</div>}
  </li>;
}
