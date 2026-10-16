import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness({ bounds = { top: 100, bottom: 500 }, reduced = false, interacting = false, hidden = false } = {}) {
  const slots = [], frames = new Map(), scrolls = [], focuses = [], notices = [], dismissed = [], navigations = [];
  let cursor = 0, frameId = 0;
  const equal = (a, b) => a && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
  const react = {
    useRef: (initial) => { const index = cursor++; slots[index] ??= { current: initial }; return slots[index]; },
    useCallback: (callback, deps) => {
      const index = cursor++;
      if (!equal(slots[index]?.deps, deps)) slots[index] = { deps, callback };
      return slots[index].callback;
    },
    useEffect: (effect, deps) => {
      const index = cursor++;
      if (equal(slots[index]?.deps, deps)) return;
      slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: effect() };
    },
  };
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(new URL('../hooks/use-review-result-navigation.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const timelineRef = { current: { getBoundingClientRect: () => bounds } };
  const resultRef = { current: { scrollIntoView: (options) => scrolls.push(options), focus: (options) => focuses.push(options) } };
  const onOpenResult = () => navigations.push('review-result');
  vm.runInNewContext(source, {
    exports, require: (name) => name === 'react' ? react : { toast: {
      success: (message, options) => { notices.push({ message, options }); return notices.length; },
      dismiss: (id) => dismissed.push(id),
    } },
    window: {
      innerHeight: 800,
      matchMedia: () => ({ matches: reduced }),
      requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
      cancelAnimationFrame: (id) => frames.delete(id),
    },
    document: { visibilityState: hidden ? 'hidden' : 'visible', activeElement: { closest: () => interacting ? {} : null } },
  });
  return {
    scrolls, focuses, notices, dismissed, navigations, timelineRef, resultRef,
    render: (resultKey) => { cursor = 0; exports.useReviewResultNavigation({ resultKey, title: 'Test', timelineRef, resultRef, onOpenResult }); },
    move: (next) => { bounds = next; },
    flush: () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback()); },
    unmount: () => { slots.forEach((slot) => slot.cleanup?.()); },
  };
}

test('A result scrolls once only when the reader is near the timeline, without stealing focus', () => {
  const ctx = harness();
  ctx.render(undefined); ctx.flush(); assert.equal(ctx.scrolls.length, 0);
  ctx.render('contract:version1'); assert.equal(ctx.scrolls.length, 0); ctx.flush();
  assert.equal(ctx.scrolls[0].behavior, 'smooth');
  assert.equal(ctx.notices.length, 0);
  assert.equal(ctx.focuses.length, 0);
  ctx.render('contract:version1'); ctx.flush(); assert.equal(ctx.scrolls.length, 1);
});

test('Reading elsewhere preserves position and offers an explicit view-result action', () => {
  const ctx = harness({ bounds: { top: -900, bottom: -100 } });
  ctx.render('contract:version1'); ctx.flush();
  assert.equal(ctx.scrolls.length, 0);
  assert.equal(ctx.notices.length, 1);
  assert.equal(ctx.notices[0].options.duration, Infinity);
  assert.equal(ctx.notices[0].options.action.label, 'Xem kết quả');
  ctx.notices[0].options.action.onClick();
  assert.equal(ctx.scrolls.length, 1);
  assert.equal(ctx.focuses[0].preventScroll, true);
  assert.ok(ctx.dismissed.includes(1));
});

test('Visibility is measured at completion, after the reader has moved', () => {
  const ctx = harness();
  ctx.render('contract:version1');
  ctx.move({ top: 1200, bottom: 1600 }); ctx.flush();
  assert.equal(ctx.scrolls.length, 0); assert.equal(ctx.notices.length, 1);
});

test('Typing, using a dialog or viewing a background tab never triggers automatic scrolling', () => {
  for (const options of [{ interacting: true }, { hidden: true }]) {
    const ctx = harness(options); ctx.render('contract:version1'); ctx.flush();
    assert.equal(ctx.scrolls.length, 0); assert.equal(ctx.notices.length, 1);
  }
});

test('Reduced motion applies to both automatic and explicit result navigation', () => {
  for (const bounds of [{ top: 100, bottom: 500 }, { top: -900, bottom: -100 }]) {
    const ctx = harness({ reduced: true, bounds }); ctx.render('contract:version1'); ctx.flush();
    ctx.notices[0]?.options.action.onClick();
    assert.equal(ctx.scrolls[0].behavior, 'instant');
  }
});

test('Removing results or leaving the workspace cancels pending navigation and dismisses stale notices', () => {
  const pending = harness(); pending.render('contract:version1'); pending.unmount(); pending.flush();
  assert.equal(pending.scrolls.length, 0); assert.equal(pending.notices.length, 0);
  const shown = harness({ bounds: { top: 1500, bottom: 2000 } });
  shown.render('contract:version1'); shown.flush(); shown.render(undefined); shown.flush();
  assert.ok(shown.dismissed.includes(1)); assert.equal(shown.scrolls.length, 0);
});

test('Completion on another dashboard page still notifies, and its action opens the saved result', () => {
  const ctx = harness();
  ctx.timelineRef.current = null; ctx.resultRef.current = null;
  ctx.render('contract:version1'); ctx.flush();
  assert.equal(ctx.notices.length, 1); assert.equal(ctx.scrolls.length, 0);
  ctx.notices[0].options.action.onClick();
  assert.deepEqual(ctx.navigations, ['review-result']);
  assert.ok(ctx.dismissed.includes(1));
});

test('A background browser tab notifies without waiting for an animation frame', () => {
  const ctx = harness({ hidden: true });
  ctx.render('contract:version1');
  assert.equal(ctx.notices.length, 1);
  assert.equal(ctx.scrolls.length, 0);
  ctx.flush(); assert.equal(ctx.notices.length, 1);
});
