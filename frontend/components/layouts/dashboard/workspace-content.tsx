"use client";

import type { ReactNode } from "react";
import { useOptionalOrganizationDashboard } from "@/providers/dashboard-provider";
import { DashboardShell } from "./dashboard-shell";

export function WorkspaceContent({ children, view = "review" }: { children: ReactNode; view?: "review" | "contract" }) {
  const workspace = useOptionalOrganizationDashboard();
  return workspace ? children : <DashboardShell view={view}>{() => children}</DashboardShell>;
}
