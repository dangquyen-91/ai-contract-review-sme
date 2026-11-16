"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import { draftKeys } from "./use-contract-drafts";
import type { ContractDraft, DraftSummary } from "@/types/contract-drafts";

export function useDraftListActions(
  draft: DraftSummary,
  onPinned: () => void,
  onDeleted: () => void,
) {
  const client = useQueryClient();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const pinned = Boolean(draft.pinnedAt);

  async function pin() {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const next = await contractDraftsApi.pin(draft.id, !pinned);
      client.setQueryData<ContractDraft>(draftKeys.detail(draft.id), (old) =>
        old ? { ...old, pinnedAt: next.pinnedAt } : old,
      );
      await client.invalidateQueries({ queryKey: draftKeys.lists });
      onPinned();
      toast.success(
        pinned ? "Đã bỏ ghim bản nháp" : "Đã ghim bản nháp lên đầu danh sách",
      );
    } catch (reason) {
      toast.error(
        reason instanceof Error ? reason.message : "Chưa cập nhật được ghim.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  async function remove() {
    if (lock.current) return false;
    if (draft.status !== "draft") {
      setDeleteError("Chỉ xóa bản nháp chưa gửi duyệt.");
      return false;
    }
    lock.current = true;
    setBusy(true);
    setDeleteError("");
    try {
      await contractDraftsApi.remove(draft.id, draft.revision);
      client.removeQueries({
        queryKey: draftKeys.detail(draft.id),
        exact: true,
      });
      onDeleted();
      await client.invalidateQueries({ queryKey: draftKeys.lists });
      toast.success("Đã xóa bản nháp");
      return true;
    } catch (reason) {
      setDeleteError(
        reason instanceof Error ? reason.message : "Chưa xóa được bản nháp.",
      );
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return {
    pinned,
    canDelete: draft.status === "draft",
    busy,
    deleteError,
    clearDeleteError: () => setDeleteError(""),
    pin,
    remove,
  };
}
