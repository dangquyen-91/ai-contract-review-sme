"use client";

import { useRouter } from "next/navigation";
import { EmailVerificationForm } from "./email-verification-form";
import type { AuthNavigationContext, EmailVerificationChallenge } from "@/types/auth";

export function EmailVerificationContent({ backHref, ...options }: AuthNavigationContext & {
  initialChallenge: EmailVerificationChallenge;
  backHref: string;
}) {
  const router = useRouter();
  return <EmailVerificationForm {...options} onBack={() => router.replace(backHref)} />;
}
