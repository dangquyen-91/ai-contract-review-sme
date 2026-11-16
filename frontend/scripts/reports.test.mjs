import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';
import { z } from 'zod';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { reportFixture, calendarReportFixture } from './fixtures/report.mjs';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, URLSearchParams, AbortSignal, process: { env: {} }, require: key => dependencies[key] ?? (key === 'react/jsx-runtime' ? jsx : key.startsWith('@/') ? load(`../${key.slice(2)}.ts`) : key.startsWith('.') ? load(new URL(`${key}.ts`, new URL(file, import.meta.url))) : undefined), ...globals });
  return exports;
}

test('report display distinguishes an unknown ratio or duration from a measured zero', () => {
  const format = load('../lib/reports/report-format.ts');
  assert.equal(format.formatReportPercent(null), 'Chưa có dữ liệu');
  assert.equal(format.formatReportPercent(0), '0%');
  assert.equal(format.formatReportPercent(100 / 3), '33,3%');
  assert.equal(format.formatReportDuration(null), 'Chưa có dữ liệu');
  assert.equal(format.formatReportDuration(0), '0 giây');
  assert.equal(format.formatReportDuration(90000), '1,5 phút');
});

test('CSV contains the selected period, computed metrics, daily results and safe organization labels', () => {
  const { reportCsv } = load('../lib/reports/report-format.ts');
  const report = reportFixture();
  report.usage[0].name = '=HYPERLINK("bad")';
  const csv = reportCsv(report);
  assert.ok(csv.startsWith('\uFEFFsep=,\r\n'));
  assert.ok(csv.includes('"Tỷ lệ thành công","80%"'));
  assert.ok(csv.includes('"Thanh toán đã nhận (VND)","99.000 đ"'));
  assert.ok(csv.includes('"10/11/2026","4","1"'));
  assert.ok(csv.includes('"\'=HYPERLINK(""bad"")"'));
  assert.ok(reportCsv(reportFixture(7, '', true)).includes('Chưa có dữ liệu'));
  report.payments = null;
  assert.equal(reportCsv(report).includes('Thanh toán đã nhận'), false);
});

function proxy(role, success = true) {
  const calls = [];
  const route = load('../app/api/reports/route.ts', {
    'next/server': { NextRequest, NextResponse },
    '@/schemas/report.schema': load('../schemas/report.schema.ts', { zod: { z } }),
    '@/lib/auth/api-session': { getApiSession: async () => role
      ? { user: { role }, accessToken: 'verified-token' }
      : { error: NextResponse.json({}, { status: 401 }) } },
  }, { fetch: async (url, options) => {
    calls.push({ url, options });
    return NextResponse.json(success ? { success: true, data: reportFixture() } : { success: false, error: { message: 'No access' } }, { status: success ? 200 : 403 });
  } });
  return { calls, get: query => route.GET(new NextRequest(`http://localhost/api/reports${query}`)) };
}

test('report proxy enforces roles and validates filters before contacting the backend', async () => {
  for (const [role, status] of [[null, 401], ['staff', 403], ['user', 403], ['manager', 403], ['expert', 403]]) {
    const ctx = proxy(role);
    assert.equal((await ctx.get('')).status, status);
    assert.equal(ctx.calls.length, 0);
  }
  const ctx = proxy('administrator');
  for (const query of ['?days=0', '?days=91', '?days=NaN', '?organizationId=bad']) assert.equal((await ctx.get(query)).status, 400);
  assert.equal(ctx.calls.length, 0);
});

test('report proxy forwards verified credentials and only selected filters without caching, including upstream denials', async () => {
  const ctx = proxy('administrator');
  const response = await ctx.get(`?days=30&organizationId=${'b'.repeat(24)}&role=administrator`);
  assert.equal(response.status, 200);
  assert.ok(ctx.calls[0].url.endsWith(`days=30&organizationId=${'b'.repeat(24)}`));
  assert.equal(ctx.calls[0].options.headers.Authorization, 'Bearer verified-token');
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  assert.equal((await proxy('owner', false).get('')).status, 403);
});

test('calendar filters are forwarded intact and incompatible ranges are rejected', async () => {
  const ctx = proxy('administrator');
  const query = '?period=quarter&comparison=year&granularity=month&anchor=2026-10-01';
  assert.equal((await ctx.get(query)).status, 200);
  assert.ok(ctx.calls[0].url.endsWith(query));
  for (const invalid of ['?period=custom', '?period=month&days=7', '?period=week&start=2026-01-01', '?period=day', '?comparison=bad']) {
    assert.equal((await ctx.get(invalid)).status, 400);
  }
});

test('comparison CSV preserves backend differences, actual period dates, grouped values and null duration', () => {
  const { reportCsv } = load('../lib/reports/report-format.ts');
  const report = calendarReportFixture(new URLSearchParams('period=month&anchor=2026-10-01&comparison=year&granularity=week'));
  const csv = reportCsv(report);
  assert.ok(csv.includes('"Bắt đầu kỳ so sánh","01/10/2025"'));
  assert.ok(csv.includes('"Hợp đồng tải lên","2","1","1","100%"'));
  assert.ok(csv.includes('"Gộp theo","Tuần"'));
  assert.ok(csv.includes('"Thời gian xử lý trung bình"'));
  assert.ok(!csv.includes('(ms)'));
  const empty = calendarReportFixture(new URLSearchParams('period=month&comparison=none'), true);
  assert.equal(reportCsv(empty).includes('"Kỳ so sánh"'), false);
  assert.ok(reportCsv(empty).includes('Chưa có dữ liệu'));
});

test('role reports use feature permissions and each role has a working report destination', () => {
  const { getDashboardNavigation } = load('../config/dashboard-navigation.ts');
  const { permissions } = load('../config/permissions.ts');
  const { roleReportConfig } = load('../config/report-profiles.ts');
  for (const role of ['administrator', 'owner', 'staff', 'user', 'manager', 'expert']) {
    const entries = getDashboardNavigation(role).filter(item => item.key === 'reports');
    assert.equal(entries.length, 1);
    assert.equal(entries[0].href, roleReportConfig[role].href);
    assert.equal(entries[0].mobile, true);
    assert.equal(permissions.reportExport(role), role !== 'staff');
    assert.equal(permissions.operationalReports(role), ['administrator', 'owner'].includes(role));
  }
  assert.equal(permissions.reports('unknown'), false);
});

test('Admin and Owner render and export different report features, including when Admin filters one organization', () => {
  const { reportCsv } = load('../lib/reports/report-format.ts');
  const { ReportMetrics } = load('../components/reports/report-metrics.tsx', { './report-change': { ReportChange: () => null } });
  const { ReportCharts } = load('../components/reports/report-charts.tsx', {
    'next/dynamic': { default: () => ({ title }) => React.createElement('h2', null, title) },
    './chart-loading': { ChartLoading: () => null },
    './report-detail-table': { ReportDetailTable: () => null },
    './report-risk-distribution': { ReportRiskDistribution: () => React.createElement('h2', null, 'Phân bố rủi ro hợp đồng') },
  });
  const report = calendarReportFixture(new URLSearchParams('period=month&organizationId=' + 'b'.repeat(24)));
  const admin = renderToStaticMarkup(React.createElement(ReportMetrics, { report })) + renderToStaticMarkup(React.createElement(ReportCharts, { report }));
  assert.match(admin, /Thanh toán đã nhận/);
  assert.match(admin, /10 không gian/);
  assert.doesNotMatch(admin, /rủi ro/);
  assert.doesNotMatch(reportCsv(report), /rủi ro/);
  report.role = 'owner';
  // Even an unexpected financial payload must not add features to the Owner report.
  const owner = renderToStaticMarkup(React.createElement(ReportMetrics, { report })) + renderToStaticMarkup(React.createElement(ReportCharts, { report }));
  assert.match(owner, /rủi ro/);
  assert.doesNotMatch(owner, /Thanh toán đã nhận|10 không gian/);
  const csv = reportCsv(report);
  assert.match(csv, /Tỷ lệ rủi ro cao/);
  assert.doesNotMatch(csv, /Thanh toán đã nhận|Tiền nhận|Tiền đã nhận|Không gian/);
});

test('operational report queries isolate roles and organizations and never reuse a foreign placeholder', async () => {
  let options;
  let report = { ...reportFixture(), role: 'owner', scope: { type: 'organization', organizationId: 'org-a' } };
  const { useReport } = load('../hooks/reports/use-report.ts', {
    '@tanstack/react-query': { useQuery: value => { options = value; return value; } },
    '@/lib/api/reports': { getReport: async (_, signal) => { assert.ok(signal); return report; } },
  });
  const filters = { period: 'month', comparison: 'previous', granularity: 'auto' };
  useReport(filters, 'owner', 'org-a');
  const signal = new AbortController().signal;
  assert.equal(await options.queryFn({ signal }), report);
  const ownerKey = options.queryKey;
  assert.equal(options.placeholderData(report, { queryKey: ownerKey }), report);
  useReport(filters, 'owner', 'org-b');
  assert.notEqual(JSON.stringify(options.queryKey), JSON.stringify(ownerKey));
  assert.equal(options.placeholderData(report, { queryKey: ownerKey }), undefined);
  await assert.rejects(options.queryFn({ signal }), /Không gian làm việc đã thay đổi/);
  useReport(filters, 'administrator');
  assert.equal(options.placeholderData(report, { queryKey: ownerKey }), undefined);
  await assert.rejects(options.queryFn({ signal }), /Không gian làm việc đã thay đổi/);
});
