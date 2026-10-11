import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";

export const metadata: Metadata = {
  title: "Rà soát hợp đồng | LawScan",
  description: "Tải lên và rà soát hợp đồng bằng AI theo quyền truy cập của bạn.",
  robots: { index: false, follow: false },
};

export default async function DashboardPage() {
  const cookieStore = await cookies();
  const user = decodeSessionUser(cookieStore.get(userSessionCookie)?.value);
  if (!user) redirect("/dang-nhap");
  if (user.role === "administrator") redirect("/dashboard/admin");
  if (!user.hasCompletedOnboarding) redirect("/chon-to-chuc");
  redirect(["owner", "manager"].includes(user.role) ? "/dashboard/owner" : "/dashboard/user");
}
