import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function deferred() {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function harness(file, mutations) {
  let cursor = 0;
  const slots = [], calls = [];
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = value; }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
  };
  const deps = {
    react, 'react/jsx-runtime': jsx,
    '@/components/ui/button': { Button: (props) => jsx.jsx('button', { ...props, disabled: Boolean(props.disabled || props.loading) }) },
    'next/navigation': { useRouter: () => ({ replace: (url) => calls.push(url), refresh: () => calls.push('refresh') }) },
    '@tanstack/react-query': { useQueryClient: () => ({ cancelQueries: async () => {}, clear: () => calls.push('clear') }) },
    sonner: { toast: { success: () => {}, error: () => {} } },
    '@/lib/api/client': { isApiClientError: () => false },
    '@/lib/workspace-path': { workspacePath: () => '/dashboard/staff' },
    '@/hooks/use-auth': { useLogoutMutation: () => mutations.logout },
    '@/hooks/use-invitations': {
      useAcceptInvitationMutation: () => mutations.accept,
      useCreateInvitationMutation: () => mutations.create,
      useRevokeInvitationMutation: () => mutations.revoke,
      useInvitationPreview: () => ({ data: { email: 'test@example.com', organizationName: 'Test', role: 'staff', expiresAt: '2026-10-20T00:00:00Z' } }),
      useOrganizationMembers: () => ({ data: { items: [], total: 0, pages: 1 } }),
      useOrganizationInvitations: () => ({ data: { items: [{ _id: 'invitation-1', email: 'test@example.com', status: 'pending' }], total: 1, pages: 1 } }),
      useMemberSubscription: () => ({ data: { members: { count: 1, pending: 0, limit: 3, available: 2 } } }),
    },
  };
  function load(path) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => deps[name] ?? {}, window: { confirm: () => true } });
  return exports;
  }
  deps['@/lib/session-cache'] = load('../lib/session-cache.ts');
  deps['@/hooks/use-logout-workflow'] = load('../hooks/use-logout-workflow.ts');
  const exports = load(file);
  return { calls, render: (props) => { cursor = 0; return Object.values(exports)[0](props); } };
}

function find(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((child) => find(child, predicate));
  if (!node || typeof node !== 'object') return [];
  if (typeof node.type === 'function') return find(node.type(node.props), predicate);
  return [...(predicate(node) ? [node] : []), ...find(node.props?.children, predicate)];
}
const token = 'a'.repeat(64);
const user = { email: 'test@example.com', orgId: null };

test('Accept blocks rapid repeated clicks and remains disabled during navigation after success', async () => {
  const request = deferred(); let count = 0;
  const mutation = { isPending: false, mutateAsync: () => { count++; return request.promise; } };
  const ctx = harness('../components/invitations/invitation-page.tsx', { accept: mutation, logout: {} });
  let button = find(ctx.render({ token, user }), (node) => node.type === 'button')[0];
  const first = button.props.onClick();
  await button.props.onClick();
  assert.equal(count, 1);
  mutation.isPending = true;
  assert.equal(find(ctx.render({ token, user }), (node) => node.type === 'button')[0].props.disabled, true);
  request.resolve({ user }); await first; mutation.isPending = false;
  button = find(ctx.render({ token, user }), (node) => node.type === 'button')[0];
  assert.equal(button.props.disabled, true);
  await button.props.onClick();
  assert.equal(count, 1);
  assert.deepEqual(ctx.calls, ['clear', '/dashboard/staff', 'refresh']);
});

test('Failed acceptance releases the action guard so the user can retry', async () => {
  let count = 0;
  const ctx = harness('../components/invitations/invitation-page.tsx', {
    accept: { isPending: false, mutateAsync: async () => { count++; throw new Error('Offline'); } }, logout: {},
  });
  for (let i = 0; i < 2; i++) {
    const button = find(ctx.render({ token, user }), (node) => node.type === 'button')[0];
    assert.equal(button.props.disabled, false);
    await button.props.onClick();
  }
  assert.equal(count, 2);
  assert.deepEqual(ctx.calls, []);
});

test('Account switching submits logout once and remains locked until navigation', async () => {
  const request = deferred(); let count = 0;
  const ctx = harness('../components/invitations/invitation-page.tsx', {
    accept: {}, logout: { isPending: false, mutateAsync: () => { count++; return request.promise; } },
  });
  const props = { token, user: { email: 'other@example.com' } };
  const button = find(ctx.render(props), (node) => node.type === 'button')[0];
  const first = button.props.onClick(); await button.props.onClick();
  assert.equal(count, 1);
  request.resolve(); await first;
  assert.equal(find(ctx.render(props), (node) => node.type === 'button')[0].props.disabled, true);
  assert.deepEqual(ctx.calls, ['clear', `/dang-nhap?invitationToken=${token}`, 'refresh']);
});

test('Invitation form follows mutation pending and duplicate submissions are prevented', async () => {
  const request = deferred(); let count = 0;
  const create = { isPending: false, mutateAsync: () => { count++; return request.promise; } };
  const ctx = harness('../components/members/members-workspace.tsx', { create, revoke: {} });
  const props = { orgId: 'org-1', organizationName: 'Test' };
  find(ctx.render(props), (node) => node.type === 'button')[0].props.onClick();
  const form = find(ctx.render(props), (node) => Boolean(node.props?.onSubmit))[0];
  const event = { preventDefault() {} };
  const first = form.props.onSubmit(event); await form.props.onSubmit(event);
  assert.equal(count, 1);
  create.isPending = true;
  assert.equal(find(ctx.render(props), (node) => Boolean(node.props?.onSubmit))[0].props.submitting, true);
  request.resolve(); await first; create.isPending = false;
  assert.equal(find(ctx.render(props), (node) => Boolean(node.props?.onSubmit)).length, 0);
});

test('Revoking uses mutation variables for the busy row and rejects concurrent revoke actions', async () => {
  const request = deferred(); let count = 0;
  const revoke = { isPending: false, variables: undefined, mutateAsync: () => { count++; return request.promise; } };
  const ctx = harness('../components/members/members-workspace.tsx', { create: {}, revoke });
  const props = { orgId: 'org-1', organizationName: 'Test' };
  find(ctx.render(props), (node) => node.props?.role === 'tab' && !node.props['aria-selected'])[0].props.onClick();
  const table = find(ctx.render(props), (node) => Boolean(node.props?.onRevoke))[0];
  const first = table.props.onRevoke('invitation-1');
  await table.props.onRevoke('invitation-2');
  assert.equal(count, 1);
  revoke.isPending = true; revoke.variables = 'invitation-1';
  assert.equal(find(ctx.render(props), (node) => Boolean(node.props?.onRevoke))[0].props.revoking, 'invitation-1');
  request.resolve(); await first; revoke.isPending = false;
  assert.equal(find(ctx.render(props), (node) => Boolean(node.props?.onRevoke))[0].props.revoking, null);
});
