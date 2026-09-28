export type ContractStatus = "uploaded" | "processing" | "reviewed" | "archived";
export type ContractRiskLevel = "high" | "medium" | "low" | "none";

export type DashboardContract = {
  id?: string;
  _id?: string;
  title: string;
  type: "sales" | "service" | "labor" | "saas";
  status: ContractStatus;
  overallRiskLevel: ContractRiskLevel;
  fileName?: string;
  updatedAt: string;
  createdAt: string;
};

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
  stats: {
    processing: number;
    reviewed: number;
    highRisk: number;
  };
  role: string;
};
