import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';
import ExcelJS from 'exceljs';
import { fileURLToPath } from 'node:url';
import { dashboardInsightsFixture } from './fixtures/dashboard-insights.mjs';
import { calendarReportFixture } from './fixtures/report.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
function load(file, dependencies = {}, globals = {}, cache = new Map()) {
  const absolute = path.resolve(root, file);
  if (cache.has(absolute)) return cache.get(absolute);
  const exports = {}; cache.set(absolute, exports);
  const code = ts.transpileModule(fs.readFileSync(absolute, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const require = key => {
    if (key in dependencies) return dependencies[key];
    if (key === 'exceljs') return ExcelJS;
    return load(key.startsWith('@/') ? key.slice(2) + '.ts' : path.relative(root, path.resolve(path.dirname(absolute), key + '.ts')), dependencies, globals, cache);
  };
  vm.runInNewContext(code, { exports, require, Date, Intl, Uint8Array, ArrayBuffer, Blob, ...globals });
  return exports;
}
const { insightExcel } = load('lib/reports/insight-excel.ts');
const { reportExcel } = load('lib/reports/report-excel.ts');
const { excelFormats } = load('lib/reports/excel-workbook.ts');
async function reopen(book) {
  const result = new ExcelJS.Workbook();
  await result.xlsx.load(await book.xlsx.writeBuffer());
  return result;
}
function find(sheet, label, column = 2) {
  let cell;
  sheet.eachRow(row => { if (row.getCell(1).value === label) cell = row.getCell(column); });
  assert.ok(cell, `Missing ${label}`);
  return cell;
}
function text(book) {
  const cells = [];
  book.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => { if (typeof cell.value === 'string') cells.push(cell.value); })));
  return cells.join('\n');
}

test('five allowed dashboards export three styled sheets and preserve typed numbers, percentages, money and Vietnam dates', async () => {
  for (const role of ['administrator', 'owner', 'expert', 'manager', 'user']) {
    const book = await reopen(insightExcel(dashboardInsightsFixture(role)));
    assert.deepEqual(book.worksheets.map(sheet => sheet.name), ['Tổng quan', 'Xu hướng', 'Chi tiết']);
    const summary = book.getWorksheet('Tổng quan');
    assert.ok(summary.getCell('B7').value, `${role}: ${JSON.stringify(summary.getRows(5, 6).map(row => row.values))}`);
    assert.equal(summary.getCell('B7').value.toISOString(), '2026-11-01T00:00:00.000Z');
    assert.equal(summary.getCell('B10').value.toISOString(), '2026-11-15T12:00:00.000Z');
    assert.equal(summary.getCell('B7').numFmt, 'dd/mm/yyyy');
    assert.equal(summary.getCell('A13').font.color.argb, 'FFFFFFFF');
    assert.equal(summary.getCell('A13').fill.fgColor.argb, 'FF1E40AF');
    assert.equal(book.getWorksheet('Xu hướng').views[0].ySplit, 5);
    assert.equal(book.getWorksheet('Chi tiết').views[0].showGridLines, false);
    if (['administrator', 'owner'].includes(role)) {
      assert.equal(find(summary, 'Tỷ lệ thành công').value, (34 / 37 * 100) / 100);
      assert.equal(find(summary, 'Tỷ lệ thành công').numFmt, excelFormats.percent);
    }
    if (role === 'administrator') {
      assert.equal(find(summary, 'Thanh toán đã nhận').value, 4289000);
      assert.equal(find(summary, 'Thanh toán đã nhận').numFmt, excelFormats.money);
      assert.equal(find(summary, 'Thời gian xử lý AI').value, 82.5);
      assert.equal(find(summary, 'Thời gian xử lý AI').numFmt, excelFormats.duration);
    } else assert.ok(!text(book).includes('Thanh toán đã nhận'));
  }
  assert.throws(() => insightExcel(dashboardInsightsFixture('staff')), /không có quyền/);
});

test('zero remains numeric, missing values are explicit, and untrusted labels never become formulas or hyperlinks', async () => {
  const data = dashboardInsightsFixture('expert', 'month', true);
  data.distribution = [{ key: 'hostile', label: '=HYPERLINK("https://example.invalid","Mở")', value: 0 }];
  const book = await reopen(insightExcel(data));
  assert.equal(find(book.getWorksheet('Tổng quan'), 'Đã duyệt').value, 0);
  assert.equal(find(book.getWorksheet('Tổng quan'), 'Thời gian xác minh').value, 'Chưa có dữ liệu');
  const label = book.getWorksheet('Chi tiết').getCell('A7');
  assert.equal(label.value, data.distribution[0].label);
  assert.equal(label.type, ExcelJS.ValueType.String);
  assert.equal(label.formula, undefined);
  assert.equal(label.hyperlink, undefined);
  book.eachSheet(sheet => sheet.eachRow(row => row.eachCell(cell => assert.notEqual(cell.type, ExcelJS.ValueType.Formula))));
});

test('operational export includes exact comparisons, numeric point differences and grouped series; Owner excludes financial fields', async () => {
  const report = calendarReportFixture(new URLSearchParams('period=month&anchor=2026-10-01&comparison=year&granularity=week'));
  report.comparison.changes.success = { current: 75, previous: 50, difference: 25, changePercent: 50, unit: 'percentage_points', status: 'comparable' };
  report.comparison.changes.duration = { current: 45000, previous: 105000, difference: -60000, changePercent: -60000 / 105000 * 100, unit: 'percent', status: 'comparable' };
  const book = await reopen(reportExcel(report));
  const details = book.getWorksheet('Chi tiết');
  assert.equal(find(details, 'Tỷ lệ thành công').value, 0.75);
  assert.equal(find(details, 'Tỷ lệ thành công', 3).value, 0.5);
  assert.equal(find(details, 'Tỷ lệ thành công', 4).value, 25);
  assert.equal(find(details, 'Tỷ lệ thành công', 4).numFmt, excelFormats.points);
  assert.equal(find(details, 'Tỷ lệ thành công', 5).value, 0.5);
  assert.equal(find(details, 'Thời gian xử lý trung bình', 4).value, -60);
  const trend = book.getWorksheet('Xu hướng');
  assert.equal(trend.getRow(5).getCell(8).value, 'Tiền nhận (VND)');
  assert.equal(trend.getRow(6).getCell(3).value.toISOString().slice(0, 10), report.trend.buckets[0].current.date);
  assert.equal(trend.rowCount - 5, report.trend.buckets.length * 2);
  assert.ok(!text(book).includes('Tỷ lệ rủi ro cao'));
  assert.ok(!text(book).includes('Mức rủi ro'));
  report.role = 'owner';
  report.payments = null;
  const owner = await reopen(reportExcel(report));
  assert.ok(!text(owner).includes('Thanh toán đã nhận'));
  assert.ok(!text(owner).includes('Tiền nhận (VND)'));
  assert.ok(text(owner).includes('Tỷ lệ rủi ro cao'));
  assert.ok(text(owner).includes('Mức rủi ro'));
  assert.ok(!text(owner).includes('Không gian\n'));
});

test('empty exports stay valid and use explicit missing data rather than numeric zero for unknown durations', async () => {
  const report = calendarReportFixture(new URLSearchParams('period=month&comparison=none'), true);
  report.usage = [];
  const book = await reopen(reportExcel(report));
  assert.equal(find(book.getWorksheet('Tổng quan'), 'Hợp đồng tải lên').value, 0);
  assert.equal(find(book.getWorksheet('Tổng quan'), 'Thời gian xử lý trung bình').value, 'Chưa có dữ liệu');
  assert.ok(text(book).includes('Chưa có dữ liệu'));
});

test('export workflow locks duplicate clicks, releases on failure, supports retry and ignores unavailable data', async () => {
  const state = []; let cursor = 0, calls = 0, rejectFirst;
  let fail = true;
  const first = new Promise((_, reject) => { rejectFirst = reject; });
  const react = { useRef: value => ({ current: value }), useState: initial => { const index = cursor++; state[index] = initial; return [initial, value => { state[index] = value; }]; } };
  const exporter = { downloadExcelReport: () => { calls++; return fail ? first : Promise.resolve(); } };
  const { useExcelExport } = load('hooks/reports/use-excel-export.ts', { react, '@/lib/reports/excel-export': exporter });
  const hook = useExcelExport({ kind: 'insights', data: dashboardInsightsFixture() }, true);
  const a = hook.download(); const b = hook.download();
  await Promise.resolve(); await Promise.resolve();
  assert.equal(calls, 1);
  rejectFirst(new Error('write failed')); await Promise.all([a, b]);
  assert.equal(state[0], false); assert.match(state[1], /Không thể xuất Excel/);
  fail = false; await hook.download();
  assert.equal(calls, 2); assert.equal(state[1], null);
  await useExcelExport(null, false).download(); assert.equal(calls, 2);
});
