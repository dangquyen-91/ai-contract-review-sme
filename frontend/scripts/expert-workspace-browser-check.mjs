// Isolated UI fixture: no real authentication, database or AI requests.
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

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'lawscan-expert-ui-'));
const reviewId = 'a'.repeat(24), expertId = 'b'.repeat(24);
const finding = (id, title) => ({ _id: id, title, severity: 'high', riskCode: 'UNFAVORABLE_PAYMENT', problem: ['Điều khoản chưa rõ nghĩa vụ thanh toán.'], consequences: ['Có thể phát sinh tranh chấp.'], recommendations: ['Làm rõ thời hạn thanh toán.'], legalBasis: [], citations: [], clause: { index: 0, title: 'Điều 1' }, detectedBy: 'llm', proposedRevision: { originalText: 'Thanh toán theo thỏa thuận.', revisedText: 'Thanh toán trong vòng 15 ngày.', reason: 'Làm rõ thời hạn.' } });
let workspace, commands, conflict, overviewFixture, resultRequests;
function reset(mode = '') {
  conflict = mode === 'conflict'; commands = []; overviewFixture = mode === 'overview'; resultRequests = 0;
  workspace = {
    verification: { _id: 'c'.repeat(24), reviewId, status: 'requested', requestedBy: { _id: 'sender', name: 'Người gửi thử nghiệm' }, requestedAt: '2026-10-31T10:00:00Z', attempt: 1, requestNote: 'Kiểm tra thanh toán.' },
    contract: { id: 'd'.repeat(24), title: 'Hợp đồng dịch vụ kiểm thử', type: 'service' },
    document: { text: 'BÊN A: Cá nhân 1\n\nĐiều 1: Thanh toán theo thỏa thuận.\nEmail: m•••@gmail.com', redactionSpans: [] },
    clauses: [{ _id: 'clause', index: 0, title: 'Điều 1', text: 'Điều 1: Thanh toán theo thỏa thuận.' }],
    findings: [finding('e'.repeat(24), 'Thời hạn thanh toán'), finding('f'.repeat(24), 'Chi phí phát sinh')], actions: [],
  };
  if (overviewFixture) Object.assign(workspace.verification, { status: 'in_progress', expertId: { _id: expertId, name: 'Expert thử nghiệm' }, assignedAt: '2026-10-31T11:00:00Z' });
}
reset();
const stylesheet = path.join(root, 'styles/globals.css');
const css = (await postcss([tailwind({ base: root })]).process(readFileSync(stylesheet, 'utf8'), { from: stylesheet })).css;
const loader = path.join(dir, 'loader.cjs'), entry = path.join(dir, 'entry.js'), link = path.join(dir, 'link.js');
const navigation = path.join(dir, 'navigation.js');
await fs.writeFile(navigation, `export const usePathname=()=>location.pathname;export const useSearchParams=()=>new URLSearchParams(location.search);export const useRouter=()=>({push:url=>location.assign(url),replace:url=>{history.replaceState(null,'',url);window.dispatchEvent(new PopStateEvent('popstate'));}});`);
const cssLoader = path.join(dir, 'css-loader.cjs');
await fs.writeFile(cssLoader, String.raw`module.exports=function(source){const names=[...source.matchAll(/\.([a-zA-Z_][\w-]*)/g)].map(m=>m[1]);return 'const s=document.createElement("style");s.textContent='+JSON.stringify(source)+';document.head.append(s);export default '+JSON.stringify(Object.fromEntries(names.map(name=>[name,name])))+';';}`);
await fs.writeFile(loader, `const ts=require(${JSON.stringify(require.resolve('typescript'))});module.exports=function(s){return ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText}`);
await fs.writeFile(link, `import React from 'react';export default function Link({children,...props}){return React.createElement('a',props,children)}`);
await fs.writeFile(entry, `
import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
import {VerificationQueue} from '@/components/expert-verification/verification-queue';import {VerificationOverview} from '@/components/expert-verification/verification-overview';import {VerificationWorkspace} from '@/components/expert-verification/verification-workspace';
import {VerificationMyWork} from '@/components/expert-verification/verification-my-work';
import {ContractContent} from '@/components/contract/contract-content';import {NuqsAdapter} from 'nuqs/adapters/react';
import {ReviewResultHeader} from '@/components/review/results/review-result-header';import {ReviewAnalysisPane} from '@/components/review/results/review-analysis-pane';
const client=new QueryClient({defaultOptions:{queries:{retry:false}}});const filter=new URLSearchParams(location.search).get('status')||'all';const h=React.createElement;
function SenderResults(){const {data}=useQuery({queryKey:['contracts','${'d'.repeat(24)}','review-result'],queryFn:async()=>{const r=await fetch('/api/contracts/${'d'.repeat(24)}/review-result');return(await r.json()).data;}});return data?h('main',null,h('h1',null,'Kết quả hợp đồng'),h(ReviewResultHeader,{result:data,role:'user',onShareSummary(){}}),h(ReviewAnalysisPane,{result:data,sectionId:'fixture-result',isDocx:false,onJumpToClause(){}})):h('h1',null,'Đang tải');}
const role=new URLSearchParams(location.search).get('role')||'user';
const page=location.pathname==='/contracts-fixture'?h(ContractContent,{data:{role,contractScopeId:'scope',organization:{id:'scope'},contracts:[],totalContracts:0},access:{review:true},onReview(){document.body.dataset.opened='report';}}):location.pathname==='/sender-results'?h(SenderResults):location.pathname==='/expert-verification/overview'?h(VerificationOverview):location.pathname==='/expert-verification/my-work'?h(VerificationMyWork):location.pathname==='/expert-verification'?h(VerificationQueue,{initialFilter:filter}):h(VerificationWorkspace,{reviewId:'${reviewId}',expertId:'${expertId}',attempt:Number(new URLSearchParams(location.search).get('attempt'))||undefined});
createRoot(document.getElementById('root')).render(h(NuqsAdapter,null,h(QueryClientProvider,{client},page)));
`);
const { webpack } = require('next/dist/compiled/webpack/webpack');
await new Promise((resolve, reject) => webpack({ mode: 'development', devtool: false, entry, output: { path: dir, filename: 'app.js' }, resolve: { extensions: ['.tsx', '.ts', '.js'], alias: { '@': root, 'next/link': link, 'next/navigation': navigation }, modules: [path.join(root, 'node_modules'), 'node_modules'] }, module: { rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }, { test: /\.module\.css$/, use: cssLoader }] } }, (error, stats) => error || stats.hasErrors() ? reject(error || new Error(stats.toString({ all: false, errors: true }))) : resolve()));
const bundle = await fs.readFile(path.join(dir, 'app.js'));
const html = `<!doctype html><html lang="vi"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><style>:root{--background:#fff;--foreground:#171717}@media(prefers-color-scheme:dark){:root{--background:#0a0a0a;--foreground:#ededed}}body{margin:0;background:#f6f7f9;font-family:Arial}#root{padding:16px}</style><div id="root"></div><script src="/app.js"></script></html>`;
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://fixture');
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(status < 400 ? { success: true, data } : { success: false, error: data })); };
  if (url.pathname === '/fixture/reset') { reset(url.searchParams.get('mode') || ''); return send(null); }
  if (url.pathname === '/api/contracts') {
    let rows = Array.from({ length: 12 }, (_, index) => ({ _id: String(index).padStart(24, '0'), title: `Hợp đồng mẫu ${index + 1}`, type: 'service', status: index === 0 ? 'uploaded' : 'reviewed', createdAt: '2026-10-31T10:00:00Z', updatedAt: '2026-10-31T12:00:00Z', overallRiskLevel: 'high', latestReviewId: reviewId,
      expertVerification: index % 3 === 0 ? null : { _id: 'c'.repeat(24), reviewId: index === 2 ? '8'.repeat(24) : reviewId, status: index % 3 === 1 ? 'requested' : 'approved', attempt: 1, requestedAt: '2026-10-31T10:00:00Z' } }));
    const verification = url.searchParams.get('verificationStatus'), status = url.searchParams.get('status'), search = url.searchParams.get('search');
    rows = rows.filter(row => (!verification || (verification === 'not_sent' ? !row.expertVerification : row.expertVerification?.status === verification)) && (!status || row.status === status) && (!search || row.title.includes(search)));
    const page = Number(url.searchParams.get('page') || 1);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, data: rows.slice((page - 1) * 10, page * 10), meta: { total: rows.length, page, limit: 10 } }));
  }
  if (url.pathname === '/fixture/finish') {
    workspace.findings[0].verification = { verdict: 'adjusted', originalSeverity: 'high', reason: 'Đã giảm mức rủi ro.', verifiedAt: '2026-10-31T12:00:00Z' };
    workspace.findings[0].severity = 'medium';
    workspace.findings[1].verification = { verdict: 'rejected', reason: 'Đã được điều khoản khác xử lý.', verifiedAt: '2026-10-31T12:00:00Z' };
    workspace.actions.push({ _id: 'finished-action', action: 'adjust', attempt: 1 });
    workspace.verification.status = 'approved'; return send(null);
  }
  if (url.pathname.endsWith('/review-result')) {
    resultRequests++;
    return send({ contract: { ...workspace.contract, status: 'reviewed', overallRiskLevel: 'medium', currentVersion: { _id: '9'.repeat(24), updatedAt: workspace.verification.status === 'approved' ? '2026-10-31T12:00:00Z' : '2026-10-31T10:00:00Z', summaryStatus: 'completed', riskDetectionStatus: 'completed', summaryPoints: ['Tóm tắt kiểm thử.'] } }, findings: workspace.findings, clauses: workspace.clauses });
  }
  if (url.pathname === `/api/contracts/${'d'.repeat(24)}/reviews`) return send([{ _id: reviewId, versionId: '9'.repeat(24), status: 'completed', result: {} }]);
  if (req.method === 'GET' && url.pathname.endsWith('/verification')) return send({ verification: workspace.verification, actions: workspace.actions });
  if (url.pathname === '/app.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(bundle); return; }
  if (url.pathname === '/api/reviews/verification-queue') {
    const rows = [{ ...workspace.verification, contractId: { _id: workspace.contract.id, title: workspace.contract.title, type: 'service' } }];
    if (overviewFixture) rows.push({ ...rows[0], _id: '2'.repeat(24), reviewId: '3'.repeat(24), status: 'requested', contractId: { ...rows[0].contractId, title: 'Yêu cầu mới đang chờ' } });
    const status = url.searchParams.get('status') || 'all';
    return send(rows.filter(row => status === 'all' || row.status === status));
  }
  if (url.pathname === '/api/reviews/my-verifications') {
    let items = Array.from({ length: 12 }, (_, index) => ({ expertReviewId: `record-${index}`, reviewId, contractId: workspace.contract.id,
      title: `Công việc mẫu ${index + 1}`, contractType: 'service', requestedBy: workspace.verification.requestedBy,
      status: index === 0 ? 'in_progress' : index === 1 ? 'returned' : 'approved', attempt: index + 1,
      requestedAt: '2026-10-30T10:00:00Z', assignedAt: '2026-10-31T11:00:00Z',
      completedAt: index > 0 ? '2026-10-31T12:00:00Z' : undefined, historical: index > 0, available: true }));
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('search') || '';
    items = items.filter(item => (status === 'all' || item.status === status) && item.title.includes(search));
    const page = Number(url.searchParams.get('page') || 1), limit = Number(url.searchParams.get('limit') || 10);
    return send({ items: items.slice((page - 1) * limit, page * limit), total: items.length, page, limit, pages: Math.max(1, Math.ceil(items.length / limit)) });
  }
  if (url.pathname.endsWith('/workspace')) {
    const attempt = Number(url.searchParams.get('attempt'));
    return send(attempt ? { ...workspace, historical: true, verification: { ...workspace.verification, status: 'approved', attempt, expertId } } : workspace);
  }
  if (url.pathname.startsWith('/api/reviews/')) {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = raw ? JSON.parse(raw) : {};
    const action = url.pathname.split('/').at(-1);
    commands.push({ action, method: req.method, body });
    if (action === 'start') {
      if (conflict) { workspace.verification.expertId = 'other'; workspace.verification.status = 'in_progress'; return send({ code: 'VERIFICATION_NOT_OPEN', message: 'Already claimed' }, 409); }
      workspace.verification.status = 'in_progress'; workspace.verification.expertId = { _id: expertId, name: 'Expert thử nghiệm' };
    } else if (req.method === 'PUT') {
      const item = workspace.findings.find(f => f._id === action); const before = structuredClone(item);
      Object.assign(item, body); item.verification = { verdict: item.detectedBy === 'expert' ? 'added' : body.verdict, reason: body.reason };
      workspace.actions.push({ _id: `action-${workspace.actions.length}`, action: body.verdict === 'adjusted' ? 'adjust' : body.verdict === 'rejected' ? 'reject' : 'confirm', attempt: 1, createdAt: '2026-10-31T12:00:00Z', before, after: structuredClone(item) });
    } else if (req.method === 'DELETE') {
      const before = workspace.findings.find(f => f._id === action);
      workspace.actions.push({ _id: `action-${workspace.actions.length}`, action: 'remove', attempt: 1, createdAt: '2026-10-31T12:00:00Z', before });
      workspace.findings = workspace.findings.filter(f => f._id !== action);
    } else if (action === 'findings') {
      const item = { ...finding('1'.repeat(24), body.title), ...body, clause: body.clauseIndex === undefined ? null : { index: body.clauseIndex, title: 'Điều 1' }, detectedBy: 'expert', verification: { verdict: 'added' } };
      workspace.findings.push(item); workspace.actions.push({ _id: `action-${workspace.actions.length}`, action: 'add', attempt: 1, createdAt: '2026-10-31T12:00:00Z', after: structuredClone(item) });
    }
    else if (action === 'approve') workspace.verification.status = 'approved';
    else if (action === 'return') { workspace.verification.status = 'returned'; workspace.verification.decisionNote = body.reason; }
    return send(null);
  }
  res.setHeader('Content-Type', 'text/html'); res.end(html);
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
  socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0; const pending = new Map();
  socket.onmessage = ({ data }) => { const message = JSON.parse(data); if (!pending.has(message.id)) return; const fn = pending.get(message.id); pending.delete(message.id); message.error ? fn.reject(new Error(message.error.message)) : fn.resolve(message.result); };
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Timeout ${method}`)); }, 30000);
    pending.set(id, { resolve: value => { clearTimeout(timer); resolve(value); }, reject: error => { clearTimeout(timer); reject(error); } }); socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async expression => { const value = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }); if (value.exceptionDetails) throw new Error(value.exceptionDetails.text + ': ' + value.result.description); return value.result.value; };
  const wait = async expression => { for (let i = 0; i < 100; i++) { if (await evaluate(expression)) return; await new Promise(resolve => setTimeout(resolve, 100)); } throw new Error(`UI wait failed: ${expression}`); };
  const click = async text => {
    const match = `[...(document.querySelector('[role=dialog]')||document).querySelectorAll('button,a')].find(e=>e.textContent.trim()===${JSON.stringify(text)}&&!e.disabled)`;
    await wait(`!!(${match})`); await evaluate(`(${match}).click()`);
  };
  const fill = async (selector, value) => evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});const proto=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(proto,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const navigate = async route => { await call('Page.navigate', { url: origin + route }); await wait('!!document.querySelector("h1")'); };
  await call('Page.enable');
  for (const role of ['user', 'staff', 'owner']) {
    await navigate('/contracts-fixture?role=' + role);
    await wait('document.querySelectorAll("article").length===10');
    assert.equal(await evaluate('document.querySelector("h1").textContent'), role === 'user' ? 'Hợp đồng của tôi' : 'Hợp đồng tổ chức');
  }
  await click('Sau');
  await wait('document.querySelectorAll("article").length===2');
  assert.match(await evaluate('location.search'), /page=2/);
  await click('Chờ tiếp nhận');
  await wait('document.querySelectorAll("article").length===4');
  assert.match(await evaluate('location.search'), /verificationStatus=requested/);
  assert.equal(await evaluate('document.querySelector("[role=radio][data-state=checked]").textContent'), 'Chờ tiếp nhận');
  assert.doesNotMatch(await evaluate('location.search'), /page=2/);
  await fill('input[type=search]', 'Hợp đồng mẫu 2');
  await click('Tìm kiếm');
  await wait('document.querySelectorAll("article").length===1');
  await evaluate(`document.querySelector('article button').click()`);
  await wait('document.body.dataset.opened==="report"');
  await fetch(origin + '/fixture/reset');
  await click('Xem thông tin xác minh');
  await wait('!!document.querySelector("[role=dialog]")');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await wait('!document.querySelector("[role=dialog]")');
  for (const width of [1440, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), `Contract cards overflow at ${width}`);
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(path.join(dir, `contracts-${width}.png`), Buffer.from(shot.data, 'base64'));
  }
  await navigate('/contracts-fixture?verificationStatus=approved');
  await wait('document.querySelectorAll("article").length===4');
  assert.ok(await evaluate('document.body.textContent.includes("Yêu cầu thuộc lượt rà soát trước")'));
  await navigate('/contracts-fixture?verificationStatus=not_sent');
  await wait('document.querySelectorAll("article").length===4');
  assert.equal(await evaluate('[...document.querySelectorAll("article button")].some(e=>e.textContent==="Xem thông tin xác minh")'), false);
  await evaluate('document.querySelector("[role=radio][data-state=checked]").focus()');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'ArrowRight', code: 'ArrowRight', windowsVirtualKeyCode: 39 });
  await wait('document.querySelector("[role=radio][data-state=checked]").textContent==="Chờ tiếp nhận"');
  await wait('document.querySelectorAll("article").length===4');
  await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  assert.ok(await evaluate('[...document.querySelectorAll("article .animate-pulse")].every(e=>getComputedStyle(e).animationName==="none")'));
  await call('Emulation.setEmulatedMedia', { features: [] });
  console.log('PASS contract tracking for user/staff/owner, URL filters, pagination, request dialog, old review warning and responsive cards');
  await fetch(origin + '/fixture/reset?mode=overview');
  await navigate('/expert-verification/overview');
  await wait('document.body.textContent.includes("Tiếp tục kiểm tra") && document.body.textContent.includes("Yêu cầu mới đang chờ")');
  await wait('!!document.querySelector("[aria-labelledby=verification-distribution-title] ul")');
  assert.equal(await evaluate('document.querySelectorAll("[aria-label=\\"Tình trạng công việc xác minh\\"]>a").length'), 3);
  assert.ok(await evaluate('[...document.querySelectorAll("[aria-labelledby=verification-distribution-title] [style]")].some(e=>e.style.background.includes("conic-gradient"))'), 'Expected real distribution chart');
  await click('Chờ tiếp nhận');
  await wait('document.querySelector("[aria-label=\\"Nhóm công việc cần xử lý\\"] [aria-pressed=true]")?.textContent==="Chờ tiếp nhận"');
  await click('Tôi đang xử lý');
  for (const width of [1440, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), `Overview overflows at ${width}`);
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(path.join(dir, `overview-${width}.png`), Buffer.from(shot.data, 'base64'));
  }
  console.log(`Overview screenshots: ${dir}`);
  await click('Xem tất cả');
  await wait('document.querySelector("[aria-pressed=true]")?.textContent==="Tôi đang xử lý"');
  await wait('document.querySelectorAll("tbody tr").length===1');
  assert.match(await evaluate('location.search'), /status=in_progress/);
  assert.equal(await evaluate('document.querySelectorAll("tbody tr").length'), 1);
  console.log('PASS overview separate lists, responsive layout and filtered queue navigation');
  await navigate('/expert-verification/my-work');
  await wait('document.querySelectorAll("tbody tr").length===10');
  await click('Sau');
  await wait('document.querySelectorAll("tbody tr").length===2');
  assert.ok(await evaluate('document.body.textContent.includes("Trang 2/2")'));
  await click('Đã trả lại');
  await wait('document.querySelectorAll("tbody tr").length===1');
  assert.ok(await evaluate('document.body.textContent.includes("Trang 1/1")'));
  await click('Tất cả');
  await wait('document.querySelectorAll("tbody tr").length===10');
  await fill('input[type=text]', 'Công việc mẫu 12');
  await click('Áp dụng bộ lọc');
  await wait('document.querySelectorAll("tbody tr").length===1');
  for (const width of [1440, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), `My work overflows at ${width}`);
    const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
    await fs.writeFile(path.join(dir, `my-work-${width}.png`), Buffer.from(shot.data, 'base64'));
  }
  await click('Xem kết quả');
  await wait('document.body.textContent.includes("Bản lưu lần xác minh 12")');
  assert.match(await evaluate('location.search'), /attempt=12/);
  assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>["Nhận xác minh","Hoàn tất kiểm tra","Trả lại yêu cầu","Xác nhận","Bác bỏ"].includes(e.textContent.trim()))'), false);
  await click('Về công việc của tôi');
  await wait('document.querySelectorAll("tbody tr").length===10');
  await fill('form label:nth-child(3) input', '2026-11-02');
  await fill('form label:nth-child(4) input', '2026-11-01');
  await click('Áp dụng bộ lọc');
  await wait('document.body.textContent.includes("Ngày kết thúc cần bằng hoặc sau ngày bắt đầu.")');
  console.log('PASS my work server pagination, filters, responsive layout and read-only archived workspace');
  await fetch(origin + '/fixture/reset');
  await navigate('/expert-verification');
  await click('Xem yêu cầu'); await wait('document.body.textContent.includes("Nhận xác minh")');
  await click('Nhận xác minh'); await wait('document.body.textContent.includes("Chuyên gia đang kiểm tra")');
  await evaluate('[...document.querySelectorAll("summary")].find(e=>e.textContent==="Xem đề xuất sửa điều khoản").click()');
  assert.ok(await evaluate('[...document.querySelectorAll("details[open]")].some(e=>e.textContent.includes("Thanh toán trong vòng 15 ngày."))'));
  assert.equal(await evaluate('[...document.querySelectorAll("button")].find(e=>e.textContent==="Hoàn tất kiểm tra").disabled'), true);
  await click('Xác nhận'); await wait('document.body.textContent.includes("Chưa xử lý (1)")');
  await click('Bác bỏ'); await wait('!!document.querySelector("[role=dialog] textarea")');
  await fill('[role=dialog] textarea', 'Nội dung này đã được điều khoản khác quy định.'); await click('Bác bỏ rủi ro');
  await wait('document.body.textContent.includes("Chưa xử lý (0)")');
  await click('Bổ sung rủi ro'); await wait('!!document.querySelector("[role=dialog] input")');
  await fill('[role=dialog] input', 'Rủi ro bổ sung'); await fill('[role=dialog] textarea', 'Thiếu thời hạn phản hồi.'); await click('Lưu thay đổi');
  await wait('!document.querySelector("[role=dialog]")'); await click('Tất cả (3)'); await wait('document.body.textContent.includes("Rủi ro bổ sung")');
  await evaluate('[...document.querySelectorAll("article")].find(e=>e.textContent.includes("Rủi ro bổ sung")).querySelectorAll("button")[0].click()');
  await wait('!!document.querySelector("[role=dialog] input")'); await fill('[role=dialog] input', 'Rủi ro đã chỉnh sửa'); await click('Lưu thay đổi');
  await wait('!document.querySelector("[role=dialog]") && document.body.textContent.includes("Rủi ro đã chỉnh sửa")');
  await click('Xóa rủi ro bổ sung'); await wait('!!document.querySelector("[role=dialog]")'); await click('Xóa rủi ro'); await wait('!document.querySelector("[role=dialog]")');
  await evaluate('[...document.querySelectorAll("summary")].find(e=>e.textContent.startsWith("Lịch sử thao tác")).click()');
  await evaluate('[...document.querySelectorAll("details>ol>li")].find(e=>e.textContent.startsWith("Điều chỉnh rủi ro")).querySelector("details").open=true');
  assert.ok(await evaluate('[...document.querySelectorAll("details>ol>li")].some(e=>e.textContent.startsWith("Điều chỉnh rủi ro") && e.textContent.includes("Rủi ro bổ sung") && e.textContent.includes("Rủi ro đã chỉnh sửa"))'));
  for (const width of [1440, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: false });
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] });
    assert.ok(await evaluate('document.documentElement.scrollWidth<=innerWidth+1'), `Horizontal overflow at ${width}`);
    await click('Hoàn tất kiểm tra'); await wait('!!document.querySelector("[role=dialog]")');
    assert.equal(await evaluate('getComputedStyle(document.querySelector("[role=dialog] textarea")).backgroundColor'), 'rgb(255, 255, 255)');
    assert.ok(await evaluate('document.querySelector("[role=dialog] button[type=submit]").getBoundingClientRect().bottom<=innerHeight'), 'Footer hidden');
    if (width === 1440) { await click('Hủy'); await wait('!document.querySelector("[role=dialog]")'); }
  }
  await click('Hoàn tất kiểm tra'); await wait('!document.querySelector("[role=dialog]") && document.body.textContent.includes("Đã được chuyên gia kiểm tra")');
  assert.ok(commands.some(c => c.method === 'PUT' && c.body.verdict === 'rejected'));
  assert.ok(commands.some(c => c.method === 'DELETE'));
  console.log('PASS claim, confirm, reject, add, adjust, remove and approve with desktop/mobile dark-theme checks');
  await fetch(origin + '/fixture/reset'); await navigate(`/expert-verification/${reviewId}`); await click('Nhận xác minh'); await wait('document.body.textContent.includes("Chuyên gia đang kiểm tra")');
  await click('Trả lại yêu cầu'); await wait('!!document.querySelector("[role=dialog] textarea")'); await fill('[role=dialog] textarea', 'Cần bổ sung phụ lục.'); await evaluate('document.querySelector("[role=dialog] button[type=submit]").click()');
  await wait('document.body.textContent.includes("Chuyên gia đã trả lại yêu cầu") && !document.querySelector("[role=dialog]")');
  await fetch(origin + '/fixture/reset?mode=conflict'); await navigate(`/expert-verification/${reviewId}`); await click('Nhận xác minh'); await wait('document.body.textContent.includes("Yêu cầu đã thay đổi")');
  assert.equal(await evaluate('[...document.querySelectorAll("button")].some(e=>e.textContent==="Xác nhận"&&!e.disabled)'), false);
  console.log('PASS return with reason and concurrent claim conflict');
  await fetch(origin + '/fixture/reset'); await navigate('/sender-results');
  await wait('!!document.querySelector("[aria-label=\\"Tổng quan mức rủi ro\\"] dd") && document.body.textContent.includes("Xem yêu cầu")');
  assert.equal(await evaluate('document.querySelector("[aria-label=\\"Tổng quan mức rủi ro\\"] dd").textContent'), '2');
  await click('Xem yêu cầu'); await wait('!!document.querySelector("[role=dialog]")');
  await fetch(origin + '/fixture/finish'); await click('Làm mới');
  await wait('!!document.querySelector("[data-verification-verdict=adjusted]")');
  assert.ok(await evaluate('!!document.querySelector("[role=dialog]")'), 'Status dialog should stay open while result refreshes');
  await click('Đóng');
  assert.equal(await evaluate('[...document.querySelectorAll("[aria-label=\\"Tổng quan mức rủi ro\\"] dd")].map(e=>e.textContent).join(",")'), '0,1,0');
  await click('Đã bác bỏ (1)'); await wait('!!document.querySelector("[data-verification-verdict=rejected]")');
  assert.ok(await evaluate('document.body.textContent.includes("Đã được điều khoản khác xử lý.")'));
  assert.ok(resultRequests <= 4, `Unexpected result refresh loop: ${resultRequests}`);
  console.log('PASS expert proposal/history and requester live refresh, verdicts and rejected-risk counts');
} finally {
  socket?.close(); chrome.kill(); await new Promise(resolve => server.close(resolve));
}
