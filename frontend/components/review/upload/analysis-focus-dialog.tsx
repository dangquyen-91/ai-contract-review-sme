"use client";

import { Button } from "@/components/ui/button";

import { useId, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReviewBillingNotice } from "./review-billing-notice";
import { ReviewFocusFields } from "./review-focus-fields";
import { ReviewAllowanceSummary } from "@/components/review/upload/review-allowance-summary";
import { useReviewAllowance } from "@/hooks/review/use-review-allowance";
import type { DashboardContract } from "@/types/contracts";

type AnalysisFocusDialogProps = {
  contractTitle: string;
  isReviewing: boolean;
  onDismiss: () => void;
  onReview: (focus: string) => void;
  orgId?: string;
  role?: string;
  title?: string;
  description?: string;
  confirmation?: ReactNode;
  hideFocus?: boolean;
  submitDisabled?: boolean;
  billing?: DashboardContract["reviewBilling"];
  paymentOption?: ReactNode;
};

export function AnalysisFocusDialog({
  contractTitle,
  isReviewing,
  onDismiss,
  onReview,
  orgId,
  role,
  title,
  description,
  confirmation,
  hideFocus = false,
  submitDisabled = false,
  billing,
  paymentOption,
}: AnalysisFocusDialogProps) {
  const id = useId();
  const [focus, setFocus] = useState("");
  const allowance = useReviewAllowance(orgId);
  const creditsUnavailable = !allowance.data || allowance.data.status !== "active" || allowance.data.analysis.available < (billing?.units ?? 1);
  const quotaBlocked = Boolean(billing && (
    !billing.ready || billing.purchaseStatus === "consumed" ||
    (billing.purchaseStatus !== "available" && creditsUnavailable)
  ));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isReviewing && !submitDisabled && !quotaBlocked && !hideFocus)
      onReview(focus.trim());
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !isReviewing) onDismiss();
      }}
    >
      <DialogContent
        busy={isReviewing}
        className="flex flex-col gap-0 overflow-hidden p-0 font-sans sm:max-w-[560px]"
      >
        <DialogHeader className="shrink-0 p-5 pr-10 text-left sm:p-6 sm:pr-12">
          <div className="w-11 h-11 grid place-items-center text-primary bg-accent rounded-xl [&_svg]:w-5">
            <Icon name="sparkle" />
          </div>
          <DialogTitle className="mt-2 text-ui-dialog leading-tight">
            {title ?? "Bạn muốn AI chú ý điều gì?"}
          </DialogTitle>
          <DialogDescription className="break-words text-ui leading-6 [overflow-wrap:anywhere]">
            {description ??
              `Đã tải lên “${contractTitle}”. Bạn có thể bổ sung điều khoản cần ưu tiên hoặc bắt đầu rà soát ngay.`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-col">
          <div className="min-h-0 overflow-y-auto overscroll-contain px-5 pb-5 sm:px-6 sm:pb-6">
            {confirmation}
            {paymentOption}
            {!hideFocus && (
              <>
                <ReviewAllowanceSummary orgId={orgId} role={role} />
                {billing && (
                  <ReviewBillingNotice
                    billing={billing}
                    available={allowance.data?.analysis.available}
                    blocked={quotaBlocked}
                  />
                )}
                <ReviewFocusFields
                  id={id}
                  value={focus}
                  onChange={setFocus}
                  autoFocus={!confirmation}
                  disabled={isReviewing}
                />
              </>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2.5 border-t border-border p-5 sm:px-6 sm:py-4">
            <Button
              variant="outline"
              type="button"
              onClick={onDismiss}
              disabled={isReviewing}
            >
              Để sau
            </Button>
            {!hideFocus && (
              <Button
                type="submit"
                disabled={isReviewing || submitDisabled || quotaBlocked}
              >
                <Icon name="sparkle" />
                {isReviewing ? "Đang bắt đầu rà soát…" : "Bắt đầu rà soát"}
              </Button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
