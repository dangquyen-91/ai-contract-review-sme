"use client";
import { useState } from "react";
import Link from "next/link";
import { FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSaveDraftCache } from "@/hooks/use-contract-drafts";
import { contractDraftsApi } from "@/lib/api/contract-drafts";
import type { AuthUser } from "@/types/auth";
import type { ContractDraft } from "@/types/contract-drafts";
import { StudioShell } from "./studio-shell";

export function StudioLoadingState({
  user,
  error,
  onRetry,
}: {
  user: AuthUser;
  error?: string;
  onRetry: () => void;
}) {
  return (
    <StudioShell user={user}>
      <div className="grid h-full place-items-center bg-slate-50 p-8">
        <div className="text-center">
          <FileText className="mx-auto mb-4 text-blue-500" size={32} />
          <p className="text-sm text-slate-500">
            {error ?? "Đang mở không gian soạn thảo…"}
          </p>
          {error && (
            <Button className="mt-4" onClick={onRetry}>
              Thử lại
            </Button>
          )}
        </div>
      </div>
    </StudioShell>
  );
}

export function StudioLegacyEntry({
  user,
  draft,
}: {
  user: AuthUser;
  draft: ContractDraft;
}) {
  const cache = useSaveDraftCache();
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState("");
  const id = draft.id;
  return (
    <StudioShell
      user={user}
      organizationName={draft.organization.name}
      blockNavigation={opening}
    >
      <div className="grid h-full place-items-center bg-[#f6f8fb] p-6">
        <div className="max-w-md rounded-3xl border border-white bg-white p-8 shadow-sm">
          <Sparkles className="mb-5 text-blue-600" size={28} />
          <h1 className="text-2xl font-semibold tracking-tight">
            Mở trong không gian soạn mới
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Bản nháp cũ của bạn được giữ nội dung. Chuyển sang trình soạn để
            chỉnh trực tiếp trên văn bản và dùng trợ lý AI.
          </p>
          {openError && (
            <p role="alert" className="mt-3 text-sm text-red-600">
              {openError}
            </p>
          )}
          <Button
            className="mt-6"
            loading={opening}
            disabled={opening}
            onClick={() => {
              setOpening(true);
              setOpenError("");
              void contractDraftsApi
                .openStudio(id, draft.revision)
                .then(cache)
                .catch((error) => setOpenError(error.message))
                .finally(() => setOpening(false));
            }}
          >
            Mở trình soạn mới
          </Button>
          <Link
            href="/contract-drafts"
            className="mt-4 block text-xs text-slate-500"
          >
            ← Về các mẫu hợp đồng
          </Link>
        </div>
      </div>
    </StudioShell>
  );
}
