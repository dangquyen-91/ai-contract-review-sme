// Isolated browser QA against real React components and fixture APIs.
// No real database, authentication, AI or payment requests are made.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';
import { dashboardInsightsFixture } from './fixtures/dashboard-insights.mjs';
import ExcelJS from 'exceljs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lawscan-dashboard-'));
const shots = path.join(root, 'output/playwright/dashboard');
await fs.mkdir(shots, { recursive: true });
const stylesheet = path.join(root, 'styles/globals.css');
const css = (await postcss([tailwind({ base: root })]).process(readFileSync(stylesheet, 'utf8'), { from: stylesheet })).css;
const loader = path.join(dir, 'loader.cjs'), entry = path.join(dir, 'entry.js'), link = path.join(dir, 'link.js');
await fs.writeFile(loader, `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}`);
await fs.writeFile(link, `import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`);
await fs.writeFile(entry, `
import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {RoleInsights} from '@/components/overview/role-insights';
import {AccountAllowance} from '@/components/overview/account-allowance';
const role=new URLSearchParams(location.search).get('role')||'administrator';
const h=React.createElement;const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
createRoot(document.getElementById('root')).render(h(QueryClientProvider,{client},h('main',{className:'mx-auto grid max-w-7xl gap-6'},h(RoleInsights,{role,heading:true}),['owner','user'].includes(role)?h(AccountAllowance,{accountId:'${'a'.repeat(24)}',personal:role==='user'}):null)));
`);
const { webpack } = require('next/dist/compiled/webpack/webpack');
await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry,
  output: { path: dir, filename: 'app.js' },
  resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root, 'next/link': link }, modules: [path.join(root, 'node_modules'), 'node_modules'] },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] },
}, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
const bundle = await fs.readFile(path.join(dir, 'app.js'));
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>body{margin:0;background:#f6f7f9;font-family:Arial}#root{padding:24px}@media(max-width:500px){#root{padding:16px}}</style><div id="root"></div><script src="/app.js"></script></html>`;
let failure = false, empty = false;
const requests = [];
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture');
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(status < 400 ? { success: true, data } : { success: false, error: data })); };
  if (url.pathname === '/fixture/state') { failure = url.searchParams.get('failure') === 'true'; empty = url.searchParams.get('empty') === 'true'; return send(null); }
  if (url.pathname === '/api/dashboard/insights') {
    requests.push(url.search);
    if (failure) return send({ message: 'Chưa tải được thống kê. Vui lòng thử lại.' }, 503);
    const role = new URL(req.headers.referer || 'http://fixture').searchParams.get('role') || 'administrator';
    return send(dashboardInsightsFixture(role, url.searchParams.get('period') || 'month', empty));
  }
  if (url.pathname.endsWith('/subscription')) return send({ analysis: { used: 12, reserved: 2, limit: 50, available: 36 }, chat: { used: 20, reserved: 0, limit: 100, available: 80 }, drafting: { used: 8, reserved: 1, limit: 25, available: 16 } });
  if (url.pathname === '/app.js') { res.setHeader('Content-Type', 'application/javascript'); return res.end(bundle); }
  if (/^\/[a-zA-Z0-9_-]+(?:\.[a-zA-Z0-9_-]+)*\.js$/.test(url.pathname)) {
    try { const chunk = await fs.readFile(path.join(dir, url.pathname.slice(1))); res.setHeader('Content-Type', 'application/javascript'); return res.end(chunk); }
    catch { res.writeHead(404); return res.end(); }
  }
  res.setHeader('Content-Type', 'text/html;charset=utf-8'); res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${path.join(dir, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) { try { port = (await fs.readFile(path.join(dir, 'profile/DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
  assert.ok(port, 'Chrome did not start');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0; const pending = new Map();
  socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (!pending.has(message.id)) return; const fn = pending.get(message.id); pending.delete(message.id); if (message.error) fn.reject(new Error(message.error.message)); else fn.resolve(message.result); };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout ${method}`)); }, 30000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => { const value = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (value.exceptionDetails) throw new Error(value.exceptionDetails.text + ': ' + value.result.description); return value.result.value; };
  const wait = async expression => { for (let i = 0; i < 150; i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`UI wait failed: ${expression}\n${await evaluate('document.body.innerText.slice(0,2500)')}`); };
  const click = async text => { const match = `[...document.querySelectorAll('button,a,summary')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&!e.disabled)`; await wait(`!!(${match})`); await evaluate(`(${match}).click()`); };
  const navigate = async role => { await call('Page.navigate', { url: origin + '/?role=' + role }); await wait('!!document.querySelector("h1")'); };
  await call('Page.enable');
  for (const role of ['administrator', 'owner', 'staff', 'expert', 'manager', 'user']) {
    for (const width of [1440, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 500 });
      await navigate(role);
      await wait('!!document.querySelector("[aria-label=\\"Chỉ số thống kê\\"]") && document.querySelectorAll(".recharts-wrapper > .recharts-surface").length===2');
      assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), `${role} overflows at ${width}`);
      assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent.trim()==="Xuất CSV")'), role !== 'staff');
      assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent.trim()==="Xuất Excel")'), role !== 'staff');
      if (['owner', 'user'].includes(role)) await wait('document.querySelectorAll("progress").length===3');
      const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
      await fs.writeFile(path.join(shots, `${role}-${width}.png`), Buffer.from(shot.data, 'base64'));
    }
  }
  await navigate('expert'); await wait('document.body.textContent.includes("127")');
  await evaluate('(()=>{const e=document.querySelector("select");Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,"value").set.call(e,"quarter");e.dispatchEvent(new Event("change",{bubbles:true}));})()');
  await wait('document.body.textContent.includes("2026-10-01")');
  assert.ok(requests.some(query => query === '?period=quarter'));
  await fetch(origin + '/fixture/state?empty=true'); await click('Làm mới');
  await wait('document.body.textContent.includes("Chưa có hoạt động trong kỳ đã chọn.")');
  assert.equal(await evaluate('document.querySelectorAll(".recharts-wrapper > .recharts-surface").length'), 0);
  await fetch(origin + '/fixture/state?failure=true'); await click('Làm mới');
  await wait('!!document.querySelector("[role=alert]")');
  assert.ok(await evaluate('[...document.querySelectorAll("button")].find(e=>e.textContent.trim()==="Xuất CSV").disabled'));
  await fetch(origin + '/fixture/state'); await click('Thử lại');
  await wait('!document.querySelector("[role=alert]") && document.querySelectorAll(".recharts-wrapper > .recharts-surface").length===2');
  await click('Xem bảng số liệu');
  assert.equal(await evaluate('document.querySelectorAll("table tbody tr").length'), 10);
  const downloads = await fs.mkdtemp(path.join(shots, 'download-'));
  await call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await click('Xuất CSV');
  for (let attempt = 0; attempt < 40; attempt++) { if ((await fs.readdir(downloads)).some(file => file.endsWith('.csv'))) break; await new Promise(resolve => setTimeout(resolve, 100)); }
  const csvName = (await fs.readdir(downloads)).find(file => file.endsWith('.csv'));
  assert.ok(csvName, 'CSV download should finish');
  const csv = await fs.readFile(path.join(downloads, csvName), 'utf8');
  assert.ok(csv.startsWith('\uFEFFsep=,\r\n'));
  assert.ok(csv.includes('"Đã duyệt","19","Trong kỳ"'));
  assert.ok(csv.includes('"Múi giờ","Asia/Ho_Chi_Minh"'));
  assert.ok(csv.includes('"Thời gian xác minh","1,4 phút","Trong kỳ"'));
  assert.ok(csv.includes('"Cập nhật lúc","15/11/2026 12:00:00"'));
  await click('Xuất Excel');
  for (let attempt = 0; attempt < 100; attempt++) { if ((await fs.readdir(downloads)).some(file => file.endsWith('.xlsx'))) break; await new Promise(resolve => setTimeout(resolve, 100)); }
  const excelName = (await fs.readdir(downloads)).find(file => file.endsWith('.xlsx'));
  assert.ok(excelName, 'Excel download should finish');
  const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(await fs.readFile(path.join(downloads, excelName)));
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ['Tổng quan', 'Xu hướng', 'Chi tiết']);
  assert.equal(workbook.getWorksheet('Tổng quan').getCell('B16').value, 19);
  assert.equal(workbook.getWorksheet('Tổng quan').getCell('B18').value, 82.5);
  assert.ok(excelName.includes('2026-10-01-2026-11-15'));
  console.log('PASS six dashboards at desktop/mobile, charts, quota, period changes, empty/error/retry, table and downloaded CSV/Excel with typed values');
  console.log(`Screenshots: ${shots}`);
} finally {
  socket?.close(); chrome.kill(); await new Promise(resolve => server.close(resolve));
}
