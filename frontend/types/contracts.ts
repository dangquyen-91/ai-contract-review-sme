export type ContractStatus = "uploaded" | "processing" | "reviewed" | "archived" | "unsupported";
export type ReviewBillingConfirmation = { versionId: string; units: number };
export const ISSUE_GROUPS = ["compliance", "clarity", "completeness", "balance", "drafting"] as const;
export type IssueGroup = (typeof ISSUE_GROUPS)[number];
export type FindingGroup = IssueGroup | "referral";
export type FindingOutcome = "failed" | "unverified" | "referral";
export type ContractIssueFilter = "violations" | "any" | "none";
export type IssueCounts = {
  violations: number;
  unclear: number;
  missing: number;
  negotiable: number;
  drafting: number;
  unverified: number;
  referrals: number;
  total: number;
};
export type CheckCoverage = {
  playbookVersion?: string;
  checks: number;
  passed: number;
  failed: number;
  notApplicable: number;
  notChecked: number;
  unverified: number;
  documentChecks: number;
  clauseTypesWithoutPlaybook: string[];
  notCheckedItems: { code: string; title: string; reason?: string }[];
  passedItems?: { code: string; title: string }[];
  uncoveredTopics?: { code: string; name: string }[];
};
export type ContractQuote = {
  clauseIndex: number;
  quote: string;
  startOffset?: number;
  endOffset?: number;
};
export type SummarySource = ContractQuote & { pointIndex: number };
export type FindingEvidence = Partial<ContractQuote> & {
  fieldKey?: string;
  label?: string;
  value?: string | number | boolean | null;
};

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
  orgId?: string;
  ownerType?: "organization" | "personal";
  latestReviewId?: string | null;
  expertVerification?: {
    _id: string;
    reviewId: string;
    status: "requested" | "in_progress" | "approved" | "returned";
    attempt: number;
    requestedAt: string;
    assignedAt?: string;
    completedAt?: string;
  } | null;
  reviewBilling?: { versionId: string; pageCount: number | null; pagesPerUnit: number; units: number | null; ready: boolean; reason: string | null; purchaseStatus?: "available" | "reserved" | "consumed" | null };
  id?: string;
  _id?: string;
  title: string;
  type?: string;
  ourParty?: string;
  industry?: string;
  classification?: ContractClassification;
  status: ContractStatus;
  issueCounts?: IssueCounts | null;
  currentVersion?: {
    _id?: string;
    id?: string;
    updatedAt?: string;
    issueCounts?: IssueCounts | null;
    checkCoverage?: CheckCoverage | null;
    summarySources?: SummarySource[];
    overallAssessment?: string[];
    summaryPoints?: string[];
    extractionStatus?: "pending" | "processing" | "completed" | "failed" | "unsupported";
    extractionError?: string;
    extractionErrorCode?: string;
    extractionProgress?: { processedPages: number; totalPages: number };
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
    versionNumber?: number;
    note?: string;
    createdAt?: string;
  };
  fileName?: string;
  updatedAt: string;
  createdAt: string;
};

export type ContractListResult = { items: DashboardContract[]; total: number };

export type ContractVersionSummary = {
  id: string;
  versionNumber: number;
  isCurrent: boolean;
  note: string | null;
  fileName: string | null;
  mimeType: string | null;
  uploadedBy: { id: string; name: string } | null;
  uploadedAt: string;
  extractionStatus: "pending" | "processing" | "completed" | "failed" | "unsupported";
  pageCount: number | null;
  similarityToPrevious?: number | null;
  latestReview: {
    id: string;
    status: ContractReviewRun["status"];
    finishedAt: string | null;
    issueCounts?: IssueCounts | null;
    verificationStatus: "requested" | "in_progress" | "approved" | "returned" | null;
  } | null;
};

export type VersionMatch = {
  contractId: string;
  title: string;
  similarity: number;
  matchedVersionNumber: number;
  currentVersionNumber: number;
  nextVersionNumber: number;
  sameType: boolean | null;
  sameParties: boolean | null;
};

export type VersionMatchResult = { ready: boolean; eligible: boolean; match: VersionMatch | null };

export type DuplicateFileMatch = {
  contractId: string;
  title: string;
  versionNumber: number;
  uploadedAt: string;
};

export type ContractShareSummary = {
  text: string;
  redacted: true;
  issueCounts?: IssueCounts;
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
  label?: string;
  _id?: string;
  id?: string;
  index: number;
  title?: string;
  text: string;
  summary?: string;
  summaryKind?: "ai_verified" | "excerpt";
  startOffset: number;
  endOffset: number;
};

export type FindingVerification = {
  verdict: "confirmed" | "adjusted" | "rejected" | "added";
  originalGroup?: FindingGroup;
  reason?: string;
  verifiedBy?: string;
  verifiedAt?: string;
};

export type RiskFinding = {
  _id?: string;
  id?: string;
  clauseId?: string | null;
  expectedClauseTypeId?: { _id: string; code: string; name: string; description: string } | null;
  findingType?: "clause_risk" | "missing_clause" | "referral";
  checkCode?: string;
  checkGroup: FindingGroup;
  outcome: FindingOutcome;
  label?: string;
  playbookVersion?: string;
  neutral?: boolean;
  evidence?: FindingEvidence[];
  observed?: unknown;
  limit?: number;
  vagueTerm?: string;
  reason?: string;
  question?: string;
  basis?: { kind: "criterion" | "practice" | "policy" | "law"; statement: string };
  noVerifiedLegalBasis?: boolean;
  title: string;
  problem: string[];
  consequences: string[];
  legalBasis: {
    text: string;
    legalKnowledgeChunkIds: string[];
    verification?: "verified" | "partially_verified" | "not_in_knowledge_base" | "unreferenced";
    role?: "basis" | "fallback" | "reference";
  }[];
  recommendations: string[];
  proposedRevision?: { originalText?: string; revisedText: string; reason?: string; isEdited: boolean };
  status?: "open" | "acknowledged" | "dismissed" | "resolved";
  detectedBy?: "playbook" | "document_check" | "expert_referral" | "expert";
  verification?: FindingVerification | null;
  citations: {
    legalKnowledgeChunkId: string;
    citationLabel: string;
    sourceTitle: string;
    articleRef?: string;
    chunkText: string;
    relevanceScore: number;
    inKnowledgeBase?: boolean;
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
  clauses: Pick<ContractClause, "id" | "_id" | "index" | "label" | "startOffset" | "endOffset">[];
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
  versionId?: string;
  contractId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  errorCode?: ReviewErrorCode;
  cancelRequested?: boolean;
  result?: {
    partial?: boolean;
    summaryPoints?: string[];
    clauseCount?: number;
    issueCounts?: IssueCounts;
    checkCoverage?: CheckCoverage;
    summarySources?: SummarySource[];
    overallAssessment?: string[];
    findings?: Pick<RiskFinding, "findingType" | "checkCode" | "checkGroup" | "outcome" | "label" | "title" | "detectedBy">[];
  };
  aiModel?: string;
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
    unit?: string | null;
    value: number | boolean | string | null;
    deferred: boolean;
    clause: { index: number; title: string | null } | null;
    quote: string | null;
  }[];
};

export type ContractChatMessage = {
  _id: string;
  contractVersionId: string;
  role: "user" | "assistant";
  content: string;
  legalSources?: { legalKnowledgeChunkId: string; citationLabel: string; sourceTitle: string; articleRef?: string }[];
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
