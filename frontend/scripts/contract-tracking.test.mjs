import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, Date, URL, ...globals });
  return exports;
}

test('latest verification update uses the event timestamp without inventing missing dates', () => {
  const { contractTrackingUpdate: update } = load('../lib/contracts/contract-tracking-update.ts');
  const base = { latestReviewId: 'review', updatedAt: 'document-time' };
  assert.equal(update(base).at, 'document-time');
  for (const [status, field, label] of [
    ['requested', 'requestedAt', 'Đã gửi yêu cầu'],
    ['in_progress', 'assignedAt', 'Chuyên gia tiếp nhận'],
    ['approved', 'completedAt', 'Chuyên gia hoàn tất'],
    ['returned', 'completedAt', 'Chuyên gia trả lại'],
  ]) {
    const verification = { status, reviewId: 'review', requestedAt: 'request-time', [field]: 'event-time' };
    const value = update({ ...base, expertVerification: verification });
    assert.equal(value.at, 'event-time');
    assert.equal(value.label, label);
    assert.match(update({ ...base, expertVerification: { ...verification, reviewId: 'older' } }).label, /lượt trước/);
  }
  assert.equal(update({ ...base, expertVerification: { status: 'approved', reviewId: 'review', requestedAt: 'request-time' } }).at, undefined);
});

test('return location is isolated by account, org and role and can be consumed once', () => {
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const helpers = load('../lib/contracts/contract-list-return.ts', {
    sessionStorage: storage,
    window: { location: { pathname: '/contract', search: '?page=3&verificationStatus=approved' }, scrollY: 500 },
    document: { querySelector: () => ({ getBoundingClientRect: () => ({ top: 125 }) }) },
    CSS: { escape: value => value },
  });
  const data = { role: 'staff', organization: { id: 'org' }, user: { email: 'first@example.com' } };
  const scope = helpers.contractListReturnScope(data);
  helpers.saveContractListReturn(scope, 'a'.repeat(24));
  const saved = helpers.readContractListReturn(scope);
  assert.equal(saved.href, '/contract?page=3&verificationStatus=approved');
  assert.equal(saved.scroll, 500);
  assert.equal(saved.offset, 125);
  assert.equal(saved.restore, true);
  for (const changed of [
    { ...data, role: 'owner' },
    { ...data, organization: { id: 'other' } },
    { ...data, user: { email: 'second@example.com' } },
  ]) assert.equal(helpers.readContractListReturn(helpers.contractListReturnScope(changed)), null);
  helpers.consumeContractListReturn(scope);
  assert.equal(helpers.readContractListReturn(scope).restore, false);

  const key = [...values.keys()][0];
  for (const href of ['javascript:alert(1)', 'https://outside.example/contract', '//outside.example/contract', '/contract/invalid', '/contracts']) {
    storage.setItem(key, JSON.stringify({ ...saved, href }));
    assert.equal(helpers.readContractListReturn(scope), null);
  }
  storage.setItem(key, JSON.stringify({ ...saved, savedAt: Date.now() - 61 * 60 * 1000 }));
  assert.equal(helpers.readContractListReturn(scope), null);
  storage.setItem(key, '{invalid');
  assert.equal(helpers.readContractListReturn(scope), null);
});

test('blocked session storage falls back without breaking navigation', () => {
  const { readContractListReturn } = load('../lib/contracts/contract-list-return.ts', {
    sessionStorage: { getItem() { throw new Error('Storage blocked'); } },
  });
  assert.equal(readContractListReturn('scope'), null);
});
