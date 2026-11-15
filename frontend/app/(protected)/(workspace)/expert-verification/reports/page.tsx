import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/access";
import { RoleInsights } from "@/components/overview/role-insights";

export const metadata: Metadata = {
  title: "Báo cáo xác minh | LawScan",
  robots: { index: false, follow: false },
};

export default async function ExpertReportsPage() {
  const { user } = await requirePermission("expertVerification");
  return <RoleInsights role="expert" scopeId={user.id} heading reportPage />;
}
