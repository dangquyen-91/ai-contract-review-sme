"use client";

import { Button } from "@/components/ui/button";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { MemberTable } from "@/components/members/member-table";
import { InvitationTable } from "@/components/invitations/invitation-table";
import { InvitationFormDialog } from "@/components/invitations/invitation-form-dialog";
import { Icon } from "@/components/ui/icon";
import { MemberCapacityDialog } from "@/components/members/member-capacity-dialog";
import { useCreateInvitationMutation, useMemberSubscription, useOrganizationInvitations, useOrganizationMembers, useRevokeInvitationMutation } from "@/hooks/use-invitations";
import { isApiClientError } from "@/lib/api/client";
import type { InvitationRole } from "@/types/invitations";

const errorMessage = (error: unknown) => isApiClientError(error) ? error.message : "Không thể xử lý yêu cầu. Vui lòng thử lại.";

export function MembersWorkspace({ orgId, organizationName }: { orgId: string; organizationName: string }) {
  const createInvitation = useCreateInvitationMutation(orgId);
  const revokeInvitation = useRevokeInvitationMutation(orgId);
  const [tab, setTab] = useState<"members" | "invitations">("members");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [showCapacity, setShowCapacity] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<InvitationRole>("staff");
  const submitting = createInvitation.isPending;
  const revoking = revokeInvitation.isPending ? revokeInvitation.variables ?? null : null;
  const actionLocks = useRef({ send: false, revoke: false });

  const members = useOrganizationMembers(orgId, page);
  const invitations = useOrganizationInvitations(orgId, page);
  const subscription = useMemberSubscription(orgId);
  const current = tab === "members" ? members : invitations;
  const items = tab === "members" ? members.data?.items : invitations.data?.items;
  const filtered = items?.filter((item) => {
    const text = "name" in item ? `${item.name} ${item.email}` : item.email;
    return text.toLocaleLowerCase("vi-VN").includes(search.toLocaleLowerCase("vi-VN"));
  });
  const quota = subscription.data?.members;
  const usedSeats = quota ? quota.count + (quota.pending ?? 0) : 0;
  const isFull = Boolean(quota && quota.available <= 0);
  const planName = subscription.data?.plan?.name ?? subscription.data?.plan?.code ?? "Gói miễn phí";



  function changeTab(next: "members" | "invitations") {
    setTab(next);
    setPage(1);
    setSearch("");
  }

  async function sendInvitation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting || actionLocks.current.send) return;
    if (isFull) {
      setShowInvite(false);
      setShowCapacity(true);
      return;
    }
    actionLocks.current.send = true;
    try {
      await createInvitation.mutateAsync({ email: email.trim().toLowerCase(), role });
      setShowInvite(false);
      setEmail("");
      setPage(1);
      setTab("invitations");
      toast.success("Đã gửi lời mời", { description: "Người nhận sẽ thấy liên kết trong email của họ." });
    } catch (error) {
      if (isApiClientError(error) && error.status === 403 && /^Member limit reached\b/i.test(error.message)) {
        setShowInvite(false);
        setShowCapacity(true);
      } else toast.error(errorMessage(error));
    }
    finally { actionLocks.current.send = false; }
  }

  async function revoke(id: string) {
    if (revokeInvitation.isPending || actionLocks.current.revoke) return;
    if (!window.confirm("Thu hồi lời mời này? Người nhận sẽ không thể dùng liên kết trong email nữa.")) return;
    actionLocks.current.revoke = true;
    try {
      await revokeInvitation.mutateAsync(id);
      toast.success("Đã thu hồi lời mời");
    } catch (error) { toast.error(errorMessage(error)); }
    finally { actionLocks.current.revoke = false; }
  }

  return <div className="space-y-6 text-[#14213d]">
    <section className="flex flex-wrap items-end justify-between gap-5">
      <div><p className="mb-2 text-[12px] font-bold uppercase tracking-[.1em] text-[#2864dc]">Quản lý tổ chức</p><h1 className="m-0 text-[clamp(28px,3vw,40px)] font-bold tracking-[-.04em]">Thành viên & lời mời</h1><p className="mt-2 max-w-[670px] text-[14px] leading-6 text-[#6b778c]">Quản lý quyền truy cập của đội ngũ trong {organizationName}.</p></div>
      <div className="flex flex-col items-start gap-2 sm:items-end">
        <Button variant="outline" size="default" type="button" onClick={() => isFull ? setShowCapacity(true) : setShowInvite(true)} ><Icon name="mail" className="h-4 w-4" />Mời thành viên</Button>
        {quota && <span className={`text-[12px] ${isFull ? "font-semibold text-[#91621c]" : "text-[#6b778c]"}`}>{usedSeats}/{quota.limit} chỗ đã sử dụng · {planName}</span>}
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-3" aria-label="Tổng quan thành viên">
      <div className="rounded-2xl border border-[#dfe7f2] bg-white p-5 shadow-[0_16px_38px_-32px_#213b6d]"><span className="text-[13px] text-[#64748b]">Thành viên</span><strong className="mt-2 block text-[30px] leading-none">{members.data?.total ?? "—"}</strong><p className="mb-0 mt-2 text-[12px] text-[#8190a4]">Đang thuộc tổ chức</p></div>
      <div className="rounded-2xl border border-[#f1e5ca] bg-[#fffbf3] p-5"><span className="text-[13px] text-[#876936]">Lời mời</span><strong className="mt-2 block text-[30px] leading-none">{invitations.data?.total ?? "—"}</strong><p className="mb-0 mt-2 text-[12px] text-[#947b53]">Tổng lời mời đã tạo</p></div>
      <div className="rounded-2xl border border-[#dce7f9] bg-[#f5f9ff] p-5"><span className="text-[13px] text-[#51709e]">Chỗ trong gói</span><strong className="mt-2 block text-[30px] leading-none">{quota ? `${usedSeats}/${quota.limit}` : "—"}</strong><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#dce8f8]"><div className={`h-full rounded-full ${isFull ? "bg-[#d99a2b]" : "bg-[#2864dc]"}`} style={{ width: quota ? `${Math.min(100, usedSeats / Math.max(1, quota.limit) * 100)}%` : "0%" }} /></div>{quota && <p className="mb-0 mt-2 text-[12px] text-[#64748b]">{quota.count} thành viên (gồm Owner) + {quota.pending ?? 0} lời mời đang chờ</p>}</div>
    </section>
    {isFull && <p className="rounded-xl border border-[#f1dfb5] bg-[#fff9e9] px-4 py-3 text-[13px] text-[#765b28]">Tổ chức đã hết chỗ. {(quota?.pending ?? 0) > 0 ? "Thu hồi lời mời đang chờ không còn cần thiết để giải phóng chỗ, hoặc " : "Bạn có thể "}<Link href="/goi-dich-vu" className="font-semibold underline">xem các gói dịch vụ</Link> để tăng hạn mức.</p>}
    {showCapacity && <MemberCapacityDialog subscription={subscription.data} onClose={() => setShowCapacity(false)} onManage={(next) => { setShowCapacity(false); changeTab(next); }} />}

    <section className="overflow-hidden rounded-2xl border border-[#e1e7f0] bg-white shadow-[0_24px_55px_-48px_#17335f]">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#e9edf3] px-5 pt-4 sm:px-6">
        <div className="flex gap-6" role="tablist" aria-label="Danh sách tổ chức">
          <button type="button" role="tab" aria-selected={tab === "members"} onClick={() => changeTab("members")} className={`border-b-2 pb-4 text-[14px] font-semibold ${tab === "members" ? "border-[#2864dc] text-[#1d53b9]" : "border-transparent text-[#748197]"}`}>Thành viên</button>
          <button type="button" role="tab" aria-selected={tab === "invitations"} onClick={() => changeTab("invitations")} className={`border-b-2 pb-4 text-[14px] font-semibold ${tab === "invitations" ? "border-[#2864dc] text-[#1d53b9]" : "border-transparent text-[#748197]"}`}>Lời mời</button>
        </div>
        <label className="mb-3 flex min-h-10 items-center gap-2 rounded-lg border border-[#dde5ef] bg-[#fbfcfe] px-3 text-[#8b99aa]"><Icon name="search" className="h-4 w-4" /><span className="sr-only">Tìm theo tên hoặc email</span><input className="w-[min(220px,44vw)] bg-transparent text-[13px] text-[#14213d] outline-none" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Tìm trên trang này..." /></label>
      </div>
      {current.isLoading ? <div className="p-12 text-center text-[14px] text-[#6b778c]" aria-busy="true">Đang tải dữ liệu...</div> : current.error ? <div className="p-9 text-center"><p className="text-[14px] text-[#a23a4d]">{errorMessage(current.error)}</p><Button variant="outline" size="sm"  type="button" onClick={() => current.refetch()}>Thử lại</Button></div> : !filtered?.length ? <div className="px-6 py-16 text-center"><span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-[#edf3ff] text-[#2864dc]"><Icon name={tab === "members" ? "team" : "mail"} className="h-6 w-6" /></span><h2 className="mb-0 mt-4 text-[17px]">{search ? "Không tìm thấy kết quả" : tab === "members" ? "Chưa có thành viên" : "Chưa có lời mời"}</h2><p className="mt-2 text-[13px] text-[#718096]">{search ? "Thử từ khóa khác hoặc xóa bộ lọc." : tab === "members" ? "Thành viên được mời sẽ hiển thị tại đây sau khi chấp nhận." : "Mời đồng đội tham gia tổ chức để bắt đầu cộng tác."}</p></div> : tab === "members" ? <MemberTable members={(members.data?.items ?? []).filter((item) => filtered.includes(item))} /> : <InvitationTable invitations={(invitations.data?.items ?? []).filter((item) => filtered.includes(item))} revoking={revoking} onRevoke={revoke} />}
      {current.data && current.data.pages > 1 && <div className="flex items-center justify-between border-t border-[#e9edf3] px-6 py-4 text-[13px] text-[#738198]"><span>Trang {page} / {current.data.pages}</span><div className="flex gap-2"><Button variant="outline" size="sm" type="button"  disabled={page <= 1} onClick={() => setPage(page - 1)}>Trước</Button><Button variant="outline" size="sm" type="button"  disabled={page >= current.data.pages} onClick={() => setPage(page + 1)}>Sau</Button></div></div>}
    </section>

    {showInvite && <InvitationFormDialog organizationName={organizationName} email={email} role={role} submitting={submitting} onEmailChange={setEmail} onRoleChange={setRole} onSubmit={sendInvitation} onClose={() => setShowInvite(false)} />}
  </div>;
}
