import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { randomUUID } from 'node:crypto';
import ts from 'typescript';
import { NextRequest, NextResponse } from 'next/server.js';

function load(file, deps, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, require: (name) => {
      assert.ok(name in deps, `Missing module ${name}`);
      return deps[name];
    },
    process: { env: {} }, crypto: { randomUUID }, AbortController, AbortSignal,
    DOMException, TextDecoder, Response, setTimeout, clearTimeout, ...globals,
  });
  return exports;
}

class ApiClientError extends Error {
  constructor(message, options) { super(message); this.status = options?.status; }
}

const contractId = 'a'.repeat(24);
const quotaMessage = 'chat quota exhausted. Upgrade your plan or wait for the next period.';
const keyPattern = /^[A-Za-z0-9_-]{8,128}$/;

function request(url, options) {
  const headers = new Headers(options.headers);
  headers.set('Cookie', 'lawscan_access=test-token');
  return new NextRequest(`http://localhost${url}`, { ...options, headers });
}

test('streaming chat reaches quota validation with a unique valid key per question', async () => {
  const keys = [];
  const proxy = load('../lib/api/contract-proxy.ts', { 'next/server': { NextResponse } }, {
    fetch: async (_url, options) => {
      const key = options.headers['Idempotency-Key'];
      assert.match(key, keyPattern);
      keys.push(key);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      assert.equal(JSON.parse(options.body).message, 'Question');
      return new Response(`event: error\ndata: ${JSON.stringify({ message: quotaMessage, status: 403 })}\n\n`, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    },
  });
  const stream = load('../lib/api/contract-stream.ts', {
    '@/lib/api/client': { ApiClientError },
  }, {
    fetch: (url, options) => proxy.proxyContractStream(request(url, options), contractId, '/chat/stream'),
  });
  for (let i = 0; i < 2; i++) {
    await assert.rejects(
      stream.readContractStream(`/api/contracts/${contractId}/chat/stream`, { message: 'Question' }, () => {}),
      (error) => error.message === quotaMessage && error.status === 403,
    );
  }
  assert.notEqual(keys[0], keys[1]);
});

test('regular chat forwards the generated key and preserves quota errors', async () => {
  const keys = [];
  const proxy = load('../lib/api/contract-proxy.ts', { 'next/server': { NextResponse } }, {
    fetch: async (_url, options) => {
      assert.match(options.headers['Idempotency-Key'], keyPattern);
      keys.push(options.headers['Idempotency-Key']);
      return Response.json({ success: false, error: { message: quotaMessage } }, { status: 403 });
    },
  });
  const { contractsApi } = load('../lib/api/contracts.ts', {
    '@/lib/api/client': {
      apiRequest: (options) => proxy.proxyContractRequest(request(`/api${options.url}`, {
        method: options.method, headers: options.headers, body: JSON.stringify(options.data),
      }), contractId, '/chat', { method: 'POST' }),
    },
    '@/lib/api/contract-stream': {},
  });
  for (let i = 0; i < 2; i++) {
    const response = await contractsApi.askAboutContract(contractId, 'Question');
    assert.equal(response.status, 403);
    assert.equal((await response.json()).error.message, quotaMessage);
  }
  assert.notEqual(keys[0], keys[1]);
});

test('review event reads remain GET requests without usage keys', async () => {
  const { readContractStream } = load('../lib/api/contract-stream.ts', {
    '@/lib/api/client': { ApiClientError },
  }, {
    fetch: async (_url, options) => {
      assert.equal(options.method, 'GET');
      assert.equal(options.headers['Idempotency-Key'], undefined);
      return new Response('event: done\ndata: {}\n\n');
    },
  });
  await readContractStream('/api/reviews/review/events', undefined, () => {});
});
