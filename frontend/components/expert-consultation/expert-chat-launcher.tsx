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
          <DialogContent className="flex h-[min(720px,calc(100dvh-1.5rem))] max-h-[calc(100dvh-1.5rem)] flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 text-slate-900 [color-scheme:light] sm:max-w-[680px]">
            <DialogHeader className="flex shrink-0 flex-row items-center gap-3 border-b border-slate-200 px-4 py-4 pr-12 text-left sm:px-6">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-100 text-blue-700">
                <MessageCircle aria-hidden="true" className="size-5" />
              </span>
              <div className="min-w-0">
                <DialogTitle className="text-base font-semibold">Trao đổi trực tiếp</DialogTitle>
                <DialogDescription className="mt-0.5 truncate text-slate-600" title={title}>{title}</DialogDescription>
              </div>
            </DialogHeader>
            <ExpertChat key={`${reviewId}:${attempt}:${participant}`} reviewId={reviewId} attempt={attempt} participant={participant} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
