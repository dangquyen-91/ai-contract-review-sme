"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { forgotPasswordFormSchema } from "@/schemas/auth.schema";
import { AuthInput } from "./auth-input";

export function ForgotPasswordRequestForm({
  busy,
  remaining,
  onSubmit,
}: {
  busy: boolean;
  remaining: number;
  onSubmit: (email: string) => Promise<unknown>;
}) {
  const form = useForm<z.infer<typeof forgotPasswordFormSchema>>({
    resolver: zodResolver(forgotPasswordFormSchema),
    defaultValues: { email: "" },
  });

  return (
    <form
      noValidate
      onSubmit={form.handleSubmit(({ email }) => onSubmit(email))}
      className="grid gap-5"
    >
      <AuthInput
        id="recovery-email"
        label="Email"
        icon="mail"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={254}
        placeholder="ban@example.com"
        disabled={busy}
        error={form.formState.errors.email?.message}
        {...form.register("email")}
      />
      <Button
        type="submit"
        disabled={busy || remaining > 0}
        loading={busy}
      >
        {remaining > 0 ? `Gửi lại sau ${remaining}s` : "Gửi mã xác minh"}
      </Button>
    </form>
  );
}
