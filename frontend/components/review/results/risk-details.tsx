"use client";

import { Button } from "@/components/ui/button";

import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { isApiClientError } from "@/lib/api/client";
import { useRemoveProposedRevisionMutation, useUpdateProposedRevisionMutation } from "@/hooks/contracts/use-contracts";
import type { RiskFinding } from "@/types/contracts";

function errorMessage(error: unknown) {
  return isApiClientError(error) ? error.message : "Vui lòng thử lại sau.";
}

export function RiskDetails({ contractId, finding, allowProposalEditing = false }: {
  contractId?: string;
  finding: RiskFinding;
  allowProposalEditing?: boolean;
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
      await update.mutateAsync({ contractId, findingId, update: { revisedText: revisedText.trim(), ...(reason.trim() ? { reason: reason.trim() } : {}) } });
      setEditing(false);
      toast.success("Đã lưu đề xuất chỉnh sửa");
    } catch (error) {
      toast.error("Chưa thể lưu đề xuất", { description: errorMessage(error) });
    }
  }

  async function discard() {
    if (!contractId || !findingId) return;
    try {
      await remove.mutateAsync({ contractId, findingId });
      setEditing(false);
      toast.success("Đã bỏ đề xuất chỉnh sửa");
    } catch (error) {
      toast.error("Chưa thể bỏ đề xuất", { description: errorMessage(error) });
    }
  }

  return <div className="[&_h4]:text-[#31445f] [&_h4]:text-ui-section [&_h4]:font-semibold [&_h4]:m-0 grid gap-[13px] border [background:#f8faff] mt-3 p-3.5 rounded-lg border-solid border-[#e3eaf5] [&_ul]:grid [&_ul]:gap-1 [&_ul]:[list-style:disc] [&_ul]:text-[#52647e] [&_ul]:text-ui [&_ul]:leading-[1.6] [&_ul]:mt-1.5 [&_ul]:mb-0 [&_ul]:mx-0 [&_ul]:pl-[17px] [&_li]:list-item [&_li]:p-0 [&_li]:border-0 [&_li]:border-none [&_li]:border-current [&_li_p]:whitespace-pre-wrap [&_li_p]:mt-1 [&_li_p]:mb-0 [&_li_p]:mx-0 [&_li_strong]:text-[#31445f]">
    {!!finding.problem?.length && <div><h4>Vấn đề</h4><ul>{finding.problem.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {!!finding.consequences?.length && <div><h4>Ảnh hưởng</h4><ul>{finding.consequences.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {!!finding.recommendations?.length && <div><h4>Đề xuất xử lý</h4><ul>{finding.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ul></div>}
    {!!finding.legalBasis?.length && <div><h4>Cơ sở pháp lý</h4><ul>{finding.legalBasis.map((item, index) => <li key={index}>{item.text}</li>)}</ul></div>}
    {!!finding.citations?.length && <div><h4>Nguồn tham chiếu</h4><ul>{finding.citations.map((citation, index) => <li key={`${citation.legalKnowledgeChunkId}-${index}`}><strong>{citation.citationLabel || citation.sourceTitle}</strong>{citation.articleRef && ` · ${citation.articleRef}`}{citation.chunkText && <p>{citation.chunkText}</p>}</li>)}</ul></div>}
    {editing && allowProposalEditing ? <form onSubmit={save} className="[&_button:not([data-slot=button])]:text-[#2864dc] [&_button:not([data-slot=button])]:[background:none] [&_button:not([data-slot=button])]:[font:inherit] [&_button:not([data-slot=button])]:cursor-pointer [&_button:not([data-slot=button])]:mt-[9px] [&_button:not([data-slot=button])]:p-0 [&_button:not([data-slot=button])]:border-0 [&_button:not([data-slot=button])]:border-none [&_button:not([data-slot=button])]:border-current [&_button:not([data-slot=button])]:text-ui [&_button:not([data-slot=button])]:font-semibold [&_button:not([data-slot=button]):focus-visible]:[outline:2px_solid_#2864dc] [&_button:not([data-slot=button]):focus-visible]:outline-offset-[3px] [&>_div]:flex [&>_div]:gap-[15px] grid gap-2.5 [&_label]:grid [&_label]:gap-[5px] [&_label]:text-[#31445f] [&_label]:text-ui [&_label]:font-bold [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:border [&_textarea]:[background:#fff] [&_textarea]:text-[#263750] [&_textarea]:[font:inherit] [&_textarea]:resize-y [&_textarea]:p-[9px] [&_textarea]:rounded-md [&_textarea]:border-solid [&_textarea]:border-[#cad5e5] [&_textarea]:text-ui-document [&_textarea]:[line-height:1.5] [&_button:not([data-slot=button]):disabled]:opacity-50 [&_button:not([data-slot=button]):disabled]:cursor-default">
      <label>Đoạn đề xuất<textarea value={revisedText} onChange={(event) => setRevisedText(event.target.value)} rows={5} required /></label>
      <label>Lý do chỉnh sửa<textarea value={reason} onChange={(event) => setReason(event.target.value)} rows={2} /></label>
      <div><Button variant="default" size="sm" type="submit" disabled={busy || !revisedText.trim()}>Lưu đề xuất</Button><Button variant="outline" size="sm" type="button" onClick={() => setEditing(false)} disabled={busy}>Hủy</Button></div>
    </form> : <>
      {finding.proposedRevision?.revisedText && <div className="[border-left:3px_solid_#8baefa] [background:#fff] p-2.5 [&_p]:block [&_p]:text-[#435775] [&_p]:text-ui [&_p]:leading-[1.6] [&_p]:whitespace-pre-wrap [&_p]:mt-1.5 [&_p]:mb-0 [&_p]:mx-0 [&_small]:block [&_small]:text-[#435775] [&_small]:text-ui [&_small]:leading-[1.6] [&_small]:whitespace-pre-wrap [&_small]:mt-1.5 [&_small]:mb-0 [&_small]:mx-0"><h4>Đề xuất chỉnh sửa</h4><p>{finding.proposedRevision.revisedText}</p>{finding.proposedRevision.reason && <small>{finding.proposedRevision.reason}</small>}</div>}
      {allowProposalEditing && contractId && findingId && finding.proposedRevision && <div className="[&_button:not([data-slot=button])]:text-[#2864dc] [&_button:not([data-slot=button])]:[background:none] [&_button:not([data-slot=button])]:[font:inherit] [&_button:not([data-slot=button])]:cursor-pointer [&_button:not([data-slot=button])]:mt-[9px] [&_button:not([data-slot=button])]:p-0 [&_button:not([data-slot=button])]:border-0 [&_button:not([data-slot=button])]:border-none [&_button:not([data-slot=button])]:border-current [&_button:not([data-slot=button])]:text-ui [&_button:not([data-slot=button])]:font-semibold [&_button:not([data-slot=button]):focus-visible]:[outline:2px_solid_#2864dc] [&_button:not([data-slot=button]):focus-visible]:outline-offset-[3px] flex gap-[15px] [&_button:not([data-slot=button]):disabled]:opacity-50 [&_button:not([data-slot=button]):disabled]:cursor-default"><Button variant="outline" size="sm" type="button" onClick={() => { setRevisedText(finding.proposedRevision?.revisedText ?? ""); setReason(finding.proposedRevision?.reason ?? ""); setEditing(true); }}>Chỉnh sửa đề xuất</Button><Button variant="outline" size="sm" type="button" onClick={discard} disabled={busy}>Bỏ đề xuất</Button></div>}
    </>}
  </div>;
}
