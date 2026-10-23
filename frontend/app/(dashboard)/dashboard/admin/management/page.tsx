import { PageHeading } from "@/components/ui/page-heading";
import { UserManagement } from "@/components/users/user-management";

export default function UserManagementPage() {
  return <>
    <PageHeading eyebrow="Quản lý" title="Người dùng" description="Quản lý tài khoản, vai trò và trạng thái truy cập trên toàn hệ thống." />
    <UserManagement />
  </>;
}
