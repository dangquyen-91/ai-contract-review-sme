"use client";
import { Badge } from "@/components/ui/badge";
import type { OrganizationMember } from "@/types/invitations";
const roles: Record<string, string> = { owner: "Owner", manager: "Manager", staff: "Staff", expert: "Expert" };

export function MemberTable({ members }: { members: OrganizationMember[] }) {
return <div className="overflow-x-auto" role="tabpanel"><table className="w-full min-w-[620px] border-collapse text-left text-ui"><thead className="bg-[#f8fafc] text-ui-meta text-[#728096]"><tr><th className="px-6 py-3 font-semibold">Thành viên</th><th className="px-5 py-3 font-semibold">Vai trò</th><th className="px-5 py-3 font-semibold">Trạng thái</th></tr></thead><tbody>{members.map((member) => <tr key={member.id} className="border-t border-[#edf0f5] hover:bg-[#fafcff]"><td className="px-6 py-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#eaf1ff] font-bold text-[#2864dc]">{member.name.trim().charAt(0).toUpperCase()}</span><div><strong className="block font-semibold text-[#1a2a44]">{member.name}</strong><span className="text-[#758398]">{member.email}</span></div></div></td><td className="px-5 py-4">{roles[member.role] ?? member.role}</td><td className="px-5 py-4"><Badge variant={member.isActive ? "success" : "neutral"}>{member.isActive ? "Hoạt động" : "Tạm ngưng"}</Badge></td></tr>)}</tbody></table></div>;
}
