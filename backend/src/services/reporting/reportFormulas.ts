export const REPORT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DAY_MS = 86_400_000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

// Keep precision for calculations; round only when displaying a metric.
export function percentage(numerator: number, denominator: number): number | null {
  if (![numerator, denominator].every((value) => Number.isFinite(value) && value >= 0))
    throw new RangeError('Report counts must be finite and non-negative');
  return denominator === 0 ? null : (numerator / denominator) * 100;
}

export function reportWindow(days: number, now = new Date()) {
  if (!Number.isInteger(days) || days < 1 || days > 90 || !Number.isFinite(now.getTime()))
    throw new RangeError('Invalid report period');
  const today = Math.floor((now.getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
  const from = new Date(today - (days - 1) * DAY_MS);
  const to = new Date(today + DAY_MS);
  const dates = Array.from({ length: days }, (_, index) =>
    new Date(from.getTime() + index * DAY_MS + VN_OFFSET_MS).toISOString().slice(0, 10),
  );
  return { days, from, to, dates, timezone: REPORT_TIMEZONE };
}
