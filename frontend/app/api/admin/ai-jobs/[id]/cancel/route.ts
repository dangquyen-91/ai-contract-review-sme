import { invalidId, isObjectId, proxyAdminOperation } from "@/lib/api/admin-operations-proxy";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!isObjectId(id)) return invalidId();
  return proxyAdminOperation(request, `/admin/ai-jobs/${id}/cancel`);
}
