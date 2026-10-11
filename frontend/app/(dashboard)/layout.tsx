import type { ReactNode } from "react";
import { SessionKeeper } from "@/components/auth/session-keeper";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <><SessionKeeper />{children}</>;
}
