import Link from "next/link";
import { ReviewDashboardPage } from "@/components/review/review-page";
import { getWorkspaceResource, validateResourceId } from "@/lib/auth/workspace-data";
import { routes } from "@/config/routes";
import type { ContractReviewRun } from "@/types/contracts";

export default async function ContractDetailPage({ params }: { params: Promise<{ contractId: string }> }) {
  const { contractId } = await params;
  validateResourceId(contractId);
  const runs = await getWorkspaceResource<ContractReviewRun[]>("/contracts/" + contractId + "/reviews");
  return <ReviewDashboardPage>
    {runs.length > 0 && <section className="mx-auto max-w-5xl p-6" aria-label="Lịch sử rà soát">
      <h2 className="mb-3 font-semibold">Lịch sử rà soát</h2>
      <ul className="space-y-2">{runs.map(run => <li key={run._id}>
        <Link className="text-blue-700 underline" href={routes.review(contractId, run._id)}>{run.startedAt ?? run._id} · {run.status}</Link>
      </li>)}</ul>
    </section>}
  </ReviewDashboardPage>;
}
