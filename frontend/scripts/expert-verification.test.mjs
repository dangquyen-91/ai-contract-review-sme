import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import { withBackendHelper } from './fixtures/inline-backend.mjs';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = withBackendHelper(ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText);
  vm.runInNewContext(source, { exports, require: (name) => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return jsx;
    throw new Error(`Missing dependency ${name}`);
  }, Date, Promise, ...globals });
  return exports;
}

class ApiClientError extends Error {
  constructor(message, code) { super(message); this.serverCode = code; }
}
const helpers = load('../lib/review/expert-verification.ts', {
  '@/lib/api/client': { isApiClientError: (error) => error instanceof ApiClientError },
});
const complete = { _id: 'review', versionId: 'version', status: 'completed', result: {} };

test('only a complete latest run for the displayed version can be sent', () => {
  assert.equal(helpers.latestVerifiableRun([complete], 'version'), complete);
  assert.equal(helpers.latestVerifiableRun([], 'version'), undefined);
  assert.equal(helpers.latestVerifiableRun([complete], 'different-version'), undefined);
  assert.equal(helpers.latestVerifiableRun([{ ...complete, result: { partial: true } }]), undefined);
  for (const status of ['running', 'queued', 'failed', 'cancelled']) {
    assert.equal(helpers.latestVerifiableRun([{ ...complete, status }, complete]), undefined);
  }
});

test('server verification errors give actionable Vietnamese copy', () => {
  for (const code of ['NO_EXPERT', 'REVIEW_OUTDATED', 'REVIEW_NOT_VERIFIABLE', 'VERIFICATION_EXISTS']) {
    assert.notEqual(helpers.verificationErrorMessage(new ApiClientError('raw', code)), 'raw');
  }
  assert.equal(helpers.verificationErrorMessage(new ApiClientError('Server explanation')), 'Server explanation');
});

test('status queries poll only while open and stop polling on errors', () => {
  const hooks = load('../hooks/expert-verification/use-expert-verification.ts', {
    '@tanstack/react-query': { useQuery: (options) => options },
    '@/lib/api/contracts': { contractsApi: {} },
    '@/lib/query-keys/contracts': { contractKeys: { lists: ['contracts', 'list'] } },
    '@/lib/api/expert-verification': { expertVerificationApi: {} },
    '@/lib/query-keys/expert-verification': { expertVerificationKeys: { detail: (id) => ['verification', id] } },
    '@/lib/review/expert-verification': helpers,
  });
  assert.equal(hooks.useExpertVerification('').enabled, false);
  const options = hooks.useExpertVerification('review');
  for (const status of ['requested', 'in_progress', 'approved', 'returned']) {
    assert.equal(options.refetchInterval({ state: { data: { verification: { status } } } }), ['requested', 'in_progress'].includes(status) ? 15000 : false);
  }
  assert.equal(options.refetchInterval({ state: { error: new Error(), data: { verification: { status: 'requested' } } } }), false);
});

test('sending never retries POST automatically and always reconciles server state', async () => {
  const invalidated = [];
  const cache = new Map();
  const hooks = load('../hooks/expert-verification/use-expert-verification.ts', {
    '@tanstack/react-query': {
      useMutation: (options) => options,
      useQueryClient: () => ({
        cancelQueries: async () => {},
        setQueryData: (key, updater) => cache.set(key.join('/'), updater(undefined)),
        invalidateQueries: async ({ queryKey }) => invalidated.push(queryKey.join('/')),
      }),
    },
    '@/lib/api/contracts': { contractsApi: {} },
    '@/lib/query-keys/contracts': { contractKeys: { lists: ['contracts', 'list'] } },
    '@/lib/api/expert-verification': { expertVerificationApi: { request: async (id, input) => ({ _id: 'verification', reviewId: id, ...input }) } },
    '@/lib/query-keys/expert-verification': { expertVerificationKeys: { detail: (id) => ['verification', id], runs: (id) => ['runs', id] } },
    '@/lib/review/expert-verification': helpers,
  });
  const mutation = hooks.useRequestExpertVerification('review', 'contract');
  assert.equal(mutation.retry, false);
  const result = await mutation.mutationFn({ consent: true });
  await mutation.onSuccess(result);
  assert.equal(cache.get('verification/review').verification._id, 'verification');
  await mutation.onSettled();
  assert.deepEqual(invalidated, ['contracts/list', 'verification/review', 'runs/contract']);
});

test('expert document exposes only full text and original file and keeps access locked until allowed', () => {
  const { VerificationDocument } = load('../components/expert-verification/verification-document.tsx', {
    'lucide-react': { Crosshair: () => null, ShieldCheck: () => null },
    '@/components/ui/button': { Button: ({ children, ...props }) => { delete props.variant; delete props.size; delete props.loading; return React.createElement('button', props, children); } },
    './expert-original-file': { ExpertOriginalFile: () => null },
    './expert-full-text': { ExpertFullText: () => React.createElement('p', null, 'Full text loaded') },
  });
  const workspace = { verification: { reviewId: 'review', attempt: 1, status: 'requested', shareOriginalFile: true }, document: { text: 'Masked text' }, clauses: [] };
  const render = (status, allowed) => renderToStaticMarkup(React.createElement(VerificationDocument, {
    workspace: { ...workspace, verification: { ...workspace.verification, status } },
    selection: null, canViewOriginal: allowed,
  }));
  const waiting = render('requested', false);
  assert.doesNotMatch(waiting, /Văn bản đã che|Masked text|Full text loaded/);
  assert.match(waiting, /disabled=""[^>]*>Văn bản đầy đủ<\/button>/);
  assert.match(waiting, /disabled=""[^>]*>Xem file gốc<\/button>/);
  assert.doesNotMatch(waiting, />Nhận xác minh<\/button>/);
  assert.match(waiting, /Nhận xác minh ở thanh phía trên/);
  const accepted = render('in_progress', true);
  assert.doesNotMatch(accepted, /disabled=""/);
  assert.doesNotMatch(accepted, />Nhận xác minh<\/button>/);
  assert.match(accepted, /Full text loaded/);
  assert.doesNotMatch(accepted, /Văn bản đã che|Masked text/);
  for (const status of ['approved', 'returned']) {
    const closed = render(status, false);
    assert.doesNotMatch(closed, /Masked text|Full text loaded/);
    assert.match(closed, /chỉ mở trong thời gian/);
  }
});

test('full text locates an unambiguous clause without using masked offsets', () => {
  let response = { isPending: false, isError: false, data: { text: 'Điều 1. Thanh toán\nNguyễn Minh An thanh toán trong 15 ngày.' } };
  const { ExpertFullText } = load('../components/expert-verification/expert-full-text.tsx', {
    '@/components/ui/button': { Button: ({ children }) => React.createElement('button', null, children) },
    '@/hooks/expert-verification/use-expert-original-file': { useExpertFullText: () => response },
  });
  const render = (clause) => renderToStaticMarkup(React.createElement(ExpertFullText, {
    reviewId: 'review', attempt: 1, clause, selection: { request: 1 },
  }));
  const html = render({ index: 1, title: 'Điều 1. Thanh toán', text: 'Điều 1. Thanh toán\nCá nhân 1 thanh toán trong 15 ngày.' });
  assert.match(html, /<mark[^>]*>Điều 1\. Thanh toán<\/mark>/);
  assert.match(html, /Nguyễn Minh An/);
  assert.doesNotMatch(html, /Cá nhân 1/);
  response = { ...response, data: { text: 'Điều 1. Thanh toán\nNội dung khác\nĐiều 1. Thanh toán' } };
  const ambiguous = render({ index: 1, title: 'Điều 1. Thanh toán', text: 'Không trùng với văn bản đầy đủ' });
  assert.doesNotMatch(ambiguous, /<mark/);
  assert.match(ambiguous, /Chưa định vị được chính xác/);
});

test('request form starts with consent unchecked and submit disabled', () => {
  const wrapper = ({ children }) => React.createElement('div', null, children);
  const dialog = Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle'].map((name) => [name, wrapper]));
  const { RequestVerificationDialog } = load('../components/expert-verification/request-verification-dialog.tsx', {
    'lucide-react': { ShieldCheck: () => null },
    '@/components/ui/dialog': dialog,
    '@/components/ui/button': { Button: ({ children, ...props }) => { delete props.loading; return React.createElement('button', props, children); } },
    '@/components/ui/checkbox': { Checkbox: ({ checked, ...props }) => { delete props.onCheckedChange; return React.createElement('input', { ...props, type: 'checkbox', checked, readOnly: true }); } },
  });
  const html = renderToStaticMarkup(React.createElement(RequestVerificationDialog, {
    title: 'Contract', findingCount: 3, pending: false, submitDisabled: false, error: '', onClose() {}, onSubmit: async () => {},
  }));
  assert.match(html, /type="submit" disabled=""/);
  assert.match(html, /maxLength="2000"/);
  assert.doesNotMatch(html.match(/<input\b[^>]*type="checkbox"[^>]*>/)?.[0] ?? '', /checked=""/);
  assert.doesNotMatch(html, /type="radio"/);
  assert.match(html, /đồng ý chia sẻ hợp đồng, gồm cả file gốc/);
});

test('new verification request sends permission for the original file in the same submission', () => {
  const { expertVerificationApi } = load('../lib/api/expert-verification.ts', {
    '@/lib/api/client': { apiRequest: (request) => request },
  });
  const request = expertVerificationApi.request('review', { consent: true, note: 'Kiểm tra điều khoản' });
  assert.equal(request.url, '/reviews/review/verification/request');
  assert.equal(request.method, 'POST');
  assert.deepEqual({ ...request.data }, { consent: true, note: 'Kiểm tra điều khoản', shareOriginalFile: true });
});

test('verification detail dialog reflects server states without implying approval on return', () => {
  const wrapper = ({ children }) => React.createElement('div', null, children);
  const dialog = Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle'].map((name) => [name, wrapper]));
  const display = load('../lib/review/verification-display.ts');
  const { VerificationRequestDialog } = load('../components/expert-verification/verification-request-dialog.tsx', {
    'lucide-react': { Check: () => null, Clock3: () => null, CornerUpLeft: () => null, RefreshCw: () => null },
    '@/components/ui/dialog': dialog,
    '@/components/ui/button': { Button: ({ children, ...props }) => { delete props.loading; return React.createElement('button', props, children); } },
    '@/lib/review/verification-display': display,
  });
  function render(status) {
    return renderToStaticMarkup(React.createElement(VerificationRequestDialog, {
      title: 'Contract',
      verification: { status, requestedAt: '2026-10-31T10:00:00Z', requestNote: '<script>test</script>', decisionNote: status === 'returned' ? 'Cần bổ sung thông tin.' : undefined },
      refreshing: false, onClose() {}, onRefresh() {}, onResend() {},
    }));
  }
  assert.match(render('requested'), /Đang chờ chuyên gia tiếp nhận/);
  assert.doesNotMatch(render('requested'), /Kết luận của chuyên gia/);
  assert.match(render('in_progress'), /Đang kiểm tra/);
  assert.match(render('approved'), /Kết luận của chuyên gia/);
  const returned = render('returned');
  assert.match(returned, /Lý do trả lại/);
  assert.match(returned, /Cần bổ sung thông tin/);
  assert.match(returned, /Gửi lại yêu cầu/);
  assert.doesNotMatch(returned, /Đã được chuyên gia kiểm tra/);
  assert.doesNotMatch(returned, /<script>/);
  assert.equal(display.verificationDate('invalid'), 'Chưa có thời gian');
});

test('proxy checks identity, role, review ID and origin before forwarding', async () => {
  let role = 'user';
  const { proxyExpertVerification } = load('../lib/api/expert-verification-proxy.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@/lib/auth/api-session': { getApiSession: async () => ({ user: { role }, accessToken: 'token' }) },
    '@/lib/api/request-origin': { isSameOriginRequest: () => false },
  });
  const invalid = await proxyExpertVerification({}, 'invalid', 'get');
  assert.equal(invalid.status, 400);
  role = 'expert';
  assert.equal((await proxyExpertVerification({}, 'a'.repeat(24), 'get')).status, 403);
  role = 'user';
  assert.equal((await proxyExpertVerification({}, 'a'.repeat(24), 'request')).status, 403);
});

test('proxy forwards consent and returns backend error codes without exposing tokens', async () => {
  let forwarded;
  const { proxyExpertVerification } = load('../lib/api/expert-verification-proxy.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@/lib/auth/api-session': { getApiSession: async () => ({ user: { role: 'staff' }, accessToken: 'server-token' }) },
    '@/lib/api/request-origin': { isSameOriginRequest: () => true },
  }, {
    process: { env: { API_BASE_URL: 'http://backend' } },
    fetch: async (url, options) => {
      forwarded = { url, options };
      return { status: 409, json: async () => ({ success: false, error: { code: 'NO_EXPERT', message: 'No expert' } }) };
    },
  });
  const response = await proxyExpertVerification({ text: async () => '{"consent":true,"note":"Please check"}' }, 'a'.repeat(24), 'request');
  assert.equal(forwarded.url, `http://backend/api/v1/reviews/${'a'.repeat(24)}/verification/request`);
  assert.equal(forwarded.options.method, 'POST');
  assert.equal(JSON.parse(forwarded.options.body).consent, true);
  assert.equal(forwarded.options.headers.Authorization, 'Bearer server-token');
  assert.equal(forwarded.options.cache, 'no-store');
  assert.equal(response.status, 409);
  assert.equal(response.body.error.code, 'NO_EXPERT');
  assert.doesNotMatch(JSON.stringify(response.body), /server-token/);
});
test('original file proxy requires an Expert and forwards bytes for the explicit attempt', async () => {
  let role = 'staff';
  const calls = [];
  const { proxyExpertWorkspace } = load('../lib/api/expert-workspace-proxy.ts', {
    'next/server': { NextResponse: Response },
    '@/lib/auth/api-session': { getApiSession: async () => ({ user: { role }, accessToken: 'fixture-token' }) },
    './request-origin': { isSameOriginRequest: () => true },
  }, {
    Response,
    AbortSignal,
    process: { env: {} },
    fetch: async (url, options) => {
      calls.push([url, options]);
      return new Response('original bytes', { headers: { 'Content-Type': 'application/pdf' } });
    },
  });
  const reviewId = 'a'.repeat(24);
  const request = new Request('http://localhost/original-file?attempt=2');
  const invoke = (search = request.url) => proxyExpertWorkspace({ method: request.method, signal: request.signal, nextUrl: new URL(search) }, reviewId, ['original-file']);
  assert.equal((await invoke()).status, 403);
  role = 'expert';
  assert.equal((await invoke('http://localhost/original-file')).status, 400);
  assert.equal(calls.length, 0);
  const response = await invoke();
  assert.match(calls[0][0], /original-file\?attempt=2$/);
  assert.equal(calls[0][1].headers.Authorization, 'Bearer fixture-token');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(response.headers.get('Content-Type'), 'application/pdf');
  assert.equal(await response.text(), 'original bytes');
});
