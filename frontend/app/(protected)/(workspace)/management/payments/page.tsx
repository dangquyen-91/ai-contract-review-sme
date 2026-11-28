import { requirePermission } from "@/lib/auth/access";
import { PageHeading } from "@/components/ui/page-heading";
import { PaymentHistoryManagement } from "@/components/management/payment-history-management";

export const metadata = { title: "Lịch sử giao dịch | LawScan" };

export default async function ManagerPaymentsPage() {
  await requirePermission("management");
  return (
    <>
      <PageHeading
        eyebrow="Quản lý"
        title="Lịch sử giao dịch"
        description="Tra cứu các đơn thanh toán trên LawScan theo tài khoản, trạng thái và loại giao dịch."
      />
      <PaymentHistoryManagement />
    </>
  );
}
