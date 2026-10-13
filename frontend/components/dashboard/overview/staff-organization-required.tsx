"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useLogoutMutation, useRefreshTokenMutation } from "@/hooks/use-auth";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";

export function StaffOrganizationRequired({ email, role = "staff" }: { email: string; role?: "staff" | "reviewer" | "manager" }) {
  const roleName = role === "reviewer" ? "Reviewer" : role === "manager" ? "Manager" : "Staff";
  const router = useRouter();
  const queryClient = useQueryClient();
  const refreshTokenMutation = useRefreshTokenMutation();
  const logoutMutation = useLogoutMutation();
  const [pending, setPending] = useState<"refresh" | "logout" | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    setPending("refresh");
    setError("");
    try {
      await refreshTokenMutation.mutateAsync();
      queryClient.clear();
      router.refresh();
    } catch {
      setError("Không thể cập nhật tài khoản. Vui lòng thử lại hoặc đăng nhập lại.");
    } finally {
      setPending(null);
    }
  }

  async function switchAccount() {
    setPending("logout");
    setError("");
    try {
      await logoutMutation.mutateAsync();
      queryClient.clear();
      router.replace("/dang-nhap");
      router.refresh();
    } catch {
      setError("Không thể đăng xuất. Vui lòng thử lại.");
      setPending(null);
    }
  }

  return (
    <main className={"min-h-[100dvh] [background:radial-gradient(ellipse_at_50%_20%,_#eaf2ff,_#f7f9fc_65%)] text-[#1c3056] p-[20px_24px_56px] max-[600px]:p-[12px_16px_32px]"}>
      <header className={"max-w-[1120px] m-[0_auto_24px] [&_a]:inline-flex [&_a:focus-visible]:[outline:3px_solid_#88b4ff] [&_a:focus-visible]:[outline-offset:4px] max-[600px]:mb-[12px]"}><Link href="/" aria-label="LawScan — về trang chủ"><Brand /></Link></header>
      <section className={"max-w-[620px] m-[0_auto] p-[38px] [border:1px_solid_#e0e8f3] rounded-[24px] [background:#fff] shadow-[0_24px_60px_-35px_#57749d] [&_h1]:m-[0] [&_h1]:text-[clamp(26px,_4vw,_34px)] [&_h1]:font-bold [&_h1]:tracking-[-.035em] [&_h1]:leading-[1.2] max-[600px]:p-[26px_22px] max-[600px]:rounded-[18px]"} aria-labelledby="staff-join-heading">
        <span className={"grid w-[54px] h-[54px] place-items-center rounded-[15px] [background:#eaf2ff] text-[#245bd6]"}><Icon name="team" /></span>
        <p className={"m-[24px_0_10px] text-[#245bd6] text-[12px] font-bold tracking-[.07em] uppercase"}>{role === "reviewer" ? "Không gian chuyên viên rà soát" : role === "manager" ? "Không gian quản lý" : "Không gian nhân viên"}</p>
        <h1 id="staff-join-heading">Tham gia tổ chức để bắt đầu</h1>
        <p className={"m-[14px_0_24px] text-[#65748b] text-[14px] leading-[1.7]"}>Tài khoản của bạn chưa thuộc tổ chức nào. Hãy nhận lời mời từ Owner để cùng đội ngũ {role === "reviewer" ? "kiểm tra rủi ro và rà soát hợp đồng" : "tải lên và rà soát hợp đồng"}.</p>
        <div className={"flex items-center gap-[14px] p-[17px] [border:1px_solid_#e1e9f6] rounded-[12px] [background:#f8faff] [&_>_svg]:flex-none [&_>_svg]:text-[#245bd6] [&_>_svg]:w-[20px] [&_span]:block [&_span]:mb-[5px] [&_span]:text-[#65748b] [&_span]:text-[12px] [&_strong]:block [&_strong]:wrap-anywhere [&_strong]:text-[14px] [&_strong]:font-semibold"}><Icon name="mail" /><div><span>Email đang đăng nhập</span><strong>{email}</strong></div></div>
        <ol className={"grid gap-[20px] list-none [counter-reset:step] m-[28px_0] p-[0] [&_li]:relative [&_li]:pl-[43px] [&_li]:[counter-increment:step] [&_li::before]:[content:counter(step)] [&_li::before]:absolute [&_li::before]:left-[0] [&_li::before]:top-[0] [&_li::before]:grid [&_li::before]:w-[29px] [&_li::before]:h-[29px] [&_li::before]:place-items-center [&_li::before]:rounded-[50%] [&_li::before]:[background:#edf3fc] [&_li::before]:text-[#245bd6] [&_li::before]:text-[12px] [&_li::before]:font-bold [&_strong]:text-[14px] [&_strong]:font-semibold [&_p]:m-[6px_0_0] [&_p]:text-[#65748b] [&_p]:text-[13px] [&_p]:leading-[1.6]"}>
          <li><strong>Nhận lời mời từ Owner</strong><p>Nhờ Owner mời đúng email ở trên và chọn vai trò {roleName}.</p></li>
          <li><strong>Mở email lời mời</strong><p>Bấm vào liên kết trong email để kiểm tra thông tin tổ chức.</p></li>
          <li><strong>Chấp nhận và vào làm việc</strong><p>Đăng nhập bằng email được mời, sau đó chấp nhận lời mời để vào dashboard {roleName}.</p></li>
        </ol>
        <p className={"m-[0] pt-[20px] [border-top:1px_solid_#e9eef5] text-[#65748b] text-[12px] leading-[1.6]"}>Nếu chưa thấy email, hãy kiểm tra thư rác hoặc nhờ Owner gửi lại lời mời.</p>
        {error && <p className={"text-[#b42338] text-[13px] leading-[1.6] mt-[16px]"} role="alert">{error}</p>}
        <div className={"flex flex-wrap gap-[12px] mt-[24px] [&_button]:inline-flex [&_button]:min-h-[44px] [&_button]:items-center [&_button]:justify-center [&_button]:gap-[10px] [&_button]:rounded-[10px] [&_button]:p-[10px_17px] [&_button]:text-[13px] [&_button]:font-semibold [&_button]:cursor-pointer [&_button:disabled]:opacity-[.6] [&_button:disabled]:cursor-wait [&_button:focus-visible]:[outline:3px_solid_#88b4ff] [&_button:focus-visible]:[outline-offset:4px] max-[600px]:flex-col"}>
          <button className={"[background:#245bd6] [border:1px_solid_#245bd6] text-[#fff] [&:hover]:[background:#194cbd] [&_svg]:w-[17px] [&_svg]:h-[17px]"} onClick={refresh} disabled={pending !== null}>{pending === "refresh" ? "Đang kiểm tra…" : "Đã tham gia? Kiểm tra lại"}<Icon name="arrow" /></button>
          <button className={"[background:#fff] [border:1px_solid_#d6e1ef] text-[#345174] [&:hover]:[background:#f4f7fc]"} onClick={switchAccount} disabled={pending !== null}>{pending === "logout" ? "Đang đăng xuất…" : "Đổi tài khoản"}</button>
        </div>
      </section>
    </main>
  );
}
