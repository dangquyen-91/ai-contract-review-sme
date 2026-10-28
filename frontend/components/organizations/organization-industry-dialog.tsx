"use client";

import { useId, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useContractProfiles } from "@/hooks/contracts/use-contracts";
import { useUpdateOrganizationIndustry } from "@/hooks/organizations/use-organizations";

export type IndustryOption = { code: string; name: string };

export function useIndustryOptions(): IndustryOption[] {
  const { data: profiles } = useContractProfiles();
  const options = new Map<string, string>();
  for (const profile of profiles ?? []) for (const industry of profile.industries) options.set(industry.code, industry.name);
  return [...options].map(([code, name]) => ({ code, name }));
}

export function OrganizationIndustryDialog({ organizationId, industry, options, onClose }: {
  organizationId: string;
  industry: string | null;
  options: IndustryOption[];
  onClose: () => void;
}) {
  const id = useId();
  const [value, setValue] = useState(industry ?? "");
  const mutation = useUpdateOrganizationIndustry(organizationId);

  async function save() {
    try {
      await mutation.mutateAsync(value || null);
      toast.success("Đã cập nhật ngành kinh doanh.");
      onClose();
    } catch {
      return;
    }
  }

  return <Dialog open onOpenChange={(open) => { if (!open && !mutation.isPending) onClose(); }}><DialogContent busy={mutation.isPending}>
    <DialogHeader>
      <DialogTitle>Ngành kinh doanh</DialogTitle>
      <DialogDescription>AI dùng ngành của tổ chức để kiểm tra thêm các điểm riêng của lĩnh vực trong mọi hợp đồng được rà soát.</DialogDescription>
    </DialogHeader>
    <label htmlFor={`${id}-industry`} className="grid gap-2 text-sm">Ngành
      <select id={`${id}-industry`} value={value} onChange={(event) => setValue(event.target.value)} disabled={mutation.isPending}
        className="h-10 w-full rounded-md border border-input bg-card px-3 text-sm text-card-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-60">
        <option value="">Không chọn</option>
        {options.map((option) => <option key={option.code} value={option.code}>{option.name}</option>)}
      </select>
    </label>
    {mutation.error && <p role="alert" className="text-sm text-destructive">{mutation.error.message}</p>}
    <DialogFooter className="gap-2">
      <Button type="button" variant="outline" disabled={mutation.isPending} onClick={onClose}>Đóng</Button>
      <Button type="button" loading={mutation.isPending} disabled={value === (industry ?? "")} onClick={save}>Lưu</Button>
    </DialogFooter>
  </DialogContent></Dialog>;
}
