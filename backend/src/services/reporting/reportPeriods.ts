import { AppError } from '../../errors/AppError';
import { REPORT_TIMEZONE } from './reportFormulas';

const DAY = 86_400_000;
const OFFSET = 7 * 3_600_000;
export type ReportPeriod = 'week' | 'month' | 'quarter' | 'year' | 'custom';
export type ReportComparison = 'none' | 'previous' | 'year';
export type ReportGranularity = 'day' | 'week' | 'month';
export type ReportOptions = {
  period: ReportPeriod;
  comparison?: ReportComparison;
  anchor?: string;
  start?: string;
  end?: string;
  granularity?: ReportGranularity | 'auto';
  organizationId?: string;
};

// Civil dates are represented at UTC midnight solely for calendar arithmetic.
export function civilDate(value: string) {
  const date = new Date(`${value}T00:00:00.000Z`);
  if (
    !/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  )
    throw AppError.badRequest('Ngày báo cáo không hợp lệ.');
  return date;
}
const dateKey = (value: Date) => value.toISOString().slice(0, 10);
const local = (value: Date) => new Date(value.getTime() + OFFSET);
const instant = (value: Date) => new Date(value.getTime() - OFFSET);
const addDays = (value: Date, days: number) => new Date(value.getTime() + days * DAY);
const monday = (value: Date) => addDays(value, -((value.getUTCDay() + 6) % 7));
function monthStart(value: Date, shift = 0) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + shift, 1));
}
function shiftYear(value: Date, years = -1) {
  const year = value.getUTCFullYear() + years;
  const lastDay = new Date(Date.UTC(year, value.getUTCMonth() + 1, 0)).getUTCDate();
  return new Date(
    Date.UTC(
      year,
      value.getUTCMonth(),
      Math.min(value.getUTCDate(), lastDay),
      value.getUTCHours(),
      value.getUTCMinutes(),
      value.getUTCSeconds(),
      value.getUTCMilliseconds(),
    ),
  );
}
function isoWeek(value: Date) {
  const thursday = addDays(monday(value), 3);
  const year = thursday.getUTCFullYear();
  const first = monday(new Date(Date.UTC(year, 0, 4)));
  return { year, number: Math.round((monday(value).getTime() - first.getTime()) / (7 * DAY)) + 1 };
}
function sameWeekLastYear(value: Date) {
  const { year, number } = isoWeek(value);
  const first = monday(new Date(Date.UTC(year - 1, 0, 4)));
  const next = monday(new Date(Date.UTC(year, 0, 4)));
  const count = Math.round((next.getTime() - first.getTime()) / (7 * DAY));
  return addDays(first, (Math.min(number, count) - 1) * 7);
}

function makeWindow(fromCivil: Date, nominalToCivil: Date, to: Date) {
  const from = instant(fromCivil);
  const nominalTo = instant(nominalToCivil);
  const last = civilDate(dateKey(local(new Date(Math.max(from.getTime(), to.getTime() - 1)))));
  const days = Math.max(1, Math.round((last.getTime() - fromCivil.getTime()) / DAY) + 1);
  return {
    from,
    to,
    nominalTo,
    dates: Array.from({ length: days }, (_, index) => dateKey(addDays(fromCivil, index))),
    days,
    timezone: REPORT_TIMEZONE,
    partial: to < nominalTo,
    startDate: dateKey(fromCivil),
    endDate: dateKey(last),
    nominalEndDate: dateKey(addDays(nominalToCivil, -1)),
  };
}
export type CalendarReportWindow = ReturnType<typeof makeWindow>;

export function resolveReportPeriods(options: ReportOptions, now = new Date()) {
  const today = civilDate(dateKey(local(now)));
  const anchor = options.anchor ? civilDate(options.anchor) : today;
  let from: Date, nominalTo: Date;
  switch (options.period) {
    case 'week':
      from = monday(anchor);
      nominalTo = addDays(from, 7);
      break;
    case 'month':
      from = monthStart(anchor);
      nominalTo = monthStart(from, 1);
      break;
    case 'quarter':
      from = new Date(
        Date.UTC(anchor.getUTCFullYear(), Math.floor(anchor.getUTCMonth() / 3) * 3, 1),
      );
      nominalTo = monthStart(from, 3);
      break;
    case 'year':
      from = new Date(Date.UTC(anchor.getUTCFullYear(), 0, 1));
      nominalTo = monthStart(from, 12);
      break;
    case 'custom':
      if (!options.start || !options.end)
        throw AppError.badRequest('Hãy chọn ngày bắt đầu và kết thúc.');
      from = civilDate(options.start);
      nominalTo = addDays(civilDate(options.end), 1);
      if (
        from >= nominalTo ||
        nominalTo.getTime() - from.getTime() > 366 * DAY ||
        nominalTo > addDays(today, 1)
      )
        throw AppError.badRequest('Khoảng ngày tối đa 366 ngày và không vượt quá hôm nay.');
      break;
    default:
      throw AppError.badRequest('Kỳ báo cáo không hợp lệ.');
  }
  if (instant(from) > now) throw AppError.badRequest('Kỳ báo cáo chưa bắt đầu.');
  const current = makeWindow(
    from,
    nominalTo,
    new Date(Math.min(instant(nominalTo).getTime(), now.getTime())),
  );
  const comparison = options.comparison ?? 'previous';
  let previous: CalendarReportWindow | null = null;
  if (comparison !== 'none') {
    let previousFrom: Date, previousNominalTo: Date;
    if (comparison === 'year') {
      previousFrom = options.period === 'week' ? sameWeekLastYear(from) : shiftYear(from);
      previousNominalTo =
        options.period === 'week' ? addDays(previousFrom, 7) : shiftYear(nominalTo);
    } else {
      previousNominalTo = from;
      const months = { month: 1, quarter: 3, year: 12 };
      previousFrom =
        options.period === 'week'
          ? addDays(from, -7)
          : options.period === 'custom'
            ? new Date(from.getTime() - (nominalTo.getTime() - from.getTime()))
            : monthStart(from, -months[options.period]);
    }
    let previousTo = instant(previousNominalTo);
    if (current.partial) {
      // Same-year comparison preserves civil month/day (Feb 29 clamps to Feb 28).
      const elapsedEnd =
        comparison === 'year' && options.period !== 'week'
          ? instant(shiftYear(local(current.to)))
          : new Date(
              instant(previousFrom).getTime() + current.to.getTime() - current.from.getTime(),
            );
      previousTo = new Date(
        Math.max(
          instant(previousFrom).getTime(),
          Math.min(previousTo.getTime(), elapsedEnd.getTime()),
        ),
      );
    }
    previous = makeWindow(previousFrom, previousNominalTo, previousTo);
  }
  const granularity: ReportGranularity =
    options.granularity && options.granularity !== 'auto'
      ? options.granularity
      : current.days <= 31
        ? 'day'
        : current.days <= 120
          ? 'week'
          : 'month';
  return {
    current,
    previous,
    comparison,
    granularity,
    anchorDate: dateKey(anchor),
    period: options.period,
  };
}

export function compareReportMetric(current: number | null, previous: number | null, rate = false) {
  const difference = current === null || previous === null ? null : current - previous;
  return {
    current,
    previous,
    difference,
    changePercent:
      difference === null || previous === 0 || rate ? null : (difference / previous!) * 100,
    unit: rate ? ('percentage_points' as const) : ('percent' as const),
    status:
      difference === null
        ? ('no_data' as const)
        : !rate && previous === 0
          ? ('no_baseline' as const)
          : ('comparable' as const),
  };
}

export type ChartDay = {
  date: string;
  uploads: number;
  completed: number;
  failed: number;
  cancelled: number;
  receivedAmount: number | null;
  analysis: number;
  chat: number;
  drafting: number;
  durationSumMs: number;
  timedReviews: number;
};
export function groupReportDays(rows: ChartDay[], granularity: ReportGranularity) {
  const buckets = new Map<string, ChartDay>();
  for (const row of rows) {
    const date = civilDate(row.date);
    const key =
      granularity === 'month'
        ? dateKey(monthStart(date))
        : granularity === 'week'
          ? dateKey(monday(date))
          : row.date;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = {
        date: key,
        uploads: 0,
        completed: 0,
        failed: 0,
        cancelled: 0,
        receivedAmount: row.receivedAmount === null ? null : 0,
        analysis: 0,
        chat: 0,
        drafting: 0,
        durationSumMs: 0,
        timedReviews: 0,
      };
      buckets.set(key, bucket);
    }
    for (const field of [
      'uploads',
      'completed',
      'failed',
      'cancelled',
      'analysis',
      'chat',
      'drafting',
      'durationSumMs',
      'timedReviews',
    ] as const)
      bucket[field] += row[field];
    if (bucket.receivedAmount !== null) bucket.receivedAmount += row.receivedAmount ?? 0;
  }
  return [...buckets.values()].map((row) => ({
    ...row,
    averageDurationMs: row.timedReviews ? row.durationSumMs / row.timedReviews : null,
  }));
}
