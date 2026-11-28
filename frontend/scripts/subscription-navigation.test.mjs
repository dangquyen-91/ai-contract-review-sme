import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Resolves "@/..." imports to the real TypeScript sources.
function load(file) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => name.startsWith('@/')
    ? load(`../${name.slice(2)}.ts`)
    : name.startsWith('.') ? load(new URL(`${name}.ts`, new URL(file, import.meta.url))) : {} });
  return exports;
}

const { getDashboardNavigation } = load('../config/dashboard-navigation.ts');
const { permissions } = load('../config/permissions.ts');
const plansItem = (role) => getDashboardNavigation(role).find((item) => item.label === 'Gói dịch vụ');

test('every workspace keeps its plans inside the dashboard instead of the public catalog', () => {
  for (const role of ['user', 'owner', 'staff']) {
    assert.equal(plansItem(role).href, '/subscription', role);
    assert.equal(plansItem(role).key, 'subscription', role);
  }
});

test('system roles keep the public plan catalog', () => {
  assert.equal(plansItem('manager').href, '/goi-dich-vu');
});

test('the plans page is open to personal accounts and organization members, not to system roles', () => {
  for (const role of ['user', 'owner', 'staff']) assert.equal(permissions.subscription(role), true, role);
  for (const role of ['administrator', 'manager', 'expert']) assert.equal(permissions.subscription(role), false, role);
});

test('links to the plan list point to the in-page list', () => {
  const { subscriptionPlansHref } = load('../lib/subscription/plans-link.ts');
  assert.equal(subscriptionPlansHref, '/subscription#subscription-plans');
});

test('staff see their report named for the work it covers', () => {
  const reports = (role) => getDashboardNavigation(role).find((item) => item.key === 'reports');
  assert.equal(reports('staff').label, 'Báo cáo công việc');
  assert.equal(reports('owner').label, 'Báo cáo & thống kê');
});
