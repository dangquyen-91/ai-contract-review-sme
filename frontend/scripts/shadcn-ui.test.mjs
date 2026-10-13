import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { posix } from 'node:path';
import ts from 'typescript';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost', pretendToBeVisual: true });
for (const name of ['window', 'document', 'HTMLElement', 'HTMLInputElement', 'HTMLButtonElement', 'Element', 'Node', 'NodeFilter', 'MutationObserver', 'Event', 'KeyboardEvent', 'CustomEvent', 'MouseEvent']) {
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
const wait = () => new Promise((resolve) => setTimeout(resolve, 20));

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
