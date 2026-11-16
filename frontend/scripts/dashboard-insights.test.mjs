import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';
import { z } from 'zod';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: key => dependencies[key] ?? (key.startsWith('@/') ? load(`../${key.slice(2)}.ts`) : key.startsWith('.') ? load(new URL(`${key}.ts`, new URL(file, import.meta.url))) : undefined), process: { env: {} }, URLSearchParams, AbortSignal, ...globals });
  return exports;
}

function proxy(authenticated = true, status = 200) {
  const calls = [];
  const route = load('../app/api/dashboard/insights/route.ts', {
    'next/server': { NextRequest, NextResponse },
    '@/lib/auth/api-session': { getApiSession: async () => authenticated ? { user: { role: 'owner' }, accessToken: 'verified' } : { error: NextResponse.json({}, { status: 401 }) } },
    '@/schemas/dashboard-insights.schema': load('../schemas/dashboard-insights.schema.ts', { zod: { z } }),
  }, { fetch: async (url, options) => { calls.push({ url, options }); return NextResponse.json({ success: status === 200 }, { status }); } });
  return { calls, get: suffix => route.GET(new NextRequest('http://localhost/api/dashboard/insights' + suffix)) };
}

test('proxy authenticates, rejects scope injection and forwards verified credentials without caching', async () => {
  const unauthenticated = proxy(false);
  assert.equal((await unauthenticated.get('')).status, 401);
  assert.equal(unauthenticated.calls.length, 0);
  const ctx = proxy();
  for (const suffix of ['?period=day', '?organizationId=other', '?role=administrator']) assert.equal((await ctx.get(suffix)).status, 400);
  assert.equal(ctx.calls.length, 0);
  const response = await ctx.get('?period=quarter');
  assert.equal(response.status, 200);
  assert.equal(ctx.calls[0].options.headers.Authorization, 'Bearer verified');
  assert.equal(ctx.calls[0].options.cache, 'no-store');
  assert.ok(ctx.calls[0].url.endsWith('/api/v1/dashboard/insights?period=quarter'));
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await proxy(true, 403).get('')).status, 403);
});

test('CSV formats displayed metrics and Vietnam dates, preserves counts and neutralizes formula labels', () => {
  const config = load('../config/dashboard-insights.ts');
  const { insightCsv, formatInsight } = load('../lib/reports/insight-format.ts', {
    '@/config/dashboard-insights': config,
  });
  const csv = insightCsv({ role: 'administrator', scope: { type: 'system' }, timezone: 'Asia/Ho_Chi_Minh', computedAt: '2026-11-15T00:00:00Z',
    period: { startDate: '2026-11-01', endDate: '2026-11-15', toExclusive: '2026-11-15T00:00:00Z' },
    metrics: { organizations: 2, receivedAmount: 99000, successRate: 100, averageDurationMs: 39968.42857142857 },
    trend: [{ date: '2026-11-01', uploads: 1, completed: 0, failed: 0 }],
    distribution: [{ key: '\t=HYPERLINK("bad")', value: 3 }],
  });
  assert.ok(csv.startsWith('\uFEFFsep=,\r\n'));
  assert.ok(csv.includes('"Thanh toán đã nhận","99.000 đ","Trong kỳ"'));
  assert.ok(csv.includes('"Tỷ lệ thành công","100%","Trong kỳ"'));
  assert.ok(csv.includes('"Thời gian xử lý AI","40 giây","Trong kỳ"'));
  assert.ok(csv.includes('"Phạm vi","Toàn hệ thống"'));
  assert.ok(csv.includes('"Cập nhật lúc","15/11/2026 07:00:00"'));
  assert.ok(csv.includes('"01/11/2026","1","0","0"'));
  assert.ok(!csv.includes('39968.42857142857'));
  assert.ok(csv.includes('"\'\t=HYPERLINK(""bad"")","3"'));
  assert.equal(formatInsight(null), '—');
  assert.equal(formatInsight(0), '0');
});

test('CSV distinguishes unknown metrics from zero with consistent columns and Excel-compatible serialization', () => {
  const { serializeReportCsv, formatCsvDateTime, formatCsvDate } = load('../lib/reports/csv-format.ts');
  const csv = serializeReportCsv([['Tiêu đề'], [], ['A', 'B', 'C'], ['Hợp đồng "A", B', -2, '=SUM(A1:A2)']]);
  assert.ok(csv.includes('"Tiêu đề","",""'));
  assert.ok(csv.includes('"Hợp đồng ""A"", B","-2","\'=SUM(A1:A2)"'));
  assert.equal(formatCsvDate('2026-11'), '11/2026');
  assert.equal(formatCsvDateTime('2026-11-14T18:29:00.978Z', 'Asia/Ho_Chi_Minh'), '15/11/2026 01:29:00.978');
  assert.equal(formatCsvDateTime('invalid', 'Asia/Ho_Chi_Minh'), 'Chưa có dữ liệu');
  const { insightCsv } = load('../lib/reports/insight-format.ts', { '@/config/dashboard-insights': load('../config/dashboard-insights.ts') });
  const data = { role: 'expert', scope: { type: 'expert' }, timezone: 'Asia/Ho_Chi_Minh', computedAt: '2026-11-15T00:00:00Z',
    period: { startDate: '2026-11-01', endDate: '2026-11-15', toExclusive: '2026-11-15T00:00:00Z' },
    metrics: { approved: 0, averageDurationMs: null }, trend: [], distribution: [] };
  const result = insightCsv(data);
  assert.ok(result.includes('"Đã duyệt","0","Trong kỳ"'));
  assert.ok(result.includes('"Thời gian xác minh","Chưa có dữ liệu","Trong kỳ"'));
  assert.throws(() => insightCsv({ ...data, role: 'staff' }), /không có quyền/);
});

test('insight queries separate roles and workspaces, propagate cancellation, and reject a changed scope', async () => {
  let options;
  let response = { role: 'owner', scope: { id: 'org-a' } };
  const hook = load('../hooks/dashboard/use-dashboard-insights.ts', {
    '@tanstack/react-query': { useQuery: value => { options = value; return value; } },
    '@/lib/api/dashboard': { dashboardApi: { getInsights: async (period, signal) => { assert.equal(period, 'month'); assert.ok(signal); return response; } } },
    '@/lib/query-keys/dashboard': load('../lib/query-keys/dashboard.ts'),
  });
  hook.useDashboardInsights('owner', 'month', 'org-a');
  const signal = new AbortController().signal;
  assert.equal((await options.queryFn({ signal })).scope.id, 'org-a');
  const firstKey = JSON.stringify(options.queryKey);
  response = { role: 'owner', scope: { id: 'org-b' } };
  await assert.rejects(options.queryFn({ signal }), /Không gian làm việc đã thay đổi/);
  response = { role: 'user', scope: { id: 'org-a' } };
  await assert.rejects(options.queryFn({ signal }), /Không gian làm việc đã thay đổi/);
  hook.useDashboardInsights('owner', 'month', 'org-b');
  assert.notEqual(JSON.stringify(options.queryKey), firstKey);
});

test('organization labels are independent from identifiers and object prototype property names', () => {
  const config = load('../config/dashboard-insights.ts');
  const { insightLabel } = load('../lib/reports/insight-format.ts', {
    '@/config/dashboard-insights': config, './report-format': {},
  });
  assert.equal(insightLabel({}, { key: 'toString', value: 1 }), 'toString');
  assert.equal(insightLabel({}, { key: 'org-a', label: 'Cùng tên', value: 1 }), 'Cùng tên');
  assert.equal(insightLabel({}, { key: 'org-b', label: 'Cùng tên', value: 2 }), 'Cùng tên');
});
