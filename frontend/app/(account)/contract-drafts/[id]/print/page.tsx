import { notFound } from 'next/navigation';
import { requireSession } from '@/lib/auth/session';
import { PrintContractButton } from '@/components/contract-drafts/print-button';
import { StudioDocumentView } from '@/components/template-studio/studio-document-view';
import type { StudioDocument } from '@/types/template-studio';
import type { ContractTemplate } from '@/types/contract-drafts';
import { ContractDocument } from '@/components/contract-drafts/contract-document';
import styles from '@/styles/contract-print.module.css';

export default async function PrintDraftPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f\d]{24}$/i.test(id)) notFound();
  const session = await requireSession();
  const response = await fetch(`${process.env.API_BASE_URL ?? 'http://localhost:4000'}/api/v1/contract-drafts/${id}/export?format=print`, { headers: { Authorization: `Bearer ${session.accessToken}` }, cache: 'no-store' });
  if (response.status === 403 || response.status === 404 || response.status === 409) notFound();
  if (!response.ok) throw new Error('Chưa thể tải hợp đồng để in. Vui lòng thử lại.');
  const { data } = await response.json() as { data: { title: string; content: string; document?: StudioDocument | null; template: ContractTemplate } };
  return <main className="mx-auto w-full max-w-[850px] p-6 print:max-w-none print:p-0"><div className="mb-8 flex flex-wrap items-center justify-between gap-4 print:hidden"><h1 className="text-lg font-semibold">{data.title}</h1><PrintContractButton /></div><article className={`${styles.document} font-[Times_New_Roman,serif] text-[13pt] leading-relaxed`}><>{data.document ? <StudioDocumentView document={data.document} template={data.template} /> : <ContractDocument content={data.content} />}</></article></main>;
}
