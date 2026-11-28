import { proxyAdminOperation } from "@/lib/api/admin-operations-proxy";

export const GET = (request: Request) => proxyAdminOperation(request, "/admin/ai-jobs/overview");
