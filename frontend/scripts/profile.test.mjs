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
  vm.runInNewContext(source, { exports, Buffer, TextEncoder, FormData, AbortSignal, process: { env: {} }, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected module ${name}`);
    return dependencies[name];
  }, ...globals });
  return exports;
}
const profile = { user: { id: 'a'.repeat(24), name: 'Updated User', phone: '0901234567', avatarUrl: 'https://res.cloudinary.com/test/image/upload/new.webp', role: 'user', orgId: null }, organization: null };

test('profile validates trimmed names, optional phones and matching strong passwords', () => {
  const auth = load('../schemas/auth.schema.ts', { zod: { z } });
  const schemas = load('../schemas/profile.schema.ts', { zod: { z }, './auth.schema': auth });
  assert.equal(schemas.profileFormSchema.parse({ name: ' User Name ', phone: '' }).name, 'User Name');
  for (const phone of ['0901234567', '+84 901234567', '']) assert.equal(schemas.profileFormSchema.safeParse({ name: 'User', phone }).success, true);
  for (const phone of ['0-------', 'abc', '1'.repeat(21)]) assert.equal(schemas.profileFormSchema.safeParse({ name: 'User', phone }).success, false);
  const valid = { currentPassword: 'OldPassword123!', newPassword: 'NewPassword456!', confirmPassword: 'NewPassword456!' };
  assert.equal(schemas.changePasswordFormSchema.safeParse(valid).success, true);
  assert.equal(schemas.changePasswordFormSchema.safeParse({ ...valid, confirmPassword: 'Mismatch123456!' }).success, false);
  assert.equal(schemas.changePasswordFormSchema.safeParse({ ...valid, newPassword: 'short' }).success, false);
});

function proxyHarness(status = 200) {
  const calls = [];
  const { proxyProfile } = load('../lib/api/profile-proxy.ts', {
    'next/server': { NextRequest, NextResponse },
    '@/lib/request-origin': { isSameOriginRequest: request => request.headers.get('origin') === 'http://localhost' },
    '@/lib/auth-session': { userSessionCookie: 'lawscan_user', encodeSessionUser: user => JSON.stringify(user) },
    '@/lib/token-expiry': { rememberedCookieAge: () => ({ maxAge: 604800 }) },
    '@/lib/email-verification-session': { emailVerificationCookie: 'lawscan_email_verification' },
  }, { fetch: async (url, options) => { calls.push({ url, options }); return NextResponse.json(status === 200 ? { success: true, data: profile } : { success: false, error: { message: 'Invalid profile' } }, { status }); } });
  function run(method, action = '', body, headers = {}) {
    const isForm = body instanceof FormData;
    return proxyProfile(new NextRequest(`http://localhost/api/profile${action ? `/${action}` : ''}`, {
      method, headers: { cookie: 'lawscan_access=access; lawscan_refresh=refresh; lawscan_remember=1', origin: 'http://localhost', ...headers },
      ...(body === undefined ? {} : { body: isForm ? body : JSON.stringify(body) }),
    }), action);
  }
  return { calls, run, proxyProfile };
}

test('profile proxy authenticates requests and rejects cross-origin updates', async () => {
  const ctx = proxyHarness();
  assert.equal((await ctx.proxyProfile(new NextRequest('http://localhost/api/profile'))).status, 401);
  assert.equal((await ctx.run('PATCH', '', { name: 'Name' }, { origin: 'https://elsewhere.example' })).status, 403);
  assert.equal(ctx.calls.length, 0);
});

test('profile update refreshes the HttpOnly identity cookie so the header and sidebar receive current data', async () => {
  const ctx = proxyHarness();
  const response = await ctx.run('PATCH', '', { name: profile.user.name, phone: profile.user.phone });
  assert.equal(response.status, 200);
  assert.equal(ctx.calls[0].options.headers.Authorization, 'Bearer access');
  const cookie = response.cookies.get('lawscan_user');
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, 'lax');
  assert.equal(JSON.parse(cookie.value).name, profile.user.name);
  assert.equal(JSON.parse(cookie.value).avatarUrl, profile.user.avatarUrl);
  assert.equal(response.cookies.get('lawscan_access'), undefined);
  const rejected = await proxyHarness(400).run('PATCH', '', { name: 'x' });
  assert.equal(rejected.status, 400);
  assert.equal(rejected.headers.get('set-cookie'), null);
});

test('successful password changes clear sessions; incorrect current passwords preserve the session', async () => {
  const ctx = proxyHarness();
  const response = await ctx.run('POST', 'password', { currentPassword: 'OldPassword123!', newPassword: 'NewPassword456!' });
  assert.ok(ctx.calls[0].url.endsWith('/api/v1/profile/password'));
  for (const name of ['lawscan_access', 'lawscan_refresh', 'lawscan_remember', 'lawscan_user', 'lawscan_email_verification']) {
    assert.equal(response.cookies.get(name).value, '');
    assert.equal(response.cookies.get(name).maxAge, 0);
  }
  const rejected = await proxyHarness(400).run('POST', 'password', {});
  assert.equal(rejected.headers.get('set-cookie'), null);
});

test('avatar proxy enforces upload limits and forwards the file without a client-supplied user id', async () => {
  const ctx = proxyHarness();
  const data = new FormData();
  data.set('avatar', new Blob(['png'], { type: 'image/png' }), 'avatar.png');
  data.set('userId', 'another-user');
  const response = await ctx.run('POST', 'avatar', data);
  assert.equal(response.status, 200);
  assert.equal(ctx.calls[0].options.body.get('avatar').name, 'avatar.png');
  assert.equal(ctx.calls[0].options.body.get('userId'), null);
  const rejected = await ctx.run('POST', 'avatar', undefined, { 'content-length': String(3 * 1024 * 1024) });
  assert.equal(rejected.status, 413);
  assert.equal(ctx.calls.length, 1);
});

test('saving profile mutations updates shared identity data and invalidates dashboard summaries', async () => {
  const calls = [];
  const { useProfileUpdates } = load('../hooks/use-profile.ts', {
    '@tanstack/react-query': { useQueryClient: () => ({ setQueryData: (key, value) => calls.push({ key: [...key], value }), invalidateQueries: async options => calls.push({ invalidate: [...options.queryKey] }) }), useMutation: options => options },
    '@/lib/api/profile': { profileApi: { update() {}, avatar() {}, removeAvatar() {} } },
    '@/lib/query-keys/dashboard': { dashboardKeys: { all: ['dashboard'] } },
  });
  await useProfileUpdates().update.onSuccess(profile);
  assert.equal(calls[0].value.user.name, profile.user.name);
  assert.deepEqual(calls[0].key, ['account-profile']);
  assert.deepEqual(calls[1].invalidate, ['dashboard']);
});
