"use client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Ellipsis, UserRoundMinus } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { OrganizationMember } from "@/types/invitations";
const roles: Record<string, string> = { owner: "Owner", manager: "Manager", staff: "Staff", expert: "Expert" };

export function MemberTable({ members, removing, onRemove }: {
  members: OrganizationMember[];
  removing?: string | null;
  onRemove: (member: OrganizationMember) => void;
}) {
  return <div className="overflow-x-auto" role="tabpanel">
    <table className="w-full min-w-[720px] border-collapse text-left text-ui">
      <thead className="bg-[#f8fafc] text-ui-meta text-[#728096]"><tr>
        <th className="px-6 py-3 font-semibold">Thành viên</th>
        <th className="px-5 py-3 font-semibold">Vai trò</th>
        <th className="px-5 py-3 font-semibold">Trạng thái</th>
        <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
      </tr></thead>
      <tbody>{members.map(member => <tr key={member.id} className="border-t border-[#edf0f5] hover:bg-[#fafcff]">
        <td className="px-6 py-4"><div className="flex items-center gap-3">
          <span className="grid h-9 w-9 flex-none place-items-center rounded-[10px] bg-[#eaf1ff] font-bold text-[#2864dc]">{member.name.trim().charAt(0).toUpperCase()}</span>
          <div><strong className="block font-semibold text-[#1a2a44]">{member.name}</strong><span className="text-[#758398]">{member.email}</span></div>
        </div></td>
        <td className="px-5 py-4">{roles[member.role] ?? member.role}</td>
        <td className="px-5 py-4"><Badge variant={member.isActive ? "success" : "neutral"}>{member.isActive ? "Hoạt động" : "Tạm ngưng"}</Badge></td>
        <td className="px-5 py-4 text-right">{member.role !== "owner" ? <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="ghost" size="icon-sm" className="text-slate-500 hover:bg-slate-100 hover:text-slate-800 data-[state=open]:bg-slate-100" aria-label={`Thao tác với ${member.name}`} disabled={Boolean(removing)} loading={removing === member.id}><Ellipsis aria-hidden="true" /></Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={12} className="z-[90] min-w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <DropdownMenu.Item disabled={Boolean(removing)} onSelect={() => onRemove(member)} className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 outline-none data-[highlighted]:bg-red-50 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"><UserRoundMinus size={16} aria-hidden="true" />Xóa khỏi tổ chức</DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root> : <span className="text-ui-meta text-slate-400">—</span>}</td>
      </tr>)}</tbody>
    </table>
  </div>;
}
