import Link from "next/link";
import { get, type FieldError, type UseFormReturn } from "react-hook-form";
import { AuthInput } from "./auth-input";
import { AuthPasswordFields } from "./auth-password-fields";
import type { AuthFormValues } from "@/types/auth";

export function AuthCredentialsFields({
  form,
  isRegister,
  invited,
  inviteQuery,
  accountExists,
  password,
  confirmPassword,
}: {
  form: UseFormReturn<AuthFormValues>;
  isRegister: boolean;
  invited: boolean;
  inviteQuery: string;
  accountExists: boolean;
  password: string;
  confirmPassword: string;
}) {
  const {
    register,
    formState: { errors },
  } = form;
  const nameError = get(errors, "name") as FieldError | undefined;

  return (
    <>
      {isRegister && (
        <AuthInput
          id="name"
          label="Họ và tên"
          icon="user"
          autoComplete="name"
          maxLength={100}
          placeholder="Nguyễn Minh Anh"
          error={nameError?.message}
          {...register("name")}
        />
      )}
      <AuthInput
        id="email"
        label="Email công việc"
        icon="mail"
        type="email"
        readOnly={invited}
        autoComplete={invited ? "off" : "email"}
        inputMode="email"
        maxLength={254}
        placeholder="ban@doanhnghiep.vn"
        error={errors.email?.message}
        {...register("email")}
      >
        {invited && (
          <span className="text-[11px] font-normal text-[#69788e]">
            Email này được cố định theo lời mời của tổ chức.
          </span>
        )}
        {accountExists && (
          <Link
            href={`/dang-nhap${inviteQuery}`}
            className="text-sm font-semibold text-[#0868ed] underline"
          >
            Đăng nhập để nhận lời mời
          </Link>
        )}
      </AuthInput>
      <AuthPasswordFields
        form={form}
        isRegister={isRegister}
        password={password}
        confirmPassword={confirmPassword}
      />
      {!isRegister && (
        <label className="w-fit flex items-center gap-[9px] text-[#68778d] text-[length:10px] cursor-pointer [&_input]:w-[15px] [&_input]:h-[15px] [&_input]:accent-[#0868ed] [&_input]:m-0">
          <input type="checkbox" {...register("remember")} />
          <span>Ghi nhớ đăng nhập trên thiết bị này</span>
        </label>
      )}
    </>
  );
}
