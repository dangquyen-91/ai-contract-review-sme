"use client";

import { useWorkspaceSwitcher } from "@/hooks/dashboard/use-workspace-switcher";
import { Building2, ChevronDown, LoaderCircle, UserRound } from "lucide-react";

export function WorkspaceSwitcher({ disabled = false }: { disabled?: boolean }) {
  const { user, switching, switchWorkspace } = useWorkspaceSwitcher();
  if (!user?.organizationMembership) return null;
  const personal = user.workspace === "personal";
  const WorkspaceIcon = switching ? LoaderCircle : personal ? UserRound : Building2;

  return (
    <label
      className={`relative block w-[136px] shrink-0 rounded-xl border p-1.5 shadow-sm transition-colors focus-within:ring-2 focus-within:ring-blue-300 focus-within:ring-offset-2 sm:w-[216px] ${personal ? "border-teal-200 bg-teal-50 hover:border-teal-300" : "border-blue-200 bg-blue-50 hover:border-blue-300"} ${disabled || switching ? "opacity-60" : ""}`}
    >
      <span className="sr-only">Không gian làm việc</span>
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute left-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-white shadow-sm sm:size-8 ${personal ? "bg-teal-600" : "bg-blue-600"}`}
      >
        <WorkspaceIcon className={`size-4 ${switching ? "animate-spin motion-reduce:animate-none" : ""}`} />
      </span>
      <select
        aria-label="Chuyển không gian làm việc"
        value={user.workspace ?? "organization"}
        disabled={switching || disabled}
        title={disabled ? "Chờ lưu thay đổi và hoàn tất thao tác trước khi chuyển không gian." : undefined}
        onChange={(event) => void switchWorkspace(event.target.value as "personal" | "organization")}
        className={`block min-h-8 w-full cursor-pointer appearance-none rounded-md border-0 bg-transparent pl-9 pr-5 text-xs font-bold outline-none focus-visible:!outline-none disabled:cursor-wait sm:min-h-6 sm:pl-11 sm:text-sm ${personal ? "text-teal-950" : "text-blue-950"}`}
      >
        <option value="personal">Cá nhân</option>
        <option value="organization">Tổ chức</option>
      </select>
      <ChevronDown aria-hidden="true" className={`pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 ${personal ? "text-teal-700" : "text-blue-700"}`} />
      <span className={`pointer-events-none hidden pl-11 pr-3 text-[10px] leading-4 sm:block ${personal ? "text-teal-700" : "text-blue-700"}`}>
        {switching ? "Đang chuyển…" : user.workspace === "personal" ? "Dùng hạn mức cá nhân" : "Dùng hạn mức tổ chức"}
      </span>
    </label>
  );
}
