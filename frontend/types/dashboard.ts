import type { ContractRiskLevel, ContractStatus, DashboardContract } from "@/types/contracts";

export type DashboardContractFilter = { status?: ContractStatus; riskLevel?: ContractRiskLevel };

export type DashboardOrganization = {
  id: string;
  name: string;
  taxCode: string | null;
  address: string | null;
};

export type DashboardData = {
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
