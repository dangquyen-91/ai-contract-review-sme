import { requirePermission } from "@/lib/auth/access";
import { SystemOverview } from "@/components/overview/system-overview";
export default async function AdminPage() {
  await requirePermission("admin");
  return <SystemOverview />;
}
