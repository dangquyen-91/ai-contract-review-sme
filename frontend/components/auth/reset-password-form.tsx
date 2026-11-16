"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { resetPasswordFormSchema } from "@/schemas/auth.schema";
import { AuthInput } from "./auth-input";

export function ResetPasswordForm({
  busy,
  remaining,
  onSubmit,
  onResend,
  onChangeEmail,
}: {
  busy: boolean;
  remaining: number;
  onSubmit: (values: z.infer<typeof resetPasswordFormSchema>) => Promise<unknown>;
  onResend: () => Promise<unknown>;
  onChangeEmail: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const form = useForm<z.infer<typeof resetPasswordFormSchema>>({
    resolver: zodResolver(resetPasswordFormSchema),
    defaultValues: { code: "", password: "", confirmPassword: "" },
  });
  const clearFields = () => form.reset({ code: "", password: "", confirmPassword: "" });

  return (
    <>
      <form
        noValidate
        onSubmit={form.handleSubmit(async (values) => {
          if (await onSubmit(values)) clearFields();
        })}
        className="grid gap-5"
      >
        <AuthInput
          id="reset-code"
          label="Mã xác minh"
          icon="mail"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          disabled={busy}
          error={form.formState.errors.code?.message}
          {...form.register("code", {
            onChange: (event) => {
              form.setValue("code", event.target.value.replace(/\D/g, "").slice(0, 6), {
                shouldDirty: true,
                shouldValidate: true,
              });
            },
          })}
        />
        <AuthInput
          id="new-password"
          label="Mật khẩu mới"
          icon="lock"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          placeholder="Tối thiểu 12 ký tự"
          disabled={busy}
          error={form.formState.errors.password?.message}
          {...form.register("password")}
          trailing={
            <button
              type="button"
              aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
              aria-pressed={visible}
              onClick={() => setVisible((current) => !current)}
              className="grid h-10 w-10 shrink-0 place-items-center text-[#65748b]"
            >
              <Icon name={visible ? "eyeOff" : "eye"} className="h-4 w-4" />
            </button>
          }
        />
        <AuthInput
          id="confirm-new-password"
          label="Nhập lại mật khẩu mới"
          icon="lock"
          type={visible ? "text" : "password"}
          autoComplete="new-password"
          disabled={busy}
          error={form.formState.errors.confirmPassword?.message}
          {...form.register("confirmPassword")}
        />
        <Button type="submit" disabled={busy} loading={busy}>
          Đặt lại mật khẩu
        </Button>
      </form>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="link"
          disabled={busy || remaining > 0}
          onClick={async () => {
            if (await onResend()) clearFields();
          }}
        >
          {remaining > 0 ? `Gửi lại sau ${remaining}s` : "Gửi lại mã"}
        </Button>
        <Button
          type="button"
          variant="link"
          disabled={busy}
          onClick={() => {
            clearFields();
            onChangeEmail();
          }}
        >
          Đổi email
        </Button>
      </div>
    </>
  );
}
