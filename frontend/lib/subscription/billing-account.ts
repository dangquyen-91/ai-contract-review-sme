import type { AuthUser } from "@/types/auth";

export function billingAccountId(
  user: Pick<AuthUser, "id" | "role" | "orgId">,
) {
  return user.orgId || (user.role === "user" ? user.id : null);
}
