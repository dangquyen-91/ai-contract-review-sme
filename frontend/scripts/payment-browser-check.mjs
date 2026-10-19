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
const orgId = 'a'.repeat(24), code = 1234567890123;
const user = { id: 'b'.repeat(24), orgId, role: 'owner', name: 'Fixture Owner', email: 'owner@example.com', hasCompletedOnboarding: true };
const plan = { code: 'business_starter', name: 'Business Starter', audience: 'business', price: 499000, currency: 'VND', analysisLimit: 200, chatLimit: 500, memberLimit: 5 };
const proPlan = { ...plan, code: 'business_pro', name: 'Business Pro', price: 999000, analysisLimit: 600, chatLimit: 1500, memberLimit: 15 };
const subscription = { status: 'none', plan: null, startsAt: null, endsAt: null, scheduledDowngrade: null, members: { count: 1, pending: 0, available: 2, limit: 3 }, analysis: { used: 0, reserved: 0, available: 0, limit: 0 }, chat: { used: 0, reserved: 0, available: 0, limit: 0 } };
let order = null;
let historicalOrders = [];
const actions = [];
const token = `fixture.${Buffer.from(JSON.stringify({ sub: user.id, orgId, role: 'owner', exp: Math.floor(Date.now() / 1000) + 604800 })).toString('base64url')}.fixture`;
const session = { user, accessToken: token, refreshToken: token };
const challenge = { verificationRequired: true, challengeId: 'c'.repeat(64), email: user.email, expiresAt: new Date(Date.now() + 600000).toISOString(), resendAfterSeconds: 0 };
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const backend = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString(), body = raw ? JSON.parse(raw) : {};
  const url = new URL(req.url, 'http://fixture');
  res.setHeader('Content-Type', 'application/json');
  const send = (data, status = 200) => { res.writeHead(status); res.end(JSON.stringify({ success: true, data })); };
  if (url.pathname === '/api/v1/plans') return send([plan, proPlan]);
  if (url.pathname === '/api/v1/auth/register') { actions.push('register'); return send(challenge, 202); }
  if (url.pathname === '/api/v1/auth/resend-verification') { actions.push('resend'); return send(challenge, 202); }
  if (url.pathname === '/api/v1/auth/verify-email') { assert.equal(body.code, '123456'); actions.push('verify'); return send(session); }
  if (['/api/v1/auth/login', '/api/v1/auth/google', '/api/v1/auth/refresh'].includes(url.pathname)) { actions.push(url.pathname.split('/').at(-1)); return send(session); }
  if (url.pathname === `/api/v1/organizations/${orgId}/subscription`) return send(subscription);
  const payments = `/api/v1/organizations/${orgId}/payments`;
  if (url.pathname === payments && req.method === 'GET') return send({ items: [...(order ? [order] : []), ...historicalOrders], page: 1, pageSize: 20 });
  if (url.pathname === payments && req.method === 'POST') {
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
  console.log(`Screenshots: ${artifacts}`);
} finally {
  socket?.close(); chrome?.kill(); frontend.kill(); backend.closeAllConnections(); backend.close();
}
