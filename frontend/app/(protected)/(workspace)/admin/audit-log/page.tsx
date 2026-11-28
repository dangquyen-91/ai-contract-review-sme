import { requirePermission } from "@/lib/auth/access";
import { PageHeading } from "@/components/ui/page-heading";
import { AuditLogViewer } from "@/components/admin-operations/audit-log-viewer";

export default async function AuditLogPage() {
  await requirePermission("admin");
  return (
    <>
      <PageHeading
        eyebrow="Vận hành"
        title="Nhật ký quản trị"
        description="Các thao tác nhạy cảm về tài khoản, mẫu hợp đồng, văn bản pháp luật, tổ chức, gói dịch vụ, thanh toán và AI."
      />
      <AuditLogViewer />
    </>
  );
}
