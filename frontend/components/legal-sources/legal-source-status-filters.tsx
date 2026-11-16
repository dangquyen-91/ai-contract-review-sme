import { ListFilter, LoaderCircle, CircleAlert, FileSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { SourceGroup } from "@/lib/legal-sources/legal-source-filtering";

const groups = [
  { value: "all", label: "Tất cả", icon: ListFilter },
  { value: "processing", label: "Đang xử lý", icon: LoaderCircle },
  { value: "failed", label: "Xử lý lỗi", icon: CircleAlert },
  { value: "coverage", label: "Cần kiểm tra độ đầy đủ", icon: FileSearch },
] as const;

export function LegalSourceStatusFilters({ value, counts, loaded, onChange }: {
  value: SourceGroup; counts: Record<SourceGroup, number>; loaded: boolean; onChange: (value: SourceGroup) => void;
}) {
  return <div className="border-y border-slate-200 bg-slate-50 px-5 py-4 text-slate-700 [color-scheme:light]">
    <div role="group" aria-label="Lọc theo tình trạng xử lý" className="flex flex-wrap gap-2">
      {groups.map(({ value: key, label, icon: Icon }) => <Button key={key} variant="outline" size="sm" className={`h-auto min-h-11 max-w-full justify-start gap-2 whitespace-normal border px-3 py-2 text-left text-sm leading-5 shadow-none ${value === key ? "border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 hover:text-blue-900" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-900"}`} aria-pressed={value === key} onClick={() => onChange(key)}>
        <Icon aria-hidden="true" className="size-4 shrink-0" /><span className="min-w-0">{label}</span><span className={`ml-auto inline-flex min-h-6 min-w-6 shrink-0 items-center justify-center rounded-md px-1.5 text-xs font-semibold leading-5 tabular-nums ${value === key ? "bg-blue-100 text-blue-900" : "bg-slate-100 text-slate-700"}`}>{loaded ? counts[key] : "—"}</span>
      </Button>)}
    </div>
    <p className="mt-2 text-ui-caption text-muted-foreground">Số lượng theo bộ lọc hiện tại. Đang xử lý gồm chờ, đang chạy và tạm dừng; một nguồn có thể đồng thời cần kiểm tra độ đầy đủ.</p>
  </div>;
}
