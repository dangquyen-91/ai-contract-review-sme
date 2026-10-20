import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Đăng nhập | LawScan",
  description: "Đăng nhập vào không gian rà soát hợp đồng LawScan.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ invitationToken?: string; returnTo?: string }> }) {
  const { invitationToken, returnTo } = await searchParams;
  return <AuthShell panel={<AuthBrandPanel />}><AuthForm mode="login" invitationToken={invitationToken} returnTo={returnTo} /></AuthShell>;
}
