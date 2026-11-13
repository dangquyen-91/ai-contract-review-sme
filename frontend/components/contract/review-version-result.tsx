import Link from "next/link";
import { ArrowLeft, Download, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { contractRiskLabels, contractRiskTones } from "@/config/contract-display";
import { routes } from "@/config/routes";
import type { ContractReviewRun, ContractVersionSummary, RiskFinding } from "@/types/contracts";

const statusLabels: Record<ContractReviewRun["status"], string> = {
  queued: "Đang chờ",
  running: "Đang rà soát",
  completed: "Hoàn tất",
  failed: "Chưa hoàn tất",
  cancelled: "Đã dừng",
};

const severityOrder = { high: 0, medium: 1, low: 2 } as const;

function formatDateTime(value?: string) {
  if (!value) return null;
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function OldVersionBanner({ contractId, version, current }: {
  contractId: string;
  version: ContractVersionSummary;
  current?: ContractVersionSummary;
}) {
  return (
    <div role="note" className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-ui leading-6 text-amber-950">
      <TriangleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
      <div>
        <p className="m-0 font-semibold">Bạn đang xem kết quả của phiên bản cũ (phiên bản {version.versionNumber}).</p>
        <p className="m-0">
          Hợp đồng đã có phiên bản {current?.versionNumber ?? "mới hơn"}. Rà soát, hỏi đáp và chỉnh sửa đề xuất chỉ áp dụng cho phiên bản hiện tại.{" "}
          <Link className="font-medium underline" href={routes.contract(contractId)}>Mở phiên bản hiện tại</Link>
        </p>
      </div>
    </div>
  );
}

function FindingItem({ finding }: { finding: RiskFinding }) {
  const clause = finding.clause;
  return (
    <li className="space-y-2 rounded-lg border border-border bg-white p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={contractRiskTones[finding.severity]}>{contractRiskLabels[finding.severity]}</Badge>
        <h3 className="m-0 min-w-0 text-ui-section font-semibold [overflow-wrap:anywhere]">{finding.title}</h3>
      </div>
      {clause && (
        <p className="m-0 text-ui-meta text-muted-foreground">
          Điều khoản {clause.index + 1}{clause.title ? ` · ${clause.title}` : ""}
        </p>
      )}
      {finding.findingType === "missing_clause" && !clause && (
        <p className="m-0 text-ui-meta text-muted-foreground">Thiếu điều khoản trong hợp đồng</p>
      )}
      {finding.problem.length > 0 && (
        <ul className="m-0 list-disc space-y-1 pl-5 text-ui leading-6 text-slate-700">
          {finding.problem.map((point, index) => <li key={index}>{point}</li>)}
        </ul>
      )}
      {finding.recommendations.length > 0 && (
        <p className="m-0 text-ui leading-6 text-slate-700">
          <span className="font-medium text-slate-900">Đề xuất: </span>
          {finding.recommendations[0]}
        </p>
      )}
    </li>
  );
}

export function ReviewVersionResult({ contractId, run, version, current, findings }: {
  contractId: string;
  run: ContractReviewRun;
  version?: ContractVersionSummary;
  current?: ContractVersionSummary;
  findings: RiskFinding[];
}) {
  const counts = run.result?.findingCounts;
  const sorted = [...findings].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
  const expected = counts ? counts.high + counts.medium + counts.low : 0;
  const detailsMissing = run.status === "completed" && expected > 0 && sorted.length === 0;
  const started = formatDateTime(run.startedAt);
  const finished = formatDateTime(run.finishedAt);
  return (
    <section className="mx-auto max-w-5xl space-y-5 p-6">
      <Link className="inline-flex items-center gap-1.5 text-ui font-medium text-blue-700 hover:underline" href={routes.contract(contractId)}>
        <ArrowLeft aria-hidden="true" className="size-4" />
        Về hợp đồng
      </Link>
      <header className="space-y-2">
        <p className="m-0 text-[10px] font-bold uppercase tracking-[1.1px] text-[color:var(--accent)]">Lượt rà soát</p>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="m-0 text-2xl font-semibold">
            {version ? `Phiên bản ${version.versionNumber}` : "Kết quả rà soát"}
          </h1>
          {version?.isCurrent && <Badge variant="info">Phiên bản hiện tại</Badge>}
          {version && !version.isCurrent && <Badge variant="warning">Phiên bản cũ</Badge>}
        </div>
        {version?.note && <p className="m-0 text-ui text-slate-700">{version.note}</p>}
        <p className="m-0 text-ui-meta text-muted-foreground">
          {[statusLabels[run.status], started && `Bắt đầu ${started}`, finished && `Kết thúc ${finished}`].filter(Boolean).join(" · ")}
        </p>
      </header>
      {version && !version.isCurrent && <OldVersionBanner contractId={contractId} version={version} current={current} />}
      {run.error && <p role="alert" className="m-0 rounded-lg border border-red-200 bg-red-50 p-3 text-ui text-red-800">{run.error}</p>}
      {run.result?.summaryPoints && run.result.summaryPoints.length > 0 && (
        <div className="rounded-xl border border-border bg-white p-4">
          <h2 className="m-0 mb-2 text-ui-section font-semibold">Tóm tắt</h2>
          <ul className="m-0 list-disc space-y-1 pl-5 text-ui leading-6 text-slate-700">
            {run.result.summaryPoints.map((point, index) => <li key={index}>{point}</li>)}
          </ul>
        </div>
      )}
      {counts && (
        <div className="flex flex-wrap items-center gap-2 text-ui">
          <span className="font-semibold">Rủi ro phát hiện:</span>
          <Badge variant="danger">Cao {counts.high}</Badge>
          <Badge variant="warning">Trung bình {counts.medium}</Badge>
          <Badge variant="success">Thấp {counts.low}</Badge>
          {version && (
            <a
              className="ml-auto inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
              href={`/api/contracts/${contractId}/file?versionId=${version.id}`}
            >
              <Download aria-hidden="true" className="size-4" />
              Tải tệp phiên bản này
            </a>
          )}
        </div>
      )}
      {detailsMissing && (
        <p className="m-0 rounded-lg border border-border bg-slate-50 p-3 text-ui leading-6 text-slate-700">
          Chi tiết từng rủi ro không có sẵn cho lượt rà soát này vì lượt được tạo trước khi hệ thống lưu kết quả theo từng lượt. Số liệu tổng hợp ở trên vẫn đúng.
        </p>
      )}
      {sorted.length > 0 && (
        <ol className="m-0 list-none space-y-3 p-0">
          {sorted.map((finding) => <FindingItem key={finding._id ?? finding.id ?? finding.title} finding={finding} />)}
        </ol>
      )}
    </section>
  );
}
