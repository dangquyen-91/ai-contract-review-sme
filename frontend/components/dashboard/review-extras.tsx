"use client";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useContractChatMessages, useRemoveProposedRevisionMutation, useStreamChatMutation, useUpdateProposedRevisionMutation } from "@/hooks/use-contracts";
import { isApiClientError } from "@/lib/api/client";
import type { RiskFinding } from "@/types/contracts";
import styles from "@/styles/review-results.module.css";

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

  return <div className={styles.riskDetails}>
    {!!finding.problem?.length && <div><h4>Vấn đề</h4><ul>{finding.problem.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {!!finding.consequences?.length && <div><h4>Hệ quả</h4><ul>{finding.consequences.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {!!finding.recommendations?.length && <div><h4>Khuyến nghị</h4><ul>{finding.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {!!finding.legalBasis?.length && <div><h4>Cơ sở pháp lý</h4><ul>{finding.legalBasis.map((item, index) => <li key={index}>{item.text}</li>)}</ul></div>}
    {!!finding.citations?.length && <div><h4>Nguồn tham chiếu</h4><ul>{finding.citations.map((citation, index) => <li key={`${citation.legalKnowledgeChunkId}-${index}`}><strong>{citation.citationLabel || citation.sourceTitle}</strong>{citation.articleRef && ` · ${citation.articleRef}`}{citation.chunkText && <p>{citation.chunkText}</p>}</li>)}</ul></div>}
    {editing ? <form onSubmit={save} className={styles.revisionForm}>
      <label>Đoạn đề xuất<textarea value={revisedText} onChange={(event) => setRevisedText(event.target.value)} rows={5} required /></label>
      <label>Lý do chỉnh sửa<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} /></label>
      <div><button type="submit" disabled={busy || !revisedText.trim()}>Lưu đề xuất</button><button type="button" onClick={() => setEditing(false)} disabled={busy}>Hủy</button></div>
    </form> : <>
      {finding.proposedRevision?.revisedText && <div className={styles.revision}><h4>Đề xuất chỉnh sửa</h4><p>{finding.proposedRevision.revisedText}</p>{finding.proposedRevision.reason && <small>{finding.proposedRevision.reason}</small>}</div>}
      {contractId && findingId && finding.proposedRevision && <div className={styles.revisionActions}><button type="button" onClick={() => { setRevisedText(finding.proposedRevision?.revisedText ?? ""); setReason(finding.proposedRevision?.reason ?? ""); setEditing(true); }}>Chỉnh sửa đề xuất</button><button type="button" onClick={discard} disabled={busy}>Bỏ đề xuất</button></div>}
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

  return <section className={styles.chat} aria-labelledby="contract-chat-heading">
    <div className={styles.chatHeading}><h3 id="contract-chat-heading">Hỏi về hợp đồng</h3><p>Đặt câu hỏi dựa trên nội dung và kết quả rà soát.</p></div>
    <div className={styles.chatHistory} role="log" aria-live="polite" aria-relevant="additions text">
      {isLoading && <p>Đang tải cuộc trò chuyện...</p>}
      {error && <p>Chưa tải được cuộc trò chuyện. <button type="button" onClick={() => refetch()}>Thử lại</button></p>}
      {!isLoading && !error && !messages.length && !pendingQuestion && <p>Chưa có câu hỏi nào cho hợp đồng này.</p>}
      {messages.map((message) => <div key={message._id} className={message.role === "user" ? styles.chatUser : styles.chatAssistant}><strong>{message.role === "user" ? "Bạn" : "LawScan AI"}</strong><p>{message.content}</p></div>)}
      {pendingQuestion && <><div className={styles.chatUser}><strong>Bạn</strong><p>{pendingQuestion}</p></div><div className={styles.chatAssistant}><strong>LawScan AI</strong><p>{answer || "Đang trả lời..."}</p></div></>}
    </div>
    {canAsk ? <form className={styles.chatForm} onSubmit={ask}><label htmlFor="contract-question">Câu hỏi của bạn</label><div><input id="contract-question" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Ví dụ: Điều khoản thanh toán có rủi ro gì?" maxLength={2000} disabled={stream.isPending} /><button type="submit" disabled={stream.isPending || !draft.trim()}>{stream.isPending ? "Đang trả lời..." : "Gửi câu hỏi"}</button></div></form> : <p className={styles.chatNotice}>Vai trò hiện tại chỉ có thể xem cuộc trò chuyện.</p>}
  </section>;
}
