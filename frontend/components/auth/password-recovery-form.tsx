"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { z } from "zod";
import { AuthInput } from "./auth-input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { usePasswordRecovery } from "@/hooks/use-password-recovery";
import { forgotPasswordFormSchema, resetPasswordFormSchema } from "@/schemas/auth.schema";

export function PasswordRecoveryForm({ loginHref }: { loginHref: string }) {
  const workflow = usePasswordRecovery();
  const [visible, setVisible] = useState(false);
  const emailForm = useForm<z.infer<typeof forgotPasswordFormSchema>>({ resolver: zodResolver(forgotPasswordFormSchema), defaultValues: { email: "" } });
  const resetForm = useForm<z.infer<typeof resetPasswordFormSchema>>({ resolver: zodResolver(resetPasswordFormSchema), defaultValues: { code: "", password: "", confirmPassword: "" } });
  const emailErrors = emailForm.formState.errors;
  const errors = resetForm.formState.errors;
  const busy = workflow.busy || emailForm.formState.isSubmitting || resetForm.formState.isSubmitting;
  const clearPasswords = () => { resetForm.reset({ code: "", password: "", confirmPassword: "" }); };
  return <div className="w-full max-w-[460px] rounded-2xl bg-white p-2 max-[840px]:border max-[840px]:p-6">
    <span className="mb-5 grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-600"><Icon name={workflow.done ? "check" : "lock"} className="h-6 w-6" /></span>
    <p className="mb-2 text-xs font-bold uppercase tracking-widest text-blue-600">Khôi phục tài khoản</p>
    <h1 className="text-3xl font-bold tracking-tight">{workflow.done ? "Đã đổi mật khẩu" : workflow.challenge ? "Đặt mật khẩu mới" : "Quên mật khẩu?"}</h1>
    {workflow.done ? <>
      <p role="status" className="my-5 text-sm leading-6 text-[#65748b]">Mật khẩu đã được cập nhật. Các phiên đăng nhập cũ đã kết thúc. Hãy đăng nhập lại bằng mật khẩu mới.</p>
      <Button asChild className="w-full"><Link href={loginHref}>Đăng nhập</Link></Button>
    </> : <>
      <p className="mb-6 mt-3 text-sm leading-6 text-[#65748b]">{workflow.challenge ? <>Nếu email <strong className="break-all">{workflow.challenge.email}</strong> thuộc tài khoản đang hoạt động, mã 6 số sẽ được gửi đến hộp thư. Mã có hiệu lực trong 10 phút. Kiểm tra cả thư rác.</> : "Nhập email đã đăng ký để nhận mã xác minh và đặt lại mật khẩu."}</p>
      {workflow.error && <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{workflow.error}</p>}
      {!workflow.challenge ? <form noValidate onSubmit={emailForm.handleSubmit(async ({ email }) => { await workflow.send(email); })} className="grid gap-5">
        <AuthInput id="recovery-email" label="Email" icon="mail" type="email" inputMode="email" autoComplete="email" maxLength={254} placeholder="ban@example.com" error={emailErrors.email?.message} {...emailForm.register("email")} />
        <Button type="submit" disabled={busy || workflow.remaining > 0} loading={busy}>{workflow.remaining > 0 ? `Gửi lại sau ${workflow.remaining}s` : "Gửi mã xác minh"}</Button>
      </form> : <>
        <form noValidate onSubmit={resetForm.handleSubmit(async (values) => { if (await workflow.submit(values)) clearPasswords(); })} className="grid gap-5">
          <AuthInput id="reset-code" label="Mã xác minh" icon="mail" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" error={errors.code?.message} {...resetForm.register("code")} />
          <AuthInput id="new-password" label="Mật khẩu mới" icon="lock" type={visible ? "text" : "password"} autoComplete="new-password" placeholder="Tối thiểu 12 ký tự" error={errors.password?.message} {...resetForm.register("password")} trailing={<button type="button" aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={visible} onClick={() => setVisible(!visible)} className="grid h-10 w-10 shrink-0 place-items-center text-[#65748b]"><Icon name={visible ? "eyeOff" : "eye"} className="h-4 w-4" /></button>} />
          <AuthInput id="confirm-new-password" label="Nhập lại mật khẩu mới" icon="lock" type={visible ? "text" : "password"} autoComplete="new-password" error={errors.confirmPassword?.message} {...resetForm.register("confirmPassword")} />
          <Button type="submit" disabled={busy} loading={busy}>Đặt lại mật khẩu</Button>
        </form>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="link" disabled={busy || workflow.remaining > 0} onClick={async () => { if (workflow.challenge && await workflow.send(workflow.challenge.email)) clearPasswords(); }}>{workflow.remaining > 0 ? `Gửi lại sau ${workflow.remaining}s` : "Gửi lại mã"}</Button>
          <Button type="button" variant="link" disabled={busy} onClick={() => { clearPasswords(); workflow.changeEmail(); }}>Đổi email</Button>
        </div>
      </>}
      <Link className="mt-6 inline-block text-sm font-semibold text-blue-600 hover:underline" href={loginHref}>Quay lại đăng nhập</Link>
    </>}
  </div>;
}
