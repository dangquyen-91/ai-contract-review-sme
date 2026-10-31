import type { ContractRiskLevel, ContractStatus, DashboardContract } from "@/types/contracts";

export type DashboardContractFilter = {
  status?: ContractStatus;
  riskLevel?: ContractRiskLevel;
  verificationStatus?: "not_sent" | "requested" | "in_progress" | "approved" | "returned";
};

export type DashboardOrganization = {
  id: string;
  name: string;
  taxCode: string | null;
  address: string | null;
  industry?: string | null;
};

export type DashboardData = {
  contractScopeId?: string;
  organization: DashboardOrganization;
  contracts: DashboardContract[];
  totalContracts: number;
  distribution?: {
    statuses: Record<ContractStatus, number>;
    risks: Record<ContractRiskLevel, number>;
  };
  stats: {
    processing: number;
    reviewed: number;
    highRisk: number;
  };
  role: string;
  user: {
    name: string;
    email: string;
  } | null;
};
