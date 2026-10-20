import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as React from 'react';
import * as jsx from 'react/jsx-runtime';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';

test('Original DOCX shows every page and scrolls clause links inside the preview', async () => {
  const dom = new JSDOM('<div id="root"></div>');
  const previous = Object.fromEntries(['window', 'document', 'IS_REACT_ACT_ENVIRONMENT'].map((key) => [key, globalThis[key]]));
  globalThis.window = dom.window;
  globalThis.document = dom.window.document;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const root = createRoot(document.getElementById('root'));
  const blob = new Blob(['docx']);
  let file = { data: blob, isError: false };
  const scrollCalls = [];
  let previewWidth = 600;
  let resize;
  Object.defineProperty(dom.window.HTMLElement.prototype, 'clientWidth', { get: () => previewWidth, configurable: true });
  Object.defineProperty(dom.window.HTMLElement.prototype, 'offsetWidth', { get: () => 800, configurable: true });
  const frames = new Map();
  let frameId = 0;
  dom.window.HTMLElement.prototype.scrollTo = function (options) { scrollCalls.push({ element: this, ...options }); };
  dom.window.HTMLElement.prototype.getBoundingClientRect = function () {
    return { top: this.tagName === 'P' ? 1200 : 100, height: 0 };
  };
  function load(path, dependencies) {
    const exports = {};
    const source = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(source, {
      exports, require: (name) => dependencies[name], document, AbortController, URL, Blob,
      ResizeObserver: class {
        constructor(callback) { resize = callback; }
        observe() {}
        disconnect() {}
      },
      requestAnimationFrame: (callback) => { frames.set(++frameId, callback); return frameId; },
      cancelAnimationFrame: (id) => frames.delete(id),
    });
    return exports;
  }
  const { OriginalContractPreview } = load('../components/review/original-contract-preview.tsx', {
    react: React, 'react/jsx-runtime': jsx,
    '@/components/ui/button': { Button: 'button' },
    '@/hooks/use-contracts': { useContractFile: () => file },
    'docx-preview': { renderAsync: async (_blob, container) => {
      container.innerHTML = '<div class="docx-wrapper"><section class="docx"><p>First page content</p></section><section class="docx"><p>Destination clause content</p></section><section class="docx"><p>Last page content</p></section></div>';
    } },
  });
  const props = { contractId: 'test', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  const render = async (extra = {}) => {
    await React.act(async () => root.render(jsx.jsx(OriginalContractPreview, { ...props, ...extra })));
    for (const callback of frames.values()) callback();
    frames.clear();
  };
  const pages = () => [...document.querySelectorAll('section.docx')];
  const visiblePages = () => pages().filter((page) => page.style.display !== 'none');
  try {
    await render();
    assert.equal(visiblePages().length, 3);
    assert.ok(pages().every((page) => page.style.zoom === '0.75'));
    previewWidth = 400;
    resize();
    assert.ok(pages().every((page) => page.style.zoom === '0.5'));
    assert.equal(document.querySelector('nav'), null);
    await render({ target: { text: 'Destination clause content', requestId: 1 } });
    assert.equal(visiblePages().length, 3);
    const paragraph = pages()[1].querySelector('p');
    assert.equal(paragraph.style.backgroundColor, 'rgb(255, 240, 191)');
    assert.equal(scrollCalls.at(-1).element, paragraph.closest('.overflow-auto'));
    assert.equal(scrollCalls.at(-1).top, 1100);
    assert.equal(scrollCalls.at(-1).behavior, 'smooth');
    await render({ target: { text: 'Missing clause content', requestId: 2 } });
    assert.match(document.body.textContent, /Không tìm thấy vị trí/);
    file = { data: new Blob(['new version']), isError: false };
    await render();
    assert.equal(visiblePages().length, 3);
    assert.equal(document.querySelector('nav'), null);
    await render({ redacted: true });
    assert.equal(visiblePages().length, 3);
    assert.equal(document.querySelector('nav'), null);
    file = { isError: true };
    await render();
    assert.equal(document.querySelector('nav'), null);
    assert.ok(document.querySelector('[role="alert"]'));
  } finally {
    await React.act(async () => root.unmount());
    dom.window.close();
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});
