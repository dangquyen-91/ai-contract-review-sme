import type { DashboardContract } from "@/types/contracts";

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
  user: {
    name: string;
    email: string;
  } | null;
};
