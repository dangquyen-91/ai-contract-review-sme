import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function setup({ pages = 12, units = 3, available = 10, ready = true, active = true, accept = true } = {}) {
  const confirmations = [], calls = [];
  class ApiClientError extends Error { constructor(message, options) { super(message); this.status = options.status; this.serverCode = options.serverCode; } }
  const deps = {
    '@/lib/api/contracts': { contractsApi: { getContract: async () => { calls.push('document'); return { orgId: 'org', reviewBilling: { ready, versionId: 'version', units, pageCount: pages, reason: 'Page count unavailable' } }; } } },
    '@/lib/api/billing': { billingApi: { subscription: async () => { calls.push('subscription'); return { status: active ? 'active' : 'expired', analysis: { available } }; } } },
    '@/lib/api/client': { ApiClientError },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../lib/confirm-review-cost.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, DOMException, Error, require: name => deps[name], window: { confirm: message => { confirmations.push(message); return accept; } } });
  return { run: () => exports.confirmReviewCost('contract'), confirmations, calls };
}
test('the review prompt shows page-based units and remaining credits before accepting', async () => {
  const context = setup(); const result = await context.run();
  assert.equal(result.units, 3); assert.equal(result.versionId, 'version');
  assert.match(context.confirmations[0], /12 trang.*3 lượt/); assert.match(context.confirmations[0], /10 lượt/);
});
test('unknown pages, insufficient credits and inactive plans cannot ask for or start a charged review', async () => {
  for (const options of [{ ready: false }, { available: 2 }, { active: false }]) {
    const context = setup(options); await assert.rejects(context.run()); assert.equal(context.confirmations.length, 0);
  }
});
test('declining the cost confirmation aborts before a new run', async () => {
  const context = setup({ accept: false }); await assert.rejects(context.run(), { name: 'AbortError' });
  assert.deepEqual(context.calls, ['document', 'subscription']);
});

test('billing errors are Vietnamese and classified by stable codes, including older saved messages', async () => {
  await assert.rejects(setup({ available: 2 }).run(), error => error.serverCode === 'ANALYSIS_QUOTA_EXHAUSTED' && /^Không đủ lượt rà soát AI/.test(error.message));
  await assert.rejects(setup({ active: false }).run(), error => error.serverCode === 'AI_PLAN_REQUIRED' && /^Cần gói dịch vụ AI/.test(error.message));
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../lib/review-failure.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(source, { exports, require: () => ({ isApiClientError: error => error?.status === 403 }) });
  for (const error of [{ serverCode: 'ANALYSIS_QUOTA_EXHAUSTED', message: 'Thông báo đã thay đổi' }, { message: 'Không đủ lượt rà soát AI.' }, { message: 'analysis quota exhausted' }]) assert.equal(exports.reviewBlockReason({ status: 403, ...error }), 'quota');
  for (const error of [{ serverCode: 'AI_PLAN_REQUIRED', message: 'Thông báo đã thay đổi' }, { message: 'Cần gói dịch vụ AI đang hoạt động.' }, { message: 'An active Business plan is required to use AI' }]) assert.equal(exports.reviewBlockReason({ status: 403, ...error }), 'plan');
});
