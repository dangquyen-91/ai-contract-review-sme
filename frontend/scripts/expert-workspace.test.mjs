import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react/jsx-runtime') return jsx;
    throw new Error(`Missing dependency ${name}`);
  }, Date, Promise, AbortSignal, ...globals });
  return exports;
}
const helpers = load('../lib/review/verification-workspace.ts');
const summaryHelpers = load('../lib/review/verification-summary.ts');
test('queue filtering handles Vietnamese accents and sort without mutating server results', () => {
  const { filterVerificationQueue: filter } = load('../lib/review/verification-queue-list.ts');
  const rows = [
    { _id: 'a', requestedAt: '2026-11-02', contractId: { title: 'Đơn dịch vụ', type: 'service' } },
    { _id: 'b', requestedAt: '2026-11-01', contractId: { title: 'Hợp đồng lao động', type: 'labor' } },
  ];
  assert.equal(filter(rows, 'don dich vu', '', 'oldest')[0]._id, 'a');
  assert.equal(filter(rows, '', 'labor', 'oldest')[0]._id, 'b');
  assert.equal(filter(rows, '', '', 'oldest')[0]._id, 'b');
  assert.equal(filter(rows, '', '', 'newest')[0]._id, 'a');
  assert.equal(rows[0]._id, 'a');
  assert.equal(filter(rows, 'không tồn tại', '', 'oldest').length, 0);
});
test('completion totals distinguish verdicts and exclude rejected items from retained risks', () => {
  const rows = [
    { _id: '1', severity: 'high', verification: { verdict: 'confirmed' } },
    { _id: '2', severity: 'medium', verification: { verdict: 'adjusted' } },
    { _id: '3', severity: 'high', verification: { verdict: 'rejected' } },
    { _id: '4', severity: 'low', verification: { verdict: 'added' } },
    { _id: '5', severity: 'high' },
  ];
  assert.equal(JSON.stringify(summaryHelpers.verificationSummary(rows)), JSON.stringify({ confirmed: 1, adjusted: 1, rejected: 1, added: 1, pending: 1, high: 2, medium: 1, low: 1 }));
  assert.equal(summaryHelpers.nextPendingFinding(rows, '4')._id, '5');
  assert.equal(summaryHelpers.nextPendingFinding(rows, '5')._id, '5');
  assert.equal(summaryHelpers.nextPendingFinding(rows.slice(0, 4), '1'), undefined);
  assert.equal(summaryHelpers.nextPendingFinding([]), undefined);
});

test('expert return navigation keeps the query and rejects foreign or stale destinations', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const nav = load('../lib/review/verification-navigation.ts', {}, {
    URL, sessionStorage: storage, location: { pathname: '/expert-verification/my-work', search: '?page=2&status=returned' }, window: { scrollY: 350 },
  });
  nav.saveVerificationReturn('expert', '/expert-verification/' + 'a'.repeat(24) + '?attempt=2', { dataset: { verificationRow: 'row' }, getBoundingClientRect: () => ({ top: 75 }) });
  const saved = nav.readVerificationReturn('expert');
  assert.equal(saved.href, '/expert-verification/my-work?page=2&status=returned');
  assert.equal(saved.offset, 75);
  assert.equal(nav.readVerificationReturn('another-expert'), null);
  const key = [...values.keys()][0];
  for (const href of ['https://outside.example/expert-verification', '//outside.example/expert-verification', '/\\outside.example/expert-verification', '/contract', 'javascript:alert(1)']) {
    storage.setItem(key, JSON.stringify({ ...saved, href }));
    assert.equal(nav.readVerificationReturn('expert'), null);
  }
  storage.setItem(key, JSON.stringify({ ...saved, savedAt: Date.now() - 3600001 }));
  assert.equal(nav.readVerificationReturn('expert'), null);
});
test('only the expert who claimed an open verification may edit', () => {
  assert.equal(helpers.canEditVerification({ status: 'requested' }, 'expert'), false);
  assert.equal(helpers.canEditVerification({ status: 'in_progress', expertId: 'expert' }, 'expert'), true);
  assert.equal(helpers.canEditVerification({ status: 'in_progress', expertId: { _id: 'expert', name: 'Expert' } }, 'expert'), true);
  assert.equal(helpers.canEditVerification({ status: 'in_progress', expertId: 'another' }, 'expert'), false);
  assert.equal(helpers.canEditVerification({ status: 'approved', expertId: 'expert' }, 'expert'), false);
  assert.equal(helpers.canEditVerification({ status: 'returned', expertId: 'expert' }, 'expert'), false);
});

test('adjusting a severity does not overwrite other fields containing redacted text', () => {
  const finding = { title: 'Cá nhân 1', severity: 'high', problem: ['••••'], consequences: [], recommendations: [] };
  const changes = helpers.changedFindingFields(finding, { ...finding, severity: 'medium', riskCode: 'OTHER' });
  assert.equal(JSON.stringify(changes), '{"severity":"medium"}');
  assert.equal(Object.keys(helpers.changedFindingFields(finding, { ...finding, riskCode: 'OTHER' })).length, 0);
});

test('finding validation matches backend title, reason and bullet limits', () => {
  const { verificationFindingSchema } = load('../schemas/verification-finding.schema.ts', { zod: { z }, '@/config/risk-display': { riskCodeLabels: { OTHER: 'Other' } } });
  const valid = { title: 'Rủi ro', severity: 'high', riskCode: 'OTHER', problem: 'Một vấn đề', consequences: '', recommendations: '', reason: '', clauseIndex: '0' };
  assert.equal(verificationFindingSchema.safeParse(valid).success, true);
  for (const change of [{ title: ' ' }, { problem: ' ' }, { problem: Array(21).fill('Ý').join('\n') }, { problem: 'a'.repeat(2001) }, { reason: 'a'.repeat(2001) }, { clauseIndex: '-1' }, { severity: 'critical' }]) {
    assert.equal(verificationFindingSchema.safeParse({ ...valid, ...change }).success, false);
  }
});

function proxyFixture({ role = 'expert', sameOrigin = true, response = { status: 200, ok: true, json: async () => ({ success: true, data: { title: 'UNMASKED' } }) } } = {}) {
  const calls = [];
  const { proxyExpertWorkspace } = load('../lib/api/expert-workspace-proxy.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@/lib/auth/api-session': { getApiSession: async () => ({ user: { role }, accessToken: 'private-token' }) },
    './request-origin': { isSameOriginRequest: () => sameOrigin },
  }, { process: { env: { API_BASE_URL: 'http://fixture' } }, fetch: async (url, options) => { calls.push({ url, options }); return response; } });
  return { calls, proxy: proxyExpertWorkspace };
}
const id = 'a'.repeat(24);
const request = (method = 'GET', status = 'all') => ({ method, nextUrl: { searchParams: new URLSearchParams({ status }) }, text: async () => '{}' });

test('historical workspace forwards only valid attempts and uses a separate cache entry', async () => {
  const fixture = proxyFixture();
  const archived = request();
  archived.nextUrl.searchParams.set('attempt', '2');
  assert.equal((await fixture.proxy(archived, id, ['workspace'])).status, 200);
  assert.equal(fixture.calls[0].url, `http://fixture/api/v1/reviews/${id}/verification/workspace?attempt=2`);
  for (const value of ['0', '-1', '1.5', '100001', '../start', '']) {
    archived.nextUrl.searchParams.set('attempt', value);
    assert.equal((await fixture.proxy(archived, id, ['workspace'])).status, 400);
  }
  assert.equal(fixture.calls.length, 1);
  const { expertVerificationKeys: keys } = load('../lib/query-keys/expert-verification.ts');
  assert.notEqual(JSON.stringify(keys.workspace(id)), JSON.stringify(keys.workspace(id, 2)));
  assert.notEqual(JSON.stringify(keys.workspace(id, 1)), JSON.stringify(keys.workspace(id, 2)));
});

test('my work proxy scopes by server identity and forwards only supported filters', async () => {
  let role = 'owner';
  const calls = [];
  const { proxyMyExpertWork } = load('../lib/api/expert-work-proxy.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@/lib/auth/api-session': { getApiSession: async () => ({ user: { role }, accessToken: 'private-token' }) },
  }, { process: { env: { API_BASE_URL: 'http://fixture' } }, URLSearchParams, fetch: async (url, options) => {
    calls.push({ url, options });
    return { status: 200, json: async () => ({ success: true, data: { items: [], total: 0 } }) };
  } });
  const req = request();
  req.nextUrl.searchParams = new URLSearchParams({ status: 'approved', search: 'Hợp đồng A&B', from: '2026-10-01', to: '2026-10-31', type: 'service', page: '2', limit: '10', expertId: 'other-expert' });
  assert.equal((await proxyMyExpertWork(req)).status, 403);
  assert.equal(calls.length, 0);
  role = 'expert';
  const result = await proxyMyExpertWork(req);
  const url = new URL(calls[0].url);
  assert.equal(url.searchParams.get('expertId'), null);
  assert.equal(url.searchParams.get('search'), 'Hợp đồng A&B');
  assert.equal(url.searchParams.get('page'), '2');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(result.headers['Cache-Control'], 'no-store');
  assert.doesNotMatch(JSON.stringify(result), /private-token/);
});

test('work list applies new filters from page one and does not reuse another filter result', () => {
  let state;
  const options = [];
  const keys = load('../lib/query-keys/expert-verification.ts').expertVerificationKeys;
  const { useMyVerifications } = load('../hooks/expert-verification/use-my-verifications.ts', {
    react: { useEffect() {} },
    nuqs: {
      parseAsString: { withDefault: value => ({ value }) },
      parseAsStringLiteral: () => ({ withDefault: value => ({ value }) }),
      useQueryStates: (params) => { state ??= Object.fromEntries(Object.entries(params).map(([key, parser]) => [key, parser.value])); return [state, (next) => { state = { ...state, ...next }; }]; },
    },
    '@/hooks/shared/use-pagination-page': { paginationPageParser: { value: 1 } },
    '@tanstack/react-query': { useQuery: (value) => { options.push(value); return {}; } },
    '@/lib/api/expert-workspace': { expertWorkspaceApi: {} },
    '@/lib/query-keys/expert-verification': { expertVerificationKeys: keys },
  });
  let controller = useMyVerifications();
  controller.setPage(3);
  controller = useMyVerifications();
  assert.equal(controller.filter.page, 3);
  controller.applyFilters({ status: 'returned', search: 'test' });
  controller = useMyVerifications();
  assert.equal(controller.filter.page, 1);
  assert.equal(controller.filter.status, 'returned');
  assert.notEqual(JSON.stringify(options[0].queryKey), JSON.stringify(options.at(-1).queryKey));
  assert.equal(options.at(-1).placeholderData, undefined);
  controller.resetFilters();
  assert.equal(useMyVerifications().filter.search, '');
});

test('expert proxy rejects other roles, foreign origins, invalid filters and unsupported paths', async () => {
  const denied = proxyFixture({ role: 'owner' });
  assert.equal((await denied.proxy(request())).status, 403);
  assert.equal(denied.calls.length, 0);
  const fixture = proxyFixture();
  assert.equal((await fixture.proxy(request('GET', 'approved'))).status, 400);
  assert.equal((await fixture.proxy(request(), id, ['file'])).status, 400);
  assert.equal((await fixture.proxy(request('DELETE'), id, ['findings', 'invalid'])).status, 400);
  const foreign = proxyFixture({ sameOrigin: false });
  assert.equal((await foreign.proxy(request('POST'), id, ['start'])).status, 403);
  assert.equal(foreign.calls.length, 0);
});

test('mutation proxy discards original finding response and normalizes delete 204', async () => {
  const fixture = proxyFixture();
  const result = await fixture.proxy(request('PUT'), id, ['findings', id]);
  assert.equal(result.body.data, null);
  assert.doesNotMatch(JSON.stringify(result), /UNMASKED|private-token/);
  assert.equal(fixture.calls[0].options.headers.Authorization, 'Bearer private-token');
  const removed = proxyFixture({ response: { status: 204, ok: true } });
  assert.equal((await removed.proxy(request('DELETE'), id, ['findings', id])).status, 200);
});

test('workspace GET passes the dedicated redacted response and preserves conflict codes', async () => {
  const fixture = proxyFixture({ response: { status: 200, ok: true, json: async () => ({ success: true, data: { document: { text: 'Cá nhân 1' } } }) } });
  const result = await fixture.proxy(request(), id, ['workspace']);
  assert.equal(result.body.data.document.text, 'Cá nhân 1');
  assert.equal(fixture.calls[0].url, `http://fixture/api/v1/reviews/${id}/verification/workspace`);
  const conflict = proxyFixture({ response: { status: 409, ok: false, json: async () => ({ success: false, error: { code: 'VERIFICATION_NOT_OPEN' } }) } });
  assert.equal((await conflict.proxy(request('POST'), id, ['start'])).body.error.code, 'VERIFICATION_NOT_OPEN');
});

test('expert login destination uses the platform overview without an organization', () => {
  const { routes } = load('../config/routes.ts');
  assert.equal(routes.home('expert'), '/expert-verification/overview');
  const { workspacePath } = load('../lib/routing/workspace-path.ts', { '@/config/routes': { routes } });
  assert.equal(workspacePath({ role: 'expert', orgId: null, hasCompletedOnboarding: true }), '/expert-verification/overview');
});

test('overview loads personal assignments separately from the shared waiting queue', async () => {
  const statuses = [], refreshed = [];
  const queries = {
    in_progress: { data: [{ _id: 'mine' }], dataUpdatedAt: 2000, isFetching: false, refetch: async () => { refreshed.push('mine'); } },
    requested: { data: Array(100).fill({ _id: 'waiting' }), dataUpdatedAt: 3000, isFetching: false, refetch: async () => { refreshed.push('waiting'); } },
  };
  const { useVerificationOverview } = load('../hooks/expert-verification/use-verification-overview.ts', {
    './use-verification-workspace': { useVerificationQueue: (status) => { statuses.push(status); return queries[status]; } },
  });
  const overview = useVerificationOverview();
  assert.deepEqual(statuses, ['in_progress', 'requested']);
  assert.equal(overview.assigned.data.length, 1);
  assert.equal(overview.waiting.data.length, 100);
  assert.equal(overview.updatedAt, 2000);
  await overview.refresh();
  assert.deepEqual(refreshed, ['mine', 'waiting']);
});

const findingHelpers = load('../lib/review/verification-findings.ts');
test('rejected findings stay available but do not enter active risk totals', () => {
  const rows = [{ severity: 'high' }, { severity: 'high', verification: { verdict: 'rejected' } }, { severity: 'low', verification: { verdict: 'added' } }];
  const active = findingHelpers.activeRiskFindings(rows);
  assert.equal(active.length, 2);
  assert.equal(active.filter(row => row.severity === 'high').length, 1);
  assert.equal(rows.length, 3);
});

test('history comparison distinguishes unchanged snapshots, additions and removals', () => {
  const before = { title: 'Tiêu đề', severity: 'high', problem: ['Một vấn đề'] };
  assert.equal(findingHelpers.verificationSnapshotChanges(before, { ...before, problem: [...before.problem] }).length, 0);
  assert.equal(findingHelpers.verificationSnapshotChanges(before, { ...before, severity: 'medium' })[0].key, 'severity');
  assert.equal(findingHelpers.verificationSnapshotChanges(undefined, before).length, 3);
  assert.equal(findingHelpers.verificationSnapshotChanges(before, null).length, 3);
});

test('proposal and history render actual saved text and escape markup', () => {
  const { FindingProposedRevision } = load('../components/expert-verification/finding-proposed-revision.tsx');
  const proposal = renderToStaticMarkup(React.createElement(FindingProposedRevision, { revision: { revisedText: '<script>proposal</script>', reason: 'Làm rõ thời hạn.' } }));
  assert.match(proposal, /chưa thay đổi văn bản hợp đồng/);
  assert.match(proposal, /Chưa có đoạn gốc/);
  assert.doesNotMatch(proposal, /<script>/);
  const { VerificationActionComparison } = load('../components/expert-verification/verification-action-comparison.tsx', {
    '@/config/risk-display': { riskCodeLabels: { OTHER: 'Khác' } },
    '@/lib/review/verification-findings': findingHelpers,
  });
  const html = renderToStaticMarkup(React.createElement(VerificationActionComparison, { action: { action: 'adjust', before: { severity: 'high' }, after: { severity: 'medium' } } }));
  assert.match(html, /Cao/); assert.match(html, /Trung bình/);
  assert.match(html, /Trước/); assert.match(html, /Sau/);
});

test('requester result sync survives header remounts and refreshes on a new expert action', async () => {
  const cache = new Map(), invalidations = [];
  const client = {
    getQueryData: key => cache.get(JSON.stringify(key)),
    setQueryData: (key, value) => cache.set(JSON.stringify(key), value),
    invalidateQueries: async ({ queryKey }) => invalidations.push(JSON.stringify(queryKey)),
    removeQueries: ({ queryKey }) => cache.delete(JSON.stringify(queryKey)),
  };
  const { useVerificationResultSync } = load('../hooks/expert-verification/use-verification-result-sync.ts', {
    react: { useEffect: fn => fn() },
    '@tanstack/react-query': { useQueryClient: () => client },
    '@/lib/query-keys/contracts': { contractKeys: { result: id => ['contracts', id, 'review-result'], findings: id => ['contracts', id, 'findings'], detail: id => ['contracts', id, 'detail'], chat: id => ['contracts', id, 'chat'], lists: ['contracts', 'list'] } },
    '@/lib/query-keys/dashboard': { dashboardKeys: { all: ['dashboard'] } },
  });
  const result = { verification: { reviewId: 'review', attempt: 1, status: 'approved' }, actions: [{ _id: 'action' }] };
  useVerificationResultSync('contract', result, 1);
  await Promise.resolve();
  const count = invalidations.length;
  assert.ok(invalidations.includes('["contracts","contract","review-result"]'));
  useVerificationResultSync('contract', { ...result }, 2);
  assert.equal(invalidations.length, count);
  useVerificationResultSync('contract', { ...result, actions: [...result.actions, { _id: 'next-action' }] }, 3);
  assert.ok(invalidations.length > count);
});
