"use client";

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { changePasswordFormSchema } from '@/schemas/profile.schema';
import { AuthInput } from '@/components/auth/auth-input';
import { Button } from '@/components/ui/button';
import { useChangeProfilePassword } from '@/hooks/profile/use-profile';
import type { Profile } from '@/types/profile';

export function ProfilePasswordForm({ user }: { user: Profile['user'] }) {
  const mutation = useChangeProfilePassword();
  const router = useRouter();
  const lock = useRef(false);
  const [visible, setVisible] = useState(false);
  const [changed, setChanged] = useState(false);
  const form = useForm({ resolver: zodResolver(changePasswordFormSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });
  const errors = form.formState.errors;
  const busy = mutation.isPending || form.formState.isSubmitting || changed;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_2px_8px_#14213d03] sm:p-7" aria-labelledby="profile-password-heading">
    <h2 id="profile-password-heading" className="text-base font-semibold">Mật khẩu & đăng nhập</h2>
    {user.hasPassword === false ? <>
      <p className="mt-3 text-sm leading-6 text-slate-500">Bạn đang đăng nhập bằng Google và chưa thiết lập mật khẩu. Xác minh email để tạo mật khẩu đăng nhập.</p>
      <Button asChild variant="outline" className="mt-4"><Link href="/quen-mat-khau?returnTo=%2Fho-so">Thiết lập mật khẩu qua email</Link></Button>
    </> : <>
      <p className="mb-6 mt-2 rounded-xl bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-500">Sau khi đổi mật khẩu, các phiên hiện tại sẽ kết thúc và bạn cần đăng nhập lại.</p>
      <form noValidate className="grid gap-5 [&_label]:text-sm [&_label]:font-medium [&_input]:!text-sm" onSubmit={event => { void form.handleSubmit(async ({ currentPassword, newPassword }) => {
        if (lock.current) return; lock.current = true;
        try {
          await mutation.mutateAsync({ currentPassword, newPassword });
          form.reset(); setChanged(true);
          toast.success('Đã đổi mật khẩu. Vui lòng đăng nhập lại.');
          router.replace('/dang-nhap?returnTo=%2Fho-so'); router.refresh();
        } catch { /* Keep inputs after validation errors. */ }
        finally { lock.current = false; }
      })(event); }}>
        <AuthInput id="profile-current-password" label="Mật khẩu hiện tại" icon="lock" type={visible ? 'text' : 'password'} autoComplete="current-password" error={errors.currentPassword?.message} {...form.register('currentPassword')} />
        <AuthInput id="profile-new-password" label="Mật khẩu mới" icon="lock" type={visible ? 'text' : 'password'} autoComplete="new-password" placeholder="Tối thiểu 12 ký tự" error={errors.newPassword?.message} {...form.register('newPassword')} />
        <AuthInput id="profile-confirm-password" label="Nhập lại mật khẩu mới" icon="lock" type={visible ? 'text' : 'password'} autoComplete="new-password" error={errors.confirmPassword?.message} {...form.register('confirmPassword')} />
        <label className="flex w-fit items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={visible} onChange={event => setVisible(event.target.checked)} />Hiện mật khẩu</label>
        {mutation.error && <p role="alert" className="text-sm text-red-600">{mutation.error.message}</p>}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5"><Link href="/quen-mat-khau?returnTo=%2Fho-so" className="text-sm font-medium text-blue-600 hover:underline">Quên mật khẩu hiện tại?</Link><Button type="submit" disabled={busy} loading={busy}>Đổi mật khẩu</Button></div>
      </form>
    </>}
  </section>;
}
