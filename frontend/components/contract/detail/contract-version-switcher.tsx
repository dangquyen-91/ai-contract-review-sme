"use client";

import Link from "next/link";
import { Check, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/config/routes";
import type { ContractVersionSummary } from "@/types/contracts";

function uploadedOn(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(value));
}

function VersionLabel({ version, hint }: { version: ContractVersionSummary; hint?: string }) {
  return (
    <span className="min-w-0">
      <span className="block font-semibold text-foreground">
        Phiên bản {version.versionNumber}{version.isCurrent ? " · hiện tại" : ""}
      </span>
      <span className="block text-ui-caption text-muted-foreground">
        Tải ngày {uploadedOn(version.uploadedAt)}{version.note ? ` · ${version.note}` : ""}{hint ? ` · ${hint}` : ""}
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 px-2.5"
          aria-label={`Phiên bản đang xem: ${current.versionNumber}. Đổi phiên bản`}
        >
          <Layers aria-hidden="true" className="size-3.5" />
          Phiên bản {current.versionNumber}
          {versions.length > 1 && <span className="font-normal opacity-80">/ {versions.length}</span>}
          <ChevronDown aria-hidden="true" className="size-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuLabel className="text-ui-caption text-muted-foreground">Phiên bản của hợp đồng</DropdownMenuLabel>
        {ordered.map((version) => {
          const review = version.latestReview;
          if (version.isCurrent) return (
            <DropdownMenuItem key={version.id} className="items-start" onSelect={(event) => event.preventDefault()}>
              <Check aria-hidden="true" className="mt-0.5 text-primary" />
              <VersionLabel version={version} />
            </DropdownMenuItem>
          );
          if (!review) return (
            <DropdownMenuItem key={version.id} disabled className="items-start pl-8">
              <VersionLabel version={version} hint="chưa rà soát" />
            </DropdownMenuItem>
          );
          return (
            <DropdownMenuItem key={version.id} asChild className="items-start pl-8">
              <Link href={routes.review(contractId, review.id)}>
                <VersionLabel version={version} />
              </Link>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="font-semibold text-primary" onSelect={onShowAll}>
          Xem lịch sử phiên bản
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
