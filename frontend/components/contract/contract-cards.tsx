import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { contractStatusLabels, contractStatusTones } from "@/config/contract-display";
import type { DashboardContract } from "@/types/contracts";
import { RiskBadge } from "./risk-badge";

export function ContractCards({ contracts, onReview, isReviewing, highlightId }: {
  contracts: DashboardContract[];
  onReview: (contract: DashboardContract) => void;
  isReviewing: boolean;
  highlightId?: string;
}) {
  return (
    <ul className="m-0 mt-4 grid list-none gap-3 p-0">
      {contracts.map((contract) => {
        const id = contract.id ?? contract._id;
        const highlighted = Boolean(highlightId && highlightId === id);
        const date = new Date(contract.updatedAt);
        const disabled = !id || isReviewing || contract.status === "archived";
        return (
          <li key={id ?? contract.title} className={`space-y-3 rounded-lg border bg-card p-4 ${highlighted ? "border-emerald-200 bg-emerald-50/30" : "border-border"}`}>
            <div className="flex items-start gap-2.5">
              <Icon name="document" className="mt-0.5 size-4 shrink-0 text-primary" />
              <h3 className="m-0 min-w-0 break-words text-ui font-semibold leading-6 [overflow-wrap:anywhere]">{contract.title}</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {highlighted && <Badge variant="success">Vừa tải lên</Badge>}
              <Badge variant={contractStatusTones[contract.status]}>{contractStatusLabels[contract.status]}</Badge>
              {contract.status === "reviewed" && <RiskBadge contract={contract} />}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <time dateTime={contract.updatedAt} className="text-ui-meta text-muted-foreground">
                {Number.isNaN(date.getTime()) ? "Chưa rõ ngày cập nhật" : date.toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}
              </time>
              <Button variant="outline" size="sm" onClick={() => onReview(contract)} disabled={disabled}>
                {contract.status === "reviewed" ? "Xem báo cáo" : contract.status === "processing" ? "Theo dõi xử lý" : contract.status === "archived" ? "Đã lưu trữ" : "Bắt đầu rà soát"}
                <Icon name="arrow" />
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
