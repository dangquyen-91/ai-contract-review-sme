// Isolated browser check: fixture backend only; no MongoDB, email or Cloudinary writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jhWQAAAAASUVORK5CYII=';
const profile = { user: { id: 'a'.repeat(24), name: 'Profile Fixture', email: 'profile@example.com', phone: '', role: 'user', orgId: null,
  hasCompletedOnboarding: true, emailVerified: true, hasPassword: true, googleLinked: false, avatarUrl: null, createdAt: '2026-10-01T00:00:00Z' }, organization: null };
const token = `fixture.${Buffer.from(JSON.stringify({ sub: profile.user.id, role: 'user', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}.fixture`;
let uploads = 0, updates = 0, passwordChanged = false;
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const backend = http.createServer(async (req, res) => {
  const chunks = []; for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString();
  const url = new URL(req.url, 'http://fixture');
  const send = (data, status = 200) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: true, data })); };
  if (url.pathname === '/api/v1/auth/refresh') return send({ user: profile.user, accessToken: token, refreshToken: token });
  if (url.pathname === '/api/v1/profile' && req.method === 'GET') return send(profile);
  if (url.pathname === '/api/v1/profile' && req.method === 'PATCH') {
    const body = JSON.parse(raw); assert.deepEqual(Object.keys(body).sort(), ['name', 'phone']);
    Object.assign(profile.user, body); updates++; return send(profile);
  }
  if (url.pathname === '/api/v1/profile/avatar' && req.method === 'POST') {
    assert.ok(raw.includes('name="avatar"')); uploads++;
    profile.user.avatarUrl = 'https://res.cloudinary.com/profile-fixture/image/upload/avatar.webp'; return send(profile);
  }
  if (url.pathname === '/api/v1/profile/password') {
    const body = JSON.parse(raw);
    if (body.currentPassword !== 'CurrentPassword123!') {
      res.writeHead(400, { 'Content-Type': 'application/json' }); return res.end(JSON.stringify({ success: false, error: { message: 'Mật khẩu hiện tại chưa đúng.' } }));
    }
    assert.equal(body.newPassword, 'NewPassword456!'); passwordChanged = true; return send({ changed: true });
  }
  if (url.pathname === '/api/v1/invitations/received') return send([{ id: 'c'.repeat(24), organizationName: 'Fixture Company', role: 'staff', expiresAt: '2099-10-27T00:00:00Z' }]);
  res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ success: false }));
});
const backendPort = await listen(backend), reserved = http.createServer(), port = await listen(reserved);
await new Promise(resolve => reserved.close(resolve));
const origin = `http://127.0.0.1:${port}`;
const frontend = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], {
  cwd: root, windowsHide: true, env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${backendPort}`, GOOGLE_CLIENT_ID: '', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'],
});
let logs = ''; frontend.stdout.on('data', chunk => { logs += chunk; }); frontend.stderr.on('data', chunk => { logs += chunk; });
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), 'lawscan-profile-ui-'));
let chrome, socket;
try {
  for (let n = 0; n < 100; n++) {
    try { if ((await fetch(`${origin}/dang-nhap`)).ok) break; } catch { /* Wait for isolated Next server. */ }
    if (n === 99) throw new Error(logs);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${path.join(artifacts, 'browser')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let debugPort;
  for (let n = 0; n < 100; n++) {
    try { debugPort = (await fs.readFile(path.join(artifacts, 'browser/DevToolsActivePort'), 'utf8')).split('\n')[0]; break; } catch { await new Promise(resolve => setTimeout(resolve, 100)); }
  }
  assert.ok(debugPort, 'Chrome did not start');
  const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`)).json();
  socket = new WebSocket(pages.find(page => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let seq = 0; const pending = new Map();
  const call = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++seq, timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
  socket.onmessage = ({ data }) => {
    const message = JSON.parse(data);
    if (pending.has(message.id)) {
      const entry = pending.get(message.id); pending.delete(message.id); clearTimeout(entry.timer);
      if (message.error) entry.reject(new Error(message.error.message)); else entry.resolve(message.result);
    }
    if (message.method === 'Fetch.requestPaused') void call('Fetch.fulfillRequest', { requestId: message.params.requestId, responseCode: 200, responseHeaders: [{ name: 'Content-Type', value: 'image/png' }], body: png });
  };
  const evaluate = async expression => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails)); return result.result.value;
  };
  const shot = async name => { const result = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }); await fs.writeFile(path.join(artifacts, name), Buffer.from(result.data, 'base64')); };
  const waitFor = async expression => {
    for (let n = 0; n < 150; n++) { try { if (await evaluate(expression)) return; } catch { /* Navigation in progress. */ } await new Promise(resolve => setTimeout(resolve, 100)); }
    await shot('failure.png'); throw new Error(`Timed out: ${expression}\n${await evaluate('document.body.innerText')}\nScreenshots: ${artifacts}`);
  };
  const fill = (selector, value) => evaluate(`(() => { const input=document.querySelector(${JSON.stringify(selector)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,${JSON.stringify(value)}); input.dispatchEvent(new Event('input',{bubbles:true})); input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await call('Page.enable'); await call('Network.enable');
  await call('Fetch.enable', { patterns: [{ urlPattern: 'https://res.cloudinary.com/profile-fixture/*' }] });
  for (const [name, value] of Object.entries({ lawscan_access: token, lawscan_refresh: token, lawscan_user: Buffer.from(JSON.stringify(profile.user)).toString('base64url') })) await call('Network.setCookie', { name, value, url: origin, httpOnly: true, sameSite: 'Lax' });
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await call('Page.navigate', { url: `${origin}/ho-so` });
  await waitFor('!!document.querySelector("#profile-name") && !!document.querySelector("#profile-current-password")');
  await waitFor('document.body.innerText.includes("Fixture Company")');
  assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false);
  await shot('profile-desktop.png');
  await fill('#profile-name', 'Updated Profile'); await fill('#profile-phone', '0901234567');
  await evaluate('document.querySelector("#profile-name").closest("form").requestSubmit()');
  await waitFor('document.querySelector("#profile-name")?.value === "Updated Profile" && document.querySelector("aside")?.innerText.includes("Updated Profile")');
  assert.equal(updates, 1);
  await evaluate(`(() => { const input=document.querySelector('input[type=file]'); const bytes=Uint8Array.from(atob(${JSON.stringify(png)}), c=>c.charCodeAt(0)); const transfer=new DataTransfer(); transfer.items.add(new File([bytes],'avatar.png',{type:'image/png'})); input.files=transfer.files; input.dispatchEvent(new Event('change',{bubbles:true})); })()`);
  await waitFor('Array.from(document.querySelectorAll("button")).some(button => button.textContent === "Lưu ảnh")');
  await evaluate('Array.from(document.querySelectorAll("button")).find(button => button.textContent === "Lưu ảnh").click()');
  await waitFor('!!document.querySelector("header img[src*=cloudinary]") && !!document.querySelector("aside img[src*=cloudinary]")');
  assert.equal(uploads, 1);
  for (const width of [390, 320]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: true });
    assert.equal(await evaluate('document.documentElement.scrollWidth > innerWidth'), false, `No overflow at ${width}px`);
    await shot(`profile-${width}.png`);
  }
  await call('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await evaluate(`document.querySelector('[aria-label="Mở menu tài khoản"]').focus()`);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await call('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
  await waitFor('!!document.querySelector("[role=menu]")');
  assert.equal(await evaluate('document.querySelector("[role=menu]").innerText.includes("Hồ sơ cá nhân")'), true);
  await call('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await evaluate('document.querySelector("#profile-section-security").click()');
  await waitFor('document.querySelector("#profile-current-password")?.checkVisibility()');
  await shot('profile-security.png');
  await fill('#profile-current-password', 'WrongPassword123!'); await fill('#profile-new-password', 'NewPassword456!'); await fill('#profile-confirm-password', 'NewPassword456!');
  await evaluate('document.querySelector("#profile-current-password").closest("form").requestSubmit()');
  await waitFor('document.body.innerText.includes("Mật khẩu hiện tại chưa đúng.")');
  await fill('#profile-current-password', 'CurrentPassword123!');
  await evaluate('document.querySelector("#profile-current-password").closest("form").requestSubmit()');
  await waitFor('location.pathname === "/dang-nhap"');
  assert.equal(passwordChanged, true);
  console.log('PASS profile: no-org account, invitations, name/phone save, header/sidebar avatar, menu, password failure/success, desktop/mobile layouts');
  console.log(`Screenshots: ${artifacts}`);
} finally {
  socket?.close(); chrome?.kill(); frontend.kill(); backend.closeAllConnections(); backend.close();
}
