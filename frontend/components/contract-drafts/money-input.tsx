"use client";
import { useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { formatMoneyInput, parseMoneyInput } from '@/lib/money-input';

export function MoneyInput({ id, value, disabled, ariaLabel, onValueChange }: {
  id: string;
  value: string;
  disabled?: boolean;
  ariaLabel?: string;
  onValueChange: (value: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [decimalPending, setDecimalPending] = useState(false);
  const display = formatMoneyInput(value) + (decimalPending && value && !value.includes('.') ? ',' : '');

  function update(text: string, caret: number) {
    const canonical = parseMoneyInput(text);
    if (canonical === null) return;
    const pending = text.endsWith(',');
    setDecimalPending(pending);
    onValueChange(canonical);
    const logicalPosition = text.slice(0, caret).replace(/[.\s]/g, '').length;
    const formatted = formatMoneyInput(canonical) + (pending && canonical && !canonical.includes('.') ? ',' : '');
    let position = 0, characters = 0;
    while (position < formatted.length && characters < logicalPosition) {
      if (formatted[position] !== '.') characters++;
      position++;
    }
    requestAnimationFrame(() => {
      if (input.current && document.activeElement === input.current) input.current.setSelectionRange(position, position);
    });
  }

  return <Input id={id} aria-label={ariaLabel} ref={input} type="text" inputMode="decimal" autoComplete="off" placeholder="Ví dụ: 10.000.000" maxLength={26} disabled={disabled} value={display}
    onChange={event => update(event.target.value, event.target.selectionStart ?? event.target.value.length)}
    onBlur={() => setDecimalPending(false)}
    onKeyDown={event => {
      const element = event.currentTarget;
      const position = element.selectionStart ?? 0;
      if (position !== element.selectionEnd) return;
      if (event.key === 'Backspace' && position > 1 && element.value[position - 1] === '.') {
        event.preventDefault();
        update(element.value.slice(0, position - 2) + element.value.slice(position - 1), position - 2);
      } else if (event.key === 'Delete' && element.value[position] === '.') {
        event.preventDefault();
        update(element.value.slice(0, position + 1) + element.value.slice(position + 2), position);
      }
    }} />;
}
