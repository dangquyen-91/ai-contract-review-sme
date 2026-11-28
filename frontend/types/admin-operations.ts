export type AiJobStatus = "queued" | "running" | "completed" | "failed" | "cancelled";
export type AiJobStage = "waiting_for_extraction" | "segmentation" | "summary" | "risk_detection";
export type AiJobErrorCode =
  | "AI_OVERLOADED"
  | "EXTRACTION_TIMEOUT"
  | "EXTRACTION_FAILED"
  | "CONTRACT_DELETED"
  | "CREDIT_EXPIRED"
  | "CANCELLED"
  | "UNKNOWN";
export type AiJobStep = "segmentation" | "summary" | "riskDetection";
export type AiJobStepStatus = "pending" | "running" | "completed" | "failed";
export type AiUsageKind = "analysis" | "chat" | "drafting";

export type AiJobOverview = {
  computedAt: string;
  queued: number;
  running: number;
  stuck: number;
  last24h: {
    completed: number;
    failed: number;
    cancelled: number;
    successRate: number | null;
    averageDurationMs: number | null;
  };
  errors: { code: AiJobErrorCode; count: number }[];
  usage: { kind: AiUsageKind; succeeded: number; failed: number; units: number }[];
};

/** One contract review job. Only the contract title is shown, never its text. */
export type AiJob = {
  id: string;
  account: { id: string; type: "organization" | "personal"; name: string };
  contractTitle: string;
  requestedBy: { name: string; email: string } | null;
  status: AiJobStatus;
  stuck: boolean;
  currentStage: AiJobStage | null;
  stageDetail: string | null;
  stages: Partial<Record<AiJobStep, AiJobStepStatus>> | null;
  errorCode: AiJobErrorCode | null;
  error: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  durationMs: number | null;
};
export type AiJobFilters = { status: AiJobStatus | "stuck" | ""; errorCode: AiJobErrorCode | ""; search: string };
export type AiJobList = { items: AiJob[]; page: number; limit: number; total: number; totalPages: number };

export type AuditGroup =
  | "user"
  | "template"
  | "legal_source"
  | "invitation"
  | "member"
  | "organization"
  | "subscription"
  | "payment"
  | "account"
  | "ai_job";

export type AuditEvent = {
  id: string;
  action: string;
  actor: { id: string | null; role: string; name: string; email: string | null };
  target: { type: string; id: string | null; label: string | null };
  orgId: string | null;
  /** The organization or personal account the event belongs to, if any. */
  organization: { id: string; type: "organization" | "personal"; name: string } | null;
  changes: Record<string, unknown> | null;
  createdAt: string;
};
/** `from` and `to` are calendar days (YYYY-MM-DD) in Vietnam time, inclusive. */
export type AuditFilters = { group: AuditGroup | ""; search: string; from: string; to: string };
export type AuditEventList = { items: AuditEvent[]; page: number; limit: number; total: number; totalPages: number };
