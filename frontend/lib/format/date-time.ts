const VIETNAM_TIME_ZONE = "Asia/Ho_Chi_Minh";

/**
 * A date and time as people in Vietnam read it, whatever the browser's time zone.
 * Missing values read as "—".
 */
export function formatVietnamDateTime(
  value: string | null | undefined,
  { dateStyle = "short", timeStyle = "short" }: Pick<Intl.DateTimeFormatOptions, "dateStyle" | "timeStyle"> = {},
) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("vi-VN", { timeZone: VIETNAM_TIME_ZONE, dateStyle, timeStyle });
}
