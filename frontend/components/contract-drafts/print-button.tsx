"use client";
export function PrintContractButton() {
  return <button type="button" className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white print:hidden" onClick={() => window.print()}>In / lưu thành PDF</button>;
}
