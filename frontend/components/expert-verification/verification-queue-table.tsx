import { ArrowRight, FileText, MessageSquareText } from "lucide-react";
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
  VerificationListDate,
  VerificationListPerson,
} from "./verification-list-meta";
import {
  verificationDate,
  verificationStatuses,
} from "@/lib/review/verification-display";
import { contractTypeLabels } from "@/config/contract-display";
import type { VerificationQueueItem } from "@/types/verification-workspace";

function Action({ item }: { item: VerificationQueueItem }) {
  return item.contractId ? (
    <Button
      asChild
      size="sm"
      variant="outline"
      className="h-9 w-full gap-1 border-[#dce3ed] bg-white text-xs text-[#315eac] shadow-none hover:border-[#abc3e8] hover:bg-[#f2f6fd] has-[>svg]:px-2 xl:w-auto"
    >
      <VerificationWorkspaceLink href={`/expert-verification/${item.reviewId}`}>
        {item.status === "in_progress" ? "Tiếp tục kiểm tra" : "Xem yêu cầu"}
        <ArrowRight className="size-3.5" aria-hidden="true" />
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
      title={verificationStatuses[item.status].label}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-5 ${
        item.status === "requested"
          ? "bg-[#fff5e5] text-[#95631c]"
          : "bg-[#edf3fd] text-[#315eac]"
      }`}
    >
      <span
        className="size-1.5 shrink-0 rounded-full bg-current"
        aria-hidden="true"
      />
      {item.status === "requested"
        ? "Chờ tiếp nhận"
        : item.status === "in_progress"
          ? "Đang kiểm tra"
          : verificationStatuses[item.status].label}
    </span>
  );
}
export function VerificationQueueTable({
  items,
}: {
  items: VerificationQueueItem[];
}) {
  return (
    <div className="bg-[#f8fafc] px-3 xl:bg-white xl:px-0">
      <Table className="w-full table-fixed border-separate border-spacing-y-3 xl:border-collapse xl:border-spacing-y-0">
        <TableHeader className="hidden bg-[#fafbfd] xl:table-header-group">
          <TableRow className="border-[#e9edf3] hover:bg-transparent">
            <TableHead className="h-11 w-[30%] pl-6 text-xs font-medium text-[#7a8698]">
              Hợp đồng
            </TableHead>
            <TableHead className="w-[18%] text-xs font-medium text-[#7a8698]">
              Người gửi
            </TableHead>
            <TableHead className="w-[16%] text-xs font-medium text-[#7a8698]">
              Thời gian gửi
            </TableHead>
            <TableHead className="w-[17%] text-xs font-medium text-[#7a8698]">
              Trạng thái
            </TableHead>
            <TableHead className="w-[19%] pr-6">
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
              <TableRow
                key={item._id}
                data-verification-row={item._id}
                className="border-[#e9edf3] align-top hover:bg-[#fafbfd]"
              >
                <TableCell className="min-w-0 whitespace-normal max-xl:rounded-xl max-xl:border max-xl:border-[#e1e5ec] max-xl:bg-white max-xl:p-4 xl:py-5 xl:pl-6 xl:pr-5">
                  <div className="flex items-start gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e2eaf6] bg-[#f2f6fd] text-[#5279b3]">
                      <FileText className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="m-0 break-words text-sm font-semibold leading-6 text-[#28364c] [overflow-wrap:anywhere]">
                        {item.contractId?.title ||
                          "Hợp đồng không còn khả dụng"}
                      </h3>
                      <p className="mb-0 mt-1 text-xs leading-5 text-[#7a8698]">
                        {contractTypeLabels[item.contractId?.type ?? ""] ??
                          "Chưa xác định loại"}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 space-y-2 xl:hidden">
                    <Status item={item} />
                    <p className="m-0 break-words text-sm text-[#65738a] [overflow-wrap:anywhere]">
                      Người gửi: {sender}
                    </p>
                    <p className="m-0 text-xs leading-5 text-[#7a8698]">
                      Gửi {verificationDate(item.requestedAt)}
                    </p>
                  </div>
                  {item.requestNote ? (
                    <details className="mt-3 text-xs xl:ml-[52px]">
                      <summary className="cursor-pointer rounded-sm font-medium leading-5 text-[#5279b3] focus-visible:outline-2 focus-visible:outline-[#315eac]">
                        <MessageSquareText
                          className="mr-1 inline size-3.5 align-[-2px]"
                          aria-hidden="true"
                        />
                        Ghi chú ưu tiên
                      </summary>
                      <p className="mb-0 mt-2 whitespace-pre-wrap break-words rounded-lg border border-[#e9edf3] bg-[#f8fafc] p-3 leading-5 text-[#65738a] [overflow-wrap:anywhere]">
                        {item.requestNote}
                      </p>
                    </details>
                  ) : (
                    <p className="mb-0 mt-2 text-xs text-[#8792a2] xl:ml-[52px]">
                      Không kèm ghi chú
                    </p>
                  )}
                  <div className="mt-4 border-t border-[#eef1f5] pt-3 xl:hidden">
                    <Action item={item} />
                  </div>
                </TableCell>
                <TableCell className="hidden whitespace-normal py-5 xl:table-cell">
                  <VerificationListPerson name={sender} />
                </TableCell>
                <TableCell className="hidden whitespace-normal py-5 xl:table-cell">
                  <VerificationListDate value={item.requestedAt} />
                </TableCell>
                <TableCell className="hidden whitespace-normal py-5 xl:table-cell">
                  <Status item={item} />
                </TableCell>
                <TableCell className="hidden py-5 pr-6 text-right xl:table-cell">
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
