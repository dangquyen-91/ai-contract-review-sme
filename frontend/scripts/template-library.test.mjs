import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/contract-drafts/template-categories.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { exports });
const { libraryCategories, templateCategory, searchText } = exports;

test('the library lists only categories that hold a template, once each, in Vietnamese order', () => {
  const templates = [{ category: 'Lao động' }, { category: 'Bất động sản' }, { category: 'Bảo hiểm' }, { category: 'Bất động sản' }];
  assert.deepEqual([...libraryCategories(templates)], ['Bảo hiểm', 'Bất động sản', 'Lao động']);
  assert.deepEqual([...libraryCategories([])], []);
});

test('a template without a category is shown under "Khác"', () => {
  assert.equal(templateCategory({}), 'Khác');
  assert.equal(templateCategory({ category: '   ' }), 'Khác');
  assert.equal(templateCategory({ category: ' Nhà ở ' }), 'Nhà ở');
});

test('search ignores case and Vietnamese accents', () => {
  assert.equal(searchText('Hợp Đồng LAO động'), 'hop dong lao dong');
});
