import { Clock3 } from "lucide-react";
import { verificationDate } from "@/lib/review/verification-display";
import { contractTrackingUpdate } from "@/lib/contracts/contract-tracking-update";
import type { DashboardContract } from "@/types/contracts";

export function ContractTrackingUpdate({ contract }: { contract: DashboardContract }) {
  const update = contractTrackingUpdate(contract);
  return (
    <p className="m-0 flex items-start gap-2 text-ui-meta text-muted-foreground">
      <Clock3 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
      <span>{update.label}: {update.at && Number.isFinite(new Date(update.at).getTime())
        ? <time dateTime={update.at}>{verificationDate(update.at)}</time> : "Chưa có thời gian cập nhật"}</span>
    </p>
  );
}
