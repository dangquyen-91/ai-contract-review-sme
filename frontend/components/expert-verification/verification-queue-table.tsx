import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { VerificationWorkspaceLink } from "./verification-workspace-link";
import {
  verificationDate,
  verificationStatuses,
} from "@/lib/review/verification-display";
import { contractTypeLabels } from "@/config/contract-display";
import type { VerificationQueueItem } from "@/types/verification-workspace";

function Action({ item }: { item: VerificationQueueItem }) {
  return item.contractId ? (
    <Button asChild size="sm" variant="outline">
      <VerificationWorkspaceLink href={`/expert-verification/${item.reviewId}`}>
        {item.status === "in_progress" ? "Tiếp tục kiểm tra" : "Xem yêu cầu"}
        <ArrowRight aria-hidden="true" />
      </VerificationWorkspaceLink>
    </Button>
  ) : (
    <span className="text-ui-meta text-muted-foreground">
      Không còn khả dụng
    </span>
  );
}
function Status({ item }: { item: VerificationQueueItem }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-ui-meta ${verificationStatuses[item.status].tone}`}
    >
      {verificationStatuses[item.status].label}
    </span>
  );
}
export function VerificationQueueTable({
  items,
}: {
  items: VerificationQueueItem[];
}) {
  return (
    <div className="bg-muted/20 px-3 lg:bg-card lg:px-0">
      <Table className="border-separate border-spacing-y-3 lg:border-collapse lg:border-spacing-y-0">
        <TableHeader className="hidden lg:table-header-group">
          <TableRow>
            <TableHead>Hợp đồng</TableHead>
            <TableHead>Người gửi</TableHead>
            <TableHead>Thời gian gửi</TableHead>
            <TableHead>Trạng thái</TableHead>
            <TableHead>
              <span className="sr-only">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => {
            const sender =
              typeof item.requestedBy === "object"
                ? item.requestedBy?.name || "Tài khoản không còn khả dụng"
                : "Người gửi";
            return (
              <TableRow key={item._id} data-verification-row={item._id}>
                <TableCell className="min-w-0 whitespace-normal max-lg:rounded-xl max-lg:border max-lg:border-border max-lg:bg-card max-lg:p-4 lg:min-w-48 lg:max-w-80">
                  <h3 className="m-0 break-words text-ui font-semibold [overflow-wrap:anywhere]">
                    {item.contractId?.title || "Hợp đồng không còn khả dụng"}
                  </h3>
                  <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">
                    {contractTypeLabels[item.contractId?.type ?? ""] ??
                      "Chưa xác định loại"}
                  </p>
                  <div className="mt-3 space-y-2 lg:hidden">
                    <Status item={item} />
                    <p className="m-0 text-ui-meta text-muted-foreground">
                      Người gửi: {sender}
                    </p>
                    <p className="m-0 text-ui-meta text-muted-foreground">
                      Gửi {verificationDate(item.requestedAt)}
                    </p>
                  </div>
                  <details className="mt-2 text-ui-meta">
                    <summary className="cursor-pointer font-medium text-primary">
                      Ghi chú ưu tiên
                    </summary>
                    <p className="mb-0 mt-1 whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                      {item.requestNote ||
                        "Người gửi không kèm ghi chú ưu tiên."}
                    </p>
                  </details>
                  <div className="mt-3 lg:hidden">
                    <Action item={item} />
                  </div>
                </TableCell>
                <TableCell className="hidden whitespace-normal lg:table-cell">
                  {sender}
                </TableCell>
                <TableCell className="hidden min-w-44 text-ui-meta lg:table-cell">
                  {verificationDate(item.requestedAt)}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Status item={item} />
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <Action item={item} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
