"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { invitationsApi } from "@/lib/api/invitations";
import { isApiClientError } from "@/lib/api/client";
import type { InvitationRole, InvitationStatus } from "@/types/invitations";

const roles: Record<string, string> = { owner: "Owner", manager: "Manager", staff: "Staff", reviewer: "Reviewer" };
const statuses: Record<InvitationStatus, { label: string; className: string }> = {
  pending: { label: "Đang chờ", className: "bg-[#fff4dd] text-[#885c13]" },
  accepted: { label: "Đã chấp nhận", className: "bg-[#e7f7ef] text-[#176747]" },
  revoked: { label: "Đã thu hồi", className: "bg-[#eef1f5] text-[#627087]" },
  expired: { label: "Hết hạn", className: "bg-[#eef1f5] text-[#627087]" },
  delivery_failed: { label: "Gửi thất bại", className: "bg-[#fff0f1] text-[#a23a4d]" },
};

const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));
const errorMessage = (error: unknown) => isApiClientError(error) ? error.message : "Không thể xử lý yêu cầu. Vui lòng thử lại.";
const pageButton = "rounded-lg border border-[#dce4ee] bg-white px-3 py-2 text-[13px] font-semibold text-[#40536e] hover:bg-[#f3f7fc] disabled:cursor-not-allowed disabled:opacity-40";

export function OwnerMembersView({ orgId, organizationName }: { orgId: string; organizationName: string }) {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<"members" | "invitations">("members");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("staff");
  const [submitting, setSubmitting] = useState(false);
  const [revoking, setRevoking] = useState<string | null>(null);

  const members = useQuery({ queryKey: ["org-members", orgId, page], queryFn: () => invitationsApi.members(orgId, page), retry: false });
  const invitations = useQuery({ queryKey: ["org-invitations", orgId, page], queryFn: () => invitationsApi.invitations(orgId, page), retry: false });
  const subscription = useQuery({ queryKey: ["org-subscription", orgId], queryFn: () => invitationsApi.subscription(orgId), retry: false });
  const current = tab === "members" ? members : invitations;
  const items = tab === "members" ? members.data?.items : invitations.data?.items;
  const filtered = items?.filter((item) => {
    const text = "name" in item ? `${item.name} ${item.email}` : item.email;
    return text.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN"));
  });
  const quota = subscription.data?.members;

  useEffect(() => {
    if (!showInvite) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !submitting) setShowInvite(false); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [showInvite, submitting]);

  function changeTab(next: "members" | "invitations") {
    setTab(next);
    setPage(1);
    setSearch("");
  }

  async function sendInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      await invitationsApi.create(orgId, { email: email.trim().toLowerCase(), role });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["org-invitations", orgId] }),
        queryClient.invalidateQueries({ queryKey: ["org-subscription", orgId] }),
      ]);
      setShowInvite(false);
      setEmail("");
      setPage(1);
      setTab("invitations");
      toast.success("Đã gửi lời mời", { description: "Người nhận sẽ thấy liên kết trong email của họ." });
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setSubmitting(false); }
  }

  async function revoke(id: string) {
    if (!window.confirm("Thu hồi lời mời này? Người nhận sẽ không thể dùng liên kết trong email nữa.")) return;
    setRevoking(id);
    try {
      await invitationsApi.revoke(orgId, id);
      await queryClient.invalidateQueries({ queryKey: ["org-invitations", orgId] });
      toast.success("Đã thu hồi lời mời");
    } catch (error) { toast.error(errorMessage(error)); }
    finally { setRevoking(null); }
  }

  return <div className="space-y-6 text-[#14213d]">
    <section className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="mb-2 text-[12px] font-bold uppercase tracking-[.1em] text-[#2864dc]">Quản lý tổ chức</p><h1 className="m-0 text-[clamp(28px,3vw,40px)] font-bold tracking-[-.04em]">Thành viên & lời mời</h1><p className="mt-2 max-w-[670px] text-[14px] leading-6 text-[#6b778c]">Quản lý quyền truy cập của đội ngũ trong {organizationName}.</p></div>
      <button type="button" onClick={() => setShowInvite(true)} disabled={quota?.available === 0} className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-[#2864dc] px-5 text-[14px] font-semibold text-white shadow-[0_10px_24px_-14px_#2864dc] hover:bg-[#1f4fb2] disabled:cursor-not-allowed disabled:opacity-50"><Icon name="mail" className="h-4 w-4" />Mời thành viên</button>
    </section>

    <section className="grid gap-3 md:grid-cols-3" aria-label="Tổng quan thành viên">
      <div className="rounded-2xl border border-[#dfe7f2] bg-white p-5 shadow-[0_16px_38px_-32px_#213b6d]"><span className="text-[13px] text-[#64748b]">Thành viên</span><strong className="mt-2 block text-[30px] leading-none">{members.data?.total ?? "—"}</strong><p className="mb-0 mt-2 text-[12px] text-[#8190a4]">Đang thuộc tổ chức</p></div>
      <div className="rounded-2xl border border-[#f1e5ca] bg-[#fffbf3] p-5"><span className="text-[13px] text-[#876936]">Lời mời</span><strong className="mt-2 block text-[30px] leading-none">{invitations.data?.total ?? "—"}</strong><p className="mb-0 mt-2 text-[12px] text-[#947b53]">Tổng lời mời đã tạo</p></div>
      <div className="rounded-2xl border border-[#dce7f9] bg-[#f5f9ff] p-5"><span className="text-[13px] text-[#51709e]">Chỗ trong gói</span><strong className="mt-2 block text-[30px] leading-none">{quota ? `${quota.count}/${quota.limit}` : "—"}</strong><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dce8f8]"><div className="h-full rounded-full bg-[#2864dc]" style={{ width: quota ? `${Math.min(100, quota.count / Math.max(1, quota.limit) * 100)}%` : "0%" }} /></div></div>
    </section>
    {quota?.available === 0 && <p className="rounded-xl border border-[#f1dfb5] bg-[#fff9e9] px-4 py-3 text-[13px] text-[#765b28]">Gói hiện tại đã hết chỗ. <Link href="/goi-dich-vu" className="font-semibold underline">Xem gói dịch vụ</Link> để mời thêm thành viên.</p>}

    <section className="overflow-hidden rounded-2xl border border-[#e1e7f0] bg-white shadow-[0_24px_55px_-48px_#17335f]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9edf3] px-5 pt-4 sm:px-6">
        <div className="flex gap-6" role="tablist" aria-label="Danh sách tổ chức">
          <button type="button" role="tab" aria-selected={tab === "members"} onClick={() => changeTab("members")} className={`border-b-2 pb-4 text-[14px] font-semibold ${tab === "members" ? "border-[#2864dc] text-[#1d53b9]" : "border-transparent text-[#748197]"}`}>Thành viên</button>
          <button type="button" role="tab" aria-selected={tab === "invitations"} onClick={() => changeTab("invitations")} className={`border-b-2 pb-4 text-[14px] font-semibold ${tab === "invitations" ? "border-[#2864dc] text-[#1d53b9]" : "border-transparent text-[#748197]"}`}>Lời mời</button>
        </div>
        <label className="mb-3 flex min-h-10 items-center gap-2 rounded-lg border border-[#dde5ef] bg-[#fbfcfe] px-3 text-[#8b99aa]"><Icon name="search" className="h-4 w-4" /><span className="sr-only">Tìm theo tên hoặc email</span><input className="w-[min(220px,44vw)] bg-transparent text-[13px] text-[#14213d] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trên trang này..." /></label>
      </div>
      {current.isLoading ? <div className="p-12 text-center text-[14px] text-[#6b778c]" aria-busy="true">Đang tải dữ liệu...</div> : current.error ? <div className="p-9 text-center"><p className="text-[14px] text-[#a23a4d]">{errorMessage(current.error)}</p><button className={pageButton} type="button" onClick={() => current.refetch()}>Thử lại</button></div> : !filtered?.length ? <div className="px-6 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#edf3ff] text-[#2864dc]"><Icon name={tab === "members" ? "team" : "mail"} className="h-6 w-6" /></span><h2 className="mb-0 mt-4 text-[17px]">{search ? "Không tìm thấy kết quả" : tab === "members" ? "Chưa có thành viên" : "Chưa có lời mời"}</h2><p className="mt-2 text-[13px] text-[#718096]">{search ? "Thử từ khóa khác hoặc xóa bộ lọc." : tab === "members" ? "Thành viên được mời sẽ hiển thị tại đây sau khi chấp nhận." : "Mời đồng đội tham gia tổ chức để bắt đầu cộng tác."}</p></div> : tab === "members" ? <div className="overflow-x-auto" role="tabpanel"><table className="w-full min-w-[620px] border-collapse text-left text-[13px]"><thead className="bg-[#f8fafc] text-[12px] text-[#728096]"><tr><th className="px-6 py-3 font-semibold">Thành viên</th><th className="px-5 py-3 font-semibold">Vai trò</th><th className="px-5 py-3 font-semibold">Trạng thái</th></tr></thead><tbody>{members.data?.items.filter((item) => filtered.includes(item)).map((member) => <tr key={member.id} className="border-t border-[#edf0f5] hover:bg-[#fafcff]"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#eaf1ff] font-bold text-[#2864dc]">{member.name.trim().charAt(0).toUpperCase()}</span><div><strong className="block font-semibold text-[#1a2a44]">{member.name}</strong><span className="text-[#758398]">{member.email}</span></div></div></td><td className="px-5 py-4">{roles[member.role] ?? member.role}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-[12px] font-semibold ${member.isActive ? "bg-[#e7f7ef] text-[#176747]" : "bg-[#eef1f5] text-[#627087]"}`}>{member.isActive ? "Hoạt động" : "Tạm ngưng"}</span></td></tr>)}</tbody></table></div> : <div className="overflow-x-auto" role="tabpanel"><table className="w-full min-w-[760px] border-collapse text-left text-[13px]"><thead className="bg-[#f8fafc] text-[12px] text-[#728096]"><tr><th className="px-6 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Vai trò</th><th className="px-4 py-3 font-semibold">Ngày gửi / hạn</th><th className="px-4 py-3 font-semibold">Trạng thái</th><th className="px-5 py-3 text-right font-semibold">Thao tác</th></tr></thead><tbody>{invitations.data?.items.filter((item) => filtered.includes(item)).map((invitation) => <tr key={invitation._id} className="border-t border-[#edf0f5] hover:bg-[#fafcff]"><td className="px-6 py-4 font-medium text-[#243752]">{invitation.email}</td><td className="px-4 py-4">{roles[invitation.role]}</td><td className="px-4 py-4 text-[#758398]">{date(invitation.createdAt)} / {date(invitation.expiresAt)}</td><td className="px-4 py-4"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[12px] font-semibold ${statuses[invitation.status]?.className ?? "bg-[#eef1f5] text-[#627087]"}`}>{statuses[invitation.status]?.label ?? invitation.status}</span></td><td className="px-5 py-4 text-right">{invitation.status === "pending" && <button type="button" onClick={() => revoke(invitation._id)} disabled={revoking === invitation._id} className="font-semibold text-[#a23a4d] hover:underline disabled:opacity-50">{revoking === invitation._id ? "Đang thu hồi..." : "Thu hồi"}</button>}</td></tr>)}</tbody></table></div>}
      {current.data && current.data.pages > 1 && <div className="flex items-center justify-between border-t border-[#e9edf3] px-6 py-4 text-[13px] text-[#738198]"><span>Trang {page} / {current.data.pages}</span><div className="flex gap-2"><button type="button" className={pageButton} disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</button><button type="button" className={pageButton} disabled={page >= current.data.pages} onClick={() => setPage(page + 1)}>Sau</button></div></div>}
    </section>

    {showInvite && <div className="fixed inset-0 z-[100] grid place-items-center bg-[#0b1830]/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) setShowInvite(false); }}><section role="dialog" aria-modal="true" aria-labelledby="invite-title" className="w-full max-w-[480px] rounded-[20px] bg-white p-6 shadow-[0_32px_90px_-25px_#06152f] sm:p-8"><div className="flex items-start justify-between gap-4"><div><span className="grid h-11 w-11 place-items-center rounded-xl bg-[#eaf1ff] text-[#2864dc]"><Icon name="mail" className="h-5 w-5" /></span><h2 id="invite-title" className="mb-0 mt-4 text-[24px] font-bold tracking-[-.03em]">Mời thành viên</h2><p className="mt-2 text-[14px] leading-6 text-[#6b778c]">Người nhận sẽ nhận email để tham gia {organizationName}.</p></div><button type="button" onClick={() => setShowInvite(false)} aria-label="Đóng" className="rounded-lg px-2 py-1 text-[22px] text-[#7b8797] hover:bg-[#f1f4f8]">×</button></div><form className="mt-6 space-y-5" onSubmit={sendInvitation}><label className="block text-[13px] font-semibold text-[#293a55]">Email người nhận<input type="email" required autoFocus maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} placeholder="dongdoi@congty.vn" className="mt-2 h-11 w-full rounded-[9px] border border-[#d7e0eb] px-3 text-[14px] outline-none focus:border-[#2864dc] focus:ring-4 focus:ring-[#dce9ff]" /></label><label className="block text-[13px] font-semibold text-[#293a55]">Vai trò<select value={role} onChange={(event) => setRole(event.target.value as InvitationRole)} className="mt-2 h-11 w-full rounded-[9px] border border-[#d7e0eb] bg-white px-3 text-[14px] outline-none focus:border-[#2864dc] focus:ring-4 focus:ring-[#dce9ff]"><option value="manager">Manager — quản lý công việc</option><option value="staff">Staff — tải và rà soát</option><option value="reviewer">Reviewer — rà soát hợp đồng</option></select></label><p className="rounded-lg bg-[#f5f8fc] px-3 py-2.5 text-[12px] leading-5 text-[#6b778c]">Lời mời có hiệu lực 7 ngày. Chỉ email được mời mới có thể chấp nhận.</p><div className="flex justify-end gap-3 pt-1"><button type="button" onClick={() => setShowInvite(false)} className="rounded-lg border border-[#dce4ee] px-4 py-2.5 text-[13px] font-semibold text-[#4d5c72]">Hủy</button><button type="submit" disabled={submitting} className="rounded-lg bg-[#2864dc] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-[#1f4fb2] disabled:opacity-60">{submitting ? "Đang gửi..." : "Gửi lời mời"}</button></div></form></section></div>}
  </div>;
}
