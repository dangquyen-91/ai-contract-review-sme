import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup({ failResult = false, workspaceReady = true, failReview } = {}) {
  const values = [];
  let cursor = 0;
  const calls = [];
  const result = { contract: { _id: 'contract-1' }, findings: [] };
  const react = {
    useEffect: () => {},
    useRef: (initial) => { const i = cursor++; values[i] ??= { current: initial }; return values[i]; },
    useState: (initial) => {
      const i = cursor++;
      if (!(i in values)) values[i] = initial;
      return [values[i], (next) => { values[i] = typeof next === 'function' ? next(values[i]) : next; }];
    },
  };
  const exports = {};
  const failure = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/review-failure.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, { exports: failure, require: () => ({ isApiClientError: (error) => typeof error?.status === 'number' }) });
  const source = ts.transpileModule(fs.readFileSync(new URL('../hooks/use-review-workflow.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, URLSearchParams, FormData,
    window: { history: { state: {}, replaceState: (_state, _title, url) => calls.push({ kind: 'url', url }) }, location: { pathname: '/dashboard/user/contract' } },
    require: (name) => ({
      react,
      sonner: { toast: { success: () => {}, error: () => {} } },
      '@/lib/api/client': { isApiClientError: (error) => typeof error?.status === 'number' },
      '@/lib/review-failure': failure,
      '@/lib/review-session': { readReviewSession: () => null, isReviewCancelled: (error) => error.name === 'AbortError' },
      '@/hooks/use-contracts': {
        useContractProfiles: () => ({ data: [] }),
        useUploadContractMutation: () => ({ isPending: false, mutateAsync: async (data) => { calls.push({ kind: 'upload', data }); return { _id: 'contract-1', title: 'Test' }; } }),
        useReviewContractMutation: () => ({ isPending: false, reconnecting: false, mutateAsync: async (args) => {
          calls.push({ kind: 'run', args });
          if (failReview) { const error = failReview; failReview = undefined; throw error; }
          args.onProgress({ _id: 'run-1', status: 'completed' });
          if (failResult) { failResult = false; throw new Error('Cannot load result'); }
          return result;
        } }),
        useContractReviewResult: () => ({ data: result, isLoadingResult: false, load: async (id) => { calls.push({ kind: 'get', id }); return result; } }),
      },
    })[name] ?? {},
  });
  function render() { cursor = 0; return exports.useReviewWorkflow({ access: { upload: true, review: true }, workspaceReady }); }
  return { calls, render };
}

test('Merged workflow retries a failed result download without starting AI again', async () => {
  const ctx = setup({ failResult: true });
  await ctx.render().reviewExisting({ _id: 'contract-1', title: 'Test', status: 'uploaded' });
  const failed = ctx.render();
  assert.equal(failed.retryKind, 'load');
  assert.equal(failed.pendingReviewId, 'contract-1');
  await failed.retryReview();
  assert.equal(ctx.calls.filter((call) => call.kind === 'run').length, 1);
  assert.equal(ctx.calls.filter((call) => call.kind === 'get').length, 1);
  assert.equal(ctx.render().workflowComplete, true);
});

test('Merged workflow preserves explicit resume and writes the canonical contract route', async () => {
  const ctx = setup();
  await ctx.render().reviewExisting({ _id: 'contract-1', title: 'Test', status: 'uploaded' }, false, true);
  assert.equal(ctx.calls.find((call) => call.kind === 'run').args.resumeOnly, true);
  assert.equal(ctx.calls.find((call) => call.kind === 'url').url, '/contract/contract-1?reviewMode=resume');
  assert.equal(ctx.render().reviewProgress.status, 'completed');
  assert.equal(ctx.render().timelineScrollRequest, 0);
});

test('Merged upload sends only the file and waits for explicit review after classification', async () => {
  const ctx = setup();
  const file = new Blob(['test'], { type: 'application/pdf' });
  file.name = 'test.pdf';
  assert.equal(await ctx.render().selectFile(file), true);
  assert.deepEqual([...ctx.calls.find((call) => call.kind === 'upload').data.keys()], ['file']);
  assert.equal(ctx.calls.filter(call => call.kind === 'run').length, 0);
  assert.equal(ctx.render().timelineScrollRequest, 0);
  await ctx.render().reviewUploadedContract('');
  assert.equal(ctx.render().timelineScrollRequest, 1);
});

test('personal accounts without an organization retain the UI but cannot submit organization uploads', async () => {
  const ctx = setup({ workspaceReady: false });
  const file = new Blob(['test'], { type: 'application/pdf' }); file.name = 'test.pdf';
  assert.equal(await ctx.render().selectFile(file), false);
  assert.equal(ctx.calls.length, 0);
});

test('Quota rejection keeps the uploaded contract and prevents tracking retries, but permits a later explicit review', async () => {
  const ctx = setup({ failReview: Object.assign(new Error('analysis quota exhausted. Upgrade your plan or wait for the next period.'), { status: 403 }) });
  const file = new Blob(['test'], { type: 'application/pdf' }); file.name = 'test.pdf';
  await ctx.render().selectFile(file);
  await ctx.render().reviewUploadedContract('Payment');
  assert.equal(ctx.render().reviewBlocked, 'quota');
  assert.equal(ctx.render().pendingReviewId, 'contract-1');
  assert.equal(ctx.render().reviewProgress, null);
  assert.equal(ctx.calls.filter((call) => call.kind === 'upload').length, 1);
  await ctx.render().retryReview();
  assert.equal(ctx.calls.filter((call) => call.kind === 'run').length, 1);
  await ctx.render().reviewExisting({ _id: 'contract-1', title: 'Test', status: 'uploaded' });
  assert.equal(ctx.render().reviewBlocked, null);
  assert.equal(ctx.render().workflowComplete, true);
});
