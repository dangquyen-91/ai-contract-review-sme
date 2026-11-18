// Real Chrome + real components; isolated API fixtures, no live accounts or DB.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';
import postcss from 'postcss';
import tailwind from '@tailwindcss/postcss';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lawscan-consultation-ui-'));
const entry = path.join(dir, 'entry.tsx'), loader = path.join(dir, 'loader.cjs');
await fs.writeFile(loader, `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;`);
await fs.writeFile(entry, `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {QueryClient,QueryClientProvider} from '@tanstack/react-query';
import {ExpertChatLauncher} from '@/components/expert-consultation/expert-chat-launcher';
const participant=new URLSearchParams(location.search).get('role')==='expert'?'expert':'requester';
createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><main><h1>Hợp đồng lao động</h1><ExpertChatLauncher reviewId={'a'.repeat(24)} attempt={1} title="Hợp đồng lao động kiểm thử" participant={participant}/></main></QueryClientProvider>);
`);
const { webpack } = require('next/dist/compiled/webpack/webpack');
await new Promise((resolve, reject) => webpack({
  mode: 'development', devtool: false, entry, output: { path: dir, filename: 'app.js' },
  resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root }, modules: [path.join(root, 'node_modules'), 'node_modules'] },
  module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }] },
}, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
const stylesheet = path.join(root, 'styles/globals.css');
const css = (await postcss([tailwind({ base: root })]).process(await fs.readFile(stylesheet, 'utf8'), { from: stylesheet })).css;
const bundle = await fs.readFile(path.join(dir, 'app.js'));
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>body{margin:0;background:#f6f7f9;font-family:Arial}main{padding:24px}</style><div id="root"></div><script src="/app.js"></script></html>`;
let status = 'in_progress', viewer = 'requester', failOnce = false, sends = [];
let items = Array.from({ length: 35 }, (_, i) => ({ id: String(i + 1).padStart(24, '0'), attempt: 1, senderId: 'sender', senderType: i % 2 ? 'expert' : 'requester', senderName: i % 2 ? 'Chuyên gia Minh Anh' : 'Nguyễn Tấn Phúc', clientMessageId: `seed-${i}`, content: `Nội dung trao đổi ${i + 1}: Làm rõ nghĩa vụ thanh toán và thời hạn thực hiện.`, createdAt: '2026-11-17T12:00:00Z' }));
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture');
  const send = (data, code = 200) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(code < 400 ? { success: true, data } : { success: false, error: data })); };
  if (url.pathname === '/app.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(bundle); }
  if (url.pathname.endsWith('/verification/messages')) {
    if (req.method === 'POST') {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const input = JSON.parse(raw); sends.push(input);
      const existing = items.find(item => item.clientMessageId === input.clientMessageId);
      const item = existing ?? { ...input, id: String(items.length + 1).padStart(24, '0'), senderId: 'sender', senderType: viewer, createdAt: new Date().toISOString() };
      if (!existing) items.push(item);
      if (failOnce) { failOnce = false; return send({ message: 'Lost response' }, 503); }
      return send({ message: item, replayed: Boolean(existing) }, existing ? 200 : 201);
    }
    let rows = items;
    if (url.searchParams.has('before')) rows = rows.filter(item => item.id < url.searchParams.get('before'));
    const limit = Number(url.searchParams.get('limit') || 30);
    return send({ attempt: 1, status, canSend: status === 'in_progress', items: rows.slice(-limit), hasMore: rows.length > limit, nextBefore: rows.slice(-limit)[0]?.id ?? null, nextAfter: rows.at(-1)?.id ?? null });
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8'); res.end(html);
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${path.join(dir, 'profile')}`, 'about:blank',
], { windowsHide: true, stdio: 'ignore' });
let socket;
try {
  let port;
  for (let i = 0; i < 100; i++) {
    try { port = (await fs.readFile(path.join(dir, 'profile/DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(port, 'Chrome did not start');
  const pages = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0; const pending = new Map();
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data); const task = pending.get(message.id); if (!task) return;
    pending.delete(message.id);
    if (message.error) task.reject(new Error(message.error.message));
    else task.resolve(message.result);
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++sequence, timer = setTimeout(() => reject(new Error(`Timeout: ${method}`)), 15000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.result.description);
    return result.result.value;
  };
  const wait = async expression => {
    for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); }
    throw new Error(`UI wait failed: ${expression}`);
  };
  const click = async label => {
    const target = `[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(label)}&&!b.disabled)`;
    await wait(`Boolean(${target})`); await evaluate(`(${target}).click()`);
  };
  const fill = async text => evaluate(`(()=>{const e=document.querySelector('textarea');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(e,${JSON.stringify(text)});e.dispatchEvent(new Event('input',{bubbles:true}));})()`);
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: origin });
  await click('Trao đổi với chuyên gia');
  await wait('document.querySelectorAll("article").length===30');
  await click('Tải tin nhắn cũ'); await wait('document.querySelectorAll("article").length===35');
  await fill('Tôi muốn làm rõ thời hạn thanh toán.');
  failOnce = true;
  await click('Gửi tin nhắn'); await wait('document.body.textContent.includes("Thử gửi lại")');
  assert.equal(await evaluate('document.querySelector("textarea").value'), 'Tôi muốn làm rõ thời hạn thanh toán.');
  await click('Thử gửi lại'); await wait('document.querySelector("textarea").value===""');
  assert.equal(sends.length, 2); assert.equal(sends[0].clientMessageId, sends[1].clientMessageId);
  assert.equal(items.filter(item => item.content === 'Tôi muốn làm rõ thời hạn thanh toán.').length, 1);
  await fs.writeFile(path.join(dir, 'requester-desktop.png'), Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await wait('!!document.querySelector("[role=dialog]")');
  assert.equal(await evaluate('(()=>{const r=document.querySelector("[role=dialog]").getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight+1})()'), true);
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  await fs.writeFile(path.join(dir, 'requester-mobile.png'), Buffer.from((await call('Page.captureScreenshot', { format: 'png' })).data, 'base64'));
  await click('Đóng'); await wait('!document.querySelector("[role=dialog]")');
  viewer = 'expert';
  await call('Page.navigate', { url: origin + '/?role=expert' });
  await click('Trao đổi với người gửi'); await wait('!!document.querySelector("textarea")');
  assert.ok(await evaluate('document.body.textContent.includes("Nguyễn Tấn Phúc")'));
  await fill('Tôi sẽ kiểm tra điều khoản và phản hồi cho bạn.'); await click('Gửi tin nhắn');
  await wait('document.querySelector("textarea").value===""');
  assert.equal(items.at(-1).senderType, 'expert');
  status = 'approved'; await click('Làm mới');
  await wait('!document.querySelector("textarea")&&document.body.textContent.includes("Lần xác minh này đã kết thúc")');
  console.log('PASS requester/expert chat, older history, safe retry after lost response, read-only completion, desktop/mobile layout');
  console.log(`Screenshots: ${dir}`);
} finally {
  socket?.close(); chrome.kill(); await new Promise(resolve => server.close(resolve));
}
