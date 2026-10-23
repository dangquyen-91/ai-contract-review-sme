import "server-only";
import { cookies } from "next/headers";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { AuthUser } from "@/types/auth";
import { dashboardRoles } from "@/config/permissions";

// Authorization comes exclusively from the backend, never lawscan_user.
export async function verifySession(refreshToken?: string): Promise<{ user: AuthUser; accessToken: string } | null> {
  if (!refreshToken) return null;
  const response = await fetch((process.env.API_BASE_URL ?? "http://localhost:4000") + "/api/v1/auth/refresh", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }), cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error("Không thể xác minh phiên đăng nhập. Vui lòng thử lại.");
  const { data } = await response.json();
  const user = data?.user;
  if (typeof data?.accessToken !== "string" || !user
    || typeof user.id !== "string" || typeof user.name !== "string"
    || typeof user.email !== "string" || !dashboardRoles.includes(user.role)
    || (user.orgId !== null && typeof user.orgId !== "string")
    || typeof user.hasCompletedOnboarding !== "boolean") {
    throw new Error("Phản hồi xác thực không hợp lệ.");
  }
  return { user, accessToken: data.accessToken };
}

// Deduplicate only within a server render, never across users or requests.
export const getSession = cache(async () => {
  const store = await cookies();
  return verifySession(store.get("lawscan_refresh")?.value);
});

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/dang-nhap");
  return session;
}
