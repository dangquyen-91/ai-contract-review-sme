"use client";

import { useContractKeyTerms } from "@/hooks/contracts/use-contracts";

export function KeyTerms({ contractId }: { contractId: string }) {
  const { data } = useContractKeyTerms(contractId);
  if (!data?.terms.length) return null;
  return <section className="border-t border-[#e4e8ef] bg-[#fbfcff] px-[22px] py-5">
    <h3 className="m-0 text-ui-section">Thông tin chính</h3>
    <dl className="mt-3 grid gap-2 text-ui text-[#46566e]">
      {data.terms.map((term) => <div key={term.key} className="grid grid-cols-[minmax(120px,0.6fr)_1fr] gap-3 border-t border-[#edf0f4] pt-2">
        <dt className="font-semibold">{term.label}</dt>
        <dd className="m-0">{typeof term.value === "boolean" ? term.value ? "Có" : "Không" : term.value ?? "Chưa xác định"}{term.clause && <span className="ml-2 text-[#718098]">Điều khoản {term.clause.index + 1}</span>}{term.inferredFromSilence && <span className="ml-2 text-[#718098]">Suy ra do hợp đồng không đề cập</span>}</dd>
      </div>)}
    </dl>
  </section>;
}
