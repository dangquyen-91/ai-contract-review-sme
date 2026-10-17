import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { z } from 'zod';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>');
function load(path, dependencies = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (name) => dependencies[name], FormData: dom.window.FormData, File: dom.window.File, Error });
  return exports;
}
const schema = load('../schemas/legal-source.schema.ts', { zod: { z } });
function form() {
  const node = dom.window.document.createElement('form');
  node.innerHTML = '<input name="code" value="law_2026"><input name="title" value="Test law"><input name="citationLabel" value="LAW-01"><input name="sourceType" value="decree"><input name="status" value="in_force"><input name="expiryDate" value=""><input name="expectedArticleCount" value=""><input name="file" type="file">';
  Object.defineProperty(node.elements.file, 'files', { value: [new dom.window.File(['Article 1'], 'law.txt', { type: 'text/plain' })] });
  return node;
}
// JSDOM form serialization doesn't read an overridden files list; supply the selected file explicitly.
class FormDataWithFile extends dom.window.FormData {
  constructor(node) { super(node); if (node) this.set('file', node.elements.file.files[0]); }
}
function loadSchema() {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL('../schemas/legal-source.schema.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require: () => ({ z }), FormData: FormDataWithFile, File: dom.window.File });
  return exports;
}
const { prepareLegalUpload } = loadSchema();

test('Legal metadata requires code, supports all five types, rejects reversed validity dates', () => {
  const base = { code: 'law_2026', title: 'Test law', citationLabel: 'LAW', status: 'in_force' };
  for (const sourceType of ['law', 'decree', 'circular', 'resolution', 'standard_template']) assert(schema.legalSourceSchema.safeParse({ ...base, sourceType }).success);
  assert(!schema.legalSourceSchema.safeParse({ ...base, code: '', sourceType: 'law' }).success);
  assert(!schema.legalSourceSchema.safeParse({ ...base, sourceType: 'law', effectiveDate: '2026-10-17', expiryDate: '2026-10-01' }).success);
});

test('Upload omits empty optional dates/counts and validates expected article count', () => {
  const node = form();
  const data = prepareLegalUpload(node, true);
  assert(!data.has('expiryDate'));
  assert(!data.has('expectedArticleCount'));
  node.elements.expectedArticleCount.value = '0';
  assert.throws(() => prepareLegalUpload(node, true), /5000/);
  node.elements.expectedArticleCount.value = '12';
  assert.equal(prepareLegalUpload(node, true).get('expectedArticleCount'), '12');
});

function harness(previewRequest, save) {
  let cursor = 0;
  const slots = [];
  const react = {
    useState(value) { const index = cursor++; if (!(index in slots)) slots[index] = value; return [slots[index], (next) => { slots[index] = next; }]; },
    useRef(value) { const index = cursor++; return slots[index] ??= { current: value }; },
  };
  const { useLegalSourceUpload } = load('../hooks/use-legal-source-upload.ts', {
    react, '@/hooks/use-legal-sources': { usePreviewLegalSourceMutation: () => ({ mutateAsync: previewRequest }) },
    '@/schemas/legal-source.schema': { prepareLegalUpload },
  });
  const saved = [];
  function useRender() { cursor = 0; return useLegalSourceUpload(true, save, (source) => saved.push(source)); }
  return { saved, render: useRender };
}

test('Preview does not save; a changed file/form requires a new preview before saving', async () => {
  let previews = 0, saves = 0;
  const context = harness(async () => ({ chunks: [], coverage: { articleCount: ++previews } }), async () => { saves++; return { _id: 'saved' }; });
  const event = { preventDefault() {}, currentTarget: form() };
  await context.render().submit(event);
  assert.equal(previews, 1); assert.equal(saves, 0);
  context.render().reset();
  await context.render().submit(event);
  assert.equal(previews, 2); assert.equal(saves, 0);
  await context.render().submit(event);
  assert.equal(saves, 1); assert.equal(context.saved.length, 1);
});

test('Rapid preview clicks are deduplicated and failures allow retry', async () => {
  let resolve, calls = 0;
  const context = harness(() => { calls++; return new Promise((yes) => { resolve = yes; }); }, async () => ({}));
  const event = { preventDefault() {}, currentTarget: form() };
  const first = context.render().submit(event);
  await context.render().submit(event);
  assert.equal(calls, 1);
  resolve({ chunks: [] }); await first;
  const failure = harness(async () => { throw new Error('Offline'); }, async () => ({}));
  await failure.render().submit(event);
  assert.match(failure.render().error, /Offline/);
  assert.equal(failure.render().pending, false);
});
