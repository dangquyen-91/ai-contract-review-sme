import Link from "next/link";
import { cookies } from "next/headers";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";
import { SubscriptionConfirmation } from "@/components/subscription/subscription-confirmation";
import { planCodes, type PlanCode } from "@/types/subscription";

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { plan: id, cycle } = await searchParams;
  if (typeof id !== "string" || !planCodes.includes(id as PlanCode) || (cycle !== undefined && cycle !== "monthly")) return <><h1 className="text-2xl font-semibold">Lựa chọn gói chưa hợp lệ</h1><p className="my-4">Vui lòng chọn lại gói. Hiện chỉ hỗ trợ chu kỳ tháng.</p><Link href="/goi-dich-vu">Quay lại gói dịch vụ →</Link></>;
  const store = await cookies();
  const user = decodeSessionUser(store.get(userSessionCookie)?.value);
  return <SubscriptionConfirmation key={id} planCode={id as PlanCode} user={user} />;
}
