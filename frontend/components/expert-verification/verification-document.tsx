"use client";

import { useState } from "react";
import { Crosshair, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExpertOriginalFile } from "./expert-original-file";
import { ExpertFullText } from "./expert-full-text";
import type { ExpertWorkspace } from "@/types/verification-workspace";

const documentModes = [
  { value: "full", label: "Văn bản đầy đủ" },
  { value: "original", label: "Xem file gốc" },
] as const;

export function VerificationDocument({
  workspace,
  selection,
  active,
  layout,
  selectedTitle,
  canViewOriginal,
}: {
  workspace: ExpertWorkspace;
  selection: { index: number; request: number; focus?: boolean } | null;
  active?: boolean;
  layout?: string;
  selectedTitle?: string;
  canViewOriginal: boolean;
}) {
  const [view, setView] = useState<{
    mode: (typeof documentModes)[number]["value"];
    clauseRequest?: number;
  }>();
  const mode =
    canViewOriginal && view && view.clauseRequest === selection?.request
      ? view.mode
      : "full";
  const { reviewId, attempt, status, shareOriginalFile } =
    workspace.verification;
  const clause = selection
    ? workspace.clauses.find((item) => item.index === selection.index)
    : undefined;
  const unavailableMessage =
    status === "requested"
      ? "Nhận xác minh ở thanh phía trên để xem văn bản đầy đủ và file gốc."
      : status !== "in_progress"
        ? "Văn bản đầy đủ và file gốc chỉ mở trong thời gian yêu cầu đang được xác minh."
        : !shareOriginalFile
          ? "Bản đầy đủ chưa được chia sẻ. Người gửi có thể mở “Xem yêu cầu” để cho phép chuyên gia xem tài liệu."
          : "Chỉ chuyên gia đã tiếp nhận mới có thể mở tài liệu. Hãy làm mới yêu cầu để kiểm tra quyền xem.";

  return (
    <>
      <header className="shrink-0 border-b border-border p-4">
        <h2 className="m-0 text-ui-section font-semibold">Nội dung hợp đồng</h2>
        <div
          role="group"
          aria-label="Phiên bản hiển thị"
          className="mt-3 flex flex-wrap gap-2"
        >
          {documentModes.map(({ value, label }) => (
            <Button
              key={value}
              variant={mode === value ? "default" : "outline"}
              size="sm"
              aria-pressed={mode === value}
              disabled={!canViewOriginal}
              onClick={() =>
                setView({ mode: value, clauseRequest: selection?.request })
              }
            >
              {label}
            </Button>
          ))}
        </div>
        {canViewOriginal && (
          <p className="mb-0 mt-2 flex items-start gap-2 text-ui-meta leading-5 text-muted-foreground">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            Nội dung đầy đủ và file gốc được người gửi cho phép chia sẻ trong
            lần xác minh này.
          </p>
        )}
        {selectedTitle && (
          <p className="mb-0 mt-3 flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-2 text-ui-meta text-blue-900">
            <Crosshair aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span className="min-w-0">
              <strong
                className="line-clamp-2 break-words"
                title={selectedTitle}
              >
                Đang đối chiếu: {selectedTitle}
              </strong>
              {!selection && (
                <span className="mt-1 block">
                  Mục này áp dụng cho toàn hợp đồng, chưa gắn với một điều khoản
                  cụ thể.
                </span>
              )}
            </span>
          </p>
        )}
      </header>
      {!canViewOriginal ? (
        <p
          role="status"
          className="m-0 p-5 text-ui leading-6 text-muted-foreground"
        >
          {unavailableMessage}
        </p>
      ) : mode === "original" ? (
        <ExpertOriginalFile
          reviewId={reviewId}
          attempt={attempt}
          mimeType={workspace.document.mimeType}
          onBack={() => setView(undefined)}
        />
      ) : (
        <ExpertFullText
          reviewId={reviewId}
          attempt={attempt}
          clause={clause}
          selection={selection}
          active={active}
          layout={layout}
        />
      )}
    </>
  );
}
