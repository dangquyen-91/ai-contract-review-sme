import { VerificationQueue } from "@/components/expert-verification/verification-queue";
import type { VerificationQueueFilter } from "@/types/verification-workspace";

export default async function VerificationQueuePage({ searchParams }: { searchParams: Promise<{ status?: string | string[] }> }) {
  const { status } = await searchParams;
  const filter: VerificationQueueFilter = status === "requested" || status === "in_progress" ? status : "all";
  return <VerificationQueue key={filter} initialFilter={filter} />;
}
