"use client";
import { VerificationWorkspaceLink } from "./verification-workspace-link";
import { ArrowRight, LockKeyhole } from "lucide-react";
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
import type { ExpertWorkItem } from "@/types/expert-work";

function WorkItemAction({ item }: { item: ExpertWorkItem }) {
  if (!item.available)
    return (
      <span className="text-ui-meta text-muted-foreground">
        Hợp đồng không còn khả dụng
      </span>
    );
  return (
    <Button asChild variant="outline" size="sm">
      <VerificationWorkspaceLink
        href={`/expert-verification/${encodeURIComponent(item.reviewId)}${item.historical ? `?attempt=${item.attempt}` : ""}`}
      >
        {item.status === "in_progress" ? "Tiếp tục xử lý" : "Xem kết quả"}
        <ArrowRight aria-hidden="true" />
      </VerificationWorkspaceLink>
    </Button>
  );
}

export function MyWorkTable({ items }: { items: ExpertWorkItem[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Hợp đồng</TableHead>
          <TableHead className="hidden sm:table-cell">Người gửi</TableHead>
          <TableHead className="hidden sm:table-cell">
            Thời gian xử lý
          </TableHead>
          <TableHead className="hidden sm:table-cell">Trạng thái</TableHead>
          <TableHead className="hidden sm:table-cell">
            <span className="sr-only">Thao tác</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item) => (
          <TableRow
            key={`${item.expertReviewId}:${item.attempt}`}
            data-verification-row={`${item.expertReviewId}:${item.attempt}`}
          >
            <TableCell className="min-w-52 max-w-80 whitespace-normal">
              <p className="m-0 break-words font-semibold [overflow-wrap:anywhere]">
                {item.title}
              </p>
              <p className="mb-0 mt-1 text-ui-meta text-muted-foreground">
                {contractTypeLabels[item.contractType ?? ""] ??
                  "Chưa xác định loại"}{" "}
                · Lần {item.attempt}
              </p>
              {item.historical && (
                <span className="mt-1 inline-flex items-center gap-1 text-ui-meta text-muted-foreground">
                  <LockKeyhole className="size-3.5" aria-hidden="true" />
                  Bản lưu chỉ đọc
                </span>
              )}
              {item.status !== "in_progress" && (
                <div
                  className={`mt-2 rounded-lg border p-2 text-ui-meta ${item.status === "returned" ? "border-amber-200 bg-amber-50 text-amber-950" : "border-emerald-100 bg-emerald-50/50 text-emerald-950"}`}
                >
                  <strong>
                    {item.status === "returned" ? "Lý do trả lại" : "Kết luận"}
                  </strong>
                  <p className="mb-0 mt-1 line-clamp-2 break-words [overflow-wrap:anywhere]">
                    {item.decisionPreview ||
                      "Mở kết quả để xem ghi chú và kết luận đầy đủ."}
                  </p>
                </div>
              )}
              <div className="mt-3 space-y-2 sm:hidden">
                <span
                  className={`inline-block rounded-full border px-2.5 py-1 text-ui-meta ${verificationStatuses[item.status].tone}`}
                >
                  {verificationStatuses[item.status].label}
                </span>
                <p className="m-0 text-ui-meta text-muted-foreground">
                  Người gửi:{" "}
                  {item.requestedBy?.name ?? "Tài khoản không còn khả dụng"}
                </p>
                <p className="m-0 text-ui-meta text-muted-foreground">
                  Nhận: {verificationDate(item.assignedAt ?? item.requestedAt)}
                </p>
                {item.completedAt && (
                  <p className="m-0 text-ui-meta text-muted-foreground">
                    Kết thúc: {verificationDate(item.completedAt)}
                  </p>
                )}
                <WorkItemAction item={item} />
              </div>
            </TableCell>
            <TableCell className="hidden min-w-32 whitespace-normal sm:table-cell">
              {item.requestedBy?.name ?? "Tài khoản không còn khả dụng"}
            </TableCell>
            <TableCell className="hidden min-w-52 whitespace-normal text-ui-meta sm:table-cell">
              <p className="m-0">
                Nhận: {verificationDate(item.assignedAt ?? item.requestedAt)}
              </p>
              {item.completedAt && (
                <p className="mb-0 mt-1 text-muted-foreground">
                  Kết thúc: {verificationDate(item.completedAt)}
                </p>
              )}
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <span
                className={`inline-block rounded-full border px-2.5 py-1 text-ui-meta ${verificationStatuses[item.status].tone}`}
              >
                {verificationStatuses[item.status].label}
              </span>
            </TableCell>
            <TableCell className="hidden sm:table-cell">
              <WorkItemAction item={item} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
