import { proxyUserManagement } from "@/lib/api/user-management-proxy";
export function GET(request: Request) { return proxyUserManagement(request); }
export function POST(request: Request) { return proxyUserManagement(request); }
