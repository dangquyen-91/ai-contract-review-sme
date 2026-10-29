"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { useVietnamAddresses } from "@/hooks/organizations/use-vietnam-addresses";
import type { OrganizationCreateFormValues } from "@/schemas/organization.schema";

const selectClass =
  "h-12 w-full min-w-0 rounded-[10px] border border-input bg-card px-3 text-sm text-slate-700 outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50";

export function OrganizationAddressFields({ disabled }: { disabled: boolean }) {
  const {
    register,
    control,
    setValue,
    formState: { errors, isSubmitted },
  } = useFormContext<OrganizationCreateFormValues>();
  const [provinceCode, wardCode, addressLine] = useWatch({
    control,
    name: ["provinceCode", "wardCode", "addressLine"],
  });
  const directory = useVietnamAddresses();
  const provinces = directory.data?.provinces ?? [];
  const province = provinces.find((item) => item.code === provinceCode);
  const ward = province?.wards.find((item) => item.code === wardCode);

  return (
    <div className="grid min-w-0 gap-4 border-t border-slate-100 pt-4 sm:col-span-2 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <h2 className="text-sm font-semibold text-slate-800">
          Địa chỉ doanh nghiệp
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">
          Chọn tỉnh/thành phố và xã/phường/đặc khu theo địa chỉ hành chính hiện
          hành.
        </p>
      </div>
      {directory.isError && (
        <div
          role="alert"
          className="flex flex-wrap items-center gap-2 rounded-lg bg-red-50 p-3 text-xs text-destructive sm:col-span-2"
        >
          Chưa tải được danh sách địa chỉ.
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void directory.refetch()}
            disabled={directory.isFetching || disabled}
          >
            Thử lại
          </Button>
        </div>
      )}
      <div className="grid min-w-0 content-start gap-2">
        <label
          htmlFor="organization-province"
          className="text-sm font-medium text-slate-700"
        >
          Tỉnh / thành phố <span className="text-red-500">*</span>
        </label>
        <select
          id="organization-province"
          className={selectClass}
          required
          disabled={disabled || directory.isPending || directory.isError}
          aria-invalid={Boolean(errors.provinceCode)}
          aria-describedby={
            errors.provinceCode ? "organization-province-error" : undefined
          }
          {...register("provinceCode", {
            onChange: () =>
              setValue("wardCode", "", { shouldValidate: isSubmitted }),
          })}
        >
          <option value="">
            {directory.isPending
              ? "Đang tải danh sách…"
              : "Chọn tỉnh / thành phố"}
          </option>
          {provinces.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        {errors.provinceCode && (
          <p
            id="organization-province-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {errors.provinceCode.message}
          </p>
        )}
      </div>
      <div className="grid min-w-0 content-start gap-2">
        <label
          htmlFor="organization-ward"
          className="text-sm font-medium text-slate-700"
        >
          Xã / phường / đặc khu <span className="text-red-500">*</span>
        </label>
        <select
          id="organization-ward"
          className={selectClass}
          required
          disabled={disabled || !province || directory.isError}
          aria-invalid={Boolean(errors.wardCode)}
          aria-describedby={
            errors.wardCode ? "organization-ward-error" : undefined
          }
          {...register("wardCode")}
        >
          <option value="">
            {province
              ? "Chọn xã / phường / đặc khu"
              : "Chọn tỉnh / thành phố trước"}
          </option>
          {province?.wards.map((item) => (
            <option key={item.code} value={item.code}>
              {item.name}
            </option>
          ))}
        </select>
        {errors.wardCode && (
          <p
            id="organization-ward-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {errors.wardCode.message}
          </p>
        )}
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <label
          htmlFor="organization-address"
          className="text-sm font-medium text-slate-700"
        >
          Địa chỉ chi tiết <span className="text-red-500">*</span>
        </label>
        <textarea
          id="organization-address"
          autoComplete="street-address"
          placeholder="Số nhà, tên đường, tòa nhà, tầng/phòng, thôn/ấp/tổ dân phố…"
          rows={2}
          required
          maxLength={300}
          className="min-h-20 w-full resize-y rounded-[10px] border border-input bg-card px-3 py-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 placeholder:text-muted-foreground"
          aria-invalid={Boolean(errors.addressLine)}
          aria-describedby={
            errors.addressLine
              ? "organization-address-error"
              : "organization-address-help"
          }
          {...register("addressLine")}
        />
        <p
          id="organization-address-help"
          className="text-xs leading-5 text-slate-400"
        >
          Nhập những chi tiết có trong địa chỉ thực tế; không cần ghi lại
          xã/phường và tỉnh/thành phố.
        </p>
        {errors.addressLine && (
          <p
            id="organization-address-error"
            role="alert"
            className="text-xs text-destructive"
          >
            {errors.addressLine.message}
          </p>
        )}
      </div>
      {province && ward && addressLine?.trim() && (
        <p className="break-words rounded-lg border border-blue-100 bg-blue-50/50 px-3 py-2.5 text-xs leading-5 text-slate-600 sm:col-span-2">
          <span className="font-medium text-slate-800">Địa chỉ sẽ lưu: </span>
          {addressLine.trim()}, {ward.name}, {province.name}
        </p>
      )}
    </div>
  );
}
