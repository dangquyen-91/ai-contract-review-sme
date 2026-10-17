import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function harness(reducedMotion = false) {
  const calls = [], frames = new Map();
  const ref = { current: { scrollIntoView: (options) => calls.push(options) } };
  let previous, cleanup, frameId = 0;
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL('../hooks/use-review-timeline-scroll.ts', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    require: () => ({
      useRef: () => ref,
      useEffect: (effect, deps) => {
        if (previous === deps[0]) return;
        cleanup?.(); previous = deps[0]; cleanup = effect();
      },
    }),
    window: {
      requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
      cancelAnimationFrame: (id) => frames.delete(id),
      matchMedia: () => ({ matches: reducedMotion }),
    },
  });
  return {
    calls,
    render: (request) => exports.useReviewTimelineScroll(request),
    flush: () => { const pending = [...frames.values()]; frames.clear(); pending.forEach((callback) => callback()); },
    unmount: () => cleanup?.(),
  };
}

test('Timeline scroll waits for layout and runs once per explicit request, never on initial render or progress updates', () => {
  const ctx = harness();
  ctx.render(0); ctx.flush(); assert.equal(ctx.calls.length, 0);
  ctx.render(1); assert.equal(ctx.calls.length, 0);
  ctx.flush(); assert.equal(ctx.calls[0].behavior, 'smooth');
  assert.equal(ctx.calls[0].block, 'start');
  ctx.render(1); ctx.flush(); assert.equal(ctx.calls.length, 1);
  ctx.render(2); ctx.flush(); assert.equal(ctx.calls.length, 2);
});

test('Reduced motion scrolls to the timeline without animation', () => {
  const ctx = harness(true);
  ctx.render(1); ctx.flush();
  assert.equal(ctx.calls[0].behavior, 'instant');
});

test('Leaving the workspace cancels a pending scroll', () => {
  const ctx = harness();
  ctx.render(1); ctx.unmount(); ctx.flush();
  assert.equal(ctx.calls.length, 0);
});
