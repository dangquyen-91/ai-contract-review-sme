// Build first. All backend, Google and hosted-checkout responses are isolated fixtures.
// This never creates a real payOS link, sends email or transfers money.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const addressDirectory = JSON.parse(await fs.readFile(new URL('../../backend/src/data/vietnam-addresses.json', import.meta.url), 'utf8'));
const singleContract = process.argv.includes('--contract-payment');
const deleteOrganization = process.argv.includes('--delete-organization');
const createOrganization = process.argv.includes('--create-organization');
let createdOrganization = null;
let failCreatedSessionRefresh = true;
let failOrganizationDelete = true;
const personal = singleContract || process.argv.includes('--personal');
const orgId = (personal ? 'b' : 'a').repeat(24), code = 1234567890123;
const user = { id: 'b'.repeat(24), orgId: personal || createOrganization ? null : orgId, role: personal || createOrganization ? 'user' : 'owner', name: 'Fixture Owner', email: 'owner@example.com', hasCompletedOnboarding: true };
const plan = { code: personal ? 'personal_pro' : 'business_starter', name: personal ? 'Personal Pro' : 'Business Starter', audience: personal ? 'personal' : 'business', price: personal ? 99000 : 499000, currency: 'VND', analysisLimit: personal ? 30 : 200, draftingLimit: 0, chatLimit: personal ? 200 : 500, memberLimit: personal ? 1 : 5 };
const freePlan = { ...plan, code: 'personal_free', name: 'Personal Free', price: 0, analysisLimit: 3, chatLimit: 10 };
const proPlan = { ...plan, code: 'business_pro', name: 'Business Pro', price: 999000, analysisLimit: 600, chatLimit: 1500, memberLimit: 15 };
const subscription = { status: 'none', plan: null, startsAt: null, endsAt: null, scheduledDowngrade: null, members: { count: 1, pending: 0, available: 2, limit: 3 }, analysis: { used: 0, reserved: 0, available: 0, limit: 0 }, chat: { used: 0, reserved: 0, available: 0, limit: 0 } };
if (personal) Object.assign(subscription, { status: 'active', plan: freePlan, analysis: { used: 1, reserved: 0, available: 2, limit: 3 }, chat: { used: 0, reserved: 0, available: 10, limit: 10 }, members: { count: 1, pending: 0, limit: 1, available: 0 }, contractReviewPricing: { unitPrice: 10000, pagesPerUnit: 5 } });
if (singleContract) subscription.analysis = { used: 2, reserved: 0, available: 1, limit: 3 };
let order = null;
let historicalOrders = [];
let personalContract = null;
const actions = [];
const token = `fixture.${Buffer.from(JSON.stringify({ sub: user.id, orgId, role: 'owner', exp: Math.floor(Date.now() / 1000) + 604800 })).toString('base64url')}.fixture`;
const session = { user, accessToken: token, refreshToken: token };
const challenge = { verificationRequired: true, challengeId: 'c'.repeat(64), email: user.email, expiresAt: new Date(Date.now() + 600000).toISOString(), resendAfterSeconds: 0 };
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const backend = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString(), body = raw && !req.headers['content-type']?.startsWith('multipart/form-data') ? JSON.parse(raw) : {};
  const url = new URL(req.url, 'http://fixture');
  res.setHeader('Content-Type', 'application/json');
  const send = (data, status = 200) => { res.writeHead(status); res.end(JSON.stringify({ success: true, data })); };
  if (createOrganization && url.pathname === '/api/v1/organizations/address-options') return send(addressDirectory);
  if (createOrganization && url.pathname === '/api/v1/contract-profiles') return send([{ code: 'labor', name: 'Labor', industries: [{ code: 'organization-create-fixture', name: 'Dịch vụ chuyên môn' }] }]);
  if (createOrganization && url.pathname === '/api/v1/organizations' && req.method === 'POST') {
    assert.deepEqual(body, { name: 'Công ty Minh Tâm', taxCode: '0312345678', addressDetails: { provinceCode: '01', wardCode: '00004', addressLine: '12 Hoàng Hoa Thám' }, industry: 'organization-create-fixture' });
    assert.equal(createdOrganization, null, 'Session retry must not create another business');
    createdOrganization = { ...body, address: '12 Hoàng Hoa Thám, Phường Ba Đình, Thành phố Hà Nội', id: 'c'.repeat(24), _id: 'c'.repeat(24) };
    user.orgId = createdOrganization.id; user.role = 'owner';
    actions.push('create-organization');
    return send(createdOrganization, 201);
  }
  if (createOrganization && createdOrganization && url.pathname === `/api/v1/organizations/${createdOrganization.id}`) return send(createdOrganization);
  if (createOrganization && createdOrganization && url.pathname === `/api/v1/organizations/${createdOrganization.id}/subscription`) return send(subscription);
  if (createOrganization && url.pathname === '/api/v1/contracts') {
    res.writeHead(200); return res.end(JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 10 } }));
  }
  if (createOrganization && createdOrganization && failCreatedSessionRefresh && url.pathname === '/api/v1/auth/refresh') {
    failCreatedSessionRefresh = false;
    res.writeHead(503); return res.end(JSON.stringify({ success: false, error: { message: 'Fixture session refresh failed' } }));
  }
  if (deleteOrganization && url.pathname === `/api/v1/organizations/${orgId}`) {
    if (req.method === 'DELETE') {
      actions.push('delete-organization');
      if (failOrganizationDelete) {
        failOrganizationDelete = false;
        res.writeHead(409);
        return res.end(JSON.stringify({ success: false, error: { message: 'Fixture organization still has another member' } }));
      }
      user.role = 'user'; user.orgId = null; user.hasCompletedOnboarding = true;
      res.writeHead(204); return res.end();
    }
    return send({ id: orgId, _id: orgId, name: 'Fixture organization', taxCode: '0101234567', address: 'Ha Noi' });
  }
  if (deleteOrganization && url.pathname === '/api/v1/contracts') {
    res.writeHead(200); return res.end(JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 10 } }));
  }
  if (deleteOrganization && url.pathname === '/api/v1/contract-profiles') return send([]);
  if (url.pathname === '/api/v1/plans') return send(personal ? [freePlan, plan] : [plan, proPlan]);
  if (url.pathname === '/api/v1/invitations/received') return send({ items: [], page: 1, pages: 1, total: 0 });
  if (url.pathname === '/api/v1/profile') return send({ user: { ...user, emailVerified: true, hasPassword: true }, organization: null });
  if (personal && url.pathname === '/api/v1/contracts' && req.method === 'POST') {
    assert.ok(raw.includes('hop-dong-ca-nhan.pdf'));
    personalContract = { _id: 'd'.repeat(24), orgId: user.id, title: 'hop-dong-ca-nhan', type: 'labor', ourParty: 'employee', status: 'uploaded', uploadedBy: user.id, updatedAt: new Date().toISOString(), currentVersion: { extractionStatus: 'processing', fileName: 'hop-dong-ca-nhan.pdf' }, classification: { status: 'pending' } };
    if (singleContract) Object.assign(personalContract, { reviewBilling: { versionId: 'e'.repeat(24), pageCount: 8, pagesPerUnit: 5, units: 2, ready: true, purchaseStatus: null }, currentVersion: { extractionStatus: 'completed', fileName: 'hop-dong-ca-nhan.pdf' }, classification: { status: 'completed', outcome: 'supported' } });
    actions.push('personal-upload'); return send(personalContract, 202);
  }
  if (personal && url.pathname === '/api/v1/contracts') {
    const rows = personalContract && !url.searchParams.has('status') && !url.searchParams.has('riskLevel') ? [personalContract] : [];
    res.writeHead(200); return res.end(JSON.stringify({ success: true, data: rows, meta: { total: rows.length, page: 1, limit: 10 } }));
  }
  if (personalContract && url.pathname === `/api/v1/contracts/${personalContract._id}`) return send(personalContract);
  if (personalContract && url.pathname === `/api/v1/contracts/${personalContract._id}/reviews`) return send([]);
  if (singleContract && personalContract && url.pathname === `/api/v1/contracts/${personalContract._id}/review-payment`) return send({ contractId: personalContract._id, versionId: 'e'.repeat(24), pageCount: 8, units: 2, unitPrice: 10000, amount: 20000, currency: 'VND', availableUnits: 1, canPurchase: !order?.fulfilledAt, purchaseStatus: personalContract.reviewBilling.purchaseStatus, openOrderCode: order && !order.fulfilledAt ? code : null });
  if (personal && url.pathname === '/api/v1/contract-profiles') return send([{ code: 'labor', name: 'Hợp đồng lao động', parties: [{ code: 'employee', name: 'Người lao động' }] }]);
  if (url.pathname === '/api/v1/auth/register') { actions.push('register'); return send(challenge, 202); }
  if (url.pathname === '/api/v1/auth/resend-verification') { actions.push('resend'); return send(challenge, 202); }
  if (url.pathname === '/api/v1/auth/verify-email') { assert.equal(body.code, '123456'); actions.push('verify'); return send(session); }
  if (['/api/v1/auth/login', '/api/v1/auth/google', '/api/v1/auth/refresh'].includes(url.pathname)) { actions.push(url.pathname.split('/').at(-1)); return send(session); }
  if (url.pathname === `/api/v1/organizations/${orgId}/subscription`) return send(subscription);
  const payments = `/api/v1/organizations/${orgId}/payments`;
  if (url.pathname === payments && req.method === 'GET') return send({ items: [...(order ? [order] : []), ...historicalOrders], page: 1, pageSize: 20 });
  if (url.pathname === payments && req.method === 'POST') {
    if (body.purpose === 'contract_review') {
      assert.equal(body.contractId, personalContract._id); assert.equal(body.versionId, 'e'.repeat(24)); assert.equal(body.expectedAmount, 20000);
      assert.ok(req.headers['idempotency-key']); actions.push('create-contract-review');
      order = { orderCode: code, orgId, purpose: 'contract_review', contractId: personalContract._id, versionId: body.versionId, pageCount: 8, reviewUnits: 2, action: 'purchase', amount: 20000, currency: 'VND', status: 'pending', checkoutUrl: 'https://pay.payos.vn/web/lawscan-fixture', expiresAt: new Date(Date.now() + 900000).toISOString(), paidAt: null, fulfilledAt: null };
      return send(order, 201);
    }
    assert.equal(body.planCode, plan.code); assert.equal(body.action, 'purchase');
    assert.ok(req.headers['idempotency-key']); assert.equal(req.headers.authorization, `Bearer ${token}`);
    actions.push('create');
    order = { orderCode: code, orgId, planCode: plan.code, action: 'purchase', amount: plan.price, currency: 'VND', status: 'pending',
      checkoutUrl: 'https://pay.payos.vn/web/lawscan-fixture', qrCode: 'fixture', expiresAt: new Date(Date.now() + 900000).toISOString(),
      paidAt: null, fulfilledAt: null, providerError: null, fulfillmentError: null };
    return send(order, 201);
  }
  if (url.pathname === `${payments}/${code}`) return send(order);
  if (url.pathname === `${payments}/${code}/sync`) { actions.push('sync'); return send(order); }
  if (url.pathname === `${payments}/${code}/cancel`) { actions.push('cancel'); order.status = 'cancelled'; return send(order); }
  res.writeHead(404); res.end(JSON.stringify({ success: false, error: { message: 'Fixture endpoint missing' } }));
});
const backendPort = await listen(backend), reserved = http.createServer(), port = await listen(reserved);
await new Promise(resolve => reserved.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const frontend = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  cwd: root, windowsHide: true, env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${backendPort}`, GOOGLE_CLIENT_ID: 'fixture-client', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = ''; frontend.stdout.on('data', chunk => { logs += chunk; }); frontend.stderr.on('data', chunk => { logs += chunk; });
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'lawscan-payment-ui-'));
let chrome, socket;
try {
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(`${origin}/api/plans`)).ok) break; } catch { /* fixture boot */ }
    await new Promise(resolve => setTimeout(resolve, 150));
    if (n === 99) throw new Error(logs);
  }
  chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${path.join(artifacts, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let debugPort;
  for (let n = 0; n < 100; n++) {
    try { debugPort = (await fs.readFile(path.join(artifacts, 'profile/DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(debugPort, 'Fixture Chrome did not start');
  const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  socket = new WebSocket(pages.find(p => p.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0; const pending = new Map();
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  const googleScript = `window.google={accounts:{id:{initialize:function(o){window.fixtureGoogle=o.callback},renderButton:function(el){var b=document.createElement('button');b.textContent='Google fixture';b.id='fixture-google';b.onclick=function(){window.fixtureGoogle({credential:'fixture-google-token'})};el.appendChild(b)}}}};`;
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) { const p = pending.get(message.id); pending.delete(message.id); clearTimeout(p.timer); if (message.error) p.reject(new Error(message.error.message)); else p.resolve(message.result); }
    if (message.method === 'Fetch.requestPaused') {
      const google = message.params.request.url.includes('accounts.google.com');
      void call('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: google ? 'application/javascript' : 'text/html' }], body: Buffer.from(google ? googleScript : '<h1>Isolated payOS checkout fixture</h1>').toString('base64') });
    }
    if (message.method === 'Page.javascriptDialogOpening') void call('Page.handleJavaScriptDialog', { accept: true });
  };
  const evaluate = async expression => {
    const r = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    assert.equal(r.exceptionDetails, undefined, JSON.stringify(r.exceptionDetails)); return r.result.value;
  };
  const waitFor = async expression => {
    for (let n = 0; n < 120; n++) { try { if (await evaluate(expression)) return; } catch { /* Navigation context changed. */ } await new Promise(resolve => setTimeout(resolve, 100)); }
    await shot('failure.png');
    throw new Error(`Timed out: ${expression}\nURL: ${await evaluate('location.href')}\nActions: ${JSON.stringify(actions)}\n${await evaluate('document.body.innerText')}\nScreenshots: ${artifacts}`);
  };
  const go = route => call('Page.navigate', { url: origin + route });
  const fill = async (selector, value) => { await evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`); await call('Input.insertText', { text: value }); };
  const shot = async name => { const image = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(artifacts, name), Buffer.from(image.data, 'base64')); };
  await call('Page.enable'); await call('Network.enable');
  await call('Fetch.enable', { patterns: [{ urlPattern: 'https://pay.payos.vn/*' }, { urlPattern: 'https://accounts.google.com/*' }] });
  await call('Emulation.setDeviceMetricsOverride', { width: 1280, height: 960, deviceScaleFactor: 1, mobile: false });

  if (createOrganization) {
    await call('Network.setCookie', { name: 'lawscan_refresh', value: token, url: origin });
    await go('/chon-to-chuc');
    await waitFor('[...document.querySelectorAll("button")].some(button => button.textContent.includes("Tạo tổ chức"))');
    await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.includes("Tạo tổ chức")).click()');
    await waitFor('(() => { if (document.querySelector("#organization-name")) return true; [...document.querySelectorAll("button")].find(button => button.textContent.includes("Tạo tổ chức"))?.click(); return false; })()');
    await waitFor('!!document.querySelector("#organization-name") && document.querySelectorAll("#organization-industry option").length === 2 && document.querySelectorAll("#organization-province option").length === 35');
    await evaluate('document.querySelector("form button[type=submit]").click()');
    await waitFor('!!document.querySelector("#organization-name-error")');
    assert.equal(actions.includes('create-organization'), false);
    await fill('#organization-name', '  Công ty Minh Tâm  ');
    await fill('#organization-tax-code', '  0312345678  ');
    const selectAddress = async (selector, value) => evaluate(`(() => {const element = document.querySelector(${JSON.stringify(selector)});Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(element, ${JSON.stringify(value)});element.dispatchEvent(new Event("change", { bubbles: true }));})()`);
    await selectAddress('#organization-province', '01');
    await waitFor('[...document.querySelector("#organization-ward").options].some(option => option.value === "00004")');
    await selectAddress('#organization-ward', '00004');
    await selectAddress('#organization-province', '79');
    await waitFor('document.querySelector("#organization-ward").value === "" && ![...document.querySelector("#organization-ward").options].some(option => option.value === "00004")');
    await selectAddress('#organization-province', '01');
    await waitFor('[...document.querySelector("#organization-ward").options].some(option => option.value === "00004")');
    await selectAddress('#organization-ward', '00004');
    await fill('#organization-address', '  12 Hoàng Hoa Thám  ');
    await evaluate('(() => { const select = document.querySelector("#organization-industry"); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value").set.call(select, "organization-create-fixture"); select.dispatchEvent(new Event("change", { bubbles: true })); })()');
    for (const width of [1440, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      await shot(`organization-create-${width}.png`);
    }
    await evaluate('document.querySelector("form button[type=submit]").click()');
    await waitFor('document.body.textContent.includes("Thiết lập đã được lưu")');
    assert.equal(await evaluate('document.querySelector("#organization-name").value.includes("Công ty Minh Tâm")'), true);
    assert.equal(actions.filter(action => action === 'create-organization').length, 1);
    await evaluate('document.querySelector("form button[type=submit]").click()');
    await waitFor('location.pathname === "/dashboard" && document.body.textContent.includes("Công ty Minh Tâm")');
    assert.equal(actions.filter(action => action === 'create-organization').length, 1);
    console.log('PASS full business creation: field validation, trimmed four-field payload, desktop/mobile and session retry without duplicate creation.');
  } else if (deleteOrganization) {
    await call('Network.setCookie', { name: 'lawscan_refresh', value: token, url: origin });
    await call('Network.setCookie', { name: 'lawscan_remember', value: '1', url: origin });
    await go('/settings');
    await waitFor('!!document.querySelector("#organization-delete-heading")');
    await evaluate('sessionStorage.setItem("lawscan_review_old-org", "old review")');
    await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.trim() === "Xóa tổ chức").click()');
    await waitFor('!!document.querySelector("[role=dialog]")');
    await evaluate('[...document.querySelectorAll("[role=dialog] button")].find(button => button.textContent.trim() === "Xóa tổ chức").click()');
    await waitFor('document.body.textContent.includes("Fixture organization still has another member")');
    assert.equal(await evaluate('location.pathname'), '/settings');
    let cookies = await call('Network.getCookies', { urls: [origin] });
    assert.equal(cookies.cookies.find(cookie => cookie.name === 'lawscan_refresh')?.value, token);
    await evaluate('[...document.querySelectorAll("[role=dialog] button")].find(button => button.textContent.trim() === "Xóa tổ chức").click()');
    await waitFor('location.pathname === "/review" && !!document.querySelector("input[type=file]")');
    cookies = await call('Network.getCookies', { urls: [origin] });
    assert.equal(cookies.cookies.find(cookie => cookie.name === 'lawscan_refresh')?.value, token);
    assert.equal(cookies.cookies.find(cookie => cookie.name === 'lawscan_remember')?.value, '1');
    assert.equal(await evaluate('sessionStorage.getItem("lawscan_review_old-org")'), null);
    assert.equal(await evaluate('document.body.textContent.includes("Fixture organization")'), false);
    assert.equal(actions.filter(action => action === 'delete-organization').length, 2);
    assert.equal(user.role, 'user');
    await shot('organization-deleted-personal-workspace.png');
    console.log('PASS organization deletion failure allows retry; success keeps refresh/remember cookies and opens the personal workspace without login or onboarding.');
    console.log(`Screenshots: ${artifacts}`);
  } else if (personal) {
    await call('Network.setCookie', { name: 'lawscan_refresh', value: token, url: origin });
    await go('/review');
    await waitFor('!!document.querySelector("input[type=file]")');
    const uploadPath = path.join(artifacts, 'hop-dong-ca-nhan.pdf');
    await fs.writeFile(uploadPath, '%PDF-1.4 fixture');
    const { root: documentRoot } = await call('DOM.getDocument');
    const { nodeId: fileInput } = await call('DOM.querySelector', { nodeId: documentRoot.nodeId, selector: 'input[type=file]' });
    await call('DOM.setFileInputFiles', { nodeId: fileInput, files: [uploadPath] });
    await waitFor('!!document.querySelector("[role=dialog]") && document.body.textContent.includes("hop-dong-ca-nhan")');
    assert.equal(actions.filter(action => action === 'personal-upload').length, 1);
    await shot('personal-upload-confirmation.png');
    if (singleContract) {
      await waitFor('document.body.textContent.includes("Thanh toán hợp đồng này") && [...document.querySelectorAll("button")].some(button => button.textContent === "Thanh toán 20.000đ")');
      for (const width of [1280, 390]) {
        await call('Emulation.setDeviceMetricsOverride', { width, height: 960, deviceScaleFactor: 1, mobile: width < 600 });
        assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
        await shot(`contract-review-quote-${width}.png`);
      }
      await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent === "Thanh toán 20.000đ").click()');
      await waitFor('location.hostname === "pay.payos.vn"');
      assert.equal(actions.filter(action => action === 'create-contract-review').length, 1);
      await go(`/thanh-toan/ket-qua?orderCode=${code}&status=PAID`);
      await waitFor('document.body.textContent.includes("Đang chờ xác nhận thanh toán")');
      assert.equal(await evaluate('document.body.textContent.includes("Thanh toán thành công")'), false);
      order.paidAt = new Date().toISOString(); order.fulfilledAt = new Date().toISOString(); order.status = 'paid';
      personalContract.reviewBilling.purchaseStatus = 'available';
      await go(`/thanh-toan/ket-qua?orderCode=${code}`);
      await waitFor('document.body.textContent.includes("Lượt trong gói được giữ nguyên")');
      await evaluate('[...document.querySelectorAll("a")].find(link => link.textContent === "Mở hợp đồng để rà soát").click()');
      await waitFor('document.body.textContent.includes("Phiên bản này đã thanh toán")');
      assert.equal(await evaluate('[...document.querySelectorAll("button")].find(button => button.textContent.includes("Bắt đầu rà soát")).disabled'), false);
      assert.equal(subscription.analysis.available, 1);
      await shot('contract-review-paid-ready.png');
      console.log('PASS per-contract quote, desktop/mobile, explicit checkout, verified payment return and paid review without spending Free quota.');
    } else {
    await evaluate('[...document.querySelectorAll("button")].find(button=>button.textContent==="Để sau").click()');
    await go('/contract');
    await waitFor('document.body.textContent.includes("hop-dong-ca-nhan")');
    await shot('personal-contract-list.png');
    console.log('PASS standalone user uploads a file and sees it in the contract list after navigation.');
    let accountPlanFeatures;
    for (const width of [1440, 390]) {
      await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
      await go('/subscription');
      await waitFor('document.body.textContent.includes("Gói dành cho cá nhân") && document.body.textContent.includes("Personal Free") && document.body.textContent.includes("Personal Pro")');
      await waitFor('document.body.textContent.includes("2/3")');
      assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
      assert.equal(await evaluate('document.body.textContent.includes("Business Starter")'), false);
      accountPlanFeatures = await evaluate('[...document.querySelectorAll("article[data-plan-code]")].map(card => ({ code: card.dataset.planCode, features: card.querySelector("ul").innerText }))');
      assert.equal(accountPlanFeatures.length, 2);
      await shot(`personal-subscription-${width}.png`);
      assert.equal(await evaluate('document.querySelector("[data-review-payment-card]").textContent.includes("10.000đ")'), true);
      assert.equal(await evaluate('document.querySelector("[data-review-payment-card]").textContent.includes("20.000đ")'), true);
      await evaluate('document.querySelector("[data-review-payment-card] a").click()');
      await waitFor('location.pathname === "/review" && !!document.querySelector("input[type=file]")');
      await go('/subscription');
      await waitFor('document.querySelectorAll("article[data-plan-code]").length === 2');
      await evaluate('[...document.querySelectorAll("a")].find(link => link.getAttribute("href") === "/" && link.getClientRects().length).click()');
      await waitFor('location.pathname === "/" && !!document.querySelector("#main-content")');
      const cookies = await call('Network.getCookies', { urls: [origin] });
      assert.equal(cookies.cookies.find(cookie => cookie.name === 'lawscan_refresh')?.value, token);
      await go('/subscription');
      await waitFor('document.body.textContent.includes("Personal Free") && document.querySelectorAll("article[data-plan-code]").length === 2');
    }
    console.log('PASS desktop/mobile home navigation preserves authentication and allows returning to the personal workspace.');
    await evaluate('[...document.querySelectorAll("a")].find(link => link.textContent === "Xem các gói").click()');
    await waitFor('location.pathname === "/goi-dich-vu" && document.querySelectorAll("article[data-plan-code]").length === 2');
    const catalogPlanFeatures = await evaluate('[...document.querySelectorAll("article[data-plan-code]")].map(card => ({ code: card.dataset.planCode, features: card.querySelector("ul").innerText }))');
    assert.deepEqual(catalogPlanFeatures, accountPlanFeatures);
    assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
    await shot('personal-catalog-matching-account.png');
    await waitFor('!!document.querySelector("article[data-plan-code=personal_free][data-plan-current=true]")');
    assert.equal(await evaluate('document.querySelectorAll("article[data-plan-current=true]").length'), 1);
    await evaluate('document.querySelector("article[data-plan-code=personal_free] a").click()');
    await waitFor('location.pathname === "/subscription" && !!document.querySelector("article[data-plan-code=personal_free][data-plan-current=true]")');
    await go('/dang-ky');
    await waitFor('location.pathname === "/review" && !!document.querySelector("input[type=file]")');
    const freeStartCookies = await call('Network.getCookies', { urls: [origin] });
    assert.equal(freeStartCookies.cookies.find(cookie => cookie.name === 'lawscan_refresh')?.value, token);
    console.log('PASS authenticated Free CTA returns to the workspace and preserves the session.');
    console.log('PASS account and public catalog share personal plan cards and benefits; account navigation selects the personal audience.');
    await go('/goi-dich-vu/xac-nhan?plan=personal_pro');
    await waitFor('!!document.querySelector("[data-checkout-submit]") && !document.querySelector("[data-checkout-submit]").disabled');
    await evaluate('document.querySelector("[data-checkout-submit]").click()');
    await waitFor('location.hostname === "pay.payos.vn"');
    assert.equal(actions.filter(action => action === 'create').length, 1);
    await go(`/thanh-toan/ket-qua?orderCode=${code}`);
    await waitFor('document.body.textContent.includes("Đang chờ xác nhận thanh toán")');
    assert.equal(await evaluate('document.body.textContent.includes("Đăng nhập để xem đơn thanh toán")'), false);
    order.status = 'paid'; order.paidAt = new Date().toISOString(); order.fulfilledAt = new Date().toISOString();
    subscription.plan = plan; subscription.analysis = { used: 0, reserved: 0, available: 30, limit: 30 };
    await go(`/thanh-toan/ket-qua?orderCode=${code}`);
    await waitFor('document.body.textContent.includes("Thanh toán thành công")');
    await go('/subscription');
    await waitFor('document.body.textContent.includes("30/30") && document.querySelectorAll("[data-order-status=paid]").length === 1');
    await shot('personal-pro-active.png');
    assert.equal(user.orgId, null);
    console.log('PASS personal Free/Pro dashboard, desktop/mobile, checkout and payment return without orgId.');
    await go('/goi-dich-vu?audience=personal');
    await waitFor('!!document.querySelector("article[data-plan-code=personal_pro][data-plan-current=true]")');
    assert.equal(await evaluate('document.querySelectorAll("article[data-plan-current=true]").length'), 1);
    assert.equal(await evaluate('document.querySelector("article[data-plan-code=personal_free]").dataset.planCurrent'), 'false');
    console.log('PASS public catalog marks only the active Free or Pro plan and opens subscription management.');
    await call('Network.clearBrowserCookies');
    await go('/goi-dich-vu?audience=personal');
    await waitFor('document.querySelectorAll("article[data-plan-code]").length === 2');
    assert.equal(await evaluate('document.querySelectorAll("article[data-plan-current=true]").length'), 0);
    await go('/dang-ky');
    await waitFor('location.pathname === "/dang-ky" && !!document.querySelector("#name") && !!document.querySelector("#email")');
    console.log('PASS anonymous visitors can still open the registration form.');
    }
  } else {
  const target = `/goi-dich-vu/xac-nhan?plan=${plan.code}`;
  await go(`/dang-nhap?returnTo=${encodeURIComponent(target)}`);
  await waitFor('!!document.querySelector("#fixture-google") && !!document.querySelector("#email")');
  await fill('#email', user.email); await fill('#password', 'FixturePassword123!');
  await evaluate('document.querySelector("form button[type=submit]").click()');
  await waitFor('location.pathname === "/goi-dich-vu/xac-nhan" && [...document.querySelectorAll("button")].some(b=>b.textContent.includes("Thanh toán 499"))');
  assert.ok(actions.includes('login')); console.log('PASS password login preserves checkout destination');
  await shot('checkout-desktop.png');

  await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Thanh toán 499")).click()');
  await waitFor('location.hostname === "pay.payos.vn"');
  assert.equal(actions.filter(a => a === 'create').length, 1);
  console.log('PASS checkout UI -> authenticated BFF -> fixture backend -> hosted checkout');

  await go(`/thanh-toan/ket-qua?orderCode=${code}&status=PAID&code=00`);
  await waitFor('document.body.textContent.includes("Đang chờ xác nhận thanh toán")');
  assert.equal(await evaluate('document.body.textContent.includes("Thanh toán thành công")'), false);
  order.status = 'paid'; order.paidAt = new Date().toISOString();
  await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Kiểm tra lại trạng thái")).click()');
  await waitFor('document.body.textContent.includes("Đã nhận tiền, đang hoàn tất kích hoạt")');
  assert.equal(await evaluate('document.body.textContent.includes("Thanh toán thành công")'), false);
  order.fulfilledAt = new Date().toISOString();
  await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent.includes("Kiểm tra lại trạng thái")).click()');
  await waitFor('document.body.textContent.includes("Thanh toán thành công")');
  await shot('payment-success-desktop.png');
  assert.equal(actions.filter(a => a === 'create').length, 1);
  console.log('PASS redirect spoofing rejected; paid/activation-pending/fulfilled states distinguished');

  order = { ...order, status: 'pending', paidAt: null, fulfilledAt: null };
  await go(`/thanh-toan/huy?orderCode=${code}&cancel=true&status=CANCELLED`);
  await waitFor('document.body.textContent.includes("Đang chờ xác nhận thanh toán")');
  assert.equal(actions.filter(a => a === 'cancel').length, 0);
  console.log('PASS cancel redirect alone never cancels or marks a stored order cancelled');

  await call('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await go(target); await waitFor('document.body.textContent.includes("chưa hoàn tất")');
  assert.equal(await evaluate('document.documentElement.scrollWidth <= innerWidth'), true);
  await shot('checkout-mobile.png');
  console.log('PASS mobile checkout and open-order recovery history');

  await call('Network.clearBrowserCookies');
  await go(`/dang-nhap?returnTo=${encodeURIComponent(target)}`);
  await waitFor('!!document.querySelector("#fixture-google")');
  await evaluate('document.querySelector("#fixture-google").click()');
  await waitFor('location.pathname === "/goi-dich-vu/xac-nhan" && document.body.textContent.includes("chưa hoàn tất")');
  assert.ok(actions.includes('google')); console.log('PASS Google callback and nonce proxy preserve checkout destination (mock Google)');

  await call('Network.clearBrowserCookies');
  await go(`/dang-ky?returnTo=${encodeURIComponent(target)}`);
  await waitFor('!!document.querySelector("#fixture-google") && !!document.querySelector("#name")');
  await fill('#name', 'Fixture Owner'); await fill('#email', user.email);
  await fill('#password', 'FixturePassword123!'); await fill('#confirmPassword', 'FixturePassword123!');
  await evaluate('document.querySelector("form button[type=submit]").click()');
  await waitFor('!!document.querySelector("#verification-code")');
  await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Gửi lại mã").click()');
  await waitFor('document.body.textContent.includes("Đã gửi mã mới")');
  await fill('#verification-code', '123456');
  await evaluate('document.querySelector("form button[type=submit]").click()');
  await waitFor('location.pathname === "/goi-dich-vu/xac-nhan" && document.body.textContent.includes("chưa hoàn tất")');
  for (const action of ['register', 'resend', 'verify']) assert.ok(actions.includes(action));
  console.log('PASS registration -> resend OTP -> verify OTP -> return to checkout (mock email)');
  await evaluate('[...document.querySelectorAll("button")].find(b=>b.textContent==="Hủy đơn").click()');
  await waitFor('!!document.querySelector("[data-order-status=cancelled]") && [...document.querySelectorAll("button")].some(b=>b.textContent.includes("Thanh toán 499"))');
  assert.equal(actions.filter(a => a === 'cancel').length, 1);
  assert.equal(actions.filter(a => a === 'create').length, 1);
  console.log('PASS explicit cancellation confirms, updates history and releases the checkout action');
  historicalOrders = [
    { ...order, orderCode: code + 1, planCode: 'business_pro', action: 'upgrade', amount: 999000, status: 'expired' },
    { ...order, orderCode: code + 2, status: 'paid', paidAt: new Date().toISOString(), fulfilledAt: new Date().toISOString() },
  ];
  order = null;
  subscription.status = 'active'; subscription.plan = plan;
  for (const width of [1440, 1024, 390, 320]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: width < 600 });
    await go('/goi-dich-vu/xac-nhan?plan=business_pro');
    await waitFor('document.querySelectorAll("[data-order-status]").length === 2 && !!document.querySelector("[data-checkout-submit]")');
    const layout = await evaluate(`(() => {
      const summary = document.querySelector('[data-checkout-summary]');
      const history = document.querySelector('[data-payment-history]');
      return { overflow: document.documentElement.scrollWidth > innerWidth, nested: summary.contains(history),
        below: history.getBoundingClientRect().top >= summary.getBoundingClientRect().bottom,
        historyWidth: history.getBoundingClientRect().width, summaryWidth: summary.getBoundingClientRect().width,
        pagination: !!document.querySelector('[aria-label="Phân trang thanh toán"]') };
    })()`);
    assert.equal(layout.overflow, false, `No horizontal overflow at ${width}px`);
    assert.equal(layout.nested, false, 'History must be separate from checkout summary');
    assert.equal(layout.below, true, 'History appears below the checkout area');
    assert.equal(layout.pagination, false, 'Two orders do not need disabled pagination');
    if (width === 1440) assert.ok(layout.historyWidth > layout.summaryWidth * 1.8);
    await shot(`upgrade-history-${width}.png`);
  }
  console.log('PASS upgrade layout with paid/expired history at 1440, 1024, 390 and 320px');
  }
  console.log(`Screenshots: ${artifacts}`);
} finally {
  socket?.close(); chrome?.kill(); frontend.kill(); backend.closeAllConnections(); backend.close();
}
