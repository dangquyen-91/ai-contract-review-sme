"use client";

import { useRef, useState } from "react";
import {
  usePaymentActions,
  usePaymentHistory,
} from "@/hooks/subscription/use-payments";

export function usePaymentHistoryWorkflow(orgId: string) {
  const [page, setPage] = useState(1);
  const history = usePaymentHistory(orgId, page);
  const { sync, cancel } = usePaymentActions(orgId);
  const lock = useRef(false);
  const [error, setError] = useState("");
  const pending = sync.isPending || cancel.isPending;

  async function act(code: number, kind: "sync" | "cancel") {
    if (lock.current) return;
    if (
      kind === "cancel" &&
      !window.confirm(
        "Hủy đơn chưa thanh toán này? Nếu giao dịch đã thành công, hệ thống sẽ kiểm tra và cấp gói thay vì hủy.",
      )
    )
      return;
    lock.current = true;
    setError("");
    try {
      await (kind === "sync" ? sync : cancel).mutateAsync(code);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Chưa kiểm tra được thanh toán. Vui lòng thử lại.",
      );
      await history.refetch();
    } finally {
      lock.current = false;
    }
  }

  return { history, page, setPage, pending, error, act };
}
