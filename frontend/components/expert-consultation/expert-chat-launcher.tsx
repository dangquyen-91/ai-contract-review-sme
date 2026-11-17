"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExpertChat } from "./expert-chat";
import type { ChatParticipant } from "@/types/expert-consultation";

export function ExpertChatLauncher({ reviewId, attempt, title, participant }: {
  reviewId: string; attempt: number; title: string; participant: ChatParticipant;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <MessageCircle aria-hidden="true" className="size-4" />
        {participant === "expert" ? "Trao đổi với người gửi" : "Trao đổi với chuyên gia"}
      </Button>
      {open && (
        <Dialog open onOpenChange={setOpen}>
          <DialogContent className="flex h-[min(760px,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] flex-col gap-3 overflow-hidden bg-card text-card-foreground [color-scheme:light] sm:max-w-3xl">
            <DialogHeader className="shrink-0 pr-6">
              <DialogTitle>Trao đổi trực tiếp</DialogTitle>
              <DialogDescription className="break-words leading-6 [overflow-wrap:anywhere]">
                {title} · Lần xác minh {attempt}. Cuộc trao đổi giữa người gửi yêu cầu và chuyên gia LawScan.
              </DialogDescription>
            </DialogHeader>
            <ExpertChat key={`${reviewId}:${attempt}:${participant}`} reviewId={reviewId} attempt={attempt} participant={participant} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
