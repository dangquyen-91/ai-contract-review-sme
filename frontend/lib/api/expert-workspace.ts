import { apiRequest } from "./client";
import type { ExpertCommand, ExpertWorkspace, VerificationQueueFilter, VerificationQueueItem } from "@/types/verification-workspace";
import type { ExpertWorkFilter, ExpertWorkResult } from "@/types/expert-work";

export const expertWorkspaceApi = {
  myWork(filter: ExpertWorkFilter, signal?: AbortSignal) {
    return apiRequest<ExpertWorkResult>({ url: "/reviews/my-verifications", params: Object.fromEntries(Object.entries(filter).filter(([, value]) => value !== "")), signal });
  },
  queue(status: VerificationQueueFilter, signal?: AbortSignal) {
    return apiRequest<VerificationQueueItem[]>({ url: "/reviews/verification-queue", params: { status }, signal });
  },
  workspace(reviewId: string, signal?: AbortSignal, attempt?: number) {
    return apiRequest<ExpertWorkspace>({ url: `/reviews/${reviewId}/verification/workspace`, params: attempt ? { attempt } : undefined, signal });
  },
  command(reviewId: string, command: ExpertCommand) {
    const base = `/reviews/${reviewId}/verification`;
    if (command.kind === "decide") return apiRequest<void>({ url: `${base}/findings/${command.findingId}`, method: "PUT", data: command.input });
    if (command.kind === "remove") return apiRequest<void>({ url: `${base}/findings/${command.findingId}`, method: "DELETE" });
    if (command.kind === "add") return apiRequest<void>({ url: `${base}/findings`, method: "POST", data: command.input });
    const data = command.kind === "return" ? { reason: command.reason } : command.kind === "approve" && command.decisionNote ? { decisionNote: command.decisionNote } : {};
    return apiRequest<void>({ url: `${base}/${command.kind}`, method: "POST", data });
  },
};
