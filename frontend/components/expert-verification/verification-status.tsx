"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExpertVerification } from "@/types/expert-verification";

import { verificationDate, verificationStatuses } from "@/lib/review/verification-display";
import { VerificationRequestDialog } from "./verification-request-dialog";

export function VerificationStatus({ title, verification, refreshing, error, onRefresh, onResend }: {
  title: string;
  verification: ExpertVerification;
  refreshing: boolean;
  error?: string;
  onRefresh: () => void;
  onResend: () => void;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const presentation = verificationStatuses[verification.status];
  const open = verification.status === "requested" || verification.status === "in_progress";

  return (
    <>
      <section aria-label="Trạng thái xác minh chuyên gia" className={`flex flex-col items-start justify-between gap-3 rounded-lg border px-3 py-3 text-ui leading-6 sm:flex-row sm:items-center ${presentation.tone}`}>
        <div className="min-w-0">
          <p role="status" aria-atomic="true" className="m-0 flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-4 shrink-0" aria-hidden="true" />
            <span key={verification.status} className="inline-flex items-center gap-2 animate-in fade-in duration-200 motion-reduce:animate-none">
              {presentation.label}
              {verification.status === "requested" && <span aria-hidden="true" className="size-1.5 shrink-0 animate-pulse rounded-full bg-current [animation-duration:2s] motion-reduce:animate-none" />}
            </span>
          </p>
          <p className="mb-0 mt-1 text-ui-meta">Đã gửi {verificationDate(verification.requestedAt)}{open ? " · Trạng thái tự cập nhật" : ""}</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setDetailsOpen(true)}>Xem yêu cầu</Button>
      </section>
      {detailsOpen && (
        <VerificationRequestDialog title={title} verification={verification} refreshing={refreshing} error={error} onClose={() => setDetailsOpen(false)} onRefresh={onRefresh} onResend={onResend} />
      )}
    </>
  );
}
