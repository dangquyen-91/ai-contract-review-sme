export type ContractStatus = "uploaded" | "processing" | "reviewed" | "archived" | "unsupported";
export type ContractRiskLevel = "high" | "medium" | "low" | "none";

export type ClassificationOutcome = "supported" | "unsupported_type" | "not_contract" | "not_allowed_for_account";

export type ContractClassification = {
  status: "pending" | "running" | "completed" | "failed";
  outcome?: ClassificationOutcome;
  detectedLabel?: string;
  type?: string;
  ourParty?: string;
  confidence?: number;
  parties?: { name: string; partyCode?: string }[];
  source?: "ai" | "user";
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  confirmedAt?: string;
};

export type DashboardContract = {
  id?: string;
  _id?: string;
  title: string;
  type?: string;
  ourParty?: string;
  industry?: string;
  classification?: ContractClassification;
  status: ContractStatus;
  overallRiskLevel: ContractRiskLevel;
  currentVersion?: {
    updatedAt?: string;
    overallRiskLevel?: ContractRiskLevel;
    overallAssessment?: string[];
    summaryPoints?: string[];
    extractionStatus?: "pending" | "processing" | "completed" | "failed" | "unsupported";
    segmentationStatus?: "pending" | "processing" | "completed" | "failed";
    segmentationError?: string;
    segmentationStartedAt?: string;
    summaryStatus?: "pending" | "processing" | "completed" | "failed";
    summaryError?: string;
    summaryStartedAt?: string;
    riskDetectionStatus?: "pending" | "processing" | "completed" | "failed";
    riskDetectionError?: string;
    riskDetectionStartedAt?: string;
    analysisFocus?: string;
    fileName?: string;
    mimeType?: string;
  };
  fileName?: string;
  updatedAt: string;
  createdAt: string;
};

export type ContractListResult = { items: DashboardContract[]; total: number };

export type ContractShareSummary = {
  text: string;
  redacted: true;
  findingCounts: { high: number; medium: number; low: number };
};

export type ContractTextResult = {
  text: string;
  redacted: boolean;
  redactionMode?: "token" | "partial";
  redactionSpans?: { type: string; start: number; end: number }[];
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

export type ContractReviewResult = {
  contract: DashboardContract;
  findings: RiskFinding[];
  clauses: Pick<ContractClause, "id" | "_id" | "index" | "startOffset" | "endOffset">[];
};

export type ReviewErrorCode =
  | "AI_OVERLOADED"
  | "EXTRACTION_TIMEOUT"
  | "EXTRACTION_FAILED"
  | "CONTRACT_DELETED"
  | "CREDIT_EXPIRED"
  | "CANCELLED"
  | "UNKNOWN";

export type ContractReviewRun = {
  _id: string;
  contractId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  errorCode?: ReviewErrorCode;
  cancelRequested?: boolean;
  result?: { partial?: boolean; summaryPoints?: string[]; clauseCount?: number; findingCounts?: { high: number; medium: number; low: number } };
  currentStage?: "waiting_for_extraction" | "segmentation" | "summary" | "risk_detection";
  stageDetail?: string;
  stages?: {
    segmentation: "pending" | "running" | "completed" | "failed";
    summary: "pending" | "running" | "completed" | "failed";
    riskDetection: "pending" | "running" | "completed" | "failed";
  };
  error?: string;
  startedAt?: string;
  finishedAt?: string;
  replayed?: boolean;
};

export type ContractProfile = {
  code: string;
  name: string;
  parties: { code: string; name: string }[];
  industries: { code: string; name: string }[];
};

export type ContractKeyTerms = {
  extractedAt: string | null;
  terms: {
    key: string;
    label: string;
    value: number | boolean | null;
    inferredFromSilence: boolean;
    clause: { index: number; title: string | null } | null;
    quote: string | null;
  }[];
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
