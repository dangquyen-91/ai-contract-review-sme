"use client";

import { useState } from "react";
import { Building2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrganizationEditDialog } from "./organization-edit-dialog";

export function OrganizationInformationCard({ organization, roleLabel }: {
  organization: { id: string; name: string; taxCode: string | null; address: string | null };
  roleLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  return <section className="min-w-0 rounded-[14px] border border-border bg-card p-5 text-card-foreground shadow-sm sm:p-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Building2 className="size-5" aria-hidden="true" /></span>
        <h2 className="text-sm font-semibold">Thông tin tổ chức</h2>
      </div>
      <Button variant="outline" size="sm" aria-label="Chỉnh sửa thông tin tổ chức" onClick={() => setEditing(true)}><Pencil aria-hidden="true" />Chỉnh sửa</Button>
    </header>
    <p className="mt-5 break-words text-base font-semibold leading-6">{organization.name}</p>
    <dl className="mt-4 grid gap-3 border-t border-border pt-4 text-sm">
      {[{ label: "Mã số thuế", value: organization.taxCode }, { label: "Địa chỉ", value: organization.address }, { label: "Vai trò của bạn", value: roleLabel }].map(({ label, value }) => <div key={label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3"><dt className="text-muted-foreground">{label}</dt><dd className="m-0 break-words font-medium">{value || "Chưa cập nhật"}</dd></div>)}
    </dl>
    {editing && <OrganizationEditDialog organization={organization} onClose={() => setEditing(false)} />}
  </section>;
}
