import { getSession } from "@/lib/auth/session";
import { PaymentResult } from "./payment-result";

export async function PaymentReturnPage({
  searchParams,
  cancelled = false,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
  cancelled?: boolean;
}) {
  const { orderCode: raw } = await searchParams;
  const orderCode =
    typeof raw === "string" &&
    /^[1-9]\d{0,15}$/.test(raw) &&
    Number.isSafeInteger(Number(raw))
      ? Number(raw)
      : null;
  const user = (await getSession())?.user ?? null;
  return (
    <PaymentResult user={user} orderCode={orderCode} cancelled={cancelled} />
  );
}
