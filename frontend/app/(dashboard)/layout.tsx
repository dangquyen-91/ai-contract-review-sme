import type { ReactNode } from "react";
import { SessionKeeper } from "@/components/auth/session-keeper";
import { DashboardProvider } from "@/providers/dashboard-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DashboardProvider><SessionKeeper />{children}</DashboardProvider>;
}
