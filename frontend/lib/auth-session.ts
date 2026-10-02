import type { AuthUser } from "@/types/auth";

export const userSessionCookie = "lawscan_user";

export function encodeSessionUser(user: AuthUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}

export function decodeSessionUser(value?: string): AuthUser | null {
  if (!value) return null;

  try {
    const user = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<AuthUser>;
    if (
      typeof user.id !== "string"
      || typeof user.name !== "string"
      || typeof user.email !== "string"
      || typeof user.role !== "string"
      || (user.orgId !== null && typeof user.orgId !== "string")
    ) {
      return null;
    }

    return {
      ...user,
      hasCompletedOnboarding: user.hasCompletedOnboarding === true || Boolean(user.orgId),
    } as AuthUser;
  } catch {
    return null;
  }
}

