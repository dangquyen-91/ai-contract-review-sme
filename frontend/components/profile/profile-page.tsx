"use client";

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, LockKeyhole, ShieldCheck, UserRound } from 'lucide-react';
import { DashboardShell } from '@/components/layouts/dashboard/dashboard-shell';
import { ReceivedInvitations } from '@/components/invitations/received-invitations';
import { Button } from '@/components/ui/button';
import { useProfile } from '@/hooks/profile/use-profile';
import { roleLabels } from '@/config/dashboard-roles';
import { workspacePath } from '@/lib/workspace-path';
import type { AuthUser } from '@/types/auth';
import { ProfileInformationForm } from './profile-information-form';
import { ProfileAvatarEditor } from './profile-avatar-editor';
import { ProfileAccountDetails } from './profile-account-details';
import { ProfileOrganizationCard } from './profile-organization-card';
import { ProfilePasswordForm } from './profile-password-form';

export function ProfilePage({ initialUser }: { initialUser: AuthUser }) {
  const query = useProfile();
  const profile = query.data;
  const user = profile?.user ?? initialUser;
  const [section, setSection] = useState<'information' | 'security'>('information');
  return <DashboardShell role={user.role} activeKey="profile" sectionLabel="Hồ sơ cá nhân" workspaceName={profile?.organization?.name ?? 'Tài khoản cá nhân'} workspaceLabel="Không gian làm việc" name={user.name} roleLabel={roleLabels[user.role] ?? user.role} homeHref={workspacePath(user)}>
    <div className="mx-auto max-w-[1120px]">
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4">
      <div><h1 className="text-2xl font-bold tracking-tight sm:text-[28px]">Hồ sơ cá nhân</h1><p className="mt-2 text-sm leading-6 text-slate-500">Một nơi để quản lý thông tin và bảo vệ tài khoản của bạn.</p></div>
      <Link href={workspacePath(user)} className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-blue-600"><ArrowLeft size={16} aria-hidden="true" />Về dashboard</Link>
    </header>
    {query.isLoading ? <div role="status" className="rounded-2xl border bg-white p-8 text-sm text-slate-500">Đang tải hồ sơ…</div> : query.error || !profile ? <div role="alert" className="rounded-2xl border bg-white p-6"><p className="text-sm text-red-600">{query.error?.message ?? 'Không thể tải hồ sơ.'}</p><Button variant="outline" className="mt-4" onClick={() => void query.refetch()}>Thử lại</Button></div> : <>
      <ProfileAvatarEditor user={profile.user} />
      <nav aria-label="Cài đặt hồ sơ" className="mb-7 mt-5 flex gap-6 border-b border-slate-200 sm:gap-8">
        {([{ id: 'information', label: 'Thông tin cá nhân', icon: UserRound }, { id: 'security', label: 'Bảo mật', icon: LockKeyhole }] as const).map(item => <button key={item.id} type="button" id={`profile-section-${item.id}`} aria-pressed={section === item.id} aria-controls="profile-section-content" onClick={() => setSection(item.id)} className={`relative -mb-px inline-flex items-center gap-2 border-b-2 py-4 text-sm font-semibold transition-colors ${section === item.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}><item.icon size={17} aria-hidden="true" />{item.label}</button>)}
      </nav>
      <div id="profile-section-content" className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div hidden={section !== 'information'}><ProfileInformationForm key={`${profile.user.name}:${profile.user.phone}`} user={profile.user} /></div>
        <div hidden={section !== 'security'}><ProfilePasswordForm user={profile.user} /></div>
        <aside className="grid gap-5" aria-label="Tổng quan tài khoản">
          {section === 'information' ? <><ProfileAccountDetails user={profile.user} /><ProfileOrganizationCard profile={profile} /></> : <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-6"><span className="inline-flex rounded-xl bg-white p-3 text-blue-600"><ShieldCheck size={24} aria-hidden="true" /></span><h2 className="mt-4 font-semibold text-slate-900">Giữ tài khoản an toàn</h2><p className="mt-2 text-sm leading-6 text-slate-600">Dùng mật khẩu riêng cho LawScan, kết hợp chữ hoa, chữ thường, số và ký tự đặc biệt.</p><p className="mt-3 text-sm leading-6 text-slate-600">Không chia sẻ mật khẩu hoặc mã xác minh với bất kỳ ai.</p></div>}
        </aside>
      </div>
      {user.role !== 'user' && <div className="mt-7"><ReceivedInvitations /></div>}
    </>}
    </div>
  </DashboardShell>;
}
