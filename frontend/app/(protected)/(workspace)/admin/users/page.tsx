import { requirePermission } from "@/lib/auth/access";
import { PageHeading } from "@/components/ui/page-heading";
import { UserManagement } from "@/components/users/user-management";

export default async function UserManagementPage() {
  await requirePermission("admin");
  return <>
    <PageHeading eyebrow="Quản lý" title="Người dùng" description="Quản lý tài khoản, vai trò và trạng thái truy cập trên toàn hệ thống." />
    <UserManagement />
  </>;
}
