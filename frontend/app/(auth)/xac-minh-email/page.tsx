import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailVerificationContent } from "@/components/auth/email-verification-content";
import { emailVerificationNavigation, safeAuthReturn } from "@/lib/auth-return";
import { decodeEmailVerification, emailVerificationCookie } from "@/lib/email-verification-session";

export const metadata: Metadata = {
  title: "Xác minh email | LawScan",
  description: "Nhập mã OTP để xác minh email và tiếp tục sử dụng LawScan.",
  robots: { index: false, follow: false },
};

export default async function EmailVerificationPage({ searchParams }: {
  searchParams: Promise<{ mode?: string; invitationToken?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const mode = params.mode === "register" ? "register" : "login";
  const invitationToken = typeof params.invitationToken === "string" && /^[a-f\d]{64}$/.test(params.invitationToken)
    ? params.invitationToken : undefined;
  const returnTo = safeAuthReturn(params.returnTo) ?? undefined;
  const { backHref } = emailVerificationNavigation(mode, invitationToken, returnTo);
  const challenge = decodeEmailVerification((await cookies()).get(emailVerificationCookie)?.value);
  if (!challenge) redirect(backHref);

  return (
    <AuthShell panel={<AuthBrandPanel />}>
      <EmailVerificationContent initialChallenge={challenge} invitationToken={invitationToken} returnTo={returnTo} backHref={backHref} />
    </AuthShell>
  );
}
