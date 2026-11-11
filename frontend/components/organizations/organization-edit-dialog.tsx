"use client";

import { useRef } from "react";
import { FormProvider, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useUpdateOrganization } from "@/hooks/organizations/use-organizations";
import { useIndustryOptionsQuery } from "@/hooks/organizations/use-industry-options";
import {
  organizationCreateFormSchema,
  type OrganizationCreateFormValues,
} from "@/schemas/organization.schema";
import type { DashboardOrganization } from "@/types/dashboard";
import { OrganizationAddressFields } from "@/components/onboarding/organization-address-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

export function OrganizationEditDialog({
  organization,
  onClose,
}: {
  organization: DashboardOrganization;
  onClose: () => void;
}) {
  const mutation = useUpdateOrganization(organization.id);
  const industryQuery = useIndustryOptionsQuery();
  const lock = useRef(false);
  const form = useForm<OrganizationCreateFormValues>({
    resolver: zodResolver(organizationCreateFormSchema),
    defaultValues: {
      name: organization.name,
      taxCode: organization.taxCode ?? "",
      industry: organization.industry ?? "",
      provinceCode: organization.addressDetails?.provinceCode ?? "",
      wardCode: organization.addressDetails?.wardCode ?? "",
      addressLine: organization.addressDetails?.addressLine ?? "",
    },
  });
  const industry = useWatch({ control: form.control, name: "industry" });
  async function save(values: OrganizationCreateFormValues) {
    if (lock.current) return;
    lock.current = true;
    const { provinceCode, wardCode, addressLine, ...metadata } = values;
    try {
      await mutation.mutateAsync({
        ...metadata,
        addressDetails: { provinceCode, wardCode, addressLine },
      });
      toast.success("Đã cập nhật tổ chức.");
      onClose();
    } catch {
      /* Mutation error is displayed below. */
    } finally {
      lock.current = false;
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) onClose();
      }}
    >
      <DialogContent
        busy={mutation.isPending}
        className="max-h-[90dvh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>Chỉnh sửa tổ chức</DialogTitle>
          <DialogDescription>
            Các thông tin doanh nghiệp đều bắt buộc. Địa chỉ được chọn theo
            tỉnh/thành phố và xã/phường.
          </DialogDescription>
        </DialogHeader>
        <FormProvider {...form}>
          <form
            className="grid gap-4"
            noValidate
            onSubmit={event => void form.handleSubmit(save)(event)}
          >
            <fieldset
              disabled={mutation.isPending}
              className="grid min-w-0 gap-4"
            >
              <label className="grid gap-2 text-sm">
                Tên tổ chức *
                <Input
                  required
                  minLength={2}
                  maxLength={200}
                  aria-invalid={!!form.formState.errors.name}
                  {...form.register("name")}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Mã số thuế *
                <Input
                  required
                  maxLength={14}
                  placeholder="0312345678 hoặc 0312345678-001"
                  aria-invalid={!!form.formState.errors.taxCode}
                  {...form.register("taxCode")}
                />
              </label>
              <label className="grid gap-2 text-sm">
                Ngành kinh doanh *
                <select
                  className="min-h-11 w-full rounded-lg border border-input bg-card px-3"
                  required
                  value={industry}
                  {...form.register("industry")}
                  disabled={mutation.isPending || industryQuery.isPending}
                >
                  <option value="">Vui lòng chọn ngành</option>
                  {industryQuery.industries.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
              {industryQuery.isError && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void industryQuery.refetch()}
                >
                  Tải lại danh sách ngành
                </Button>
              )}
              {!organization.addressDetails && organization.address && (
                <p className="text-xs text-muted-foreground">
                  Địa chỉ đang lưu: {organization.address}. Vui lòng chọn lại
                  tỉnh/phường để chuẩn hóa.
                </p>
              )}
              <OrganizationAddressFields disabled={mutation.isPending} />
              {["name", "taxCode", "industry"].map((key) => {
                const error =
                  form.formState.errors[key as "name" | "taxCode" | "industry"];
                return error ? (
                  <p
                    key={key}
                    role="alert"
                    className="text-xs text-destructive"
                  >
                    {error.message}
                  </p>
                ) : null;
              })}
            </fieldset>
            {mutation.error && (
              <p role="alert" className="text-sm text-destructive">
                {mutation.error.message}
              </p>
            )}
            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={mutation.isPending}
                onClick={onClose}
              >
                Đóng
              </Button>
              <Button type="submit" loading={mutation.isPending}>
                Lưu thay đổi
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}
