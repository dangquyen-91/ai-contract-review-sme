"use client";

import Link from "next/link";
import { DropdownMenu } from "radix-ui";
import { Check, ChevronDown, Layers } from "lucide-react";
import { routes } from "@/config/routes";
import type { ContractVersionSummary } from "@/types/contracts";

const itemClass = "flex cursor-pointer items-start gap-2 rounded-lg px-3 py-2 text-ui-meta text-slate-700 outline-none focus:bg-blue-50 data-[disabled]:cursor-default data-[disabled]:opacity-50";

function uploadedOn(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}

function VersionLabel({ version }: { version: ContractVersionSummary }) {
  return (
    <span className="min-w-0">
      <span className="block font-semibold text-slate-900">
        Phiên bản {version.versionNumber}{version.isCurrent ? " · hiện tại" : ""}
      </span>
      <span className="block text-ui-caption text-muted-foreground">
        Tải ngày {uploadedOn(version.uploadedAt)}{version.note ? ` · ${version.note}` : ""}
      </span>
    </span>
  );
}

export function ContractVersionSwitcher({ contractId, versions, onShowAll }: {
  contractId: string;
  versions: ContractVersionSummary[];
  onShowAll: () => void;
}) {
  const current = versions.find((version) => version.isCurrent);
  if (!current) return null;
  const ordered = [...versions].sort((a, b) => b.versionNumber - a.versionNumber);
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-ui-meta font-semibold text-blue-800 transition-colors hover:bg-blue-100 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          aria-label={`Phiên bản đang xem: ${current.versionNumber}. Đổi phiên bản`}
        >
          <Layers aria-hidden="true" className="size-3.5" />
          Phiên bản {current.versionNumber}
          {versions.length > 1 && <span className="font-normal text-blue-700">/ {versions.length}</span>}
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="start" sideOffset={6} className="z-[80] w-72 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
          {ordered.map((version) => {
            if (version.isCurrent) return (
              <DropdownMenu.Item key={version.id} className={itemClass} onSelect={(event) => event.preventDefault()}>
                <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-blue-700" />
                <VersionLabel version={version} />
              </DropdownMenu.Item>
            );
            const review = version.latestReview;
            if (!review) return (
              <DropdownMenu.Item key={version.id} disabled className={itemClass}>
                <span className="size-4 shrink-0" />
                <span className="min-w-0">
                  <VersionLabel version={version} />
                  <span className="block text-ui-caption text-muted-foreground">Chưa rà soát</span>
                </span>
              </DropdownMenu.Item>
            );
            return (
              <DropdownMenu.Item key={version.id} asChild className={itemClass}>
                <Link href={routes.review(contractId, review.id)}>
                  <span className="size-4 shrink-0" />
                  <VersionLabel version={version} />
                </Link>
              </DropdownMenu.Item>
            );
          })}
          <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
          <DropdownMenu.Item className={`${itemClass} font-semibold text-primary`} onSelect={onShowAll}>
            Xem lịch sử phiên bản
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
