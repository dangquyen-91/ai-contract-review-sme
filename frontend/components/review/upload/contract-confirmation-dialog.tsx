"use client";

import { useState, type ReactNode } from "react";
import { CircleAlert, LoaderCircle } from "lucide-react";
import { toast } from "sonner";
import { AnalysisFocusDialog } from "@/components/review/upload/analysis-focus-dialog";
import { Button } from "@/components/ui/button";
import { reviewableTypeLabels } from "@/config/contract-display";
import { useConfirmProfileMutation, useContractClassification, useContractProfiles, useDeleteContract, useRetryClassificationMutation } from "@/hooks/use-contracts";
import { confirmationView, detectedNamesFor, LOW_CONFIDENCE, otherPartyNames, suggestedProfile } from "@/lib/contract-classification";
import { classificationOutcomeCopy, serverCodeMessage } from "@/lib/review-error-codes";
import { isApiClientError } from "@/lib/api/client";
import type { ClassificationOutcome } from "@/types/contracts";

type ContractConfirmationDialogProps = {
  contractId: string;
  contractTitle: string;
  isReviewing: boolean;
  onDismiss: () => void;
  onDeleted: () => void;
  onReview: (focus: string) => void;
  orgId?: string;
  role?: string;
};

type Choice = { type?: string; ourParty?: string };

function errorMessage(error: unknown) {
  if (isApiClientError(error)) return serverCodeMessage(error.serverCode) ?? error.message;
  return error instanceof Error ? error.message : "Vui lòng thử lại.";
}

function Chip({ selected, disabled, onClick, children }: { selected: boolean; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return <button type="button" aria-pressed={selected} disabled={disabled} onClick={onClick}
    className={`min-h-9 rounded-full border px-3 py-1.5 text-left text-ui leading-5 transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${selected ? "border-primary bg-accent font-semibold text-primary" : "border-border bg-card text-card-foreground hover:border-primary"}`}>{children}</button>;
}

function StatusLine({ children }: { children: ReactNode }) {
  return <div role="status" className="mb-4 flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 p-3 text-ui leading-6 text-card-foreground">
    <LoaderCircle className="size-4 shrink-0 animate-spin motion-reduce:animate-none" aria-hidden="true" />{children}
  </div>;
}

function Notice({ title, children, actions }: { title: string; children: ReactNode; actions?: ReactNode }) {
  return <div role="alert" className="mb-4 rounded-lg border border-[#f0d5c0] bg-[#fff9f1] p-3.5 text-ui leading-6 text-[#80572a]">
    <p className="m-0 flex items-center gap-2 font-semibold"><CircleAlert className="size-4 shrink-0" aria-hidden="true" />{title}</p>
    <div className="mt-1">{children}</div>
    {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
  </div>;
}

export function ContractConfirmationDialog({ contractId, contractTitle, isReviewing, onDismiss, onDeleted, onReview, orgId, role }: ContractConfirmationDialogProps) {
  const personal = role === "user";
  const typeLabels = reviewableTypeLabels(personal);
  const allowedTypes = Object.keys(typeLabels);
  const { data: contract, error: loadError } = useContractClassification(contractId);
  const { data: profiles } = useContractProfiles();
  const confirm = useConfirmProfileMutation();
  const reclassify = useRetryClassificationMutation();
  const remove = useDeleteContract();
  const [editing, setEditing] = useState<boolean | null>(null);
  const [choice, setChoice] = useState<Choice | null>(null);
  const busy = isReviewing || confirm.isPending || remove.isPending;

  if (!contract) {
    return <AnalysisFocusDialog contractTitle={contractTitle} isReviewing={false} onDismiss={onDismiss} onReview={() => undefined} hideFocus
      title="Xác nhận hợp đồng" description={`Đã tải lên “${contractTitle}”.`}
      confirmation={loadError ? <Notice title="Chưa tải được thông tin hợp đồng">{errorMessage(loadError)}</Notice> : <StatusLine>Đang tải thông tin hợp đồng…</StatusLine>} />;
  }

  const view = confirmationView(contract);
  const classification = contract.classification;
  const suggestion = suggestedProfile(contract, allowedTypes);
  const selected: Choice = choice ?? suggestion;
  const profile = profiles?.find((item) => item.code === selected.type);
  const partyLocked = personal && selected.type === "labor";
  const selectedParty = partyLocked ? "employee" : selected.ourParty;
  const lowConfidence = (classification?.confidence ?? 1) < LOW_CONFIDENCE;
  const autoEdit = view === "classify_failed" || (view === "ready" && !contract.type && (lowConfidence || !suggestion.type));
  const showEdit = editing ?? autoEdit;
  const canChoose = view === "ready" || view === "classify_failed" || (view === "blocked" && showEdit);
  const partyRequired = Boolean(profile?.parties.length) && !partyLocked;
  const canStart = canChoose && Boolean(selected.type) && (!partyRequired || Boolean(selectedParty));
  const changed = !contract.type || selected.type !== contract.type || selectedParty !== contract.ourParty;

  function startEditing() {
    setChoice(selected);
    setEditing(true);
  }

  function pickType(type: string) {
    setChoice({ type, ourParty: type === suggestion.type ? suggestion.ourParty : undefined });
  }

  async function deleteFile() {
    try {
      await remove.mutateAsync(contractId);
      toast.success("Đã xóa tệp hợp đồng");
      onDeleted();
    } catch (error) {
      toast.error("Chưa xóa được tệp", { description: errorMessage(error) });
    }
  }

  async function retryClassification() {
    try {
      await reclassify.mutateAsync({ contractId });
      setEditing(null);
    } catch (error) {
      toast.error("Chưa thể nhận diện lại", { description: errorMessage(error) });
    }
  }

  async function confirmAndReview(focus: string) {
    if (!selected.type) return;
    if (changed) {
      try {
        await confirm.mutateAsync({ contractId, type: selected.type, ourParty: selectedParty });
      } catch (error) {
        toast.error("Chưa xác nhận được hợp đồng", { description: errorMessage(error) });
        return;
      }
    }
    onReview(focus);
  }

  const deleteButton = <Button variant="outline" size="sm" onClick={deleteFile} loading={remove.isPending} disabled={busy}>Xóa tệp</Button>;
  const typeName = (code?: string) => (code && (typeLabels[code] ?? profiles?.find((item) => item.code === code)?.name)) || "Chưa xác định";
  const partyName = (code?: string) => profile?.parties.find((party) => party.code === code)?.name;
  const withNames = (code: string) => {
    const names = detectedNamesFor(contract, code);
    return names.length ? `${partyName(code)} — ${names.join(", ")}` : partyName(code);
  };

  let status: ReactNode = null;
  if (view === "reading") {
    const progress = contract.currentVersion?.extractionProgress;
    status = <StatusLine>Đang đọc nội dung hợp đồng{progress ? ` · ${progress.processedPages}/${progress.totalPages} trang` : "…"}</StatusLine>;
  } else if (view === "classifying") {
    status = <StatusLine>AI đang nhận diện loại hợp đồng và vai trò của bạn…</StatusLine>;
  } else if (view === "extraction_failed") {
    status = <Notice title="Không đọc được nội dung tệp" actions={deleteButton}>Hãy tải lên tệp rõ hơn hoặc ở định dạng khác. Bạn chưa bị trừ lượt nào.</Notice>;
  } else if (view === "classify_failed") {
    status = <Notice title="AI chưa nhận diện được hợp đồng" actions={<Button variant="outline" size="sm" onClick={retryClassification} loading={reclassify.isPending} disabled={busy}>Nhận diện lại</Button>}>Bạn có thể thử lại hoặc tự chọn loại hợp đồng bên dưới.</Notice>;
  } else if (view === "blocked" && classification?.outcome) {
    const copy = classificationOutcomeCopy[classification.outcome as Exclude<ClassificationOutcome, "supported">];
    status = <Notice title={copy.title} actions={<>{deleteButton}{!showEdit && <Button variant="ghost" size="sm" onClick={startEditing} disabled={busy}>Không đúng? Chọn loại khác</Button>}</>}>
      {classification.detectedLabel && <p className="m-0">AI nhận diện: <strong>{classification.detectedLabel}</strong></p>}
      <p className="m-0">{copy.message}</p>
      <p className="m-0">Hiện rà soát được: {Object.values(typeLabels).join(" · ")}.</p>
    </Notice>;
  }

  const summary = view === "ready" && !showEdit && selected.type && <dl className="mb-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg border border-border p-3.5 text-ui leading-6 [&_dt]:text-muted-foreground [&_dd]:m-0 [&_dd]:font-semibold [&_dd]:[overflow-wrap:anywhere]">
    <dt>Loại hợp đồng</dt><dd>{typeName(selected.type)}{classification?.source === "ai" && !contract.type && <span className="ml-2 font-normal text-muted-foreground">{lowConfidence ? "(cần bạn kiểm tra)" : "(AI nhận diện)"}</span>}</dd>
    {selectedParty && <><dt>Bạn là</dt><dd>{withNames(selectedParty)}</dd></>}
    {otherPartyNames(contract, selectedParty).length > 0 && <><dt>Bên còn lại</dt><dd>{otherPartyNames(contract, selectedParty).join(", ")}</dd></>}
    <dd className="col-span-2"><Button variant="ghost" size="sm" className="-ml-2" onClick={startEditing} disabled={busy}>Sửa</Button></dd>
  </dl>;

  const editor = canChoose && showEdit && <div className="mb-4 rounded-lg border border-border p-3.5">
    <p className="mb-2 mt-0 text-ui font-semibold text-card-foreground">Loại hợp đồng</p>
    <div className="flex flex-wrap gap-2">{allowedTypes.map((code) => <Chip key={code} selected={selected.type === code} disabled={busy} onClick={() => pickType(code)}>{typeLabels[code]}</Chip>)}</div>
    {profile && !partyLocked && profile.parties.length > 0 && <>
      <p className="mb-2 mt-4 text-ui font-semibold text-card-foreground">Bạn là bên nào?</p>
      <div className="flex flex-wrap gap-2">{profile.parties.map((party) => <Chip key={party.code} selected={selectedParty === party.code} disabled={busy} onClick={() => setChoice({ type: selected.type, ourParty: party.code })}>{withNames(party.code)}</Chip>)}</div>
    </>}
    {partyLocked && <p className="mb-0 mt-3 text-ui-meta text-muted-foreground">Tài khoản cá nhân rà soát hợp đồng lao động từ phía người lao động.</p>}
    {view === "blocked" && <p className="mb-0 mt-3 text-ui-meta leading-5 text-[#80572a]">Nếu chọn sai loại, AI sẽ đối chiếu sai điều khoản và nguồn luật, kết quả có thể không chính xác.</p>}
  </div>;

  const waiting = view === "reading" || view === "classifying";
  return <AnalysisFocusDialog contractTitle={contractTitle} orgId={orgId} role={role}
    isReviewing={busy}
    title={waiting ? "Đang chuẩn bị hợp đồng" : "Xác nhận hợp đồng"}
    description={`Đã tải lên “${contractTitle}”. Kiểm tra loại hợp đồng và vai trò của bạn trước khi rà soát.`}
    confirmation={<>{status}{summary}{editor}</>}
    hideFocus={waiting || view === "extraction_failed" || (view === "blocked" && !showEdit)}
    submitDisabled={!canStart}
    onDismiss={onDismiss}
    onReview={confirmAndReview} />;
}

