import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Rà soát hợp đồng tổ chức | LawScan", robots: { index: false, follow: false } };

export default async function OwnerReviewPage() {
  const cookieStore = await cookies();
  const user = decodeSessionUser(cookieStore.get(userSessionCookie)?.value);
  if (!user) redirect("/dang-nhap");
  if (user.role === "administrator") redirect("/dashboard/admin");
  if (!["owner", "manager"].includes(user.role)) redirect("/dashboard/user");
  redirect("/dashboard/owner?view=upload");
}
