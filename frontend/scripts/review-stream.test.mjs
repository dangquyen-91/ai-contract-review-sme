import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

class ApiClientError extends Error { constructor(message, options) { super(message); this.status = options?.status; } }
function setup(fetch) {
  let refreshes = 0;
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../lib/api/contract-stream.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({ ApiClientError, refreshSession: async () => { refreshes++; } }), fetch, TextDecoder, AbortSignal, AbortController, DOMException, setTimeout, clearTimeout });
  return { read: exports.readContractStream, refreshes: () => refreshes };
}
const stream = (chunks, onCancel = () => {}) => new Response(new ReadableStream({
  start(controller) { for (const chunk of chunks) controller.enqueue(chunk); controller.close(); }, cancel: onCancel,
}), { headers: { 'Content-Type': 'text/event-stream' } });
const bytes = (text) => new TextEncoder().encode(text);

test('Review GET stream decodes split UTF-8/CRLF, ignores heartbeats and stops at done', async () => {
  const input = bytes(': ping\r\n\r\nevent: review\r\ndata: {"title":"Hợp đồng","status":"completed"}\r\n\r\nevent: done\r\ndata: {}\r\n\r\nevent: error\r\ndata: {"message":"must not be read"}\r\n\r\n');
  const chunks = Array.from(input, (value) => new Uint8Array([value]));
  let request;
  const context = setup(async (url, options) => { request = { url, ...options }; return stream(chunks); });
  const events = [];
  await context.read('/api/reviews/id/events', undefined, (event) => events.push(event));
  assert.equal(request.method, 'GET'); assert.equal(request.body, undefined);
  assert.equal(events.length, 2); assert.equal(events[0].data.title, 'Hợp đồng');
  assert.equal(events.at(-1).event, 'done');
});

test('GET stream refreshes an expired session once and retries with the same URL', async () => {
  let attempts = 0;
  const context = setup(async () => ++attempts === 1 ? new Response('{}', { status: 401 }) : stream([bytes('event: done\ndata: {}\n\n')]));
  await context.read('/events', undefined, () => {});
  assert.equal(context.refreshes(), 1); assert.equal(attempts, 2);
});

test('A forbidden stream exposes the backend error without refresh', async () => {
  const context = setup(async () => new Response(JSON.stringify({ error: { message: 'Access denied' } }), { status: 403 }));
  await assert.rejects(context.read('/events', undefined, () => {}), (error) => error.status === 403 && /Access denied/.test(error.message));
  assert.equal(context.refreshes(), 0);
});

test('Stream EOF without done fails so the review workflow can poll', async () => {
  const context = setup(async () => stream([bytes('event: review\ndata: {"status":"running"}\n\n')]));
  await assert.rejects(context.read('/events', undefined, () => {}), ApiClientError);
});

test('Chat continues to POST its body and consumes normal SSE frames', async () => {
  let request;
  const context = setup(async (_, options) => { request = options; return stream([bytes('event: done\ndata: {}\n\n')]); });
  await context.read('/chat', { message: 'Hello' }, () => {});
  assert.equal(request.method, 'POST'); assert.equal(JSON.parse(request.body).message, 'Hello');
});
