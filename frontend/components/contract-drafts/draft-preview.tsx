"use client";
import { useState } from 'react';
import { Eye, PencilLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContractDocument } from './contract-document';

export function DraftPreview({ content, canEdit, onChange }: { content: string; canEdit: boolean; onChange: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  return <div><div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Nội dung hợp đồng</h2><p className="mt-1 text-xs text-slate-500">Kiểm tra thông tin, số tiền và điều khoản trước khi gửi duyệt.</p></div>{canEdit && content && <Button size="sm" variant="outline" onClick={() => setEditing(!editing)}>{editing ? <Eye size={15} /> : <PencilLine size={15} />}{editing ? 'Xem trước' : 'Chỉnh nội dung'}</Button>}</div>
    {content && !editing && <p className="mb-3 text-xs text-slate-400 sm:hidden">Vuốt ngang trong trang hợp đồng để xem đầy đủ bố cục.</p>}
    {!content ? <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-16 text-center text-sm leading-6 text-slate-500">Điền thông tin ở hai bước trước, sau đó chọn<br /><strong className="text-blue-600">Tạo bản nháp bằng AI</strong>.</div> : editing && canEdit ? <textarea aria-label="Chỉnh sửa nội dung hợp đồng" className="min-h-[650px] w-full resize-y rounded-xl border border-slate-200 bg-white p-5 text-sm leading-7 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100" value={content} maxLength={80000} onChange={event => onChange(event.target.value)} /> : <article aria-label="Xem trước hợp đồng" className="max-h-[750px] overflow-auto rounded-xl border border-slate-200 bg-white p-5 font-serif text-sm leading-7 text-slate-800 sm:p-10"><div className="min-w-[560px]"><ContractDocument content={content} /></div></article>}
  </div>;
}
