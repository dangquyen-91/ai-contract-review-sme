"use client";

import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api/payments";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useContractChatMessages, useStreamChatMutation } from "@/hooks/contracts/use-contracts";
import { isApiClientError } from "@/lib/api/client";
import { isQuotaExhausted, TOP_UP_HREF } from "@/lib/subscription/quota-error";

export const contractChatAllowanceKey = (contractId: string) =>
  ["contract-chat-allowance", contractId] as const;

export function useContractChat(contractId: string, canAsk: boolean, canManagePlan = false, personal = false) {
  const router = useRouter();
  const client = useQueryClient();
  // Chat included with a paid per-contract review; only personal accounts can buy one.
  const allowance = useQuery({
    queryKey: contractChatAllowanceKey(contractId),
    queryFn: async () => (await paymentsApi.reviewQuote(contractId)).contractChat ?? null,
    enabled: personal,
    retry: false,
    staleTime: 0,
  });
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
      const outOfCredits = isQuotaExhausted(error);
      toast.error(outOfCredits ? "Đã hết lượt chat" : "Chưa thể trả lời câu hỏi", {
        description: isApiClientError(error) ? error.message : "Vui lòng thử lại sau.",
        ...(outOfCredits && canManagePlan
          ? { action: { label: "Thêm lượt", onClick: () => router.push(TOP_UP_HREF) } }
          : {}),
      });
      setDraft(message);
    } finally {
      setPendingQuestion("");
      setAnswer("");
      sending.current = false;
      if (personal) void client.invalidateQueries({ queryKey: contractChatAllowanceKey(contractId) });
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
    includedChat: allowance.data?.allowance ? allowance.data : null,
    ask,
  };
}
