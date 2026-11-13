"use client";

import Link from "next/link";
import { useState } from "react";
import { MoreHorizontal, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { routes } from "@/config/routes";
import { ContractDeleteDialog } from "./contract-delete-dialog";
import { canAddContractVersion } from "./contract-version-info";
import type { DashboardContract } from "@/types/contracts";

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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon-sm" className="size-9 border-border text-muted-foreground" aria-label={`Thao tác khác cho hợp đồng ${contract.title}`}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-52">
          {showUpload && (
            <DropdownMenuItem asChild>
              <Link href={routes.uploadVersion(id)}>
                <Upload aria-hidden="true" />
                Tải phiên bản mới
              </Link>
            </DropdownMenuItem>
          )}
          {showUpload && canDelete && <DropdownMenuSeparator />}
          {canDelete && (
            <DropdownMenuItem variant="destructive" onSelect={() => setDeleting(true)}>
              <Trash2 aria-hidden="true" />
              Xóa hợp đồng
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {deleting && <ContractDeleteDialog contract={contract} onClose={() => setDeleting(false)} onDeleted={onDeleted} />}
    </>
  );
}
