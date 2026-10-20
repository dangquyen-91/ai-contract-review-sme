import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
import * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

function load(path, dependencies) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name] ?? (name === "@/components/ui/button" ? { Button: "button" } : {}), URL });
  return exports;
}

const { RedactedDocument } = load('../components/review/redacted-document.tsx', {
  'react/jsx-runtime': jsx,
  '@/components/ui/icon': { Icon: () => null },
});
const raw = 'CCCD: 079203001234';
const defaults = { isPending: false, isError: false, isFetching: false, onRetry: () => {} };
const render = (props) => renderToStaticMarkup(jsx.jsx(RedactedDocument, { ...defaults, ...props, data: props.data ? { redactionMode: 'partial', ...props.data } : undefined }));

test('Loading never displays the original sensitive text', () => {
  const html = render({ isPending: true });
  assert.match(html, /Đang tải bản ẩn một phần/);
  assert.ok(!html.includes('079203001234'));
});

test('Failed request offers retry and does not expose original or stale text', () => {
  const html = render({ isError: true, data: { text: raw, redacted: true } });
  assert.match(html, /Tải lại bản ẩn một phần/);
  assert.ok(!html.includes('079203001234'));
});

test('An unexpected unredacted response is never rendered', () => {
  const html = render({ data: { text: raw, redacted: false } });
  assert.match(html, /Chưa tải được bản ẩn một phần/);
  assert.ok(!html.includes('079203001234'));
});

test('Partial display uses backend text without token pills or restored values', () => {
  const html = render({ data: { text: 'CCCD: •••• •••• ••••\nĐiện thoại: •••• ••• 456', redacted: true, redactionSpans: [{ type: 'national_id', start: 6, end: 20 }] } });
  assert.match(html, /•••• ••• 456/);
  assert.ok(!html.includes('bg-[#eef3ff]'));
  assert.ok(!html.includes('[ID_NUMBER_1]'));
  assert.ok(!html.includes('079203001234'));
  assert.ok(!html.includes('phát hiện 2'));
});

test('Unchanged output does not claim that no sensitive data exists', () => {
  const html = render({ data: { text: raw, redacted: true, redactionSpans: [] } });
  assert.match(html, /Không có thay đổi/);
  assert.match(html, /không khẳng định hợp đồng không có dữ liệu nhạy cảm/);
});

test('Empty extracted text has a separate empty state', () => {
  assert.match(render({ data: { text: '', redacted: true } }), /Chưa có văn bản trích xuất/);
});

test('Display aliases and partially masked emails remain readable', () => {
  const html = render({ data: { text: 'Đại diện: Cá nhân 1\nEmail: m•••@gmail.com\nSTK: Tài khoản 2 · •••• •••• 3456', redacted: true } });
  assert.match(html, /Cá nhân 1/);
  assert.match(html, /m•••@gmail.com/);
  assert.match(html, /Tài khoản 2/);
  assert.ok(!html.includes('[PERSON_1]'));
});

test('Text proxy forwards redacted=true and preserves the backend response', async () => {
  let path;
  const response = { status: 403 };
  const { GET } = load('../app/api/contracts/[id]/text/route.ts', {
    '@/lib/api/contract-proxy': { proxyContractRequest: (_request, _id, nextPath) => { path = nextPath; return response; } },
  });
  assert.equal(await GET({ nextUrl: new URL('http://localhost/api/contracts/id/text?redacted=true') }, { params: Promise.resolve({ id: 'id' }) }), response);
  assert.equal(path, '/text?redacted=true');
});

test('Text proxy does not forward arbitrary query parameters', async () => {
  let path;
  const { GET } = load('../app/api/contracts/[id]/text/route.ts', {
    '@/lib/api/contract-proxy': { proxyContractRequest: (_request, _id, nextPath) => { path = nextPath; } },
  });
  await GET({ nextUrl: new URL('http://localhost/api/contracts/id/text?redacted=false&role=owner') }, { params: Promise.resolve({ id: 'id' }) });
  assert.equal(path, '/text');
});

function renderReview(queryState = {}, textResponse = { text: 'CCCD: •••• •••• ••••', redacted: true, redactionMode: 'partial' }) {
  let queryOptions;
  let requestOptions;
  const hooks = load('../hooks/use-contracts.ts', {
    '@/lib/query-keys/contracts': load('../lib/query-keys/contracts.ts'),
    'react': React,
    '@tanstack/react-query': { useQuery: (options) => {
      if (!options.queryKey.includes('redacted')) return { isPending: true, isError: false, isFetching: false };
      queryOptions = options;
      return { data: textResponse, isPending: false, isError: false, isFetching: false, refetch: async () => {}, ...queryState };
    } },
    '@/lib/api/contracts': { contractsApi: { getText: async (_id, options) => { requestOptions = options; return textResponse; } } },
  });
  const { ReviewResultHeader } = load('../components/review/review-result-header.tsx', {
    'react/jsx-runtime': jsx, '@/components/ui/icon': { Icon: () => null },
  });
  const { ReviewResults } = load('../components/review/review-results.tsx', {
    'react': React,
    'react/jsx-runtime': jsx,
    '@/hooks/use-contracts': hooks,
    '@/styles/review/review-workspace.module.css': { default: {} },
    '@/components/ui/icon': { Icon: () => null },
    '@/components/review/redacted-document': { RedactedDocument },
    '@/components/review/contract-chat': { ContractChat: () => null },
    '@/components/review/risk-details': { RiskDetails: () => null },
    '@/components/review/review-result-header': { ReviewResultHeader },
    '@/components/review/original-contract-preview': { OriginalContractPreview: () => jsx.jsx('iframe', { title: 'Original file' }) },
    '@/components/review/key-terms': { KeyTerms: () => null },
  });
  const result = {
    contract: { _id: 'contract-1', title: 'Test contract', updatedAt: '2026-10-13', currentVersion: { mimeType: 'application/pdf' } },
    extractedText: raw,
    clauses: [{ index: 0, text: raw, startOffset: 0, endOffset: raw.length }],
    findings: [],
  };
  const html = renderToStaticMarkup(jsx.jsx(ReviewResults, { result }));
  return { html, queryOptions, requestOptions: () => requestOptions };
}

test('Review opens in redacted mode; the raw document and original iframe stay hidden', async () => {
  const context = renderReview();
  assert.match(context.html, /aria-pressed="true"[^>]*>Văn bản đã che/);
  assert.ok(!context.html.includes('079203001234'));
  assert.ok(!context.html.includes('<iframe'));
  assert.match(context.html, /Văn bản đầy đủ/);
  assert.match(context.html, /Chỉ áp dụng cho khung văn bản này/);
  assert.equal(context.queryOptions.enabled, true);
  const signal = new AbortController().signal;
  await context.queryOptions.queryFn({ signal });
  assert.equal(context.requestOptions().redacted, true);
  assert.equal(context.requestOptions().redactionMode, 'partial');
  assert.equal(context.requestOptions().signal, signal);
});

test('Review load error does not fall back to the raw document', () => {
  const context = renderReview({ data: undefined, isError: true });
  assert.match(context.html, /Chưa tải được bản ẩn một phần/);
  assert.ok(!context.html.includes('079203001234'));
});

test('Review rejects a response that is not explicitly marked redacted', async () => {
  const context = renderReview({}, { text: raw, redacted: false });
  await assert.rejects(context.queryOptions.queryFn({ signal: new AbortController().signal }), /chưa trả về văn bản đã che/);
  assert.ok(!context.html.includes('079203001234'));
});

test('Text proxy forwards partial mode only for redacted requests', async () => {
  const paths = [];
  const { GET } = load('../app/api/contracts/[id]/text/route.ts', {
    '@/lib/api/contract-proxy': { proxyContractRequest: (_request, _id, nextPath) => { paths.push(nextPath); } },
  });
  for (const query of ['redacted=true&redactionMode=partial', 'redacted=false&redactionMode=partial']) {
    await GET({ nextUrl: new URL(`http://localhost/api/contracts/id/text?${query}`) }, { params: Promise.resolve({ id: 'id' }) });
  }
  assert.deepEqual(paths, ['/text?redacted=true&redactionMode=partial', '/text']);
});

test('An older token-only backend cannot silently appear as a partial preview', async () => {
  const context = renderReview({}, { text: '[ID_NUMBER_1]', redacted: true });
  await assert.rejects(context.queryOptions.queryFn({ signal: new AbortController().signal }), /chưa trả về văn bản đã che/);
  assert.match(context.html, /Chưa tải được bản ẩn một phần/);
});
