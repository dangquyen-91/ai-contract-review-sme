"use client";

import type { ReactNode } from "react";
import {
  ArrowRight,
  Bot,
  Building2,
  CreditCard,
  FileText,
  KeyRound,
  Lock,
  Mail,
  Package,
  Scale,
  Sparkles,
  UserCog,
  UserRound,
  Users,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { roleLabels } from "@/config/dashboard-roles";
import {
  auditActionLabel,
  auditGroupLabels,
  auditGroupOf,
  auditTargetTypeLabel,
  auditTone,
  describeAuditChanges,
} from "@/lib/admin/audit-labels";
import type { AuditEvent, AuditGroup } from "@/types/admin-operations";
import { formatVietnamDateTime } from "@/lib/format/date-time";
import { nameInitials } from "@/lib/format/initials";

const groupIcons: Record<AuditGroup, ReactNode> = {
  user: <UserCog size={22} aria-hidden="true" />,
  template: <FileText size={22} aria-hidden="true" />,
  legal_source: <Scale size={22} aria-hidden="true" />,
  invitation: <Mail size={22} aria-hidden="true" />,
  member: <Users size={22} aria-hidden="true" />,
  organization: <Building2 size={22} aria-hidden="true" />,
  subscription: <Package size={22} aria-hidden="true" />,
  payment: <CreditCard size={22} aria-hidden="true" />,
  account: <KeyRound size={22} aria-hidden="true" />,
  ai_job: <Sparkles size={22} aria-hidden="true" />,
};

const headerTone = {
  neutral: { band: "from-blue-100 via-blue-50", tile: "bg-blue-600 text-white" },
  warning: { band: "from-amber-100 via-amber-50", tile: "bg-amber-500 text-white" },
  danger: { band: "from-red-100 via-red-50", tile: "bg-red-600 text-white" },
} as const;

function Card({ title, avatar, children }: { title: string; avatar: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-700">{avatar}</span>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </section>
  );
}

export function AuditEventDialog({ event, onClose }: { event: AuditEvent | null; onClose: () => void }) {
  const changes = event ? describeAuditChanges(event.changes) : [];
  const group = event ? auditGroupOf(event.action) : null;
  const tone = headerTone[event ? auditTone(event.action) : "neutral"];
  const system = event?.actor.role === "system";
  return (
    <Dialog open={event !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
        <div className={`flex items-start gap-4 border-b border-slate-200 bg-linear-to-br ${tone.band} to-white px-6 pt-6 pb-5 pr-12`}>
          <span className={`grid size-12 shrink-0 place-items-center rounded-xl shadow-sm ${tone.tile}`}>
            {group ? groupIcons[group] : null}
          </span>
          <div className="min-w-0">
            <DialogTitle className="text-lg">{event ? auditActionLabel(event.action) : ""}</DialogTitle>
            <DialogDescription className="mt-1">
              {event ? `${group && auditGroupLabels[group] ? `${auditGroupLabels[group]} · ` : ""}${formatVietnamDateTime(event.createdAt, { dateStyle: "full", timeStyle: "medium" })}` : ""}
            </DialogDescription>
          </div>
        </div>
        {event && (
          <div className="grid gap-4 px-6 py-5 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <Card title="Người thực hiện" avatar={system ? <Bot size={18} aria-hidden="true" /> : nameInitials(event.actor.name) || <UserRound size={18} aria-hidden="true" />}>
                <p className="truncate font-semibold text-slate-900" title={event.actor.name}>{system ? "Hệ thống" : event.actor.name}</p>
                <span className="mt-1 inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-600">
                  {system ? "Tự động (payOS, tác vụ nền)" : (roleLabels[event.actor.role] ?? event.actor.role)}
                </span>
                {event.actor.email && <p className="mt-1 break-all text-xs text-slate-500">{event.actor.email}</p>}
              </Card>
              <Card title="Đối tượng" avatar={group ? groupIcons[group] : null}>
                <p className="text-xs text-slate-500">{auditTargetTypeLabel(event.target.type)}</p>
                <p className="wrap-break-word font-semibold text-slate-900">
                  {event.target.label ?? (event.target.id ? `#${event.target.id}` : "—")}
                </p>
                {event.organization && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                    <Building2 size={12} aria-hidden="true" />
                    {event.organization.type === "organization" ? "Tổ chức" : "Cá nhân"}: {event.organization.name}
                  </p>
                )}
              </Card>
            </div>
            <section aria-labelledby="audit-changes">
              <h3 id="audit-changes" className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Nội dung thay đổi</h3>
              {changes.length ? (
                <dl className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200">
                  {changes.map((change) => (
                    <div key={change.field} data-change={change.field} className="grid gap-1 px-4 py-3 sm:grid-cols-[10rem_1fr] sm:items-center sm:gap-3">
                      <dt className="text-slate-500">{change.label}</dt>
                      <dd className="flex flex-wrap items-center gap-2 font-medium">
                        {change.before !== null && (
                          <>
                            <span className="rounded-md bg-red-50 px-2 py-0.5 text-red-700 line-through decoration-red-300">{change.before}</span>
                            <ArrowRight size={14} className="text-slate-400" aria-label="thành" />
                          </>
                        )}
                        <span className={change.before !== null ? "rounded-md bg-emerald-50 px-2 py-0.5 text-emerald-700" : "wrap-break-word text-slate-900"}>
                          {change.after}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-slate-500">Thao tác này không kèm thay đổi dữ liệu.</p>
              )}
            </section>
            <p className="flex items-center gap-1.5 text-xs text-slate-400">
              <Lock size={12} aria-hidden="true" />
              Bản ghi chỉ để tra cứu, không thể sửa hoặc xóa.
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
