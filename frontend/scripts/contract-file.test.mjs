import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const id = '0123456789abcdef01234567';
const signedUrl = 'https://api.cloudinary.com/v1_1/test-cloud/raw/download?signature=test';
function setup(responses, token = 'test-session', redacted = false) {
  const calls = [];
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../app/api/contracts/[id]/file/route.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, require: () => ({ NextResponse: { json: (body, options) => Response.json(body, options) } }),
    URL, Response, process: { env: { API_BASE_URL: 'http://backend.test' } },
    fetch: async (url, options) => {
      calls.push({ url: String(url), options });
      assert.ok(responses.length, 'Unexpected extra fetch');
      return responses.shift();
    },
  });
  return { calls, run: () => exports.GET({ nextUrl: new URL(`http://localhost/api/contracts/${id}/file${redacted ? '?redacted=true' : ''}`), cookies: { get: () => token ? { value: token } : undefined }, signal: new AbortController().signal }, { params: Promise.resolve({ id }) }) };
}
const metadata = (url = signedUrl) => Response.json({ data: { url, fileName: 'hợp đồng.pdf', mimeType: 'application/pdf' } });

test('Redacted DOCX streams only the marked backend copy without requesting the original file', async () => {
  const ctx = setup([new Response('masked docx', { headers: {
    'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'X-LawScan-Redacted': 'partial',
  } })], 'session', true);
  const response = await ctx.run();
  assert.equal(response.status, 200);
  assert.equal(await response.text(), 'masked docx');
  assert.equal(response.headers.get('X-LawScan-Redacted'), 'partial');
  assert.equal(response.headers.get('Cache-Control'), 'private, no-store');
  assert.equal(ctx.calls.length, 1);
  assert.equal(ctx.calls[0].url, `http://backend.test/api/v1/contracts/${id}/file?redacted=true`);
});

test('An older backend or failed masking never falls back to downloading the original', async () => {
  const old = setup([metadata()], 'session', true);
  assert.equal((await old.run()).status, 502);
  assert.equal(old.calls.length, 1);
  const denied = setup([new Response(null, { status: 403 })], 'session', true);
  assert.equal((await denied.run()).status, 403);
  assert.equal(denied.calls.length, 1);
});

test('Uses the BE file endpoint and streams signed private downloads', async () => {
  const context = setup([metadata(), new Response('PDF bytes')]);
  const result = await context.run();
  assert.equal(context.calls[0].url, `http://backend.test/api/v1/contracts/${id}/file`);
  assert.equal(result.status, 200);
  assert.equal(result.headers.get('content-type'), 'application/pdf');
  assert.equal(await result.text(), 'PDF bytes');
  assert.equal(context.calls[1].options.headers, undefined);
});

test('Follows a validated Cloudinary delivery redirect', async () => {
  const context = setup([metadata(), new Response(null, { status: 302, headers: { location: 'https://res.cloudinary.com/test-cloud/raw/private/contract.pdf' } }), new Response('PDF bytes')]);
  assert.equal((await context.run()).status, 200);
  assert.equal(context.calls.length, 3);
});

test('Rejects redirects outside Cloudinary without requesting them', async () => {
  const context = setup([metadata(), new Response(null, { status: 302, headers: { location: 'http://localhost:4000/private' } })]);
  assert.equal((await context.run()).status, 502);
  assert.equal(context.calls.length, 2);
});

test('Rejects an untrusted initial file URL', async () => {
  const context = setup([metadata('https://example.com/contract.pdf')]);
  assert.equal((await context.run()).status, 502);
  assert.equal(context.calls.length, 1);
});

test('Preserves backend permission failure and does not download', async () => {
  const context = setup([new Response(null, { status: 403 })]);
  assert.equal((await context.run()).status, 403);
  assert.equal(context.calls.length, 1);
});

test('Requires an authenticated session', async () => {
  const context = setup([], null);
  assert.equal((await context.run()).status, 401);
  assert.equal(context.calls.length, 0);
});

test('Missing backend download metadata is a clear error', async () => {
  const context = setup([Response.json({ data: { mimeType: 'application/pdf' } })]);
  assert.equal((await context.run()).status, 502);
});
