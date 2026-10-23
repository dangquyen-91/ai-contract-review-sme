import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/dashboard/user/review', pretendToBeVisual: true });
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'Element', 'Node', 'Event']) {
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: false });
const require = createRequire(import.meta.url);
const React = require('react');
const { createRoot } = require('react-dom/client');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');

function setup(role) {
  const modules = new Map();
  const calls = [], notifications = [], routes = [];
  let release, latest, activeSignal;
  const finished = new Promise((resolve) => { release = resolve; });
  const router = { push: (href) => routes.push(href) };
  const result = { contract: { _id: 'contract-1', title: 'Test', updatedAt: 'version-1', currentVersion: { summaryStatus: 'completed', riskDetectionStatus: 'completed' } }, findings: [], clauses: [] };
  const overrides = {
    'next/navigation': { useRouter: () => router },
    '@/hooks/use-dashboard-workspace': { useDashboardWorkspace: () => ({ data: { role, organization: { id: 'organization-1' } }, access: { upload: role !== 'expert', review: true } }) },
    '@/lib/api/contracts': { contractsApi: { listProfiles: async () => [] } },
    '@/lib/review-session': {
      readReviewSession: () => null, clearReviewSession() {}, isReviewCancelled: (error) => error.name === 'AbortError',
      executeReview: async ({ signal, onProgress }) => {
        calls.push('execute'); activeSignal = signal;
        onProgress({ _id: 'run-1', status: 'running', stages: { segmentation: 'completed', summary: 'running', riskDetection: 'running' } });
        await finished;
        signal.throwIfAborted();
        onProgress({ _id: 'run-1', status: 'completed' });
        return result;
      },
    },
    sonner: { toast: { success: (message, options) => { notifications.push({ message, options }); return notifications.length; }, dismiss() {}, error() {} } },
  };
  function load(path) {
    if (modules.has(path)) return modules.get(path).exports;
    const loadedModule = { exports: {} }; modules.set(path, loadedModule);
    const code = ts.transpileModule(fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
    }).outputText;
    const resolve = (name) => {
      if (overrides[name]) return overrides[name];
      if (name.startsWith('@/')) {
        const file = name.slice(2);
        return load(fs.existsSync(new URL(`../${file}.tsx`, import.meta.url)) ? `${file}.tsx` : `${file}.ts`);
      }
      return require(name);
    };
    new Function('require', 'module', 'exports', code)(resolve, loadedModule, loadedModule.exports);
    return loadedModule.exports;
  }
  const { ReviewWorkflowProvider, useDashboardReviewWorkflow } = load('providers/review-workflow-provider.tsx');
  function ReviewPage() {
    latest = useDashboardReviewWorkflow();
    return React.createElement('div', null, latest.reviewProgress?.status ?? 'idle');
  }
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } } });
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  async function page(name) {
    await React.act(async () => root.render(React.createElement(QueryClientProvider, { client: queryClient },
      React.createElement(ReviewWorkflowProvider, { initialRole: role }, name === 'review' ? React.createElement(ReviewPage) : React.createElement('div', null, name)))));
  }
  return { page, calls, notifications, routes, release, latest: () => latest, signal: () => activeSignal,
    close: async () => { await React.act(async () => root.unmount()); queryClient.clear(); host.remove(); },
  };
}

for (const role of ['user', 'owner', 'manager', 'staff', 'expert']) {
  test(`${role}: switching dashboard pages preserves one live run and its completed result`, async () => {
    const ctx = setup(role);
    try {
      await ctx.page('review');
      let running;
      await React.act(async () => { running = ctx.latest().runReview('contract-1'); });
      assert.equal(ctx.latest().reviewProgress.status, 'running');
      await ctx.page('contracts');
      assert.equal(ctx.signal().aborted, false);
      await ctx.page('review');
      assert.equal(ctx.latest().reviewProgress.status, 'running');
      assert.equal(ctx.latest().reviewing, true);
      assert.deepEqual(ctx.calls, ['execute']);
      await ctx.page('contracts');
      await React.act(async () => { ctx.release(); await running; });
      await React.act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
      assert.equal(ctx.notifications.length, 1);
      assert.equal(ctx.notifications[0].message, 'Kết quả đã sẵn sàng');
      await React.act(async () => ctx.notifications[0].options.action.onClick());
      assert.equal(ctx.routes[0], '/contract/contract-1#review-result');
      await ctx.page('review');
      assert.equal(ctx.latest().reviewProgress.status, 'completed');
      assert.equal(ctx.latest().reviewResult.contract._id, 'contract-1');
      assert.deepEqual(ctx.calls, ['execute']);
      assert.equal(ctx.signal().aborted, false);
    } finally { await ctx.close(); }
    assert.equal(ctx.signal().aborted, true);
  });
}
