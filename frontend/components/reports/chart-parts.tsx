import styles from "./reports.module.css";

export type ChartGranularity = "day" | "week" | "month";
export type ChartTooltipSeries = { key: string; label: string; color: string };
type ChartRow = { [key: string]: string | number | null | undefined };

export const CHART_GRID = "#edf1f6";
export const CHART_AXIS_LINE = "#dfe5ee";
export const CHART_COMPARE = "#8b95a5";
export const chartTick = { fill: "#8090a5", fontSize: 10 };

const pad = (value: string) => value.padStart(2, "0");
function dateParts(value: unknown) {
  const [year, month, day] = String(value ?? "").split("-");
  return { year: year ?? "", month: pad(month ?? ""), day: pad(day ?? "") };
}

/** Short axis label for a YYYY-MM-DD bucket. */
export function formatChartTick(value: unknown, granularity: ChartGranularity) {
  const { year, month, day } = dateParts(value);
  if (!year || !month.trim()) return String(value ?? "");
  return granularity === "month"
    ? `T${Number(month)}/${year.slice(2)}`
    : `${day}/${month}`;
}

/** Full tooltip label for a YYYY-MM-DD bucket. */
export function formatChartBucket(
  value: unknown,
  granularity: ChartGranularity,
) {
  if (value == null || value === "") return "—";
  const { year, month, day } = dateParts(value);
  if (granularity === "month") return `Tháng ${Number(month)}/${year}`;
  if (granularity === "week") return `Tuần từ ${day}/${month}/${year}`;
  return `${day}/${month}/${year}`;
}

export function compactTick(value: unknown) {
  const number = Number(value);
  return number.toLocaleString("vi-VN", {
    notation: Math.abs(number) >= 10000 ? "compact" : "standard",
  });
}

export function ChartTooltip({
  active,
  row,
  title,
  subtitle,
  series,
  compare = false,
  total = false,
  format,
}: {
  active?: boolean;
  row?: ChartRow;
  title: string;
  subtitle?: string;
  series: ChartTooltipSeries[];
  compare?: boolean;
  total?: boolean;
  format: (value: number | null) => string;
}) {
  if (!active || !row) return null;
  const value = (key: string) =>
    typeof row[key] === "number" ? (row[key] as number) : null;
  const sum = (prefix: string) => {
    const values = series.map((item) => value(`${prefix}${item.key}`));
    return values.every((item) => item === null)
      ? null
      : values.reduce<number>((acc, item) => acc + (item ?? 0), 0);
  };
  return (
    <div className={styles.tooltip}>
      <div className={styles.tooltipHead}>
        <span>{title}</span>
        {subtitle && <span className="text-slate-400">{subtitle}</span>}
      </div>
      <table>
        {compare && (
          <thead>
            <tr>
              <th />
              <th>Kỳ này</th>
              <th>So sánh</th>
            </tr>
          </thead>
        )}
        <tbody>
          {series.map((item) => (
            <tr key={item.key}>
              <td>
                <span
                  aria-hidden="true"
                  className={styles.tooltipSwatch}
                  style={{ background: item.color }}
                />
                {item.label}
              </td>
              <td>{format(value(item.key))}</td>
              {compare && (
                <td className="text-slate-400">
                  {format(value(`previous_${item.key}`))}
                </td>
              )}
            </tr>
          ))}
          {total && series.length > 1 && (
            <tr className={styles.tooltipTotal}>
              <td>Tổng</td>
              <td>{format(sum(""))}</td>
              {compare && (
                <td className="text-slate-400">{format(sum("previous_"))}</td>
              )}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
