"use client";

import { DropdownMenu } from "radix-ui";
import { Building2, Check, ChevronDown, LoaderCircle, UserRound } from "lucide-react";
import { useWorkspaceSwitcher } from "@/hooks/dashboard/use-workspace-switcher";
import type { Workspace } from "@/types/auth";

const theme = {
  personal: {
    trigger: "border-teal-200 bg-teal-50 hover:border-teal-300",
    icon: "bg-teal-600",
    text: "text-teal-700",
  },
  organization: {
    trigger: "border-blue-200 bg-blue-50 hover:border-blue-300",
    icon: "bg-blue-600",
    text: "text-blue-700",
  },
} as const;

export function WorkspaceIcon({ workspace, spinning = false, className = "" }: { workspace: Workspace; spinning?: boolean; className?: string }) {
  const Icon = spinning ? LoaderCircle : workspace === "personal" ? UserRound : Building2;
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-lg text-white shadow-sm ${theme[workspace].icon} ${className}`}>
      <Icon className={`size-4 ${spinning ? "animate-spin motion-reduce:animate-none" : ""}`} />
    </span>
  );
}

export function WorkspaceSwitcher({ disabled = false }: { disabled?: boolean }) {
  const { user, workspaces, switching, switchWorkspace } = useWorkspaceSwitcher();
  if (!user?.organizationMembership) return null;

  const current: Workspace = user.workspace ?? "organization";
  const options: Workspace[] = ["personal", "organization"];
  const organizationName = workspaces.find((item) => item.key === "organization")?.name;
  const label = (key: Workspace) => (key === "personal" ? "Cá nhân" : (organizationName ?? "Tổ chức"));
  const description = (key: Workspace) =>
    key === "personal"
      ? "Tài khoản của bạn"
      : user.organizationMembership?.role === "owner"
        ? "Bạn là chủ tổ chức"
        : "Bạn là thành viên tổ chức";

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild disabled={switching || disabled}>
        <button
          type="button"
          aria-label={`Không gian làm việc: ${label(current)}. Chuyển không gian`}
          title={disabled ? "Chờ lưu thay đổi và hoàn tất thao tác trước khi chuyển không gian." : undefined}
          className={`flex w-[136px] shrink-0 items-center gap-2 rounded-xl border p-1.5 text-left shadow-sm transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-60 sm:w-[216px] sm:gap-2.5 ${theme[current].trigger}`}
        >
          <WorkspaceIcon workspace={current} spinning={switching} className="size-7 sm:size-8" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-bold text-slate-900">{label(current)}</span>
            <span className={`hidden truncate text-[10px] leading-4 sm:block ${theme[current].text}`}>
              {switching ? "Đang chuyển…" : current === "personal" ? "Đang xem dữ liệu cá nhân" : "Đang xem dữ liệu tổ chức"}
            </span>
          </span>
          <ChevronDown aria-hidden="true" className={`mr-0.5 size-3.5 shrink-0 ${theme[current].text}`} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={6}
          className="z-[90] w-[min(300px,calc(100vw-2rem))] rounded-xl border border-slate-200 bg-white p-1.5 text-sm shadow-xl"
        >
          <DropdownMenu.Label className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Không gian làm việc
          </DropdownMenu.Label>
          {options.map((key) => (
            <DropdownMenu.Item
              key={key}
              onSelect={() => void switchWorkspace(key)}
              className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 outline-none focus:bg-slate-50 data-[highlighted]:bg-slate-50"
            >
              <WorkspaceIcon workspace={key} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{label(key)}</span>
                <span className="block truncate text-xs text-slate-500">{description(key)}</span>
              </span>
              {key === current && <Check aria-label="Đang dùng" className={`size-4 shrink-0 ${theme[key].text}`} />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
