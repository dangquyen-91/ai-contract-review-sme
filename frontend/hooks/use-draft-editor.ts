"use client";
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { contractDraftsApi } from '@/lib/api/contract-drafts';
import { useSaveDraftCache } from './use-contract-drafts';
import type { ContractDraft, DraftChanges } from '@/types/contract-drafts';

const editable = (draft: ContractDraft): DraftChanges => ({ title: draft.title, ourParty: draft.ourParty, input: draft.input, content: draft.content });
export type DraftEditorState = ReturnType<typeof useDraftEditor>;
export function useDraftEditor(initial: ContractDraft) {
  const router = useRouter();
  const client = useQueryClient();
  const cache = useSaveDraftCache();
  const [draft, setDraft] = useState(initial);
  const [values, setValues] = useState<DraftChanges>(() => editable(initial));
  const [saved, setSaved] = useState(() => JSON.stringify(editable(initial)));
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const dirty = JSON.stringify(values) !== saved;
  const accept = useCallback((next: ContractDraft, signature?: string) => {
    setDraft(next); setSaved(JSON.stringify(editable(next))); cache(next);
    setValues(current => !signature || JSON.stringify(current) === signature ? editable(next) : current);
  }, [cache]);
  async function persist() {
    if (!dirty) return draft;
    const next = await contractDraftsApi.save(draft.id, draft.revision, values);
    accept(next, JSON.stringify(values));
    return next;
  }
  const save = useCallback(async (mode: 'manual' | 'auto' = 'manual') => {
    if (lock.current || draft.status !== 'draft') return;
    if (!dirty) {
      if (mode === 'manual') toast.info('Các thay đổi đã được lưu.');
      return;
    }
    lock.current = true; setBusy('save'); setError('');
    try {
      const next = await contractDraftsApi.save(draft.id, draft.revision, values);
      accept(next, JSON.stringify(values));
      if (mode === 'manual') toast.success('Đã lưu thay đổi', { description: next.content ? 'Nội dung bản nháp đã được cập nhật.' : 'Thông tin đã được lưu. Chọn Tạo bản nháp bằng AI để soạn nội dung hợp đồng.' });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Chưa lưu được bản nháp.';
      setError(message);
      if (mode === 'manual') toast.error('Chưa lưu được thay đổi', { description: message });
    }
    finally { lock.current = false; setBusy(''); }
  }, [accept, dirty, draft.id, draft.revision, draft.status, values]);
  useEffect(() => {
    if (!dirty || busy || error || draft.status !== 'draft') return;
    const timer = setTimeout(() => void save('auto'), 1500);
    return () => clearTimeout(timer);
  }, [dirty, busy, error, draft.status, save]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty || busy) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, busy]);

  function change(update: Partial<DraftChanges>) { setValues(current => ({ ...current, ...update })); setError(''); }
  async function run(action: 'generate' | 'submit' | 'approve' | 'return' | 'publish' | 'download' | 'upgrade', note = '') {
    if (lock.current) return false;
    lock.current = true; setBusy(action); setError('');
    try {
      const current = await persist();
      if (action === 'upgrade') {
        const next = await contractDraftsApi.copyLatest(current.id, current.revision);
        cache(next); router.push(`/contract-drafts/${next.id}`);
        toast.success('Đã sao chép dữ liệu sang mẫu mới. Kiểm tra các trường bổ sung trước khi tạo nội dung.');
      } else if (action === 'generate') { accept(await contractDraftsApi.generate(current.id, current.revision)); toast.success('Đã tạo bản nháp. Hãy kiểm tra nội dung trước khi duyệt.'); }
      else if (action === 'download') await contractDraftsApi.download(current.id);
      else if (action === 'publish') {
        const result = await contractDraftsApi.publish(current.id, current.revision);
        await client.invalidateQueries({ queryKey: ['dashboard'] });
        await client.invalidateQueries({ queryKey: ['contracts'] });
        router.push(`/contract/${result.contractId}`);
      } else { accept(await contractDraftsApi.decide(current.id, current.revision, action, note)); toast.success(action === 'approve' ? 'Đã duyệt hợp đồng' : action === 'return' ? 'Đã yêu cầu chỉnh sửa' : 'Đã gửi Owner duyệt'); }
      return true;
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa thể hoàn tất thao tác.'); return false; }
    finally {
      if (action === 'generate') void client.invalidateQueries({ queryKey: ['org-subscription'] });
      lock.current = false; setBusy('');
    }
  }
  async function reload() {
    if (lock.current || (dirty && !window.confirm('Bỏ thay đổi chưa lưu và tải lại bản nháp?'))) return;
    lock.current = true; setBusy('reload');
    try { accept(await contractDraftsApi.get(draft.id)); setError(''); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Chưa tải lại được bản nháp.'); }
    finally { lock.current = false; setBusy(''); }
  }
  return { draft, values, busy, error, dirty, change, save, run, reload };
}
