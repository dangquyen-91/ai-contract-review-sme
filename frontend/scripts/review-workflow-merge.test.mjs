import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup({ failResult = false, personal = false, initialType = 'service' } = {}) {
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
  const source = ts.transpileModule(fs.readFileSync(new URL('../hooks/use-review-workflow.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, URLSearchParams, FormData,
    window: { history: { state: {}, replaceState: (_state, _title, url) => calls.push({ kind: 'url', url }) }, location: { pathname: '/dashboard/user/contract' } },
    require: (name) => ({
      react,
      sonner: { toast: { success: () => {}, error: () => {} } },
      '@/lib/api/client': { isApiClientError: () => false },
      '@/lib/review-session': { readReviewSession: () => null, isReviewCancelled: (error) => error.name === 'AbortError' },
      '@/hooks/use-contracts': {
        useContractProfiles: () => ({ data: [] }),
        useUploadContractMutation: () => ({ isPending: false, mutateAsync: async (data) => { calls.push({ kind: 'upload', data }); return { _id: 'contract-1', title: 'Test' }; } }),
        useReviewContractMutation: () => ({ isPending: false, reconnecting: false, mutateAsync: async (args) => {
          calls.push({ kind: 'run', args }); args.onProgress({ _id: 'run-1', status: 'completed' });
          if (failResult) { failResult = false; throw new Error('Cannot load result'); }
          return result;
        } }),
        useContractReviewResult: () => ({ data: result, isLoadingResult: false, load: async (id) => { calls.push({ kind: 'get', id }); return result; } }),
      },
    })[name] ?? {},
  });
  function render() { cursor = 0; return exports.useReviewWorkflow({ access: { upload: true, review: true }, initialType, personal, reviewPath: '/dashboard/user/review' }); }
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

test('Merged workflow preserves explicit resume and writes the correct role review route', async () => {
  const ctx = setup();
  await ctx.render().reviewExisting({ _id: 'contract-1', title: 'Test', status: 'uploaded' }, false, true);
  assert.equal(ctx.calls.find((call) => call.kind === 'run').args.resumeOnly, true);
  assert.equal(ctx.calls.find((call) => call.kind === 'url').url, '/dashboard/user/review?contract=contract-1&reviewMode=resume');
  assert.equal(ctx.render().reviewProgress.status, 'completed');
});

test('Merged upload preserves the dev employee policy for personal labor contracts', async () => {
  const ctx = setup({ personal: true, initialType: 'labor' });
  ctx.render().setOurParty('employer');
  const file = new Blob(['test'], { type: 'application/pdf' });
  file.name = 'test.pdf';
  assert.equal(await ctx.render().selectFile(file), true);
  assert.equal(ctx.calls.find((call) => call.kind === 'upload').data.get('ourParty'), 'employee');
});
