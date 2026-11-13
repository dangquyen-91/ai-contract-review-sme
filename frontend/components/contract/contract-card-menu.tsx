"use client";

import Link from "next/link";
import { useState } from "react";
import { DropdownMenu } from "radix-ui";
import { MoreHorizontal, Trash2, Upload } from "lucide-react";
import { routes } from "@/config/routes";
import { ContractDeleteDialog } from "./contract-delete-button";
import { canAddContractVersion } from "./contract-version-info";
import type { DashboardContract } from "@/types/contracts";

const itemClass = "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2.5 text-ui-meta text-slate-700 outline-none focus:bg-blue-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-40";

export function ContractCardMenu({ contract, canUpload, canDelete, onDeleted }: {
  contract: DashboardContract;
  canUpload: boolean;
  canDelete: boolean;
  onDeleted?: () => void;
}) {
  const [deleting, setDeleting] = useState(false);
  const id = contract.id ?? contract._id;
  const showUpload = canUpload && canAddContractVersion(contract);
  if (!id || (!showUpload && !canDelete)) return null;
  return (
    <>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            aria-label={`Thao tác khác cho hợp đồng ${contract.title}`}
            className="grid size-9 shrink-0 place-items-center rounded-[10px] border border-border text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 data-[state=open]:bg-slate-100"
          >
            <MoreHorizontal aria-hidden="true" className="size-4" />
          </button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content align="end" sideOffset={6} className="z-[80] min-w-52 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {showUpload && (
              <DropdownMenu.Item asChild className={itemClass}>
                <Link href={routes.uploadVersion(id)}>
                  <Upload aria-hidden="true" className="size-4" />
                  Tải phiên bản mới
                </Link>
              </DropdownMenu.Item>
            )}
            {showUpload && canDelete && <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />}
            {canDelete && (
              <DropdownMenu.Item onSelect={() => setDeleting(true)} className={`${itemClass} text-destructive focus:bg-destructive/10`}>
                <Trash2 aria-hidden="true" className="size-4" />
                Xóa hợp đồng
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
      {deleting && <ContractDeleteDialog contract={contract} onClose={() => setDeleting(false)} onDeleted={onDeleted} />}
    </>
  );
}
