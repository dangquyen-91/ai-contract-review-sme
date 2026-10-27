import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { NextRequest, NextResponse } from 'next/server.js';

function load(file, deps = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, URL, URLSearchParams, Number, Boolean, Promise, Error, AbortSignal, process: { env: {} },
    require: (name) => { if (!(name in deps)) throw new Error(`Missing module ${name}`); return deps[name]; }, ...globals });
  return exports;
}
const planCodes = ['personal_free', 'personal_pro', 'business_starter', 'business_pro'];
const state = load('../lib/payment-state.ts');
const originCheck = load('../lib/request-origin.ts');
const returns = load('../lib/auth-return.ts', { './workspace-path': { workspacePath: () => '/dashboard/owner' }, '@/types/subscription': { planCodes } });
const order = { orderCode: 1234567890123, orgId: 'a'.repeat(24), planCode: 'business_starter', action: 'purchase',
  amount: 499000, currency: 'VND', status: 'pending', checkoutUrl: 'https://pay.payos.vn/web/test',
  qrCode: null, expiresAt: '2026-10-19T10:00:00Z', paidAt: null, fulfilledAt: null, fulfillmentError: null, providerError: null };
const plan = { code: 'business_starter', audience: 'business', price: 499000, memberLimit: 5 };
const current = { status: 'none', plan: null, scheduledDowngrade: null, members: { count: 1 } };
const user = { role: 'owner', orgId: order.orgId, email: 'owner@example.com' };

test('a paid order is not shown as successfully activated until fulfilledAt exists', () => {
  assert.equal(state.paymentMessage({ ...order, status: 'paid', paidAt: 'now' }).success, false);
  assert.equal(state.paymentMessage({ ...order, status: 'paid', fulfilledAt: 'now' }).success, true);
  assert.equal(state.isUnfinishedPayment({ ...order, status: 'paid', paidAt: 'now' }), true);
  assert.equal(state.isUnfinishedPayment({ ...order, fulfilledAt: 'now' }), false);
});

test('cancelled, expired and partial orders remain distinct from successful payment', () => {
  for (const status of ['cancelled', 'expired', 'failed']) {
    assert.equal(state.paymentMessage({ ...order, status }).success, false);
    assert.equal(state.isUnfinishedPayment({ ...order, status }), false);
  }
  assert.equal(state.isUnfinishedPayment({ ...order, status: 'cancelled', providerError: 'Partial payment received' }), true);
});

test('checkout accepts only the payOS hosted HTTPS origin', () => {
  assert.equal(state.safeCheckoutUrl(order.checkoutUrl), order.checkoutUrl);
  for (const value of ['https://pay.payos.vn.evil.test', 'javascript:alert(1)', 'http://pay.payos.vn', 'https://evil.test', 'https://user@pay.payos.vn', 'https://pay.payos.vn:444', null]) {
    assert.equal(state.safeCheckoutUrl(value), null);
  }
});

test('payment action follows active plan, full-price upgrades and scheduled downgrades', () => {
  assert.equal(state.paymentAction(current, plan), 'purchase');
  const active = { ...current, status: 'active', plan };
  assert.equal(state.paymentAction(active, plan), 'renew');
  assert.equal(state.paymentAction(active, { ...plan, code: 'business_pro', price: 999000 }), 'upgrade');
  assert.equal(state.paymentAction({ ...active, plan: { ...plan, price: 999000 }, scheduledDowngrade: { planCode: plan.code } }, plan), 'downgrade');
});

test('password, Google and OTP destinations preserve payment context and prioritize invitations', () => {
  const target = '/thanh-toan/ket-qua?orderCode=1234567890123';
  assert.equal(returns.authDestination(user, undefined, target), target);
  assert.equal(returns.authDestination(user, 'a'.repeat(64), target), `/loi-moi?token=${'a'.repeat(64)}`);
  assert.equal(returns.safeAuthReturn('/goi-dich-vu/xac-nhan?plan=business_pro&status=PAID'), '/goi-dich-vu/xac-nhan?plan=business_pro');
  for (const target of ['https://evil.test', '//evil.test', '/\\evil.test', '/thanh-toan/ket-qua?orderCode=1e9', '/goi-dich-vu/xac-nhan?plan=unknown', ['value']]) {
    assert.equal(returns.safeAuthReturn(target), null);
  }
});

function proxy(fetch) {
  let activeRequest;
  const handler = load('../lib/api/payment-proxy.ts', {
    'next/server': { NextRequest, NextResponse }, '@/lib/request-origin': originCheck,
    '@/lib/auth/api-session': { getApiSession: async () => activeRequest?.cookies.get('lawscan_access')?.value ? { accessToken: activeRequest.cookies.get('lawscan_access').value } : { error: NextResponse.json({ success: false }, { status: 401 }) } },
  }, { fetch }).proxyPayment;
  return (request, ...args) => { activeRequest = request; return handler(request, ...args); };
}
function req(method, body, headers = {}) {
  return new NextRequest(`http://localhost:3000/api/organizations/${order.orgId}/payments`, {
    method, headers: { cookie: 'lawscan_access=test-token', origin: 'http://localhost:3000', ...headers },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}
test('payment proxy forwards a stable key, authenticated token and original plan body', async () => {
  let captured;
  const forward = proxy(async (url, options) => { captured = { url, options }; return Response.json({ success: true, data: order }, { status: 201 }); });
  const response = await forward(req('POST', { planCode: plan.code, action: 'purchase' }, { 'Idempotency-Key': 'checkout-test-0001' }), order.orgId);
  assert.equal(response.status, 201);
  assert.equal(captured.options.headers.Authorization, 'Bearer test-token');
  assert.equal(captured.options.headers['Idempotency-Key'], 'checkout-test-0001');
  assert.deepEqual(JSON.parse(captured.options.body), { planCode: plan.code, action: 'purchase' });
  assert.equal(captured.url, `http://localhost:4000/api/v1/organizations/${order.orgId}/payments`);
});

test('payment proxy rejects missing sessions, cross-origin POST and invalid identifiers before upstream', async () => {
  let count = 0;
  const forward = proxy(async () => { count++; return Response.json({}); });
  assert.equal((await forward(req('POST', {}, { cookie: '' }), order.orgId)).status, 401);
  assert.equal((await forward(req('POST', {}, { origin: 'https://evil.test' }), order.orgId)).status, 403);
  assert.equal((await forward(req('POST', {}), order.orgId)).status, 400);
  assert.equal((await forward(req('GET'), 'bad')).status, 400);
  assert.equal((await forward(req('GET'), order.orgId, '../other')).status, 400);
  assert.equal(count, 0);
});

test('same-origin validation accepts the real Host when Next normalizes localhost and rejects spoofed origins', () => {
  const normalized = { nextUrl: new URL('http://localhost:3000/api'), headers: new Headers({ host: '127.0.0.1:3000', origin: 'http://127.0.0.1:3000' }) };
  assert.equal(originCheck.isSameOriginRequest(normalized), true);
  normalized.headers.set('origin', 'http://evil.test');
  assert.equal(originCheck.isSameOriginRequest(normalized), false);
  normalized.headers.set('x-forwarded-host', 'evil.test');
  assert.equal(originCheck.isSameOriginRequest(normalized), false);
});

test('sync proxy preserves backend paid-but-not-activated errors without issuing a checkout', async () => {
  let url;
  const forward = proxy(async (input) => { url = input; return Response.json({ success: false, error: { message: 'Activation pending' } }, { status: 503 }); });
  const response = await forward(req('POST'), order.orgId, String(order.orderCode), 'sync');
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.message, 'Activation pending');
  assert.ok(url.endsWith(`/${order.orderCode}/sync`));
});

test('provider connection errors return an ambiguous-state warning instead of claiming payment failed', async () => {
  const response = await proxy(async () => { throw new Error('private upstream info'); })(req('GET'), order.orgId);
  assert.equal(response.status, 503);
  assert.match((await response.json()).error.message, /Kiểm tra lịch sử/);
});

function find(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => find(child, predicate));
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return find(node.type(node.props), predicate);
  return [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)];
}
function checkoutHarness({ subscription = current, items = [], create = async () => order, schedule = async () => {}, account = user } = {}) {
  let cursor = 0;
  const slots = [], navigation = [], calls = [];
  const history = { data: { items }, isPending: false, refetch: async () => {} };
  const deps = {
    react: {
      useRef: (initial) => slots[cursor++] ??= { current: initial },
      useState: (initial) => { const index = cursor++; if (!(index in slots)) slots[index] = initial; return [slots[index], value => { slots[index] = value; }]; },
    },
    'react/jsx-runtime': jsx,
    'next/link': { __esModule: true, default: props => jsx.jsx('a', props) },
    '@/components/ui/button': { Button: props => props.asChild ? props.children : jsx.jsx('button', props) },
    '@/components/ui/icon': { Icon: props => jsx.jsx('svg', props) },
    '@/hooks/use-subscription-management': { useSubscriptionManagement: () => ({ subscription: { data: subscription, isPending: false }, schedule: { mutateAsync: schedule } }) },
    '@/hooks/use-payments': { usePaymentHistory: () => history },
    '@/lib/api/payments': { paymentsApi: { create: async (...args) => { calls.push(args); return create(...args); } } },
    '@/lib/payment-state': state,
    '@/lib/workspace-path': { workspacePath: () => '/chon-to-chuc' },
    '@/lib/subscription-plans': { formatMoney: value => `${value}đ` },
    './payment-history': { PaymentHistory: () => null },
  };
  const globals = { crypto: { randomUUID: () => 'stable-test-key' }, window: { location: { assign: value => navigation.push(value) } } };
  deps['@/hooks/use-payment-checkout'] = load('../hooks/use-payment-checkout.ts', deps, globals);
  deps['./workspace-checkout'] = load('../components/subscription/workspace-checkout.tsx', deps, globals);
  const Component = load('../components/subscription/payment-checkout.tsx', deps, globals).PaymentCheckout;
  return { calls, navigation, render: () => { cursor = 0; return find(Component({ plan, user: account }), () => true); } };
}
const text = node => Array.isArray(node) ? node.map(text).join('') : node?.props ? text(node.props.children) : node ?? '';

test('rapid checkout clicks create one request and navigate only to its returned payOS URL', async () => {
  let resolve;
  const pending = new Promise(yes => { resolve = yes; });
  const ctx = checkoutHarness({ create: () => pending });
  const button = ctx.render().find(n => n.type === 'button');
  const first = button.props.onClick(); await button.props.onClick();
  assert.equal(ctx.calls.length, 1);
  resolve(order); await first;
  assert.deepEqual(ctx.navigation, [order.checkoutUrl]);
});

test('uncertain checkout retries reuse the key and do not claim success or navigate', async () => {
  const ctx = checkoutHarness({ create: async () => { throw new Error('Network lost'); } });
  await ctx.render().find(n => n.type === 'button').props.onClick();
  await ctx.render().find(n => n.type === 'button').props.onClick();
  assert.equal(ctx.calls.length, 2);
  assert.equal(ctx.calls[0][2], ctx.calls[1][2]);
  assert.equal(ctx.navigation.length, 0);
  assert.ok(ctx.render().some(n => n.props?.role === 'alert' && text(n).includes('Network lost')));
});

test('an existing unfinished order blocks a new purchase and staff have no checkout action', () => {
  assert.equal(checkoutHarness({ items: [order] }).render().filter(n => n.type === 'button').length, 0);
  const ctx = checkoutHarness({ account: { ...user, role: 'staff' } });
  assert.equal(ctx.render().filter(n => n.type === 'button').length, 0);
  assert.equal(ctx.calls.length, 0);
});

test('paid but unactivated checkout responses return to order details instead of charging again', async () => {
  const ctx = checkoutHarness({ create: async () => ({ ...order, status: 'paid', paidAt: 'now' }) });
  await ctx.render().find(n => n.type === 'button').props.onClick();
  assert.deepEqual(ctx.navigation, [`/thanh-toan/ket-qua?orderCode=${order.orderCode}`]);
});

test('downgrade must be scheduled before a payment is created', async () => {
  let scheduled = 0;
  const ctx = checkoutHarness({ subscription: { ...current, status: 'active', plan: { ...plan, code: 'business_pro', price: 999000 } }, schedule: async () => { scheduled++; } });
  await ctx.render().find(n => n.type === 'button').props.onClick();
  assert.equal(scheduled, 1); assert.equal(ctx.calls.length, 0);
});
