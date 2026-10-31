import type { ReactNode } from "react";
import { requirePermission } from "@/lib/auth/access";
import { VerificationShell } from "@/components/expert-verification/verification-shell";

export default async function VerificationLayout({ children }: { children: ReactNode }) {
  const { user } = await requirePermission("expertVerification");
  return (
    <VerificationShell name={user.name}>
      {children}
    </VerificationShell>
  );
}
