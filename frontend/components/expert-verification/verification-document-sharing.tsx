"use client";

import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useShareVerificationOriginal } from "@/hooks/expert-verification/use-expert-verification";
import { useProfile } from "@/hooks/profile/use-profile";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
import type { ExpertVerification } from "@/types/expert-verification";

export function VerificationDocumentSharing({ verification }: { verification: ExpertVerification }) {
  const profile = useProfile();
  const requester = typeof verification.requestedBy === "object" ? verification.requestedBy?._id : verification.requestedBy;
  if (!requester || profile.data?.user.id !== requester) return null;
  return <DocumentSharingControls key={`${verification.reviewId}:${verification.attempt}`} verification={verification} />;
}

function DocumentSharingControls({ verification }: { verification: ExpertVerification }) {
  const id = useId();
  const [consent, setConsent] = useState(false);
  const share = useShareVerificationOriginal(verification.reviewId, verification.attempt);
  const shared = verification.shareOriginalFile || share.isSuccess;

  return (
    <section className="space-y-2 rounded-lg border border-border p-3">
      <h3 className="m-0 text-ui font-semibold">Tài liệu chia sẻ</h3>
      <p className="m-0 text-ui-meta text-muted-foreground" role="status">
        {shared ? "Đã chia sẻ bản đầy đủ cho lần xác minh này." : "Đang chia sẻ bản đã che thông tin."}
      </p>
      {!shared && (
        <>
          <div className="flex items-start gap-2">
            <Checkbox id={id} checked={consent} onCheckedChange={(checked) => setConsent(checked === true)} disabled={share.isPending} className="mt-1" />
            <label htmlFor={id} className="cursor-pointer">Cho phép Expert đã tiếp nhận xem văn bản chưa che và file gốc trong lần xác minh này.</label>
          </div>
          <Button size="sm" variant="outline" disabled={!consent} loading={share.isPending} onClick={() => share.mutate()}>Chia sẻ bản đầy đủ</Button>
          {share.isError && <p className="m-0 text-sm text-rose-800" role="alert">{verificationErrorMessage(share.error)}</p>}
        </>
      )}
    </section>
  );
}
