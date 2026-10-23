import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { NextResponse } from 'next/server.js';

function load(file, dependencies, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, process: { env: {} }, AbortSignal, URL,
    require: name => {
      if (!(name in dependencies)) throw new Error(`Unexpected module ${name}`);
      return dependencies[name];
    }, ...globals });
  return exports;
}

test('deletion invalidates filtered lists and clears the deleted user detail only after API success', async () => {
  const calls = [];
  let fail = false;
  const keys = load('../lib/query-keys/user-management.ts', {}).userManagementKeys;
  const { useDeleteManagedUser } = load('../hooks/use-user-management.ts', {
    '@tanstack/react-query': {
      useQueryClient: () => ({
        cancelQueries: async options => calls.push(['cancel', ...options.queryKey]),
        removeQueries: options => calls.push(['remove', ...options.queryKey]),
        invalidateQueries: async options => calls.push(['invalidate', ...options.queryKey]),
      }),
      useMutation: options => ({ mutateAsync: async id => {
        const result = await options.mutationFn(id);
        await options.onSuccess(result, id);
      } }),
    },
    '@/lib/api/user-management': { userManagementApi: { remove: async id => {
      calls.push(['delete', id]);
      if (fail) throw new Error('Cannot delete owner');
    } } },
    '@/lib/query-keys/user-management': { userManagementKeys: keys },
  });
  await useDeleteManagedUser().mutateAsync('test-user');
  assert.deepEqual(calls.map(call => call[0]), ['delete', 'cancel', 'remove', 'invalidate']);
  assert.deepEqual(calls[3], ['invalidate', 'admin', 'user-management', 'list']);
  calls.length = 0;
  fail = true;
  await assert.rejects(useDeleteManagedUser().mutateAsync('owner'), /Cannot delete owner/);
  assert.deepEqual(calls, [['delete', 'owner']]);
});

test('delete proxy preserves 204 responses and backend rejection without touching live data', async () => {
  let status = 204;
  const calls = [];
  const { proxyUserManagement } = load('../lib/api/userManagement-proxy.ts', {
    'next/server': { NextResponse },
    '@/lib/auth/api-session': { getApiSession: async () => ({ accessToken: 'fixture', user: { role: 'administrator' } }) },
  }, { fetch: async (url, options) => {
    calls.push({ url, options });
    return status === 204 ? new Response(null, { status }) : NextResponse.json({ success: false, error: { message: 'Cannot delete owner' } }, { status });
  } });
  const id = 'a'.repeat(24);
  const request = () => new Request(`http://localhost/api/admin/users/${id}`, { method: 'DELETE', headers: { origin: 'http://localhost' } });
  const result = await proxyUserManagement(request(), id);
  assert.equal(result.status, 204);
  assert.equal(await result.text(), '');
  assert.equal(calls[0].options.method, 'DELETE');
  assert.ok(calls[0].url.endsWith(`/api/v1/admin/users/${id}`));
  status = 409;
  const rejected = await proxyUserManagement(request(), id);
  assert.equal(rejected.status, 409);
  assert.equal((await rejected.json()).error.message, 'Cannot delete owner');
  assert.equal((await proxyUserManagement(request(), 'bad-id')).status, 400);
  assert.equal(calls.length, 2);
});
