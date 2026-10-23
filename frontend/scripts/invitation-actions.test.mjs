import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import { NextRequest, NextResponse } from 'next/server.js';

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
      useRemoveMemberMutation: () => mutations.remove ?? {},
      useInvitationPreview: () => ({ data: { email: 'test@example.com', organizationName: 'Test', role: 'staff', expiresAt: '2026-10-20T00:00:00Z' } }),
      useOrganizationMembers: () => ({ data: { items: mutations.members ?? [], total: mutations.members?.length ?? 0, pages: 1 } }),
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
  deps['@/lib/invitation-error'] = load('../lib/invitation-error.ts');
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

test('A user with an existing orgId can submit acceptance for backend eligibility checks', async () => {
  const existingUser = { ...user, orgId: 'personal-or-missing-org' };
  let count = 0;
  const ctx = harness('../components/invitations/invitation-page.tsx', {
    accept: { isPending: false, mutateAsync: async () => { count++; return { user: existingUser }; } }, logout: {},
  });
  const button = find(ctx.render({ token, user: existingUser }), (node) => node.type === 'button')[0];
  assert.ok(button);
  assert.equal(button.props.disabled, false);
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
  const create = { isPending: false, mutateAsync: (input) => { assert.equal(input.role, 'staff'); count++; return request.promise; } };
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

const removableMember = { id: 'member-1', name: 'Staff Member', email: 'staff@example.com', role: 'staff', isActive: true };
const memberProps = { orgId: 'org-1', organizationName: 'Test' };
const removalDialog = tree => find(tree, node => Boolean(node.props?.onConfirm))[0];
const memberTable = tree => find(tree, node => Boolean(node.props?.onRemove))[0];

test('member removal requires confirmation, supports cancel and blocks removing owners', () => {
  let count = 0;
  const ctx = harness('../components/members/members-workspace.tsx', {
    create: {}, revoke: {}, members: [removableMember], remove: { isPending: false, mutateAsync: () => { count++; } },
  });
  memberTable(ctx.render(memberProps)).props.onRemove({ ...removableMember, role: 'owner' });
  assert.equal(removalDialog(ctx.render(memberProps)), undefined);
  memberTable(ctx.render(memberProps)).props.onRemove(removableMember);
  assert.equal(removalDialog(ctx.render(memberProps)).props.member.id, removableMember.id);
  assert.equal(count, 0);
  removalDialog(ctx.render(memberProps)).props.onClose();
  assert.equal(removalDialog(ctx.render(memberProps)), undefined);
  assert.equal(count, 0);
});

test('confirming removal sends one request, locks the dialog and closes it on success', async () => {
  const request = deferred(); let count = 0;
  const remove = { isPending: false, variables: undefined, mutateAsync: id => { assert.equal(id, removableMember.id); count++; return request.promise; } };
  const ctx = harness('../components/members/members-workspace.tsx', { create: {}, revoke: {}, remove, members: [removableMember] });
  memberTable(ctx.render(memberProps)).props.onRemove(removableMember);
  const dialog = removalDialog(ctx.render(memberProps));
  const first = dialog.props.onConfirm();
  await dialog.props.onConfirm(); dialog.props.onClose();
  assert.equal(count, 1);
  assert.ok(removalDialog(ctx.render(memberProps)));
  remove.isPending = true; remove.variables = removableMember.id;
  assert.equal(removalDialog(ctx.render(memberProps)).props.busy, true);
  assert.equal(memberTable(ctx.render(memberProps)).props.removing, removableMember.id);
  request.resolve(); await first; remove.isPending = false;
  assert.equal(removalDialog(ctx.render(memberProps)), undefined);
});

test('failed removal retains the member and allows retry', async () => {
  let count = 0;
  const remove = { isPending: false, mutateAsync: async () => { if (++count === 1) throw new Error('Offline'); } };
  const ctx = harness('../components/members/members-workspace.tsx', { create: {}, revoke: {}, remove, members: [removableMember] });
  memberTable(ctx.render(memberProps)).props.onRemove(removableMember);
  await removalDialog(ctx.render(memberProps)).props.onConfirm();
  assert.ok(removalDialog(ctx.render(memberProps)).props.error);
  assert.equal(memberTable(ctx.render(memberProps)).props.members.length, 1);
  await removalDialog(ctx.render(memberProps)).props.onConfirm();
  assert.equal(count, 2);
  assert.equal(removalDialog(ctx.render(memberProps)), undefined);
});

function loadModule(file, dependencies) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: name => {
    assert.ok(name in dependencies, `Unexpected module: ${name}`);
    return dependencies[name];
  } });
  return exports;
}

test('member removal refreshes member lists, revoked invitations, capacity and dashboard', async () => {
  const calls = [];
  const { useRemoveMemberMutation } = loadModule('../hooks/use-invitations.ts', {
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: async ({ queryKey }) => calls.push([...queryKey]) }), useMutation: options => options },
    '@/lib/api/invitations': { invitationsApi: { removeMember: async (orgId, userId) => calls.push([orgId, userId]) } },
    '@/lib/api/client': {},
    '@/lib/query-keys/invitations': { invitationKeys: { membersBase: id => ['org-members', id], invitationsBase: id => ['org-invitations', id], subscription: id => ['org-subscription', id] } },
    '@/lib/query-keys/dashboard': { dashboardKeys: { all: ['dashboard'] } },
  });
  const mutation = useRemoveMemberMutation('org-1');
  await mutation.mutationFn('member-1'); await mutation.onSuccess();
  assert.deepEqual(calls, [['org-1', 'member-1'], ['org-members', 'org-1'], ['org-invitations', 'org-1'], ['org-subscription', 'org-1'], ['dashboard']]);
});

test('member removal proxy rejects cross-origin requests and invalid IDs before forwarding', async () => {
  const calls = [];
  const { DELETE } = loadModule('../app/api/organizations/[id]/members/[userId]/route.ts', {
    'next/server': { NextRequest, NextResponse },
    '@/lib/request-origin': { isSameOriginRequest: request => request.headers.get('origin') === 'http://localhost' },
    '@/lib/api/organization-proxy': { proxyOrganizationMutation: async (request, id, suffix) => { calls.push([request.method, id, suffix]); return new Response(null, { status: 204 }); } },
  });
  const id = 'a'.repeat(24), userId = 'b'.repeat(24);
  const request = origin => new NextRequest(`http://localhost/api/organizations/${id}/members/${userId}`, { method: 'DELETE', headers: { origin } });
  assert.equal((await DELETE(request('https://other.example'), { params: Promise.resolve({ id, userId }) })).status, 403);
  assert.equal((await DELETE(request('http://localhost'), { params: Promise.resolve({ id, userId: '../bad' }) })).status, 404);
  assert.equal(calls.length, 0);
  assert.equal((await DELETE(request('http://localhost'), { params: Promise.resolve({ id, userId }) })).status, 204);
  assert.deepEqual(calls, [['DELETE', id, `/members/${userId}`]]);
});
