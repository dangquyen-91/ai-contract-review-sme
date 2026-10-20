// Uses installed Chrome and the actual Tailwind stylesheet to check native controls.
// Fixtures are isolated from the API and application session.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path, { posix } from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const root = fileURLToPath(new URL('../', import.meta.url));
const modules = new Map();
function load(relative) {
  if (modules.has(relative)) return modules.get(relative).exports;
  const loadedModule = { exports: {} }; modules.set(relative, loadedModule);
  const source = ts.transpileModule(readFileSync(path.join(root, relative), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const resolve = (name) => {
    if (name === 'next/link') return { __esModule: true, default: (props) => React.createElement('a', props) };
    if (name.startsWith('@/') || name.startsWith('.')) {
      const candidate = name.startsWith('@/') ? name.slice(2) : posix.join(posix.dirname(relative), name);
      return load(`${candidate}${existsSync(path.join(root, `${candidate}.tsx`)) ? '.tsx' : '.ts'}`);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(resolve, loadedModule, loadedModule.exports);
  return loadedModule.exports;
}
const h = React.createElement;
const { LegalSourceFilters } = load('components/legal-sources/legal-source-filters.tsx');
const { LegalSourceTable } = load('components/legal-sources/legal-source-table.tsx');
const { LegalSourceMetrics } = load('components/legal-sources/legal-source-metrics.tsx');
const { LegalSourceStatusFilters } = load('components/legal-sources/legal-source-status-filters.tsx');
const { LegalSourceCharts } = load('components/legal-sources/legal-source-charts.tsx');
const { LegalSourceAttentionList } = load('components/legal-sources/legal-source-attention-list.tsx');
const { getLegalSourceAnalytics } = load('lib/legal-source-analytics.ts');
const fixtureSources = [
  { _id: 'fixture', title: 'Luật Đất đai và các quy định về quyền, nghĩa vụ của người sử dụng đất', documentNumber: '31/2024/QH15', citationLabel: '31/2024/QH15', sourceType: 'law', status: 'in_force', issuingBody: 'Quốc hội', chunkCount: 325 },
  { _id: 'error', title: 'Nghị định cần kiểm tra quá trình xử lý', citationLabel: 'ND-01', sourceType: 'decree', chunkCount: 10, ingestion: { status: 'failed', embeddedChunks: 5, totalChunks: 10, error: 'Không thể xử lý tài liệu. Vui lòng kiểm tra và thử lại.' } },
];
const analytics = getLegalSourceAnalytics(fixtureSources);
const shellSource = readFileSync(path.join(root, 'components/layouts/dashboard/dashboard-shell.tsx'), 'utf8');
const shellClass = shellSource.match(/<div className=\{`([^`]+)\$\{className\}`\}>/)?.[1];
assert.ok(shellClass, 'Fixture must include the real dashboard focus rules');
const markup = renderToStaticMarkup(h('div', { className: shellClass }, h('main', { className: 'min-w-0 w-full p-5' },
  h(LegalSourceMetrics, { counts: [2, 2, 0, 335], pending: false }),
  h('div', { id: 'charts-fixture' }, h(LegalSourceCharts, { analytics, total: fixtureSources.length, pending: false, unavailable: false, onSelectType() {}, onSelectGroup() {} })),
  h(LegalSourceAttentionList, { sources: analytics.attention, pending: false, unavailable: false, onDetail() {} }),
  h('section', { className: 'overflow-hidden rounded-2xl border border-border bg-card' },
    h(LegalSourceFilters, { search: 'Luật Đất đai 31/2024/QH15', type: 'all', filters: { status: 'all', issuingBody: '', issuedFrom: '', issuedTo: '' }, hasFilters: true, dateError: false, onSearchChange() {}, onTypeChange() {}, onFilterChange() {}, onClear() {} }),
    h(LegalSourceStatusFilters, { value: 'all', counts: { all: 2, processing: 0, failed: 1, coverage: 0 }, loaded: true, onChange() {} }),
    h(LegalSourceTable, { sources: fixtureSources, deletePending: false, onDelete() {}, onDetail() {} })))));
const stylesheet = path.join(root, 'styles/globals.css');
const css = (await postcss([tailwind({ base: root })]).process(readFileSync(stylesheet, 'utf8'), { from: stylesheet })).css;
const artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), 'legal-source-ui-'));
// Mount the actual interactive charts so ResizeObserver, Recharts and tooltips run in Chrome.
const entry = path.join(artifactDir, 'entry.js');
const loader = path.join(artifactDir, 'typescript-loader.cjs');
await fs.writeFile(loader, `const ts = require(${JSON.stringify(require.resolve('typescript'))}); module.exports = function(source) { return ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText; };`);
await fs.writeFile(entry, `import React from 'react'; import { createRoot } from 'react-dom/client'; import { LegalSourceCharts } from '@/components/legal-sources/legal-source-charts'; import { getLegalSourceAnalytics } from '@/lib/legal-source-analytics'; const chartRoot = createRoot(document.getElementById('charts-fixture')); window.renderCharts = sources => chartRoot.render(React.createElement(LegalSourceCharts, { analytics: getLegalSourceAnalytics(sources), total: sources.length, pending: false, unavailable: false, onSelectType: value => { window.chartAction = value; }, onSelectGroup: value => { window.chartAction = value; } })); window.renderCharts(${JSON.stringify(fixtureSources)});`);
await fs.appendFile(entry, `
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LegalSourceDetailDialog } from '@/components/legal-sources/legal-source-detail-dialog';
const detailHost = document.createElement('div'); document.body.append(detailHost);
const detailRoot = createRoot(detailHost); const queryClient = new QueryClient({defaultOptions:{queries:{retry:false}}});
const sourceIds = ${JSON.stringify(fixtureSources.map((source) => source._id))};
window.openSourceDetails = id => detailRoot.render(React.createElement(QueryClientProvider, {client:queryClient}, React.createElement(LegalSourceDetailDialog,{id,onClose:()=>detailRoot.render(null)})));
document.querySelectorAll('table tbody tr').forEach((row,index)=>row.querySelectorAll('[aria-haspopup=dialog]').forEach(button=>button.addEventListener('click',()=>window.openSourceDetails(sourceIds[index]))));
`);
const { webpack } = require('next/dist/compiled/webpack/webpack');
await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry, output: { path: artifactDir, filename: 'charts.js' }, resolve: { extensions: ['.tsx', '.ts', '.js', '.json'], alias: { '@': root }, modules: [path.join(root, 'node_modules'), 'node_modules'] }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] } }, (error, stats) => {
  if (error || stats.hasErrors()) reject(error || new Error(stats.toString({ all: false, errors: true })));
  else resolve();
}));
const bundle = await fs.readFile(path.join(artifactDir, 'charts.js'));
const html = `<!doctype html><html lang="vi"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>:root{--foreground:#171717;--background:#fff}@media(prefers-color-scheme:dark){:root{--foreground:#ededed;--background:#0a0a0a}}body{margin:0;font-family:Arial,sans-serif}</style><body>${markup}<script src="/charts.js"></script></body></html>`;
const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/admin/legal-sources/')) {
    const source = fixtureSources.find((item) => req.url === `/api/admin/legal-sources/${item._id}`);
    res.setHeader('Content-Type', 'application/json');
    if (!source) { res.writeHead(404); res.end(JSON.stringify({success:false,error:{message:'Source not found'}})); return; }
    res.end(JSON.stringify({success:true,data:{...source,code:'land_law_2024',issuedDate:'2024-01-18',effectiveDate:'2024-08-01',coverage:{structured:true,complete:true,articleCount:260,chunkCount:source.chunkCount,missingRanges:[],warnings:[]},parts:[{fileName:'luat-dat-dai-2024.pdf',chunkCount:source.chunkCount,skippedArticles:[],uploadedAt:'2026-10-01T00:00:00Z'}]}})); return;
  }
  res.setHeader('Content-Type', req.url === '/charts.js' ? 'application/javascript' : 'text/html; charset=utf-8'); res.end(req.url === '/charts.js' ? bundle : html);
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const child = spawn(chrome, ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${path.join(artifactDir, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
let chromeLog = '';
child.stderr.on('data', (chunk) => { chromeLog += chunk; });
let socket;
try {
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = (await fs.readFile(path.join(artifactDir, 'profile/DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  assert.ok(port, `Chrome debugging port was not started: ${chromeLog}`);
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`, { signal: AbortSignal.timeout(5000) })).json();
  socket = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id); pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message)); else resolve(message.result);
    }
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome timed out: ${method}`)); }, 10000);
    pending.set(id, { resolve: (value) => { clearTimeout(timer); resolve(value); }, reject: (error) => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  await call('Page.enable');
  await call('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` });
  await new Promise((resolve) => setTimeout(resolve, 500));
  for (const width of [1440, 1024, 768, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await new Promise((resolve) => setTimeout(resolve, 150));
    for (const theme of ['light', 'dark']) {
      await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: theme }] });
      const { result, exceptionDetails } = await call('Runtime.evaluate', { returnByValue: true, expression: `(() => {
        const input = document.querySelector('input[type=search]'); input.focus();
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1;
        const context = canvas.getContext('2d');
        const luminance = (color) => {
          context.clearRect(0,0,1,1); context.fillStyle = color; context.fillRect(0,0,1,1);
          const rgb = [...context.getImageData(0,0,1,1).data].slice(0,3).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; });
          return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
        };
        const contrast = (foreground, background) => { const a = luminance(foreground), b = luminance(background); return (Math.max(a,b)+.05)/(Math.min(a,b)+.05); };
        const rect = (node) => { const r = node.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:r.width, height:r.height }; };
        const controls = [input.parentElement, ...document.querySelectorAll('select')];
        return { inputColor: getComputedStyle(input).color, inputOutline: getComputedStyle(input).outlineStyle,
          selectColors: [...document.querySelectorAll('select')].map(node => getComputedStyle(node).color),
          selectSchemes: [...document.querySelectorAll('select')].map(node => getComputedStyle(node).colorScheme),
          controls: controls.map(rect), input: rect(input), wrapper: rect(input.parentElement),
          chips: [...document.querySelectorAll('[aria-pressed]')].map(node => ({ ...rect(node), contrast: contrast(getComputedStyle(node).color, getComputedStyle(node).backgroundColor), badgeContrast: contrast(getComputedStyle(node.lastElementChild).color, getComputedStyle(node.lastElementChild).backgroundColor), badgeLuminance: luminance(getComputedStyle(node.lastElementChild).backgroundColor), badge: rect(node.lastElementChild), label: rect(node.querySelector('span')) })),
          chartCount: document.querySelectorAll('[aria-label="Phân tích kho pháp lý"] article').length,
          sectors: document.querySelectorAll('.recharts-pie-sector').length,
          bars: document.querySelectorAll('.recharts-bar-rectangle').length,
          pageWidth: document.documentElement.scrollWidth, viewport: innerWidth };
      })()` });
      assert.equal(exceptionDetails, undefined);
      const value = result.value;
      assert.equal(value.inputColor, 'rgb(20, 33, 61)', `${width}/${theme}: input contrast`);
      assert.equal(value.inputOutline, 'none', `${width}/${theme}: no duplicate focus outline`);
      assert.ok(value.selectColors.every((color) => color === 'rgb(20, 33, 61)'), `${width}/${theme}: select contrast`);
      assert.ok(value.selectSchemes.every((scheme) => scheme === 'light'), `${width}/${theme}: native menu theme`);
      assert.ok(value.pageWidth <= value.viewport, `${width}/${theme}: no page overflow`);
      assert.equal(value.chartCount, 2, 'Both chart panels are visible in the page');
      assert.ok(value.sectors > 0 && value.bars > 0, 'Recharts renders actual donut sectors and bar geometry');
      for (const chip of value.chips) {
        assert.ok(chip.contrast >= 4.5, 'Status filters have accessible text contrast');
        assert.ok(chip.badgeContrast >= 4.5 && chip.badgeLuminance >= 0.7, 'Status counts have readable text on light backgrounds');
        assert.ok(chip.label.right <= chip.badge.left, 'Status label and count do not overlap');
        assert.ok(chip.badge.right <= chip.right && chip.badge.left >= chip.left, 'Count stays inside filter');
      }
      assert.ok(value.input.left >= value.wrapper.left && value.input.right <= value.wrapper.right, 'Search text fits wrapper');
      for (let i = 0; i < value.controls.length; i++) {
        assert.equal(value.controls[i].height, 48, 'Control heights are consistent');
        for (let j = i + 1; j < value.controls.length; j++) {
          const a = value.controls[i], b = value.controls[j];
          assert.ok(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top, 'Filter controls do not overlap');
        }
      }
      const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      await fs.writeFile(path.join(artifactDir, `${width}-${theme}.png`), Buffer.from(screenshot.data, 'base64'));
      console.log(`PASS ${width}px ${theme}: contrast, focus, widths, and control spacing`);
    }
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const { result: point } = await call('Runtime.evaluate', { returnByValue: true, expression: `(() => { const r = document.querySelector('[data-slot=chart] svg.recharts-surface').getBoundingClientRect(); return { x: r.left + r.width/2, y: r.top + r.height*.15 }; })()` });
  await call('Input.dispatchMouseEvent', { type: 'mouseMoved', ...point.value });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const { result: tooltip } = await call('Runtime.evaluate', { returnByValue: true, expression: `document.querySelector('.recharts-tooltip-wrapper').textContent` });
  assert.match(tooltip.value, /Luật/);
  assert.match(tooltip.value, /1 nguồn.*50%/);
  const screenshot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  await fs.writeFile(path.join(artifactDir, 'tooltip.png'), Buffer.from(screenshot.data, 'base64'));
  await call('Input.dispatchMouseEvent', { type: 'mousePressed', ...point.value, button: 'left', clickCount: 1 });
  await call('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point.value, button: 'left', clickCount: 1 });
  const { result: action } = await call('Runtime.evaluate', { returnByValue: true, expression: 'window.chartAction' });
  assert.equal(action.value, 'law', 'Selecting a donut sector filters the correct source type');
  await call('Runtime.evaluate', { expression: `window.renderCharts(${JSON.stringify(fixtureSources.slice(0, 1))})` });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const { result: single } = await call('Runtime.evaluate', { returnByValue: true, expression: `({ sectors: document.querySelectorAll('.recharts-pie-sector').length, invalid: document.querySelector('#charts-fixture').innerHTML.includes('NaN') })` });
  assert.equal(single.value.sectors, 1);
  assert.equal(single.value.invalid, false);
  await call('Runtime.evaluate', { expression: 'window.renderCharts([])' });
  await new Promise((resolve) => setTimeout(resolve, 150));
  const { result: empty } = await call('Runtime.evaluate', { returnByValue: true, expression: `({ sectors: document.querySelectorAll('.recharts-pie-sector').length, text: document.querySelector('#charts-fixture').textContent })` });
  assert.equal(empty.value.sectors, 0);
  assert.match(empty.value.text, /Thêm nguồn đầu tiên/);
  console.log('PASS chart tooltip, sector selection, single-source and empty states');
  for (const width of [1440, 768, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call('Runtime.evaluate', { expression: `(() => { const opener=document.querySelector('table tbody tr [aria-label^="Xem chi tiết"]'); window.detailOpener=opener; opener.focus(); opener.click(); })()` });
    let loaded = false;
    for (let attempt = 0; attempt < 50; attempt++) {
      const { result } = await call('Runtime.evaluate', { returnByValue:true, expression:`document.querySelector('[role=dialog]')?.textContent.includes('land_law_2024')` });
      if (result.value) { loaded = true; break; }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(loaded, 'Dialog fetches source details');
    await new Promise((resolve) => setTimeout(resolve, 350));
    const { result } = await call('Runtime.evaluate', { returnByValue:true, expression:`(() => { const dialog=document.querySelector('[role=dialog]'); const rect=dialog.getBoundingClientRect(); const scroll=dialog.children[1]; const footer=[...dialog.querySelectorAll('button')].find(button=>button.textContent==='Đóng chi tiết').parentElement.getBoundingClientRect(); return {left:rect.left,right:rect.right,top:rect.top,bottom:rect.bottom,width:innerWidth,height:innerHeight,scrollable:scroll.scrollHeight>scroll.clientHeight,footerBottom:footer.bottom,opacity:getComputedStyle(dialog).opacity,background:getComputedStyle(dialog).backgroundColor,url:location.pathname}; })()` });
    assert.ok(result.value.left >= 0 && result.value.right <= result.value.width && result.value.top >= 0 && result.value.bottom <= result.value.height, 'Detail popup fits viewport');
    assert.ok(result.value.scrollable, 'Long detail content scrolls inside popup');
    assert.equal(result.value.opacity, '1', 'Detail text is fully visible after opening');
    assert.equal(result.value.background, 'rgb(255, 255, 255)', 'Opaque popup surface keeps underlying text out');
    assert.ok(result.value.footerBottom <= result.value.bottom, 'Close action stays within the fixed footer');
    assert.equal(result.value.url, '/', 'Viewing details does not navigate');
    const shot = await call('Page.captureScreenshot', { format:'png', captureBeyondViewport:false });
    await fs.writeFile(path.join(artifactDir, `detail-${width}.png`), Buffer.from(shot.data,'base64'));
    await call('Input.dispatchKeyEvent', { type:'keyDown', key:'Escape', code:'Escape', windowsVirtualKeyCode:27 });
    await new Promise((resolve)=>setTimeout(resolve,250));
    const { result: closed } = await call('Runtime.evaluate', { returnByValue:true, expression:`({closed:!document.querySelector('[role=dialog]'),focus:document.activeElement===window.detailOpener})` });
    assert.ok(closed.value.closed && closed.value.focus, 'Closing popup restores focus to original detail button');
    console.log(`PASS ${width}px detail dialog: API data, scrolling, close and focus restoration`);
  }
  console.log(`Screenshots: ${artifactDir}`);
} finally {
  socket?.close(); child.kill(); server.close();
}
