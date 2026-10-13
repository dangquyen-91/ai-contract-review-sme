"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Brand } from "@/components/ui/brand";
import { Icon } from "@/components/ui/icon";
import { useLogoutMutation } from "@/hooks/use-auth";
import { isApiClientError } from "@/lib/api/client";
import { useAcceptInvitationMutation, useInvitationPreview } from "@/hooks/use-invitations";
import { workspacePath } from "@/lib/workspace-path";
import type { AuthUser } from "@/types/auth";

const roleNames: Record<string, string> = { manager: "Manager", staff: "Staff", reviewer: "Reviewer" };
const actionClass = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[10px] bg-[#2864dc] px-5 text-[14px] font-semibold text-white hover:bg-[#1f4fb2] disabled:cursor-wait disabled:opacity-60";

export function InvitationPage({ token, user }: { token: string; user: AuthUser | null }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const acceptInvitation = useAcceptInvitationMutation();
  const logoutMutation = useLogoutMutation();
  const [accepting, setAccepting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const validToken = /^[a-f\d]{64}$/.test(token);
  const preview = useInvitationPreview(token, validToken);
  const invite = preview.data;
  const wrongEmail = Boolean(invite && user && user.email.toLowerCase() !== invite.email.toLowerCase());
  const existingOrg = Boolean(user?.orgId);
  const inviteQuery = `?invitationToken=${token}`;

  async function accept() {
    if (!invite || !user || accepting || wrongEmail || existingOrg) return;
    setAccepting(true);
    try {
      const session = await acceptInvitation.mutateAsync(token);
      queryClient.clear();
      toast.success("Đã tham gia tổ chức", { description: `Chào mừng bạn đến ${invite.organizationName}.` });
      router.replace(workspacePath(session.user));
      router.refresh();
    } catch (error) {
      toast.error(isApiClientError(error) ? error.message : "Không thể chấp nhận lời mời. Vui lòng thử lại.");
      setAccepting(false);
      if (isApiClientError(error) && error.status === 401) router.refresh();
    }
  }

  async function switchAccount() {
    setLoggingOut(true);
    try {
      await logoutMutation.mutateAsync();
      queryClient.clear();
      router.replace(`/dang-nhap${inviteQuery}`);
      router.refresh();
    } catch {
      toast.error("Không thể đăng xuất. Vui lòng thử lại.");
      setLoggingOut(false);
    }
  }

  return <main className="min-h-dvh bg-[radial-gradient(ellipse_at_50%_0%,#e5eeff_0%,#f5f7fb_48%,#f8f9fb_100%)] px-4 py-8 font-[family-name:var(--font-geist-sans)] text-[#14213d] sm:py-14">
    <div className="mx-auto max-w-[620px]"><Link href="/" aria-label="LawScan trang chủ" className="mb-6 inline-block"><Brand /></Link><div className="overflow-hidden rounded-[22px] border border-[#dce5f2] bg-white shadow-[0_28px_80px_-48px_#193964]"><div className="h-2 bg-[linear-gradient(90deg,#183b76,#2864dc,#72a3ff)]" /><div className="p-6 sm:p-9">
      <span className="grid h-12 w-12 place-items-center rounded-[14px] bg-[#eaf1ff] text-[#2864dc]"><Icon name="mail" className="h-6 w-6" /></span>
      <p className="mb-1 mt-6 text-[12px] font-bold uppercase tracking-[.12em] text-[#2864dc]">Lời mời tham gia tổ chức</p>
      {!validToken ? <><h1 className="mt-2 text-[28px] font-bold tracking-[-.04em]">Liên kết không hợp lệ</h1><p className="text-[14px] leading-6 text-[#67768b]">Hãy mở lại liên kết đầy đủ từ email lời mời, hoặc liên hệ Owner của tổ chức.</p></> : preview.isLoading ? <div aria-busy="true"><h1 className="mt-2 text-[28px] font-bold tracking-[-.04em]">Đang kiểm tra lời mời...</h1><p className="text-[14px] text-[#67768b]">Vui lòng đợi trong giây lát.</p></div> : preview.error || !invite ? <><h1 className="mt-2 text-[28px] font-bold tracking-[-.04em]">Lời mời không còn khả dụng</h1><p className="text-[14px] leading-6 text-[#67768b]">{isApiClientError(preview.error) ? preview.error.message : "Lời mời có thể đã hết hạn, bị thu hồi hoặc đã được sử dụng. Hãy liên hệ Owner để được mời lại."}</p></> : <>
        <h1 className="mb-0 mt-2 text-[clamp(27px,5vw,35px)] font-bold leading-tight tracking-[-.04em]">Tham gia {invite.organizationName}</h1><p className="mt-3 text-[14px] leading-6 text-[#69788d]">Bạn được mời cộng tác trên LawScan. Kiểm tra thông tin trước khi tiếp tục.</p>
        <dl className="mt-6 grid gap-4 rounded-[14px] border border-[#e5ebf3] bg-[#f9fbfe] p-5 text-[14px] sm:grid-cols-2"><div><dt className="text-[12px] text-[#748197]">Email được mời</dt><dd className="mt-1 break-all font-semibold">{invite.email}</dd></div><div><dt className="text-[12px] text-[#748197]">Vai trò</dt><dd className="mt-1 font-semibold">{roleNames[invite.role] ?? invite.role}</dd></div><div><dt className="text-[12px] text-[#748197]">Tổ chức</dt><dd className="mt-1 font-semibold">{invite.organizationName}</dd></div><div><dt className="text-[12px] text-[#748197]">Hết hạn</dt><dd className="mt-1 font-semibold">{new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(invite.expiresAt))}</dd></div></dl>
        {!user ? <div className="mt-6"><p className="text-[13px] leading-5 text-[#65748b]">Dùng email <strong>{invite.email}</strong> để tạo tài khoản. Sau khi đăng ký, bạn sẽ quay lại lời mời để xác nhận tham gia.</p><div className="mt-4"><Link href={`/dang-ky${inviteQuery}`} className={`${actionClass} w-full`}>Tạo tài khoản để tham gia <Icon name="arrow" className="h-4 w-4" /></Link></div><p className="mt-3 text-center text-[13px] text-[#65748b]">Đã có tài khoản? <Link href={`/dang-nhap${inviteQuery}`} className="font-semibold text-[#1f57bc] underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2864dc]">Đăng nhập</Link></p></div> : wrongEmail ? <div className="mt-6 rounded-xl border border-[#f0dfb5] bg-[#fff9eb] p-4"><p className="m-0 text-[14px] text-[#775c2f]">Bạn đang đăng nhập bằng <strong>{user.email}</strong>. Hãy dùng đúng email nhận lời mời.</p><button type="button" onClick={switchAccount} disabled={loggingOut} className="mt-3 text-[13px] font-semibold text-[#1f57bc] underline">{loggingOut ? "Đang chuyển..." : "Đổi tài khoản"}</button></div> : existingOrg ? <div className="mt-6 rounded-xl border border-[#f0dfb5] bg-[#fff9eb] p-4 text-[14px] leading-6 text-[#775c2f]">Tài khoản này đã thuộc một tổ chức khác. Hiện LawScan chưa hỗ trợ tham gia nhiều tổ chức bằng cùng một tài khoản.</div> : <div className="mt-6"><p className="text-[13px] text-[#65748b]">Đang đăng nhập với <strong>{user.email}</strong></p><button type="button" onClick={accept} disabled={accepting} className={`${actionClass} mt-2 w-full sm:w-auto`}>{accepting ? "Đang xác nhận..." : "Chấp nhận lời mời"}<Icon name="arrow" className="h-4 w-4" /></button></div>}
      </>}
    </div></div><p className="mt-5 text-center text-[12px] text-[#8090a4]">Lời mời chỉ dành cho địa chỉ email được hiển thị ở trên.</p></div>
  </main>;
}
