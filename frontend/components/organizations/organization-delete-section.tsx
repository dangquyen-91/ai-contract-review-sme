"use client";

import { Trash2 } from "lucide-react";
import { useDeleteOrganizationWorkflow } from "@/hooks/organizations/use-delete-organization-workflow";
import { Button } from "@/components/ui/button";
import { ConfirmActionDialog } from "@/components/shared/confirm-action-dialog";

export function OrganizationDeleteSection({
  organization,
}: {
  organization: { id: string; name: string };
}) {
  const workflow = useDeleteOrganizationWorkflow(organization.id);
  return (
    <section
      className="mt-8 flex flex-wrap items-center justify-between gap-5 rounded-xl border border-destructive/25 bg-card p-5 sm:p-6"
      aria-labelledby="organization-delete-heading"
    >
      <div className="min-w-0 max-w-2xl">
        <h2
          id="organization-delete-heading"
          className="text-base font-semibold"
        >
          Xóa tổ chức
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Chỉ có thể xóa khi không còn hợp đồng và thành viên khác. Các lời mời
          đang chờ sẽ bị thu hồi. Thao tác này không thể hoàn tác.
        </p>
      </div>
      <Button
        variant="outline"
        className="shrink-0 border-destructive/40 text-destructive hover:border-destructive/60 hover:bg-destructive/10 hover:text-destructive"
        onClick={workflow.open}
      >
        <Trash2 aria-hidden="true" />
        Xóa tổ chức
      </Button>
      {workflow.confirmOpen && (
        <ConfirmActionDialog
          title="Xóa tổ chức?"
          description={`Tổ chức “${organization.name}” chỉ có thể xóa khi không còn hợp đồng và thành viên khác. Các lời mời đang chờ sẽ bị thu hồi. Không thể hoàn tác. Sau khi xóa, tài khoản trở về không gian cá nhân; bạn vẫn đăng nhập và không phải thiết lập lại.`}
          confirmLabel="Xóa tổ chức"
          destructive
          pending={workflow.pending}
          error={workflow.error}
          onCancel={workflow.close}
          onConfirm={workflow.confirm}
        />
      )}
    </section>
  );
}
