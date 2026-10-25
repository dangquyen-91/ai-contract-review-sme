// Browser fixtures only: no real database, LLM, email or file-storage calls.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { CONTRACT_TEMPLATES } = require('../../backend/dist/services/drafting/templates');
const { createDraftDocx } = require('../../backend/dist/services/drafting/docx.service');
const root = fileURLToPath(new URL('../', import.meta.url));
const planSource = await fs.readFile(new URL('../../backend/src/services/billing/subscription.service.ts', import.meta.url), 'utf8');
const plans = new Function(`return (${planSource.match(/export const DEFAULT_PLANS = ([\s\S]*?) as const;/)[1]});`)();
const organization = { name: 'Fixture Company', taxCode: '0101234567', address: 'Ha Noi' };
const user = { id: 'a'.repeat(24), role: 'staff', name: 'Fixture Staff', email: 'staff@example.com', orgId: 'b'.repeat(24), hasCompletedOnboarding: true };
const token = 'fixture.refresh.signature';
let draft, saves = 0, generations = 0, downloads = 0, failSaveOnce = false, draftingAvailable = 50;
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const backend = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  const body = raw ? JSON.parse(raw) : {};
  const url = new URL(req.url, 'http://localhost');
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: true, data })); };
  if (url.pathname === '/api/v1/auth/refresh') return send({ user, accessToken: token, refreshToken: token });
  if (url.pathname === '/api/v1/profile') return send({ user: { ...user, phone: '', emailVerified: true, hasPassword: true, googleLinked: false, createdAt: '2026-10-01T00:00:00Z' }, organization: { ...organization, id: user.orgId } });
  if (url.pathname === '/api/v1/plans') return send(plans);
  if (url.pathname.endsWith('/subscription')) return send({ status: 'active', drafting: { used: 50 - draftingAvailable, reserved: 0, limit: 50, available: draftingAvailable } });
  if (url.pathname === '/api/v1/contract-drafts/templates') return send({ templates: CONTRACT_TEMPLATES, organization, role: user.role });
  if (url.pathname === '/api/v1/contract-drafts' && req.method === 'GET') return send({ items: draft ? [draft] : [], total: draft ? 1 : 0, page: 1, pages: 1 });
  if (url.pathname === '/api/v1/contract-drafts' && req.method === 'POST') {
    const template = CONTRACT_TEMPLATES.find(template => template.code === body.templateCode);
    draft = { ...body, id: (body.templateCode === 'sales' ? 'c' : 'd').repeat(24), templateVersion: 2, template, organization, input: { ...Object.fromEntries(template.fields.filter(field => field.defaultValue).map(field => [field.key, field.defaultValue])), companyTaxCode: organization.taxCode, companyAddress: organization.address, ...body.input }, status: 'draft', revision: 0, createdBy: user.id, content: '', notes: [], decisionNote: '', updatedAt: new Date().toISOString(), contractId: null };
    return send(draft, 201);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}`) {
    if (req.method === 'PATCH' && failSaveOnce) {
      failSaveOnce = false;
      res.writeHead(503, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ success: false, error: { message: 'Lưu tạm thời thất bại. Vui lòng thử lại.' } }));
    }
    if (req.method === 'PATCH') { assert.equal(body.revision, draft.revision); Object.assign(draft, body); draft.revision++; saves++; draft.updatedAt = new Date().toISOString(); }
    return send(draft);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}/generate`) {
    assert.equal(body.revision, draft.revision); generations++;
    if (generations === 1) { res.writeHead(503, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ success: false, error: { message: 'AI tạm bận. Vui lòng thử lại.' } })); }
    assert.ok(draft.input.scope); assert.ok(draft.input.endDate);
    draft.content = `CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM\nĐộc lập - Tự do - Hạnh phúc\n\nHỢP ĐỒNG DỊCH VỤ\n\nBÊN A: Fixture Company\nBÊN B: Fixture Partner\n\nĐIỀU 1. PHẠM VI DỊCH VỤ\n${draft.input.scope}\n\nĐIỀU 2. THANH TOÁN\nGiá trị: ${draft.input.price} VND. ${draft.input.payment}\n\nĐIỀU 3. BÀN GIAO\n${draft.input.handover}\n\nĐẠI DIỆN BÊN A                          BÊN B`;
    if (draft.input.lineItems) draft.content += '\n| STT | Tên hàng hóa / dịch vụ | ĐVT | Số lượng | Đơn giá (VND) | Thành tiền (VND) |\n| 1 | Hàng hóa kiểm thử | kg | 1,125 | 1.000,25 | 1.125,28 |';
    draft.content += '\nĐẠI DIỆN BÊN A\tĐẠI DIỆN BÊN B\n(Ký, ghi rõ họ tên)\t(Ký, ghi rõ họ tên)\n\t\n\t\nFixture Owner\tFixture Partner';
    draftingAvailable--;
    draft.notes = ['Kiểm tra thông tin trước khi ký.']; draft.revision++; draft.generatedAt = new Date().toISOString(); return send(draft);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}/copy-latest`) {
    assert.equal(body.revision, draft.revision);
    draft = { ...draft, id: 'f'.repeat(24), templateVersion: 2, template: CONTRACT_TEMPLATES.find(template => template.code === draft.templateCode), content: '', status: 'draft', revision: 0 };
    return send(draft, 201);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}/decision`) {
    assert.equal(body.revision, draft.revision);
    draft.status = body.action === 'approve' ? 'approved' : 'pending_approval'; draft.revision++; return send(draft);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}/export`) {
    assert.ok(user.role === 'owner' || (user.role === 'staff' && draft.createdBy === user.id)); assert.equal(draft.status, 'approved');
    if (url.searchParams.get('format') === 'print') return send({ title: draft.title, content: draft.content });
    downloads++; res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); return res.end(await createDraftDocx(draft.content));
  }
  res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false }));
});
const backendPort = await listen(backend), reserve = http.createServer(), port = await listen(reserve);
await new Promise(resolve => reserve.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const frontend = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], { cwd: root, windowsHide: true, env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${backendPort}`, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = ''; frontend.stdout.on('data', chunk => { logs += chunk; }); frontend.stderr.on('data', chunk => { logs += chunk; });
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'lawscan-business-drafts-'));
let chrome, socket;
try {
  for (let n = 0; n < 100; n++) { try { if ((await fetch(`${origin}/dang-nhap`)).ok) break; } catch {} if (n === 99) throw new Error(logs); await new Promise(resolve => setTimeout(resolve, 100)); }
  chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${path.join(artifacts, 'browser')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let debugPort;
  for (let n = 0; n < 100; n++) { try { debugPort = (await fs.readFile(path.join(artifacts, 'browser/DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); } }
  assert.ok(debugPort, 'Chrome did not start');
  const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0; const pending = new Map();
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; pending.set(id, { resolve, reject }); socket.send(JSON.stringify({ id, method, params })); });
  socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id) { const task = pending.get(message.id); if (task) { pending.delete(message.id); if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result); } } };
  const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails)); return result.result.value; };
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(artifacts, name), Buffer.from(result.data, 'base64')); };
  const waitFor = async expression => { for (let n = 0; n < 180; n++) { try { if (await evaluate(expression)) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } await shot('failure.png'); throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText')}\n${logs}\nScreenshots: ${artifacts}`); };
  const click = label => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(label)})?.click()`);
  const fill = (key, value) => evaluate(`(() => { const element=document.getElementById(${JSON.stringify(`draft-${key}`)}); if(!element || element.disabled) return; const type=element.tagName==='TEXTAREA'?HTMLTextAreaElement:element.tagName==='SELECT'?HTMLSelectElement:HTMLInputElement; Object.getOwnPropertyDescriptor(type.prototype,'value').set.call(element,${JSON.stringify(value)}); element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await call('Page.enable'); await call('Network.enable'); await call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: artifacts });
  for (const [name, value] of Object.entries({ lawscan_access: token, lawscan_refresh: token, lawscan_user: Buffer.from(JSON.stringify(user)).toString('base64url') })) await call('Network.setCookie', { name, value, url: origin, httpOnly: true, sameSite: 'Lax' });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: `${origin}/contract-drafts` });
  await waitFor('document.querySelectorAll("article button").length===3');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false); await shot('templates-desktop.png');
  await evaluate(`Array.from(document.querySelectorAll('article')).find(article=>article.textContent.includes('Hợp đồng dịch vụ')).querySelector('button').click()`);
  await waitFor('!!document.getElementById("draft-title")');
  const template = CONTRACT_TEMPLATES.find(item => item.code === 'service');
  for (const group of ['parties', 'terms']) {
    if (group === 'terms') { await evaluate('Array.from(document.querySelectorAll("nav[aria-label] button")).find(button=>button.textContent.includes("Nội dung chính")).click()'); await waitFor('!!document.getElementById("draft-scope")'); }
    for (const field of template.fields.filter(field => field.group === group && (field.required || field.key === 'endDate'))) await fill(field.key, field.kind === 'date' ? field.key === 'endDate' ? '2027-10-25' : '2026-10-25' : field.kind === 'number' ? '30000000' : field.key === 'partnerName' ? 'Fixture Partner' : 'Fixture details for ' + field.key);
  }
  await waitFor('Array.from(document.querySelectorAll("p[role=status]")).some(element=>element.textContent.includes("Đã lưu lúc"))');
  assert.ok(saves > 0, 'Autosave must persist form values');
  assert.equal(await evaluate('document.getElementById("draft-price").value'), '30.000.000');
  assert.equal(draft.input.price, '30000000');
  await fill('price', '10.000.000');
  await waitFor('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.trim()==="Đã lưu" && button.disabled)');
  assert.equal(draft.input.price, '10000000', 'Pasted grouped values must retain the correct magnitude');
  assert.equal(await evaluate('document.getElementById("draft-price").value'), '10.000.000');
  await evaluate('document.getElementById("draft-price").focus(); document.getElementById("draft-price").select()');
  for (const character of '10000000') {
    await call('Input.insertText', { text: character });
    await evaluate('new Promise(resolve => requestAnimationFrame(resolve))');
  }
  assert.equal(await evaluate('document.getElementById("draft-price").value'), '10.000.000', 'Typing must keep the caret in the correct position while grouping digits');
  assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).find(button=>button.textContent.trim()==="Đã lưu")?.disabled'), true);
  failSaveOnce = true;
  await fill('scope', 'Manual save fixture');
  await click('Lưu thay đổi');
  await waitFor('document.body.innerText.includes("Chưa lưu được thay đổi")');
  assert.equal(await evaluate('document.getElementById("draft-scope").value'), 'Manual save fixture');
  await click('Lưu thay đổi');
  await waitFor('document.body.innerText.includes("Đã lưu thay đổi")');
  assert.equal(draft.input.scope, 'Manual save fixture');
  await fill('scope', 'Fixture details saved automatically');
  await waitFor('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.trim()==="Đã lưu" && button.disabled)');
  assert.equal(draft.input.scope, 'Fixture details saved automatically');
  await click('Tạo bản nháp bằng AI'); await waitFor('document.body.innerText.includes("AI tạm bận")');
  assert.equal(draftingAvailable, 50, 'Failed AI does not charge drafting credits');
  assert.ok(await evaluate('document.getElementById("draft-scope")?.value.includes("Fixture details")'));
  await click('Tạo bản nháp bằng AI'); await waitFor('document.querySelector("article[aria-label]")?.textContent.includes("ĐIỀU 1")');
  const documentStyle = await evaluate(`(() => { const style=getComputedStyle(document.querySelector('article[aria-label] p')); return {font:style.fontFamily,size:style.fontSize,numerals:style.fontVariantNumeric}; })()`);
  assert.ok(documentStyle.font.includes('Times New Roman'));
  assert.ok(Math.abs(parseFloat(documentStyle.size) - 13 * 96 / 72) < 0.01);
  assert.equal(documentStyle.numerals, 'lining-nums');
  assert.equal(await evaluate('document.querySelectorAll("article[aria-label] table").length'), 1, 'Signatures use two actual columns');
  assert.equal(generations, 2);
  assert.equal(draftingAvailable, 49);
  await click('Gửi Owner duyệt'); await waitFor('document.body.innerText.includes("Bản nháp đã được gửi Owner")');
  assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.includes("Tải Word"))'), false);
  user.role = 'owner'; user.id = 'e'.repeat(24); user.name = 'Fixture Owner'; user.email = 'owner@example.com';
  await call('Page.reload', { ignoreCache: true }); await waitFor('Array.from(document.querySelectorAll("button")).some(button=>button.textContent==="Duyệt bản nháp")');
  await click('Duyệt bản nháp'); await waitFor('!!document.querySelector("[role=dialog]")');
  await evaluate('document.querySelector("[role=dialog] input[type=checkbox]").click()');
  await click('Xác nhận duyệt'); await waitFor('Array.from(document.querySelectorAll("span")).some(element=>element.textContent==="Đã duyệt")');
  await shot('approved-desktop.png');
  await click('Tải Word');
  for (let n = 0; n < 50 && !downloads; n++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(downloads, 1);
  assert.equal(await evaluate(`fetch('/contract-drafts/${draft.id}/print').then(response=>response.status)`), 200);
  user.role = 'staff'; user.id = draft.createdBy; user.name = 'Fixture Staff'; user.email = 'staff@example.com';
  await call('Page.reload', { ignoreCache: true });
  await waitFor('Array.from(document.querySelectorAll("button")).some(button=>button.textContent==="Tải Word")');
  assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.includes("Chuyển sang rà soát") || button.textContent==="Duyệt bản nháp")'), false);
  assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).some(button=>button.textContent==="In / lưu PDF")'), true);
  await click('Tải Word');
  for (let n = 0; n < 50 && downloads < 2; n++) await new Promise(resolve => setTimeout(resolve, 100));
  assert.equal(downloads, 2, 'The Staff creator can download after Owner approval');
  assert.equal(await evaluate(`fetch('/contract-drafts/${draft.id}/print').then(response=>response.status)`), 200);
  await shot('staff-approved-download.png');
  user.role = 'owner'; user.id = 'e'.repeat(24); user.name = 'Fixture Owner'; user.email = 'owner@example.com';
  await call('Page.reload', { ignoreCache: true });
  await waitFor('Array.from(document.querySelectorAll("button")).some(button=>button.textContent==="Chuyển sang rà soát")');
  for (const width of [390, 320]) { await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true }); assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `No overflow at ${width}px`); await shot(`approved-${width}.png`); }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  const oldDraft = draft;
  oldDraft.templateVersion = 1; oldDraft.template = { ...oldDraft.template, version: 1 };
  await call('Page.reload', { ignoreCache: true }); await waitFor('document.body.innerText.includes("Dùng mẫu mới")');
  await click('Dùng mẫu mới'); await waitFor('!!document.getElementById("draft-title")');
  assert.equal(draft.templateVersion, 2); assert.equal(draft.input.scope, oldDraft.input.scope);
  assert.equal(oldDraft.status, 'approved'); assert.ok(oldDraft.content); assert.equal(draft.content, '');
  await call('Page.navigate', { url: `${origin}/contract-drafts` }); await waitFor('document.querySelectorAll("article button").length===3');
  await evaluate(`Array.from(document.querySelectorAll('article')).find(article=>article.textContent.includes('Hợp đồng mua bán')).querySelector('button').click()`);
  await waitFor('!!document.getElementById("draft-title")');
  await evaluate('Array.from(document.querySelectorAll("nav[aria-label] button")).find(button=>button.textContent.includes("Nội dung chính")).click()');
  await waitFor('document.body.innerText.includes("Thêm hạng mục")');
  await fill('scope', 'Hàng hóa kiểm thử'); await fill('endDate', '2027-10-25');
  await click('Thêm hạng mục');
  await fill('item-0-name', 'Hàng hóa kiểm thử'); await fill('item-0-unit', 'kg');
  await fill('item-0-quantity', '1,125'); await fill('item-0-price', '1.000,25');
  await waitFor('document.getElementById("draft-price")?.value==="1.125,28"');
  assert.equal(await evaluate('document.getElementById("draft-price").disabled'), true);
  await waitFor('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.trim()==="Đã lưu" && button.disabled)');
  assert.equal(draft.input.price, '1125.28');
  await shot('sales-table-desktop.png');
  for (const width of [390, 320]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `Table form stays within ${width}px`);
  }
  await click('Tạo bản nháp bằng AI'); await waitFor('document.querySelectorAll("article[aria-label] table").length===2');
  assert.equal(await evaluate('document.querySelectorAll("article[aria-label] th").length'), 6);
  await shot('sales-table-preview-mobile.png');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: `${origin}/contract-drafts` }); await waitFor('document.querySelectorAll("article button").length===3');
  await evaluate(`Array.from(document.querySelectorAll('article')).find(article=>article.textContent.includes('Hợp đồng lao động')).querySelector('button').click()`);
  await waitFor('!!document.getElementById("draft-partnerName")');
  assert.equal(await evaluate('!!document.getElementById("draft-partnerRepresentative")'), false);
  assert.equal(await evaluate('document.querySelectorAll("section[aria-labelledby]").length'), 3);
  assert.ok(await evaluate('document.body.innerText.includes("Họ và tên người lao động")'));
  await shot('labor-parties-desktop.png');
  await evaluate('Array.from(document.querySelectorAll("nav[aria-label] button")).find(button=>button.textContent.includes("Nội dung chính")).click()');
  await waitFor('!!document.getElementById("draft-salaryPaymentDay")');
  assert.ok(await evaluate('document.getElementById("draft-insurance").value.includes("bảo hiểm")'));
  await shot('labor-terms-desktop.png');
  draftingAvailable = 0;
  await click('Cập nhật'); await waitFor('document.body.innerText.includes("Đã hết lượt soạn trong kỳ")');
  assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).find(button=>button.textContent==="Tạo bản nháp bằng AI").disabled'), true);
  assert.equal(await evaluate('document.getElementById("draft-salaryPaymentDay").disabled'), false, 'Editing remains available when AI credits are exhausted');
  await call('Page.navigate', { url: `${origin}/goi-dich-vu` });
  await waitFor('document.body.innerText.includes("50 lượt soạn hợp đồng AI")');
  assert.ok(await evaluate('document.body.innerText.includes("150 lượt soạn hợp đồng AI") && document.body.innerText.includes("1 lượt/5 trang")'));
  await shot('billing-plans-desktop.png');
  for (const width of [390, 320]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `Pricing fits ${width}px`);
  }
  user.role = 'user'; user.orgId = null;
  assert.equal(await evaluate(`fetch('/api/contract-drafts/templates').then(response=>response.status)`), 403);
  console.log('PASS business drafts: grouped forms, line item decimals and totals, preview tables/signatures, copy-latest, autosave, save/AI failure and retry, submit/approve, DOCX, print, personal-account rejection, desktop/mobile');
  console.log(`Screenshots: ${artifacts}`);
} finally { socket?.close(); chrome?.kill(); frontend.kill(); backend.closeAllConnections(); backend.close(); }
