"use client";

import { useRouter } from "next/navigation";
import { DashboardShell, type DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";
import { ContractConfirmationDialog } from "@/components/review/upload/contract-confirmation-dialog";
import { routes } from "@/config/routes";
import { usePersonalReviewWorkspace } from "@/hooks/review/use-personal-review-workspace";
import { useOpenContractReview } from "@/hooks/review/use-open-contract-review";
import { useOptionalOrganizationDashboard } from "@/providers/dashboard-provider";
import { ContractDetailView } from "./contract-detail-view";

function PersonalContractDetail({ contractId, context }: { contractId: string; context: DashboardWorkspaceContext }) {
  const router = useRouter();
  const { workflow } = usePersonalReviewWorkspace(context);
  const { startUploadedReview, finishAttach } = useOpenContractReview();
  const pending = workflow.uploadedContract;
  return (
    <>
      <ContractDetailView contractId={contractId} context={context} />
      {pending && (
        <ContractConfirmationDialog
          key={pending.id}
          orgId={context.data.contractScopeId ?? context.data.organization.id}
          role={context.data.role}
          contractId={pending.id}
          contractTitle={pending.title}
          isReviewing={workflow.stage === "reviewing"}
          onDismiss={() => workflow.setUploadedContract(null)}
          onDeleted={() => {
            workflow.setUploadedContract(null);
            router.replace(routes.contracts);
          }}
          onReview={startUploadedReview}
          onAttached={finishAttach}
        />
      )}
    </>
  );
}

export function ContractDetailPage({ contractId }: { contractId: string }) {
  const workspace = useOptionalOrganizationDashboard();
  if (workspace) {
    if (!workspace.data) return null;
    return (
      <ContractDetailView
        contractId={contractId}
        context={{ data: workspace.data, access: workspace.access, roleLabel: workspace.roleLabel }}
      />
    );
  }
  return (
    <DashboardShell view="contract">
      {(context) => <PersonalContractDetail contractId={contractId} context={context} />}
    </DashboardShell>
  );
}
