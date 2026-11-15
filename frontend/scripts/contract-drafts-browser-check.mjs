// Local fixtures only: no production database, AI, audio or billing requests.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { calendarReportFixture } from './fixtures/report.mjs';
const require = createRequire(import.meta.url);
const { CONTRACT_TEMPLATES } = require('../../backend/dist/services/drafting/templates');
const { buildStudioTemplate } = require('../../backend/dist/services/drafting/studioTemplate');
const { studioInput, studioText } = require('../../backend/dist/services/drafting/studioDocument');
const { applyStudioChanges } = require('../../backend/dist/services/drafting/studioChanges');
const { studioBlocks } = require('../../backend/dist/services/drafting/studioChanges');
const { createStudioDocx } = require('../../backend/dist/services/drafting/studioDocx.service');
const root = fileURLToPath(new URL('../', import.meta.url));
const organization = { name: 'Fixture Company', taxCode: '0101234567', address: 'Ha Noi' };
const workspaceSwitch = process.argv.includes('--workspace-switch');
const reportsMode = process.argv.includes('--reports');
const organizationValidation = process.argv.includes('--organization-validation');
let organizationEdits = 0;
if (organizationValidation) Object.assign(organization, { industry: 'other', addressDetails: { provinceCode: '01', wardCode: '00004', addressLine: '12 Test' } });
let reportEmpty = false, reportFailure = false;
const reportRequests = [];
const personalAllowance = process.argv.includes('--personal-allowance');
const rental = process.argv.includes('--rental') || personalAllowance;
let allowanceFailures = personalAllowance ? 1 : 0;
const subscriptionRequests = [];
const user = { id: 'a'.repeat(24), role: rental ? 'user' : 'staff', name: 'Fixture Staff', email: 'staff@example.com', orgId: rental ? null : 'b'.repeat(24), hasCompletedOnboarding: true };
if (workspaceSwitch) Object.assign(user, { workspace: 'organization', organizationMembership: { orgId: 'b'.repeat(24), role: 'staff' } });
if (reportsMode) Object.assign(user, { role: 'administrator', orgId: null });
if (organizationValidation) Object.assign(user, { role: 'owner' });
const token = 'fixture.refresh.signature';
let draft, saves = 0, requests = 0, downloads = 0, failSaveOnce = false, failAiOnce = false, draftingAvailable = 50;
let history = []; const requestIds = new Map();
let listExtras = [], failDeleteOnce = false;
let lawFailures = 2;
const laws = Array.from({ length: 12 }, (_, index) => ({ id: (index + 100).toString(16).padStart(24, '0'), code: `fixture_law_${index}`,
  title: `Văn bản lao động kiểm thử ${index + 1}`, documentNumber: `TEST-${index + 1}`, citationLabel: `Luật kiểm thử ${index + 1}`, status: 'in_force', sourceType: 'law' }));
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const backend = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const bytes = Buffer.concat(chunks); const raw = bytes.toString(); const multipart = req.headers['content-type']?.startsWith('multipart/form-data'); const body = raw && !multipart ? JSON.parse(raw) : {};
  const url = new URL(req.url, 'http://localhost');
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: true, data })); };
  const error = (message, status) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false, error: { message } })); };
  if (reportsMode && url.pathname === '/api/v1/reports') {
    reportRequests.push(url.search);
    if (reportFailure) return error('Chưa tải được báo cáo. Hãy thử lại.', 503);
    const result = calendarReportFixture(url.searchParams, reportEmpty);
    if (user.role === 'owner') {
      result.scope = { type: 'organization', organizationId: user.orgId };
      result.payments = null;
      result.comparison.changes.payments = { current: null, previous: null, difference: null, changePercent: null, unit: 'percent', status: 'no_data' };
      for (const bucket of result.trend.buckets) for (const side of ['current', 'previous']) if (bucket[side]) bucket[side].receivedAmount = null;
    }
    return send(result);
  }
  if (url.pathname === '/api/v1/auth/refresh') {
    if (workspaceSwitch && body.workspace) Object.assign(user, { workspace: body.workspace, role: body.workspace === 'personal' ? 'user' : 'staff', orgId: body.workspace === 'personal' ? null : 'b'.repeat(24) });
    return send({ user, accessToken: token, refreshToken: token });
  }
  if ((workspaceSwitch || reportsMode || organizationValidation) && url.pathname === '/api/v1/contracts') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ success: true, data: [], meta: { total: 0 } }));
  }
  if (organizationValidation && url.pathname === '/api/v1/organizations/address-options') return send(require('../../backend/dist/services/organization/vietnamAddress').vietnamAddressDirectory);
  if (organizationValidation && url.pathname === '/api/v1/contract-profiles') return send([{ code: 'labor', name: 'Labor', industries: [{ code: 'other', name: 'Khác' }] }]);
  if ((workspaceSwitch || reportsMode || organizationValidation) && url.pathname === `/api/v1/organizations/${'b'.repeat(24)}`) {
    if (organizationValidation && req.method === 'PATCH') {
      const parsed = require('../../backend/dist/validations/organization.validation').updateOrganizationSchema.safeParse(body);
      if (!parsed.success) return error(parsed.error.issues[0].message, 400);
      organizationEdits++; Object.assign(organization, parsed.data);
    }
    return send({ ...organization, id: 'b'.repeat(24) });
  }
  if (workspaceSwitch && url.pathname === '/api/v1/contract-profiles') return send([]);
  if (url.pathname === '/api/v1/invitations/received') return send([]);
  if (url.pathname === '/api/v1/profile') return send({ user: { ...user, phone: '', emailVerified: true, hasPassword: true, googleLinked: false, createdAt: '2026-10-01T00:00:00Z' }, organization: { ...organization, id: user.orgId } });
  if (url.pathname.endsWith('/subscription')) {
    subscriptionRequests.push(url.pathname);
    if (allowanceFailures-- > 0) return error('Fixture allowance unavailable', 503);
    return send({ status: 'active', plan: null, startsAt: null, endsAt: null, scheduledDowngrade: null,
      analysis: { used: 0, reserved: 0, limit: 3, available: 3 }, chat: { used: 0, reserved: 0, limit: 10, available: 10 },
      members: { count: 1, pending: 0, limit: 5, available: 4 },
      drafting: { used: 50 - draftingAvailable, reserved: 0, limit: 50, available: draftingAvailable } });
  }
  if (url.pathname === '/api/v1/contract-drafts/templates') return send({ templates: CONTRACT_TEMPLATES.filter(template => template.code !== 'rental' || user.role === 'user'), organization, role: user.role });
  if (url.pathname === '/api/v1/contract-drafts/legal-sources') {
    if (lawFailures-- > 0) return error('Fixture catalog unavailable', 503);
    const q = (url.searchParams.get('q') ?? '').toLocaleLowerCase('vi');
    const ids = url.searchParams.get('ids')?.split(',');
    assert.equal(url.searchParams.get('templateCode'), draft?.templateCode);
    const scoped = url.searchParams.get('templateCode') === 'labor' ? laws.slice(0, 2) : laws;
    const items = scoped.filter(law => (!ids || ids.includes(law.id)) && `${law.title} ${law.documentNumber}`.toLocaleLowerCase('vi').includes(q));
    return send({ items, total: items.length, page: 1, pages: 1 });
  }
  if (url.pathname.startsWith('/api/v1/contract-drafts/legal-sources/')) {
    const source = laws.find(law => url.pathname.endsWith(law.id));
    const page = Number(url.searchParams.get('page') || 1);
    const chunks = Array.from({ length: page === 1 ? 8 : 2 }, (_, index) => ({ id: `chunk-${page}-${index}`, articleRef: `Điều ${(page - 1) * 8 + index + 1}`,
      text: page === 2 ? 'NỘI_DUNG_CUỐI_VĂN_BẢN' : `Điều ${index + 1}. Nội dung kiểm thử\nNội dung văn bản kiểm thử lấy từ kho luật. ${'Đây là nội dung kiểm thử bố cục đọc văn bản. '.repeat(7)}`,
      hierarchy: [{ level: 'chapter', number: 'I', title: 'QUY ĐỊNH KIỂM THỬ' }] }));
    return source ? send({ source: { ...source, issuingBody: 'Cơ quan kiểm thử', signer: 'Người ký kiểm thử', legalField: 'Lĩnh vực kiểm thử', gazette: 'Công báo kiểm thử', issuedDate: '2020-01-01', effectiveDate: '2021-01-01' }, chunks, page, pages: 2, total: 10 }) : error('Not found', 404);
  }
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
    for (const key of Object.keys(body.input)) assert.ok(template.fields.some(field => field.key === key), `Frontend sends unknown template field: ${key}`);
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
    assert.deepEqual(body.legalSourceIds ?? [], draft.legalSourceIds ?? []);
    const proposal = { id: (history.length + 1).toString(16).padStart(24, '0'), userMessage: body.message, referenceNames: body.references?.map(item => item.name) ?? [], legalSources: laws.filter(law => body.legalSourceIds?.includes(law.id)), baseRevision: draft.revision, message: 'Price update ready for your review.', changes: { fields: [{ key: 'price', before: draft.input.price ?? '', after: '15000000' }], blocks: [] }, status: 'pending', createdAt: new Date().toISOString() };
    if (body.mode === 'check') {
      const block = studioBlocks(draft.document, draft.template).find(item => body.blockIds.includes(item.id));
      assert.ok(block); assert.ok(body.legalSourceIds.length);
      const source = laws.find(law => body.legalSourceIds.includes(law.id));
      Object.assign(proposal, { mode: 'check', blockIds: body.blockIds, message: 'Đã kiểm tra vùng chọn.',
        changes: { fields: [], blocks: [{ action: 'replace', blockId: block.id, before: block.text, after: 'BROWSER CHECKED CLAUSE' }] },
        review: { summary: 'Có một điểm cần xem xét trong điều khoản.', findings: [{ blockId: block.id, severity: 'medium',
          title: 'Điểm cần làm rõ trong điều khoản', reason: 'Lý do kiểm thử lấy từ trích đoạn trong kho.', contractText: block.text,
          verification: 'source_matched', citations: [{ chunkId: 'chunk-1-0', sourceId: source.id, title: source.title,
            documentNumber: source.documentNumber, articleRef: 'Điều 1', quote: 'Trích đoạn căn cứ kiểm thử từ kho luật.' }] }] } });
    }
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
  socket.onmessage = event => { const message = JSON.parse(event.data); if (message.method === 'Runtime.exceptionThrown') logs += '\nBROWSER EXCEPTION: ' + JSON.stringify(message.params); if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') logs += '\nBROWSER ERROR: ' + JSON.stringify(message.params.args); if (message.id) { const task = pending.get(message.id); if (task) { pending.delete(message.id); if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result); } } };
  const evaluate = async expression => { const result = await call('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails)); return result.result.value; };
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(artifacts, name), Buffer.from(result.data, 'base64')); };
  const waitFor = async expression => { for (let n = 0; n < 180; n++) { try { if (await evaluate(expression)) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } await shot('failure.png'); throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText')}\n${logs}\nScreenshots: ${artifacts}`); };
  const click = label => evaluate(`Array.from(document.querySelectorAll('button')).find(button => button.textContent.trim() === ${JSON.stringify(label)})?.click()`);
  await call('Page.enable'); await call('Runtime.enable'); await call('Network.enable'); await call('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: artifacts });
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
  if (organizationValidation) {
    await call('Page.navigate', { url: `${origin}/settings` });
    await waitFor(`!!document.querySelector('button[aria-label="Chỉnh sửa thông tin tổ chức"]')`);
    await clickLabel('Chỉnh sửa thông tin tổ chức');
    await waitFor('document.querySelector("[role=dialog] select[name=industry]")?.options.length > 1 && document.querySelector("select[name=provinceCode]")?.options.length > 1');
    await waitFor('document.querySelector("select[name=provinceCode]").value === "01" && document.querySelector("select[name=wardCode]").value === "00004" && document.querySelector("select[name=industry]").value === "other"');
    for (const width of [1440, 390, 320]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 821 });
      await evaluate('document.fonts.ready');
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `Organization form overflow at ${width}`);
      await shot(`organization-validation-${width}.png`);
    }
    await fillSelector('[role=dialog] input[name=taxCode]', 'abc');
    await click('Lưu thay đổi');
    await waitFor('!!document.querySelector("[role=dialog] [role=alert]")');
    assert.equal(organizationEdits, 0);
    await fillSelector('[role=dialog] input[name=taxCode]', '0312345678-001');
    await fillSelector('[role=dialog] select[name=provinceCode]', '79');
    await waitFor('document.querySelector("select[name=wardCode]").value === ""');
    await click('Lưu thay đổi');
    assert.equal(organizationEdits, 0);
    await fillSelector('[role=dialog] select[name=provinceCode]', '01');
    await fillSelector('[role=dialog] select[name=wardCode]', '00004');
    await fillSelector('[role=dialog] textarea[name=addressLine]', '25 Fixture Street');
    await click('Lưu thay đổi');
    await waitFor('!document.querySelector("[role=dialog]")');
    assert.equal(organizationEdits, 1);
    assert.equal(organization.taxCode, '0312345678-001');
    assert.equal(organization.addressDetails.wardCode, '00004');
    assert.ok(organization.address.includes('25 Fixture Street'));
    console.log(`PASS organization validation: required business metadata, invalid tax code blocked before API, dependent province/ward selection, normalized update through backend schema, desktop/mobile 1440/390/320. Screenshots: ${artifacts}`);
  } else if (reportsMode) {
    await call('Page.navigate', { url: `${origin}/admin/reports` });
    await waitFor('document.querySelectorAll("[data-report-metric]").length === 6');
    assert.match(await evaluate('document.querySelector("[data-report-metric=success]").textContent'), /80%/);
    assert.match(await evaluate('document.querySelector("[data-report-metric=risk]").textContent'), /33,3%/);
    assert.match(await evaluate('document.querySelector("[data-report-metric=duration]").textContent'), /45 giây/);
    assert.match(await evaluate('document.querySelector("[data-report-metric=payments]").textContent'), /99.000/);
    await evaluate('document.querySelector("[data-report-metric=success] summary").click()');
    assert.ok(await evaluate('document.querySelector("[data-report-metric=success] details").open'));
    for (const width of [1440, 390, 320]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 821 });
      await evaluate('document.fonts.ready');
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `Report overflow at ${width}`);
      await shot(`reports-${width}.png`);
    }
    for (const period of ['week', 'quarter', 'year', 'month']) {
      await fillSelector('[aria-label="Kỳ báo cáo"]', period);
      await fillSelector('[aria-label="Ngày trong kỳ"]', '2026-10-10');
      await click('Áp dụng bộ lọc');
      await waitFor('document.querySelectorAll("[data-report-metric]").length === 6 && !Array.from(document.querySelectorAll("button")).some(button=>button.textContent.includes("Đang cập nhật"))');
      assert.ok(reportRequests.some(query => query.includes(`period=${period}`)));
    }
    await fillSelector('[aria-label="So sánh với"]', 'year');
    await fillSelector('[aria-label="Gộp biểu đồ theo"]', 'week');
    await fillSelector('[aria-label="Lọc tổ chức"]', 'b'.repeat(24));
    await click('Áp dụng bộ lọc');
    await waitFor('document.querySelectorAll("[data-report-metric]").length === 6 && document.body.innerText.includes("2025-10-01")');
    assert.ok(reportRequests.some(query => query.includes('comparison=year') && query.includes('organizationId=')));
    await fillSelector('[aria-label="Kỳ báo cáo"]', 'custom');
    await fillSelector('[aria-label="Từ ngày"]', '2026-10-01');
    await fillSelector('[aria-label="Đến ngày"]', '2026-10-15');
    await fillSelector('[aria-label="So sánh với"]', 'none');
    await click('Áp dụng bộ lọc');
    await waitFor('document.querySelectorAll("[data-report-metric]").length === 6 && document.querySelector("[role=status]")?.textContent.includes("2026-10-15")');
    assert.equal(await evaluate('document.querySelector("[role=status]").textContent.includes("Kỳ so sánh:")'), false);
    assert.equal(await evaluate('document.querySelectorAll("[data-slot=chart]").length'), 5);
    await click('Tải CSV');
    let exported;
    for (let attempt = 0; attempt < 60; attempt++) {
      exported = (await fs.readdir(artifacts)).find(name => name.endsWith('.csv'));
      if (exported) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(exported, 'Report CSV was not downloaded');
    assert.match(await fs.readFile(path.join(artifacts, exported), 'utf8'), /Tỷ lệ thành công/);
    reportEmpty = true;
    await click('Làm mới');
    await waitFor('document.querySelector("[data-report-metric=success]")?.textContent.includes("Chưa có dữ liệu")');
    await shot('reports-empty.png');
    reportFailure = true;
    await click('Làm mới');
    await waitFor('!!document.querySelector("[role=alert]")');
    assert.equal(await evaluate('document.querySelectorAll("[data-report-metric]").length'), 0);
    reportFailure = false;
    await click('Thử lại');
    await waitFor('document.querySelectorAll("[data-report-metric]").length === 6');
    Object.assign(user, { role: 'owner', orgId: 'b'.repeat(24) });
    await call('Page.navigate', { url: `${origin}/reports` });
    await waitFor('document.querySelectorAll("[data-report-metric]").length === 5');
    assert.equal(await evaluate('!!document.querySelector("[data-report-metric=payments]")'), false);
    assert.equal(await evaluate(`document.querySelector('select[aria-label="Lọc tổ chức"]').options[0].textContent`), 'Tổ chức của bạn');
    for (const width of [1440, 390, 320]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 821 });
      await evaluate('document.fonts.ready');
      assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `Owner report overflow at ${width}`);
      await shot(`owner-reports-${width}.png`);
    }
    console.log(`PASS reports: computed metrics, five charts, week/month/quarter/year/custom filters, previous/year/none comparisons, organization scope, CSV, empty denominators, API failure/retry, desktop/mobile at 1440/390/320. Screenshots: ${artifacts}`);
  } else if (workspaceSwitch) {
    await call('Page.navigate', { url: `${origin}/contract-drafts` });
    const selector = 'select[aria-label="Chuyển không gian làm việc"]';
    await waitFor(`document.querySelector('${selector}')?.value === 'organization'`);
    for (const width of [1440, 390, 320]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 821 });
      await evaluate('document.fonts.ready');
      const bounds = await evaluate(`(() => { const r=document.querySelector('${selector}').getBoundingClientRect(); return { left:r.left, right:r.right, width:innerWidth, overflow:document.documentElement.scrollWidth > innerWidth }; })()`);
      assert.ok(bounds.left >= 0 && bounds.right <= width, JSON.stringify(bounds));
      assert.equal(bounds.overflow, false, JSON.stringify(bounds));
      await shot(`workspace-${width}.png`);
    }
    await fillSelector(selector, 'personal');
    await waitFor(`location.pathname === '/review' && document.querySelector('${selector}')?.value === 'personal'`);
    await waitFor('document.body.innerText.includes("Dùng hạn mức cá nhân") || innerWidth < 640');
    await call('Page.reload');
    await waitFor(`document.querySelector('${selector}')?.value === 'personal'`);
    await fillSelector(selector, 'organization');
    await waitFor(`location.pathname === '/dashboard' && document.querySelector('${selector}')?.value === 'organization'`);
    console.log(`PASS workspace switch: Staff organization/personal contexts, reload persistence, real HttpOnly cookie proxy and layout at 1440/390/320. Screenshots: ${artifacts}`);
  } else if (personalAllowance) {
    await call('Page.navigate', { url: `${origin}/contract-drafts` });
    await waitFor('!!document.querySelector("article[data-template-code=labor] button")');
    await evaluate('document.querySelector("article[data-template-code=labor] button").click()');
    await waitFor(editorReady);
    await waitFor('document.body.innerText.includes("Thử tải lại hạn mức")');
    assert.equal(user.orgId, null);
    assert.ok(subscriptionRequests.includes(`/api/v1/organizations/${user.id}/subscription`));
    assert.equal(await evaluate('document.body.innerText.includes("Cần gói đang hoạt động")'), false);
    await click('Thử tải lại hạn mức');
    await waitFor('document.body.innerText.includes("50 lượt soạn còn lại")');
    await fillSelector('textarea[aria-label="Yêu cầu chỉnh hợp đồng"]', 'Kiểm tra giúp tôi');
    await waitFor(`document.querySelector('button[aria-label="Gửi yêu cầu cho trợ lý"]').disabled===false`);
    await shot('personal-studio-allowance.png');
    console.log('PASS personal studio allowance: account ID without orgId, load error and retry, active quota enables sending.');
  } else if (process.argv.includes('--sales')) {
    await call('Page.navigate', { url: `${origin}/contract-drafts` });
    await waitFor('!!document.querySelector("article[data-template-code=sales] button")');
    await fillSelector('select[aria-label="Vai trò với Hợp đồng mua bán hàng hóa"]', 'buyer');
    await evaluate('document.querySelector("article[data-template-code=sales] button").click()');
    await waitFor(editorReady);
    assert.equal(draft.templateCode, 'sales');
    assert.equal(draft.ourParty, 'buyer');
    assert.equal(draft.templateVersion, 3);
    await editField('companyName', 'Doanh nghiệp bên mua');
    await editField('partnerName', 'Doanh nghiệp bên bán');
    await editField('totalPrice', '10.000.000');
    await editField('reference', 'MB-2026-001');
    await waitFor(saved);
    assert.equal(draft.input.totalPrice, '10000000');
    assert.equal(await evaluate('[...document.querySelectorAll("[data-field-key=totalPrice]")].every(node=>node.textContent==="10.000.000")'), true);
    assert.equal(await evaluate('[...document.querySelectorAll("[data-field-key=reference]")].length'), 2);
    assert.ok(draft.content.slice(draft.content.indexOf('BÊN A (BÊN BÁN)'), draft.content.indexOf('BÊN B (BÊN MUA)')).includes('Doanh nghiệp bên bán'));
    assert.ok(draft.content.slice(draft.content.indexOf('BÊN B (BÊN MUA)'), draft.content.indexOf('ĐIỀU 1.')).includes('Doanh nghiệp bên mua'));
    for (const width of [1920, 1440, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
      await evaluate('document.querySelector(".tiptap.ProseMirror").scrollIntoView({block:"start"})');
      await shot(`sales-reference-${width}.png`);
    }
    await call('Emulation.setDeviceMetricsOverride', { width:1440, height:1000, deviceScaleFactor:1, mobile:false });
    await evaluate('document.querySelector("[data-template-items]").scrollIntoView({block:"center"})');
    await shot('sales-reference-appendix.png');
    draft.status = 'approved'; // Fixture state for inspecting the authorized print output.
    const printed = await evaluate(`fetch('/contract-drafts/${draft.id}/print').then(response=>response.text())`);
    assert.ok(printed.includes('PHỤ LỤC 01'));
    assert.ok(printed.includes('ĐIỀU 15.'));
    assert.ok(printed.includes('data-page-break'));
    console.log(`PASS sales reference: 15 articles, buyer/seller placement, linked money and reference fields, appendix, print, desktop/mobile. Screenshots: ${artifacts}`);
  } else if (rental) {
    await call('Page.navigate', { url: `${origin}/contract-drafts` });
    await waitFor('document.querySelectorAll("article button").length===4');
    for (const width of [1440, 1024, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      await shot(`template-catalog-${width}.png`);
    }
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    const positions = await evaluate('[...document.querySelectorAll("article[data-template-code]")].map(card => ({top:card.getBoundingClientRect().top,height:card.getBoundingClientRect().height}))');
    assert.equal(positions[0].top, positions[1].top);
    assert.equal(positions[2].top, positions[3].top);
    assert.ok(positions[2].top > positions[0].top);
    assert.equal(positions[0].height, positions[1].height);
    await fillSelector('select[aria-label="Vai trò với Hợp đồng thuê nhà"]', 'tenant');
    await evaluate('document.querySelectorAll("article")[3].querySelector("button").click()');
    await waitFor(editorReady);
    assert.equal(draft.templateCode, 'rental');
    assert.equal(draft.ourParty, 'tenant');
    assert.equal(draft.input.depositAmount, '0');
    for (const field of draft.template.fields.filter(field => field.required && !draft.input[field.key])) {
      await editField(field.key, field.kind === 'date' ? '2027-10-26' : field.kind === 'number' ? '10.000.000' : 'Thong tin hop dong thue nha');
    }
    await waitFor(saved);
    assert.equal(await evaluate('document.body.innerText.includes("Tên doanh nghiệp")'), false);
    for (const width of [1440, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      await shot(`personal-rental-${width}.png`);
    }
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await click('Hoàn tất hợp đồng');
    await waitFor('!!document.querySelector("[role=dialog]")');
    await evaluate('document.querySelector("[role=dialog] input[type=checkbox]").click()');
    await click('Xác nhận hoàn tất');
    await waitFor(`document.querySelector('button[aria-label="Tải Word"]')?.disabled===false`);
    await evaluate(`document.querySelector('summary[aria-label="Tải hợp đồng"]').click()`);
    await clickLabel('Tải Word');
    for (let n = 0; n < 50 && !downloads; n++) await new Promise(resolve => setTimeout(resolve, 100));
    assert.equal(downloads, 1);
    assert.equal(user.orgId, null);
    console.log('PASS personal rental: tenant selection, linked fields, zero deposit, completion, Word export and desktop/mobile layout without orgId.');
    console.log(`Screenshots: ${artifacts}`);
  } else {
  await call('Page.navigate', { url: `${origin}/contract-drafts` });
  await waitFor('document.querySelectorAll("article button").length===3');
  await shot('templates-desktop.png');
  await evaluate('document.querySelectorAll("article")[1].querySelector("button").click()');
  await waitFor(editorReady);
  if (process.argv.includes('--layout')) {
    await waitFor('!!document.querySelector("[data-studio-welcome]")');
    for (const width of [1920, 1440, 1280, 1024, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: width < 600 ? 844 : 1000, deviceScaleFactor: 1, mobile: width < 600 });
      if (width < 1280) await click('Trợ lý AI');
      const bounds = await evaluate(`(() => {const chat=document.querySelector('[aria-label="Trợ lý chỉnh hợp đồng"]');const composer=document.querySelector('[data-studio-composer]');const messages=document.querySelector('[data-studio-messages]');const documentPane=document.querySelector('[aria-label="Trang hợp đồng"]');return {chat:chat.getBoundingClientRect().width,composer:composer.getBoundingClientRect().height,messages:messages.getBoundingClientRect().height,document:documentPane.getBoundingClientRect().width,overflow:document.documentElement.scrollWidth>innerWidth};})()`);
      assert.equal(bounds.overflow, false);
      assert.ok(bounds.chat >= 300);
      assert.ok(bounds.composer < 300, `Composer takes too much space: ${JSON.stringify(bounds)}`);
      assert.ok(bounds.messages > bounds.composer, `Too little room for answers: ${JSON.stringify(bounds)}`);
      if (width >= 1280) { assert.ok(bounds.chat <= 420); assert.ok(bounds.document > bounds.chat); }
      await shot(`studio-balanced-${width}.png`);
      if (width === 1920) {
        const handle = await evaluate(`(() => {const r=document.querySelector('[role="separator"]').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};})()`);
        await call('Input.dispatchMouseEvent', {type:'mouseMoved', ...handle});
        await call('Input.dispatchMouseEvent', {type:'mousePressed', ...handle, button:'left', clickCount:1});
        await call('Input.dispatchMouseEvent', {type:'mouseMoved', x:handle.x+130, y:handle.y, button:'left', buttons:1});
        await call('Input.dispatchMouseEvent', {type:'mouseReleased', x:handle.x+130, y:handle.y, button:'left', clickCount:1});
        await waitFor(`Number(document.querySelector('[role="separator"]').getAttribute('aria-valuenow'))>500`);
        await shot('studio-resized.png');
        await evaluate(`document.querySelector('[role="separator"]').focus()`);
        await call('Input.dispatchKeyEvent', {type:'keyDown', key:'Home', code:'Home'});
        await call('Input.dispatchKeyEvent', {type:'keyUp', key:'Home', code:'Home'});
        await waitFor(`Number(document.querySelector('[role="separator"]').getAttribute('aria-valuenow'))===420`);
      }
      if (width < 1280) {
        await click('Văn bản');
        assert.ok(await evaluate(`document.querySelector('[aria-label="Trang hợp đồng"]').getBoundingClientRect().width>0`));
        assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'), false);
      }
    }
    console.log(`PASS balanced studio layout: 1920, 1440, 1280, 1024, 390; compact composer, room for AI answers, tablet/mobile pane switching. Screenshots: ${artifacts}`);
  } else {
  assert.equal(await evaluate('document.querySelector("aside").getBoundingClientRect().width>0'), true, 'Dashboard sidebar is visible in the editor');
  assert.equal(await evaluate('document.querySelector("aside a[aria-current=page]")?.getAttribute("href")'), '/contract-drafts');
  assert.equal(requests, 0); assert.ok(draft.document); assert.equal(draftingAvailable, 50);
  assert.equal(await evaluate('!!document.getElementById("draft-title")'), false, 'Old step form is removed');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await shot('studio-desktop.png');
  await evaluate(`document.querySelector('summary[aria-label="Tải hợp đồng"]').click()`);
  await waitFor('document.body.innerText.includes("Hoàn tất hợp đồng để tải Word/PDF")');
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
  await clickLabel('Chọn luật áp dụng'); await waitFor('!!document.querySelector("[role=dialog]")');
  await waitFor('document.body.innerText.includes("Chưa tải được danh sách luật.")');
  await click('Thử lại'); await waitFor('document.querySelectorAll("[role=dialog] input[type=checkbox]").length===12');
  await fillSelector('input[aria-label="Tìm luật áp dụng"]', 'không tồn tại');
  await waitFor('document.body.innerText.includes("Không tìm thấy văn bản phù hợp")');
  await fillSelector('input[aria-label="Tìm luật áp dụng"]', 'lao động');
  await waitFor('document.querySelectorAll("[role=dialog] input[type=checkbox]").length===12');
  assert.ok(await evaluate('document.querySelectorAll("[role=dialog] mark").length>0'));
  await evaluate('[...document.querySelectorAll("[role=dialog] input[type=checkbox]")].slice(0,10).forEach(box=>box.click())');
  await waitFor('document.querySelectorAll("[role=dialog] input[type=checkbox]:checked").length===10');
  assert.equal(await evaluate('document.querySelectorAll("[role=dialog] input[type=checkbox]:disabled").length'), 2);
  for (const width of [1440, 390]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 600 });
    assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
    assert.equal(await evaluate('document.querySelector("[role=dialog]").getBoundingClientRect().bottom<=innerHeight'), true);
    await shot(`studio-law-picker-${width}.png`);
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await clickLabel(`Xem ${laws[0].title}`);
  await waitFor('document.body.innerText.includes("Nội dung văn bản kiểm thử lấy từ kho luật.")');
  assert.ok(await evaluate('document.querySelector("[role=dialog]").textContent.includes("Xem nội dung văn bản")'));
  assert.equal(await evaluate('document.querySelectorAll("[role=tab]").length'), 2);
  await shot('studio-law-preview.png');
  await click('Thuộc tính');
  await waitFor('document.querySelector("[role=tabpanel]").textContent.includes("Người ký kiểm thử")');
  assert.ok(await evaluate('document.querySelector("[role=tabpanel]").textContent.includes("Chưa cập nhật")'));
  assert.ok(await evaluate('document.querySelector("[role=tabpanel]").textContent.includes("01/01/2020")'));
  await shot('studio-law-attributes.png');
  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 900, deviceScaleFactor: 1, mobile: true });
  assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
  await shot('studio-law-attributes-mobile.png');
  await click('Nội dung');
  await shot('studio-law-content-mobile.png');
  await evaluate('document.querySelector("[role=tabpanel]").scrollTop=100000');
  await waitFor('document.querySelector("[role=tabpanel]").textContent.includes("NỘI_DUNG_CUỐI_VĂN_BẢN")');
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await click('Quay lại danh sách luật');
  await waitFor('document.querySelectorAll("[role=dialog] input[type=checkbox]").length===12');
  await evaluate('document.querySelector("[role=dialog] input[type=checkbox]").click()');
  await evaluate('document.querySelectorAll("[role=dialog] input[type=checkbox]")[10].click()');
  await click('Áp dụng');
  await waitFor('!document.querySelector("[role=dialog]")');
  await waitFor(saved);
  assert.equal(draft.legalSourceIds.length, 10);
  assert.ok(!draft.legalSourceIds.includes(laws[0].id));
  await call('Page.reload', { ignoreCache: true }); await waitFor(editorReady);
  await clickLabel('Chọn luật áp dụng'); await waitFor('document.querySelectorAll("[role=dialog] input[type=checkbox]:checked").length===10');
  await click('Đã chọn (10)'); await waitFor('document.querySelectorAll("[role=dialog] input[type=checkbox]").length===10');
  await evaluate('document.querySelector("[role=dialog] input[type=checkbox]").click()');
  await click('Hủy');
  await waitFor('!document.querySelector("[role=dialog]")');
  assert.equal(draft.legalSourceIds.length, 10, 'Cancel must not save the temporary selection');
  if (process.argv.includes('--clause-check')) {
    await evaluate(`(() => { const editor=document.querySelector('.tiptap.ProseMirror');editor.focus();const walker=document.createTreeWalker(editor,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode()){const index=node.textContent.indexOf('BROWSER CUSTOM CLAUSE');if(index>=0){const range=document.createRange();range.setStart(node,index);range.setEnd(node,index+21);getSelection().removeAllRanges();getSelection().addRange(range);document.dispatchEvent(new Event('selectionchange'));break;}} })()`);
    await waitFor('Array.from(document.querySelectorAll("button")).some(button=>button.textContent.trim()==="Kiểm tra điều khoản"&&!button.disabled)');
    const original = JSON.stringify(draft.document);
    await click('Kiểm tra điều khoản');
    await waitFor(`!!document.querySelector('[aria-label="Kết quả kiểm tra điều khoản"]')`);
    assert.equal(requests, 1); assert.equal(draftingAvailable, 49);
    assert.equal(JSON.stringify(draft.document), original, 'Checking does not edit the contract');
    assert.ok(await evaluate('document.body.innerText.includes("Trích đoạn căn cứ kiểm thử từ kho luật.")'));
    for (const width of [1440, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      assert.equal(await evaluate('document.documentElement.scrollWidth<=innerWidth'), true);
      await shot(`studio-clause-review-${width}.png`);
    }
    await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
    await evaluate(`document.querySelector('[aria-label="Kết quả kiểm tra điều khoản"] button').click()`);
    await waitFor('document.body.innerText.includes("Xem nội dung văn bản")');
    await click('Quay lại danh sách luật'); await waitFor('!document.querySelector("[role=dialog]")');
    await evaluate(`(() => {const editor=document.querySelector('.tiptap.ProseMirror');editor.focus();const range=document.createRange();range.selectNodeContents(editor);range.collapse(false);getSelection().removeAllRanges();getSelection().addRange(range);document.execCommand('insertText',false,' MANUAL CHECK CHANGE');})()`);
    await waitFor(saved);
    await waitFor('document.body.innerText.includes("Kết quả này thuộc phiên bản trước")');
    assert.ok(await evaluate('Array.from(document.querySelectorAll("button")).filter(button=>button.textContent.trim()==="Áp dụng").every(button=>button.disabled)'));
    await click('Kiểm tra lại · 1 lượt soạn');
    await waitFor(`document.querySelectorAll('[aria-label="Kết quả kiểm tra điều khoản"]').length===2`);
    assert.equal(requests, 2);
    await evaluate('Array.from(document.querySelectorAll("button")).find(button=>button.textContent.trim()==="Áp dụng"&&!button.disabled).click()');
    await waitFor('document.body.innerText.includes("Đã áp dụng vào văn bản")');
    assert.ok(draft.content.includes('BROWSER CHECKED CLAUSE'));
    assert.ok(draft.content.includes('MANUAL CHECK CHANGE'));
    console.log('PASS clause check: explicit selected-scope action, verified-citation UI, source preview, no automatic edits, stale warning, recheck, confirmed application, desktop/mobile.');
    console.log(`Screenshots: ${artifacts}`);
  } else {
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
  await waitFor(saved); await click('Hoàn tất hợp đồng');
  await waitFor('!!document.querySelector("[role=dialog]")');
  await evaluate('document.querySelector("[role=dialog] input[type=checkbox]").click()');
  await click('Xác nhận hoàn tất');
  await waitFor(`document.querySelector('button[aria-label="Tải Word"]')?.disabled===false`);
  assert.equal(draft.status, 'approved');
  assert.equal(user.role, 'staff');
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
  await clickLabel('Chọn luật áp dụng');
  await waitFor('document.querySelectorAll("[role=dialog] input[type=checkbox]").length===2');
  assert.ok(await evaluate('document.body.innerText.includes("Văn bản lao động từ kho luật của hệ thống.")'));
  await shot('labor-law-picker-scoped.png');
  await click('Hủy'); await waitFor('!document.querySelector("[role=dialog]")');
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
  assert.equal(await evaluate("fetch('/api/contract-drafts/templates').then(response=>response.status)"),200);
  console.log(`PASS template studio: direct edits, linked fields, undo, bold, autosave/retry, AI review/apply/staleness, voice transcript/permission, Staff self-completion without Owner approval, Word/print, desktop/mobile. ${saves} saves.`);
  console.log(`Screenshots: ${artifacts}`);
  }
  }
  }
} finally { socket?.close(); chrome?.kill(); frontend.kill(); backend.closeAllConnections(); backend.close(); }
