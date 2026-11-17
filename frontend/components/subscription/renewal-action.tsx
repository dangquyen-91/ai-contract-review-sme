"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { PlanCode, RenewalState } from "@/types/subscription";

const date = (value: string) =>
  new Date(value).toLocaleDateString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" });

/**
 * One renewal action for the next period, following the server's renewal state:
 * payable in the last 7 days of the period or within 3 days after it ended, once,
 * for the current plan or the lower plan a scheduled downgrade selected.
 */
export function RenewalAction({
  renewal,
  planName,
}: {
  renewal?: RenewalState;
  planName: (code: PlanCode) => string;
}) {
  if (!renewal || renewal.status === "none" || !renewal.planCode) return null;
  const next = planName(renewal.planCode);
  if (!renewal.payable)
    return (
      <p className="text-muted-foreground">
        Khi kỳ hiện tại kết thúc ngày {date(renewal.dueAt!)}, tài khoản chuyển về {next}.
      </p>
    );
  if (renewal.status === "renewed")
    return <p className="text-muted-foreground">Đã gia hạn kỳ tiếp theo.</p>;
  if (renewal.status === "not_open")
    return (
      <p className="text-muted-foreground">
        Gia hạn {next} được mở từ ngày {date(renewal.opensAt!)} (7 ngày trước khi hết hạn).
      </p>
    );
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button asChild>
        <Link href={`/goi-dich-vu/xac-nhan?plan=${renewal.planCode}`}>Gia hạn {next}</Link>
      </Button>
      <span className={renewal.status === "grace" ? "text-amber-700" : "text-muted-foreground"}>
        {renewal.status === "grace"
          ? `Gói đã hết hạn; gia hạn trước ngày ${date(renewal.graceUntil!)} để giữ gói.`
          : `Hết hạn ngày ${date(renewal.dueAt!)}.`}
      </span>
    </div>
  );
}
