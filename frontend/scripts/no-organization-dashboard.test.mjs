import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

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

const navigation = load('../lib/workspace-path.ts', {});
const children = 'dashboard content';
const account = { role: 'user', orgId: null, email: 'user@example.com', hasCompletedOnboarding: true };
const OrganizationRequired = () => null;
const OrganizationFrame = () => null;
const PersonalDashboard = () => null;
function accessLayout(user) {
  return load('../components/layouts/dashboard/dashboard-access-layout.tsx', {
    'next/headers': { cookies: async () => ({ get: () => ({ value: 'session' }) }) },
    'next/navigation': { redirect: (path) => { throw new Error(`redirect:${path}`); } },
    '@/lib/auth-session': { decodeSessionUser: () => user },
    '@/lib/workspace-path': navigation,
    '@/components/organizations/staff-organization-required': { StaffOrganizationRequired: OrganizationRequired },
    '@/components/layouts/dashboard/organization-workspace': { OrganizationDashboardFrame: OrganizationFrame },
    './personal-account-dashboard': { PersonalAccountDashboard: PersonalDashboard },
  }).DashboardAccessLayout;
}

test('personal account without orgId opens its dashboard instead of an organization-required screen', async () => {
  const result = await accessLayout(account)({ role: 'user', children });
  assert.equal(result.type, PersonalDashboard);
  assert.equal(result.props.user.email, account.email);
  assert.equal(navigation.workspacePath(account), '/dashboard/user');
});

test('new personal accounts can log straight into their dashboard without creating an organization', async () => {
  const user = { ...account, hasCompletedOnboarding: false };
  const result = await accessLayout(user)({ role: 'user', children });
  assert.equal(result.type, PersonalDashboard);
  assert.equal(navigation.workspacePath(user), '/dashboard/user');
});

test('accounts with a workspace keep dashboard access and organization framing', async () => {
  assert.equal(await accessLayout({ ...account, orgId: 'personal' })({ role: 'user', children }), children);
  const member = { ...account, role: 'staff', orgId: 'company' };
  const result = await accessLayout(member)({ role: 'staff', children });
  assert.equal(result.type, OrganizationFrame);
  assert.equal(result.props.children, children);
});

test('dashboard provider does not mount review data loaders without a workspace', () => {
  const ReviewProvider = () => { throw new Error('Review API requests should not mount'); };
  const ContextProvider = () => null;
  const { DashboardProvider } = load('../providers/dashboard-provider.tsx', {
    react: { createContext: () => ({ Provider: ContextProvider }), useContext: () => null },
    '@/hooks/use-logout-workflow': { useLogoutWorkflow: () => ({ loggingOut: false }) },
    '@/hooks/use-organization-workflow': { useOrganizationWorkflow: () => { throw new Error('Organization API requests should not mount'); } },
    '@/providers/review-workflow-provider': { ReviewWorkflowProvider: ReviewProvider },
  });
  const result = DashboardProvider({ children, hasWorkspace: false });
  assert.equal(result.type, ContextProvider);
  assert.equal(result.props.children, children);
  assert.equal(result.props.value.workspace, null);
  assert.equal(DashboardProvider({ children, hasWorkspace: true }).type, ReviewProvider);
});
