"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { useDetachVersionMutation } from "@/hooks/contracts/use-contracts";
import { canDetachVersion, isLikelyWrongContract, similarityPercent } from "@/lib/contracts/version-similarity";
import type { ContractVersionSummary } from "@/types/contracts";

const storageKey = (versionId: string) => `lawscan:version-kept:${versionId}`;

function wasKept(versionId: string) {
  try { return typeof window !== "undefined" && window.localStorage.getItem(storageKey(versionId)) === "1"; }
  catch { return false; }
}

export function VersionMismatchNotice({ contractId, versions, canEdit }: {
  contractId: string;
  versions: ContractVersionSummary[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const detach = useDetachVersionMutation();
  const [keptNow, setKeptNow] = useState<string | null>(null);
  const current = versions.find((version) => version.isCurrent);
  if (!canEdit || !current || !isLikelyWrongContract(current) || !canDetachVersion(current, versions.length)) return null;
  if (keptNow === current.id || wasKept(current.id)) return null;

  function keep() {
    if (!current) return;
    try { window.localStorage.setItem(storageKey(current.id), "1"); } catch { /* Hiding only for this visit is still fine. */ }
    setKeptNow(current.id);
  }

  async function split() {
    if (!current) return;
    try {
      const created = await detach.mutateAsync({ contractId, versionId: current.id });
      const id = created.id ?? created._id;
      toast.success("Đã tách thành hợp đồng mới", { description: created.title });
      if (id) router.push(routes.contract(id));
    } catch (error) {
      toast.error("Chưa tách được phiên bản", { description: error instanceof Error ? error.message : undefined });
    }
  }

  return (
    <div role="alert" className="flex flex-wrap items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-ui leading-6 text-amber-950">
      <TriangleAlert aria-hidden="true" className="mt-1 size-4 shrink-0" />
      <div className="min-w-0 flex-1 basis-72">
        <p className="m-0 font-semibold">
          Phiên bản {current.versionNumber} khác nhiều so với phiên bản {current.versionNumber - 1} (giống {similarityPercent(current)}%).
        </p>
        <p className="m-0">Có thể bạn đã thêm nhầm vào hợp đồng này. Nếu đây là hợp đồng khác, hãy tách nó thành một hợp đồng riêng.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={detach.isPending} onClick={() => void split()}>Tách thành hợp đồng mới</Button>
        <Button size="sm" variant="outline" disabled={detach.isPending} onClick={keep}>Đúng rồi, giữ nguyên</Button>
      </div>
    </div>
  );
}
