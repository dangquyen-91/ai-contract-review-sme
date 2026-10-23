import Link from 'next/link';
import { ArrowUpRight, Building2 } from 'lucide-react';
import { roleLabels } from '@/config/dashboard-roles';
import type { Profile } from '@/types/profile';

export function ProfileOrganizationCard({ profile }: { profile: Profile }) {
  const organization = profile.organization;
  const joined = organization && !organization.isPersonal;
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="profile-organization-heading"><div className="flex items-center gap-2.5"><span className="rounded-lg bg-blue-50 p-2 text-blue-600"><Building2 size={17} aria-hidden="true" /></span><h2 id="profile-organization-heading" className="text-sm font-semibold">Không gian làm việc</h2></div>
    {joined ? <><p className="mt-4 font-semibold text-slate-800">{organization.name}</p><p className="mt-1.5 text-xs text-slate-500">{roleLabels[profile.user.role] ?? profile.user.role}</p><span className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-700"><span className="size-1.5 rounded-full bg-emerald-500" />Đang hoạt động</span></> : <><p className="mt-4 text-sm leading-6 text-slate-500">Bạn đang sử dụng tài khoản cá nhân. Tham gia tổ chức để làm việc cùng đồng đội.</p>{profile.user.role === 'user' && <Link href="/chon-to-chuc" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:underline">Tạo tổ chức của bạn<ArrowUpRight size={15} aria-hidden="true" /></Link>}</>}
  </section>;
}
