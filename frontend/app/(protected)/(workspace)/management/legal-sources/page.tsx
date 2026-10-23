import { requirePermission } from "@/lib/auth/access";
import { LegalSources } from "@/components/legal-sources/legal-sources";
export default async function LegalSourcesPage() {
  await requirePermission("management");
  return <LegalSources />;
}
