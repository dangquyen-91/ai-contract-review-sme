import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { DraftEditorPage } from '@/components/contract-drafts/draft-editor-page';
export const metadata = { title: 'Soạn hợp đồng | LawScan' };
export default async function DraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  const { user } = await requireSession();
  return <DraftEditorPage id={id} user={user} />;
}
