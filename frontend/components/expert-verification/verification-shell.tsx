"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { DashboardShell } from "@/components/layouts/dashboard/dashboard-shell";
import { routes } from "@/config/routes";
import { VerificationNavigationProvider } from "@/providers/verification-navigation-provider";

export function VerificationShell({ name, expertId, children }: { name: string; expertId: string; children: ReactNode }) {
  const pathname = usePathname();
  const overview = pathname === routes.expertOverview;
  const myWork = pathname === routes.expertMyWork;
  return (
    <DashboardShell
      role="expert" activeKey={overview ? "expert-overview" : myWork ? "expert-my-work" : "verification"}
      sectionLabel={overview ? "Tổng quan chuyên gia" : myWork ? "Công việc của tôi" : "Xác minh kết quả AI"}
      workspaceName="LawScan" workspaceLabel="Không gian chuyên gia"
      name={name} roleLabel="Chuyên gia" homeHref={routes.expertOverview}
    >
      <VerificationNavigationProvider expertId={expertId}>{children}</VerificationNavigationProvider>
    </DashboardShell>
  );
}
