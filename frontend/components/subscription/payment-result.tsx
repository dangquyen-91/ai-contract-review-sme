"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { workspacePath } from "@/lib/routing/workspace-path";
import { PaymentOrderStatus } from "./payment-order-status";
import type { AuthUser } from "@/types/auth";

export function PaymentResult({
  user,
  orderCode,
  cancelled,
}: {
  user: AuthUser | null;
  orderCode: number | null;
  cancelled: boolean;
}) {
  if (!orderCode)
    return (
      <section className="rounded-2xl border border-[#dce4ef] bg-white p-7">
        <h1 className="text-2xl font-semibold">
          Liên kết thanh toán chưa hợp lệ
        </h1>
        <p className="mt-3 text-sm">
          Không tìm thấy mã đơn. Hãy mở lịch sử thanh toán trong trang quản lý
          gói.
        </p>
        <Button asChild className="mt-5">
          <Link href={user ? workspacePath(user) : "/dang-nhap"}>
            Về tài khoản
          </Link>
        </Button>
      </section>
    );
  if (!user?.orgId) {
    const returnTo = `/thanh-toan/${cancelled ? "huy" : "ket-qua"}?orderCode=${orderCode}`;
    return (
      <section className="rounded-2xl border border-[#dce4ef] bg-white p-7">
        <h1 className="text-2xl font-semibold">
          Đăng nhập để xem đơn thanh toán
        </h1>
        <p className="mt-3 text-sm">
          Dùng đúng tài khoản đã tạo đơn #{orderCode}. Không cần chuyển khoản
          thêm.
        </p>
        <Button asChild className="mt-5">
          <Link href={`/dang-nhap?returnTo=${encodeURIComponent(returnTo)}`}>
            Đăng nhập
          </Link>
        </Button>
      </section>
    );
  }
  return (
    <PaymentOrderStatus
      key={`${user.orgId}:${orderCode}`}
      user={user}
      orgId={user.orgId}
      orderCode={orderCode}
      cancelled={cancelled}
    />
  );
}
