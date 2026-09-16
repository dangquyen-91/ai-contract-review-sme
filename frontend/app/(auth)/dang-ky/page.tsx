import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthBrandPanel } from "@/components/auth/auth-brand-panel";
import { AuthShell } from "@/components/auth/auth-shell";

export const metadata: Metadata = {
  title: "Đăng ký | LawScan",
  description: "Tạo không gian làm việc LawScan cho doanh nghiệp của bạn.",
};

export default function RegisterPage() {
  return <AuthShell panel={<AuthBrandPanel />}><AuthForm mode="register" /></AuthShell>;
}
