import { SubscriptionCatalog } from "@/components/subscription/subscription-catalog";
import { getSession } from "@/lib/auth/session";
import { billingAccountId } from "@/lib/subscription/billing-account";

export default async function SubscriptionPage({
  searchParams,
}: {
  searchParams: Promise<{ audience?: string }>;
}) {
  const { audience } = await searchParams;
  const session = await getSession();
  return (
    <SubscriptionCatalog
      accountId={session ? billingAccountId(session.user) : null}
      audience={audience === "personal" ? "personal" : "business"}
    />
  );
}
