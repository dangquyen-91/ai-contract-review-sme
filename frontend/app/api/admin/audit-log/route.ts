import { proxyAdminOperation } from "@/lib/api/admin-operations-proxy";

export const GET = (request: Request) => proxyAdminOperation(request, "/admin/audit-log", ["page", "limit", "group", "search", "from", "to"]);
