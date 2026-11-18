import type { ExpertVerificationStatus } from "./expert-verification";

export type ChatParticipant = "requester" | "expert";
export type ExpertChatMessage = {
  id: string;
  attempt: number;
  senderId: string;
  senderType: ChatParticipant;
  senderName?: string | null;
  clientMessageId: string;
  content: string;
  createdAt: string;
};
export type ExpertChatPage = {
  attempt: number;
  status: ExpertVerificationStatus;
  canSend: boolean;
  items: ExpertChatMessage[];
  hasMore: boolean;
  nextBefore: string | null;
  nextAfter: string | null;
};
export type SendExpertMessage = { attempt: number; clientMessageId: string; content: string };
export type ExpertChatQuery = { attempt: number; before?: string; after?: string; limit?: number };
