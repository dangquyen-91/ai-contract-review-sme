import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { AccountProvider } from '@/providers/account-provider';
import { SessionKeeper } from '@/components/auth/session-keeper';
import { ProfilePage } from '@/components/profile/profile-page';

export const metadata: Metadata = { title: 'Hồ sơ cá nhân | LawScan', robots: { index: false, follow: false } };
export default async function AccountPage() {
  const user = (await getSession())?.user;
  if (!user) redirect('/dang-nhap?returnTo=%2Fho-so');
  return <AccountProvider><SessionKeeper /><ProfilePage initialUser={user} /></AccountProvider>;
}
