import type { AuthUser } from "@/types/auth";

export const userSessionCookie = "lawscan_user";

export function encodeSessionUser(user: AuthUser) {
  return Buffer.from(JSON.stringify(user), "utf8").toString("base64url");
}
