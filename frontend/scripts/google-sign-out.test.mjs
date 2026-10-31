import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(
  fs.readFileSync(new URL('../lib/auth/google-sign-out.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;

test('logout disables Google auto selection when the SDK is present', () => {
  let calls = 0;
  const exports = {};
  vm.runInNewContext(source, { exports, window: { google: { accounts: { id: { disableAutoSelect() { calls++; } } } } } });
  exports.disableGoogleAutoSelect();
  assert.equal(calls, 1);
});

test('missing or blocked Google SDK cannot prevent LawScan logout', () => {
  for (const context of [{}, { window: {} }, { window: { google: { accounts: { id: { disableAutoSelect() { throw new Error('blocked'); } } } } } }]) {
    const exports = {};
    vm.runInNewContext(source, { exports, ...context });
    assert.doesNotThrow(() => exports.disableGoogleAutoSelect());
  }
});
