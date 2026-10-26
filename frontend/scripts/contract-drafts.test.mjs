import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';

function setup({ role = 'owner', orgId = 'b'.repeat(24), authenticated = true, upstreamStatus = 200, fail = false } = {}) {
  const calls = [];
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../lib/api/contract-draft-proxy.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const deps = {
    'next/server': { NextRequest, NextResponse },
    '@/lib/auth/api-session': { getApiSession: async () => authenticated ? { user: { role, orgId }, accessToken: 'verified-server-token' } : { error: NextResponse.json({ success: false }, { status: 401 }) } },
    '@/lib/request-origin': { isSameOriginRequest: request => request.headers.get('origin') === 'http://localhost' },
  };
  vm.runInNewContext(source, { exports, URLSearchParams, Response, AbortSignal, process: { env: {} }, require: name => deps[name], fetch: async (url, options) => {
    calls.push({ url, options });
    if (fail) throw new Error('Offline');
    if (url.includes('/export?format=docx') && upstreamStatus === 200) return new Response('fixture-docx');
    return NextResponse.json({ success: upstreamStatus === 200, data: { id: 'fixture' } }, { status: upstreamStatus });
  } });
  const run = (path, method = 'GET', body, origin = 'http://localhost', query = '') => exports.proxyContractDraft(new NextRequest(`http://localhost/api/contract-drafts${query}`, { method, headers: { origin }, ...(body ? { body: JSON.stringify(body) } : {}) }), path);
  return { calls, run };
}
const id = 'a'.repeat(24);

test('line item totals keep decimal precision and reject incomplete or invalid rows', () => {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../lib/draft-line-items.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, BigInt });
  const { totalLineItems, readLineItems } = exports;
  const first = { name: 'Product', unit: 'kg', quantity: '1.125', unitPrice: '1000.25' };
  assert.equal(totalLineItems([first, { ...first, quantity: '2', unitPrice: '10000000' }]), '20001125.28');
  for (const update of [{ name: '' }, { quantity: '-1' }, { quantity: '1.0001' }, { unitPrice: '1e7' }]) assert.equal(totalLineItems([{ ...first, ...update }]), '');
  assert.equal(readLineItems('invalid').length, 0);
});

test('copy-latest forwards revisions and preserves the created response', async () => {
  const proxy = setup({ upstreamStatus: 201 });
  assert.equal((await proxy.run([id, 'copy-latest'], 'POST', { revision: 3 })).status, 201);
  assert.equal(proxy.calls[0].options.body, JSON.stringify({ revision: 3 }));
});
test('Vietnamese money input groups displayed amounts without changing their API value', () => {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../lib/money-input.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports });
  const { formatMoneyInput, parseMoneyInput } = exports;
  for (const [canonical, display] of [['', ''], ['0', '0'], ['10000000', '10.000.000'], ['30000000.50', '30.000.000,50'], ['123456789012345', '123.456.789.012.345']]) {
    assert.equal(formatMoneyInput(canonical), display);
    assert.equal(parseMoneyInput(display), canonical);
  }
  assert.equal(parseMoneyInput('10 000 000'), '10000000');
  assert.equal(parseMoneyInput('0001000'), '1000');
  assert.equal(parseMoneyInput('1000,'), '1000');
  for (const invalid of ['-10000000', '1e7', '10,000,000', '10,123', 'ten million']) assert.equal(parseMoneyInput(invalid), null);
});
test('draft proxy requires a verified business owner/staff session', async () => {
  assert.equal((await setup({ authenticated: false }).run([])).status, 401);
  for (const role of ['user', 'expert', 'manager', 'administrator']) assert.equal((await setup({ role }).run(['templates'])).status, 403);
  assert.equal((await setup({ orgId: null }).run([])).status, 403);
  assert.equal((await setup({ role: 'staff' }).run([])).status, 200);
});
test('draft proxy blocks cross-origin mutations and unsupported paths/methods', async () => {
  const ctx = setup();
  assert.equal((await ctx.run([id, 'generate'], 'POST', { revision: 0 }, 'https://other.example')).status, 403);
  for (const path of [[id, '../admin'], ['..'], [id, 'export', 'extra']]) assert.equal((await ctx.run(path)).status, 404);
  assert.equal((await ctx.run([id], 'POST', {})).status, 404);
  assert.equal(ctx.calls.length, 0);
});
test('draft proxy forwards revision-controlled edits using server credentials and no cache', async () => {
  const ctx = setup();
  const body = { revision: 4, content: 'Contract revision' };
  assert.equal((await ctx.run([id], 'PATCH', body)).status, 200);
  const { url, options } = ctx.calls[0];
  assert.ok(url.includes(`/contract-drafts/${id}?`));
  assert.equal(options.headers.Authorization, 'Bearer verified-server-token');
  assert.deepEqual(JSON.parse(options.body), body);
  assert.equal(options.cache, 'no-store');
});
test('draft exports stream DOCX with safe attachment headers and retain upstream permission failures', async () => {
  const response = await setup().run([id, 'export']);
  assert.equal(await response.text(), 'fixture-docx');
  assert.ok(response.headers.get('content-disposition').includes(id));
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((await setup({ upstreamStatus: 403 }).run([id, 'export'])).status, 403);
});
test('draft proxy returns a recoverable error if the server is unavailable', async () => {
  const response = await setup({ fail: true }).run([id, 'generate'], 'POST', { revision: 2 });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).success, false);
});

test('studio proxy supports scoped AI requests, proposal actions and legacy opening with origin protection', async () => {
  const ctx = setup();
  const message = { revision: 2, requestId: 'request-0001', message: 'Update this paragraph', blockIds: ['block-1'] };
  assert.equal((await ctx.run([id, 'assistant'], 'POST', message)).status, 200);
  assert.deepEqual(JSON.parse(ctx.calls[0].options.body), message);
  assert.equal((await ctx.run([id, 'assistant'])).status, 200);
  assert.equal((await ctx.run([id, 'studio'], 'POST', { revision: 2 })).status, 200);
  assert.equal((await ctx.run([id, 'proposals', id], 'POST', { revision: 2, action: 'apply' })).status, 200);
  assert.equal((await ctx.run([id, 'proposals', '../unsafe'], 'POST', {})).status, 404);
  assert.equal((await ctx.run([id, 'proposals', id], 'GET')).status, 404);
  assert.equal((await ctx.run([id, 'assistant'], 'POST', message, 'https://untrusted.example')).status, 403);
});

test('draft pin and deletion forward explicit intent and reject cross-origin requests', async () => {
  const ctx = setup();
  assert.equal((await ctx.run([id, 'pin'], 'PATCH', { pinned: true })).status, 200);
  assert.deepEqual(JSON.parse(ctx.calls[0].options.body), { pinned: true });
  assert.equal((await ctx.run([id], 'DELETE', { revision: 4 })).status, 200);
  assert.deepEqual(JSON.parse(ctx.calls[1].options.body), { revision: 4 });
  assert.equal((await ctx.run([id, 'pin'], 'POST', { pinned: true })).status, 404);
  assert.equal((await ctx.run([id], 'DELETE', { revision: 4 }, 'https://untrusted.example')).status, 403);
});
