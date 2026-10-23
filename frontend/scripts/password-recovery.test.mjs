import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server.js';

function load(file, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, TextEncoder, Buffer, URL, URLSearchParams, Error, Date,
    process: { env: {} }, require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected module ${name}`);
      return dependencies[name];
    }, ...globals });
  return exports;
}

test('recovery forms normalize email and enforce code, password length, byte limit and confirmation', () => {
  const schemas = load('../schemas/auth.schema.ts', { zod: { z } });
  assert.equal(schemas.forgotPasswordFormSchema.parse({ email: ' PERSON@EXAMPLE.COM ' }).email, 'person@example.com');
  const input = { code: '012345', password: 'NewPassword123!', confirmPassword: 'NewPassword123!' };
  assert.equal(schemas.resetPasswordFormSchema.safeParse(input).success, true);
  for (const change of [{ code: '123' }, { password: 'short' }, { confirmPassword: 'DifferentPassword123!' }, { password: 'é'.repeat(37), confirmPassword: 'é'.repeat(37) }]) {
    assert.equal(schemas.resetPasswordFormSchema.safeParse({ ...input, ...change }).success, false);
  }
});

function routeHarness() {
  const calls = [];
  let payload = { success: true, data: { challengeId: 'a'.repeat(64), resendAfterSeconds: 60 } };
  const route = load('../app/api/auth/[action]/route.ts', {
    'next/server': { NextRequest, NextResponse }, 'node:crypto': {},
    '@/lib/auth-session': { userSessionCookie: 'lawscan_user' },
    '@/lib/token-expiry': {},
    '@/lib/request-origin': { isSameOriginRequest: request => request.headers.get('origin') === 'http://localhost' },
    '@/lib/email-verification-session': { emailVerificationCookie: 'lawscan_email_verification' },
  }, { fetch: async (url, options) => { calls.push({ url, options }); return { ok: true, status: url.endsWith('forgot-password') ? 202 : 200, json: async () => payload }; } });
  return {
    calls, setPayload: value => { payload = value; },
    post: (action, body, origin = 'http://localhost') => route.POST(new NextRequest(`http://localhost/api/auth/${action}`, {
      method: 'POST', headers: { origin, cookie: 'lawscan_access=old; lawscan_refresh=old' }, body: JSON.stringify(body),
    }), { params: Promise.resolve({ action }) }),
  };
}

test('forgot password does not log out an existing session; reset clears cookies and never logs in automatically', async () => {
  const route = routeHarness();
  const sent = await route.post('forgot-password', { email: 'user@example.com' });
  assert.equal(sent.status, 202);
  assert.equal(sent.headers.get('cache-control'), 'no-store');
  assert.equal(sent.headers.get('set-cookie'), null);
  assert.equal((await sent.json()).data.challengeId.length, 64);
  route.setPayload({ success: true, data: { reset: true } });
  const result = await route.post('reset-password', { challengeId: 'a'.repeat(64), code: '012345', password: 'NewPassword123!' });
  assert.equal(result.status, 200);
  assert.equal((await result.json()).data.reset, true);
  for (const name of ['lawscan_access', 'lawscan_refresh', 'lawscan_remember', 'lawscan_user', 'lawscan_email_verification']) {
    assert.equal(result.cookies.get(name).value, '');
    assert.equal(result.cookies.get(name).httpOnly, true);
    assert.equal(result.cookies.get(name).maxAge, 0);
  }
  assert.equal(JSON.parse(route.calls[1].options.body).code, '012345');
});

test('password reset proxies reject cross-origin submissions before contacting the backend', async () => {
  const route = routeHarness();
  for (const action of ['forgot-password', 'reset-password']) {
    assert.equal((await route.post(action, {}, 'https://elsewhere.example')).status, 403);
  }
  assert.equal(route.calls.length, 0);
});

function hookHarness(api = {}) {
  const slots = [], calls = [];
  let cursor = 0, now = 100000, tick = () => {};
  class Clock extends Date { static now() { return now; } }
  const exports = load('../hooks/use-password-recovery.ts', {
    react: {
      useRef: initial => { const i = cursor++; return slots[i] ??= { current: initial }; },
      useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = value; }]; },
      useEffect: fn => fn(),
    },
    '@tanstack/react-query': {
      useQueryClient: () => ({}),
      useMutation: options => ({ isPending: false, mutateAsync: options.mutationFn, reset() {} }),
    },
    '@/lib/api/auth': { authApi: {
      forgotPassword: api.forgotPassword ?? (async email => { calls.push(email); return { challengeId: 'a'.repeat(64), expiresAt: 'later', resendAfterSeconds: 60 }; }),
      resetPassword: api.resetPassword ?? (async input => { calls.push(input); return { reset: true }; }),
    } },
    '@/lib/query-keys/auth': { authMutationKeys: { forgotPassword: ['auth', 'forgot-password'], resetPassword: ['auth', 'reset-password'] } },
    '@/lib/session-cache': { clearSessionCache: async () => { calls.push('clear'); } },
  }, { Date: Clock, setInterval: fn => { tick = fn; return 1; }, clearInterval() {} });
  return {
    calls, render: () => { cursor = 0; return exports.usePasswordRecovery(); },
    advance: ms => { now += ms; tick(); },
  };
}

test('recovery workflow sends a normalized email, enforces cooldown and resets without assigning an organization or signing in', async () => {
  const ctx = hookHarness();
  await ctx.render().send(' PERSON@EXAMPLE.COM ');
  let hook = ctx.render();
  assert.equal(hook.challenge.email, 'person@example.com');
  assert.equal(hook.remaining, 60);
  assert.equal(await hook.send('person@example.com'), false);
  ctx.advance(61000);
  hook = ctx.render();
  assert.equal(hook.remaining, 0);
  assert.equal(await hook.submit({ code: '012345', password: 'NewPassword123!' }), true);
  hook = ctx.render();
  assert.equal(hook.done, true);
  assert.equal(hook.challenge, null);
  assert.equal(ctx.calls[0], 'person@example.com');
  assert.equal(ctx.calls[1].challengeId, 'a'.repeat(64));
  assert.equal(ctx.calls[2], 'clear');
});

test('rapid reset clicks submit only once and a failed submission can be retried', async () => {
  let resolve, count = 0;
  const pending = new Promise(done => { resolve = done; });
  const ctx = hookHarness({ resetPassword: async () => { count++; if (count === 1) await pending; else return { reset: true }; throw new Error('Invalid code'); } });
  await ctx.render().send('user@example.com');
  const hook = ctx.render();
  const first = hook.submit({ code: '012345', password: 'NewPassword123!' });
  assert.equal(await hook.submit({ code: '012345', password: 'NewPassword123!' }), false);
  assert.equal(count, 1);
  resolve();
  assert.equal(await first, false);
  assert.equal(await ctx.render().submit({ code: '123456', password: 'NewPassword123!' }), true);
  assert.equal(count, 2);
});
