import { PaymentReturnPage } from "@/components/subscription/payment-return-page";

export default function CancelPaymentPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  return <PaymentReturnPage searchParams={searchParams} cancelled />;
}
