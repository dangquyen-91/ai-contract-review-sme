"use client";

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, Check, Mail } from 'lucide-react';
import { roleLabels } from '@/config/dashboard-roles';
import { useProfileUpdates } from '@/hooks/use-profile';
import { Button } from '@/components/ui/button';
import { ProfileAvatar } from './profile-avatar';
import type { Profile } from '@/types/profile';

export function ProfileAvatarEditor({ user }: { user: Profile['user'] }) {
  const { avatar, removeAvatar } = useProfileUpdates();
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const objectUrl = useRef<string | null>(null);
  const lock = useRef(false);
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  const busy = avatar.isPending || removeAvatar.isPending;
  function clear() {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    objectUrl.current = null; setPreview(null); setFile(null);
  }
  return <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_2px_8px_#14213d03]" aria-labelledby="avatar-heading">
    <div aria-hidden="true" className="relative h-24 overflow-hidden bg-[linear-gradient(110deg,#edf3ff_0%,#e5edff_55%,#f0f5ff_100%)] sm:h-28"><span className="absolute -right-6 -top-24 size-64 rounded-full border-[32px] border-white/40" /><span className="absolute right-48 top-6 size-40 rounded-full border-[24px] border-white/30" /></div>
    <div className="relative px-5 pb-6 sm:px-7">
    <div className="flex flex-wrap items-end justify-between gap-x-5 gap-y-4">
      <div className="min-w-0">
        <div className="-mt-12 inline-flex rounded-[22px] bg-white p-1.5 shadow-sm"><ProfileAvatar name={user.name} url={preview ?? user.avatarUrl} size={88} /></div>
        <div className="mt-3 flex flex-wrap items-center gap-3"><h2 id="avatar-heading" className="break-words text-xl font-bold tracking-tight sm:text-2xl">{user.name}</h2><span className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">{roleLabels[user.role] ?? user.role}</span></div>
        <p className="mt-2 flex items-start gap-2 text-sm text-slate-500"><Mail size={15} className="mt-0.5 shrink-0" aria-hidden="true" /><span className="break-all">{user.email}</span>{user.emailVerified && <span title="Email đã xác minh" className="mt-0.5 rounded-full bg-emerald-100 p-0.5 text-emerald-700"><Check size={11} aria-label="Email đã xác minh" /></span>}</p>
      </div>
      <div className="pb-1">
        <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 ${busy ? 'pointer-events-none opacity-50' : ''}`}>
          <Camera size={16} aria-hidden="true" />Đổi ảnh đại diện<input aria-label="Chọn ảnh đại diện" type="file" className="sr-only" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={event => {
            const selected = event.target.files?.[0]; event.target.value = '';
            if (!selected) return;
            if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type) || selected.size > 2 * 1024 * 1024) { toast.error('Chọn ảnh JPG, PNG hoặc WebP không quá 2 MB.'); return; }
            clear(); objectUrl.current = URL.createObjectURL(selected); setPreview(objectUrl.current); setFile(selected);
            avatar.reset(); removeAvatar.reset();
          }} />
        </label>
        <p className="mt-2 text-xs text-slate-400">JPG, PNG, WebP · Tối đa 2 MB</p>
      </div>
    </div>
    <div className={`${file || user.avatarUrl ? 'mt-4 ' : ''}flex flex-wrap gap-2`}>
      {file && <><Button disabled={busy} loading={avatar.isPending} onClick={async () => {
        if (lock.current) return; lock.current = true;
        try { await avatar.mutateAsync(file); clear(); toast.success('Đã cập nhật ảnh đại diện'); router.refresh(); }
        catch { /* Keep the preview for retry. */ } finally { lock.current = false; }
      }}>Lưu ảnh</Button><Button variant="outline" disabled={busy} onClick={clear}>Hủy</Button></>}
      {!file && user.avatarUrl && <Button variant="outline" disabled={busy} loading={removeAvatar.isPending} onClick={async () => {
        if (lock.current) return; lock.current = true;
        try { await removeAvatar.mutateAsync(); toast.success('Đã xóa ảnh đại diện'); router.refresh(); }
        catch { /* Show the server error below. */ } finally { lock.current = false; }
      }}>Xóa ảnh</Button>}
    </div>
    {(avatar.error || removeAvatar.error) && <p role="alert" className="mt-3 text-sm text-red-600">{avatar.error?.message || removeAvatar.error?.message}</p>}
    </div>
  </section>;
}
