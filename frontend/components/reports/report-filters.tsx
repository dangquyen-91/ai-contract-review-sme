import type { FormEvent } from "react";
import type {
  OperationalReport,
  ReportFilters as Filters,
} from "@/types/reports";
import { Button } from "@/components/ui/button";

const control =
  "min-h-11 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-800";
const field = "grid min-w-0 gap-2 text-xs font-medium text-slate-600";

export function ReportFilters({
  value,
  onChange,
  onApply,
  onRefresh,
  onDownload,
  report,
  fetching,
  ready,
  organizationOnly = false,
}: {
  value: Filters;
  onChange: (value: Filters) => void;
  onApply: () => void;
  onRefresh: () => void;
  onDownload: () => void;
  report?: OperationalReport;
  fetching: boolean;
  ready: boolean;
  organizationOnly?: boolean;
}) {
  const set = (patch: Partial<Filters>) => onChange({ ...value, ...patch });
  function apply(event: FormEvent) {
    event.preventDefault();
    onApply();
  }
  return (
    <form
      onSubmit={apply}
      aria-label="Bộ lọc báo cáo"
      className="mb-6 rounded-2xl border border-slate-200 bg-white p-5"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <label className={field}>
          Kỳ báo cáo
          <select
            className={control}
            aria-label="Kỳ báo cáo"
            value={value.period}
            onChange={(event) =>
              set({ period: event.target.value as Filters["period"] })
            }
          >
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
            <option value="quarter">Quý</option>
            <option value="year">Năm</option>
            <option value="custom">Tùy chọn ngày</option>
          </select>
        </label>
        <label className={field}>
          So sánh với
          <select
            className={control}
            aria-label="So sánh với"
            value={value.comparison}
            onChange={(event) =>
              set({ comparison: event.target.value as Filters["comparison"] })
            }
          >
            <option value="previous">Kỳ trước</option>
            <option value="year">Cùng kỳ năm trước</option>
            <option value="none">Không so sánh</option>
          </select>
        </label>
        <label className={field}>
          Gộp biểu đồ theo
          <select
            className={control}
            aria-label="Gộp biểu đồ theo"
            value={value.granularity}
            onChange={(event) =>
              set({ granularity: event.target.value as Filters["granularity"] })
            }
          >
            <option value="auto">Tự động</option>
            <option value="day">Ngày</option>
            <option value="week">Tuần</option>
            <option value="month">Tháng</option>
          </select>
        </label>
        <label className={field}>
          Tổ chức
          <select
            className={control}
            aria-label="Lọc tổ chức"
            value={value.organizationId ?? ""}
            onChange={(event) =>
              set({ organizationId: event.target.value || undefined })
            }
          >
            <option value="">
              {organizationOnly
                ? "Tổ chức của bạn"
                : "Toàn hệ thống, gồm tài khoản cá nhân"}
            </option>
            {report?.organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.name}
              </option>
            ))}
          </select>
        </label>
        {value.period === "custom" ? (
          <>
            <label className={field}>
              Từ ngày
              <input
                className={control}
                required
                aria-label="Từ ngày"
                type="date"
                value={value.start ?? ""}
                onChange={(event) => set({ start: event.target.value })}
              />
            </label>
            <label className={field}>
              Đến ngày
              <input
                className={control}
                required
                aria-label="Đến ngày"
                type="date"
                min={value.start}
                value={value.end ?? ""}
                onChange={(event) => set({ end: event.target.value })}
              />
            </label>
          </>
        ) : (
          <label className={field}>
            Ngày trong kỳ cần xem
            <input
              className={control}
              aria-label="Ngày trong kỳ"
              type="date"
              value={value.anchor ?? report?.period.anchorDate ?? ""}
              onChange={(event) =>
                set({ anchor: event.target.value || undefined })
              }
            />
          </label>
        )}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-4">
        <Button type="submit" disabled={fetching}>
          Áp dụng bộ lọc
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={fetching}
          onClick={onRefresh}
        >
          {fetching ? "Đang cập nhật…" : "Làm mới"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={!ready}
          onClick={onDownload}
        >
          Tải CSV
        </Button>
        <p className="text-xs leading-5 text-slate-500">
          Tuần bắt đầu từ thứ Hai. Kỳ đang diễn ra được so sánh đến thời điểm
          tương ứng.
        </p>
      </div>
    </form>
  );
}
