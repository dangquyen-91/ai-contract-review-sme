import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { PasswordRecoveryForm } from "@/components/auth/password-recovery-form";
import { emailVerificationNavigation } from "@/lib/auth/auth-return";

export const metadata: Metadata = { title: "Quên mật khẩu | LawScan", robots: { index: false, follow: false } };
export default async function ForgotPasswordPage({ searchParams }: { searchParams: Promise<{ invitationToken?: string; returnTo?: string }> }) {
  const { invitationToken, returnTo } = await searchParams;
  const { backHref } = emailVerificationNavigation("login", invitationToken, returnTo);
  return <AuthShell panel={<AuthBrandPanel />}><PasswordRecoveryForm loginHref={backHref} /></AuthShell>;
}
