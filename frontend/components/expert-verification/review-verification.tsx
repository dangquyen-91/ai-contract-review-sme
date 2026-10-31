"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useExpertVerification, useRequestExpertVerification, useVerificationReview } from "@/hooks/expert-verification/use-expert-verification";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
import { RequestVerificationDialog } from "./request-verification-dialog";
import { VerificationStatus } from "./verification-status";
import { useVerificationResultSync } from "@/hooks/expert-verification/use-verification-result-sync";

export function ReviewVerification({ contractId, title, complete, findingCount, role, versionId }: {
  contractId: string;
  title: string;
  complete: boolean;
  findingCount: number;
  role?: string;
  versionId?: string;
}) {
  const allowed = Boolean(role && ["user", "staff", "manager", "owner"].includes(role));
  const runs = useVerificationReview(contractId, allowed && complete, versionId);
  const reviewId = allowed && complete ? runs.data?._id ?? "" : "";
  const query = useExpertVerification(reviewId);
  useVerificationResultSync(contractId, query.data, query.dataUpdatedAt);
  const request = useRequestExpertVerification(reviewId, contractId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const verification = query.data?.verification;
  if (!allowed) return null;

  async function send(note: string) {
    try {
      await request.mutateAsync({ consent: true, ...(note ? { note } : {}) });
      setDialogOpen(false);
      toast.success("Đã gửi yêu cầu kiểm tra", { description: "Bạn có thể theo dõi trạng thái ngay tại kết quả rà soát." });
    } catch {
      // The mutation refreshes server state even when a response is lost or
      // another session has already submitted. Never automatically POST again.
    }
  }

  function openDialog() {
    request.reset();
    setDialogOpen(true);
  }

  const loading = complete && (runs.isPending || (Boolean(reviewId) && query.isPending));
  const loadError = runs.error || query.error;
  const canSend = complete && Boolean(reviewId) && !loading && !loadError && !runs.isFetching && !query.isFetching && (!verification || verification.status === "returned");
  const staleError = Boolean(loadError && verification);

  return (
    <div className="space-y-2 pt-4">
      {verification ? (
        <VerificationStatus title={title} verification={verification} refreshing={query.isFetching} error={loadError ? "Chưa cập nhật được trạng thái; thông tin hiển thị là lần tải gần nhất. Hãy thử cập nhật lại." : undefined} onRefresh={() => { void query.refetch(); }} onResend={openDialog} />
      ) : (
        <div className="flex flex-col items-start justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-3 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="m-0 text-ui font-medium text-card-foreground">Muốn kiểm tra thêm kết quả AI?</p>
            <p role="status" className="mb-0 mt-1 text-ui-meta leading-5 text-muted-foreground">
              {!complete ? "Chờ AI hoàn tất rà soát để gửi chuyên gia kiểm tra."
                : loading ? "Đang kiểm tra trạng thái xác minh…"
                  : !loadError && !reviewId ? "Chưa có lượt rà soát hoàn tất phù hợp. Hãy cập nhật trạng thái hoặc mở kết quả mới nhất."
                    : !loadError ? "Bạn có thể nhờ chuyên gia đối chiếu và xác minh." : "Chưa tải được trạng thái xác minh."}
            </p>
          </div>
          <Button variant="outline" size="sm" disabled={!canSend} onClick={openDialog}>
            <ShieldCheck aria-hidden="true" />Nhờ chuyên gia kiểm tra
          </Button>
        </div>
      )}
      {loadError && (
        <div role="alert" className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-ui-meta leading-6 text-amber-950">
          <span>{staleError ? "Chưa cập nhật được trạng thái; thông tin bên trên là lần tải gần nhất." : verificationErrorMessage(loadError)}</span>
          <Button variant="outline" size="sm" onClick={() => { void runs.refetch(); if (reviewId) void query.refetch(); }}>Thử tải lại</Button>
        </div>
      )}
      {complete && !loading && !loadError && !reviewId && <Button variant="ghost" size="sm" disabled={runs.isFetching} onClick={() => { void runs.refetch(); }}>Cập nhật trạng thái</Button>}
      {dialogOpen && reviewId && (!verification || verification.status === "returned") && (
        <RequestVerificationDialog title={title} findingCount={findingCount} pending={request.isPending} submitDisabled={!canSend} error={loadError ? verificationErrorMessage(loadError) : request.error ? verificationErrorMessage(request.error) : ""}
          onClose={() => setDialogOpen(false)} onSubmit={send} />
      )}
    </div>
  );
}
