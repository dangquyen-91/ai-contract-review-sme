"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useContractChatMessages, useRemoveProposedRevisionMutation, useStreamChatMutation, useUpdateProposedRevisionMutation } from "@/hooks/use-contracts";
import { isApiClientError } from "@/lib/api/client";
import type { RiskFinding } from "@/types/contracts";

function errorMessage(error: unknown) {
  return isApiClientError(error) ? error.message : "Vui lòng thử lại sau.";
}

export function RiskDetails({ contractId, finding, onChange }: {
  contractId?: string;
  finding: RiskFinding;
  onChange: (finding: RiskFinding) => void;
}) {
  const findingId = finding.id ?? finding._id;
  const [editing, setEditing] = useState(false);
  const [revisedText, setRevisedText] = useState(finding.proposedRevision?.revisedText ?? "");
  const [reason, setReason] = useState(finding.proposedRevision?.reason ?? "");
  const update = useUpdateProposedRevisionMutation();
  const remove = useRemoveProposedRevisionMutation();
  const busy = update.isPending || remove.isPending;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!contractId || !findingId || !revisedText.trim()) return;
    try {
      const next = await update.mutateAsync({ contractId, findingId, update: { revisedText: revisedText.trim(), ...(reason.trim() ? { reason: reason.trim() } : {}) } });
      onChange(next);
      setEditing(false);
      toast.success("Đã lưu đề xuất chỉnh sửa");
    } catch (error) {
      toast.error("Chưa thể lưu đề xuất", { description: errorMessage(error) });
    }
  }

  async function discard() {
    if (!contractId || !findingId) return;
    try {
      const next = await remove.mutateAsync({ contractId, findingId });
      onChange(next);
      setEditing(false);
      toast.success("Đã bỏ đề xuất chỉnh sửa");
    } catch (error) {
      toast.error("Chưa thể bỏ đề xuất", { description: errorMessage(error) });
    }
  }

  return <div className="[&_h4]:text-[#31445f] [&_h4]:text-[length:11px] [&_h4]:m-0 grid gap-[13px] border [background:#f8faff] mt-3 p-3.5 rounded-lg border-solid border-[#e3eaf5] [&_ul]:grid [&_ul]:gap-1 [&_ul]:[list-style:disc] [&_ul]:text-[#52647e] [&_ul]:text-[length:10px] [&_ul]:leading-[1.6] [&_ul]:mt-1.5 [&_ul]:mb-0 [&_ul]:mx-0 [&_ul]:pl-[17px] [&_li]:list-item [&_li]:p-0 [&_li]:border-0 [&_li]:border-none [&_li]:border-current [&_li_p]:whitespace-pre-wrap [&_li_p]:mt-1 [&_li_p]:mb-0 [&_li_p]:mx-0 [&_li_strong]:text-[#31445f]">
    {!!finding.problem?.length && <div><h4>Vấn đề</h4><ul>{finding.problem.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {!!finding.consequences?.length && <div><h4>Hệ quả</h4><ul>{finding.consequences.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {!!finding.recommendations?.length && <div><h4>Khuyến nghị</h4><ul>{finding.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {!!finding.legalBasis?.length && <div><h4>Cơ sở pháp lý</h4><ul>{finding.legalBasis.map((item, index) => <li key={index}>{item.text}</li>)}</ul></div>}
    {!!finding.citations?.length && <div><h4>Nguồn tham chiếu</h4><ul>{finding.citations.map((citation, index) => <li key={`${citation.legalKnowledgeChunkId}-${index}`}><strong>{citation.citationLabel || citation.sourceTitle}</strong>{citation.articleRef && ` · ${citation.articleRef}`}{citation.chunkText && <p>{citation.chunkText}</p>}</li>)}</ul></div>}
    {editing ? <form onSubmit={save} className="[&_button]:text-[#2864dc] [&_button]:[background:none] [&_button]:[font:inherit] [&_button]:cursor-pointer [&_button]:mt-[9px] [&_button]:p-0 [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:[font-size:10px] [&_button]:[font-weight:700] [&_button:focus-visible]:[outline:2px_solid_#2864dc] [&_button:focus-visible]:outline-offset-[3px] [&>_div]:flex [&>_div]:gap-[15px] grid gap-2.5 [&_label]:grid [&_label]:gap-[5px] [&_label]:text-[#31445f] [&_label]:text-[length:10px] [&_label]:font-bold [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:border [&_textarea]:[background:#fff] [&_textarea]:text-[#263750] [&_textarea]:[font:inherit] [&_textarea]:resize-y [&_textarea]:p-[9px] [&_textarea]:rounded-md [&_textarea]:border-solid [&_textarea]:border-[#cad5e5] [&_textarea]:[font-size:11px] [&_textarea]:[line-height:1.5] [&_button:disabled]:opacity-50 [&_button:disabled]:cursor-default">
      <label>Đoạn đề xuất<textarea value={revisedText} onChange={(event) => setRevisedText(event.target.value)} rows={5} required /></label>
      <label>Lý do chỉnh sửa<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} /></label>
      <div><button type="submit" disabled={busy || !revisedText.trim()}>Lưu đề xuất</button><button type="button" onClick={() => setEditing(false)} disabled={busy}>Hủy</button></div>
    </form> : <>
      {finding.proposedRevision?.revisedText && <div className="[border-left:3px_solid_#8baefa] [background:#fff] p-2.5 [&_p]:block [&_p]:text-[#435775] [&_p]:text-[length:10px] [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-1.5 [&_p]:mb-0 [&_p]:mx-0 [&_small]:block [&_small]:text-[#435775] [&_small]:text-[length:10px] [&_small]:leading-[1.6] [&_small]:whitespace-pre-wrap [&_small]:mt-1.5 [&_small]:mb-0 [&_small]:mx-0"><h4>Đề xuất chỉnh sửa</h4><p>{finding.proposedRevision.revisedText}</p>{finding.proposedRevision.reason && <small>{finding.proposedRevision.reason}</small>}</div>}
      {contractId && findingId && finding.proposedRevision && <div className="[&_button]:text-[#2864dc] [&_button]:[background:none] [&_button]:[font:inherit] [&_button]:cursor-pointer [&_button]:mt-[9px] [&_button]:p-0 [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:[font-size:10px] [&_button]:[font-weight:700] [&_button:focus-visible]:[outline:2px_solid_#2864dc] [&_button:focus-visible]:outline-offset-[3px] flex gap-[15px] [&_button:disabled]:opacity-50 [&_button:disabled]:cursor-default"><button type="button" onClick={() => { setRevisedText(finding.proposedRevision?.revisedText ?? ""); setReason(finding.proposedRevision?.reason ?? ""); setEditing(true); }}>Chỉnh sửa đề xuất</button><button type="button" onClick={discard} disabled={busy}>Bỏ đề xuất</button></div>}
    </>}
  </div>;
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
    <div className="[&_h3]:text-[length:14px] [&_h3]:m-0 [&_p]:text-[#66758a] [&_p]:text-[length:11px] [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><h3 id="contract-chat-heading">Hỏi về hợp đồng</h3><p>Đặt câu hỏi dựa trên nội dung và kết quả rà soát.</p></div>
    <div className="[&_button]:text-[#2864dc] [&_button]:[background:none] [&_button]:[font:inherit] [&_button]:cursor-pointer [&_button]:mt-[9px] [&_button]:p-0 [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:[font-size:10px] [&_button]:[font-weight:700] grid gap-2.5 max-h-[360px] overflow-y-auto border [background:#fbfcff] mt-3.5 p-3.5 rounded-[9px] border-solid border-[#e4e8ef] [&>_p]:text-[#66758a] [&>_p]:text-[length:11px] [&>_p]:m-0" role="log" aria-live="polite" aria-relevant="additions text">
      {isLoading && <p>Đang tải cuộc trò chuyện...</p>}
      {error && <p>Chưa tải được cuộc trò chuyện. <button type="button" onClick={() => refetch()}>Thử lại</button></p>}
      {!isLoading && !error && !messages.length && !pendingQuestion && <p>Chưa có câu hỏi nào cho hợp đồng này.</p>}
      {messages.map((message) => <div key={message._id} className={message.role === "user" ? "w-fit max-w-[min(85%,680px)] [background:#eaf1ff] px-3 py-2.5 rounded-[9px] justify-self-end [&_strong]:text-[#31445f] [&_strong]:text-[length:10px] [&_p]:text-[#354967] [&_p]:text-[length:11px] [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0" : "w-fit max-w-[min(85%,680px)] [background:#eaf1ff] px-3 py-2.5 rounded-[9px] [background:#fff] border border-solid border-[#e4e8ef] [&_strong]:text-[#31445f] [&_strong]:text-[length:10px] [&_p]:text-[#354967] [&_p]:text-[length:11px] [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"}><strong>{message.role === "user" ? "Bạn" : "LawScan AI"}</strong><p>{message.content}</p></div>)}
      {pendingQuestion && <><div className="w-fit max-w-[min(85%,680px)] [background:#eaf1ff] px-3 py-2.5 rounded-[9px] justify-self-end [&_strong]:text-[#31445f] [&_strong]:text-[length:10px] [&_p]:text-[#354967] [&_p]:text-[length:11px] [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><strong>Bạn</strong><p>{pendingQuestion}</p></div><div className="w-fit max-w-[min(85%,680px)] [background:#eaf1ff] px-3 py-2.5 rounded-[9px] [background:#fff] border border-solid border-[#e4e8ef] [&_strong]:text-[#31445f] [&_strong]:text-[length:10px] [&_p]:text-[#354967] [&_p]:text-[length:11px] [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-[5px] [&_p]:mb-0 [&_p]:mx-0"><strong>LawScan AI</strong><p>{answer || "Đang trả lời..."}</p></div></>}
    </div>
    {canAsk ? <form className="[&_label]:grid [&_label]:gap-[5px] [&_label]:text-[#31445f] [&_label]:text-[length:10px] [&_label]:font-bold mt-[13px] [&>_div]:flex [&>_div]:gap-2 [&>_div]:mt-1.5 [&_input]:flex-1 [&_input]:min-w-0 [&_input]:border [&_input]:[font:inherit] [&_input]:px-3 [&_input]:py-2.5 [&_input]:rounded-[7px] [&_input]:border-solid [&_input]:border-[#cad5e5] [&_input]:[font-size:11px] [&_button]:[background:#2864dc] [&_button]:text-white [&_button]:[font:inherit] [&_button]:cursor-pointer [&_button]:px-3.5 [&_button]:py-0 [&_button]:rounded-[7px] [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:disabled:opacity-50 [&_button]:disabled:cursor-default [&_button]:[@media_(max-width:_580px)]:min-h-[38px] [&_button]:[font-size:11px] [&_button]:[font-weight:700] [&>_div]:[@media_(max-width:_580px)]:flex-col" onSubmit={ask}><label htmlFor="contract-question">Câu hỏi của bạn</label><div><input id="contract-question" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ví dụ: Điều khoản thanh toán có rủi ro gì?" maxLength={2000} disabled={stream.isPending} /><button type="submit" disabled={stream.isPending || !draft.trim()}>{stream.isPending ? "Đang trả lời..." : "Gửi câu hỏi"}</button></div></form> : <p className="text-[#66758a] text-[length:11px] mt-[5px] mb-0 mx-0 mt-3">Vai trò hiện tại chỉ có thể xem cuộc trò chuyện.</p>}
  </section>;
}
