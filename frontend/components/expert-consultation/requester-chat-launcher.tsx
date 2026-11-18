"use client";

import { useProfile } from "@/hooks/profile/use-profile";
import { ExpertChatLauncher } from "./expert-chat-launcher";
import type { ExpertVerification } from "@/types/expert-verification";

export function RequesterChatLauncher({ verification, title }: { verification: ExpertVerification; title: string }) {
  const profile = useProfile();
  const requesterId = typeof verification.requestedBy === "object" ? verification.requestedBy._id : verification.requestedBy;
  if (!profile.data || profile.data.user.id !== requesterId) return null;
  return (
    <ExpertChatLauncher
      key={`${verification.reviewId}:${verification.attempt}`}
      reviewId={verification.reviewId}
      attempt={verification.attempt}
      title={title}
      participant="requester"
    />
  );
}
