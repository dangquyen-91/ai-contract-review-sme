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
  vm.runInNewContext(source, { exports, Buffer, URL, URLSearchParams, process: { env: {} },
    require: (name) => { if (!(name in deps)) throw new Error(`Missing module ${name}`); return deps[name]; }, ...globals });
  return exports;
}

const storage = load('../lib/email-verification-session.ts');
const navigation = load('../lib/auth-return.ts', {
  './workspace-path': { workspacePath: () => '/dashboard/user' },
  '@/types/subscription': { planCodes: ['personal_pro'] },
});
const challenge = {
  verificationRequired: true, challengeId: 'a'.repeat(64), email: 'member@example.com',
  expiresAt: new Date(Date.now() + 600_000).toISOString(), resendAfterSeconds: 60,
};
const invitationToken = 'b'.repeat(64);
const returnTo = '/goi-dich-vu/xac-nhan?plan=personal_pro';

test('verification navigation preserves the originating form, invitation and safe destination', () => {
  for (const mode of ['login', 'register']) {
    const links = navigation.emailVerificationNavigation(mode, invitationToken, returnTo);
    const url = new URL(links.verificationHref, 'http://localhost');
    assert.equal(url.pathname, '/xac-minh-email');
    assert.equal(url.searchParams.get('mode'), mode);
    assert.equal(url.searchParams.get('invitationToken'), invitationToken);
    assert.equal(url.searchParams.get('returnTo'), returnTo);
    assert.ok(links.backHref.startsWith(mode === 'login' ? '/dang-nhap?' : '/dang-ky?'));
    assert.equal(url.searchParams.has('challengeId'), false);
    assert.equal(url.searchParams.has('email'), false);
  }
  const invalid = navigation.emailVerificationNavigation('login', 'bad-token', '//external.example');
  assert.equal(invalid.backHref, '/dang-nhap');
  assert.equal(invalid.verificationHref, '/xac-minh-email?mode=login');
});

test('reload restores the challenge and elapsed resend cooldown, including expired OTPs that can be resent', () => {
  const now = Date.now();
  const encoded = storage.encodeEmailVerification(challenge, now);
  assert.equal(storage.decodeEmailVerification(encoded, now + 25_000).resendAfterSeconds, 35);
  assert.equal(storage.decodeEmailVerification(encoded, now + 65_000).resendAfterSeconds, 0);
  assert.equal(storage.decodeEmailVerification(encoded, now + 700_000).challengeId, challenge.challengeId);
  assert.equal(storage.decodeEmailVerification(encoded, now + 3_600_000), null);
  assert.equal(storage.decodeEmailVerification('corrupt'), null);
  assert.equal(storage.decodeEmailVerification(storage.encodeEmailVerification({ ...challenge, challengeId: 'bad' })), null);
});

test('submitting either auth form navigates to the OTP route when verification is required', async () => {
  for (const mode of ['login', 'register']) {
    const pushed = [];
    const renderForm = load('../hooks/use-auth-form.ts', {
      '@hookform/resolvers/zod': { zodResolver: () => null },
      'next/navigation': { useRouter: () => ({ push: (href) => pushed.push(href) }) },
      react: { useState: (value) => [value, () => {}] },
      'react-hook-form': { useWatch: () => '', useForm: () => ({ control: {}, handleSubmit: (submit) => submit }) },
      sonner: { toast: {} },
      '@/hooks/use-auth': { useAuthMutation: () => ({ mutateAsync: async () => challenge }) },
      '@/lib/api/client': { isApiClientError: () => false },
      '@/lib/auth-return': navigation, '@/schemas/auth.schema': {},
    }).useAuthForm;
    const form = renderForm({ mode, invitationToken, invitedEmail: challenge.email, returnTo });
    await form.onSubmit({ mode, email: challenge.email, password: 'example' });
    assert.deepEqual(pushed, [navigation.emailVerificationNavigation(mode, invitationToken, returnTo).verificationHref]);
  }
});

function routeHarness() {
  let result = { success: true, data: challenge };
  const api = load('../app/api/auth/[action]/route.ts', {
    'next/server': { NextRequest, NextResponse }, 'node:crypto': {},
    '@/lib/auth-session': { userSessionCookie: 'lawscan_user', encodeSessionUser: () => 'user' },
    '@/lib/token-expiry': { tokenMaxAge: () => 900, rememberedCookieAge: () => ({}) },
    '@/lib/request-origin': {}, '@/lib/email-verification-session': storage,
  }, { fetch: async () => ({ ok: true, status: 200, json: async () => result }) });
  return {
    setResult: (data) => { result = { success: true, data }; },
    post: (action) => api.POST(new NextRequest(`http://localhost/api/auth/${action}`, {
      method: 'POST', body: JSON.stringify({ email: challenge.email, password: 'example' }),
    }), { params: Promise.resolve({ action }) }),
  };
}

test('login/register and resend persist an HttpOnly challenge; successful verification and logout clear it', async () => {
  const api = routeHarness();
  for (const action of ['login', 'register', 'resend-verification']) {
    const response = await api.post(action);
    const cookie = response.cookies.get(storage.emailVerificationCookie);
    assert.equal(cookie.httpOnly, true);
    assert.equal(cookie.sameSite, 'lax');
    assert.equal(storage.decodeEmailVerification(cookie.value).email, challenge.email);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
  api.setResult({ accessToken: 'access', refreshToken: 'refresh', user: { email: challenge.email } });
  for (const action of ['verify-email', 'login', 'logout']) {
    const response = await api.post(action);
    assert.equal(response.cookies.get(storage.emailVerificationCookie).maxAge, 0);
  }
});

test('OTP route renders the saved challenge and redirects missing or invalid sessions to the originating form', async () => {
  let saved = storage.encodeEmailVerification(challenge);
  const Content = () => null;
  const page = load('../app/(auth)/xac-minh-email/page.tsx', {
    'react/jsx-runtime': jsx,
    'next/headers': { cookies: async () => ({ get: () => ({ value: saved }) }) },
    'next/navigation': { redirect: (href) => { throw new Error(`redirect:${href}`); } },
    '@/components/auth/auth-brand-panel': { AuthBrandPanel: () => null },
    '@/components/auth/auth-shell': { AuthShell: () => null },
    '@/components/auth/email-verification-content': { EmailVerificationContent: Content },
    '@/lib/auth-return': navigation, '@/lib/email-verification-session': storage,
  }).default;
  const searchParams = Promise.resolve({ mode: 'register', invitationToken, returnTo });
  const view = await page({ searchParams });
  assert.equal(view.props.children.type, Content);
  assert.equal(view.props.children.props.initialChallenge.challengeId, challenge.challengeId);
  assert.equal(view.props.children.props.invitationToken, invitationToken);
  assert.equal(view.props.children.props.returnTo, returnTo);
  for (saved of [undefined, 'invalid']) {
    await assert.rejects(page({ searchParams }), (error) => error.message === `redirect:${navigation.emailVerificationNavigation('register', invitationToken, returnTo).backHref}`);
  }
});
