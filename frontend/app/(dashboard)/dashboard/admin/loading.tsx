export default function AdminLoading() {
  return (
    <div
      className="space-y-6 p-8"
      role="status"
      aria-label="Đang tải trang quản trị"
    >
      <div className="h-9 w-64 rounded bg-slate-200 motion-safe:animate-pulse" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[1, 2, 3, 4].map((item) => (
          <div
            key={item}
            className="h-36 rounded-xl bg-slate-100 motion-safe:animate-pulse"
          />
        ))}
      </div>
      <div className="h-72 rounded-xl bg-slate-100 motion-safe:animate-pulse" />
      <span className="sr-only">Đang tải…</span>
    </div>
  );
}
