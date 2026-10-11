import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { UserDashboard } from "@/components/dashboard/user-dashboard";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Dashboard owner | LawScan", robots: { index: false, follow: false } };

export default async function OwnerPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const cookieStore = await cookies();
  const user = decodeSessionUser(cookieStore.get(userSessionCookie)?.value);
  if (!user) redirect("/dang-nhap");
  if (user.role === "administrator") redirect("/dashboard/admin");
  if (!user.hasCompletedOnboarding) redirect("/chon-to-chuc");
  if (!["owner", "manager"].includes(user.role)) redirect("/dashboard/user");
  const { view } = await searchParams;
  if (view === "members" && user.role !== "owner") redirect("/dashboard/owner");
  return <UserDashboard ownerMode />;
}
