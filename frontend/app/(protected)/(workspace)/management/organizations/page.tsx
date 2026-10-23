import { requirePermission } from "@/lib/auth/access";
import { PageHeading } from "@/components/ui/page-heading";
import { OrganizationsManagement } from "@/components/organizations/organizations-management";

export default async function ManagerOrganizationsPage() {
  await requirePermission("management");
  return (
    <>
      <PageHeading
        eyebrow="Quản lý"
        title="Tổ chức"
        description="Tra cứu các tổ chức sử dụng LawScan và thông tin của từng tổ chức."
      />
      <OrganizationsManagement />
    </>
  );
}
