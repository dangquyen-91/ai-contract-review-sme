import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
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
  assert.deepEqual(invalidated, ['verification/review', 'runs/contract']);
});

test('request form starts with consent unchecked and submit disabled', () => {
  const wrapper = ({ children }) => React.createElement('div', null, children);
  const dialog = Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle'].map((name) => [name, wrapper]));
  const { RequestVerificationDialog } = load('../components/expert-verification/request-verification-dialog.tsx', {
    'lucide-react': { ShieldCheck: () => null },
    '@/components/ui/dialog': dialog,
    '@/components/ui/button': { Button: ({ children, loading, ...props }) => React.createElement('button', props, children) },
    '@/components/ui/checkbox': { Checkbox: ({ checked, onCheckedChange, ...props }) => React.createElement('input', { ...props, type: 'checkbox', checked, readOnly: true }) },
  });
  const html = renderToStaticMarkup(React.createElement(RequestVerificationDialog, {
    title: 'Contract', findingCount: 3, pending: false, submitDisabled: false, error: '', onClose() {}, onSubmit: async () => {},
  }));
  assert.match(html, /type="submit" disabled=""/);
  assert.match(html, /maxLength="2000"/);
  assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /đồng ý chia sẻ/);
});

test('verification detail dialog reflects server states without implying approval on return', () => {
  const wrapper = ({ children }) => React.createElement('div', null, children);
  const dialog = Object.fromEntries(['Dialog', 'DialogContent', 'DialogDescription', 'DialogFooter', 'DialogHeader', 'DialogTitle'].map((name) => [name, wrapper]));
  const display = load('../lib/review/verification-display.ts');
  const { VerificationRequestDialog } = load('../components/expert-verification/verification-request-dialog.tsx', {
    'lucide-react': { Check: () => null, Clock3: () => null, CornerUpLeft: () => null, RefreshCw: () => null },
    '@/components/ui/dialog': dialog,
    '@/components/ui/button': { Button: ({ children, loading, ...props }) => React.createElement('button', props, children) },
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
