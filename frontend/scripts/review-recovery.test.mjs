import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';

const contractId = 'contract-1';
const storageKey = `lawscan_review_${contractId}`;
const completed = { _id: 'review-1', status: 'completed' };
class ApiClientError extends Error {
  constructor(status) { super(`HTTP ${status}`); this.status = status; }
}
function setup(overrides = {}, saved) {
  const storage = new Map(saved ? [[storageKey, typeof saved === 'string' ? saved : JSON.stringify(saved)]] : []);
  const calls = [];
  const api = {};
  for (const method of ['startReview', 'getReviewRun', 'listReviewRuns', 'getReview']) {
    api[method] = async (...args) => {
      calls.push({ method, args });
      if (overrides[method]) return overrides[method](...args);
      if (method === 'getReview') return { contractId, summary: 'Result' };
      if (method === 'listReviewRuns') return [completed];
      return completed;
    };
  }
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../lib/review-session.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, require: (name) => name.endsWith('/contracts') ? { contractsApi: api } : { ApiClientError },
    sessionStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) },
    crypto: { randomUUID }, Date, Error, JSON,
    setTimeout: (fn) => setTimeout(fn, 0), clearTimeout,
  });
  return {
    storage, calls, read: () => exports.readReviewSession(contractId),
    run: (options = {}) => exports.executeReview({ contractId, signal: new AbortController().signal, ...options }),
  };
}
const posts = (context) => context.calls.filter((call) => call.method === 'startReview');

test('Lost POST response retries the persisted key and original body', async () => {
  let context;
  let attempts = 0;
  context = setup({ startReview: (_id, key, focus) => {
    assert.equal(context.read().key, key);
    assert.equal(context.read().analysisFocus, focus);
    if (++attempts === 1) throw new ApiClientError(undefined);
    return completed;
  } });
  await context.run({ analysisFocus: 'Payment' });
  assert.equal(posts(context).length, 2);
  assert.equal(posts(context)[0].args[1], posts(context)[1].args[1]);
  assert.equal(posts(context)[1].args[2], 'Payment');
  assert.equal(context.storage.size, 0);
});

test('F5 resumes an existing running review without POST', async () => {
  let polls = 0;
  const context = setup({ getReviewRun: () => ++polls === 1 ? { ...completed, status: 'running' } : completed }, { key: 'saved', reviewId: completed._id });
  await context.run({ resumeOnly: true });
  assert.equal(posts(context).length, 0);
  assert.equal(polls, 2);
});

test('F5 does not automatically restart a failed review', async () => {
  const context = setup({ getReviewRun: () => ({ ...completed, status: 'failed', error: 'AI failed' }) }, { key: 'saved', reviewId: completed._id });
  await assert.rejects(context.run({ resumeOnly: true }), /AI failed/);
  assert.equal(posts(context).length, 0);
  assert.equal(context.read().reviewId, completed._id);
});

test('Explicit retry of a failed review creates a new key and preserves focus', async () => {
  const context = setup({ getReviewRun: () => ({ ...completed, status: 'failed' }) }, { key: 'old-key', reviewId: completed._id, analysisFocus: 'Payment' });
  await context.run();
  assert.notEqual(posts(context)[0].args[1], 'old-key');
  assert.equal(posts(context)[0].args[2], 'Payment');
});

test('Result fetch failure retains the completed review; retry only fetches', async () => {
  let downloads = 0;
  const context = setup({ getReview: () => { if (++downloads === 1) throw new ApiClientError(401); return { summary: 'Result' }; } });
  await assert.rejects(context.run(), /401/);
  assert.equal(context.read().reviewId, completed._id);
  await context.run();
  assert.equal(posts(context).length, 1);
  assert.equal(downloads, 2);
  assert.equal(context.storage.size, 0);
});

test('Leaving the page cancels polling and keeps recovery state', async () => {
  const controller = new AbortController();
  const context = setup({ startReview: () => ({ ...completed, status: 'running' }) });
  await assert.rejects(context.run({ signal: controller.signal, onProgress: () => controller.abort() }), { name: 'AbortError' });
  assert.equal(context.read().reviewId, completed._id);
  assert.equal(context.calls.filter((call) => call.method === 'getReviewRun').length, 0);
});

test('Recovery without browser storage finds the existing review in history', async () => {
  const context = setup();
  await context.run({ resumeOnly: true });
  assert.equal(posts(context).length, 0);
  assert.equal(context.calls[0].method, 'listReviewRuns');
});

test('Permission or quota error is not automatically retried', async () => {
  const context = setup({ startReview: () => { throw new ApiClientError(403); } });
  await assert.rejects(context.run(), /403/);
  assert.equal(posts(context).length, 1);
});

test('Temporary polling outage reconnects to the same review', async () => {
  let polls = 0;
  const connection = [];
  const context = setup({ getReviewRun: () => { if (++polls === 1) throw new ApiClientError(503); return completed; } }, { key: 'saved', reviewId: completed._id });
  await context.run({ onConnection: (value) => connection.push(value) });
  assert.equal(posts(context).length, 0);
  assert.ok(connection.includes(true));
  assert.equal(connection.at(-1), false);
  assert.ok(context.calls.filter((call) => call.method === 'getReviewRun').every((call) => call.args[0] === completed._id));
});

test('Legacy saved review ID is recovered without starting AI', async () => {
  const context = setup({}, '0123456789abcdef01234567');
  await context.run({ resumeOnly: true });
  assert.equal(posts(context).length, 0);
  assert.equal(context.calls[0].args[0], '0123456789abcdef01234567');
});

test('Conflict with an active review attaches to that run without a new POST', async () => {
  const context = setup({
    startReview: () => { throw new ApiClientError(409); },
    listReviewRuns: () => [{ ...completed, status: 'running' }],
  });
  await context.run();
  assert.equal(posts(context).length, 1);
  assert.equal(context.calls.find((call) => call.method === 'getReviewRun').args[0], completed._id);
});

test('Rejected key with no active run does not restart until explicit retry', async () => {
  let attempts = 0;
  const context = setup({
    startReview: () => { if (++attempts === 1) throw new ApiClientError(409); return completed; },
    listReviewRuns: () => [],
  });
  await assert.rejects(context.run(), /409/);
  assert.equal(posts(context).length, 1);
  assert.equal(context.read(), null);
  await context.run();
  assert.notEqual(posts(context)[0].args[1], posts(context)[1].args[1]);
});
