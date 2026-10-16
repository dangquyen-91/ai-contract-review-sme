import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { QueryClient } from '@tanstack/react-query';

function load(path, dependencies = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name] ?? {}, AbortController, AbortSignal });
  return exports;
}
const keys = load('../lib/contract-query-keys.ts');
function setup(overrides = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const calls = [];
  const result = { contract: { _id: 'contract-1' }, findings: [{ _id: 'finding-1', title: 'Old', proposedRevision: { revisedText: 'Old text' } }] };
  const api = {
    getContract: async (id) => { calls.push({ type: 'detail', id }); return { _id: id }; },
    getReview: async (id, signal) => { calls.push({ type: 'result', id, signal }); return result; },
    getFile: async (id, signal) => { calls.push({ type: 'file', id, signal }); return new Blob(['original']); },
    ...overrides,
  };
  const hooks = load('../hooks/use-contracts.ts', {
    react: { useCallback: (fn) => fn, useEffect: () => {}, useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    '@tanstack/react-query': {
      useQueryClient: () => client,
      useMutation: (options) => options,
      useQuery: (options) => ({ options, data: client.getQueryData(options.queryKey), isFetching: client.getQueryState(options.queryKey)?.fetchStatus === 'fetching' }),
    },
    '@/lib/contract-query-keys': keys,
    '@/lib/api/contracts': { contractsApi: api },
    '@/lib/review-session': { clearReviewSession: () => {}, executeReview: async () => result },
  });
  return { client, calls, hooks, result };
}

test('Contract metadata loaders share and deduplicate the same query cache', async () => {
  const ctx = setup();
  const first = ctx.hooks.useLoadContract(), second = ctx.hooks.useLoadContract();
  await Promise.all([first('contract-1'), second('contract-1')]);
  assert.equal(ctx.calls.filter((call) => call.type === 'detail').length, 1);
  assert.deepEqual(ctx.client.getQueryData(keys.contractKeys.detail('contract-1')), { _id: 'contract-1' });
  ctx.client.clear();
});

test('Review result is a disabled query and explicit loads only fetch GET results', async () => {
  const ctx = setup();
  const query = ctx.hooks.useContractReviewResult('contract-1');
  assert.equal(query.options.enabled, false);
  assert.equal(ctx.calls.length, 0);
  await query.load('contract-1');
  assert.equal(ctx.calls.length, 1);
  assert.equal(ctx.calls[0].type, 'result');
  assert.equal(ctx.client.getQueryData(keys.contractKeys.result('contract-1')), ctx.result);
  ctx.client.clear();
});

test('Failed result load can retry without any AI mutation', async () => {
  let attempts = 0;
  const ctx = setup({ getReview: async () => { if (++attempts === 1) throw new Error('Offline'); return { findings: [] }; } });
  const query = ctx.hooks.useContractReviewResult('contract-1');
  await assert.rejects(query.load('contract-1'), /Offline/);
  await query.load('contract-1');
  assert.equal(attempts, 2);
  assert.deepEqual(ctx.client.getQueryData(keys.contractKeys.result('contract-1')), { findings: [] });
  ctx.client.clear();
});

test('Successful AI run fills the same result query used by the workspace', async () => {
  const ctx = setup();
  const mutation = ctx.hooks.useReviewContractMutation();
  const result = await mutation.mutationFn({ contractId: 'contract-1' });
  mutation.onSuccess(result, { contractId: 'contract-1' });
  assert.equal(ctx.hooks.useContractReviewResult('contract-1').data, result);
  ctx.client.clear();
});

test('Editing and removing a proposal update the cached result without reloading AI', async () => {
  const ctx = setup();
  ctx.client.setQueryData(keys.contractKeys.result('contract-1'), ctx.result);
  const edited = { _id: 'finding-1', title: 'Edited', proposedRevision: { revisedText: 'New text' } };
  await ctx.hooks.useUpdateProposedRevisionMutation().onSuccess(edited, { contractId: 'contract-1' });
  assert.equal(ctx.hooks.useContractReviewResult('contract-1').data.findings[0], edited);
  const removed = { _id: 'finding-1', title: 'Edited' };
  await ctx.hooks.useRemoveProposedRevisionMutation().onSuccess(removed, { contractId: 'contract-1' });
  assert.equal(ctx.hooks.useContractReviewResult('contract-1').data.findings[0], removed);
  assert.equal(ctx.calls.length, 0);
  ctx.client.clear();
});

test('File query uses a versioned key, forwards cancellation and releases unused blobs', async () => {
  const ctx = setup();
  const query = ctx.hooks.useContractFile('contract-1', 'version-1');
  assert.equal(query.options.gcTime, 0);
  assert.equal(query.options.retry, false);
  assert.notDeepEqual(query.options.queryKey, ctx.hooks.useContractFile('contract-1', 'version-2').options.queryKey);
  const signal = new AbortController().signal;
  await query.options.queryFn({ signal });
  assert.equal(ctx.calls[0].signal, signal);
  assert.equal(ctx.calls[0].type, 'file');
  ctx.client.clear();
});
