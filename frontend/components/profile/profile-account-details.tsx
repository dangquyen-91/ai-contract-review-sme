import { roleLabels } from '@/config/dashboard-roles';
import { BadgeCheck } from 'lucide-react';
import type { Profile } from '@/types/profile';

export function ProfileAccountDetails({ user }: { user: Profile['user'] }) {
  const method = user.googleLinked ? user.hasPassword === true ? 'Google & mật khẩu' : 'Google' : 'Email & mật khẩu';
  const fields = [
    ['Vai trò', roleLabels[user.role] ?? user.role], ['Phương thức đăng nhập', method],
    ['Ngày tạo tài khoản', new Date(user.createdAt).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })],
  ];
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6" aria-labelledby="account-details-heading"><h2 id="account-details-heading" className="text-sm font-semibold">Tổng quan tài khoản</h2>
    <div className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium ${user.emailVerified ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}><BadgeCheck size={16} aria-hidden="true" />{user.emailVerified ? 'Email đã được xác minh' : 'Email chưa được xác minh'}</div>
    <dl className="mt-2 divide-y divide-slate-100">{fields.map(([label, value]) => <div className="flex flex-wrap justify-between gap-x-3 gap-y-1 py-3.5" key={label}><dt className="text-xs leading-5 text-slate-500">{label}</dt><dd className="break-words text-xs font-medium leading-5 text-slate-800">{value}</dd></div>)}</dl>
  </section>;
}
