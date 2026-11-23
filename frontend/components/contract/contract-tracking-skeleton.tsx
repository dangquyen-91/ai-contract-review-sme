function Bar({ className }: { className: string }) {
  return <div className={`animate-pulse rounded bg-muted motion-reduce:animate-none ${className}`} />;
}

export function ContractTrackingSkeleton() {
  return (
    <div role="status" aria-label="Đang tải danh sách hợp đồng" className="space-y-3 lg:space-y-0">
      <span className="sr-only">Đang tải hợp đồng…</span>
      <div aria-hidden="true" className="hidden h-11 items-center gap-5 border-b border-[#e7ebf1] px-5 lg:flex">
        <Bar className="h-3 w-24" />
      </div>
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          aria-hidden="true"
          className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border border-border bg-card p-4 lg:grid-cols-[minmax(14rem,1fr)_8rem_6rem_11rem_13rem_9rem] lg:items-center lg:gap-5 lg:rounded-none lg:border-0 lg:border-b lg:border-[#e7ebf1] lg:px-5 lg:py-4"
        >
          <div className="col-span-2 flex items-start gap-3 lg:col-span-1">
            <Bar className="size-9 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Bar className="h-4 w-3/5" />
              <Bar className="h-3 w-2/5 lg:hidden" />
            </div>
          </div>
          <Bar className="hidden h-3 w-20 lg:block" />
          <Bar className="hidden h-3 w-16 lg:block" />
          {[0, 1].map((fact) => (
            <div key={fact} className="space-y-2 rounded-lg bg-muted/40 p-3 lg:bg-transparent lg:p-0">
              <Bar className="h-3 w-16 lg:hidden" />
              <Bar className="h-5 w-24 rounded-full" />
            </div>
          ))}
          <div className="col-span-2 flex gap-2 lg:col-span-1 lg:justify-end">
            <Bar className="h-9 flex-1 rounded-[10px] lg:w-28 lg:flex-none" />
            <Bar className="size-9 rounded-[10px]" />
          </div>
        </div>
      ))}
    </div>
  );
}
