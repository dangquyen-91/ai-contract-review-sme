export type ExpertVerificationStatus = "requested" | "in_progress" | "approved" | "returned";

export type VerificationPerson = { _id: string; name: string };

export type ExpertVerification = {
  _id: string;
  reviewId: string;
  contractId: string;
  status: ExpertVerificationStatus;
  attempt: number;
  requestedBy: string | VerificationPerson;
  requestedAt: string;
  requestNote?: string;
  expertId?: string | VerificationPerson | null;
  assignedAt?: string;
  completedAt?: string;
  decisionNote?: string;
};

export type ExpertVerificationResult = {
  verification: ExpertVerification | null;
  actions: { _id: string; action: string; reason?: string; createdAt: string }[];
};

export type RequestVerificationInput = { note?: string; consent: true };
