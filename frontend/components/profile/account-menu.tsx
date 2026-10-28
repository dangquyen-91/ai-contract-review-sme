"use client";

import Link from 'next/link';
import { DropdownMenu } from 'radix-ui';
import { useProfile } from '@/hooks/profile/use-profile';
import { ProfileAvatar } from './profile-avatar';
import { Icon } from '@/components/ui/icon';

export function AccountMenu({ fallbackName, onLogout, loggingOut }: { fallbackName: string; onLogout: () => void; loggingOut: boolean }) {
  const { data } = useProfile();
  const name = data?.user.name ?? fallbackName;
  return <DropdownMenu.Root>
    <DropdownMenu.Trigger asChild><button type="button" aria-label="Mở menu tài khoản" className="rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"><ProfileAvatar name={name} url={data?.user.avatarUrl} size={36} /></button></DropdownMenu.Trigger>
    <DropdownMenu.Portal><DropdownMenu.Content align="end" sideOffset={10} className="z-[80] min-w-60 rounded-xl border border-slate-200 bg-white p-2 text-sm text-slate-700 shadow-xl">
      <DropdownMenu.Label className="max-w-64 truncate px-3 py-2 font-semibold">{name}</DropdownMenu.Label>
      <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
      <DropdownMenu.Item asChild><Link href="/ho-so" className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 outline-none focus:bg-blue-50"><Icon name="user" className="h-4 w-4" />Hồ sơ cá nhân</Link></DropdownMenu.Item>
      <DropdownMenu.Item disabled={loggingOut} onSelect={onLogout} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-red-600 outline-none focus:bg-red-50 data-[disabled]:opacity-50"><Icon name="arrow" className="h-4 w-4 rotate-180" />{loggingOut ? 'Đang đăng xuất…' : 'Đăng xuất'}</DropdownMenu.Item>
    </DropdownMenu.Content></DropdownMenu.Portal>
  </DropdownMenu.Root>;
}
export function AccountSummary({ fallbackName, roleLabel }: { fallbackName: string; roleLabel: string }) {
  const { data } = useProfile();
  const name = data?.user.name ?? fallbackName;
  return <Link href="/ho-so" className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-500" aria-label="Mở hồ sơ cá nhân">
    <ProfileAvatar name={name} url={data?.user.avatarUrl} size={36} /><span className="min-w-0"><strong className="block truncate text-xs">{name}</strong><small className="block truncate text-[10px] text-slate-500">{roleLabel}</small></span>
  </Link>;
}
