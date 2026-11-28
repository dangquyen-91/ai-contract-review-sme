"use client";

import { useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { OrganizationCreateForm } from "@/components/onboarding/organization-create-form";
import { useOnboardingWorkflow } from "@/hooks/onboarding/use-onboarding-workflow";
import { useOrganizationMembership } from "@/hooks/dashboard/use-organization-membership";

/**
 * Lets someone who already has an account create an organization without leaving the
 * page. On success the session moves to the new organization and opens its dashboard.
 */
export function CreateOrganizationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const workflow = useOnboardingWorkflow();
  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (workflow.busy) return;
        if (!next) workflow.clearError();
        onOpenChange(next);
      }}
    >
      <DialogContent busy={workflow.busy} className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tạo tổ chức của bạn</DialogTitle>
          <DialogDescription>
            Tạo không gian chung để quản lý hợp đồng cùng đội ngũ. Bạn sẽ là chủ
            tổ chức; tài khoản cá nhân và dữ liệu hiện có vẫn được giữ nguyên.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <OrganizationCreateForm
            showHeader={false}
            error={workflow.error}
            isSubmitting={workflow.busy}
            setupCompleted={workflow.setupCompleted}
            onChange={workflow.clearError}
            onSubmit={(values) => void workflow.createOrganization(values)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/**
 * A button that opens {@link CreateOrganizationDialog} in place. Hidden for an account
 * that already belongs to an organization: an account can only be in one.
 */
export function CreateOrganizationTrigger({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  if (useOrganizationMembership()) return null;
  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)} aria-haspopup="dialog">
        {children}
      </button>
      <CreateOrganizationDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
