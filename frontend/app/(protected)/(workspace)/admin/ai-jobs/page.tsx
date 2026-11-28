import { requirePermission } from "@/lib/auth/access";
import { PageHeading } from "@/components/ui/page-heading";
import { AiJobMonitor } from "@/components/admin-operations/ai-job-monitor";

export default async function AiJobsPage() {
  await requirePermission("admin");
  return (
    <>
      <PageHeading
        eyebrow="Vận hành"
        title="Giám sát AI"
        description="Hàng đợi, tác vụ bị treo, tỷ lệ thành công và nguyên nhân lỗi của AI trên toàn hệ thống."
      />
      <AiJobMonitor />
    </>
  );
}
