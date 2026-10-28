"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import { studioInput } from "@/lib/contract-drafts/studio-document";
import { useSaveDraftCache } from "./use-contract-drafts";
import type { ContractDraft } from "@/types/contract-drafts";
import type {
  StudioDocument,
  StudioProposal,
  StudioReference,
} from "@/types/template-studio";

const editable = (draft: ContractDraft) => ({
  title: draft.title,
  ourParty: draft.ourParty,
  input: draft.input,
  document: draft.document!,
});
export type TemplateStudioState = ReturnType<typeof useTemplateStudio>;

export function useTemplateStudio(initial: ContractDraft) {
  const router = useRouter();
  const client = useQueryClient();
  const cache = useSaveDraftCache();
  const [draft, setDraft] = useState(initial);
  const [values, setValues] = useState(() => editable(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(editable(initial)));
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [documentEpoch, setDocumentEpoch] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const lock = useRef(false);
  const request = useRef<{
    revision: number;
    requestId: string;
    message: string;
    blockIds: string[];
    references: StudioReference[];
  } | null>(null);
  const dirty = JSON.stringify(values) !== saved;
  const historyKey = ["contract-drafts", "assistant", draft.id];
  const history = useQuery({
    queryKey: historyKey,
    queryFn: () => contractDraftsApi.assistantHistory(draft.id),
    staleTime: 10_000,
    refetchInterval: 15_000,
  });

  const accept = useCallback(
    (next: ContractDraft, signature?: string, replace = false) => {
      setDraft(next);
      setSaved(JSON.stringify(editable(next)));
      cache(next);
      setValues((current) =>
        !signature || JSON.stringify(current) === signature
          ? editable(next)
          : current,
      );
      if (replace) setDocumentEpoch((epoch) => epoch + 1);
    },
    [cache],
  );

  const save = useCallback(
    async (manual = false) => {
      if (lock.current || !dirty || draft.status !== "draft") return;
      lock.current = true;
      setBusy("save");
      setError("");
      try {
        accept(
          await contractDraftsApi.saveStudio(draft.id, draft.revision, values),
          JSON.stringify(values),
        );
        if (manual) toast.success("Đã lưu hợp đồng");
      } catch (reason) {
        setError(
          reason instanceof Error ? reason.message : "Chưa lưu được văn bản.",
        );
      } finally {
        lock.current = false;
        setBusy("");
      }
    },
    [accept, dirty, draft.id, draft.revision, draft.status, values],
  );

  useEffect(() => {
    if (!dirty || busy || error || draft.status !== "draft") return;
    const timer = setTimeout(() => void save(), 1200);
    return () => clearTimeout(timer);
  }, [dirty, busy, error, draft.status, save]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (dirty || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, busy]);

  async function persist() {
    if (!dirty) return draft;
    const next = await contractDraftsApi.saveStudio(
      draft.id,
      draft.revision,
      values,
    );
    accept(next, JSON.stringify(values));
    return next;
  }
  function changeDocument(document: StudioDocument) {
    setValues((current) => {
      const input = studioInput(document, current.input);
      const previousFields = studioInput(current.document);
      const currentFields = studioInput(document);
      for (const key of Object.keys(previousFields))
        if (!(key in currentFields)) input[key] = "";
      return { ...current, document, input };
    });
    setError("");
  }
  function changeTitle(title: string) {
    setValues((current) => ({ ...current, title }));
    setError("");
  }

  async function ask(
    message: string,
    blockIds: string[],
    references: StudioReference[] = [],
  ) {
    if (lock.current || draft.status !== "draft") return false;
    lock.current = true;
    setBusy("assistant");
    setError("");
    try {
      const current = await persist();
      const prior = request.current;
      if (
        !prior ||
        prior.revision !== current.revision ||
        prior.message !== message ||
        JSON.stringify(prior.blockIds) !== JSON.stringify(blockIds) ||
        JSON.stringify(prior.references) !== JSON.stringify(references)
      )
        request.current = {
          revision: current.revision,
          requestId: crypto.randomUUID(),
          message,
          blockIds,
          references,
        };
      const proposal = await contractDraftsApi.askAssistant(
        current.id,
        request.current!,
      );
      client.setQueryData<StudioProposal[]>(historyKey, (rows) =>
        [
          ...(rows ?? []).filter((row) => row.id !== proposal.id),
          proposal,
        ].slice(-50),
      );
      request.current = null;
      setCanRetry(false);
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Chưa nhận được đề xuất. Hãy kiểm tra lịch sử trước khi thử lại.",
      );
      return false;
    } finally {
      setCanRetry(Boolean(request.current));
      lock.current = false;
      setBusy("");
      void client.invalidateQueries({ queryKey: ["org-subscription"] });
      void client.invalidateQueries({ queryKey: historyKey });
    }
  }

  async function proposalAction(
    proposal: StudioProposal,
    action: "apply" | "dismiss",
  ) {
    if (lock.current || draft.status !== "draft") return;
    if (
      action === "apply" &&
      (dirty || proposal.baseRevision !== draft.revision)
    ) {
      toast.info("Văn bản đã thay đổi. Hãy lưu và yêu cầu đề xuất mới.");
      return;
    }
    lock.current = true;
    setBusy(action);
    setError("");
    try {
      const next = await contractDraftsApi.actOnProposal(
        draft.id,
        proposal.id,
        draft.revision,
        action,
      );
      if (action === "apply") {
        accept(next, undefined, true);
        toast.success("Đã áp dụng thay đổi");
      }
      await client.invalidateQueries({ queryKey: historyKey });
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chưa xử lý được đề xuất.",
      );
    } finally {
      lock.current = false;
      setBusy("");
    }
  }

  async function run(
    action: "submit" | "approve" | "return" | "download" | "publish",
    note = "",
  ) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(action);
    setError("");
    try {
      const current = await persist();
      if (action === "download") await contractDraftsApi.download(current.id);
      else if (action === "publish") {
        const result = await contractDraftsApi.publish(
          current.id,
          current.revision,
        );
        await client.invalidateQueries({ queryKey: ["contracts"] });
        await client.invalidateQueries({ queryKey: ["dashboard"] });
        router.push(`/contract/${result.contractId}`);
      } else {
        accept(
          await contractDraftsApi.decide(
            current.id,
            current.revision,
            action,
            note,
          ),
        );
        toast.success(
          action === "approve"
            ? "Đã duyệt hợp đồng"
            : action === "return"
              ? "Đã yêu cầu chỉnh sửa"
              : "Đã gửi chủ tổ chức duyệt",
        );
      }
      return true;
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chưa hoàn tất thao tác.",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy("");
    }
  }
  async function reload() {
    if (
      lock.current ||
      (dirty && !window.confirm("Bỏ thay đổi chưa lưu và tải lại văn bản?"))
    )
      return;
    lock.current = true;
    setBusy("reload");
    try {
      accept(await contractDraftsApi.get(draft.id), undefined, true);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Chưa tải lại được văn bản.",
      );
    } finally {
      lock.current = false;
      setBusy("");
    }
  }
  return {
    draft,
    values,
    dirty,
    busy,
    error,
    history,
    documentEpoch,
    canRetry,
    save,
    ask,
    proposalAction,
    run,
    reload,
    changeDocument,
    changeTitle,
  };
}
