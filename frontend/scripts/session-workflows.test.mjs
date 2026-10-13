import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import axios from 'axios';
import { QueryClient, MutationObserver } from '@tanstack/react-query';

function load(file, deps) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => deps[name] ?? {}, Error });
  return exports;
}

function harness(file, mutations = {}, overrides = {}) {
  let cursor = 0;
  const slots = [], calls = [];
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false, gcTime: 0 } } });
  client.setQueryData(['previous-user'], { private: true });
  const react = {
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
  };
  const deps = {
    react,
    'next/navigation': { useRouter: () => ({ replace: (url) => calls.push(url), refresh: () => calls.push('refresh') }) },
    '@tanstack/react-query': {
      useQueryClient: () => client,
      useMutation(options) {
        const index = cursor++;
        const observer = slots[index] ??= new MutationObserver(client, options);
        observer.setOptions(options);
        return {
          get isPending() { return observer.getCurrentResult().isPending; },
          get error() { return observer.getCurrentResult().error; },
          get variables() { return observer.getCurrentResult().variables; },
          mutateAsync: (value) => observer.mutate(value), reset: () => observer.reset(),
        };
      },
    },
    '@/hooks/use-auth': {
      useLogoutMutation: () => ({ isPending: false, mutateAsync: mutations.logout }),
      useRefreshTokenMutation: () => ({ mutateAsync: mutations.refresh }),
      useCompleteOnboardingMutation: () => ({ mutateAsync: mutations.complete }),
    },
    '@/hooks/use-organizations': { useCreateOrganizationMutation: () => ({ mutateAsync: mutations.create }) },
    '@/lib/query-keys/auth': { authMutationKeys: { onboardingWorkflow: ['onboarding'] } },
    '@/lib/api/client': { isApiClientError: () => false },
    sonner: { toast: { success() {}, error() { calls.push('error'); } } },
  };
  Object.assign(deps, overrides);
  deps['@/hooks/use-pagination-page'] ??= { usePaginationPage: () => react.useState(1) };
  deps['@/lib/session-cache'] = load('../lib/session-cache.ts', deps);
  const hook = Object.values(load(file, deps))[0];
  return { client, calls, render: () => { cursor = 0; return hook(); } };
}

test('Logout failure preserves account cache and permits retry; success clears it and locks navigation', async () => {
  let requests = 0;
  const ctx = harness('../hooks/use-logout-workflow.ts', { logout: async () => { if (++requests === 1) throw new Error('Offline'); } });
  await ctx.render().logout();
  assert.ok(ctx.client.getQueryData(['previous-user']));
  assert.equal(ctx.render().loggingOut, false);
  await ctx.render().logout();
  assert.equal(ctx.client.getQueryData(['previous-user']), undefined);
  assert.equal(ctx.render().loggingOut, true);
  await ctx.render().logout();
  assert.equal(requests, 2);
  assert.deepEqual(ctx.calls, ['error', '/dang-nhap', 'refresh']);
});

test('Session cache cancellation prevents a late previous-user response from repopulating cache', async () => {
  const client = new QueryClient();
  let resolve;
  const request = client.fetchQuery({ queryKey: ['private'], queryFn: () => new Promise((yes) => { resolve = yes; }) }).catch(() => {});
  const { clearSessionCache } = load('../lib/session-cache.ts', {});
  await clearSessionCache(client);
  resolve({ private: true }); await request;
  assert.equal(client.getQueryCache().getAll().length, 0);
});

test('Organization setup retries token refresh without creating another organization', async () => {
  let creates = 0, refreshes = 0;
  const ctx = harness('../hooks/use-onboarding-workflow.ts', {
    create: async ({ name }) => { creates++; assert.equal(name, 'Test organization'); },
    refresh: async () => { if (++refreshes === 1) throw new Error('Offline'); },
  });
  await ctx.render().createOrganization(' Test organization ');
  assert.equal(ctx.render().setupCompleted, true);
  assert.equal(ctx.render().busy, false);
  assert.ok(ctx.render().error);
  assert.ok(ctx.client.getQueryData(['previous-user']));
  await ctx.render().createOrganization('');
  assert.equal(creates, 1); assert.equal(refreshes, 2);
  assert.equal(ctx.render().busy, true);
  assert.deepEqual(ctx.calls, ['/dashboard/owner', 'refresh']);
  assert.equal(ctx.client.getQueryCache().getAll().length, 0);
});

test('Invalid organization names never submit; personal setup completes once across refresh retry', async () => {
  let completes = 0, refreshes = 0;
  const ctx = harness('../hooks/use-onboarding-workflow.ts', {
    create: async () => assert.fail('Invalid name submitted'),
    complete: async () => { completes++; },
    refresh: async () => { if (++refreshes === 1) throw new Error('Offline'); },
  });
  await ctx.render().createOrganization(' ');
  assert.ok(ctx.render().error);
  assert.equal(refreshes, 0);
  await ctx.render().continueWithoutOrganization();
  await ctx.render().continueWithoutOrganization();
  assert.equal(completes, 1); assert.equal(refreshes, 2);
  assert.deepEqual(ctx.calls, ['/dashboard/user', 'refresh']);
});

test('Rapid onboarding clicks submit a single organization creation', async () => {
  let resolve, creates = 0;
  const ctx = harness('../hooks/use-onboarding-workflow.ts', {
    create: () => { creates++; return new Promise((yes) => { resolve = yes; }); },
    refresh: async () => {},
  });
  const workflow = ctx.render();
  const first = workflow.createOrganization('Test');
  await workflow.createOrganization('Test');
  await new Promise((yes) => setTimeout(yes, 0));
  assert.equal(creates, 1);
  resolve(); await first;
});

test('Token refresh callers share one request; failure releases the request for retry', async () => {
  const requests = [];
  const instance = axios.create({ adapter: (config) => new Promise((resolve, reject) => { requests.push({ config, resolve, reject }); }) });
  const axiosMock = Object.assign((...args) => axios(...args), axios, { create: () => instance });
  axiosMock.default = axiosMock;
  const api = load('../lib/api/client.ts', { axios: axiosMock });
  const first = api.refreshSession(), second = api.refreshSession();
  assert.equal(first, second);
  await new Promise((yes) => setTimeout(yes, 0));
  assert.equal(requests.length, 1);
  requests[0].reject(new Error('Offline'));
  await assert.rejects(first);
  const retry = api.refreshSession();
  await new Promise((yes) => setTimeout(yes, 0));
  assert.equal(requests.length, 2);
  requests[1].resolve({ config: requests[1].config, status: 200, headers: {}, data: { data: { accessToken: 'new' } } });
  assert.equal((await retry).accessToken, 'new');
});

test('Legal source filters reset pagination and shrinking data clamps the displayed page', () => {
  const query = { data: Array.from({ length: 21 }, (_, index) => ({ _id: String(index), title: `Source ${index}`, citationLabel: '', sourceType: index === 0 ? 'law' : 'template' })) };
  const ctx = harness('../hooks/use-legal-sources-workspace.ts', {}, {
    '@/hooks/use-legal-sources': { useLegalSources: () => query, useRemoveLegalSourceMutation: () => ({ isPending: false }) },
  });
  ctx.render().setPage(3);
  assert.equal(ctx.render().sources.length, 1);
  query.data = query.data.slice(0, 12);
  assert.equal(ctx.render().currentPage, 2);
  ctx.render().changeType('law');
  assert.equal(ctx.render().currentPage, 1);
  assert.equal(ctx.render().sources.length, 1);
  ctx.render().changeSearch('missing');
  assert.equal(ctx.render().sources.length, 0);
});

test('Legal source deletion blocks concurrent actions and keeps the selection after failure for retry', async () => {
  const source = { _id: 'source-1', title: 'Test', citationLabel: '', sourceType: 'law' };
  let requests = 0, reject;
  const ctx = harness('../hooks/use-legal-sources-workspace.ts', {}, {
    '@/hooks/use-legal-sources': {
      useLegalSources: () => ({ data: [source] }),
      useRemoveLegalSourceMutation: () => ({ isPending: false, mutateAsync: () => {
        if (++requests === 1) return new Promise((_, no) => { reject = no; });
        return Promise.resolve();
      } }),
    },
  });
  ctx.render().selectForDeletion(source);
  const workflow = ctx.render();
  const first = workflow.removeSource();
  await workflow.removeSource();
  workflow.cancelDeletion();
  assert.equal(requests, 1);
  assert.equal(ctx.render().deleting, source);
  reject(new Error('Offline')); await first;
  assert.equal(ctx.render().deleteError, 'Offline');
  await ctx.render().removeSource();
  assert.equal(requests, 2);
  assert.equal(ctx.render().deleting, null);
});
