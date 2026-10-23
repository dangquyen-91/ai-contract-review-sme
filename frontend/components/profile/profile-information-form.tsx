"use client";

import { useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { useProfileUpdates } from '@/hooks/use-profile';
import { profileFormSchema } from '@/schemas/profile.schema';
import { AuthInput } from '@/components/auth/auth-input';
import { Button } from '@/components/ui/button';
import type { Profile } from '@/types/profile';

export function ProfileInformationForm({ user }: { user: Profile['user'] }) {
  const { update } = useProfileUpdates();
  const router = useRouter();
  const lock = useRef(false);
  const form = useForm({ resolver: zodResolver(profileFormSchema), defaultValues: { name: user.name, phone: user.phone } });
  const busy = update.isPending || form.formState.isSubmitting;
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_#14213d03]" aria-labelledby="profile-information-heading">
    <div className="border-b border-slate-100 px-5 py-5 sm:px-7"><h2 id="profile-information-heading" className="text-base font-semibold">Thông tin cá nhân</h2><p className="mt-1 text-sm leading-6 text-slate-500">Thông tin giúp đồng đội nhận ra và liên hệ với bạn.</p></div>
    <form noValidate className="grid gap-6 p-5 sm:p-7 [&_label]:text-sm [&_label]:font-medium [&_input]:!text-sm" onSubmit={event => { void form.handleSubmit(async values => {
      if (lock.current) return; lock.current = true;
      try { await update.mutateAsync(values); toast.success('Đã lưu hồ sơ'); router.refresh(); }
      catch { /* Display mutation error below, retaining the entered values. */ }
      finally { lock.current = false; }
    })(event); }}>
      <AuthInput id="profile-name" label="Họ và tên" icon="user" autoComplete="name" maxLength={100} error={form.formState.errors.name?.message} {...form.register('name')} />
      <AuthInput id="profile-phone" label="Số điện thoại (không bắt buộc)" icon="user" type="tel" autoComplete="tel" maxLength={20} placeholder="Ví dụ: 0901234567" error={form.formState.errors.phone?.message} {...form.register('phone')} />
      <div className="rounded-xl bg-slate-50 px-4 py-3"><p className="text-xs font-medium text-slate-500">Địa chỉ email</p><p className="mt-1 break-all text-sm text-slate-700">{user.email}</p><p className="mt-1.5 text-xs leading-5 text-slate-500">Email được dùng để đăng nhập và nhận lời mời từ tổ chức.</p></div>
      {update.error && <p role="alert" className="text-sm text-red-600">{update.error.message}</p>}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5"><p className="text-xs text-slate-400">Thay đổi sẽ áp dụng cho tài khoản của bạn.</p><Button type="submit" disabled={busy} loading={busy}>Lưu thay đổi</Button></div>
    </form>
  </section>;
}
