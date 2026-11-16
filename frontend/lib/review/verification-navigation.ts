type ReturnLocation = { href: string; target: string; row?: string; offset: number; scroll: number; savedAt: number; restore: boolean };
const key = (expertId: string) => `lawscan:expert-list:${expertId}`;
const lists = ["/expert-verification", "/expert-verification/my-work", "/expert-verification/overview"];
export function readVerificationReturn(expertId: string): ReturnLocation | null {
  try {
    if (!expertId) return null;
    const value: ReturnLocation = JSON.parse(sessionStorage.getItem(key(expertId)) ?? "null");
    if (!value || typeof value.href !== "string" || !value.href.startsWith("/expert-verification") || !lists.includes(new URL(value.href, "https://lawscan.invalid").pathname)
      || !/^\/expert-verification\/[a-f\d]{24}(?:\?attempt=[1-9]\d*)?$/i.test(value.target)
      || !Number.isFinite(value.scroll) || value.scroll < 0 || !Number.isFinite(value.offset)
      || typeof value.restore !== "boolean" || value.row !== undefined && typeof value.row !== "string"
      || !Number.isFinite(value.savedAt) || Date.now() - value.savedAt > 3600000 || value.savedAt > Date.now()) return null;
    return value;
  } catch { return null; }
}
export function saveVerificationReturn(expertId: string, target: string, row?: HTMLElement | null) {
  if (!expertId || !lists.includes(location.pathname)) return;
  try { sessionStorage.setItem(key(expertId), JSON.stringify({ href: location.pathname + location.search, target, row: row?.dataset.verificationRow, offset: row?.getBoundingClientRect().top ?? 0, scroll: window.scrollY, savedAt: Date.now(), restore: true })); }
  catch { /* Optional navigation state; URL filters continue to work. */ }
}
export function consumeVerificationReturn(expertId: string) {
  const value = readVerificationReturn(expertId);
  if (value) try { sessionStorage.setItem(key(expertId), JSON.stringify({ ...value, restore: false })); } catch { /* Storage unavailable. */ }
}
