// Run after build. Starts isolated API/frontend fixtures and checks the real pricing pages in Chrome.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const backendSource = await fs.readFile(new URL('../../backend/src/services/billing/subscription.service.ts', import.meta.url), 'utf8');
const plans = new Function(`return (${backendSource.match(/export const DEFAULT_PLANS = ([\s\S]*?) as const;/)[1]});`)();
let plansAvailable = true;
const listen = (server) => new Promise((resolve) => server.listen(0, '127.0.0.1', () => resolve(server.address().port)));
const backend = http.createServer((req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/api/v1/plans') {
    res.writeHead(plansAvailable ? 200 : 503);
    res.end(JSON.stringify(plansAvailable ? { success: true, data: plans } : { success: false, error: { message: 'Không thể tải gói dịch vụ.' } }));
  } else { res.writeHead(404); res.end('{}'); }
});
const backendPort = await listen(backend);
const reserve = http.createServer();
const port = await listen(reserve); await new Promise((resolve) => reserve.close(resolve));
const frontend = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-p', String(port)], { cwd: root, windowsHide: true, env: { ...process.env, API_BASE_URL: `http://127.0.0.1:${backendPort}`, NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
let log = ''; frontend.stdout.on('data', (chunk) => { log += chunk; }); frontend.stderr.on('data', (chunk) => { log += chunk; });
const artifactDir = await fs.mkdtemp(path.join(os.tmpdir(), 'subscription-ui-'));
let chrome, socket;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { ready = (await fetch(`http://127.0.0.1:${port}/api/plans`, { signal: AbortSignal.timeout(1000) })).ok; if (ready) break; }
    catch { /* Wait for the isolated frontend. */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, log);
  chrome = spawn(process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', ['--headless=new', '--no-sandbox', '--disable-gpu', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${path.join(artifactDir, 'profile')}`, 'about:blank'], { windowsHide: true, stdio: 'ignore' });
  let debugPort;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { debugPort = (await fs.readFile(path.join(artifactDir, 'profile/DevToolsActivePort'), 'utf8')).split('\n')[0]; break; }
    catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  assert.ok(debugPort, 'Chrome did not start');
  const pages = await (await fetch(`http://127.0.0.1:${debugPort}/json`, { signal: AbortSignal.timeout(5000) })).json();
  socket = new WebSocket(pages.find((page) => page.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let sequence = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const response = JSON.parse(data);
    if (pending.has(response.id)) { const item = pending.get(response.id); pending.delete(response.id); clearTimeout(item.timer); if (response.error) item.reject(new Error(response.error.message)); else item.resolve(response.result); }
  };
  const call = (method, params = {}) => new Promise((resolve, reject) => { const id = ++sequence; const timer = setTimeout(() => { pending.delete(id); reject(new Error(`Chrome timed out: ${method}`)); }, 10000); pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => {
    const result = await call('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true, userGesture: true });
    assert.equal(result.exceptionDetails, undefined, JSON.stringify(result.exceptionDetails));
    return result.result.value;
  };
  const waitFor = async (expression) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      if (await evaluate(expression)) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error(`Timed out waiting for ${expression}`);
  };
  await call('Page.enable');
  for (const width of [1440, 1024, 820, 390, 320]) {
    await call('Emulation.setDeviceMetricsOverride', { width, height: 1000, deviceScaleFactor: 1, mobile: false });
    await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
    for (const route of ['/', '/goi-dich-vu']) {
      await call('Page.navigate', { url: `http://127.0.0.1:${port}${route}` });
      await waitFor('document.querySelectorAll("[data-plan-code]").length === 2');
      if (route === '/') {
        await evaluate('document.fonts.ready');
        const hero = await evaluate(`(() => {
          const heading = document.querySelector('#hero-heading');
          const section = heading.closest('section');
          const figure = section.querySelector('[data-hero-contract]');
          const r = figure.getBoundingClientRect();
          return { text: heading.textContent, figure: {left:r.left,right:r.right,height:r.height}, viewport:innerWidth,
            primary: section.querySelector('a[href="/dashboard"]')?.textContent,
            sample: section.querySelector('a[href="/bao-cao-mau"]')?.textContent,
            height: section.getBoundingClientRect().bottom + scrollY };
        })()`);
        assert.match(hero.text, /Nhìn rõ rủi ro\./); assert.match(hero.text, /Trước khi bạn ký\./);
        const typography = await evaluate(`(() => {
          const heading = document.querySelector('#hero-heading');
          const family = getComputedStyle(heading).fontFamily;
          return { family, loaded:document.fonts.check('700 32px '+family.split(',')[0], 'Nhìn rõ rủi ro'),
            accent:getComputedStyle(heading.querySelector('em')).fontFamily,
            button:getComputedStyle(heading.closest('section').querySelector('a[href="/dashboard"]')).fontFamily,
            navigation:getComputedStyle(document.querySelector('nav[aria-label="Điều hướng chính"]')).fontFamily };
        })()`);
        for (const family of [typography.family, typography.button, typography.navigation]) {
          assert.ok(family.replace(/[ _]/g, '').toLowerCase().includes('bevietnampro'), 'Marketing titles, buttons and navigation use Be Vietnam Pro');
        }
        assert.ok(typography.loaded, 'Vietnamese font subset is loaded');
        assert.match(typography.accent, /Lora/i, 'Slogan accent preserves Lora');
        assert.match(hero.primary, /Bắt đầu rà soát/); assert.match(hero.sample, /Xem báo cáo mẫu/);
        assert.ok(hero.figure.left >= 0 && hero.figure.right <= hero.viewport, 'Original contract illustration stays inside the viewport');
        if (width <= 600) assert.ok(hero.figure.height <= 400, 'Mobile contract uses its compact breakpoint instead of tablet sizing');
        const appearance = await evaluate(`(() => {
          const stage = getComputedStyle(document.querySelector('[data-hero-contract]'));
          const heading = document.querySelector('#hero-heading');
          return { border: stage.borderTopWidth, background: stage.backgroundImage, shadow: stage.boxShadow,
            lines: [...heading.children].map(line => getComputedStyle(line).animationName),
            accentAnimation: getComputedStyle(heading.querySelector('em')).animationName,
            accentColor: getComputedStyle(heading.querySelector('em')).color };
        })()`);
        assert.equal(appearance.border, '0px'); assert.equal(appearance.background, 'none'); assert.equal(appearance.shadow, 'none');
        assert.ok(appearance.lines.every(name => name === 'none'), 'Reduced-motion keeps slogan lines static');
        assert.equal(appearance.accentAnimation, 'none');
        assert.equal(appearance.accentColor, 'rgb(40, 100, 220)', 'Static accent stays readable without a gradient');
        if (width === 1440) {
          await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
          const motion = await evaluate(`(() => {
            const heading = document.querySelector('#hero-heading');
            const accent = heading.querySelector('em');
            return {lines:[...heading.children].map(line=>getComputedStyle(line).animationName), sweep:getComputedStyle(accent).animationName,
              duration:getComputedStyle(accent).animationDuration, underline:getComputedStyle(accent,'::after').animationName};
          })()`);
          assert.ok(motion.lines.every(name => name !== 'none'), 'Both slogan lines have entrance animations');
          assert.notEqual(motion.sweep, 'none'); assert.equal(motion.duration, '9s'); assert.notEqual(motion.underline, 'none');
          await waitFor(`getComputedStyle(document.querySelector('#hero-heading').children[1]).opacity === '1'`);
          await call('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }, { name: 'prefers-reduced-motion', value: 'reduce' }] });
        }
        await evaluate(`document.querySelector('[aria-label="Chọn điều khoản minh họa"] button:nth-child(2)').click()`);
        assert.match(await evaluate('document.querySelector("#clause-preview").textContent'), /Tiêu chí chưa rõ ràng/);
        await evaluate(`document.querySelector('[aria-label="Chọn điều khoản minh họa"] button:first-child').click()`);
        if (width < 1024) {
          await evaluate(`document.querySelector('button[aria-controls="mobile-navigation"]').click()`);
          assert.equal(await evaluate('document.querySelector("#mobile-navigation").hidden'), false);
          await evaluate(`document.querySelector('button[aria-controls="mobile-navigation"]').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true}))`);
          assert.equal(await evaluate('document.querySelector("#mobile-navigation").hidden'), true);
        }
        const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x:0,y:0,width,height:Math.ceil(hero.height),scale:1 } });
        await fs.writeFile(path.join(artifactDir, `hero-${width}.png`), Buffer.from(shot.data, 'base64'));
        console.log(`PASS hero ${width}px: slogan, contract illustration, actions and mobile navigation`);
      }
      for (const audience of ['business', 'personal']) {
        await evaluate(`document.querySelector('input[value="${audience}"]').click()`);
        await waitFor(`!!document.querySelector('[data-plan-code="${audience === 'business' ? 'business_starter' : 'personal_free'}"]')`);
        const selector = route === '/' ? '#goi-dich-vu' : '#subscription-content';
        await evaluate(`document.querySelector('${selector}').scrollIntoView({block:'start',behavior:'instant'})`);
        await new Promise((resolve) => setTimeout(resolve, 350));
        const result = await evaluate(`(() => {
          const rect = node => { const r=node.getBoundingClientRect(); return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}; };
          const cards=[...document.querySelectorAll('[data-plan-code]')];
          return {width:document.documentElement.scrollWidth, viewport:innerWidth, text:document.querySelector('${selector}').textContent,
            cards:cards.map(card=>({code:card.dataset.planCode,rect:rect(card),heading:rect(card.querySelector('h3')),button:rect(card.querySelector('button,a')),color:getComputedStyle(card).color,border:getComputedStyle(card).borderRadius}))};
        })()`);
        assert.ok(result.width <= result.viewport, `${route}/${width}: page overflow`);
        assert.ok(!result.text.includes('299.000') && !result.text.includes('799.000') && !result.text.includes('Hàng năm'));
        for (const plan of plans.filter((item) => item.audience === audience)) {
          assert.ok(result.text.includes(plan.name));
          assert.ok(result.text.includes(plan.price.toLocaleString('vi-VN')));
          assert.ok(result.text.includes(`${plan.analysisLimit.toLocaleString('vi-VN')} lượt phân tích`));
          assert.ok(result.text.includes(`${plan.chatLimit.toLocaleString('vi-VN')} lượt chat`));
        }
        for (const card of result.cards) {
          assert.equal(card.border, '28px', 'Homepage and catalog use the same modern cards');
          assert.equal(card.color, 'rgb(8, 14, 47)', 'Plan text remains dark on light cards');
          assert.ok(card.heading.right <= card.rect.right && card.button.right <= card.rect.right && card.button.left >= card.rect.left, 'Card text and actions fit');
        }
        if (Math.abs(result.cards[0].rect.top - result.cards[1].rect.top) < 2) {
          assert.ok(Math.abs(result.cards[0].button.top - result.cards[1].button.top) < 2, 'Catalog actions line up across the two plans');
          assert.ok(Math.abs(result.cards[0].rect.bottom - result.cards[1].rect.bottom) < 2, 'Catalog cards have equal heights');
        }
        const clip = await evaluate(`(() => {const r=document.querySelector('${selector}').getBoundingClientRect();return {x:r.left+scrollX,y:r.top+scrollY,width:r.width,height:r.height,scale:1};})()`);
        const shot = await call('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip });
        await fs.writeFile(path.join(artifactDir, `${route === '/' ? 'homepage' : 'catalog'}-${audience}-${width}.png`), Buffer.from(shot.data, 'base64'));
        console.log(`PASS ${route} ${audience} ${width}px: live prices, quotas and layout`);
      }
    }
  }
  await evaluate(`document.querySelector('[data-plan-code="personal_pro"] button').click()`);
  await waitFor('!!document.querySelector("[role=dialog]")');
  assert.match(await evaluate('document.querySelector("[role=dialog]").textContent'), /200 lượt chat/);
  const href = await evaluate('document.querySelector("[role=dialog] a").getAttribute("href")');
  await call('Page.navigate', { url: `http://127.0.0.1:${port}${href}` });
  await waitFor('document.body.textContent.includes("99.000")');
  assert.ok(!(await evaluate('document.body.textContent')).includes('Doanh nghiệp mẫu'));
  plansAvailable = false;
  await call('Page.navigate', { url: `http://127.0.0.1:${port}/goi-dich-vu` });
  await waitFor('!!document.querySelector("[role=alert]")');
  assert.equal(await evaluate('document.querySelectorAll("[data-plan-code]").length'), 0);
  console.log('PASS public plan API, selection dialog, confirmation, and unavailable API state');
  console.log(`Screenshots: ${artifactDir}`);
} finally {
  socket?.close(); chrome?.kill(); frontend.kill(); backend.closeAllConnections(); backend.close();
}
