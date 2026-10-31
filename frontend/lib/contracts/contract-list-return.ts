import type { DashboardData } from "@/types/dashboard";

type ListReturn = { href: string; contractId: string; scroll: number; offset: number; savedAt: number; restore: boolean };
const maxAge = 60 * 60 * 1000;
const storageKey = (scope: string) => `lawscan:contract-list-return:${encodeURIComponent(scope)}`;

export function contractListReturnScope(data: DashboardData) {
  return `${data.role}:${data.contractScopeId ?? data.organization.id}:${data.user?.email ?? ""}`;
}

export function readContractListReturn(scope: string): ListReturn | null {
  try {
    const value: ListReturn = JSON.parse(sessionStorage.getItem(storageKey(scope)) ?? "null");
    if (!value || typeof value.href !== "string" || !value.href.startsWith("/contract")
      || new URL(value.href, "https://lawscan.invalid").pathname !== "/contract"
      || !/^[a-f\d]{24}$/i.test(value.contractId)
      || !Number.isFinite(value.scroll) || value.scroll < 0 || !Number.isFinite(value.offset)
      || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > maxAge || value.savedAt > Date.now()
      || typeof value.restore !== "boolean") return null;
    return value;
  } catch { return null; }
}

export function saveContractListReturn(scope: string, contractId: string) {
  if (window.location.pathname !== "/contract") return;
  const card = document.querySelector<HTMLElement>(`[data-contract-id="${CSS.escape(contractId)}"]`);
  const value: ListReturn = {
    href: window.location.pathname + window.location.search,
    contractId, scroll: window.scrollY, offset: card?.getBoundingClientRect().top ?? 0,
    savedAt: Date.now(), restore: true,
  };
  try { sessionStorage.setItem(storageKey(scope), JSON.stringify(value)); } catch { /* Navigation still works if storage is unavailable. */ }
}

export function consumeContractListReturn(scope: string) {
  const value = readContractListReturn(scope);
  if (!value) return;
  try { sessionStorage.setItem(storageKey(scope), JSON.stringify({ ...value, restore: false })); } catch { /* Optional restoration. */ }
}
