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
    overallAssessment?: string[];
    summaryPoints?: string[];
    extractionStatus?: "pending" | "processing" | "completed" | "failed" | "unsupported";
    segmentationStatus?: "pending" | "processing" | "completed" | "failed";
    summaryStatus?: "pending" | "processing" | "completed" | "failed";
    riskDetectionStatus?: "pending" | "processing" | "completed" | "failed";
    analysisFocus?: string;
    fileName?: string;
  };
  fileName?: string;
  updatedAt: string;
  createdAt: string;
};

export type ContractTextResult = {
  text: string;
  extractionStatus: NonNullable<DashboardContract["currentVersion"]>["extractionStatus"];
  fileName?: string;
  mimeType?: string;
};

export type ContractClause = {
  _id?: string;
  id?: string;
  index: number;
  title?: string;
  text: string;
  summary?: string;
  startOffset: number;
  endOffset: number;
};

export type RiskFinding = {
  _id?: string;
  id?: string;
  clauseId?: string | null;
  expectedClauseTypeId?: { _id: string; code: string; name: string; description: string } | null;
  findingType?: "clause_risk" | "missing_clause";
  severity: Exclude<ContractRiskLevel, "none">;
  title: string;
  problem: string[];
  consequences: string[];
  legalBasis: { text: string; legalKnowledgeChunkIds: string[] }[];
  recommendations: string[];
  proposedRevision?: { originalText?: string; revisedText: string; reason?: string; isEdited: boolean };
  status?: "open" | "acknowledged" | "dismissed" | "resolved";
  detectedBy?: "rule" | "llm" | "hybrid";
  citations: {
    legalKnowledgeChunkId: string;
    citationLabel: string;
    sourceTitle: string;
    articleRef?: string;
    chunkText: string;
    relevanceScore: number;
  }[];
  clause?: {
    index: number;
    title?: string;
    startOffset: number;
    endOffset: number;
  } | null;
};

export type ProposedRevisionUpdate = { revisedText?: string; reason?: string };

export type RiskStreamEvent =
  | { event: "progress"; data: { stage: "retrieving_legal_sources" | "analyzing_clauses" | "saving_findings" } }
  | { event: "finding"; data: RiskFinding }
  | { event: "done"; data: { total: number } };

export type ContractReviewResult = {
  contract: DashboardContract;
  findings: RiskFinding[];
  clauses: ContractClause[];
  extractedText?: string;
};

export type ContractChatMessage = {
  _id: string;
  contractVersionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatStreamEvent =
  | { event: "token"; data: { text: string } }
  | { event: "done"; data: Record<string, never> };

export type UpstreamPayload = {
  data?: unknown;
  error?: { message?: string };
  success?: boolean;
};
