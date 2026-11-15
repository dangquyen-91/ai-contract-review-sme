import { Badge } from "@/components/ui/badge";
import { contractRiskTones, reviewedRiskLabels } from "@/config/contract-display";
import type { ContractRiskLevel } from "@/types/contracts";

export function RiskBadge({ risk }: { risk: ContractRiskLevel }) {
  return <Badge variant={risk === "none" ? "success" : contractRiskTones[risk]}>{reviewedRiskLabels[risk]}</Badge>;
}
