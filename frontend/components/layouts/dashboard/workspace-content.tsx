"use client";

import type { ReactNode } from "react";
import { useOptionalOrganizationDashboard } from "@/providers/dashboard-provider";
import { DashboardShell } from "./dashboard-shell";

export function WorkspaceContent({ children }: { children: ReactNode }) {
  const workspace = useOptionalOrganizationDashboard();
  return workspace ? children : <DashboardShell view="review">{() => children}</DashboardShell>;
}
