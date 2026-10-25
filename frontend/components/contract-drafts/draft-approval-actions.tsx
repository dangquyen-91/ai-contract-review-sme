"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Download, FileCheck2, Printer, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DraftEditorState } from "@/hooks/use-draft-editor";
import type { AuthUser } from "@/types/auth";

type DraftApprovalActionsProps = {
  editor: DraftEditorState;
  user: AuthUser;
  onApprove: () => void;
};

export function DraftApprovalActions({
  editor,
  user,
  onApprove,
}: DraftApprovalActionsProps) {
  const { draft, values, busy } = editor;
  const [note, setNote] = useState("");
  const owner = user.role === "owner";
  const canExport =
    draft.status === "approved" && (owner || draft.createdBy === user.id);

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <FileCheck2 size={17} className="text-blue-600" />
        Duyệt & sử dụng
      </h2>
      <div className="mt-4 grid gap-3">
        {draft.status === "draft" && !owner && (
          <Button
            disabled={!values.content || Boolean(busy)}
            loading={busy === "submit"}
            onClick={() => void editor.run("submit")}
          >
            <Send size={15} />
            Gửi Owner duyệt
          </Button>
        )}
        {owner && draft.status !== "approved" && (
          <Button
            disabled={!values.content || Boolean(busy)}
            onClick={onApprove}
          >
            <Check size={16} />
            Duyệt bản nháp
          </Button>
        )}
        {owner && draft.status === "pending_approval" && (
          <>
            <label
              htmlFor="draft-return-note"
              className="text-xs font-medium text-slate-600"
            >
              Lý do yêu cầu sửa
              <textarea
                id="draft-return-note"
                className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 p-3 text-sm"
                maxLength={1000}
                disabled={Boolean(busy)}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </label>
            <Button
              variant="outline"
              disabled={Boolean(busy) || !note.trim()}
              loading={busy === "return"}
              onClick={() => void editor.run("return", note)}
            >
              Yêu cầu chỉnh sửa
            </Button>
          </>
        )}
        {canExport && (
          <>
            <Button
              variant="outline"
              disabled={Boolean(busy)}
              loading={busy === "download"}
              onClick={() => void editor.run("download")}
            >
              <Download size={16} />
              Tải Word
            </Button>
            <Button
              variant="outline"
              disabled={Boolean(busy)}
              onClick={() =>
                window.open(
                  `/contract-drafts/${draft.id}/print`,
                  "_blank",
                  "noopener,noreferrer",
                )
              }
            >
              <Printer size={16} />
              In / lưu PDF
            </Button>
          </>
        )}
        {draft.status === "approved" &&
          owner &&
          (draft.contractId ? (
            <Button asChild>
              <Link href={`/contract/${draft.contractId}`}>
                Mở hợp đồng đã chuyển
              </Link>
            </Button>
          ) : (
            <Button
              disabled={Boolean(busy)}
              loading={busy === "publish"}
              onClick={() => void editor.run("publish")}
            >
              <FileCheck2 size={16} />
              Chuyển sang rà soát
            </Button>
          ))}
        <p className="text-xs leading-5 text-slate-500">
          {draft.status === "approved"
            ? "Nội dung đã duyệt được khóa chỉnh sửa. Hợp đồng chưa được coi là đã ký."
            : "Bản nháp được lưu riêng. Owner duyệt trước khi xuất hoặc đưa vào kho hợp đồng."}
        </p>
      </div>
    </section>
  );
}
