"use client";

import { ReviewContent } from "@/components/review/review-content";
import { DashboardShell, type DashboardWorkspaceContext } from "@/components/layouts/dashboard/dashboard-shell";
import { usePersonalReviewWorkspace } from "@/hooks/use-personal-review-workspace";
import { useOptionalOrganizationDashboard } from "@/providers/dashboard-provider";

export function ReviewDashboardPage() {
  const workspace = useOptionalOrganizationDashboard();
  if (workspace) {
    if (!workspace.data) return null;
    return <ReviewContent data={workspace.data} access={workspace.access} roleLabel={workspace.roleLabel} workflow={workspace} onViewAll={() => workspace.selectTab("contracts")} />;
  }
  return <DashboardShell view="review">{(context) => <PersonalReviewPage context={context} />}</DashboardShell>;
}

function PersonalReviewPage({ context }: { context: DashboardWorkspaceContext }) {
  const workspace = usePersonalReviewWorkspace(context);
  return <ReviewContent {...context} {...workspace} />;
}
