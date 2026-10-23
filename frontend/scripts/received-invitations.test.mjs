import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { NextRequest, NextResponse } from 'next/server.js';

function harness({ data = [], error, request = async () => ({ user: { role: 'staff' } }) } = {}) {
  const calls = [];
  const slots = [];
  let cursor = 0;
  const deps = {
    'react/jsx-runtime': jsx,
    react: {
      useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
      useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
    },
    'next/navigation': { useRouter: () => ({ replace: path => calls.push(path), refresh: () => calls.push('refresh') }) },
    '@tanstack/react-query': {
      useQueryClient: () => ({}),
      useQuery: () => ({ data, error, refetch: async () => calls.push('refetch') }),
      useMutation: options => ({ isPending: false, mutateAsync: options.mutationFn }),
    },
    sonner: { toast: { success() {}, error: () => calls.push('error') } },
    '@/components/ui/button': { Button: props => jsx.jsx('button', props) },
    '@/components/ui/icon': { Icon: () => null },
    '@/lib/api/client': { apiRequest: async input => { calls.push(input); return request(input); } },
    '@/lib/session-cache': { clearSessionCache: async () => calls.push('clear') },
    '@/lib/workspace-path': { workspacePath: () => '/dashboard/staff' },
  };
  const source = ts.transpileModule(fs.readFileSync(new URL('../components/invitations/received-invitations.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, Intl, Date, Error, require: name => {
    if (!(name in deps)) throw new Error(`Unexpected dependency: ${name}`);
    return deps[name];
  } });
  return { calls, render: () => { cursor = 0; return exports.ReceivedInvitations(); } };
}
function find(node, predicate) {
  if (Array.isArray(node)) return node.flatMap(child => find(child, predicate));
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return find(node.type(node.props), predicate);
  return [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)];
}
const data = [{ id: 'a'.repeat(24), organizationName: 'Test company', role: 'staff', expiresAt: '2026-10-27T00:00:00Z' }];

test('no invitations leaves the dashboard unobstructed; a failed request offers a retry', async () => {
  assert.equal(harness().render(), null);
  const ctx = harness({ error: new Error('Offline') });
  const alert = find(ctx.render(), n => n.props?.role === 'alert');
  assert.equal(alert.length, 1);
  await find(ctx.render(), n => n.type === 'button')[0].props.onClick();
  assert.deepEqual(ctx.calls, ['refetch']);
});

test('accepting an inbox invitation blocks duplicate clicks and navigates with the new session', async () => {
  let resolve;
  const pending = new Promise(done => { resolve = done; });
  const ctx = harness({ data, request: () => pending });
  const buttons = find(ctx.render(), n => n.type === 'button');
  buttons[0].props.onClick();
  await buttons[0].props.onClick();
  assert.equal(ctx.calls.length, 1);
  assert.equal(ctx.calls[0].data.invitationId, data[0].id);
  resolve({ user: { role: 'staff' } });
  await new Promise(setImmediate);
  assert.deepEqual(ctx.calls.slice(1), ['clear', '/dashboard/staff', 'refresh']);
  assert.equal(find(ctx.render(), n => n.type === 'button')[0].props.disabled, true);
});

test('declining refreshes notifications without changing the active organization or navigating', async () => {
  const ctx = harness({ data });
  await find(ctx.render(), n => n.type === 'button')[1].props.onClick();
  await new Promise(setImmediate);
  assert.equal(ctx.calls[0].url, '/invitations/received');
  assert.equal(ctx.calls[0].data.invitationId, data[0].id);
  assert.deepEqual(ctx.calls.slice(1), ['refetch']);
});

function proxyRoute(file, fetch, authenticated = true) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const dependencies = {
    'next/server': { NextRequest, NextResponse },
    '@/lib/auth/api-session': { getApiSession: async () => authenticated ? { accessToken: 'old-access' } : { error: NextResponse.json({ success: false }, { status: 401 }) } },
    '@/lib/auth-session': { userSessionCookie: 'lawscan_user', encodeSessionUser: user => JSON.stringify(user) },
    '@/lib/token-expiry': { tokenMaxAge: () => 900, rememberedCookieAge: () => ({ maxAge: 604800 }) },
    '@/lib/request-origin': { isSameOriginRequest: request => request.headers.get('origin') === 'http://localhost' },
  };
  vm.runInNewContext(source, { exports, fetch, process: { env: {} }, require: name => dependencies[name] });
  return exports;
}

test('accepting a received invitation updates HttpOnly session cookies without exposing tokens to browser JS', async () => {
  const route = proxyRoute('../app/api/invitations/accept/route.ts', async (url, options) => {
    assert.ok(url.endsWith(`/received/${data[0].id}/accept`));
    assert.equal(options.headers.Authorization, 'Bearer old-access');
    return NextResponse.json({ success: true, data: { user: { role: 'staff', orgId: 'company' }, accessToken: 'new-access', refreshToken: 'new-refresh' } });
  });
  const response = await route.POST(new NextRequest('http://localhost/api/invitations/accept', {
    method: 'POST', headers: { cookie: 'lawscan_access=old-access', 'content-type': 'application/json', origin: 'http://localhost' }, body: JSON.stringify({ invitationId: data[0].id }),
  }));
  assert.equal(response.status, 200);
  assert.equal(response.cookies.get('lawscan_access').value, 'new-access');
  assert.equal(response.cookies.get('lawscan_refresh').value, 'new-refresh');
  assert.match(response.headers.get('set-cookie'), /HttpOnly/i);
  const payload = await response.json();
  assert.equal(payload.data.user.orgId, 'company');
  assert.equal(payload.data.accessToken, undefined);
  assert.equal(payload.data.refreshToken, undefined);
});

test('inbox proxy requires authentication and rejects cross-origin declines', async () => {
  let calls = 0;
  const route = proxyRoute('../app/api/invitations/received/route.ts', async () => { calls++; return NextResponse.json({ success: true, data: [] }); }, false);
  assert.equal((await route.GET(new NextRequest('http://localhost/api/invitations/received'))).status, 401);
  assert.equal((await route.POST(new NextRequest('http://localhost/api/invitations/received', {
    method: 'POST', headers: { cookie: 'lawscan_access=access', origin: 'http://elsewhere' }, body: JSON.stringify({ invitationId: data[0].id }),
  }))).status, 403);
  assert.equal(calls, 0);
});
