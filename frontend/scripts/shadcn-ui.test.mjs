import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { posix } from 'node:path';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
for (const name of ['window', 'document', 'navigator', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'Event', 'KeyboardEvent', 'CustomEvent', 'MouseEvent']) {
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
}
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.ResizeObserver = class ResizeObserver { observe() {} unobserve() {} disconnect() {} };

const require = createRequire(import.meta.url);
const React = require('react');
const { createRoot } = require('react-dom/client');
const { renderToStaticMarkup } = require('react-dom/server');
const modules = new Map();
function load(relative) {
  if (modules.has(relative)) return modules.get(relative).exports;
  const loadedModule = { exports: {} };
  modules.set(relative, loadedModule);
  const source = ts.transpileModule(fs.readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const resolve = (name) => {
    if (modules.has(name)) return modules.get(name).exports;
    if (name === 'next/link') return { __esModule: true, default: (props) => React.createElement('a', props) };
    if (name.startsWith('@/')) {
      const path = name.slice(2);
      return load(fs.existsSync(new URL(`../${path}.tsx`, import.meta.url)) ? `${path}.tsx` : `${path}.ts`);
    }
    if (name.startsWith('.')) {
      const candidate = posix.normalize(posix.join(posix.dirname(relative), name));
      return load(`${candidate}${fs.existsSync(new URL(`../${candidate}.tsx`, import.meta.url)) ? '.tsx' : '.ts'}`);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(resolve, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const { Button } = load('components/ui/button.tsx');
const { cn } = load('lib/utils.ts');
const { Badge } = load('components/ui/badge.tsx');
const { InvitationFormDialog } = load('components/invitations/invitation-form-dialog.tsx');
const { MemberCapacityDialog } = load('components/members/member-capacity-dialog.tsx');
const { SectionDetailDialog } = load('components/management/section-detail-dialog.tsx');
const { ReviewBlockedNotice } = load('components/review/review-blocked-notice.tsx');
let shareState;
modules.set('hooks/use-contract-share-summary.ts', { exports: { useContractShareSummary: () => shareState } });
const { ShareSummaryDialog } = load('components/contract/share-summary-dialog.tsx');
modules.set('hooks/use-review-allowance.ts', { exports: { useReviewAllowance: () => ({}) } });
const { AnalysisFocusDialog } = load('components/contract/analysis-focus-dialog.tsx');
const { ReviewResultHeader } = load('components/contract/review-result-header.tsx');
const { ContractUploadForm } = load('components/contract/contract-upload-form.tsx');
const wait = () => new Promise((resolve) => setTimeout(resolve, 20));

test('Legal detail opens in place, restores focus, and keeps the parent open through nested actions and pending mutations', async () => {
  const source = { _id: '0123456789abcdef01234567', title: 'Luật Thương mại 2005', sourceType: 'law', citationLabel: '36/2005/QH11', chunkCount: 325, status: 'in_force', ingestion: { status: 'failed', embeddedChunks: 100, totalChunks: 325 } };
  let query = { data: undefined, isPending: true, isFetching: false, isError: false, refetch: () => { retries++; return Promise.resolve(); } };
  let resumeRequests = 0, deleteRequests = 0, retries = 0, resumeDone, deleteDone, rejectDelete;
  modules.set('hooks/use-legal-sources.ts', { exports: {
    useLegalSource: () => query,
    useResumeLegalSourceMutation: () => {
      const [isPending, setPending] = React.useState(false);
      return { isPending, mutateAsync: async () => { resumeRequests++; setPending(true); try { await new Promise((resolve) => { resumeDone = resolve; }); } finally { setPending(false); } } };
    },
    useRemoveLegalSourceMutation: () => {
      const [isPending, setPending] = React.useState(false);
      return { isPending, mutateAsync: async () => { deleteRequests++; setPending(true); try { await new Promise((resolve, reject) => { deleteDone = resolve; rejectDelete = reject; }); } finally { setPending(false); } } };
    },
    useAppendLegalSourcePartMutation: () => ({ mutateAsync() {} }),
  } });
  modules.set('hooks/use-legal-source-upload.ts', { exports: { useLegalSourceUpload: () => ({ pending: false, preview: null, error: '', reset() {}, submit(event) { event.preventDefault(); } }) } });
  const { LegalSourceTable } = load('components/legal-sources/legal-source-table.tsx');
  const { LegalSourceDetailDialog } = load('components/legal-sources/legal-source-detail-dialog.tsx');
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const initialUrl = window.location.href;
  function App() {
    const [selected, setSelected] = React.useState(null);
    return React.createElement(React.Fragment, null,
      React.createElement('input', { defaultValue: 'Thương mại', 'aria-label': 'Từ khóa đang lọc' }),
      React.createElement(LegalSourceTable, { sources: [source], deletePending: false, onDelete() {}, onDetail: setSelected }),
      selected && React.createElement(LegalSourceDetailDialog, { id: selected._id, onClose: () => setSelected(null) }));
  }
  const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  const button = (dialog, text) => [...dialog.querySelectorAll('button')].find((item) => item.textContent === text);
  try {
    await React.act(async () => root.render(React.createElement(App)));
    const opener = host.querySelector('[aria-label^="Xem chi tiết"]'); opener.focus();
    await React.act(async () => opener.click()); await flush();
    assert.match(document.querySelector('[role="dialog"]').textContent, /Đang tải nguồn pháp lý/);
    query = { ...query, data: source, isPending: false };
    await React.act(async () => root.render(React.createElement(App)));
    let dialog = document.querySelector('[role="dialog"]');
    assert.match(dialog.textContent, /Luật Thương mại 2005/);
    assert.equal(window.location.href, initialUrl);
    await React.act(async () => escape()); await flush();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.activeElement, opener);
    assert.equal(host.querySelector('input').value, 'Thương mại');
    const title = [...host.querySelectorAll('button')].find((item) => item.textContent === source.title); title.focus();
    await React.act(async () => title.click()); await flush();
    query = { ...query, data: undefined, isError: true, error: new Error('Không tải được nguồn') };
    await React.act(async () => root.render(React.createElement(App)));
    dialog = document.querySelector('[role="dialog"]');
    assert.match(dialog.querySelector('[role="alert"]').textContent, /Không tải được nguồn/);
    await React.act(async () => button(dialog, 'Thử lại').click());
    assert.equal(retries, 1);
    query = { ...query, data: source, isError: false };
    await React.act(async () => root.render(React.createElement(App)));
    await React.act(async () => button(dialog, 'Bổ sung tài liệu').click()); await flush();
    assert.equal(document.querySelectorAll('[role="dialog"]').length, 2);
    await React.act(async () => escape()); await flush();
    assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
    await React.act(async () => button(dialog, 'Tiếp tục xử lý').click());
    assert.equal(resumeRequests, 1);
    assert.ok(button(dialog, 'Đóng chi tiết').disabled);
    await React.act(async () => escape());
    assert.equal(document.querySelectorAll('[role="dialog"]').length, 1);
    await React.act(async () => resumeDone());
    await React.act(async () => button(dialog, 'Xóa nguồn').click()); await flush();
    let confirmation = [...document.querySelectorAll('[role="dialog"]')].at(-1);
    await React.act(async () => button(confirmation, 'Xóa nguồn').click());
    await React.act(async () => rejectDelete(new Error('Xóa thất bại')));
    assert.equal(document.querySelectorAll('[role="dialog"]').length, 2);
    assert.match(confirmation.querySelector('[role="alert"]').textContent, /Xóa thất bại/);
    await React.act(async () => button(confirmation, 'Xóa nguồn').click());
    assert.equal(deleteRequests, 2);
    await React.act(async () => deleteDone()); await flush();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(window.location.href, initialUrl);
    assert.equal(host.querySelector('input').value, 'Thương mại');
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Homepage and catalog share the same modern plan cards, live data and selection behavior', async () => {
  const backend = fs.readFileSync(new URL('../../backend/src/services/billing/subscription.service.ts', import.meta.url), 'utf8');
  const defaultPlans = backend.match(/export const DEFAULT_PLANS = ([\s\S]*?) as const;/)[1];
  const plans = new Function(`return (${defaultPlans});`)();
  assert.equal(plans.length, 4);
  const changedPlans = plans.map((plan) => plan.code === 'business_starter' ? { ...plan, price: 512345, analysisLimit: 301 } : plan);
  let query = { data: changedPlans, isPending: false, isError: false, isFetching: false, refetch() {} };
  modules.set('hooks/use-subscription-plans.ts', { exports: { useSubscriptionPlans: () => query } });
  const { PricingPlans } = load('components/landing/pricing-plans.tsx');
  const { SubscriptionCatalog } = load('components/subscription/subscription-catalog.tsx');
  const { SubscriptionConfirmation } = load('components/subscription/subscription-confirmation.tsx');
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    await React.act(async () => root.render(React.createElement(PricingPlans)));
    const homepageCard = host.querySelector('[data-plan-code="business_starter"]');
    const cardClasses = homepageCard.className;
    assert.match(homepageCard.textContent, /512\.345/);
    assert.match(homepageCard.textContent, /301 lượt phân tích/);
    assert.match(homepageCard.textContent, /500 lượt chat/);
    assert.ok(!host.textContent.includes('trang mỗi tháng'));
    assert.equal(host.querySelector('input[value="yearly"]'), null);
    await React.act(async () => host.querySelector('input[value="personal"]').click());
    assert.equal(host.querySelectorAll('[data-plan-code]').length, 2);
    assert.match(host.querySelector('[data-plan-code="personal_free"]').textContent, /3 lượt phân tích/);
    assert.equal(host.querySelector('[data-plan-code="personal_free"] a').getAttribute('href'), '/dang-ky');
    assert.match(host.querySelector('[data-plan-code="personal_pro"]').textContent, /99\.000/);
    await React.act(async () => host.querySelector('[data-plan-code="personal_pro"] button').click()); await flush();
    assert.match(document.querySelector('[role="dialog"]').textContent, /200 lượt chat/);
    assert.equal(document.querySelector('[role="dialog"] a').getAttribute('href'), '/goi-dich-vu/xac-nhan?plan=personal_pro&cycle=monthly');
    await React.act(async () => root.render(React.createElement(SubscriptionCatalog))); await flush();
    const catalogCard = host.querySelector('[data-plan-code="business_starter"]');
    assert.equal(catalogCard.className, cardClasses);
    assert.equal(catalogCard.dataset.planVariant, 'catalog');
    assert.equal(catalogCard.querySelectorAll('ul svg').length, 4);
    assert.match(catalogCard.textContent, /301 lượt phân tích/);
    assert.match(catalogCard.textContent, /512\.345/);
    assert.match(host.querySelector('table').textContent, /512\.345/);
    await React.act(async () => catalogCard.querySelector('button').click()); await flush();
    assert.match(document.querySelector('[role="dialog"]').textContent, /Business Starter/);
    await React.act(async () => host.querySelector('input[value="personal"]').click());
    assert.equal(host.querySelectorAll('[data-plan-variant="catalog"]').length, 2);
    assert.match(host.querySelector('[data-plan-code="personal_pro"]').textContent, /99\.000/);
    assert.match(host.querySelector('table').textContent, /99\.000/);
    await React.act(async () => root.render(React.createElement(SubscriptionConfirmation, { planCode: 'business_starter' })));
    assert.match(host.textContent, /512\.345/);
    assert.match(host.textContent, /301 lượt phân tích/);
    assert.ok(!host.textContent.includes('Doanh nghiệp mẫu'));
    query = { ...query, data: undefined, isPending: true };
    await React.act(async () => root.render(React.createElement(PricingPlans)));
    assert.equal(host.querySelectorAll('[data-plan-code]').length, 0);
    assert.ok(host.querySelector('[aria-label="Đang tải gói dịch vụ"]'));
    let retries = 0;
    query = { ...query, isPending: false, isError: true, error: new Error('Không kết nối được'), refetch: () => retries++ };
    await React.act(async () => root.render(React.createElement(PricingPlans)));
    assert.match(host.querySelector('[role="alert"]').textContent, /Không kết nối được/);
    assert.equal(host.querySelectorAll('[data-plan-code]').length, 0);
    await React.act(async () => host.querySelector('[role="alert"] button').click());
    assert.equal(retries, 1);
    query = { ...query, isError: false, data: [] };
    await React.act(async () => root.render(React.createElement(SubscriptionConfirmation, { planCode: 'business_starter' })));
    assert.match(host.textContent, /không khả dụng/);
    const { default: ConfirmationPage } = load('app/goi-dich-vu/xac-nhan/page.tsx');
    for (const selection of [{ plan: 'basic', cycle: 'monthly' }, { plan: 'personal_pro', cycle: 'yearly' }]) {
      const content = renderToStaticMarkup(await ConfirmationPage({ searchParams: Promise.resolve(selection) }));
      assert.match(content, /Lựa chọn gói chưa hợp lệ/);
    }
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Legal source charts preserve unknown statuses, show true totals and filter via their actions', async () => {
  const { getLegalSourceAnalytics } = load('lib/legal-source-analytics.ts');
  const { LegalSourceCharts } = load('components/legal-sources/legal-source-charts.tsx');
  const sources = [
    { _id: 'law', sourceType: 'law' },
    { _id: 'failed', sourceType: 'decree', ingestion: { status: 'failed' }, coverage: { complete: false } },
    { _id: 'paused', sourceType: 'standard_template', ingestion: { status: 'paused' } },
  ];
  const analytics = getLegalSourceAnalytics(sources);
  assert.equal(analytics.types.reduce((sum, item) => sum + item.count, 0), sources.length);
  assert.equal(analytics.processing.reduce((sum, item) => sum + item.count, 0), sources.length);
  assert.equal(analytics.processing.find((item) => item.key === 'unknown').count, 1);
  assert.equal(analytics.processing.find((item) => item.key === 'completed').count, 0);
  assert.deepEqual(analytics.attention.map((source) => source._id), ['failed', 'paused']);
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const actions = [];
  const props = { analytics, total: sources.length, pending: false, unavailable: false, onSelectType: (value) => actions.push(value), onSelectGroup: (value) => actions.push(value) };
  try {
    await React.act(async () => root.render(React.createElement(LegalSourceCharts, props)));
    assert.equal(host.querySelectorAll('article').length, 2);
    assert.match(host.querySelector('[aria-label^="Trạng thái xử lý:"]').getAttribute('aria-label'), /Chưa có trạng thái 1 nguồn/);
    await React.act(async () => host.querySelector('[aria-label="Lọc Luật: 1 nguồn"]').click());
    await React.act(async () => [...host.querySelectorAll('button')].find((button) => button.textContent === 'Xem nguồn lỗi').click());
    assert.deepEqual(actions, ['law', 'failed']);
    await React.act(async () => root.render(React.createElement(LegalSourceCharts, { ...props, pending: true })));
    assert.equal(host.querySelectorAll('svg[role="img"]').length, 0);
    assert.match(host.textContent, /Đang tải dữ liệu phân tích/);
    await React.act(async () => root.render(React.createElement(LegalSourceCharts, { ...props, total: 0, analytics: getLegalSourceAnalytics([]) })));
    assert.match(host.textContent, /Thêm nguồn đầu tiên/);
    assert.ok(!host.innerHTML.includes('NaN'));
  } finally { await React.act(async () => root.unmount()); host.remove(); }
});

test('Create legal source dialog preserves fields across preview/back and confirms discarding edits', async () => {
  modules.set('next/navigation', { exports: { useRouter: () => ({ push() {} }) } });
  modules.set('hooks/use-legal-sources.ts', { exports: { useCreateLegalSourceMutation: () => ({ mutateAsync() {} }) } });
  let pending = false;
  modules.set('hooks/use-legal-source-upload.ts', { exports: { useLegalSourceUpload: () => {
    const [preview, setPreview] = React.useState(null);
    return { pending, preview, error: '', reset: () => setPreview(null), submit: (event) => { event.preventDefault(); setPreview({ chunks: [] }); } };
  } } });
  const { LegalSourceCreateDialog } = load('components/legal-sources/legal-source-create-dialog.tsx');
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  let closed = 0;
  const props = { onSaved() {}, onClose: () => closed++ };
  try {
    await React.act(async () => root.render(React.createElement(LegalSourceCreateDialog, props))); await flush();
    const title = document.querySelector('input[name="title"]'); title.value = 'Luật thử nghiệm';
    const file = document.querySelector('input[type="file"]');
    const selectedFile = new dom.window.File(['test'], 'law.txt', { type: 'text/plain' });
    Object.defineProperty(file, 'files', { value: [selectedFile] });
    await React.act(async () => file.dispatchEvent(new Event('change', { bubbles: true })));
    await React.act(async () => document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.equal(document.querySelector('[aria-current="step"]').textContent, '2. Xem trước & xác nhận');
    assert.equal(title.closest('[hidden]').hidden, true);
    await React.act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Quay lại').click());
    assert.equal(document.querySelector('input[name="title"]'), title);
    assert.equal(title.value, 'Luật thử nghiệm');
    assert.equal(document.querySelector('input[type="file"]').files[0], selectedFile);
    await React.act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    assert.equal(closed, 0);
    assert.match(document.querySelector('[role="alert"]').textContent, /Bỏ thông tin đang nhập/);
    await React.act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Tiếp tục nhập').click());
    assert.equal(document.querySelector('[role="alert"]'), null);
    pending = true;
    await React.act(async () => root.render(React.createElement(LegalSourceCreateDialog, props)));
    await React.act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    assert.equal(closed, 0);
    assert.equal(document.querySelector('[role="alert"]'), null);
    pending = false;
    await React.act(async () => root.render(React.createElement(LegalSourceCreateDialog, props)));
    await React.act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    await React.act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Bỏ thay đổi').click());
    assert.equal(closed, 1);
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Legal source deletion focuses cancel, restores focus, and blocks dismissal while deleting', async () => {
  const { LegalSourceDeleteConfirmation } = load('components/legal-sources/legal-source-delete-confirmation.tsx');
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  let confirmed = 0;
  function App({ pending = false }) {
    const [open, setOpen] = React.useState(false);
    return React.createElement(React.Fragment, null,
      React.createElement(Button, { onClick: () => setOpen(true) }, 'Delete source'),
      open && React.createElement(LegalSourceDeleteConfirmation, {
        source: { title: 'Nguồn thử nghiệm' }, pending, error: '',
        onConfirm: () => confirmed++, onCancel: () => setOpen(false),
      }));
  }
  try {
    await React.act(async () => root.render(React.createElement(App)));
    const opener = host.querySelector('button'); opener.focus();
    await React.act(async () => opener.click()); await flush();
    assert.equal(document.activeElement.textContent, 'Hủy');
    await React.act(async () => document.activeElement.click()); await flush();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.activeElement, opener);
    assert.equal(confirmed, 0);
    await React.act(async () => opener.click()); await flush();
    await React.act(async () => root.render(React.createElement(App, { pending: true })));
    const dialog = document.querySelector('[role="dialog"]');
    assert.ok([...dialog.querySelectorAll('button')].every((button) => button.disabled));
    await React.act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    assert.ok(document.querySelector('[role="dialog"]'));
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Upload form blocks fields and dropped files during review or result loading, and unlocks after completion', async () => {
  const files = [];
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const props = { file: null, title: 'Current contract', contractType: 'service', typeLabels: { service: 'Service' },
    profile: { parties: [{ code: 'buyer', name: 'Buyer' }], industries: [{ code: 'food', name: 'Food' }] },
    ourParty: '', industry: '', isUploading: false, onFileChange: (file) => files.push(file),
    onTitleChange() {}, onContractTypeChange() {}, onOurPartyChange() {}, onIndustryChange() {},
  };
  function drop() {
    const event = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'dataTransfer', { value: { files: [{ name: 'other.pdf' }] } });
    host.querySelector('input[type="file"]').closest('label').dispatchEvent(event);
  }
  try {
    for (const state of [{ isReviewing: true }, { isLoadingResult: true }, { isUploading: true }]) {
      await React.act(async () => root.render(React.createElement(ContractUploadForm, { ...props, ...state })));
      assert.ok([...host.querySelectorAll('input, select')].every((input) => input.disabled));
      assert.equal(host.querySelector('[aria-busy]').getAttribute('aria-busy'), 'true');
      assert.ok(!host.textContent.includes('Kéo và thả tệp vào đây'));
      await React.act(async () => drop());
      assert.equal(files.length, 0);
    }
    await React.act(async () => root.render(React.createElement(ContractUploadForm, props)));
    assert.ok([...host.querySelectorAll('input, select')].every((input) => !input.disabled));
    assert.equal(host.querySelector('[role="status"]'), null);
    await React.act(async () => drop()); assert.equal(files.length, 1);
  } finally { await React.act(async () => root.unmount()); host.remove(); }
});

test('Deferring an uploaded contract closes the focus dialog, restores focus and never starts AI', async () => {
  const calls = [];
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  function App() {
    const [open, setOpen] = React.useState(false);
    return React.createElement(React.Fragment, null,
      React.createElement(Button, { onClick: () => setOpen(true) }, 'Open focus'),
      open && React.createElement(AnalysisFocusDialog, { contractTitle: 'Test contract', isReviewing: false, onReview: (focus) => calls.push(focus), onDismiss: () => setOpen(false) }));
  }
  try {
    await React.act(async () => root.render(React.createElement(App)));
    const opener = host.querySelector('button'); opener.focus();
    await React.act(async () => opener.click()); await flush();
    assert.match(document.querySelector('[role="dialog"]').textContent, /Bạn muốn AI chú ý điều gì/);
    assert.ok(![...document.querySelectorAll('button')].some((button) => button.textContent === 'Bỏ qua'));
    await React.act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Để sau').click()); await flush();
    assert.deepEqual(calls, []);
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.activeElement, opener);
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Starting review accepts an empty focus and trims a supplied focus', async () => {
  for (const value of ['', '  Payment terms  ']) {
    const calls = [];
    const host = document.createElement('div'); document.body.append(host);
    const root = createRoot(host);
    try {
      await React.act(async () => root.render(React.createElement(AnalysisFocusDialog, { contractTitle: 'Test', isReviewing: false, onReview: (focus) => calls.push(focus), onDismiss() {} }))); await flush();
      const input = document.querySelector('textarea');
      assert.ok(input.getAttribute('aria-describedby'));
      if (value) await React.act(async () => {
        Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
      await React.act(async () => [...document.querySelectorAll('button')].find((button) => button.textContent === 'Bắt đầu rà soát').click());
      assert.deepEqual(calls, [value.trim()]);
    } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
  }
});

test('Busy focus dialog disables review and deferral and blocks Escape dismissal', async () => {
  let dismissed = 0;
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    await React.act(async () => root.render(React.createElement(AnalysisFocusDialog, { contractTitle: 'Test', isReviewing: true, onReview() {}, onDismiss: () => dismissed++ }))); await flush();
    const dialog = document.querySelector('[role="dialog"]');
    assert.equal(dialog.getAttribute('aria-busy'), 'true');
    assert.ok([...dialog.querySelectorAll('button')].every((button) => button.disabled));
    await React.act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true })));
    assert.equal(dismissed, 0);
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Result header shows all severity counts and version update time; incomplete or missing data never implies safety', () => {
  const result = { contract: { _id: 'contract', title: 'Test contract', updatedAt: '2026-10-15T08:00:00Z', currentVersion: { updatedAt: '2026-10-14T23:00:00Z', summaryStatus: 'completed', riskDetectionStatus: 'completed' } }, findings: [{ severity: 'low' }, { severity: 'high' }, { severity: 'medium' }, { severity: 'high' }] };
  const render = () => {
    const host = document.createElement('div');
    host.innerHTML = renderToStaticMarkup(React.createElement(ReviewResultHeader, { result, onShareSummary() {} }));
    return host;
  };
  let header = render();
  assert.deepEqual([...header.querySelectorAll('dl dd')].map((node) => node.textContent), ['2', '1', '1']);
  assert.equal(header.querySelector('time').dateTime, '2026-10-14T23:00:00.000Z');
  assert.equal(header.querySelector('button').disabled, false);
  assert.match(header.textContent, /Đã hoàn tất phân tích/);
  result.contract.currentVersion.riskDetectionStatus = 'failed';
  result.contract.currentVersion.updatedAt = 'invalid';
  result.findings = [];
  header = render();
  assert.match(header.textContent, /Phân tích chưa hoàn tất/);
  assert.match(header.textContent, /có thể chưa đầy đủ/);
  assert.equal(header.querySelector('button').disabled, true);
  assert.equal(header.querySelector('time'), null);
  assert.match(header.textContent, /Chưa có thời điểm cập nhật/);
  assert.ok(!header.textContent.includes('Không có rủi ro'));
});

test('Share summary supports copying edited text, restoring the draft and returning focus to the full report', async () => {
  const original = 'TÓM TẮT\nNội dung đã che';
  shareState = { isPending: false, isError: false, data: { redacted: true, text: original, findingCounts: { high: 4, medium: 4, low: 1 } } };
  const copies = [];
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (text) => { copies.push(text); } } });
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  function App() {
    const [open, setOpen] = React.useState(false);
    return React.createElement(React.Fragment, null,
      React.createElement(Button, { onClick: () => setOpen(true) }, 'Open summary'),
      open && React.createElement(ShareSummaryDialog, { contractId: 'contract', onClose: () => setOpen(false) }));
  }
  const button = (text) => [...document.querySelectorAll('button')].find((node) => node.textContent === text);
  try {
    await React.act(async () => root.render(React.createElement(App)));
    const opener = button('Open summary'); opener.focus();
    await React.act(async () => opener.click()); await flush();
    assert.ok(document.querySelector('article[aria-label="Bản xem trước tóm tắt"]'));
    assert.match(document.body.textContent, /Mức rủi ro theo kết quả/);
    assert.equal(document.querySelector('textarea'), null);
    await React.act(async () => button('Chỉnh nội dung').click());
    const input = document.querySelector('textarea');
    assert.equal(input.value, original);
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(dom.window.HTMLTextAreaElement.prototype, 'value').set.call(input, 'Edited summary');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await React.act(async () => button('Sao chép tóm tắt').click());
    assert.deepEqual(copies, ['Edited summary']);
    assert.ok(button('Đã sao chép'));
    await React.act(async () => button('Khôi phục bản tóm tắt').click());
    assert.equal(input.value, original);
    assert.equal(shareState.data.text, original);
    await React.act(async () => button('Đóng').click()); await flush();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.activeElement, opener);
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Clipboard denial selects the summary and explains manual copy without claiming success', async () => {
  shareState = { isPending: false, isError: false, data: { redacted: true, text: 'Safe summary' } };
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async () => { throw new Error('Denied'); } } });
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    await React.act(async () => root.render(React.createElement(ShareSummaryDialog, { contractId: 'contract', onClose() {} }))); await flush();
    await React.act(async () => [...document.querySelectorAll('button')].find((node) => node.textContent === 'Sao chép tóm tắt').click());
    const input = document.querySelector('textarea');
    assert.equal(document.activeElement, input);
    assert.equal(input.selectionStart, 0);
    assert.equal(input.selectionEnd, input.value.length);
    assert.match(document.body.textContent, /Ctrl\+C/);
    assert.ok(![...document.querySelectorAll('button')].some((node) => node.textContent === 'Đã sao chép'));
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Share button opens a clearly labelled UI preview with email disabled and no navigation', async () => {
  shareState = { isPending: false, isError: false, data: { redacted: true, text: 'Safe summary' } };
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    await React.act(async () => root.render(React.createElement(ShareSummaryDialog, { contractId: 'contract', onClose() {} }))); await flush();
    const button = [...document.querySelectorAll('button')].find((node) => node.textContent === 'Chia sẻ');
    await React.act(async () => button.click());
    assert.equal(button.getAttribute('aria-expanded'), 'true');
    const panel = document.querySelector('section[aria-label="Chia sẻ tóm tắt"]');
    assert.match(panel.textContent, /Giao diện thử/);
    assert.equal(panel.querySelector('button').disabled, true);
    assert.equal(panel.querySelector('a'), null);
    await React.act(async () => button.click());
    assert.equal(button.getAttribute('aria-expanded'), 'false');
    assert.equal(document.querySelector('section[aria-label="Chia sẻ tóm tắt"]'), null);
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Formatted summary preserves ordinary text and renders each recognized priority as a labelled risk card', () => {
  const { ShareSummaryPreview } = load('components/contract/share-summary-preview.tsx');
  const html = renderToStaticMarkup(React.createElement(ShareSummaryPreview, {
    text: 'TÓM TẮT\nVẤN ĐỀ ƯU TIÊN\n1. [Cao] High item\n2. [Trung bình] Medium item\n3. [Thấp] Low item\nCustom edited line',
    counts: { high: 1, medium: 1, low: 1 },
  }));
  assert.match(html, /Rủi ro cao/); assert.match(html, /Rủi ro trung bình/); assert.match(html, /Rủi ro thấp/);
  assert.match(html, /High item/); assert.match(html, /Custom edited line/);
  assert.match(html, /bg-rose-100/); assert.match(html, /bg-amber-100/); assert.match(html, /bg-blue-50/);
});

test('A failed share request does not show a stale draft and prevents copying', async () => {
  shareState = { isPending: false, isError: true, data: { redacted: true, text: 'Stale content' }, refetch() {} };
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    await React.act(async () => root.render(React.createElement(ShareSummaryDialog, { contractId: 'contract', onClose() {} }))); await flush();
    assert.equal(document.querySelector('textarea'), null);
    assert.ok(!document.body.textContent.includes('Stale content'));
    assert.equal([...document.querySelectorAll('button')].find((node) => node.textContent === 'Sao chép tóm tắt').disabled, true);
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Quota notice offers plans to owners and personal users, directs members to the owner and never offers tracking', () => {
  for (const role of ['owner', 'user', 'staff', 'reviewer', 'manager']) {
    const html = renderToStaticMarkup(React.createElement(ReviewBlockedNotice, { reason: 'quota', role }));
    assert.match(html, /Hợp đồng đã lưu/);
    assert.match(html, /chưa được bắt đầu/);
    assert.ok(!html.includes('Tiếp tục theo dõi'));
    assert.match(html, new RegExp(`/dashboard/${role}/contract`));
    if (role === 'owner' || role === 'user') assert.match(html, /href="\/goi-dich-vu"/);
    else { assert.ok(!html.includes('/goi-dich-vu')); assert.match(html, /Liên hệ Chủ tổ chức/); }
  }
});
async function flush() { await React.act(async () => { await wait(); }); }

test('Organization editing trims values, clears optional fields and keeps failed saves open for retry', async () => {
  const calls = [];
  let rejectSave;
  modules.set('hooks/use-organizations.ts', { exports: { useUpdateOrganization: () => {
    const [isPending, setPending] = React.useState(false);
    const [error, setError] = React.useState(null);
    return { isPending, error, mutateAsync: async (input) => {
      calls.push(input); setPending(true); setError(null);
      try { await new Promise((_, reject) => { rejectSave = reject; }); }
      catch (failure) { setError(failure); throw failure; }
      finally { setPending(false); }
    } };
  } } });
  const { OrganizationEditDialog } = load('components/organizations/organization-edit-dialog.tsx');
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const originalFormData = globalThis.FormData; globalThis.FormData = dom.window.FormData;
  let closed = 0;
  try {
    await React.act(async () => root.render(React.createElement(OrganizationEditDialog, { organization: { id: 'org', name: '  Updated name  ', taxCode: '', address: '' }, onClose: () => { closed++; } })));
    await flush();
    const form = document.querySelector('[role="dialog"] form');
    await React.act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); });
    assert.deepEqual(calls, [{ name: 'Updated name', taxCode: null, address: null }]);
    assert.equal(form.querySelector('button[type="submit"]').disabled, true);
    await React.act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    assert.equal(closed, 0);
    await React.act(async () => rejectSave(new Error('Organization update denied')));
    assert.match(document.querySelector('[role="alert"]').textContent, /update denied/);
    assert.equal(form.querySelector('button[type="submit"]').disabled, false);
    assert.equal(closed, 0);
  } finally { globalThis.FormData = originalFormData; await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Subscription management confirms downgrades, exposes the effective date and cancels an existing schedule', async () => {
  const calls = [];
  const starter = { code: 'business_starter', name: 'Starter', audience: 'business', price: 499000, memberLimit: 5 };
  const pro = { code: 'business_pro', name: 'Pro', audience: 'business', price: 999000, memberLimit: 15 };
  const subscription = { data: { status: 'active', plan: pro, endsAt: '2026-11-01T00:00:00Z', scheduledDowngrade: { planCode: starter.code, effectiveAt: '2026-11-01T00:00:00Z' }, members: { count: 2, limit: 15 }, analysis: { available: 100, limit: 600 }, chat: { available: 200, limit: 1500 } } };
  modules.set('hooks/use-subscription-management.ts', { exports: { useSubscriptionManagement: () => ({ subscription, schedule: { reset() {}, mutateAsync: async (code) => calls.push(['schedule', code]) }, cancel: { reset() {}, mutateAsync: async () => calls.push(['cancel']) } }) } });
  modules.set('hooks/use-subscription-plans.ts', { exports: { useSubscriptionPlans: () => ({ data: [starter, pro] }) } });
  const { SubscriptionManagement } = load('components/subscription/subscription-management.tsx');
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  try {
    await React.act(async () => root.render(React.createElement(SubscriptionManagement, { orgId: 'org' })));
    assert.match(host.textContent, /1\/11\/2026/);
    await React.act(async () => Array.from(host.querySelectorAll('button')).find((button) => button.textContent.includes('Hạ xuống')).click()); await flush();
    assert.equal(calls.length, 0);
    let dialog = document.querySelector('[role="dialog"]');
    await React.act(async () => Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Đặt lịch hạ gói').click()); await flush();
    assert.deepEqual(calls, [['schedule', 'business_starter']]);
    await React.act(async () => Array.from(host.querySelectorAll('button')).find((button) => button.textContent === 'Hủy lịch hạ gói').click()); await flush();
    dialog = document.querySelector('[role="dialog"]');
    await React.act(async () => Array.from(dialog.querySelectorAll('button')).find((button) => button.textContent === 'Hủy lịch hạ gói').click()); await flush();
    assert.deepEqual(calls, [['schedule', 'business_starter'], ['cancel']]);
  } finally { await React.act(async () => root.unmount()); await flush(); host.remove(); }
});

test('Shared Button preserves submit semantics and exposes disabled loading without changing its label', () => {
  const idle = renderToStaticMarkup(React.createElement(Button, null, 'Save'));
  const busy = renderToStaticMarkup(React.createElement(Button, { type: 'submit', loading: true }, 'Saving'));
  assert.match(idle, /type="button"/);
  assert.match(busy, /type="submit"/);
  assert.match(busy, /disabled=""/);
  assert.match(busy, /aria-busy="true"/);
  assert.match(busy, /Saving/);
  assert.match(busy, /aria-hidden="true"/);
  assert.match(renderToStaticMarkup(React.createElement(Badge, { variant: 'warning' }, 'Pending')), /data-variant="warning"/);
  assert.match(renderToStaticMarkup(React.createElement(Button, { asChild: true }, React.createElement('a', { href: '/goi-dich-vu' }, 'Plans'))), /href="\/goi-dich-vu"/);
});

test('Custom UI font sizes preserve the white primary-button text and responsive text colors', () => {
  const compact = renderToStaticMarkup(React.createElement(Button, { size: 'sm' }, 'Search'));
  assert.match(compact, /text-primary-foreground/);
  assert.match(compact, /text-ui-meta/);
  assert.equal(cn('text-primary-foreground', 'text-ui-meta'), 'text-primary-foreground text-ui-meta');
  assert.equal(cn('sm:text-primary', 'sm:text-ui'), 'sm:text-primary sm:text-ui');
  assert.equal(cn('text-ui-dialog', 'text-ui-meta', 'text-primary'), 'text-ui-meta text-primary');
});

test('Capacity Dialog offers the correct action for pending invitations and restores the opener', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  const managed = [];
  function App({ pending }) {
    const [open, setOpen] = React.useState(false);
    return React.createElement(React.Fragment, null,
      React.createElement('button', { id: 'capacity-opener', onClick: () => setOpen(true) }, 'Invite'),
      open && React.createElement(MemberCapacityDialog, {
        subscription: { status: 'active', plan: null, members: { count: 3 - pending, pending, limit: 3, available: 0 } },
        onClose: () => setOpen(false), onManage: (tab) => { managed.push(tab); setOpen(false); },
      }),
    );
  }
  try {
    await React.act(async () => { root.render(React.createElement(App, { pending: 0 })); });
    const opener = document.getElementById('capacity-opener'); opener.focus();
    await React.act(async () => { opener.click(); }); await flush();
    let dialog = document.querySelector('[role="dialog"]');
    assert.equal(dialog.querySelector('a[href="/goi-dich-vu"]').textContent, 'Xem các gói dịch vụ');
    await React.act(async () => { root.render(React.createElement(App, { pending: 1 })); });
    dialog = document.querySelector('[role="dialog"]');
    const manage = [...dialog.querySelectorAll('button')].find((button) => button.textContent === 'Quản lý lời mời');
    assert.ok(manage);
    await React.act(async () => { manage.click(); }); await flush();
    assert.deepEqual(managed, ['invitations']);
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.activeElement.id, opener.id);
  } finally { await React.act(async () => { root.unmount(); }); await flush(); host.remove(); }
});

test('Management detail retains its field values, closes by Escape and restores the selected-row button', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  function App() {
    const [open, setOpen] = React.useState(false);
    const trigger = React.useRef(null);
    return React.createElement(React.Fragment, null,
      React.createElement('button', { id: 'detail-opener', ref: trigger, onClick: () => setOpen(true) }, 'Details'),
      open && React.createElement(SectionDetailDialog, {
        section: 'users', selected: ['Test User', 'test@example.com', 'Staff', 'Test organization', 'Hoạt động'],
        config: { title: 'Người dùng', columns: ['Tên', 'Email', 'Vai trò', 'Tổ chức', 'Trạng thái'], rows: [], statusIndex: 4 },
        previousFocusRef: trigger, onClose: () => setOpen(false),
      }),
    );
  }
  try {
    await React.act(async () => { root.render(React.createElement(App)); });
    const opener = document.getElementById('detail-opener'); opener.focus();
    await React.act(async () => { opener.click(); }); await flush();
    const dialog = document.querySelector('[role="dialog"]');
    assert.equal(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent, 'Test User');
    assert.equal([...dialog.querySelectorAll('dd')].map((cell) => cell.textContent).join('|'), 'Test User|test@example.com|Staff|Test organization|Hoạt động');
    await React.act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); }); await flush();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(document.activeElement.id, opener.id);
  } finally { await React.act(async () => { root.unmount(); }); await flush(); host.remove(); }
});

test('Invitation Dialog labels itself, blocks dismissal while sending and restores focus after Escape', async () => {
  const host = document.createElement('div'); document.body.append(host);
  const root = createRoot(host);
  let closeCount = 0;
  function App({ busy }) {
    const [open, setOpen] = React.useState(false);
    return React.createElement(React.Fragment, null,
      React.createElement('button', { id: 'invite-opener', onClick: () => setOpen(true) }, 'Invite'),
      open && React.createElement(InvitationFormDialog, {
        organizationName: 'Test organization', email: '', role: 'staff', submitting: busy,
        onEmailChange() {}, onRoleChange() {}, onSubmit(event) { event.preventDefault(); },
        onClose() { closeCount++; setOpen(false); },
      }),
    );
  }
  try {
    await React.act(async () => { root.render(React.createElement(App, { busy: false })); });
    const opener = document.getElementById('invite-opener'); opener.focus();
    await React.act(async () => { opener.click(); }); await flush();
    let dialog = document.querySelector('[role="dialog"]');
    assert.ok(dialog);
    assert.equal(document.getElementById(dialog.getAttribute('aria-labelledby')).textContent, 'Mời thành viên');
    assert.equal(document.activeElement.getAttribute('type'), 'email');
    await React.act(async () => { opener.focus(); });
    assert.equal(dialog.contains(document.activeElement), true);
    await React.act(async () => { root.render(React.createElement(App, { busy: true })); });
    dialog = document.querySelector('[role="dialog"]');
    assert.equal(dialog.getAttribute('aria-busy'), 'true');
    assert.equal(dialog.querySelector('[data-slot="dialog-close"]').disabled, true);
    assert.equal(dialog.querySelector('input').disabled, true);
    assert.equal(dialog.querySelector('select').disabled, true);
    assert.equal([...dialog.querySelectorAll('button')].every((button) => button.disabled), true);
    await React.act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    assert.ok(document.querySelector('[role="dialog"]'));
    assert.equal(closeCount, 0);
    await React.act(async () => {
      document.querySelector('[data-slot="dialog-overlay"]').dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    });
    assert.equal(closeCount, 0);
    await React.act(async () => { root.render(React.createElement(App, { busy: false })); });
    await React.act(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); });
    await flush();
    assert.equal(document.querySelector('[role="dialog"]'), null);
    assert.equal(closeCount, 1);
    assert.equal(document.activeElement.id, opener.id);
  } finally {
    await React.act(async () => { root.unmount(); }); await flush(); host.remove();
  }
});
