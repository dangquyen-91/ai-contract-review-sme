// Keep the API value in canonical decimal notation; group only the displayed value.
export function formatMoneyInput(value: string) {
  if (!value) return '';
  const [whole, fraction] = value.split('.');
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction !== undefined && fraction !== '' ? `,${fraction}` : '');
}

export function parseMoneyInput(display: string): string | null {
  const value = display.replace(/[.\s]/g, '');
  if (!/^\d*(?:,\d{0,2})?$/.test(value)) return null;
  if (!value) return '';
  const [digits, fraction] = value.split(',');
  const whole = (digits || '0').replace(/^0+(?=\d)/, '');
  return whole + (fraction ? `.${fraction}` : '');
}
