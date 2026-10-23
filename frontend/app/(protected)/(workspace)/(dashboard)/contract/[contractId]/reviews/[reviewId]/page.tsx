import Link from "next/link";
import { notFound } from "next/navigation";
import { getWorkspaceResource, validateResourceId } from "@/lib/auth/workspace-data";
import { routes } from "@/config/routes";
import type { ContractReviewRun } from "@/types/contracts";
import { WorkspaceContent } from "@/components/layouts/dashboard/workspace-content";

const statusLabels = { queued: "Đang chờ", running: "Đang rà soát", completed: "Hoàn tất", failed: "Chưa hoàn tất", cancelled: "Đã dừng" };
export default async function ReviewDetailPage({ params }: { params: Promise<{ contractId: string; reviewId: string }> }) {
  const { contractId, reviewId } = await params;
  validateResourceId(contractId);
  validateResourceId(reviewId);
  const run = await getWorkspaceResource<ContractReviewRun>("/reviews/" + reviewId);
  if (run.contractId !== contractId) notFound();
  return <WorkspaceContent><section className="mx-auto max-w-5xl space-y-4 p-6">
    <h1 className="text-2xl font-semibold">Lượt rà soát</h1>
    <p>{statusLabels[run.status]}</p>
    {run.startedAt && <p>Bắt đầu: {new Date(run.startedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>}
    {run.finishedAt && <p>Kết thúc: {new Date(run.finishedAt).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p>}
    {run.error && <p role="alert">{run.error}</p>}
    {run.result?.summaryPoints && <ul className="list-disc pl-5">{run.result.summaryPoints.map((point, index) => <li key={index}>{point}</li>)}</ul>}
    {run.result?.findingCounts && <p>Rủi ro cao: {run.result.findingCounts.high} · Trung bình: {run.result.findingCounts.medium} · Thấp: {run.result.findingCounts.low}</p>}
    <Link className="text-blue-700 underline" href={routes.contract(contractId)}>Mở hợp đồng và kết quả hiện tại</Link>
  </section></WorkspaceContent>;
}
