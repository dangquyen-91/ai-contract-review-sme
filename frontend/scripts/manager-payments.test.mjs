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
  vm.runInNewContext(source, { exports, URLSearchParams, AbortSignal, require: (name) => {
    if (!(name in dependencies)) throw new Error(`Missing module ${name}`);
    return dependencies[name];
  }, ...globals });
  return exports;
}

const state = load('../lib/subscription/payment-state.ts');
const labels = load('../lib/subscription/payment-labels.ts', { './payment-state': state });

test('each order reads as what it bought', () => {
  assert.equal(labels.paymentItemLabel({ purpose: 'subscription', planCode: 'business_pro', action: 'upgrade' }), 'Nâng cấp · Business Pro');
  assert.equal(labels.paymentItemLabel({ purpose: 'top_up', topUpKind: 'analysis', topUpUnits: 50, action: 'purchase' }), 'Mua thêm 50 lượt rà soát');
  assert.equal(labels.paymentItemLabel({ purpose: 'contract_review', reviewUnits: 2, action: 'purchase' }), 'Rà soát hợp đồng · 2 lượt');
});

test('the status badge distinguishes paid, activating, needing review and unpaid orders', () => {
  const badge = (order) => labels.paymentStatusBadge({ fulfilledAt: null, paidAt: null, providerError: null, status: 'pending', ...order }).label;
  assert.equal(badge({ fulfilledAt: 'x', paidAt: 'x', status: 'paid' }), 'Đã thanh toán');
  assert.equal(badge({ paidAt: 'x', status: 'paid' }), 'Đang kích hoạt');
  assert.equal(badge({ status: 'cancelled', providerError: 'Partial payment received' }), 'Cần kiểm tra');
  assert.equal(badge({ status: 'expired' }), 'Đã hết hạn');
  assert.equal(badge({}), 'Chờ thanh toán');
});

function proxy(role) {
  const calls = [];
  const route = load('../app/api/manager/payments/route.ts', {
    'next/server': { NextResponse },
    '@/lib/auth/api-session': { getApiSession: async () => ({ user: { role }, accessToken: 'token' }) },
  }, {
    process: { env: { API_BASE_URL: 'http://backend.test' } },
    fetch: async (url, options) => { calls.push({ url, options }); return Response.json({ success: true, data: [], meta: {} }); },
  });
  return { calls, get: (query) => route.GET(new NextRequest(`http://localhost/api/manager/payments${query}`)) };
}

test('only a Manager reaches the backend history', async () => {
  for (const role of ['administrator', 'owner', 'user', 'expert']) {
    const context = proxy(role);
    assert.equal((await context.get('')).status, 403);
    assert.equal(context.calls.length, 0);
  }
});

test('the proxy forwards only the known filters, with the Manager session', async () => {
  const context = proxy('manager');
  const response = await context.get('?page=2&limit=20&status=fulfilled&purpose=top_up&search=FPT&orgId=secret&admin=1');
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
  const url = new URL(context.calls[0].url);
  assert.equal(url.origin + url.pathname, 'http://backend.test/api/v1/manager/payments');
  assert.deepEqual([...url.searchParams.keys()], ['page', 'limit', 'status', 'purpose', 'search']);
  assert.equal(context.calls[0].options.headers.Authorization, 'Bearer token');
});
