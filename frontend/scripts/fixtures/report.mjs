import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { resolveReportPeriods, groupReportDays, compareReportMetric } = require('../../../backend/dist/services/reporting/reportPeriods');

export function reportFixture(days = 7, organizationId = '', empty = false) {
  const date = new Date('2026-11-10T00:00:00Z');
  const dates = Array.from({ length: days }, (_, index) => new Date(date.getTime() - (days - index - 1) * 86400000).toISOString().slice(0, 10));
  return {
    computedAt: '2026-11-10T03:00:00Z', timezone: 'Asia/Ho_Chi_Minh',
    period: { days, from: `${dates[0]}T00:00:00+07:00`, toExclusive: '2026-11-11T00:00:00+07:00', startDate: dates[0], endDate: dates.at(-1) },
    scope: { type: organizationId ? 'organization' : 'system', organizationId: organizationId || null },
    uploadedContracts: empty ? 0 : 2,
    reviews: { completed: empty ? 0 : 4, failed: empty ? 0 : 1, cancelled: 0, finished: empty ? 0 : 5,
      queued: 0, running: 0, timedReviews: empty ? 0 : 4, averageDurationMs: empty ? null : 45000, successRate: empty ? null : 80 },
    risks: { high: empty ? 0 : 1, medium: 0, low: empty ? 0 : 1, none: empty ? 0 : 1, unknown: 0,
      assessedContracts: empty ? 0 : 3, highRiskRate: empty ? null : 100 / 3 },
    payments: { amount: empty ? 0 : 99000, count: empty ? 0 : 1, unfulfilled: 0 },
    consumedUnits: { analysis: empty ? 0 : 3, chat: 0, drafting: 0 },
    daily: dates.map((value, index) => ({ date: value, completed: !empty && index === dates.length - 1 ? 4 : 0, failed: !empty && index === dates.length - 1 ? 1 : 0 })),
    usage: empty ? [] : [{ id: 'b'.repeat(24), name: 'Công ty kiểm thử', completed: 4, failed: 1, total: 5 }],
    organizations: [{ id: 'b'.repeat(24), name: 'Công ty kiểm thử' }],
  };
}

// Deterministic fake records; calendar boundaries and arithmetic use the backend implementation.
export function calendarReportFixture(params, empty = false) {
  const options = Object.fromEntries(params);
  const clock = new Date('2026-11-10T03:00:00Z');
  const periods = resolveReportPeriods({ ...options, period: options.period ?? 'month' }, clock);
  const current = reportFixture(periods.current.days, options.organizationId, empty);
  const previous = reportFixture(periods.previous?.days ?? 1, options.organizationId, empty);
  const period = window => ({ days: window.days, from: window.from.toISOString(), toExclusive: window.to.toISOString(), startDate: window.startDate, endDate: window.endDate, partial: window.partial });
  current.period = { ...period(periods.current), kind: periods.period, anchorDate: periods.anchorDate, nominalEndDate: periods.current.nominalEndDate };
  if (!empty) previous.uploadedContracts = 1;
  const risks = report => ({ high: report.risks.highRiskRate, medium: empty ? null : 0, low: report.risks.highRiskRate, none: report.risks.highRiskRate });
  current.risks.percentages = risks(current);
  previous.risks.percentages = risks(previous);
  const chartDays = (report, window) => window.dates.map((date, index) => {
    const active = index === window.dates.length - 1;
    return { date, uploads: active ? report.uploadedContracts : 0, completed: active ? report.reviews.completed : 0,
      failed: active ? report.reviews.failed : 0, cancelled: 0, receivedAmount: active ? report.payments.amount : 0,
      analysis: active ? report.consumedUnits.analysis : 0, chat: 0, drafting: 0,
      durationSumMs: active && !empty ? 180000 : 0, timedReviews: active ? report.reviews.timedReviews : 0 };
  });
  const a = groupReportDays(chartDays(current, periods.current), periods.granularity);
  const b = periods.previous ? groupReportDays(chartDays(previous, periods.previous), periods.granularity) : [];
  const values = report => ({ uploads: report.uploadedContracts, success: report.reviews.successRate, risk: report.risks.highRiskRate,
    duration: report.reviews.averageDurationMs, units: report.consumedUnits.analysis, payments: report.payments.amount });
  current.comparison = { mode: periods.comparison, period: periods.previous ? period(periods.previous) : null,
    changes: Object.fromEntries(Object.entries(values(current)).map(([key, value]) => [key, compareReportMetric(value, periods.previous ? values(previous)[key] : null, ['success', 'risk'].includes(key))])),
    previousRisk: periods.previous ? previous.risks : null };
  current.trend = { granularity: periods.granularity, buckets: Array.from({ length: Math.max(a.length, b.length) }, (_, index) => ({ index: index + 1, label: a[index]?.date ?? b[index]?.date, current: a[index] ?? null, previous: b[index] ?? null })) };
  current.daily = chartDays(current, periods.current).map(({ date, completed, failed }) => ({ date, completed, failed }));
  return current;
}
