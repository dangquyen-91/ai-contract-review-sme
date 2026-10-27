import { notFound, redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { AccountProvider } from '@/providers/account-provider';
import { SessionKeeper } from '@/components/auth/session-keeper';

export default async function DraftLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect('/dang-nhap');
  if (!session.user.orgId || !['owner', 'staff'].includes(session.user.role)) notFound();
  return <AccountProvider><SessionKeeper />{children}</AccountProvider>;
}
