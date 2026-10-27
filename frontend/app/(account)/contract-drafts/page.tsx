import { requireSession } from '@/lib/auth/session';
import { DraftWorkspace } from '@/components/contract-drafts/draft-workspace';
export const metadata = { title: 'Tạo hợp đồng từ mẫu | LawScan' };
export default async function DraftPage() {
  const { user } = await requireSession();
  return <DraftWorkspace user={user} />;
}
