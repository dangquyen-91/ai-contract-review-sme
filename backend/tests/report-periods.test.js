const {
  resolveReportPeriods,
  compareReportMetric,
  groupReportDays,
} = require('../dist/services/reporting/reportPeriods');
const now = new Date('2026-11-11T03:30:00Z');
const resolve = (period, anchor, comparison = 'previous', clock = now) =>
  resolveReportPeriods({ period, anchor, comparison }, clock);

test.each([
  ['week', '2026-11-08', '2026-11-02', '2026-11-08', '2026-10-26', '2026-11-01'],
  ['month', '2026-10-12', '2026-10-01', '2026-10-31', '2026-09-01', '2026-09-30'],
  ['quarter', '2026-06-30', '2026-04-01', '2026-06-30', '2026-01-01', '2026-03-31'],
  ['year', '2025-12-31', '2025-01-01', '2025-12-31', '2024-01-01', '2024-12-31'],
  ['month', '2024-02-12', '2024-02-01', '2024-02-29', '2024-01-01', '2024-01-31'],
])(
  '%s uses Vietnam calendar boundaries, including leap years',
  (period, anchor, start, end, previousStart, previousEnd) => {
    const result = resolve(period, anchor);
    expect([result.current.startDate, result.current.endDate]).toEqual([start, end]);
    expect([result.previous.startDate, result.previous.endDate]).toEqual([
      previousStart,
      previousEnd,
    ]);
    expect(result.current.partial).toBe(false);
    expect(result.current.from.toISOString()).toBe(
      new Date(`${start}T00:00:00+07:00`).toISOString(),
    );
  },
);

test('ongoing months compare to the same elapsed time; previous-year matches calendar date', () => {
  const previous = resolve('month', '2026-11-11');
  expect(previous.current.to).toEqual(now);
  expect(previous.current.partial).toBe(true);
  expect(previous.previous.to.toISOString()).toBe('2026-10-11T03:30:00.000Z');
  expect(resolve('month', '2026-11-11', 'year').previous.to.toISOString()).toBe(
    '2025-11-11T03:30:00.000Z',
  );
});

test('shorter previous months clamp at their end and never include next-month data', () => {
  const result = resolve('month', '2026-03-31', 'previous', new Date('2026-03-31T03:00:00Z'));
  expect(result.previous.endDate).toBe('2026-02-28');
  expect(result.previous.to.toISOString()).toBe('2026-02-28T17:00:00.000Z');
});

test('February 29 maps to February 28 for ongoing year-on-year comparisons', () => {
  const result = resolve('month', '2024-02-29', 'year', new Date('2024-02-29T03:00:00Z'));
  expect(result.previous.to.toISOString()).toBe('2023-02-28T03:00:00.000Z');
});

test('ISO week comparisons cross calendar years and week 53 falls back to week 52', () => {
  const result = resolve('week', '2021-01-01', 'year');
  expect(result.current.startDate).toBe('2020-12-28');
  expect(result.previous.startDate).toBe('2019-12-23');
  expect(result.previous.days).toBe(7);
});

test('custom ranges include the end date and previous ranges have equal duration', () => {
  const result = resolveReportPeriods(
    { period: 'custom', start: '2026-10-10', end: '2026-10-15' },
    now,
  );
  expect(result.current.days).toBe(6);
  expect(result.previous.startDate).toBe('2026-10-04');
  expect(result.previous.endDate).toBe('2026-10-09');
  expect(result.current.to.toISOString()).toBe('2026-10-15T17:00:00.000Z');
});

test.each([
  { period: 'month', anchor: '2026-02-30' },
  { period: 'week', anchor: 'bad' },
  { period: 'year', anchor: '2027-01-01' },
  { period: 'custom', start: '2026-01-01' },
  { period: 'custom', start: '2026-11-12', end: '2026-11-13' },
  { period: 'custom', start: '2026-01-02', end: '2026-01-01' },
  { period: 'custom', start: '2024-01-01', end: '2026-01-01' },
])('rejects invalid or excessive ranges: %j', (options) => {
  expect(() => resolveReportPeriods(options, now)).toThrow();
});

test('growth and percentage-point comparisons distinguish zero baselines from missing data', () => {
  expect(compareReportMetric(12, 8)).toMatchObject({
    difference: 4,
    changePercent: 50,
    status: 'comparable',
  });
  expect(compareReportMetric(4, 8).changePercent).toBe(-50);
  expect(compareReportMetric(0, 8).changePercent).toBe(-100);
  expect(compareReportMetric(8, 0)).toMatchObject({ changePercent: null, status: 'no_baseline' });
  expect(compareReportMetric(0, 0).changePercent).toBeNull();
  expect(compareReportMetric(null, 8).status).toBe('no_data');
  expect(compareReportMetric(90, 80, true)).toMatchObject({
    difference: 10,
    changePercent: null,
    unit: 'percentage_points',
  });
  expect(compareReportMetric(0, 0, true).status).toBe('comparable');
});

test('weekly/monthly averages are weighted by valid attempts and preserve missing receipts', () => {
  const day = (date, durationSumMs, timedReviews) => ({
    date,
    uploads: 1,
    completed: timedReviews,
    failed: 0,
    cancelled: 0,
    receivedAmount: null,
    analysis: 1,
    chat: 0,
    drafting: 0,
    durationSumMs,
    timedReviews,
  });
  const rows = [day('2026-11-09', 100, 1), day('2026-11-10', 90, 9)];
  for (const interval of ['week', 'month']) {
    const [bucket] = groupReportDays(rows, interval);
    expect(bucket.averageDurationMs).toBe(19);
    expect(bucket.uploads).toBe(2);
    expect(bucket.receivedAmount).toBeNull();
  }
  expect(groupReportDays([day('2026-11-10', 0, 0)], 'day')[0].averageDurationMs).toBeNull();
  expect(resolve('year', '2025-01-01').granularity).toBe('month');
  expect(resolve('quarter', '2025-01-01').granularity).toBe('week');
});
