import Link from "next/link";
import { SubscriptionConfirmation } from "@/components/subscription/subscription-confirmation";
import { subscriptionPlans } from "@/lib/subscription-plans";

export default async function ConfirmationPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { plan: id, cycle } = await searchParams;
  const plan = subscriptionPlans.find(item => item.id === id);
  if (!plan || (cycle !== "monthly" && cycle !== "yearly")) return <><h1>Lựa chọn gói chưa hợp lệ</h1><p>Vui lòng chọn lại gói và chu kỳ thanh toán.</p><Link href="/goi-dich-vu">Quay lại gói dịch vụ →</Link></>;
  return <SubscriptionConfirmation key={`${plan.id}-${cycle}`} plan={plan} cycle={cycle} />;
}
