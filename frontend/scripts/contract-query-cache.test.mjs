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
const keys = load('../lib/query-keys/contracts.ts');
const dashboard = load('../lib/query-keys/dashboard.ts');
const invitationKeys = load('../lib/query-keys/invitations.ts').invitationKeys;

test('Share summary queries separate versions and reject an unmarked response without falling back to full results', async () => {
  const calls = [];
  let response = { text: 'Safe summary', redacted: true };
  const { useContractShareSummary } = load('../hooks/use-contract-share-summary.ts', {
    '@tanstack/react-query': { useQuery: (options) => options },
    '@/lib/query-keys/contracts': keys,
    '@/lib/api/contracts': { contractsApi: { getShareSummary: async (...args) => { calls.push(args); return response; } } },
  });
  const query = useContractShareSummary('contract', 'version-1');
  const signal = new AbortController().signal;
  assert.equal((await query.queryFn({ signal })).text, 'Safe summary');
  assert.equal(calls[0][2], signal);
  assert.equal(query.retry, false);
  assert.equal(query.gcTime, 0);
  assert.notDeepEqual(query.queryKey, useContractShareSummary('contract', 'version-2').queryKey);
  response = { text: 'Unexpected full content', redacted: false };
  await assert.rejects(query.queryFn({ signal }));
  assert.equal(calls.length, 2);
});
function setup(overrides = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const calls = [];
  const result = { contract: { _id: 'contract-1' }, findings: [{ _id: 'finding-1', title: 'Old', proposedRevision: { revisedText: 'Old text' } }] };
  const api = {
    getContract: async (id) => { calls.push({ type: 'detail', id }); return { _id: id }; },
    getReview: async (id, signal) => { calls.push({ type: 'result', id, signal }); return result; },
    getFile: async (id, signal, redacted) => { calls.push({ type: 'file', id, signal, redacted }); return new Blob([redacted ? 'masked' : 'original']); },
    ...overrides,
  };
  const hooks = load('../hooks/use-contracts.ts', {
    react: { useCallback: (fn) => fn, useEffect: () => {}, useRef: (value) => ({ current: value }), useState: (value) => [value, () => {}] },
    '@tanstack/react-query': {
      useQueryClient: () => client,
      useMutation: (options) => options,
      useQuery: (options) => ({ options, data: client.getQueryData(options.queryKey), isFetching: client.getQueryState(options.queryKey)?.fetchStatus === 'fetching' }),
    },
    '@/lib/query-keys/contracts': keys,
    '@/lib/query-keys/dashboard': dashboard,
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
  const redacted = ctx.hooks.useContractFile('contract-1', 'version-1', true);
  assert.notDeepEqual(query.options.queryKey, redacted.options.queryKey);
  await redacted.options.queryFn({ signal });
  assert.equal(ctx.calls[1].redacted, true);
  assert.equal(ctx.calls[0].redacted, false);
  ctx.client.clear();
});

test('Contract lists deduplicate equivalent views and separate role, organization, page and filter', async () => {
  const ctx = setup({ list: async () => { ctx.calls.push({ type: 'list' }); return { items: [], total: 0 }; } });
  const first = ctx.hooks.useContractsList({ status: 'reviewed' }, { scope: 'staff:org-1' });
  const second = ctx.hooks.useContractsList({ status: 'reviewed', page: 1, search: '' }, { scope: 'staff:org-1' });
  assert.deepEqual(first.options.queryKey, second.options.queryKey);
  await Promise.all([ctx.client.fetchQuery(first.options), ctx.client.fetchQuery(second.options)]);
  assert.equal(ctx.calls.length, 1);
  for (const [filter, scope] of [[{ status: 'reviewed' }, 'staff:org-2'], [{ status: 'reviewed' }, 'reviewer:org-1'], [{ status: 'reviewed', page: 2 }, 'staff:org-1'], [{ status: 'uploaded' }, 'staff:org-1'], [{ search: 'sample' }, 'staff:org-1']]) {
    assert.notDeepEqual(first.options.queryKey, ctx.hooks.useContractsList(filter, { scope }).options.queryKey);
  }
  ctx.client.clear();
});

test('Upload invalidates every contract list and dashboard without invalidating a saved review', async () => {
  const ctx = setup();
  const listKeys = [keys.contractKeys.list({ page: 1 }, 'staff:org-1'), keys.contractKeys.list({ status: 'reviewed', page: 2 }, 'reviewer:org-1')];
  for (const key of listKeys) ctx.client.setQueryData(key, { items: [], total: 0 });
  ctx.client.setQueryData(dashboard.dashboardKeys.overview, { totalContracts: 0 });
  ctx.client.setQueryData(keys.contractKeys.result('contract-1'), ctx.result);
  await ctx.hooks.useUploadContractMutation().onSuccess();
  for (const key of [...listKeys, dashboard.dashboardKeys.overview]) assert.equal(ctx.client.getQueryState(key).isInvalidated, true);
  assert.equal(ctx.client.getQueryState(keys.contractKeys.result('contract-1')).isInvalidated, false);
  ctx.client.clear();
});

test('Review completion updates listings without refetching or invalidating its saved result', async () => {
  const ctx = setup();
  const listKey = keys.contractKeys.list({}, 'staff:org-1');
  ctx.client.setQueryData(listKey, { items: [], total: 0 });
  const mutation = ctx.hooks.useReviewContractMutation();
  mutation.onSuccess(ctx.result, { contractId: 'contract-1' });
  mutation.onSettled(ctx.result, null, { contractId: 'contract-1' });
  assert.equal(ctx.client.getQueryState(listKey).isInvalidated, true);
  assert.equal(ctx.client.getQueryState(keys.contractKeys.result('contract-1')).isInvalidated, false);
  assert.equal(ctx.calls.length, 0);
  ctx.client.clear();
});

test('Invitation changes invalidate every page and capacity only for their organization', async () => {
  const client = new QueryClient();
  const hooks = load('../hooks/use-invitations.ts', {
    '@tanstack/react-query': { useQueryClient: () => client, useMutation: (options) => options },
    '@/lib/query-keys/invitations': { invitationKeys },
    '@/lib/api/client': { isApiClientError: (error) => error.status !== undefined },
  });
  const changed = [invitationKeys.invitations('org-1', 1), invitationKeys.invitations('org-1', 2), invitationKeys.subscription('org-1')];
  const other = invitationKeys.invitations('org-2', 1);
  for (const action of [hooks.useCreateInvitationMutation, hooks.useRevokeInvitationMutation]) {
    for (const key of [...changed, other]) client.setQueryData(key, {});
    await action('org-1').onSuccess();
    for (const key of changed) assert.equal(client.getQueryState(key).isInvalidated, true);
    assert.equal(client.getQueryState(other).isInvalidated, false);
  }
  client.setQueryData(invitationKeys.subscription('org-1'), {});
  const create = hooks.useCreateInvitationMutation('org-1');
  await create.onError({ status: 500, message: 'Offline' });
  assert.equal(client.getQueryState(invitationKeys.subscription('org-1')).isInvalidated, false);
  await create.onError({ status: 403, message: 'Member limit reached' });
  assert.equal(client.getQueryState(invitationKeys.subscription('org-1')).isInvalidated, true);
  client.clear();
});
