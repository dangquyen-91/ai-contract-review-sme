import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';
import { withBackendHelper } from './fixtures/inline-backend.mjs';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = withBackendHelper(ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText);
  vm.runInNewContext(source, { exports, URL, URLSearchParams, AbortSignal, require: (name) => {
    if (!(name in dependencies)) throw new Error(`Missing module ${name}`);
    return dependencies[name];
  }, ...globals });
  return exports;
}

const jobs = load('../lib/admin/ai-job-labels.ts');
const audit = load('../lib/admin/audit-labels.ts', { '@/config/dashboard-roles': load('../config/dashboard-roles.ts') });

test('a stuck job is flagged above its status, and only waiting or running jobs can be cancelled', () => {
  assert.deepEqual({ ...jobs.aiJobBadge({ status: 'running', stuck: true }) }, { label: 'Có thể bị treo', tone: 'warning' });
  assert.equal(jobs.aiJobBadge({ status: 'queued', stuck: true }).label, 'Chờ quá lâu');
  assert.equal(jobs.aiJobBadge({ status: 'failed', stuck: false }).label, 'Thất bại');
  assert.deepEqual(['queued', 'running', 'completed', 'failed', 'cancelled'].map((status) => jobs.canCancelAiJob({ status })), [true, true, false, false, false]);
});

test('durations read in Vietnamese, and an unfinished job counts from when it started or was queued', () => {
  assert.equal(jobs.formatDuration(45_000), '45 giây');
  assert.equal(jobs.formatDuration(125_000), '2 phút 5 giây');
  assert.equal(jobs.formatDuration(3_600_000), '1 giờ');
  assert.equal(jobs.formatDuration(null), '—');
  const now = Date.parse('2026-11-28T10:30:00Z');
  assert.equal(jobs.aiJobElapsedMs({ status: 'running', startedAt: '2026-11-28T10:00:00Z', createdAt: '2026-11-28T09:00:00Z', durationMs: null }, now), 30 * 60_000);
  assert.equal(jobs.aiJobElapsedMs({ status: 'queued', startedAt: null, createdAt: '2026-11-28T10:20:00Z', durationMs: null }, now), 10 * 60_000);
  assert.equal(jobs.aiJobElapsedMs({ status: 'completed', startedAt: 'x', createdAt: 'x', durationMs: 5000 }, now), 5000);
  assert.equal(jobs.aiJobElapsedMs({ status: 'failed', startedAt: null, createdAt: 'x', durationMs: null }, now), null);
});

test('the analysis steps follow the stored stage statuses', () => {
  const steps = jobs.aiJobSteps({ stages: { segmentation: 'completed', summary: 'running' } });
  assert.deepEqual([...steps].map((step) => `${step.label}:${step.statusLabel}`), ['Tách điều khoản:Xong', 'Tóm tắt:Đang chạy', 'Phát hiện rủi ro:Chưa chạy']);
  // Cancelling interrupts the running step; that is a stop, not an error.
  const cancelled = jobs.aiJobSteps({ status: 'cancelled', stages: { segmentation: 'failed' } });
  assert.deepEqual([...cancelled].map((step) => step.status), ['stopped', 'pending', 'pending']);
  assert.equal(cancelled[0].statusLabel, 'Đã dừng');
  assert.equal(jobs.aiJobSteps({ status: 'failed', stages: { segmentation: 'failed' } })[0].statusLabel, 'Lỗi');
});

test('audit events read as Vietnamese actions, with risky ones highlighted', () => {
  assert.equal(audit.auditActionLabel('member.remove'), 'Xóa thành viên');
  assert.equal(audit.auditActionLabel('future.action'), 'future.action');
  assert.equal(audit.auditTone('user.delete'), 'danger');
  assert.equal(audit.auditTone('ai_job.cancel'), 'danger');
  assert.equal(audit.auditTone('subscription.schedule_downgrade'), 'warning');
  assert.equal(audit.auditTone('template.publish'), 'neutral');
  assert.equal(audit.actorLabel({ role: 'system', name: 'Hệ thống' }), 'Hệ thống');
  assert.equal(audit.actorLabel({ role: 'manager', name: 'An' }), 'An · Quản lý hệ thống');
});

test('recorded changes become readable rows', () => {
  const rows = (changes) => [...audit.describeAuditChanges(changes)].map((row) => `${row.label}: ${row.value}`);
  assert.deepEqual(rows({ isActive: { from: true, to: false }, name: { from: 'A', to: 'B' } }), ['Trạng thái: Đang hoạt động → Đã khóa', 'Họ tên: A → B']);
  assert.deepEqual(rows({ amount: 499000, purpose: 'top_up', action: 'upgrade' }), ['Số tiền: 499.000 ₫', 'Loại giao dịch: Mua thêm lượt', 'Hành động: Nâng cấp']);
  assert.deepEqual(rows({ fields: ['title', 'status'] }), ['Trường đã sửa: Tên văn bản, Tình trạng hiệu lực']);
  assert.deepEqual(rows({ effectiveAt: '2026-12-01T17:00:00.000Z' }), ['Hiệu lực từ: 2/12/2026']);
  assert.deepEqual(rows({ status: { from: 'running', to: 'cancelled' }, refunded: true }), ['Trạng thái tác vụ: Đang xử lý → Đã hủy', 'Hoàn lượt: Đã hoàn lại cho tài khoản']);
  const [edit, plain] = audit.describeAuditChanges({ role: { from: 'staff', to: 'expert' }, version: 3 });
  assert.deepEqual({ before: edit.before, after: edit.after }, { before: 'Nhân viên', after: 'Chuyên gia' });
  assert.deepEqual({ before: plain.before, after: plain.after }, { before: null, after: '3' });
  assert.equal(audit.auditTargetTypeLabel('review'), 'Tác vụ rà soát');
  assert.deepEqual(rows(null), []);
});

function proxy(role) {
  const calls = [];
  const helper = load('../lib/api/admin-operations-proxy.ts', {
    'next/server': { NextResponse },
    '@/lib/auth/api-session': { getApiSession: async () => ({ user: { role }, accessToken: 'token' }) },
  }, {
    process: { env: { API_BASE_URL: 'http://backend.test' } },
    fetch: async (url, options) => { calls.push({ url, options }); return Response.json({ success: true, data: [], meta: {} }); },
  });
  const route = (file) => load(file, { '@/lib/api/admin-operations-proxy': helper });
  return {
    calls,
    jobs: route('../app/api/admin/ai-jobs/route.ts'),
    overview: route('../app/api/admin/ai-jobs/overview/route.ts'),
    cancel: route('../app/api/admin/ai-jobs/[id]/cancel/route.ts'),
    audit: route('../app/api/admin/audit-log/route.ts'),
  };
}
const request = (path, method = 'GET') => new NextRequest(`http://localhost/api${path}`, { method });
const cancelContext = (id) => ({ params: Promise.resolve({ id }) });
const jobId = '0123456789abcdef01234567';

test('only an Administrator reaches the AI monitor and the audit log', async () => {
  for (const role of ['manager', 'owner', 'staff', 'expert', 'user']) {
    const context = proxy(role);
    assert.equal((await context.jobs.GET(request('/admin/ai-jobs'))).status, 403);
    assert.equal((await context.overview.GET(request('/admin/ai-jobs/overview'))).status, 403);
    assert.equal((await context.audit.GET(request('/admin/audit-log'))).status, 403);
    assert.equal((await context.cancel.POST(request(`/admin/ai-jobs/${jobId}/cancel`, 'POST'), cancelContext(jobId))).status, 403);
    assert.equal(context.calls.length, 0);
  }
});

test('the proxies forward only the known filters, uncached, with the Administrator session', async () => {
  const context = proxy('administrator');
  const response = await context.jobs.GET(request('/admin/ai-jobs?page=2&limit=20&status=stuck&errorCode=AI_OVERLOADED&search=FPT&orgId=secret'));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  await context.audit.GET(request('/admin/audit-log?group=user&search=a&from=2026-11-01&to=2026-11-28&actorId=x'));
  await context.overview.GET(request('/admin/ai-jobs/overview?debug=1'));
  const [list, log, overview] = context.calls.map((call) => new URL(call.url));
  assert.equal(list.pathname, '/api/v1/admin/ai-jobs');
  assert.deepEqual([...list.searchParams.keys()], ['page', 'limit', 'status', 'errorCode', 'search']);
  assert.deepEqual([...log.searchParams.keys()], ['group', 'search', 'from', 'to']);
  assert.equal(overview.href, 'http://backend.test/api/v1/admin/ai-jobs/overview');
  assert.equal(context.calls[0].options.headers.Authorization, 'Bearer token');
});

test('cancelling posts to the job and rejects malformed ids before the backend', async () => {
  const context = proxy('administrator');
  assert.equal((await context.cancel.POST(request('/admin/ai-jobs/abc/cancel', 'POST'), cancelContext('abc'))).status, 400);
  assert.equal(context.calls.length, 0);
  assert.equal((await context.cancel.POST(request(`/admin/ai-jobs/${jobId}/cancel`, 'POST'), cancelContext(jobId))).status, 200);
  assert.equal(context.calls[0].url, `http://backend.test/api/v1/admin/ai-jobs/${jobId}/cancel`);
  assert.equal(context.calls[0].options.method, 'POST');
});
