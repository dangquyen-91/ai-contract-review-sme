import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';
import { withBackendHelper } from './fixtures/inline-backend.mjs';

function setup({ role = 'manager', authenticated = true, status = 200, fail = false } = {}) {
  const exports = {}, calls = [];
  const source = withBackendHelper(ts.transpileModule(fs.readFileSync(new URL('../lib/api/managed-template-proxy.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText);
  const dependencies = {
    'next/server': { NextRequest, NextResponse },
    '@/lib/auth/api-session': { getApiSession: async () => authenticated ? { user: { role }, accessToken: 'server-token' } : { error: NextResponse.json({}, { status: 401 }) } },
    '@/lib/api/request-origin': { isSameOriginRequest: request => request.headers.get('origin') === 'http://localhost' },
  };
  vm.runInNewContext(source, { exports, URLSearchParams, TextEncoder, AbortSignal, process: { env: {} }, require: name => dependencies[name], fetch: async (url, options) => { calls.push({ url, options }); if (fail) throw Error('Offline'); return NextResponse.json({ success: status === 200 }, { status }); } });
  const run = (path = [], method = 'GET', body, origin = 'http://localhost', query = '') => exports.proxyManagedTemplate(new NextRequest(`http://localhost/api/manager/contract-templates${query}`, { method, headers: { origin }, ...(body ? { body: JSON.stringify(body) } : {}) }), path);
  return { run, calls };
}
const id = 'a'.repeat(24);
test('only authenticated Manager can use template management proxy', async () => {
  assert.equal((await setup({ authenticated: false }).run()).status, 401);
  for (const role of ['user', 'staff', 'owner', 'administrator', 'expert']) assert.equal((await setup({ role }).run()).status, 403);
});
test('template mutations reject other origins, unknown actions and invalid identifiers', async () => {
  const context = setup();
  assert.equal((await context.run([], 'POST', {}, 'https://untrusted.example')).status, 403);
  assert.equal((await context.run(['../unsafe'])).status, 404);
  assert.equal((await context.run([id, 'activate'], 'POST', {})).status, 404);
  assert.equal((await context.run([id, 'publish'], 'DELETE', {})).status, 404);
  assert.equal(context.calls.length, 0);
});
test('list forwards only supported query parameters and uses server credentials', async () => {
  const context = setup();
  assert.equal((await context.run([], 'GET', undefined, undefined, '?q=service&page=2&token=ignored')).status, 200);
  const { url, options } = context.calls[0];
  assert.equal(new URL(url).pathname, '/api/v1/manager/contract-templates');
  assert.equal(new URL(url).searchParams.get('q'), 'service');
  assert.equal(new URL(url).searchParams.get('token'), null);
  assert.equal(options.headers.Authorization, 'Bearer server-token');
  assert.equal(options.cache, 'no-store');
});
test('save, publish, retirement and deletion preserve revision for backend conflict checks', async () => {
  for (const [path, method] of [[[id], 'PATCH'], [[id, 'publish'], 'POST'], [[id, 'retire'], 'POST'], [[id], 'DELETE']]) {
    const context = setup();
    assert.equal((await context.run(path, method, { revision: 7 })).status, 200);
    assert.deepEqual(JSON.parse(context.calls[0].options.body), { revision: 7 });
    assert.equal(context.calls[0].options.method, method);
  }
});
test('proxy preserves conflicts and reports uncertain outcomes without claiming success', async () => {
  assert.equal((await setup({ status: 409 }).run([id, 'publish'], 'POST', { revision: 0 })).status, 409);
  assert.equal((await setup({ fail: true }).run([id], 'PATCH', { revision: 0 })).status, 503);
  const context = setup();
  assert.equal((await context.run([], 'POST', { text: 'x'.repeat(500001) })).status, 413);
  assert.equal(context.calls.length, 0);
});

test('preview is a POST to the Manager preview route only', async () => {
  const context = setup();
  const definition = { code: 'labor', name: 'Mẫu xem trước' };
  assert.equal((await context.run(['preview'], 'POST', { definition })).status, 200);
  assert.match(context.calls[0].url, /\/api\/v1\/manager\/contract-templates\/preview\?$/);
  assert.equal(context.calls[0].options.method, 'POST');
  assert.deepEqual(JSON.parse(context.calls[0].options.body), { definition });
  for (const [path, method] of [[['preview'], 'GET'], [['preview'], 'PATCH'], [['preview', 'extra'], 'POST']])
    assert.equal((await context.run(path, method, method === 'GET' ? undefined : {})).status, 404);
  assert.equal((await setup({ role: 'user' }).run(['preview'], 'POST', { definition })).status, 403);
  assert.equal(context.calls.length, 1);
});
