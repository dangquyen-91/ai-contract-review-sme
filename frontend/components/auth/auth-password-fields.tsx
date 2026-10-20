"use client";

import { useState } from "react";
import { get, type FieldError, type UseFormReturn } from "react-hook-form";
import { Icon } from "@/components/ui/icon";
import { AuthInput } from "./auth-input";
import type { AuthFormValues } from "@/types/auth";

export function AuthPasswordFields({
  form,
  isRegister,
  password,
  confirmPassword,
}: {
  form: UseFormReturn<AuthFormValues>;
  isRegister: boolean;
  password: string;
  confirmPassword: string;
}) {
  const [visible, setVisible] = useState(false);
  const {
    register,
    formState: { errors },
  } = form;
  const confirmError = get(errors, "confirmPassword") as FieldError | undefined;
  const passwordLongEnough = password.length >= 12;
  const passwordWithinLimit = new TextEncoder().encode(password).length <= 72;
  const passwordNotCommon = ![
    "123456789012",
    "password1234",
    "admin12345678",
    "qwerty123456",
    "lawscan123456",
  ].includes(password.toLowerCase());
  const passwordsMatch =
    Boolean(confirmPassword) && password === confirmPassword;

  return (
    <>
      <AuthInput
        id="password"
        label="Mật khẩu"
        icon="lock"
        type={visible ? "text" : "password"}
        autoComplete={isRegister ? "new-password" : "current-password"}
        placeholder={isRegister ? "Tối thiểu 12 ký tự" : "Nhập mật khẩu"}
        error={errors.password?.message}
        {...register("password")}
        trailing={
          <button
            className="w-[42px] h-[42px] grid place-items-center flex-none text-[#76859a] cursor-pointer mr-[3px] rounded-lg hover:text-[#0868ed] hover:bg-[#f0f5fc] [&_svg]:w-[17px]"
            type="button"
            aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            <Icon name={visible ? "eyeOff" : "eye"} />
          </button>
        }
      />
      {isRegister && (
        <>
          <AuthInput
            id="confirmPassword"
            label="Nhập lại mật khẩu"
            icon="lock"
            type={visible ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Nhập lại mật khẩu vừa tạo"
            error={confirmError?.message}
            {...register("confirmPassword")}
          />
          <div
            className="flex flex-wrap gap-[8px_15px] text-[#8a96a7] text-[length:9px] -mt-1 [&_span]:inline-flex [&_span]:items-center [&_span]:gap-1.5 [&_i]:w-1.5 [&_i]:h-1.5 [&_i]:bg-[#ccd3dd] [&_i]:rounded-full"
            aria-live="polite"
          >
            <span
              className={
                passwordLongEnough ? "text-[#16715d] [&_i]:bg-[#20a77f]" : ""
              }
            >
              <i />
              Ít nhất 12 ký tự
            </span>
            <span
              className={
                passwordWithinLimit && passwordNotCommon && password
                  ? "text-[#16715d] [&_i]:bg-[#20a77f]"
                  : ""
              }
            >
              <i />
              Không phải mật khẩu phổ biến
            </span>
            <span
              className={
                passwordsMatch ? "text-[#16715d] [&_i]:bg-[#20a77f]" : ""
              }
            >
              <i />
              Hai mật khẩu trùng khớp
            </span>
          </div>
        </>
      )}
    </>
  );
}
