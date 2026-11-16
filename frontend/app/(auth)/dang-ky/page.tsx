import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { authDestination } from "@/lib/auth/auth-return";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Đăng ký | LawScan",
  description: "Tạo tài khoản LawScan để bắt đầu rà soát hợp đồng.",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ invitationToken?: string; returnTo?: string }>;
}) {
  const { invitationToken, returnTo } = await searchParams;
  const session = await getSession();
  if (session)
    redirect(authDestination(session.user, invitationToken, returnTo));
  return (
    <AuthShell panel={<AuthBrandPanel />}>
      <AuthForm
        mode="register"
        invitationToken={invitationToken}
        returnTo={returnTo}
      />
    </AuthShell>
  );
}
