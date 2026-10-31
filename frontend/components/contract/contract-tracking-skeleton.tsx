export function ContractTrackingSkeleton() {
  return (
    <div role="status" aria-label="Đang tải danh sách hợp đồng" className="space-y-4">
      <span className="sr-only">Đang tải hợp đồng…</span>
      {[0, 1, 2].map((item) => (
        <div key={item} aria-hidden="true" className="space-y-5 rounded-xl border border-border bg-card p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="size-10 shrink-0 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-3/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
              <div className="h-3 w-2/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
            </div>
          </div>
          <div className="h-14 animate-pulse rounded-lg bg-muted/70 motion-reduce:animate-none" />
          <div className="flex justify-end gap-2 border-t border-border pt-3">
            <div className="h-9 w-28 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
            <div className="h-9 w-28 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
          </div>
        </div>
      ))}
    </div>
  );
}
