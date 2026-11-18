import type { ChatParticipant } from "@/types/expert-consultation";

export const expertConsultationKeys = {
  messages: (reviewId: string, attempt: number, participant: ChatParticipant) =>
    ["expert-consultation", reviewId, attempt, participant] as const,
};
