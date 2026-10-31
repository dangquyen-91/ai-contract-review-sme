import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/access";
import { VerificationWorkspace } from "@/components/expert-verification/verification-workspace";

export default async function VerificationPage({ params, searchParams }: { params: Promise<{ reviewId: string }>; searchParams: Promise<{ attempt?: string | string[] }> }) {
  const { user } = await requirePermission("expertVerification");
  const { reviewId } = await params;
  if (!/^[a-f\d]{24}$/i.test(reviewId)) notFound();
  const { attempt } = await searchParams;
  if (attempt !== undefined && (typeof attempt !== "string" || !/^[1-9]\d{0,5}$/.test(attempt) || Number(attempt) > 100000)) notFound();
  const historicalAttempt = typeof attempt === "string" ? Number(attempt) : undefined;
  return <VerificationWorkspace key={`${reviewId}:${historicalAttempt ?? "current"}`} reviewId={reviewId} expertId={user.id} attempt={historicalAttempt} />;
}
