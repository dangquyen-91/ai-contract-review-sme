import { isApiClientError } from "@/lib/api/client";

// Anchor of the "Mua thêm lượt" section on the subscription page.
export const TOP_UP_HREF = "/subscription#mua-them-luot";

const QUOTA_CODES = new Set([
  "ANALYSIS_QUOTA_EXHAUSTED",
  "CHAT_QUOTA_EXHAUSTED",
  "DRAFTING_QUOTA_EXHAUSTED",
]);

/** True when the server refused an AI action because the period's credits ran out. */
export function isQuotaExhausted(error: unknown) {
  return isApiClientError(error) && Boolean(error.serverCode && QUOTA_CODES.has(error.serverCode));
}

/** Only account owners and personal users manage billing. */
export const canBuyTopUp = (role?: string) => role === "owner" || role === "user";

/** Where to send someone out of credits: top-ups need an active paid plan. */
export function quotaRecovery(subscription?: { status: string; plan: { price: number } | null } | null) {
  return subscription?.status === "active" && (subscription.plan?.price ?? 0) > 0
    ? { href: TOP_UP_HREF, label: "Mua thêm lượt" }
    : { href: "/goi-dich-vu", label: "Xem gói dịch vụ" };
}
