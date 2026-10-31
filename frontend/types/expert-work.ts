import type { VerificationPerson } from "./expert-verification";

export type ExpertWorkStatus = "all" | "in_progress" | "approved" | "returned";
export type ExpertWorkFilter = { status: ExpertWorkStatus; search: string; type: string; from: string; to: string; page: number; limit: number };
export type ExpertWorkItem = {
  expertReviewId: string;
  reviewId: string;
  contractId: string;
  title: string;
  contractType?: string;
  requestedBy: VerificationPerson;
  status: Exclude<ExpertWorkStatus, "all">;
  attempt: number;
  requestedAt?: string;
  assignedAt?: string;
  completedAt?: string;
  historical: boolean;
  available: boolean;
  decisionPreview?: string;
};
export type ExpertWorkResult = { items: ExpertWorkItem[]; total: number; page: number; limit: number; pages: number };
