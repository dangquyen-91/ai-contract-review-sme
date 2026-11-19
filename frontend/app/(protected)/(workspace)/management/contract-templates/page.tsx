import { requirePermission } from "@/lib/auth/access";
import { ManagedTemplatesWorkspace } from "@/components/managed-templates/managed-templates-workspace";
export default async function ContractTemplatesPage() {
  await requirePermission("management");
  return <ManagedTemplatesWorkspace />;
}
