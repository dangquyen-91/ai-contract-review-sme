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
    if (name === 'next/link') return { __esModule: true, default: (props) => React.createElement('a', props) };
    if (name.startsWith('@/')) {
      const path = name.slice(2);
      return load(fs.existsSync(new URL(`../${path}.tsx`, import.meta.url)) ? `${path}.tsx` : `${path}.ts`);
    }
    if (name.startsWith('.')) return load(`${posix.normalize(posix.join(posix.dirname(relative), name))}.tsx`);
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
