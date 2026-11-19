"use client";

import { ChevronDown, FileText, ScanText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useContractKeyTerms } from "@/hooks/contracts/use-contracts";
import type { ContractKeyTerms } from "@/types/contracts";
import { clauseLabel } from "@/lib/review/clause-label";

type KeyTerm = ContractKeyTerms["terms"][number];

const numberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 2 });

function formatValue(term: KeyTerm) {
  if (typeof term.value === "boolean") return term.value ? "Có" : "Không";
  if (typeof term.value === "string") return term.value;
  if (term.value === null) return "Chưa xác định";
  const amount = numberFormat.format(term.value);
  if (!term.unit) return amount;
  return term.unit.startsWith("%") ? `${amount}${term.unit}` : `${amount} ${term.unit}`;
}

function sourceOf(term: KeyTerm) {
  if (!term.clause) return null;
  const title = term.clause.title?.trim();
  return title || clauseLabel({ ...term.clause, title });
}

function KeyTermCard({ term, index }: { term: KeyTerm; index: number }) {
  const source = sourceOf(term);
  return (
    <div className="min-w-0 rounded-xl border border-border bg-card p-4 sm:p-5">
      <dt className="flex items-start justify-between gap-3 text-ui-meta font-medium leading-6 text-muted-foreground">
        <span className="min-w-0 break-words">{term.label}</span>
        <span aria-hidden="true" className="shrink-0 text-ui-caption font-normal tabular-nums text-slate-400">
          {String(index + 1).padStart(2, "0")}
        </span>
      </dt>
      <dd className="m-0 mt-2">
        <p className={`m-0 break-words font-semibold leading-7 [overflow-wrap:anywhere] ${term.value === null ? "text-ui text-muted-foreground" : "text-ui-card text-card-foreground"}`}>
          {formatValue(term)}
        </p>
        {term.deferred && (
          <div className="mt-3 space-y-1.5">
            <Badge variant="warning">Theo tài liệu dẫn chiếu</Badge>
            <p className="m-0 text-ui-meta leading-6 text-muted-foreground">
              Được xác định trong tài liệu khác theo dẫn chiếu của hợp đồng.
            </p>
          </div>
        )}
        {(source || term.quote) && (
          <div className="mt-4 border-t border-border pt-3">
            {source && (
              <p className="m-0 flex items-start gap-2 text-ui-meta leading-6 text-muted-foreground">
                <FileText aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-primary" />
                <span className="min-w-0 break-words">{source}</span>
              </p>
            )}
            {term.quote && (
              <details className="group mt-1">
                <summary className="flex w-fit cursor-pointer list-none items-center gap-1.5 rounded py-1 text-ui-meta font-medium text-primary outline-none hover:text-primary-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 [&::-webkit-details-marker]:hidden">
                  Trích dẫn hợp đồng
                  <ChevronDown aria-hidden="true" className="size-3.5 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
                </summary>
                <blockquote className="mb-0 mt-2 whitespace-pre-wrap break-words rounded-r-lg border-l-2 border-primary/30 bg-muted px-3 py-2.5 text-ui-meta leading-6 text-muted-foreground [overflow-wrap:anywhere]">
                  “{term.quote}”
                </blockquote>
              </details>
            )}
          </div>
        )}
      </dd>
    </div>
  );
}

export function KeyTerms({ contractId }: { contractId: string }) {
  const query = useContractKeyTerms(contractId);
  const terms = query.data?.terms ?? [];
  return (
    <section aria-label="Thông tin chính" className="min-w-0">
      <div className="rounded-xl border border-primary/15 bg-muted p-4 sm:p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/15 bg-card text-primary">
            <ScanText aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
              <h3 className="m-0 text-ui-section font-semibold text-card-foreground">Thông tin chính</h3>
              {query.data && <Badge variant="secondary" className="tabular-nums">{terms.length} thông tin</Badge>}
            </div>
            <p className="mb-0 mt-1 text-ui-meta leading-6 text-muted-foreground">
              Các con số và điều kiện quan trọng, kèm nguồn trích từ hợp đồng để đối chiếu.
            </p>
          </div>
        </div>
      </div>
      {query.isPending ? (
        <div role="status" className="mt-4 grid gap-4 md:grid-cols-2">
          <span className="sr-only">Đang tải thông tin chính…</span>
          {[0, 1, 2, 3].map((index) => (
            <div key={index} aria-hidden="true" className="space-y-4 rounded-xl border border-border p-5">
              <div className="h-3 w-2/5 animate-pulse rounded bg-secondary motion-reduce:animate-none" />
              <div className="h-6 w-3/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {query.isError && (
            <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-ui-meta leading-6 text-amber-900">
              <span>{query.data ? "Chưa cập nhật được thông tin. Đang hiển thị dữ liệu lần tải gần nhất." : "Chưa tải được thông tin chính của hợp đồng."}</span>
              <Button size="sm" variant="outline" onClick={() => void query.refetch()}>Thử lại</Button>
            </div>
          )}
          {terms.length > 0 ? (
            <dl className="mb-0 mt-4 grid items-start gap-4 md:grid-cols-2">
              {terms.map((term, index) => <KeyTermCard key={term.key} term={term} index={index} />)}
            </dl>
          ) : !query.isError && (
            <div className="mt-4 rounded-xl border border-dashed border-border bg-muted/50 px-5 py-8 text-center">
              <p className="m-0 text-ui font-medium text-card-foreground">Chưa có thông tin chính để hiển thị</p>
              <p className="mb-0 mt-2 text-ui-meta leading-6 text-muted-foreground">Các thông tin được trích xuất sẽ xuất hiện tại đây sau khi hợp đồng được phân tích.</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
