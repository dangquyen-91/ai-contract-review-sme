"use client";
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { centsToMoney, emptyLineItem, lineItemAmount, readLineItems, totalLineItems, type DraftLineItem } from '@/lib/draft-line-items';
import { formatMoneyInput } from '@/lib/money-input';
import { MoneyInput } from './money-input';

export function LineItemsInput({ value, disabled, compact = false, onChange }: { value: string; disabled: boolean; compact?: boolean; onChange: (value: string, total: string) => void }) {
  const rows = readLineItems(value);
  const commit = (next: DraftLineItem[]) => onChange(JSON.stringify(next), totalLineItems(next));
  const update = (index: number, changes: Partial<DraftLineItem>) => commit(rows.map((row, position) => position === index ? { ...row, ...changes } : row));
  const total = totalLineItems(rows);
  return <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
    <div className="overflow-x-auto"><table className={`w-full ${compact ? 'min-w-[560px]' : 'min-w-[680px]'} table-fixed text-left text-xs`}><thead className="bg-slate-50 text-slate-500"><tr><th className="w-[30%] p-3">Tên hàng hóa / dịch vụ</th><th className="w-[12%] p-3">Đơn vị</th><th className="w-[12%] p-3">Số lượng</th><th className="w-[22%] p-3">Đơn giá (VND)</th><th className="w-[18%] p-3 text-right">Thành tiền</th><th className="w-[6%]"><span className="sr-only">Thao tác</span></th></tr></thead><tbody>{rows.map((row, index) => {
      const amount = lineItemAmount(row);
      return <tr key={index} className="border-t border-slate-100"><td className="p-2"><Input id={`draft-item-${index}-name`} aria-label={`Tên hạng mục ${index + 1}`} disabled={disabled} maxLength={160} value={row.name} onChange={event => update(index, { name: event.target.value })} placeholder="Tên, mã hoặc quy cách" /></td><td className="p-2"><Input id={`draft-item-${index}-unit`} aria-label={`Đơn vị tính ${index + 1}`} disabled={disabled} maxLength={30} value={row.unit} onChange={event => update(index, { unit: event.target.value })} placeholder="Cái / gói" /></td><td className="p-2"><Input id={`draft-item-${index}-quantity`} aria-label={`Số lượng ${index + 1}`} disabled={disabled} inputMode="decimal" value={row.quantity.replace('.', ',')} onChange={event => { const value = event.target.value.replace(',', '.'); if (/^\d*(\.\d{0,3})?$/.test(value)) update(index, { quantity: value }); }} /></td><td className="p-2"><MoneyInput id={`draft-item-${index}-price`} ariaLabel={`Đơn giá ${index + 1}`} disabled={disabled} value={row.unitPrice} onValueChange={unitPrice => update(index, { unitPrice })} /></td><td className="p-3 text-right font-medium tabular-nums">{amount === null ? '—' : formatMoneyInput(centsToMoney(amount))}</td><td className="pr-2"><Button variant="ghost" size="icon-sm" aria-label={`Xóa hạng mục ${index + 1}`} disabled={disabled} onClick={() => commit(rows.filter((_, position) => position !== index))}><Trash2 size={14} /></Button></td></tr>;
    })}</tbody></table></div>
    {!rows.length && <p className="px-4 py-6 text-center text-xs text-slate-400">Chưa có hạng mục. Thêm dòng để nhập tên, số lượng và đơn giá.</p>}
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 p-3"><Button variant="outline" size="sm" disabled={disabled || rows.length >= 20} onClick={() => commit([...rows, emptyLineItem()])}><Plus size={14} />Thêm hạng mục</Button><span className="text-xs text-slate-500">Trước thuế: <strong className="ml-2 text-sm text-slate-900">{total ? `${formatMoneyInput(total)} VND` : '—'}</strong></span></div>
  </div>;
}
