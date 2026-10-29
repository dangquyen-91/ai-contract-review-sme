"use client";

import {
  ArrowUpRight,
  BriefcaseBusiness,
  FilePlus2,
  Handshake,
  House,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ContractTemplate } from "@/types/contract-drafts";

const icons = {
  labor: BriefcaseBusiness,
  service: Handshake,
  sales: Package,
  rental: House,
};

export function DraftTemplateCard({
  template,
  party,
  pending,
  onPartyChange,
  onOpen,
}: {
  template: ContractTemplate;
  party: string;
  pending: boolean;
  onPartyChange: (value: string) => void;
  onOpen: () => void;
}) {
  const Icon = icons[template.code];
  const roleId = `template-role-${template.code}`;
  return (
    <article
      data-template-code={template.code}
      className="@container/template-card group flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-200/20 transition-[border-color,box-shadow] hover:border-blue-200 hover:shadow-md hover:shadow-blue-950/5 sm:p-6"
    >
      <div className="flex items-start gap-4">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border border-blue-100/70 bg-blue-50 text-blue-600">
          <Icon size={23} strokeWidth={1.7} aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className="text-base font-semibold leading-6 tracking-tight text-slate-900">
            {template.name}
          </h3>
          <p className="mt-1 text-[11px] font-medium text-slate-400">
            Mẫu v{template.version}
          </p>
        </div>
        <ArrowUpRight
          size={17}
          aria-hidden="true"
          className="mt-1 shrink-0 text-slate-300 transition-colors group-hover:text-blue-500"
        />
      </div>
      <p className="mb-5 mt-4 flex-1 text-sm leading-6 text-slate-500">
        {template.description}
      </p>
      <div className="grid items-end gap-3 border-t border-slate-100 pt-4 @min-[400px]/template-card:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid min-w-0 gap-2">
          <label
            htmlFor={roleId}
            className="text-xs font-medium text-slate-500"
          >
            Vai trò bên soạn
          </label>
          {template.parties.length > 1 ? (
            <select
              id={roleId}
              aria-label={`Vai trò với ${template.name}`}
              value={party}
              disabled={pending}
              onChange={(event) => onPartyChange(event.target.value)}
              className="h-11 min-w-0 w-full rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-700 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            >
              {template.parties.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              id={roleId}
              readOnly
              value={template.parties[0].name}
              className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50/60 px-3 text-sm text-slate-600 outline-none"
            />
          )}
        </div>
        <Button
          className="h-11 w-full gap-2 px-4 @min-[400px]/template-card:w-auto"
          variant="outline"
          disabled={pending}
          onClick={onOpen}
        >
          <FilePlus2 size={15} aria-hidden="true" />
          Mở mẫu
        </Button>
      </div>
    </article>
  );
}
