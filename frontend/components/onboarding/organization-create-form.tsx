"use client";

import { FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useIndustryOptionsQuery } from "@/hooks/organizations/use-industry-options";
import {
  organizationCreateFormSchema,
  type OrganizationCreateFormValues,
} from "@/schemas/organization.schema";

import { OrganizationAddressFields } from "./organization-address-fields";

export function OrganizationCreateForm({
  error,
  isSubmitting,
  setupCompleted,
  onChange,
  onSubmit,
  onBack,
}: {
  error: string;
  isSubmitting: boolean;
  setupCompleted: boolean;
  onChange: () => void;
  onSubmit: (values: OrganizationCreateFormValues) => void;
  onBack: () => void;
}) {
  const industryQuery = useIndustryOptionsQuery();
  const { industries } = industryQuery;
  const form = useForm<OrganizationCreateFormValues>({
    resolver: zodResolver(organizationCreateFormSchema),
    defaultValues: {
      name: "",
      taxCode: "",
      industry: "",
      provinceCode: "",
      wardCode: "",
      addressLine: "",
    },
  });
  const errors = form.formState.errors;
  const disabled = isSubmitting || setupCompleted;

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={onBack}
        className="mb-7 inline-flex items-center gap-2 rounded text-xs font-medium text-slate-500 transition-colors hover:text-blue-600 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-500 disabled:opacity-50"
      >
        <ArrowLeft size={15} />
        Quay lại lựa chọn
      </button>
      <header>
        <div className="mb-4 flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600">
            <Building2 size={22} strokeWidth={1.7} aria-hidden="true" />
          </span>
          <p className="text-[11px] font-semibold uppercase tracking-[1.2px] text-blue-600">
            Không gian làm việc chung
          </p>
        </div>
        <h1 className="text-[clamp(30px,3.5vw,44px)] font-semibold leading-tight tracking-[-1.3px] text-slate-900">
          Tạo doanh nghiệp của bạn
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-500">
          Điền thông tin để thiết lập không gian làm việc cho đội ngũ. Bạn có
          thể cập nhật các thông tin này sau trong phần quản trị.
        </p>
      </header>
      <FormProvider {...form}>
        <form
          className="mt-7 grid gap-5"
          onSubmit={form.handleSubmit(onSubmit)}
          onChange={onChange}
          noValidate
        >
          <fieldset
            disabled={disabled}
            className="grid min-w-0 gap-4 sm:grid-cols-2"
          >
            <div className="grid gap-2 sm:col-span-2">
              <label
                htmlFor="organization-name"
                className="text-sm font-medium text-slate-700"
              >
                Tên doanh nghiệp <span className="text-red-500">*</span>
              </label>
              <Input
                id="organization-name"
                autoFocus
                autoComplete="organization"
                placeholder="Ví dụ: Công ty TNHH Minh Tâm"
                required
                minLength={2}
                maxLength={200}
                aria-invalid={Boolean(errors.name)}
                aria-describedby={
                  errors.name ? "organization-name-error" : undefined
                }
                {...form.register("name")}
              />
              {errors.name && (
                <p
                  id="organization-name-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.name.message}
                </p>
              )}
            </div>
            <div className="grid content-start gap-2">
              <label
                htmlFor="organization-tax-code"
                className="text-sm font-medium text-slate-700"
              >
                Mã số thuế <span className="text-red-500">*</span>
              </label>
              <Input
                id="organization-tax-code"
                required
                placeholder="Ví dụ: 0312345678"
                maxLength={50}
                aria-invalid={Boolean(errors.taxCode)}
                aria-describedby={
                  errors.taxCode ? "organization-tax-code-error" : undefined
                }
                {...form.register("taxCode")}
              />
              {errors.taxCode && (
                <p
                  id="organization-tax-code-error"
                  role="alert"
                  className="text-xs text-destructive"
                >
                  {errors.taxCode.message}
                </p>
              )}
            </div>
            <div className="grid content-start gap-2">
              <label
                htmlFor="organization-industry"
                className="text-sm font-medium text-slate-700"
              >
                Ngành kinh doanh <span className="text-red-500">*</span>
              </label>
              <select
                id="organization-industry"
                required
                disabled={industryQuery.isPending || industries.length === 0}
                className="h-12 min-w-0 w-full rounded-[10px] border border-input bg-card px-3 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                aria-invalid={Boolean(errors.industry)}
                {...form.register("industry")}
              >
                <option value="">
                  {industryQuery.isPending ? "Đang tải danh sách…" : "Chưa chọn ngành"}
                </option>
                {industries.map((industry) => (
                  <option key={industry.code} value={industry.code}>
                    {industry.name}
                  </option>
                ))}
              </select>
              {!industryQuery.isPending && industries.length === 0 && (
                <div role="alert" className="text-xs text-destructive">
                  Chưa tải được danh sách ngành kinh doanh.
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="ml-2"
                    disabled={industryQuery.isFetching}
                    onClick={() => void industryQuery.refetch()}
                  >
                    Thử lại
                  </Button>
                </div>
              )}
              {errors.industry && (
                <p role="alert" className="text-xs text-destructive">
                  {errors.industry.message}
                </p>
              )}
            </div>
            <OrganizationAddressFields disabled={disabled} />
          </fieldset>
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-sm leading-6 text-destructive"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full justify-between"
            disabled={isSubmitting}
            loading={isSubmitting}
          >
            <span>
              {setupCompleted ? "Hoàn tất thiết lập" : "Tạo doanh nghiệp"}
            </span>
            <ArrowRight size={17} aria-hidden="true" />
          </Button>
          <p className="text-center text-xs leading-5 text-slate-400">
            Bạn sẽ là chủ doanh nghiệp và có thể mời thành viên sau khi tạo.
          </p>
        </form>
      </FormProvider>
    </>
  );
}
