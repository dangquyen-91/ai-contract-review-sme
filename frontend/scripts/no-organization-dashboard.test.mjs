import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { NextRequest, NextResponse } from 'next/server.js';

function load(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => {
    if (name === 'react/jsx-runtime') return jsx;
    if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

const routes = load('../config/routes.ts', {});
const navigation = load('../lib/routing/workspace-path.ts', { '@/config/routes': routes });
const children = 'dashboard content';
const account = { role: 'user', orgId: null, email: 'user@example.com', hasCompletedOnboarding: true };
const OrganizationRequired = () => null;
const OrganizationFrame = () => null;
function accessLayout(user) {
  return load('../components/layouts/dashboard/dashboard-access-layout.tsx', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'session' }) }) },
    'next/navigation': { redirect: (path) => { throw new Error(`redirect:${path}`); } },
    '@/lib/auth/session': { getSession: async () => user ? { user, accessToken: 'verified-access' } : null },
    '@/lib/routing/workspace-path': navigation,
    '@/components/organizations/staff-organization-required': { StaffOrganizationRequired: OrganizationRequired },
    '@/components/layouts/dashboard/organization-workspace': { OrganizationDashboardFrame: OrganizationFrame },
  }).DashboardAccessLayout;
}

test('personal account without orgId opens its dashboard instead of an organization-required screen', async () => {
  const result = await accessLayout(account)({ role: 'user', children });
  assert.equal(result, children);
  assert.equal(navigation.workspacePath(account), '/review');
});

test('new personal accounts can log straight into their dashboard without creating an organization', async () => {
  const user = { ...account, hasCompletedOnboarding: false };
  const result = await accessLayout(user)({ role: 'user', children });
  assert.equal(result, children);
  assert.equal(navigation.workspacePath(user), '/review');
});

test('accounts with a workspace keep dashboard access and organization framing', async () => {
  assert.equal(await accessLayout({ ...account, orgId: 'personal' })({ role: 'user', children }), children);
  const member = { ...account, role: 'staff', orgId: 'company' };
  const result = await accessLayout(member)({ role: 'staff', children });
  assert.equal(result.type, OrganizationFrame);
  assert.equal(result.props.children, children);
});

test('personal dashboard retains the original review workflow without an organization', () => {
  const ReviewProvider = () => { throw new Error('Review API requests should not mount'); };
  const ContextProvider = () => null;
  const { DashboardProvider } = load('../providers/dashboard-provider.tsx', {
    react: { createContext: () => ({ Provider: ContextProvider }), useContext: () => null },
    '@/hooks/auth/use-logout-workflow': { useLogoutWorkflow: () => ({ loggingOut: false }) },
    '@/hooks/organizations/use-organization-workflow': { useOrganizationWorkflow: () => { throw new Error('Organization API requests should not mount'); } },
    '@/providers/review-workflow-provider': { ReviewWorkflowProvider: ReviewProvider },
  });
  const result = DashboardProvider({ children, hasWorkspace: false, reviewRole: 'staff' });
  assert.equal(result.type, ContextProvider);
  assert.equal(result.props.children, children);
  assert.equal(result.props.value.workspace, null);
  assert.equal(DashboardProvider({ children, hasWorkspace: true }).type, ReviewProvider);
  assert.equal(DashboardProvider({ children, hasWorkspace: false, reviewRole: 'user' }).type, ReviewProvider);
});

test('personal dashboard loads saved contracts without requesting or creating an organization', async () => {
  const source = ts.transpileModule(fs.readFileSync(new URL('../app/api/dashboard/route.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  const user = { ...account, id: 'account-id', name: 'Personal user' };
  let calls = 0;
  let authenticated = true;
  vm.runInNewContext(source, {
    exports, Buffer, Date, process: { env: {} },
    fetch: async url => {
      calls++;
      assert.ok(url.includes('/api/v1/contracts?'));
      const main = url.includes('limit=10');
      return NextResponse.json({ data: main ? [{ _id: 'personal-contract', title: 'Saved contract' }] : [], meta: { total: main ? 1 : 0 } });
    },
    require: name => name === 'next/server' ? { NextResponse } : { getApiSession: async () => authenticated ? { user, accessToken: 'verified-access' } : { error: NextResponse.json({ success: false }, { status: 401 }) } },
  });
  const token = exp => `header.${Buffer.from(JSON.stringify({ sub: user.id, role: 'user', exp })).toString('base64url')}.signature`;
  const response = await exports.GET(new NextRequest('http://localhost/api/dashboard', {
    headers: { cookie: `lawscan_access=${token(Math.floor(Date.now() / 1000) + 900)}` },
  }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.data.organization.id, '');
  assert.equal(payload.data.user.name, user.name);
  assert.equal(payload.data.contractScopeId, user.id);
  assert.equal(payload.data.contracts[0]._id, 'personal-contract');
  assert.equal(payload.data.totalContracts, 1);
  assert.equal(user.orgId, null);
  assert.equal(calls, 4);
  authenticated = false;
  const expired = await exports.GET(new NextRequest('http://localhost/api/dashboard', { headers: { cookie: `lawscan_access=${token(1)}` } }));
  assert.equal(expired.status, 401);
});
