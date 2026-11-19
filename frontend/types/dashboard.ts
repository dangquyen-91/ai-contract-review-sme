import type { ContractIssueFilter, ContractStatus, DashboardContract } from "@/types/contracts";

export type DashboardContractFilter = {
  status?: ContractStatus;
  issues?: ContractIssueFilter;
  verificationStatus?: "not_sent" | "requested" | "in_progress" | "approved" | "returned";
};

export type DashboardOrganization = {
  id: string;
  name: string;
  taxCode: string | null;
  address: string | null;
  industry?: string | null;
  addressDetails?: { provinceCode: string; wardCode: string; addressLine: string } | null;
};

export type DashboardData = {
  contractScopeId?: string;
  organization: DashboardOrganization;
  contracts: DashboardContract[];
  totalContracts: number;
  distribution?: {
    statuses: Record<ContractStatus, number>;
    issues: { withViolations: number; withIssues: number; noIssues: number };
  };
  stats: {
    processing: number;
    reviewed: number;
    withViolations: number;
  };
  role: string;
  user: {
    name: string;
    email: string;
  } | null;
};
