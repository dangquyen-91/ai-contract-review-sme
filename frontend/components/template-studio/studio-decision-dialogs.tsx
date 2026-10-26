"use client";
import { useState } from "react";
import type { TemplateStudioState } from "@/hooks/use-template-studio";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DraftApprovalDialog } from "@/components/contract-drafts/draft-approval-dialog";

export function StudioDecisionDialogs({
  studio,
  approvalOpen,
  returnOpen,
  onCloseApproval,
  onCloseReturn,
}: {
  studio: TemplateStudioState;
  approvalOpen: boolean;
  returnOpen: boolean;
  onCloseApproval: () => void;
  onCloseReturn: () => void;
}) {
  const { values, busy } = studio;
  const [note, setNote] = useState("");
  return (
    <>
      {approvalOpen && (
        <DraftApprovalDialog
          title={values.title}
          busy={busy === "approve"}
          onClose={() => onCloseApproval()}
          onConfirm={() => {
            void studio.run("approve").then((success) => {
              if (success) onCloseApproval();
            });
          }}
        />
      )}
      {returnOpen && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) onCloseReturn();
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Yêu cầu chỉnh sửa</DialogTitle>
              <DialogDescription>
                Gửi ghi chú để người soạn hoàn thiện lại văn bản.
              </DialogDescription>
            </DialogHeader>
            <textarea
              aria-label="Lý do yêu cầu chỉnh sửa"
              className="min-h-28 rounded-xl border border-slate-200 p-3 text-sm"
              value={note}
              maxLength={1000}
              onChange={(event) => setNote(event.target.value)}
            />
            <Button
              disabled={!note.trim() || Boolean(busy)}
              loading={busy === "return"}
              onClick={() => {
                void studio.run("return", note).then((success) => {
                  if (success) onCloseReturn();
                });
              }}
            >
              Gửi yêu cầu chỉnh sửa
            </Button>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
