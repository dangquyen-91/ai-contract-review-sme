// Local fixtures only: no production database, AI, audio or billing requests.
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
const { buildStudioTemplate } = require('../../backend/dist/services/drafting/studioTemplate');
const { studioInput, studioText } = require('../../backend/dist/services/drafting/studioDocument');
const { applyStudioChanges } = require('../../backend/dist/services/drafting/studioChanges');
const { createStudioDocx } = require('../../backend/dist/services/drafting/studioDocx.service');
const root = fileURLToPath(new URL('../', import.meta.url));
const organization = { name: 'Fixture Company', taxCode: '0101234567', address: 'Ha Noi' };
const user = { id: 'a'.repeat(24), role: 'staff', name: 'Fixture Staff', email: 'staff@example.com', orgId: 'b'.repeat(24), hasCompletedOnboarding: true };
const token = 'fixture.refresh.signature';
let draft, saves = 0, requests = 0, downloads = 0, failSaveOnce = false, failAiOnce = false, draftingAvailable = 50;
let history = []; const requestIds = new Map();
let listExtras = [], failDeleteOnce = false;
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const backend = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const bytes = Buffer.concat(chunks); const raw = bytes.toString(); const multipart = req.headers['content-type']?.startsWith('multipart/form-data'); const body = raw && !multipart ? JSON.parse(raw) : {};
  const url = new URL(req.url, 'http://localhost');
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: true, data })); };
  const error = (message, status) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false, error: { message } })); };
  if (url.pathname === '/api/v1/auth/refresh') return send({ user, accessToken: token, refreshToken: token });
  if (url.pathname === '/api/v1/profile') return send({ user: { ...user, phone: '', emailVerified: true, hasPassword: true, googleLinked: false, createdAt: '2026-10-01T00:00:00Z' }, organization: { ...organization, id: user.orgId } });
  if (url.pathname.endsWith('/subscription')) return send({ status: 'active', drafting: { used: 50 - draftingAvailable, reserved: 0, limit: 50, available: draftingAvailable } });
  if (url.pathname === '/api/v1/contract-drafts/templates') return send({ templates: CONTRACT_TEMPLATES, organization, role: user.role });
  if (url.pathname === '/api/v1/contract-drafts' && req.method === 'GET') {
    const rows = [draft,...listExtras].filter(row=>row&&!row.deletedAt).sort((a,b)=>(Date.parse(b.pinnedAt)||0)-(Date.parse(a.pinnedAt)||0)||Date.parse(b.updatedAt)-Date.parse(a.updatedAt)||b.id.localeCompare(a.id));
    const page=Number(url.searchParams.get('page')||1); return send({items:rows.slice((page-1)*20,page*20),total:rows.length,page,pages:Math.max(1,Math.ceil(rows.length/20))});
  }
  const listTarget=[draft,...listExtras].find(row=>row&&!row.deletedAt&&url.pathname.startsWith(`/api/v1/contract-drafts/${row.id}`));
  if(listTarget&&url.pathname.endsWith('/pin')&&req.method==='PATCH'){listTarget.pinnedAt=body.pinned?(listTarget.pinnedAt??new Date().toISOString()):null;return send(listTarget);}
  if(listTarget&&req.method==='DELETE'&&url.pathname===`/api/v1/contract-drafts/${listTarget.id}`){if(failDeleteOnce){failDeleteOnce=false;return error('Fixture delete failed. Retry.',409);}assert.equal(body.revision,listTarget.revision);listTarget.deletedAt=new Date().toISOString();return send({id:listTarget.id});}
  if (url.pathname === '/api/v1/contract-drafts' && req.method === 'POST') {
    assert.equal(body.editorMode, 'studio');
    const template = CONTRACT_TEMPLATES.find(item => item.code === body.templateCode);
    const input = { ...Object.fromEntries(template.fields.filter(field => field.defaultValue).map(field => [field.key, field.defaultValue])), ...(template.code === 'labor' ? { companyName: organization.name } : {}), ...(template.fields.some(field=>field.key==='companyTaxCode')?{companyTaxCode: organization.taxCode}:{}), companyAddress: organization.address, ...body.input };
    const document = buildStudioTemplate(template, input, organization.name, body.ourParty);
    draft = { ...body, id: 'd'.repeat(24), templateVersion: template.version, template, organization, input, document, status: 'draft', revision: 0, createdBy: user.id, content: studioText(document, template), notes: [], decisionNote: '', updatedAt: new Date().toISOString(), contractId: null };
    history = []; return send(draft, 201);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}`) {
    if (req.method === 'PATCH') {
      if (failSaveOnce) { failSaveOnce = false; return error('Fixture save failed. Retry saving.', 503); }
      assert.equal(body.revision, draft.revision); Object.assign(draft, body);
      draft.input = studioInput(body.document, body.input); draft.content = studioText(body.document, draft.template); draft.revision++; saves++; draft.updatedAt = new Date().toISOString();
    }
    return send(draft);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}/reference`) {
    const form = await new Response(bytes, { headers: { 'Content-Type': req.headers['content-type'] } }).formData();
    const file = form.get('file'); assert.ok(file); return send({ name: file.name, text: await file.text() });
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}/assistant`) {
    if (req.method === 'GET') return send(history);
    requests++;
    if (failAiOnce) { failAiOnce = false; return error('Fixture AI failed. Retry this request.', 503); }
    if (requestIds.has(body.requestId)) return send(requestIds.get(body.requestId));
    assert.equal(body.revision, draft.revision);
    const proposal = { id: (history.length + 1).toString(16).padStart(24, '0'), userMessage: body.message, referenceNames: body.references?.map(item => item.name) ?? [], baseRevision: draft.revision, message: 'Price update ready for your review.', changes: { fields: [{ key: 'price', before: draft.input.price ?? '', after: '15000000' }], blocks: [] }, status: 'pending', createdAt: new Date().toISOString() };
    history.push(proposal); requestIds.set(body.requestId, proposal); draftingAvailable--; return send(proposal);
  }
  if (draft && url.pathname.startsWith(`/api/v1/contract-drafts/${draft.id}/proposals/`)) {
    const proposal = history.find(row => url.pathname.endsWith(row.id)); assert.ok(proposal);
    if (body.action === 'apply') {
      assert.equal(body.revision, draft.revision); assert.equal(proposal.baseRevision, draft.revision);
      const result = applyStudioChanges(draft.document, proposal.changes, draft.template); draft.document = result.document; draft.input = { ...draft.input, ...result.input }; draft.content = studioText(draft.document, draft.template); draft.revision++; proposal.status = 'applied';
    } else proposal.status = 'dismissed';
    return send(draft);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}/copy-latest`) {
    assert.equal(body.revision, draft.revision);
    const template = CONTRACT_TEMPLATES.find(item=>item.code===draft.templateCode);
    const input = Object.fromEntries(template.fields.filter(field=>draft.input[field.key]!==undefined).map(field=>[field.key,draft.input[field.key]]));
    const document = buildStudioTemplate(template, input, organization.name, draft.ourParty);
    draft={...draft,id:'f'.repeat(24),templateVersion:template.version,template,input,document,content:studioText(document,template),status:'draft',revision:0}; return send(draft,201);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}/decision`) {
    assert.equal(body.revision, draft.revision); draft.status = body.action === 'approve' ? 'approved' : 'pending_approval'; draft.revision++; return send(draft);
  }
  if (draft && url.pathname === `/api/v1/contract-drafts/${draft.id}/export`) {
    assert.equal(draft.status, 'approved');
    if (url.searchParams.get('format') === 'print') return send({ title: draft.title, content: draft.content, document: draft.document, template: draft.template });
    downloads++; res.writeHead(200, { 'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }); return res.end(await createStudioDocx(draft.document, draft.template));
  }
  return error('Not found', 404);
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
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; const timer=setTimeout(()=>{pending.delete(id);reject(new Error(`CDP timeout: ${method} ${params.expression ?? ''}`));},20000); pending.set(id, { resolve:value=>{clearTimeout(timer);resolve(value);}, reject:error=>{clearTimeout(timer);reject(error);} }); socket.send(JSON.stringify({ id, method, params })); });
  socket.onmessage = event => { const message = JSON.parse(event.data); if (message.id) { const task = pending.get(message.id); if (task) { pending.delete(message.id); if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result); } } };
  const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails)); return result.result.value; };
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(artifacts, name), Buffer.from(result.data, 'base64')); };
  const waitFor = async expression => { for (let n = 0; n < 180; n++) { try { if (await evaluate(expression)) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } await shot('failure.png'); throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText')}\n${logs}\nScreenshots: ${artifacts}`); };
  const click = label => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(label)})?.click()`);
  await call('Page.enable'); await call('Network.enable'); await call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: artifacts });
  for (const [name, value] of Object.entries({ lawscan_access: token, lawscan_refresh: token, lawscan_user: Buffer.from(JSON.stringify(user)).toString('base64url') })) await call('Network.setCookie', { name, value, url: origin, httpOnly: true, sameSite: 'Lax' });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `window.SpeechRecognition = class { start() { window.fixtureVoice = this; setTimeout(() => { if(window.fixtureVoiceError) this.onerror?.({error:'not-allowed'}); else this.onresult?.({resultIndex:0,results:[{isFinal:true,0:{transcript:'Update price to 15000000'}}]}); this.onend?.(); }, 50); } stop(){this.onend?.();} abort(){} };` });
  const clickLabel = label => evaluate(`Array.from(document.querySelectorAll('button')).find(button=>button.getAttribute('aria-label')===${JSON.stringify(label)})?.click()`);
  const fillSelector = (selector, value) => evaluate(`(() => {const element=document.querySelector(${JSON.stringify(selector)});if(!element || element.disabled)throw new Error('Missing control: '+${JSON.stringify(selector)});const prototype=element.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:element.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(element,${JSON.stringify(value)});element.dispatchEvent(new Event('input',{bubbles:true}));element.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  const editorReady = '!!document.querySelector(".tiptap.ProseMirror[contenteditable=true]")';
  const saved = 'Array.from(document.querySelectorAll("button")).some(button=>button.textContent.trim()==="Đã lưu" && button.disabled)';
  const editField = async (key, value) => {
    console.log('Editing field:', key);
    await evaluate(`document.querySelector('[data-field-key="${key}"]').click()`);
    await waitFor('!!document.querySelector("[role=dialog] form")');
    await fillSelector('[role=dialog] input:not([type=checkbox]),[role=dialog] textarea,[role=dialog] select', value);
    await click('Lưu thông tin'); await waitFor('!document.querySelector("[role=dialog]")');
  };
  await call('Page.navigate', { url: `${origin}/contract-drafts` });
  await waitFor('document.querySelectorAll("article button").length===3');
  await shot('templates-desktop.png');
  await evaluate('document.querySelectorAll("article")[1].querySelector("button").click()');
  await waitFor(editorReady);
  assert.equal(await evaluate('document.querySelector("aside").getBoundingClientRect().width>0'), true, 'Dashboard sidebar is visible in the editor');
  assert.equal(await evaluate('document.querySelector("aside a[aria-current=page]")?.getAttribute("href")'), '/contract-drafts');
  assert.equal(requests, 0); assert.ok(draft.document); assert.equal(draftingAvailable, 50);
  assert.equal(await evaluate('!!document.getElementById("draft-title")'), false, 'Old step form is removed');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await shot('studio-desktop.png');
  await evaluate(`document.querySelector('summary[aria-label="Tải hợp đồng"]').click()`);
  await waitFor('document.body.innerText.includes("Hợp đồng cần được chủ tổ chức duyệt")');
  await evaluate(`document.querySelector('summary[aria-label="Tải hợp đồng"]').click()`);
  await editField('price', '10.000.000');
  await evaluate('document.querySelector("aside a").click()');
  assert.equal(await evaluate('location.pathname'), `/contract-drafts/${draft.id}`, 'Unsaved edits block sidebar navigation');
  await waitFor(saved);
  assert.equal(draft.input.price, '10000000');
  assert.equal(await evaluate('document.querySelector("[data-field-key=price]").textContent'), '10.000.000');
  await editField('representative', 'Fixture Representative'); await waitFor(saved);
  assert.equal(await evaluate('Array.from(document.querySelectorAll("[data-field-key=representative]")).every(node=>node.textContent==="Fixture Representative")'), true);
  await clickLabel('Hoàn tác'); await waitFor(saved);
  assert.equal(draft.input.representative, '');
  await clickLabel('Làm lại'); await waitFor(saved);
  assert.equal(draft.input.representative, 'Fixture Representative');
  // Real editable text and formatting survive autosave and reload.
  await evaluate(`(() => {const editor=document.querySelector('.tiptap.ProseMirror');editor.focus();const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.execCommand('insertText',false,' BROWSER CUSTOM CLAUSE');})()`);
  await waitFor(saved); assert.ok(draft.content.includes('BROWSER CUSTOM CLAUSE'));
  await evaluate(`(() => {const editor=document.querySelector('.tiptap.ProseMirror');const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const index=node.textContent.indexOf('BROWSER CUSTOM CLAUSE');if(index>=0){const range=document.createRange();range.setStart(node,index);range.setEnd(node,index+21);const selection=getSelection();selection.removeAllRanges();selection.addRange(range);editor.focus();break;}}})()`);
  await clickLabel('In đậm'); await waitFor(saved);
  await call('Page.reload', { ignoreCache: true }); await waitFor(editorReady);
  assert.equal(await evaluate('Array.from(document.querySelectorAll(".tiptap strong")).some(node=>node.textContent.includes("BROWSER CUSTOM CLAUSE"))'), true);
  await click('Thêm phụ lục'); await click('Thêm phụ lục');
  await waitFor('document.querySelectorAll(".tiptap [data-page-break]").length===2');
  await call('Input.insertText', { text: 'APPENDIX BROWSER CONTENT' }); await waitFor(saved);
  assert.ok(draft.content.includes('PHỤ LỤC 2')); assert.ok(draft.content.includes('APPENDIX BROWSER CONTENT'));
  await shot('studio-appendices.png');
  await click('Luật áp dụng'); await waitFor('!!document.querySelector("[role=dialog]")');
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await waitFor('!document.querySelector("[role=dialog]")');
  await fs.writeFile(path.join(artifacts, 'reference.txt'), 'Reference price: 15000000 VND.');
  const dom = await call('DOM.getDocument');
  const fileInput = await call('DOM.querySelector', { nodeId: dom.root.nodeId, selector: 'input[type=file]' });
  await call('DOM.setFileInputFiles', { nodeId: fileInput.nodeId, files: [path.join(artifacts, 'reference.txt')] });
  await waitFor('document.body.innerText.includes("reference.txt")'); assert.equal(requests, 0);
  // Voice is a controllable local stub and never auto-sends an AI request.
  await clickLabel('Nhập bằng giọng nói');
  await waitFor('document.querySelector("textarea").value.includes("Update price")'); assert.equal(requests, 0);
  await evaluate('window.fixtureVoiceError=true'); await clickLabel('Nhập bằng giọng nói');
  await waitFor('document.body.innerText.includes("Chưa được cấp quyền micro")');
  await evaluate('window.fixtureVoiceError=false');
  failAiOnce = true;
  await clickLabel('Gửi yêu cầu cho trợ lý'); await waitFor('document.body.innerText.includes("Fixture AI failed")');
  assert.equal(draftingAvailable, 50);
  await clickLabel('Gửi yêu cầu cho trợ lý'); await waitFor('document.body.innerText.includes("Price update ready")');
  assert.equal(draft.input.price, '10000000'); assert.equal(draftingAvailable, 49);
  assert.deepEqual(history[0].referenceNames, ['reference.txt']);
  await click('Áp dụng'); await waitFor('document.querySelector("[data-field-key=price]")?.textContent==="15.000.000"');
  assert.equal(draft.input.price, '15000000'); assert.equal(draftingAvailable, 49);
  await shot('studio-proposal-applied.png');
  await fillSelector('textarea', 'Another price proposal'); await clickLabel('Gửi yêu cầu cho trợ lý');
  await waitFor('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.trim()==="Áp dụng" && !button.disabled)');
  await editField('price', '20.000.000'); await waitFor(saved);
  assert.equal(await evaluate('Array.from(document.querySelectorAll("button")).find(button=>button.textContent.trim()==="Áp dụng").disabled'), true);
  // Save failure keeps unsaved edits and offers an explicit retry.
  failSaveOnce = true; await editField('reference', 'REF-BROWSER-001');
  await waitFor('document.body.innerText.includes("Fixture save failed")');
  assert.equal(await evaluate('document.querySelector("[data-field-key=reference]").textContent'), 'REF-BROWSER-001');
  await click('Thử lưu lại'); await waitFor(saved);
  assert.equal(draft.input.reference, 'REF-BROWSER-001');
  for (const width of [390, 320]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `No outer overflow at ${width}px`);
    await click('Trợ lý AI'); await waitFor('document.querySelector("textarea").getBoundingClientRect().width>0');
    await shot(`studio-chat-${width}.png`); await click('Văn bản'); await shot(`studio-document-${width}.png`);
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  // Fill all required template fields through the inline editor before approval.
  for (const field of draft.template.fields.filter(field => (field.required || field.key === 'endDate') && !draft.input[field.key])) {
    await editField(field.key, field.kind === 'date' ? (field.key === 'endDate' ? '2027-10-26' : '2026-10-26') : field.kind === 'number' ? '10.000.000' : field.kind === 'select' ? field.options[0].value : 'Fixture details for ' + field.key);
  }
  await waitFor(saved); await click('Gửi duyệt'); await waitFor('document.body.innerText.includes("Đang chờ duyệt")');
  assert.equal(draft.status, 'pending_approval');
  user.role = 'owner'; user.id = 'e'.repeat(24); user.name = 'Fixture Owner';
  await call('Page.reload', { ignoreCache: true }); await waitFor('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.trim()==="Duyệt hợp đồng")');
  await click('Duyệt hợp đồng'); await waitFor('!!document.querySelector("[role=dialog]")');
  await evaluate('document.querySelector("[role=dialog] input[type=checkbox]").click()');
  await click('Xác nhận duyệt');
  await waitFor(`document.querySelector('button[aria-label="Tải Word"]')?.disabled===false`);
  assert.equal(draft.status, 'approved');
  user.role = 'staff'; user.id = 'a'.repeat(24); user.name = 'Fixture Staff';
  await call('Page.reload', { ignoreCache: true }); await waitFor(`document.querySelector('button[aria-label="Tải Word"]')?.disabled===false`);
  await evaluate(`document.querySelector('summary[aria-label="Tải hợp đồng"]').click()`);
  await clickLabel('Tải Word');
  for(let n=0;n<50 && !downloads;n++) await new Promise(resolve=>setTimeout(resolve,100));
  assert.equal(downloads, 1);
  const printed = await evaluate(`fetch('/contract-drafts/${draft.id}/print').then(response=>response.text())`);
  assert.ok(printed.includes('BROWSER CUSTOM CLAUSE')); assert.ok(printed.includes('data-layout="signature"'));
  assert.ok(printed.includes('APPENDIX BROWSER CONTENT')); assert.ok(printed.includes('data-page-break'));
  await shot('studio-approved.png');
  await call('Page.navigate', { url: `${origin}/contract-drafts` });
  await waitFor('document.querySelectorAll("article button").length===3');
  await evaluate('document.querySelectorAll("article")[0].querySelector("button").click()');
  await waitFor(editorReady);
  assert.equal(draft.templateVersion, 4);
  assert.equal(await evaluate('Array.from(document.querySelectorAll(".tiptap h2")).filter(node=>node.textContent.startsWith("ĐIỀU ")).length'), 12);
  assert.equal(await evaluate('document.querySelector("[data-field-key=partnerName]").textContent'), '[TenNguoiLaoDong]');
  await editField('signingDate', '2026-11-02'); await waitFor(saved);
  assert.equal(await evaluate('Array.from(document.querySelectorAll("[data-field-key=signingDate]")).map(node=>node.textContent).join("/")'), '02/11/2026');
  await shot('labor-template-reference-desktop.png');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
  await shot('labor-template-reference-mobile.png');
  const oldDraft = draft; oldDraft.templateVersion = 3; oldDraft.template={...oldDraft.template,version:3};
  await call('Page.reload', { ignoreCache: true });
  await waitFor('document.body.innerText.includes("Dùng mẫu mới")');
  await click('Dùng mẫu mới'); await waitFor('location.pathname.endsWith("ffffffffffffffffffffffff")'); await waitFor(editorReady);
  assert.equal(draft.templateVersion,4); assert.notEqual(draft.id,oldDraft.id); assert.equal(draft.input.signingDate,'2026-11-02');
  assert.ok(draft.content.includes('bồi thường thiệt hại bằng 06 tháng lương trung bình liền kề gần nhất'));
  listExtras=Array.from({length:21},(_,index)=>({...draft,id:(index+1).toString(16).padStart(24,'0'),title:`Fixture draft ${index+1}`,pinnedAt:null,updatedAt:'2020-01-01T00:00:00.000Z'}));
  await call('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await call('Page.navigate',{url:`${origin}/contract-drafts`});await waitFor('document.querySelectorAll("[data-draft-id]").length===20');
  await click('Sau');await waitFor('document.querySelectorAll("[data-draft-id]").length===2');
  const pinnedId=listExtras[0].id;
  const openRowMenu=async id=>{
    const point=await evaluate(`(()=>{const button=document.querySelector('[data-draft-id="${id}"] button');button.scrollIntoView({block:'center'});const rect=button.getBoundingClientRect();return{x:rect.x+rect.width/2,y:rect.y+rect.height/2};})()`);
    await call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...point});await call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...point});
  };
  const menuAction=text=>evaluate(`Array.from(document.querySelectorAll('[role=menuitem]')).find(item=>item.textContent.trim()===${JSON.stringify(text)}).click()`);
  await openRowMenu(pinnedId);await waitFor('!!document.querySelector("[role=menu]")');await menuAction('Ghim lên đầu');
  await waitFor(`document.querySelector('[data-draft-id]')?.getAttribute('data-draft-id')==='${pinnedId}'`);
  await shot('draft-list-pinned.png');
  await call('Page.reload',{ignoreCache:true});await waitFor(`document.querySelector('[data-draft-id]')?.getAttribute('data-draft-id')==='${pinnedId}'`);
  await openRowMenu(pinnedId);await waitFor('!!document.querySelector("[role=menu]")');await menuAction('Bỏ ghim');
  await waitFor(`document.querySelector('[data-draft-id]')?.getAttribute('data-draft-id')==='${draft.id}'`);
  await openRowMenu(draft.id);await waitFor('!!document.querySelector("[role=menu]")');await menuAction('Xóa bản nháp');await waitFor('!!document.querySelector("[role=dialog]")');
  await click('Hủy');await waitFor('!document.querySelector("[role=dialog]")');assert.equal(draft.deletedAt,undefined);
  await openRowMenu(draft.id);await waitFor('!!document.querySelector("[role=menu]")');await menuAction('Xóa bản nháp');await waitFor('!!document.querySelector("[role=dialog]")');
  failDeleteOnce=true;await click('Xác nhận xóa');await waitFor('document.body.innerText.includes("Fixture delete failed")');assert.equal(draft.deletedAt,undefined);
  await click('Xác nhận xóa');await waitFor('!document.querySelector("[role=dialog]")');await waitFor(`!document.querySelector('[data-draft-id="${draft.id}"]')`);
  await click('Sau');await waitFor('document.querySelectorAll("[data-draft-id]").length===1');
  const lastId=await evaluate('document.querySelector("[data-draft-id]").getAttribute("data-draft-id")');
  await openRowMenu(lastId);await waitFor('!!document.querySelector("[role=menu]")');await menuAction('Xóa bản nháp');await waitFor('!!document.querySelector("[role=dialog]")');await click('Xác nhận xóa');
  await waitFor('document.querySelectorAll("[data-draft-id]").length===20');await shot('draft-list-after-delete.png');
  user.role='user';user.orgId=null;
  assert.equal(await evaluate("fetch('/api/contract-drafts/templates').then(response=>response.status)"),403);
  console.log(`PASS template studio: direct edits, linked fields, undo, bold, autosave/retry, AI review/apply/staleness, voice transcript/permission, approval, Staff Word/print, desktop/mobile. ${saves} saves.`);
  console.log(`Screenshots: ${artifacts}`);
} finally { socket?.close(); chrome?.kill(); frontend.kill(); backend.closeAllConnections(); backend.close(); }
