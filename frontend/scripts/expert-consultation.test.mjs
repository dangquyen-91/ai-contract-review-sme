import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import * as icons from 'lucide-react';
import { renderToStaticMarkup } from 'react-dom/server';
import { JSDOM } from 'jsdom';
import { z } from 'zod';

function load(file, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    if (name in dependencies) return dependencies[name];
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return jsx;
    if (name === 'lucide-react') return icons;
    throw new Error(`Missing dependency ${name}`);
  }, Date, Set, Promise, crypto, ...globals });
  return exports;
}
const isApiClientError = error => Boolean(error?.status);
const helpers = load('../lib/expert-consultation/chat.ts', { '@/lib/api/client': { isApiClientError } });
const schema = load('../schemas/expert-chat.schema.ts', { zod: { z } });
const keys = load('../lib/query-keys/expert-consultation.ts');
const message = (id, content = id, senderType = 'expert') => ({ id, content, senderType, senderId: 'person', attempt: 1, clientMessageId: id, createdAt: '2026-11-17T12:00:00Z' });
const page = (items, status = 'in_progress') => ({ attempt: 1, status, canSend: status === 'in_progress', items, hasMore: false, nextBefore: items[0]?.id, nextAfter: items.at(-1)?.id });

test('history keeps server ordering across pages and removes overlap without sorting ObjectIds', () => {
  const messages = helpers.conversationMessages([page([message('a'), message('b')]), page([message('z'), message('a')])]);
  assert.equal(messages.map(item => item.id).join(','), 'z,a,b');
});

test('validation trims and rejects blank, long and reserved-prefix messages', () => {
  assert.equal(schema.expertChatMessageSchema.parse('  Xin chào  '), 'Xin chào');
  for (const content of ['', '   ', 'a'.repeat(2001), 'enc:v1:fake']) {
    assert.equal(schema.expertChatMessageSchema.safeParse(content).success, false);
  }
});

test('cache separates attempts and participant sides; polling stops when closed or failed', () => {
  assert.notDeepEqual(keys.expertConsultationKeys.messages('r', 1, 'expert'), keys.expertConsultationKeys.messages('r', 2, 'expert'));
  assert.notDeepEqual(keys.expertConsultationKeys.messages('r', 1, 'expert'), keys.expertConsultationKeys.messages('r', 1, 'requester'));
  const hook = load('../hooks/expert-consultation/use-expert-chat.ts', {
    '@tanstack/react-query': { useInfiniteQuery: options => options, useMutation: options => options, useQueryClient: () => ({}) },
    react: { useRef: value => ({ current: value }), useState: value => [value, () => {}], useMemo: fn => fn() },
    '@/lib/api/expert-consultation': { expertConsultationApi: {} },
    '@/lib/query-keys/expert-consultation': keys,
    '@/lib/expert-consultation/chat': helpers,
    '@/schemas/expert-chat.schema': schema,
  });
  const chat = hook.useExpertChat('review', 1, 'expert');
  assert.equal(chat.query.retry, false);
  assert.equal(chat.mutation.retry, false);
  for (const status of ['requested', 'in_progress', 'returned', 'approved']) {
    assert.equal(chat.query.refetchInterval({ state: { data: { pages: [page([], status)] } } }), ['requested', 'in_progress'].includes(status) ? 5000 : false);
  }
  assert.equal(chat.query.refetchInterval({ state: { error: new Error(), data: { pages: [page([])] } } }), false);
});

test('proxy enforces authentication, role, origin, and forwards cursors without caching', async () => {
  let session = { user: { role: 'expert' }, accessToken: 'test-token' };
  let origin = true;
  const calls = [];
  const proxy = load('../lib/api/expert-consultation-proxy.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@/lib/auth/api-session': { getApiSession: async () => session },
    '@/lib/api/request-origin': { isSameOriginRequest: () => origin },
  }, { URLSearchParams, AbortSignal, process: { env: {} }, fetch: async (...args) => {
    calls.push(args); return { status: 200, json: async () => ({ success: true, data: page([]) }) };
  } });
  const request = { nextUrl: { searchParams: new URLSearchParams('attempt=2&after=aaaaaaaaaaaaaaaaaaaaaaaa&unexpected=secret') }, text: async () => '{"content":"hello"}' };
  const id = 'b'.repeat(24);
  const response = await proxy.proxyExpertConsultation(request, id, 'GET');
  assert.equal(response.status, 200);
  assert.equal(response.headers['Cache-Control'], 'no-store');
  assert.match(calls[0][0], /attempt=2&after=a{24}/);
  assert.doesNotMatch(calls[0][0], /unexpected/);
  assert.equal(calls[0][1].cache, 'no-store');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer test-token');
  origin = false;
  assert.equal((await proxy.proxyExpertConsultation(request, id, 'POST')).status, 403);
  assert.equal((await proxy.proxyExpertConsultation(request, 'bad', 'GET')).status, 400);
  session = { user: { role: 'administrator' } };
  assert.equal((await proxy.proxyExpertConsultation(request, id, 'GET')).status, 403);
  session = { error: { status: 401 } };
  assert.equal((await proxy.proxyExpertConsultation(request, id, 'GET')).status, 401);
  assert.equal(calls.length, 1);
});

test('only the requester sees the requester chat launcher', () => {
  let id = 'requester';
  const { RequesterChatLauncher } = load('../components/expert-consultation/requester-chat-launcher.tsx', {
    '@/hooks/profile/use-profile': { useProfile: () => ({ data: { user: { id } } }) },
    './expert-chat-launcher': { ExpertChatLauncher: () => jsx.jsx('button', { children: 'Trao đổi với chuyên gia' }) },
  });
  const props = { verification: { requestedBy: { _id: 'requester' }, reviewId: 'r', attempt: 1 }, title: 'Contract' };
  assert.match(renderToStaticMarkup(jsx.jsx(RequesterChatLauncher, props)), /Trao đổi với chuyên gia/);
  id = 'different-owner';
  assert.equal(renderToStaticMarkup(jsx.jsx(RequesterChatLauncher, props)), '');
});

test('UI keeps failed drafts, retries the same UUID, displays text safely and becomes read-only', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const globals = ['window', 'document', 'HTMLElement', 'Node', 'IS_REACT_ACT_ENVIRONMENT'];
  const old = globals.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true });
  const query = await import('@tanstack/react-query');
  const { createRoot } = await import('react-dom/client');
  const button = { Button: ({ children, ...props }) => {
    const attributes = Object.fromEntries(Object.entries(props).filter(([key]) => !['loading', 'variant', 'size'].includes(key)));
    return jsx.jsx('button', { ...attributes, disabled: props.disabled || props.loading, children });
  } };
  const messages = load('../components/expert-consultation/expert-chat-messages.tsx', { '@/components/ui/button': button });
  const composer = load('../components/expert-consultation/expert-chat-composer.tsx', { '@/components/ui/button': button });
  let stored = [], closed = false, fail = true, latest;
  const sent = [];
  const hooks = load('../hooks/expert-consultation/use-expert-chat.ts', {
    '@tanstack/react-query': query,
    '@/lib/api/expert-consultation': { expertConsultationApi: {
      messages: async () => page(stored, closed ? 'approved' : 'in_progress'),
      send: async (_id, input) => {
        sent.push(input);
        if (fail) { fail = false; throw new Error('Lost response'); }
        const item = { ...message('saved', input.content, 'requester'), clientMessageId: input.clientMessageId };
        stored = [item]; return { message: item, replayed: false };
      },
    } },
    '@/lib/query-keys/expert-consultation': keys,
    '@/lib/expert-consultation/chat': helpers,
    '@/schemas/expert-chat.schema': schema,
  });
  const { ExpertChat } = load('../components/expert-consultation/expert-chat.tsx', {
    '@/components/ui/button': button,
    '@/hooks/expert-consultation/use-expert-chat': { useExpertChat: (...args) => { latest = hooks.useExpertChat(...args); return latest; } },
    '@/lib/expert-consultation/chat': helpers,
    './expert-chat-composer': composer,
    './expert-chat-messages': messages,
  });
  const client = new query.QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const root = createRoot(document.getElementById('root'));
  const flush = async () => { await React.act(async () => { await new Promise(resolve => setTimeout(resolve, 30)); }); };
  try {
    await React.act(async () => root.render(jsx.jsx(query.QueryClientProvider, { client, children: jsx.jsx(ExpertChat, { reviewId: 'review', attempt: 1, participant: 'requester' }) })));
    await flush();
    assert.match(document.body.textContent, /Chưa có tin nhắn/);
    await React.act(async () => latest.setDraft('<script>alert(1)</script>'));
    await React.act(async () => latest.send()); await flush();
    assert.equal(latest.draft, '<script>alert(1)</script>');
    assert.match(document.body.textContent, /Thử gửi lại/);
    await React.act(async () => latest.send()); await flush();
    assert.equal(sent.length, 2);
    assert.equal(sent[0].clientMessageId, sent[1].clientMessageId);
    assert.equal(latest.draft, '');
    assert.equal(document.querySelector('script'), null);
    assert.match(document.body.textContent, /<script>alert\(1\)<\/script>/);
    closed = true;
    await React.act(async () => { await latest.query.refetch(); }); await flush();
    assert.equal(document.querySelector('textarea'), null);
    assert.match(document.body.textContent, /Lần xác minh này đã kết thúc/);
  } finally {
    await React.act(async () => root.unmount());
    client.clear(); dom.window.close();
    globals.forEach((key, index) => old[index] ? Object.defineProperty(globalThis, key, old[index]) : delete globalThis[key]);
  }
});
