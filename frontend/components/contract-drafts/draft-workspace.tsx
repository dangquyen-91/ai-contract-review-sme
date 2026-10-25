"use client";
import Link from 'next/link';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, BriefcaseBusiness, FilePlus2, FileText, Handshake, Package, Sparkles } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { contractDraftsApi } from '@/lib/api/contract-drafts';
import { draftKeys, useDraftCatalog, useDraftList } from '@/hooks/use-contract-drafts';
import type { AuthUser } from '@/types/auth';
import type { ContractTemplate } from '@/types/contract-drafts';
import { DraftShell } from './draft-shell';
import { DraftStatusBadge } from './draft-status';

const icons = { labor: BriefcaseBusiness, service: Handshake, sales: Package };
export function DraftWorkspace({ user }: { user: AuthUser }) {
  const router = useRouter();
  const client = useQueryClient();
  const catalog = useDraftCatalog();
  const [page, setPage] = useState(1);
  const drafts = useDraftList(page);
  const create = useMutation({ mutationFn: contractDraftsApi.create });
  const lock = useRef(false);
  async function start(template: ContractTemplate) {
    if (lock.current) return; lock.current = true;
    try {
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
      const draft = await create.mutateAsync({ templateCode: template.code, title: `${template.name} - ${new Date().toLocaleDateString('vi-VN')}`, ourParty: template.parties[0].code, input: { signingDate: today, startDate: today, ...(template.code === 'labor' ? { termType: 'fixed' } : {}) } });
      client.setQueryData(draftKeys.detail(draft.id), draft);
      await client.invalidateQueries({ queryKey: ['contract-drafts', 'list'] });
      router.push(`/contract-drafts/${draft.id}`);
    } catch { lock.current = false; }
  }
  return <DraftShell user={user} organizationName={catalog.data?.organization.name} blockNavigation={create.isPending}>
    <header className="mb-7 flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-blue-600">Soạn thảo cho doanh nghiệp</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Từ mẫu có sẵn đến hợp đồng của bạn</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">Chọn khung hợp đồng, bổ sung thông tin và để AI hỗ trợ soạn bản nháp. Owner kiểm tra, duyệt trước khi xuất hoặc rà soát.</p></div><Link className="text-sm font-medium text-blue-600" href="/contract">Hợp đồng đã lưu →</Link></header>
    <div className="mb-8 flex flex-wrap gap-x-8 gap-y-3 rounded-xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-sm text-blue-800">{['Chọn mẫu & điền thông tin', 'AI soạn bản nháp', 'Owner duyệt & xuất'].map((label, index) => <span key={label} className="inline-flex items-center gap-2"><span className="grid size-6 place-items-center rounded-full bg-white text-xs font-bold">{index + 1}</span>{label}</span>)}</div>
    <h2 className="mb-4 text-lg font-semibold">Bắt đầu với một mẫu</h2>
    {catalog.isLoading ? <p role="status" className="py-8 text-sm text-slate-500">Đang tải mẫu hợp đồng…</p> : catalog.error ? <div role="alert"><p>{catalog.error.message}</p><Button className="mt-3" variant="outline" onClick={() => void catalog.refetch()}>Thử lại</Button></div> : <div className="grid gap-5 md:grid-cols-3">{catalog.data?.templates.map(template => {
      const Icon = icons[template.code];
      return <article key={template.code} className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 transition-shadow hover:border-blue-200 hover:shadow-md"><div className="flex items-center justify-between"><span className="rounded-xl bg-blue-50 p-3 text-blue-600"><Icon size={24} aria-hidden="true" /></span><span className="text-xs text-slate-400">Mẫu v{template.version}</span></div><h3 className="mt-5 text-lg font-semibold">{template.name}</h3><p className="mb-6 mt-2 flex-1 text-sm leading-6 text-slate-500">{template.description}</p><Button className="w-full" variant="outline" disabled={create.isPending} onClick={() => void start(template)}><FilePlus2 size={16} aria-hidden="true" />Bắt đầu soạn<ArrowRight size={15} aria-hidden="true" /></Button></article>;
    })}</div>}
    {create.error && <p role="alert" className="mt-4 text-sm text-red-600">{create.error.message}</p>}
    <section className="mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-5"><div><h2 className="font-semibold">{user.role === 'owner' ? 'Bản nháp trong tổ chức' : 'Bản nháp của bạn'}</h2><p className="mt-1 text-xs text-slate-500">{drafts.data?.total ?? 0} bản nháp · tự cập nhật mỗi phút</p></div><Button size="sm" variant="ghost" onClick={() => void drafts.refetch()}>Làm mới</Button></header>
      {drafts.isLoading ? <p role="status" className="p-8 text-sm text-slate-500">Đang tải bản nháp…</p> : drafts.error ? <p role="alert" className="p-8 text-sm text-red-600">{drafts.error.message}</p> : !drafts.data?.items.length ? <div className="px-6 py-12 text-center"><FileText className="mx-auto mb-3 text-slate-300" size={32} /><h3 className="font-medium">Chưa có bản nháp</h3><p className="mt-2 text-sm text-slate-500">Chọn một mẫu phía trên để tạo hợp đồng đầu tiên.</p></div> : <ul className="divide-y divide-slate-100">{drafts.data.items.map(draft => <li key={draft.id}><Link href={`/contract-drafts/${draft.id}`} className="flex flex-wrap items-center justify-between gap-3 px-6 py-5 transition-colors hover:bg-slate-50"><div className="min-w-0"><p className="break-words text-sm font-semibold">{draft.title}</p><p className="mt-1.5 text-xs text-slate-500">{catalog.data?.templates.find(template => template.code === draft.templateCode)?.name} · {draft.createdBy === user.id ? 'Bạn tạo' : 'Thành viên tạo'} · {new Date(draft.updatedAt).toLocaleString('vi-VN')}</p></div><div className="flex items-center gap-4"><DraftStatusBadge status={draft.status} /><ArrowRight size={16} className="text-slate-400" aria-hidden="true" /></div></Link></li>)}</ul>}
      {drafts.data && drafts.data.pages > 1 && <footer className="flex items-center justify-between border-t border-slate-100 px-6 py-4 text-sm"><span>Trang {page}/{drafts.data.pages}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Trước</Button><Button size="sm" variant="outline" disabled={page >= drafts.data.pages} onClick={() => setPage(page + 1)}>Sau</Button></div></footer>}
    </section><p className="mt-5 flex items-start gap-2 text-xs leading-5 text-slate-400"><Sparkles size={14} className="mt-0.5 shrink-0" aria-hidden="true" />Các khung là tài liệu tham khảo cho giao dịch thông thường tại Việt Nam. Nội dung AI cần được người có trách nhiệm kiểm tra trước khi sử dụng.</p>
  </DraftShell>;
}
