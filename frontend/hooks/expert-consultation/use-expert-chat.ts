"use client";

import { useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expertConsultationApi } from "@/lib/api/expert-consultation";
import { expertConsultationKeys } from "@/lib/query-keys/expert-consultation";
import { conversationMessages } from "@/lib/expert-consultation/chat";
import { expertChatMessageSchema } from "@/schemas/expert-chat.schema";
import type { ChatParticipant, SendExpertMessage } from "@/types/expert-consultation";

export function useExpertChat(reviewId: string, attempt: number, participant: ChatParticipant) {
  const client = useQueryClient();
  const queryKey = expertConsultationKeys.messages(reviewId, attempt, participant);
  const query = useInfiniteQuery({
    queryKey,
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) => expertConsultationApi.messages(reviewId, { attempt, before: pageParam, limit: 30 }, signal),
    getNextPageParam: (page) => page.hasMore ? page.nextBefore ?? undefined : undefined,
    enabled: Boolean(reviewId && attempt),
    retry: false,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: (state) => {
      const status = state.state.data?.pages[0]?.status;
      return !state.state.error && (status === "requested" || status === "in_progress") ? 5000 : false;
    },
  });
  const [draft, setDraft] = useState("");
  const pendingInput = useRef<SendExpertMessage | null>(null);
  const lock = useRef(false);
  const messages = useMemo(() => conversationMessages(query.data?.pages ?? []), [query.data]);
  const mutation = useMutation({
    mutationFn: (input: SendExpertMessage) => expertConsultationApi.send(reviewId, input),
    retry: false,
    gcTime: 0,
    onSettled: () => client.invalidateQueries({ queryKey }),
  });
  const validation = expertChatMessageSchema.safeParse(draft);
  const metadata = query.data?.pages[0];
  const canSend = Boolean(metadata?.canSend && !query.isError && !query.isPending);

  async function send() {
    if (lock.current || mutation.isPending || !canSend || !validation.success) return;
    lock.current = true;
    const content = validation.data;
    // Preserve the UUID after a lost response so retrying cannot duplicate a message.
    if (!pendingInput.current || pendingInput.current.content !== content) {
      pendingInput.current = { attempt, content, clientMessageId: crypto.randomUUID() };
    }
    try {
      await mutation.mutateAsync(pendingInput.current);
      pendingInput.current = null;
      setDraft("");
    } catch {
      // Keep the draft and request identifier for an explicit retry.
    } finally {
      lock.current = false;
    }
  }

  return { query, messages, metadata, draft, setDraft, mutation, canSend, send,
    validationError: draft && !validation.success ? validation.error.issues[0].message : undefined };
}
