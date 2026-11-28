import "server-only";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/access";
import { backendApiUrl } from "@/lib/api/backend";

export function validateResourceId(id: string) {
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
}

// Always recheck permission at the data boundary; layouts may be reused by Next.
export async function getWorkspaceResource<T>(path: string): Promise<T> {
  const { accessToken } = await requirePermission("contracts");
  const response = await fetch(backendApiUrl(path), {
    headers: { Authorization: "Bearer " + accessToken }, cache: "no-store",
    signal: AbortSignal.timeout(15000),
  });
  if ([401, 403, 404].includes(response.status)) notFound();
  if (!response.ok) throw new Error("Không thể tải dữ liệu hợp đồng. Vui lòng thử lại.");
  return (await response.json()).data as T;
}
