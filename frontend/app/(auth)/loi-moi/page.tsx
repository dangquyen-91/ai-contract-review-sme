import type { Metadata } from "next";
import { InvitationPage } from "@/components/invitations/invitation-page";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Lời mời tham gia tổ chức | LawScan", robots: { index: false, follow: false } };

export default async function InvitePage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const user = (await getSession())?.user ?? null;
  return <InvitationPage token={token ?? ""} user={user} />;
}
