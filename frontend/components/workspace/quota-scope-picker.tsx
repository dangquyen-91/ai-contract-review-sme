"use client";

import { usePathname } from "next/navigation";
import { WorkspaceIcon } from "@/components/layouts/dashboard/workspace-switcher";
import { useWorkspaceSwitcher } from "@/hooks/dashboard/use-workspace-switcher";
import { workspaceQuotaLabel, type QuotaKind } from "@/lib/workspace/quota-label";
import type { Workspace } from "@/types/auth";

/**
 * Lets a member pick, before starting, whether new work is saved to and charged to
 * their personal account or the organization. Choosing the other one switches the
 * workspace and reloads this page, so nothing is uploaded in the wrong place.
 */
export function QuotaScopePicker({ kind, disabled = false }: { kind: QuotaKind; disabled?: boolean }) {
  const pathname = usePathname();
  const { user, workspaces, switching, switchWorkspace } = useWorkspaceSwitcher();
  if (!user?.organizationMembership) return null;

  const current: Workspace = user.workspace ?? "organization";
  const options: Workspace[] = ["personal", "organization"];
  const nameOf = (key: Workspace) =>
    key === "personal" ? "Cá nhân" : (workspaces.find((item) => item.key === key)?.name ?? "Tổ chức");

  return (
    <fieldset className="m-0 min-w-0 border-0 p-0" disabled={disabled || switching}>
      <legend className="mb-2 p-0 text-ui-meta font-medium text-slate-600">
        Lưu vào và tính hạn mức của
      </legend>
      <div role="radiogroup" aria-label="Lưu vào và tính hạn mức của" className="grid gap-2 sm:grid-cols-2">
        {options.map((key) => {
          const workspace = workspaces.find((item) => item.key === key);
          const active = key === current;
          return (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => void switchWorkspace(key, pathname)}
              className={`flex min-w-0 items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-300 disabled:cursor-wait disabled:opacity-60 ${
                active
                  ? key === "personal"
                    ? "border-teal-300 bg-teal-50"
                    : "border-blue-300 bg-blue-50"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <WorkspaceIcon workspace={key} spinning={switching && !active} className="size-8" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-slate-900">{nameOf(key)}</span>
                <span className="block truncate text-xs text-slate-500">
                  {workspace ? workspaceQuotaLabel(workspace, kind) : "Đang tải hạn mức…"}
                </span>
              </span>
              <span
                aria-hidden="true"
                className={`grid size-4 shrink-0 place-items-center rounded-full border ${active ? "border-blue-600" : "border-slate-300"}`}
              >
                {active && <span className="size-2 rounded-full bg-blue-600" />}
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
