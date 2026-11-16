export function ChartLoading({ panels = 1 }: { panels?: number }) {
  return (
    <div
      role="status"
      aria-label="Đang tải biểu đồ"
      className={
        panels > 1
          ? "grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]"
          : "min-w-0"
      }
    >
      {Array.from({ length: panels }, (_, index) => (
        <div
          key={index}
          className="h-96 animate-pulse rounded-xl border border-border bg-muted/40 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
