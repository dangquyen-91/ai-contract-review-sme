"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { InvitationStatus, OrganizationInvitation } from "@/types/invitations";
const roles: Record<string, string> = { owner: "Owner", manager: "Manager", staff: "Staff", reviewer: "Reviewer" };
const statuses: Record<InvitationStatus, { label: string; variant: "warning" | "success" | "neutral" | "danger" }> = {
  pending: { label: "Đang chờ", variant: "warning" },
  accepted: { label: "Đã chấp nhận", variant: "success" },
  revoked: { label: "Đã thu hồi", variant: "neutral" },
  expired: { label: "Hết hạn", variant: "neutral" },
  delivery_failed: { label: "Gửi thất bại", variant: "danger" },
  declined: { label: "Đã từ chối", variant: "neutral" },
};

const date = (value: string) => new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value));

export function InvitationTable({ invitations, revoking, onRevoke }: { invitations: OrganizationInvitation[]; revoking: string | null; onRevoke: (id: string) => void }) {
return <div className="overflow-x-auto" role="tabpanel"><table className="w-full min-w-[760px] border-collapse text-left text-ui"><thead className="bg-[#f8fafc] text-ui-meta text-[#728096]"><tr><th className="px-6 py-3 font-semibold">Email</th><th className="px-4 py-3 font-semibold">Vai trò</th><th className="px-4 py-3 font-semibold">Ngày gửi / hạn</th><th className="px-4 py-3 font-semibold">Trạng thái</th><th className="px-5 py-3 text-right font-semibold">Thao tác</th></tr></thead><tbody>{invitations.map((invitation) => <tr key={invitation._id} className="border-t border-[#edf0f5] hover:bg-[#fafcff]"><td className="px-6 py-4 font-medium text-[#243752]">{invitation.email}</td><td className="px-4 py-4">{roles[invitation.role]}</td><td className="px-4 py-4 text-[#758398]">{date(invitation.createdAt)} / {date(invitation.expiresAt)}</td><td className="px-4 py-4"><Badge variant={statuses[invitation.status]?.variant ?? "neutral"}>{statuses[invitation.status]?.label ?? invitation.status}</Badge></td><td className="px-5 py-4 text-right">{invitation.status === "pending" && <Button variant="link" size="sm" type="button" onClick={() => onRevoke(invitation._id)} disabled={revoking !== null} >{revoking === invitation._id ? "Đang thu hồi..." : "Thu hồi"}</Button>}</td></tr>)}</tbody></table></div>;
}
