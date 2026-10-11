const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const artifacts = __dirname;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'lawscan-ui-'));
const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
let next;
let chrome;
let ws;
let nextLog = '';

const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const close = (server) => new Promise((resolve) => server.close(resolve));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const backend = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/api/v1/auth/refresh') {
    for await (const _ of req) {}
    const claims = Buffer.from(JSON.stringify({ sub: 'test-admin', role: 'administrator', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
    return res.end(JSON.stringify({ success: true, data: { accessToken: `test.${claims}.test`, refreshToken: 'administrator' } }));
  }
  if (req.url === '/api/v1/health') return res.end(JSON.stringify({ success: true, data: { status: 'ok' } }));
  if (req.url === '/api/v1/kb/legal-sources') return res.end(JSON.stringify({ success: true, data: [] }));
  res.writeHead(404);
  res.end('{}');
});

async function waitFor(check, label) {
  for (let i = 0; i < 100; i++) {
    const result = await Promise.resolve().then(check).catch(() => null);
    if (result) return result;
    await pause(200);
  }
  throw new Error(`Timeout: ${label}. ${nextLog.slice(-500)}`);
}

async function main() {
  const backendPort = await listen(backend);
  const reserve = http.createServer();
  const frontendPort = await listen(reserve);
  await close(reserve);
  const base = `http://127.0.0.1:${frontendPort}`;
  next = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(frontendPort)], {
    cwd: root,
    windowsHide: true,
    env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${backendPort}`, NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  next.stdout.on('data', (chunk) => nextLog += chunk);
  next.stderr.on('data', (chunk) => nextLog += chunk);
  await waitFor(async () => (await fetch(`${base}/dang-nhap`)).ok, 'Next server');
  chrome = spawn(chromePath, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--no-sandbox', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
  ], { windowsHide: true, stdio: 'ignore' });
  const activePort = await waitFor(() => {
    const p = path.join(profile, 'DevToolsActivePort');
    return fs.existsSync(p) && fs.readFileSync(p, 'utf8').split('\n')[0];
  }, 'Chrome DevTools');
  const tabs = await (await fetch(`http://127.0.0.1:${activePort}/json/list`)).json();
  ws = new WebSocket(tabs.find((tab) => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { ws.addEventListener('open', resolve, { once: true }); ws.addEventListener('error', reject, { once: true }); });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    message.error ? reject(new Error(message.error.message)) : resolve(message.result);
  });
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const callId = ++id;
    pending.set(callId, { resolve, reject });
    ws.send(JSON.stringify({ id: callId, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
  };
  const navigate = async (url) => {
    await send('Page.navigate', { url });
    try {
      await waitFor(() => evaluate('document.readyState === "complete" && !!document.querySelector("#admin-content")'), url);
    } catch (error) {
      const state = await evaluate('({ url: location.href, text: document.body?.innerText?.slice(0, 700), ready: document.readyState })');
      throw new Error(`${error.message} Browser: ${JSON.stringify(state)}`);
    }
    await pause(850);
  };
  await send('Page.enable');
  await send('Network.enable');
  const user = Buffer.from(JSON.stringify({ id: 'test-admin', name: 'Test administrator', email: 'test@example.invalid', role: 'administrator', orgId: null, hasCompletedOnboarding: false })).toString('base64url');
  console.log('set refresh cookie', await send('Network.setCookie', { name: 'lawscan_refresh', value: 'administrator', url: base }));
  console.log('set user cookie', await send('Network.setCookie', { name: 'lawscan_user', value: user, url: base }));
  console.log('cookies', await send('Network.getCookies', { urls: [base] }));
  const results = [];
  for (const [label, width, height] of [['desktop', 1440, 900], ['mobile', 390, 844]]) {
    await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: label === 'mobile' });
    await navigate(`${base}/dashboard/admin`);
    const data = await evaluate(`(() => ({ title: document.title, viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, headings: [...document.querySelectorAll('h1,h2')].map(x => x.textContent.trim()), buttons: [...document.querySelectorAll('button')].filter(x => /vẽ lại/i.test(x.textContent)).length, chartCount: document.querySelectorAll('[aria-labelledby="admin-charts-title"] article').length, bodyLength: document.body.scrollHeight }))()`);
    results.push({ label, ...data });
    const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    fs.writeFileSync(path.join(artifacts, `admin-${label}.png`), Buffer.from(image.data, 'base64'));
    if (label === 'mobile') {
      await evaluate(`[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Mở menu quản trị')?.click()`);
      await pause(200);
      results.push({ label: 'mobile-menu', ...(await evaluate(`(() => { const menu = document.querySelector('#admin-mobile-menu'); return { visible: !!menu && !menu.hidden, links: menu?.querySelectorAll('a').length, scrollWidth: document.documentElement.scrollWidth }; })()`)) });
      const menuImage = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      fs.writeFileSync(path.join(artifacts, 'admin-mobile-menu.png'), Buffer.from(menuImage.data, 'base64'));
      await evaluate(`[...document.querySelectorAll('button')].find(x => x.getAttribute('aria-label') === 'Đóng menu quản trị')?.click()`);
      await navigate(`${base}/dashboard/admin/reports`);
      results.push({ label: 'mobile-reports', ...(await evaluate(`(() => ({ scrollWidth: document.documentElement.scrollWidth, viewport: innerWidth, filters: [...document.querySelectorAll('select')].map(x => x.value), csvButton: [...document.querySelectorAll('button')].some(x => x.textContent.includes('Tải CSV mẫu')) }))()`)) });
    }
  }
  await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false });
  await navigate(`${base}/dashboard/admin/organizations`);
  await evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Xem chi tiết')?.click()`);
  await pause(350);
  const popup = await evaluate(`(() => { const x = document.querySelector('[role="dialog"]'); if (!x) return { found: false }; const r = x.getBoundingClientRect(); return { found: true, centerX: r.x + r.width/2, viewportCenterX: innerWidth/2, width: r.width, height: r.height, viewportHeight: innerHeight }; })()`);
  results.push({ label: 'popup', ...popup });
  const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  fs.writeFileSync(path.join(artifacts, 'admin-popup.png'), Buffer.from(image.data, 'base64'));
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  results.push({ label: 'popup-tab', ...(await evaluate(`(() => ({ focusInDialog: !!document.querySelector('[role="dialog"]')?.contains(document.activeElement), focusedText: document.activeElement?.textContent?.trim().slice(0, 60) }))()`)) });
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await pause(150);
  results.push({ label: 'popup-escape', closed: await evaluate('!document.querySelector("[role=dialog]")') });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await navigate(`${base}/dashboard/admin/organizations`);
  await evaluate(`[...document.querySelectorAll('button')].find(x => x.textContent.trim() === 'Xem chi tiết')?.click()`);
  await pause(150);
  results.push({ label: 'mobile-popup', ...(await evaluate(`(() => { const x = document.querySelector('[role="dialog"]'); if (!x) return { found: false }; const r = x.getBoundingClientRect(); return { found: true, left: r.left, right: r.right, viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth, height: r.height }; })()`)) });
  fs.writeFileSync(path.join(artifacts, 'results.json'), JSON.stringify(results, null, 2));
  process.stdout.write(JSON.stringify(results, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (ws) ws.close();
  if (chrome) chrome.kill();
  if (next) next.kill();
  await close(backend).catch(() => {});
});
