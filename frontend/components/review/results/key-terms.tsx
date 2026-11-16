"use client";

import { useContractKeyTerms } from "@/hooks/contracts/use-contracts";
import type { ContractKeyTerms } from "@/types/contracts";

type KeyTerm = ContractKeyTerms["terms"][number];

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

function formatValue(term: KeyTerm) {
  if (typeof term.value === "boolean") return term.value ? "Có" : "Không";
  if (term.value === null) return "Chưa xác định";
  const amount = numberFormat.format(term.value);
  if (!term.unit) return amount;
  return term.unit.startsWith("%") ? `${amount}${term.unit}` : `${amount} ${term.unit}`;
}

function sourceOf(term: KeyTerm) {
  if (!term.clause) return null;
  const title = term.clause.title?.trim();
  return `Điều khoản ${term.clause.index + 1}${title ? ` · ${title}` : ""}`;
}

function KeyTermRow({ term }: { term: KeyTerm }) {
  const source = sourceOf(term);
  return (
    <div className="grid grid-cols-[minmax(140px,0.6fr)_1fr] gap-3 border-t border-[#edf0f4] pt-2.5 [@media_(max-width:_580px)]:grid-cols-1 [@media_(max-width:_580px)]:gap-1">
      <dt className="font-semibold text-[#2f3f57]">{term.label}</dt>
      <dd className="m-0 space-y-1">
        <p className="m-0 font-semibold text-[#1f2d44]">{formatValue(term)}</p>
        {source && <p className="m-0 text-ui-meta text-[#718098]">{source}</p>}
        {term.quote && (
          <p className="m-0 border-l-2 border-[#d9e1ec] pl-2 text-ui-meta italic leading-5 text-[#718098] [overflow-wrap:anywhere]">
            “{term.quote}”
          </p>
        )}
        {term.inferredFromSilence && (
          <p className="m-0 text-ui-meta text-[#718098]">Suy ra do hợp đồng không đề cập</p>
        )}
      </dd>
    </div>
  );
}

export function KeyTerms({ contractId }: { contractId: string }) {
  const { data } = useContractKeyTerms(contractId);
  if (!data?.terms.length) return null;
  return (
    <section className="border-t border-[#e4e8ef] bg-[#fbfcff] px-[22px] py-5">
      <h3 className="m-0 text-ui-section">Thông tin chính</h3>
      <p className="mb-0 mt-1 text-ui-meta text-[#718098]">
        Các con số và điều kiện quan trọng AI trích từ hợp đồng, kèm câu gốc để bạn đối chiếu.
      </p>
      <dl className="mt-3 grid gap-2.5 text-ui text-[#46566e]">
        {data.terms.map((term) => (
          <KeyTermRow key={term.key} term={term} />
        ))}
      </dl>
    </section>
  );
}
