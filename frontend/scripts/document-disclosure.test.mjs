import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';

function load(path, dependencies = {}, globals = {}) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name] ?? (name === "@/components/ui/button" ? { Button: "button" } : {}), URL, ...globals });
  return exports;
}

const id = '0123456789abcdef01234567';
const raw = 'CCCD: 079203001234';
function proxySetup(token = 'session', failedPath) {
  const calls = [];
  const { GET } = load('../app/api/contracts/[id]/review/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => Response.json(body, options) } },
  }, {
    process: { env: { API_BASE_URL: 'http://backend.test' } },
    fetch: async (url) => {
      calls.push(url);
      if (failedPath && url.endsWith(failedPath)) return Response.json({ error: { message: 'Denied' } }, { status: 403 });
      if (url.endsWith('/clauses')) return Response.json({ data: [{ _id: 'clause-1', index: 0, text: raw, title: raw, summary: raw, startOffset: 0, endOffset: raw.length }] });
      if (url.endsWith('/risks')) return Response.json({ data: [] });
      return Response.json({ data: { _id: id, title: 'Test', extractedText: raw, currentVersion: { extractedText: raw, mimeType: 'application/pdf' } } });
    },
  });
  return { calls, run: () => GET({ cookies: { get: () => token ? { value: token } : undefined } }, { params: Promise.resolve({ id }) }) };
}

test('Review proxy never requests raw text and exposes only clause positions', async () => {
  const ctx = proxySetup();
  const response = await ctx.run();
  const result = await response.json();
  assert.equal(response.status, 200);
  assert.equal(ctx.calls.length, 3);
  assert.ok(!ctx.calls.some((url) => url.endsWith('/text')));
  assert.ok(!JSON.stringify(result).includes(raw));
  assert.equal(result.data.extractedText, undefined);
  assert.deepEqual(result.data.clauses[0], { _id: 'clause-1', index: 0, startOffset: 0, endOffset: raw.length });
  assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('Review proxy requires a session and preserves upstream access failures', async () => {
  const unauthenticated = proxySetup(null);
  assert.equal((await unauthenticated.run()).status, 401);
  assert.equal(unauthenticated.calls.length, 0);
  assert.equal((await proxySetup('session', '/clauses').run()).status, 403);
});

function setup(mimeType = 'application/pdf', findings) {
  const states = [];
  let cursor = 0;
  let queries = [];
  let fullState = { data: { text: raw, redacted: false }, isPending: false, isError: false, isFetching: false };
  let retries = 0;
  const react = {
    useState: (initial) => {
      const index = cursor++;
      if (!(index in states)) states[index] = initial;
      return [states[index], (value) => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useRef: () => ({ current: null }), useId: () => 'review', useMemo: (fn) => fn(), useEffect: () => {}, useLayoutEffect: () => {},
  };
  const hooks = load('../hooks/use-contracts.ts', {
    '@/lib/query-keys/contracts': load('../lib/query-keys/contracts.ts'),
    react,
    '@tanstack/react-query': { useQuery: (options) => {
      queries.push(options);
      return options.queryKey.includes('redacted')
        ? { data: { text: 'CCCD: •••• •••• ••••', redacted: true, redactionMode: 'partial' }, isPending: false, isError: false, isFetching: false, refetch: () => {} }
        : { ...fullState, refetch: () => { retries++; } };
    } },
  });
  const { RedactedDocument } = load('../components/contract/redacted-document.tsx', {
    'react/jsx-runtime': jsx, '@/components/ui/icon': { Icon: () => null },
  });
  const { RiskFindingCard } = load('../components/contract/risk-finding-card.tsx', {
    'react/jsx-runtime': jsx, '@/components/ui/icon': { Icon: () => null },
  });
  const { ReviewResultHeader } = load('../components/contract/review-result-header.tsx', {
    'react/jsx-runtime': jsx, '@/components/ui/icon': { Icon: () => null },
  });
  const { RiskDetails } = load('../components/contract/risk-details.tsx', {
    react, 'react/jsx-runtime': jsx,
    '@/hooks/use-contracts': { useUpdateProposedRevisionMutation: () => ({}), useRemoveProposedRevisionMutation: () => ({}) },
  });
  const { ReviewResults } = load('../components/contract/review-results.tsx', {
    react, 'react/jsx-runtime': jsx, '@/hooks/use-contracts': hooks,
    '@/styles/review/review-workspace.module.css': { default: {} }, '@/components/ui/icon': { Icon: () => null },
    '@/components/contract/redacted-document': { RedactedDocument },
    '@/components/contract/contract-chat': { ContractChat: () => null },
    '@/components/contract/risk-details': { RiskDetails },
    '@/components/contract/risk-finding-card': { RiskFindingCard },
    '@/components/contract/review-result-header': { ReviewResultHeader },
    '@/components/contract/key-terms': { KeyTerms: () => null },
    '@/components/contract/original-contract-preview': { OriginalContractPreview: (props) => props.redacted ? jsx.jsx('div', { 'data-redacted-docx': true, ...props }) : jsx.jsx('iframe', { title: 'Original', ...props }) },
    '@/components/contract/document-disclosure-dialog': { DocumentDisclosureDialog: ({ mode, onConfirm, onCancel }) => jsx.jsxs('dialog', { children: [
      jsx.jsx('button', { onClick: onConfirm, children: `Confirm ${mode}` }), jsx.jsx('button', { onClick: onCancel, children: 'Cancel' }),
    ] }) },
  });
  const result = {
    contract: { _id: id, title: 'Test', updatedAt: 'version-1', currentVersion: { mimeType } },
    clauses: [{ _id: 'clause-1', index: 0, startOffset: 0, endOffset: raw.length }],
    findings: findings ?? [{ _id: 'finding-1', clauseId: 'clause-1', severity: 'high', title: 'Risk', problem: [], consequences: [] }],
  };
  function resolve(node) {
    if (Array.isArray(node)) return node.map(resolve);
    if (!node || typeof node !== 'object') return node;
    if (typeof node.type === 'function') return resolve(node.type(node.props));
    return { ...node, props: { ...node.props, children: resolve(node.props.children) } };
  }
  let tree;
  function render() { cursor = 0; queries = []; tree = resolve(jsx.jsx(ReviewResults, { result })); }
  function find(predicate, node) {
    if (arguments.length < 2) node = tree;
    if (Array.isArray(node)) return node.flatMap((child) => find(predicate, child));
    if (!node || typeof node !== 'object') return [];
    return [...(predicate(node) ? [node] : []), ...(node.props.children === undefined ? [] : find(predicate, node.props.children))];
  }
  function text(node) {
    if (arguments.length === 0) node = tree;
    if (Array.isArray(node)) return node.map(text).join('');
    return typeof node === 'object' && node ? text(node.props.children) : String(node ?? '');
  }
  function click(label) {
    const button = find((node) => node.type === 'button' && (text(node) === label || node.props['aria-label'] === label))[0];
    assert.ok(button, `Missing button: ${label}`);
    button.props.onClick(); render();
  }
  render();
  return { click, text, find, queries: () => queries, setFull: (state) => { fullState = { ...fullState, ...state }; render(); }, retries: () => retries };
}

test('Risk cards sort by severity without changing input data and filters work without the AI-context panel', () => {
  const findings = [
    { _id: 'low', severity: 'low', title: 'Low risk', findingType: 'missing_clause' },
    { _id: 'high', severity: 'high', title: 'High risk', clauseId: 'clause-1' },
    { _id: 'medium', severity: 'medium', title: 'Medium risk', clauseId: 'clause-1' },
  ];
  const ctx = setup('application/pdf', findings);
  const cards = () => ctx.find((node) => Boolean(node.props['data-risk-severity']));
  assert.deepEqual(cards().map((node) => node.props['data-risk-severity']), ['high', 'medium', 'low']);
  assert.deepEqual(findings.map((finding) => finding._id), ['low', 'high', 'medium']);
  ctx.click('Rủi ro cao · 1');
  assert.deepEqual(cards().map((node) => node.props['data-risk-severity']), ['high']);
  ctx.click('Xem phân tích và đề xuất');
  assert.equal(ctx.find((node) => node.type === 'button' && node.props['aria-expanded'] === true).length, 1);
  ctx.click('Rủi ro thấp · 1');
  assert.equal(ctx.find((node) => node.type === 'button' && node.props['aria-expanded'] === true).length, 0);
  assert.equal(ctx.find((node) => node.type === 'button' && Boolean(node.props['aria-label']?.includes('Xem vị trí'))).length, 0);
  assert.equal(ctx.queries()[1].enabled, false);
  ctx.click('Tất cả · 3');
  assert.equal(cards().length, 3);
});

test('Collapsed risks separate the first problem, impact and recommendation; expanding reveals all original points', () => {
  const finding = {
    _id: 'high', severity: 'high', title: 'High risk', clauseId: 'clause-1',
    problem: [' ', 'Problem one', 'Problem two'], consequences: ['Impact one', 'Impact two'],
    recommendations: ['Action one', 'Action two'], legalBasis: [], citations: [],
  };
  const ctx = setup('application/pdf', [finding]);
  const card = () => ctx.find((node) => node.props['data-risk-severity'] === 'high')[0];
  const preview = () => ctx.find((node) => node.type === 'dl', card());
  assert.equal(preview().length, 1);
  assert.deepEqual(ctx.find((node) => node.type === 'dt', card()).map((node) => ctx.text(node)), ['Vấn đề', 'Ảnh hưởng', 'Đề xuất']);
  for (const value of ['Problem one', 'Impact one', 'Action one']) assert.ok(ctx.text().includes(value));
  for (const value of ['Problem two', 'Impact two', 'Action two']) assert.ok(!ctx.text().includes(value));
  ctx.click('Xem phân tích và đề xuất');
  assert.equal(preview().length, 0);
  for (const value of ['Problem two', 'Impact two', 'Action two']) assert.ok(ctx.text().includes(value));
  const control = ctx.find((node) => node.type === 'button' && node.props['aria-expanded'] === true)[0];
  assert.equal(ctx.find((node) => node.props.id === control.props['aria-controls']).length, 1);
  ctx.click('Ẩn chi tiết');
  assert.equal(preview().length, 1);
  assert.ok(!ctx.text().includes('Action two'));
  assert.equal(ctx.queries()[1].enabled, false);
});

test('A missing clause with empty analysis fields explains unavailable data and never offers a location', () => {
  const ctx = setup('application/pdf', [{ _id: 'missing', severity: 'low', title: 'Missing clause', findingType: 'missing_clause' }]);
  assert.ok(ctx.text().includes('Điều khoản này chưa có trong hợp đồng.'));
  assert.ok(ctx.text().includes('Chưa có đề xuất xử lý trong kết quả phân tích.'));
  assert.equal(ctx.find((node) => node.type === 'button' && Boolean(node.props['aria-label']?.includes('Xem vị trí'))).length, 0);
});

test('Default and cancelled disclosure never enable full text or mount the original file', () => {
  const ctx = setup();
  assert.equal(ctx.queries()[1].enabled, false);
  assert.ok(!ctx.text().includes(raw));
  ctx.click('Văn bản đầy đủ');
  assert.equal(ctx.queries()[1].enabled, false);
  assert.equal(ctx.find((node) => node.type === 'dialog').length, 1);
  ctx.click('Cancel');
  assert.equal(ctx.queries()[1].enabled, false);
  ctx.click('Xem file gốc');
  assert.equal(ctx.find((node) => node.type === 'iframe').length, 0);
  ctx.click('Cancel');
  assert.equal(ctx.find((node) => node.type === 'iframe').length, 0);
});

test('Full text requires confirmation; query keys are separate and returning to masked mode hides it', () => {
  const ctx = setup();
  ctx.click('Văn bản đầy đủ'); ctx.click('Confirm text');
  assert.equal(ctx.queries()[1].enabled, true);
  assert.notDeepEqual(ctx.queries()[0].queryKey, ctx.queries()[1].queryKey);
  assert.ok(ctx.text().includes(raw));
  ctx.click('Văn bản đã che');
  assert.equal(ctx.queries()[1].enabled, false);
  assert.ok(!ctx.text().includes(raw));
  assert.equal(setup().queries()[1].enabled, false);
});

test('Full text errors/loading never render cached full text and have an independent retry', () => {
  const ctx = setup(); ctx.click('Văn bản đầy đủ'); ctx.click('Confirm text');
  ctx.setFull({ isPending: true });
  assert.match(ctx.text(), /Đang tải văn bản đầy đủ/);
  assert.ok(!ctx.text().includes(raw));
  ctx.setFull({ isPending: false, isError: true });
  assert.match(ctx.text(), /Chưa tải được văn bản đầy đủ/);
  assert.ok(!ctx.text().includes(raw));
  ctx.click('Tải lại văn bản đầy đủ'); assert.equal(ctx.retries(), 1);
  ctx.click('Văn bản đã che');
  assert.match(ctx.text(), /CCCD: ••••/);
});

test('Jumping from masked mode requires confirmation before showing or locating full text', () => {
  const ctx = setup(); ctx.click('Risk. Xem vị trí trong văn bản đầy đủ');
  assert.equal(ctx.queries()[1].enabled, false);
  ctx.click('Cancel'); assert.ok(!ctx.text().includes(raw));
  ctx.click('Risk. Xem vị trí trong văn bản đầy đủ'); ctx.click('Confirm text');
  assert.equal(ctx.queries()[1].enabled, true);
  assert.ok(ctx.text().includes(raw));
});

test('DOCX jump loads original matching text and mounts the file only after confirmation', () => {
  const ctx = setup('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  assert.equal(ctx.find((node) => node.props['data-redacted-docx']).length, 1);
  assert.equal(ctx.find((node) => node.type === 'iframe').length, 0);
  assert.equal(ctx.queries()[1].enabled, false);
  ctx.click('Risk. Xem vị trí trong file gốc');
  assert.equal(ctx.queries()[1].enabled, false);
  assert.equal(ctx.find((node) => node.type === 'iframe').length, 0);
  ctx.click('Confirm original');
  assert.equal(ctx.queries()[1].enabled, true);
  assert.equal(ctx.find((node) => node.type === 'iframe')[0].props.target.text, raw);
});

test('Unsupported DOCX can switch to the redacted text view without enabling full-text queries', () => {
  const ctx = setup('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  ctx.find((node) => node.props['data-redacted-docx'])[0].props.onTextFallback();
  ctx.setFull({});
  assert.equal(ctx.find((node) => node.props['data-redacted-docx']).length, 0);
  assert.equal(ctx.find((node) => node.type === 'iframe').length, 0);
  assert.equal(ctx.queries()[1].enabled, false);
  assert.ok(!ctx.text().includes(raw));
});

test('Opening the original file directly does not unnecessarily request full text', () => {
  const ctx = setup(); ctx.click('Xem file gốc'); ctx.click('Confirm original');
  assert.equal(ctx.queries()[1].enabled, false);
  assert.equal(ctx.find((node) => node.type === 'iframe').length, 1);
});
