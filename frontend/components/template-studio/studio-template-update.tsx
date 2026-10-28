"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  useDraftCatalog,
  useSaveDraftCache,
} from "@/hooks/contract-drafts/use-contract-drafts";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import type { ContractDraft } from "@/types/contract-drafts";
import { Button } from "@/components/ui/button";

export function StudioTemplateUpdate({
  draft,
  disabled,
}: {
  draft: ContractDraft;
  disabled: boolean;
}) {
  const catalog = useDraftCatalog();
  const cache = useSaveDraftCache();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const latest = catalog.data?.templates.find(
    (item) => item.code === draft.templateCode,
  );
  if (!latest || latest.version <= draft.templateVersion) return null;
  async function copy() {
    setBusy(true);
    setError("");
    try {
      const next = await contractDraftsApi.copyLatest(draft.id, draft.revision);
      cache(next);
      router.push(`/contract-drafts/${next.id}`);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Chưa tạo được bản theo mẫu mới.",
      );
      setBusy(false);
    }
  }
  return (
    <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-blue-100 bg-blue-50 px-5 py-2.5 text-xs leading-5 text-blue-900">
      <div className="min-w-0 flex-1">
        <p>
          Đã có mẫu v{latest.version}. Bản này đang dùng mẫu v
          {draft.templateVersion}.
        </p>
        <p className="text-[11px] text-blue-700">
          Tạo bản mới để dùng nội dung mới nhất và mang theo thông tin đã điền.
          Phần câu chữ đã chỉnh tay vẫn được giữ ở bản cũ.
          {disabled ? " Hãy lưu và chờ thao tác hiện tại hoàn tất trước." : ""}
        </p>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
      </div>
      <Button
        size="sm"
        variant="outline"
        disabled={disabled || busy}
        loading={busy}
        onClick={() => void copy()}
      >
        Dùng mẫu mới
      </Button>
    </div>
  );
}
