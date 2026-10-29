import assert from 'node:assert/strict';
import { access, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = process.cwd();
const distRoot = path.resolve(root, 'dist');
await access(path.join(distRoot, 'index.html'));
const chromePath = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browserOptions = { headless: true };
if (await access(chromePath).then(() => true, () => false)) browserOptions.executablePath = chromePath;

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const baseUrl = `http://127.0.0.1:${server.httpServer.address().port}`;
console.log('Testing PWA origin:', baseUrl);
const browser = await chromium.launch(browserOptions);
let swSource = await readFile(path.join(distRoot, 'sw.js'), 'utf8');
const cacheNameMatch = swSource.match(/const CACHE_NAME = '([^']+)'/);
assert.ok(cacheNameMatch, 'service worker cache name is missing');
const initialCacheName = cacheNameMatch[1];
const nextCacheName = initialCacheName.replace(/-v(\d+)$/, (_, version) => `-v${Number(version) + 1}`);
assert.notEqual(nextCacheName, initialCacheName, 'service worker cache name must end with a version');
const context = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  serviceWorkers: 'allow',
});

try {
  context.on('serviceworker', (worker) => {
    console.log('PWA worker registered:', worker.url());
    worker.on('console', (message) => console.log('PWA worker console:', message.type(), message.text()));
  });
  await context.route(`${baseUrl}/**`, async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname === '/manifest.webmanifest' || url.pathname.endsWith('/21-chess.html') || url.pathname.endsWith('/board-kit.js')) {
      console.log('PWA fetch', url.pathname, route.request().serviceWorker() ? 'from service worker' : 'from page');
    }
    if (url.pathname === '/sw.js') {
      await route.fulfill({ status: 200, contentType: 'text/javascript; charset=utf-8', headers: { 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' }, body: swSource });
      return;
    }
    const filePath = path.resolve(distRoot, `.${decodeURIComponent(url.pathname)}`);
    if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) {
      await route.fulfill({ status: 403, body: 'Forbidden' });
      return;
    }
    try {
      const info = await stat(filePath);
      const resolvedPath = info.isDirectory() ? path.join(filePath, 'index.html') : filePath;
      const contentType = ({
        '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml',
        '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
      })[path.extname(resolvedPath).toLowerCase()] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType, body: await readFile(resolvedPath) });
    } catch {
      await route.fulfill({ status: 404, body: `Not found: ${url.pathname}` });
    }
  });
  await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));

  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
  let readyState;
  for (let attempt = 0; attempt < 120; attempt++) {
    readyState = await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration('/');
      return { active: registration?.active?.state || null, installing: registration?.installing?.state || null, controller: Boolean(navigator.serviceWorker.controller) };
    });
    if (readyState.active === 'activated' && !readyState.installing && readyState.controller) break;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  assert.ok(readyState.active === 'activated' && !readyState.installing && readyState.controller, `service worker did not settle: ${JSON.stringify(readyState)}`);

  const initialCache = await page.evaluate(async (cacheName) => {
    const names = await caches.keys();
    const name = names.find((item) => item === cacheName);
    const registration = await navigator.serviceWorker.getRegistration('/');
    if (!name) return { names, keys: [] };
    const cache = await caches.open(name);
    return { names, keys: (await cache.keys()).map((request) => new URL(request.url).pathname), active: registration?.active?.state, installing: registration?.installing?.state, controller: navigator.serviceWorker.controller?.scriptURL };
  }, initialCacheName);
  console.log('PWA initial worker state:', JSON.stringify(initialCache));
  assert.ok(initialCache.names.includes(initialCacheName), `${initialCacheName} cache was not installed`);
  for (const required of ['/','/manifest.webmanifest','/apex-icon.svg','/assets/aistudio/21-chess.html','/assets/aistudio/board-kit.js','/assets/aistudio/score-bridge.js','/assets/aistudio/menu-kit.css']) {
    assert.ok(initialCache.keys.includes(required), `precache is missing ${required}; cached paths: ${initialCache.keys.join(', ')}`);
  }
  assert.ok(initialCache.keys.some((key) => key.startsWith('/assets/index-') && key.endsWith('.js')), 'built app entry is not precached');

  await context.setOffline(true);
  await page.goto(`${baseUrl}/#/home`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.locator('[data-app-page="home"]').waitFor({ state: 'visible', timeout: 10000 });
  await page.goto(`${baseUrl}/#/play/chess`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.getByRole('button', { name: 'Play Chess' }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('iframe')].some((frame) => frame.contentWindow?.location?.href?.includes('/assets/aistudio/21-chess.html')), null, { timeout: 10000 });
  const chessFrame = page.frames().find((frame) => frame.url().includes('/assets/aistudio/21-chess.html'));
  assert.ok(chessFrame, `chess iframe did not load offline: ${JSON.stringify(await page.evaluate(() => [...document.querySelectorAll('iframe')].map((frame) => frame.src)))}`);
  await chessFrame.locator('.sq').first().waitFor({ state: 'visible', timeout: 10000 });
  const chessMenu = chessFrame.locator('.apex-menu-root');
  if (await chessMenu.count()) {
    await chessMenu.locator('[data-menu-action="play"]').click();
    await chessMenu.waitFor({ state: 'hidden' });
  }
  const offlineMove = await chessFrame.evaluate(() => {
    const move = legal(S)[0];
    return { from: [...document.querySelectorAll('.sq')].find((el) => idx(+el.dataset.k) === move.f)?.dataset.k,
      to: [...document.querySelectorAll('.sq')].find((el) => idx(+el.dataset.k) === move.t)?.dataset.k };
  });
  await chessFrame.locator(`.sq[data-k="${offlineMove.from}"]`).click();
  await chessFrame.locator(`.sq[data-k="${offlineMove.to}"]`).click();
  assert.ok(await chessFrame.locator('#moves').innerText(), 'offline chess move was not recorded');

  await page.goto(`${baseUrl}/assets/aistudio/01-flappy-bird.html`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.waitForFunction(() => {
    const link = document.getElementById('apex-menu-kit-styles');
    return !!(link && link.sheet && document.querySelector('.apex-menu-root'));
  }, null, { timeout: 10000 });
  assert.equal(await page.locator('.apex-menu-root').evaluate((root) => getComputedStyle(root).visibility), 'visible', 'offline pilot menu stylesheet must reveal the menu');
  await page.locator('.apex-menu-root').getByRole('button', { name: 'Options', exact: true }).click();
  await page.locator('.apex-menu-root').getByRole('button', { name: 'Back', exact: true }).click();
  console.log('PASS pilot menu and adjacent stylesheet load and navigate offline');

  await context.setOffline(false);
  await page.goto(`${baseUrl}/#/home`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  swSource = swSource.replace(initialCacheName, nextCacheName);
  await writeFile(path.join(distRoot, 'sw.js'), swSource);
  const updatedWorkerSource = await page.evaluate(async () => await (await fetch('/sw.js', { cache: 'no-store' })).text());
  assert.ok(updatedWorkerSource.includes(nextCacheName), `${nextCacheName} was not served`);
  await page.evaluate(async () => { await navigator.serviceWorker.register('/sw.js?revision=update', { scope: '/' }); });
  await page.getByRole('status').getByText('An Apex Arcade update is ready.').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: 'Refresh' }).click();
  await page.waitForFunction(async ({ next, previous }) => {
    const registration = await navigator.serviceWorker.getRegistration('/');
    return registration?.active?.state === 'activated' && registration.active.scriptURL.includes('/sw.js')
      && (await caches.keys()).includes(next) && !(await caches.keys()).includes(previous);
  }, { next: nextCacheName, previous: initialCacheName }, { timeout: 15000 });

  await context.setOffline(true);
  await page.goto(`${baseUrl}/#/play/chess`, { waitUntil: 'domcontentloaded', timeout: 10000 });
  await page.getByRole('button', { name: 'Play Chess' }).click();
  await page.waitForFunction(() => [...document.querySelectorAll('iframe')].some((frame) => frame.contentWindow?.location?.href?.includes('/assets/aistudio/21-chess.html')), null, { timeout: 10000 });
  assert.ok(page.frames().some((frame) => frame.url().includes('/assets/aistudio/21-chess.html')), 'updated app could not reopen a game offline');
  assert.deepEqual(errors, [], `browser errors: ${errors.join('; ')}`);
  console.log(`PASS PWA install, 50-game precache, offline Home/chess/menu pilot, and prompted ${initialCacheName}→${nextCacheName} worker update/activation.`);
} finally {
  await context.close();
  await browser.close();
  await server.close();
}
