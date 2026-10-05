export type ContractStatus = "uploaded" | "processing" | "reviewed" | "archived";
export type ContractRiskLevel = "high" | "medium" | "low" | "none";

export type DashboardContract = {
  id?: string;
  _id?: string;
  title: string;
  type: "sales" | "service" | "labor" | "saas";
  status: ContractStatus;
  overallRiskLevel: ContractRiskLevel;
  currentVersion?: {
    overallRiskLevel?: ContractRiskLevel;
    summary?: string;
    fileName?: string;
  };
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
  user: {
    name: string;
    email: string;
  } | null;
};

export type RiskFinding = {
  _id?: string;
  id?: string;
  clauseId?: string | null;
  findingType?: "clause_risk" | "missing_clause";
  severity: Exclude<ContractRiskLevel, "none">;
  title: string;
  explanation: string;
  suggestedRevision?: string;
  clause?: {
    index: number;
    title?: string;
    startOffset?: number;
    endOffset?: number;
  } | null;
};

export type ContractClause = {
  _id?: string;
  id?: string;
  index: number;
  title?: string;
  text: string;
  summary?: string;
  startOffset?: number;
  endOffset?: number;
};

export type ContractReviewResult = {
  contract: DashboardContract & {
    currentVersion?: DashboardContract["currentVersion"] & { summary?: string };
  };
  findings: RiskFinding[];
  clauses: ContractClause[];
  extractedText?: string;
};
