import { contractsApi } from "@/lib/api/contracts";
import { ApiClientError } from "@/lib/api/client";
import type { ContractReviewRun } from "@/types/contracts";

type Session = { key: string; reviewId?: string; analysisFocus?: string; blockedError?: string };
const storageKey = (id: string) => `lawscan_review_${id}`;
export function clearReviewSession(id: string) { sessionStorage.removeItem(storageKey(id)); }
export function isReviewCancelled(error: unknown) { return error instanceof Error && error.name === "AbortError"; }

export function readReviewSession(id: string): Session | null {
  const value = sessionStorage.getItem(storageKey(id));
  if (!value) return null;
  try {
    const session = JSON.parse(value) as Session;
    if (typeof session.key === "string" && (!session.reviewId || typeof session.reviewId === "string")) return session;
  } catch {
    if (/^[a-f\d]{24}$/i.test(value)) return { key: crypto.randomUUID(), reviewId: value };
  }
  return null;
}

function pause(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    signal.throwIfAborted();
    const abort = () => { clearTimeout(timer); reject(signal.reason); };
    const timer = setTimeout(() => { signal.removeEventListener("abort", abort); resolve(); }, ms);
    signal.addEventListener("abort", abort, { once: true });
  });
}

export async function executeReview({ contractId, analysisFocus, resumeOnly = false, signal, onProgress, onConnection }: {
  contractId: string;
  analysisFocus?: string;
  resumeOnly?: boolean;
  signal: AbortSignal;
  onProgress?: (review: ContractReviewRun) => void;
  onConnection?: (reconnecting: boolean) => void;
}) {
  signal.throwIfAborted();
  const deadline = Date.now() + 20 * 60_000;
  async function request<T>(operation: () => Promise<T>): Promise<T> {
    let failures = 0;
    for (;;) {
      signal.throwIfAborted();
      try {
        const result = await operation();
        signal.throwIfAborted();
        onConnection?.(false);
        return result;
      } catch (error) {
        if (signal.aborted) throw signal.reason;
        const temporary = error instanceof ApiClientError && (error.status === undefined || [408, 429].includes(error.status) || error.status >= 500);
        if (!temporary) throw error;
        onConnection?.(true);
        if (++failures > 6 || Date.now() >= deadline) throw new Error("Chưa kết nối lại được. Yêu cầu đã lưu; hãy tiếp tục theo dõi khi có mạng.");
        await pause(Math.min(15_000, 2_000 * 2 ** (failures - 1)), signal);
      }
    }
  }
  let session = readReviewSession(contractId);
  if (resumeOnly && session?.blockedError) throw new ApiClientError(session.blockedError, { status: 403 });
  analysisFocus ??= session?.analysisFocus;
  let review: ContractReviewRun | undefined;
  if (session?.reviewId) {
    try { review = await request(() => contractsApi.getReviewRun(session!.reviewId!, signal)); }
    catch (error) {
      if (!(error instanceof ApiClientError) || error.status !== 404) throw error;
      sessionStorage.removeItem(storageKey(contractId)); session = null;
    }
    if (review?.status === "failed" && !resumeOnly) {
      review = undefined; session = null; sessionStorage.removeItem(storageKey(contractId));
    }
  }
  if (!session && !review && resumeOnly) {
    const runs = await request(() => contractsApi.listReviewRuns(contractId, signal));
    review = runs.find((run) => run.status === "queued" || run.status === "running") ?? runs[0];
    if (!review) throw new Error("Chưa tìm thấy lượt rà soát. Hãy chọn rà soát từ danh sách hợp đồng.");
    session = { key: crypto.randomUUID(), reviewId: review._id };
    sessionStorage.setItem(storageKey(contractId), JSON.stringify(session));
  }
  if (!review) {
    session ??= { key: crypto.randomUUID(), analysisFocus };
    delete session.blockedError;
    // Persist before POST: a lost response must not generate another key/body.
    sessionStorage.setItem(storageKey(contractId), JSON.stringify(session));
    try { review = await request(() => contractsApi.startReview(contractId, session!.key, session!.analysisFocus, signal)); }
    catch (error) {
      if (error instanceof ApiClientError && error.status === 403) {
        session.blockedError = error.message;
        sessionStorage.setItem(storageKey(contractId), JSON.stringify(session));
      }
      if (!(error instanceof ApiClientError) || error.status !== 409) throw error;
      const runs = await request(() => contractsApi.listReviewRuns(contractId, signal));
      review = runs.find((run) => run.status === "queued" || run.status === "running");
      if (!review) {
        // The server rejected this key and confirms there is no active run.
        // A future explicit retry can create a new request; never do so here.
        clearReviewSession(contractId);
        throw error;
      }
    }
    session.reviewId = review._id;
    sessionStorage.setItem(storageKey(contractId), JSON.stringify(session));
  }
  for (;;) {
    signal.throwIfAborted();
    onProgress?.(review);
    if (review.status === "failed") throw new Error(review.error || "Lượt rà soát thất bại. Bạn có thể chủ động thử lại.");
    if (review.status === "completed") break;
    if (Date.now() >= deadline) throw new Error("Lượt rà soát vẫn đang chạy. Mở lại hợp đồng để tiếp tục theo dõi.");
    await pause(2_000, signal);
    review = await request(() => contractsApi.getReviewRun(review!._id, signal));
  }
  const result = await request(() => contractsApi.getReview(contractId, signal));
  sessionStorage.removeItem(storageKey(contractId));
  return result;
}
