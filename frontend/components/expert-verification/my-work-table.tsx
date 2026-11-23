"use client";

import {
  ArrowRight,
  FileText,
  LockKeyhole,
  MessageSquareText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { contractTypeLabels } from "@/config/contract-display";
import {
  verificationDate,
  verificationStatuses,
} from "@/lib/review/verification-display";
import { VerificationWorkspaceLink } from "./verification-workspace-link";
import {
  VerificationListDate,
  VerificationListPerson,
} from "./verification-list-meta";
import type { ExpertWorkItem } from "@/types/expert-work";

function WorkItemAction({ item }: { item: ExpertWorkItem }) {
  if (!item.available) {
    return (
      <span className="text-xs leading-5 text-[#7a8698]">
        Hợp đồng không còn khả dụng
      </span>
    );
  }
  return (
    <Button
      asChild
      variant="outline"
      size="sm"
      className="h-9 w-full gap-1 border-[#dce3ed] bg-white text-xs text-[#315eac] shadow-none hover:border-[#abc3e8] hover:bg-[#f2f6fd] has-[>svg]:px-2 xl:w-auto"
    >
      <VerificationWorkspaceLink
        href={`/expert-verification/${encodeURIComponent(item.reviewId)}${item.historical ? `?attempt=${item.attempt}` : ""}`}
      >
        {item.status === "in_progress" ? "Tiếp tục xử lý" : "Xem kết quả"}
        <ArrowRight className="size-3.5" aria-hidden="true" />
      </VerificationWorkspaceLink>
    </Button>
  );
}

function WorkStatus({ item }: { item: ExpertWorkItem }) {
  const labels = {
    in_progress: "Đang xử lý",
    approved: "Đã hoàn tất",
    returned: "Đã trả lại",
  };
  const tones = {
    in_progress: "bg-[#edf3fd] text-[#315eac]",
    approved: "bg-[#edf6f0] text-[#3a7752]",
    returned: "bg-[#fff5e5] text-[#95631c]",
  };
  return (
    <span
      title={verificationStatuses[item.status].label}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium leading-5 ${tones[item.status]}`}
    >
      <span
        className="size-1.5 shrink-0 rounded-full bg-current"
        aria-hidden="true"
      />
      {labels[item.status]}
    </span>
  );
}

function WorkDecision({ item }: { item: ExpertWorkItem }) {
  if (item.status === "in_progress") return null;
  return (
    <details className="mt-3 text-xs xl:ml-[52px]">
      <summary
        className={`cursor-pointer rounded-sm font-medium leading-5 focus-visible:outline-2 focus-visible:outline-[#315eac] ${item.status === "returned" ? "text-[#95631c]" : "text-[#3a7752]"}`}
      >
        <MessageSquareText
          className="mr-1 inline size-3.5 align-[-2px]"
          aria-hidden="true"
        />
        {item.status === "returned" ? "Lý do trả lại" : "Kết luận"}
      </summary>
      <p className="mb-0 mt-2 whitespace-pre-wrap break-words rounded-lg border border-[#e9edf3] bg-[#f8fafc] p-3 leading-5 text-[#65738a] [overflow-wrap:anywhere]">
        {item.decisionPreview ||
          "Mở kết quả để xem ghi chú và kết luận đầy đủ."}
      </p>
    </details>
  );
}

export function MyWorkTable({ items }: { items: ExpertWorkItem[] }) {
  return (
    <div className="bg-[#f8fafc] px-3 xl:bg-white xl:px-0">
      <Table className="w-full table-fixed border-separate border-spacing-y-3 xl:border-collapse xl:border-spacing-y-0">
        <TableHeader className="hidden bg-[#fafbfd] xl:table-header-group">
          <TableRow className="border-[#e9edf3] hover:bg-transparent">
            <TableHead className="h-11 w-[30%] pl-6 text-xs font-medium text-[#7a8698]">
              Hợp đồng / lần xác minh
            </TableHead>
            <TableHead className="w-[18%] text-xs font-medium text-[#7a8698]">
              Người gửi
            </TableHead>
            <TableHead className="w-[17%] text-xs font-medium text-[#7a8698]">
              Thời gian xử lý
            </TableHead>
            <TableHead className="w-[16%] text-xs font-medium text-[#7a8698]">
              Trạng thái
            </TableHead>
            <TableHead className="w-[19%] pr-6">
              <span className="sr-only">Thao tác</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow
              key={`${item.expertReviewId}:${item.attempt}`}
              data-verification-row={`${item.expertReviewId}:${item.attempt}`}
              className="border-[#e9edf3] hover:bg-[#fafbfd]"
            >
              <TableCell className="min-w-0 whitespace-normal max-xl:rounded-xl max-xl:border max-xl:border-[#e1e5ec] max-xl:bg-white max-xl:p-4 xl:py-5 xl:pl-6 xl:pr-5">
                <div className="flex items-start gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#e2eaf6] bg-[#f2f6fd] text-[#5279b3]">
                    <FileText className="size-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="m-0 break-words text-sm font-semibold leading-6 text-[#28364c] [overflow-wrap:anywhere]">
                      {item.title}
                    </h3>
                    <p className="mb-0 mt-1 text-xs leading-5 text-[#7a8698]">
                      {contractTypeLabels[item.contractType ?? ""] ??
                        "Chưa xác định loại"}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="rounded-md bg-[#f0f3f7] px-1.5 py-0.5 text-[11px] font-medium text-[#66778e]">
                        Lần {item.attempt}
                      </span>
                      {item.historical && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-[#8792a2]">
                          <LockKeyhole className="size-3" aria-hidden="true" />
                          Bản lưu chỉ đọc
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <WorkDecision item={item} />
                <div className="mt-4 space-y-3 xl:hidden">
                  <WorkStatus item={item} />
                  <VerificationListPerson
                    name={
                      item.requestedBy?.name ?? "Tài khoản không còn khả dụng"
                    }
                  />
                  <div className="space-y-1 text-xs leading-5 text-[#7a8698]">
                    <p className="m-0">
                      Nhận:{" "}
                      {verificationDate(item.assignedAt ?? item.requestedAt)}
                    </p>
                    {item.completedAt && (
                      <p className="m-0">
                        Kết thúc: {verificationDate(item.completedAt)}
                      </p>
                    )}
                  </div>
                  <div className="border-t border-[#eef1f5] pt-3">
                    <WorkItemAction item={item} />
                  </div>
                </div>
              </TableCell>
              <TableCell className="hidden whitespace-normal py-5 xl:table-cell">
                <VerificationListPerson
                  name={
                    item.requestedBy?.name ?? "Tài khoản không còn khả dụng"
                  }
                />
              </TableCell>
              <TableCell className="hidden whitespace-normal py-5 xl:table-cell">
                <div className="space-y-3">
                  <VerificationListDate
                    value={item.assignedAt ?? item.requestedAt}
                    label="Nhận việc"
                  />
                  {item.completedAt && (
                    <VerificationListDate
                      value={item.completedAt}
                      label="Kết thúc"
                    />
                  )}
                </div>
              </TableCell>
              <TableCell className="hidden whitespace-normal py-5 xl:table-cell">
                <WorkStatus item={item} />
              </TableCell>
              <TableCell className="hidden py-5 pr-6 text-right xl:table-cell">
                <WorkItemAction item={item} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
