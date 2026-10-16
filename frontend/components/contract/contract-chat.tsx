"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { isApiClientError } from "@/lib/api/client";
import { useContractChatMessages, useStreamChatMutation } from "@/hooks/use-contracts";

function errorMessage(error: unknown) {
  return isApiClientError(error) ? error.message : "Vui lòng thử lại sau.";
}

export function ContractChat({ contractId, canAsk }: { contractId: string; canAsk: boolean }) {
  const { data: messages = [], isLoading, error, refetch } = useContractChatMessages(contractId);
  const stream = useStreamChatMutation();
  const [draft, setDraft] = useState("");
  const [pendingQuestion, setPendingQuestion] = useState("");
  const [answer, setAnswer] = useState("");

  async function ask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || stream.isPending) return;
    setDraft("");
    setPendingQuestion(message);
    setAnswer("");
    try {
      await stream.mutateAsync({ contractId, message, onEvent: (event) => {
        if (event.event === "token") setAnswer((current) => current + event.data.text);
      } });
      await refetch();
      setPendingQuestion("");
      setAnswer("");
    } catch (requestError) {
      toast.error("Chưa thể trả lời câu hỏi", { description: errorMessage(requestError) });
      setDraft(message);
      setPendingQuestion("");
      setAnswer("");
    }
  }

  return <section className="[&_button:focus-visible]:[outline:2px_solid_#2864dc] [&_button:focus-visible]:outline-offset-[3px] [border-top:1px_solid_#e4e8ef] p-[22px]" aria-labelledby="contract-chat-heading">
    <div className="[&_h3]:text-ui-section [&_h3]:font-semibold [&_h3]:m-0 [&_p]:text-[#66758a] [&_p]:text-ui [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><h3 id="contract-chat-heading">Hỏi về hợp đồng</h3><p>Đặt câu hỏi dựa trên nội dung và kết quả rà soát.</p></div>
    <div className="[&_button]:text-[#2864dc] [&_button]:[background:none] [&_button]:[font:inherit] [&_button]:cursor-pointer [&_button]:mt-[9px] [&_button]:p-0 [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:text-ui [&_button]:font-semibold grid gap-2.5 max-h-[360px] overflow-y-auto border [background:#fbfcff] mt-3.5 p-3.5 rounded-[9px] border-solid border-[#e4e8ef] [&>_p]:text-[#66758a] [&>_p]:text-ui [&>_p]:m-0" role="log" aria-live="polite" aria-relevant="additions text">
      {isLoading && <p>Đang tải cuộc trò chuyện...</p>}
      {error && <p>Chưa tải được cuộc trò chuyện. <button type="button" onClick={() => refetch()}>Thử lại</button></p>}
      {!isLoading && !error && !messages.length && !pendingQuestion && <p>Chưa có câu hỏi nào cho hợp đồng này.</p>}
      {messages.map((message) => <div key={message._id} className={message.role === "user" ? "w-fit max-w-[min(85%,680px)] [background:#eaf1ff] px-3 py-2.5 rounded-[9px] justify-self-end [&_strong]:text-[#31445f] [&_strong]:text-ui [&_p]:text-[#354967] [&_p]:text-ui [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0" : "w-fit max-w-[min(85%,680px)] [background:#eaf1ff] px-3 py-2.5 rounded-[9px] [background:#fff] border border-solid border-[#e4e8ef] [&_strong]:text-[#31445f] [&_strong]:text-ui [&_p]:text-[#354967] [&_p]:text-ui [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"}><strong>{message.role === "user" ? "Bạn" : "LawScan AI"}</strong><p>{message.content}</p></div>)}
      {pendingQuestion && <><div className="w-fit max-w-[min(85%,680px)] [background:#eaf1ff] px-3 py-2.5 rounded-[9px] justify-self-end [&_strong]:text-[#31445f] [&_strong]:text-ui [&_p]:text-[#354967] [&_p]:text-ui [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><strong>Bạn</strong><p>{pendingQuestion}</p></div><div className="w-fit max-w-[min(85%,680px)] [background:#eaf1ff] px-3 py-2.5 rounded-[9px] [background:#fff] border border-solid border-[#e4e8ef] [&_strong]:text-[#31445f] [&_strong]:text-ui [&_p]:text-[#354967] [&_p]:text-ui [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><strong>LawScan AI</strong><p>{answer || "Đang trả lời..."}</p></div></>}
    </div>
    {canAsk ? <form className="[&_label]:grid [&_label]:gap-[5px] [&_label]:text-[#31445f] [&_label]:text-ui [&_label]:font-bold mt-[13px] [&>_div]:flex [&>_div]:gap-2 [&>_div]:mt-1.5 [&_input]:flex-1 [&_input]:min-w-0 [&_input]:border [&_input]:[font:inherit] [&_input]:px-3 [&_input]:py-2.5 [&_input]:rounded-[7px] [&_input]:border-solid [&_input]:border-[#cad5e5] [&_input]:text-ui-document [&_button]:[background:#2864dc] [&_button]:text-white [&_button]:[font:inherit] [&_button]:cursor-pointer [&_button]:px-3.5 [&_button]:py-0 [&_button]:rounded-[7px] [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:disabled:opacity-50 [&_button]:disabled:cursor-default [&_button]:[@media_(max-width:_580px)]:min-h-[38px] [&_button]:text-ui [&_button]:font-semibold [&>_div]:[@media_(max-width:_580px)]:flex-col" onSubmit={ask}><label htmlFor="contract-question">Câu hỏi của bạn</label><div><input id="contract-question" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ví dụ: Điều khoản thanh toán có rủi ro gì?" maxLength={2000} disabled={stream.isPending} /><button type="submit" disabled={stream.isPending || !draft.trim()}>{stream.isPending ? "Đang trả lời..." : "Gửi câu hỏi"}</button></div></form> : <p className="text-[#66758a] text-ui mt-[5px] mb-0 mx-0 mt-3">Vai trò hiện tại chỉ có thể xem cuộc trò chuyện.</p>}
  </section>;
}
