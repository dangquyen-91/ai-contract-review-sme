import { OrganizationInsight } from "@/components/organizations/organization-insight";
import { UserAccessInsight } from "@/components/users/user-access-insight";
import { JobProgressInsight } from "@/components/review/job-progress-insight";
import { AuditEventInsight } from "@/components/audit-log/audit-event-insight";
import type { ManagementSectionId } from "@/types/management";

export function DetailInsight({ section, row }: { section: ManagementSectionId; row: readonly string[] }) {
  if (section === "organizations") return <OrganizationInsight row={row} />;
  if (section === "users") return <UserAccessInsight row={row} />;
  if (section === "ai-jobs") return <JobProgressInsight row={row} />;
  return <AuditEventInsight row={row} />;
}
