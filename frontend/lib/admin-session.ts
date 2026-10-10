import { cookies } from "next/headers";
import { cache } from "react";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";

// Verify against the backend, not the unsigned display cookie. Refresh also
// checks the account's current role and active status without requiring an org.
export const getAdminSession = cache(async () => {
  const store = await cookies();
  const refreshToken = store.get("lawscan_refresh")?.value;
  if (!refreshToken) return null;
  const response = await fetch(
    `${process.env.API_BASE_URL ?? "http://localhost:4000"}/api/v1/auth/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    },
  );
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok)
    throw new Error("Không thể xác minh phiên quản trị. Vui lòng thử lại.");
  const payload = await response.json();
  const accessToken = payload.data?.accessToken;
  if (typeof accessToken !== "string")
    throw new Error("Phản hồi xác thực không hợp lệ.");
  const claims = JSON.parse(
    Buffer.from(accessToken.split(".")[1], "base64url").toString("utf8"),
  );
  if (typeof claims.sub !== "string" || typeof claims.role !== "string")
    throw new Error("Phiên xác thực không hợp lệ.");
  const displayUser = decodeSessionUser(store.get(userSessionCookie)?.value);
  return {
    accessToken,
    role: claims.role as string,
    name:
      displayUser && displayUser.id === claims.sub
        ? displayUser.name
        : "Quản trị viên",
  };
});
