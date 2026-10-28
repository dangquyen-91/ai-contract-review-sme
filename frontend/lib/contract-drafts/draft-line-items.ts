export type DraftLineItem = { name: string; unit: string; quantity: string; unitPrice: string };
export const emptyLineItem = (): DraftLineItem => ({ name: '', unit: '', quantity: '', unitPrice: '' });
export function readLineItems(value: string): DraftLineItem[] {
  try {
    const rows = JSON.parse(value || '[]');
    return Array.isArray(rows) ? rows.filter(row => row && ['name', 'unit', 'quantity', 'unitPrice'].every(key => typeof row[key] === 'string')).slice(0, 20) : [];
  } catch { return []; }
}
export function lineItemAmount(item: DraftLineItem): bigint | null {
  if (!/^\d+(\.\d{1,3})?$/.test(item.quantity) || !/^\d+(\.\d{1,2})?$/.test(item.unitPrice) || Number(item.quantity) <= 0 || Number(item.quantity) > 1000000 || Number(item.unitPrice) <= 0 || Number(item.unitPrice) > 1e12) return null;
  const scaled = (value: string, decimals: number) => { const [whole, fraction = ''] = value.split('.'); return BigInt(whole) * BigInt(10 ** decimals) + BigInt(fraction.padEnd(decimals, '0')); };
  return (scaled(item.quantity, 3) * scaled(item.unitPrice, 2) + BigInt(500)) / BigInt(1000);
}
export function centsToMoney(value: bigint) {
  const fraction = (value % BigInt(100)).toString().padStart(2, '0');
  return `${value / BigInt(100)}${fraction === '00' ? '' : `.${fraction}`}`;
}
export function totalLineItems(items: DraftLineItem[]) {
  if (!items.length) return '';
  let total = BigInt(0);
  for (const item of items) { const amount = lineItemAmount(item); if (amount === null || !item.name.trim() || !item.unit.trim()) return ''; total += amount; }
  return centsToMoney(total);
}
