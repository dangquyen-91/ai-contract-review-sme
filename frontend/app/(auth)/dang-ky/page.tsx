import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Đăng ký | LawScan",
  description: "Tạo tài khoản LawScan để bắt đầu rà soát hợp đồng.",
};

export default function RegisterPage() {
  return <AuthShell panel={<AuthBrandPanel />}><AuthForm mode="register" /></AuthShell>;
}
