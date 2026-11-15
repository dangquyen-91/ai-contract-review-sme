"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { useContractChatMessages, useStreamChatMutation } from "@/hooks/contracts/use-contracts";
import { isApiClientError } from "@/lib/api/client";

export function useContractChat(contractId: string, canAsk: boolean) {
  const history = useContractChatMessages(contractId);
  const stream = useStreamChatMutation();
  const sending = useRef(false);
  const [draft, setDraft] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function ask() {
    const message = draft.trim();
    if (!canAsk || !message || sending.current || history.isLoading || history.isError) return;
    sending.current = true;
    setDraft("");
    setPendingQuestion(message);
    setAnswer("");
    try {
      await stream.mutateAsync({
        contractId,
        message,
        onEvent: (event) => {
          if (event.event === "token") setAnswer((current) => current + event.data.text);
        },
      });
      await history.refetch();
    } catch (error) {
      toast.error("Chưa thể trả lời câu hỏi", {
        description: isApiClientError(error) ? error.message : "Vui lòng thử lại sau.",
      });
      setDraft(message);
    } finally {
      setPendingQuestion("");
      setAnswer("");
      sending.current = false;
    }
  }

  return {
    messages: history.data ?? [],
    isLoading: history.isLoading,
    error: history.error,
    refetch: history.refetch,
    draft,
    setDraft,
    pendingQuestion,
    answer,
    isSending: Boolean(pendingQuestion),
    ask,
  };
}
