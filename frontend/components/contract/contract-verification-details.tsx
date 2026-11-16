"use client";

import { useExpertVerification } from "@/hooks/expert-verification/use-expert-verification";
import { verificationErrorMessage } from "@/lib/review/expert-verification";
import { VerificationRequestDialog } from "@/components/expert-verification/verification-request-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { DashboardContract } from "@/types/contracts";

export function ContractVerificationDetails({ contract, onClose, onOpenReport }: {
  contract: DashboardContract; onClose: () => void; onOpenReport: () => void;
}) {
  const query = useExpertVerification(contract.expertVerification?.reviewId ?? "");
  const verification = query.data?.verification;
  if (verification) return (
    <VerificationRequestDialog title={contract.title} verification={verification}
      refreshing={query.isFetching} error={query.isError ? verificationErrorMessage(query.error) : undefined}
      onClose={onClose} onRefresh={() => { void query.refetch(); }} resendLabel="Mở báo cáo để gửi lại"
      onResend={() => { onClose(); onOpenReport(); }} />
  );
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="bg-card text-card-foreground">
        <DialogHeader><DialogTitle>Theo dõi xác minh</DialogTitle><DialogDescription>{contract.title}</DialogDescription></DialogHeader>
        <p role={query.isError ? "alert" : "status"} className="text-ui text-muted-foreground">
          {query.isPending ? "Đang tải trạng thái yêu cầu…" : query.isError ? verificationErrorMessage(query.error) : "Yêu cầu không còn khả dụng. Hãy làm mới danh sách hợp đồng."}
        </p>
        {query.isError && <Button variant="outline" onClick={() => { void query.refetch(); }}>Thử lại</Button>}
      </DialogContent>
    </Dialog>
  );
}
