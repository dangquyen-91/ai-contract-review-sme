import type { Metadata } from "next";
import { cookies } from "next/headers";
import { InvitationPage } from "@/components/invitations/invitation-page";
import { decodeSessionUser, userSessionCookie } from "@/lib/auth-session";

export const metadata: Metadata = { title: "Lời mời tham gia tổ chức | LawScan", robots: { index: false, follow: false } };

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const cookieStore = await cookies();
  const user = decodeSessionUser(cookieStore.get(userSessionCookie)?.value);
  return <InvitationPage token={token ?? ""} user={user} />;
}
