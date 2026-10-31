import type { ExpertVerification, VerificationPerson } from "./expert-verification";
import type { RiskCode, RiskFinding } from "./contracts";

export type VerificationQueueFilter = "all" | "requested" | "in_progress";
export type VerificationQueueItem = Omit<ExpertVerification, "contractId"> & {
  contractId: { _id: string; title: string; type?: string } | null;
};
export type VerifiedFinding = Omit<RiskFinding, "detectedBy" | "clause"> & {
  detectedBy?: RiskFinding["detectedBy"] | "expert";
  clause?: { index: number; title?: string | null } | null;
};
export type VerificationFindingInput = {
  severity: "high" | "medium" | "low";
  riskCode: RiskCode;
  title: string;
  problem: string[];
  consequences: string[];
  recommendations: string[];
};
export type VerificationAction = {
  _id: string;
  action: "confirm" | "adjust" | "reject" | "add" | "remove";
  expertId?: string | VerificationPerson;
  reason?: string;
  attempt: number;
  createdAt: string;
  before?: Partial<VerificationFindingInput> | null;
  after?: Partial<VerificationFindingInput> | null;
};
export type ExpertWorkspace = {
  historical?: boolean;
  verification: ExpertVerification;
  contract: { id: string; title: string; type?: string; ourParty?: string; industry?: string };
  document: { text: string; redactionSpans: { type: string; start: number; end: number }[]; mimeType?: string };
  clauses: { _id: string; index: number; title?: string; text: string }[];
  findings: VerifiedFinding[];
  actions: VerificationAction[];
};
export type ExpertCommand =
  | { kind: "start" }
  | { kind: "approve"; decisionNote?: string }
  | { kind: "return"; reason: string }
  | { kind: "remove"; findingId: string }
  | { kind: "add"; input: VerificationFindingInput & { clauseIndex?: number; reason?: string } }
  | { kind: "decide"; findingId: string; input: Partial<VerificationFindingInput> & { verdict: "confirmed" | "adjusted" | "rejected"; reason?: string } };
