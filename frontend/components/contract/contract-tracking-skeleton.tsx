import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function ContractTrackingSkeleton() {
  return (
    <div role="status" aria-label="Đang tải danh sách hợp đồng" className="space-y-4">
      <span className="sr-only">Đang tải hợp đồng…</span>
      {[0, 1, 2].map((item) => (
        <Card
          key={item}
          aria-hidden="true"
          className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1fr)_minmax(140px,170px)_minmax(160px,205px)_auto] lg:gap-5"
        >
          <div className="flex items-start gap-3">
            <Skeleton className="size-10 shrink-0 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-3">
              <Skeleton className="h-5 w-3/5" />
              <Skeleton className="h-3 w-2/5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 rounded-lg bg-muted/40 p-3 lg:contents">
            {[0, 1].map((fact) => (
              <div key={fact} className="space-y-2 lg:border-l lg:border-border lg:pl-5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            ))}
          </div>
          <div className="flex gap-2 sm:justify-end lg:self-center">
            <Skeleton className="h-9 flex-1 rounded-[10px] sm:w-28 sm:flex-none" />
            <Skeleton className="size-9 rounded-[10px]" />
          </div>
        </Card>
      ))}
    </div>
  );
}
