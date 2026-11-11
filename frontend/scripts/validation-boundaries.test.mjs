import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import { z } from 'zod';

const require = createRequire(import.meta.url);
const backendAuth = require('../../backend/dist/validations/auth.validation');
function schema(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: () => ({ z }), TextEncoder });
  return exports;
}

test('frontend and backend agree on registration password and name boundaries', () => {
  const { registerFormSchema, loginFormSchema } = schema('../schemas/auth.schema.ts');
  for (const password of ['ValidPassword123!', '123456789012', 'PASSWORD1234', 'admin12345678', 'qwerty123456', 'lawscan123456', 'a'.repeat(72), 'a'.repeat(73), 'ắ'.repeat(25)]) {
    const input = { name: 'Valid User', email: 'valid@example.com', password, confirmPassword: password };
    assert.equal(registerFormSchema.safeParse(input).success, backendAuth.registerSchema.safeParse(input).success, password);
    assert.equal(loginFormSchema.safeParse({ ...input, remember: false }).success, backendAuth.loginSchema.safeParse(input).success);
  }
  for (const name of ['  ', ' x ', ' Valid User ']) {
    const input = { name, email: 'valid@example.com', password: 'ValidPassword123!', confirmPassword: 'ValidPassword123!' };
    assert.equal(registerFormSchema.safeParse(input).success, backendAuth.registerSchema.safeParse(input).success);
  }
});

test('business forms reject missing metadata and accept supported tax-code notation', () => {
  const { organizationCreateFormSchema } = schema('../schemas/organization.schema.ts');
  const valid = { name: 'Test business', taxCode: '0312345678', industry: 'other', provinceCode: '01', wardCode: '00004', addressLine: '12 Test' };
  for (const taxCode of ['0312345678', '0312345678-001', '0312345678001']) assert.equal(organizationCreateFormSchema.safeParse({ ...valid, taxCode }).success, true);
  for (const taxCode of ['abc', '', '031234567890']) assert.equal(organizationCreateFormSchema.safeParse({ ...valid, taxCode }).success, false);
  for (const key of ['name', 'taxCode', 'industry', 'provinceCode', 'wardCode', 'addressLine']) assert.equal(organizationCreateFormSchema.safeParse({ ...valid, [key]: '' }).success, false, key);
});
