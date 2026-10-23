"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { reviewBlockedMessage, type ReviewBlockReason } from "@/lib/review-failure";

export function ReviewBlockedNotice({ reason, role }: { reason: ReviewBlockReason; role: string }) {
  const canManagePlan = role === "owner" || role === "user";
  const billing = reason !== "permission";
  return <div role="alert" className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-ui leading-6 text-amber-950">
    <div className="flex items-start gap-2"><Icon name="lock" className="mt-1 size-4 shrink-0" /><strong>{reason === "quota" ? "Đã hết lượt rà soát" : reason === "plan" ? "Chưa có gói AI hoạt động" : "Chưa có quyền rà soát"}</strong></div>
    <p className="mb-0 mt-2">{reviewBlockedMessage(reason)}</p>
    <p className="mb-0 mt-2">{billing && canManagePlan ? "Bạn có thể xem gói dịch vụ hoặc chờ kỳ hạn mức tiếp theo, rồi tiếp tục trên hợp đồng đã lưu." : "Liên hệ Chủ tổ chức để kiểm tra hạn mức hoặc quyền truy cập. Bạn không cần tải lại tệp."}</p>
    <div className="mt-3 flex flex-wrap gap-2">
      {billing && canManagePlan && <Button asChild size="sm"><Link href="/goi-dich-vu">Xem gói dịch vụ</Link></Button>}
      <Button asChild variant="outline" size="sm"><Link href={role === "administrator" ? "/admin" : "/contract"}>{role === "administrator" ? "Về dashboard" : "Về danh sách hợp đồng"}</Link></Button>
    </div>
  </div>;
}
