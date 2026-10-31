import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const distRoot = path.resolve('dist');
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
const page = await context.newPage();
const errors = [];
await context.route(`${origin}/**`, async (route) => {
  const url = new URL(route.request().url());
  const filePath = path.resolve(distRoot, `.${decodeURIComponent(url.pathname)}`);
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) return route.fulfill({ status: 403, body: 'Forbidden' });
  try {
    const info = await stat(filePath);
    const resolved = info.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const contentType = ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml' })[path.extname(resolved).toLowerCase()] || 'application/octet-stream';
    return route.fulfill({ status: 200, contentType, body: await readFile(resolved) });
  } catch { return route.fulfill({ status: 404, body: `Not found: ${url.pathname}` }); }
});
await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(() => {
  if (location.pathname === '/') localStorage.clear();
  window.__menuTestPad = { connected: false, buttons: Array.from({ length: 16 }, () => ({ pressed: false })), axes: [0, 0] };
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__menuTestPad] });
  if (window.AudioContext) {
    const NativeAudioContext = window.AudioContext;
    window.__menuAudioContexts = [];
    window.AudioContext = function (...args) {
      const audioContext = new NativeAudioContext(...args);
      window.__menuAudioContexts.push(audioContext);
      return audioContext;
    };
    window.AudioContext.prototype = NativeAudioContext.prototype;
  }
});

async function openGame(gameId, title) {
  await page.goto(`${origin}/#/game/${gameId}`);
  await page.getByRole('button', { name: 'Play now' }).click();
  await page.getByRole('button', { name: `Play ${title}`, exact: true }).click();
  await page.locator('#playable-theater-modal iframe').waitFor({ state: 'attached' });
  await page.waitForFunction(() => !!document.querySelector('#playable-theater-modal iframe')?.contentDocument?.querySelector('.apex-menu-root'));
  const frame = page.frames().find((candidate) => candidate.url().includes('/assets/games/'));
  assert.ok(frame, `${title} game iframe is loaded: ${JSON.stringify(await page.locator('#playable-theater-modal iframe').evaluateAll((frames) => frames.map((item) => item.src)))}`);
  await frame.locator('.apex-menu-root').waitFor({ state: 'visible' });
  await frame.waitForFunction(() => {
    const link = document.getElementById('apex-menu-kit-styles');
    return !!(link && link.sheet);
  });
  return frame;
}

async function pressPad(frame, button) {
  await frame.evaluate((index) => { window.__menuTestPad.buttons[index].pressed = true; }, button);
  await page.waitForTimeout(100);
  await frame.evaluate((index) => { window.__menuTestPad.buttons[index].pressed = false; }, button);
  await page.waitForTimeout(100);
}

try {
  const glowmoth = await openGame('flappy-bird', 'Glowmoth Gauntlet');
  const menu = glowmoth.locator('.apex-menu-root');
  assert.equal(await menu.getAttribute('data-menu-archetype'), 'banner');
  assert.equal(await menu.evaluate((root) => getComputedStyle(root).position), 'fixed');
  await menu.getByRole('button', { name: 'Play', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'customize', 'arrow keys move menu focus to Customize');
  await page.keyboard.press('ArrowDown');
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'options', 'arrow keys continue through the menu');
  await page.keyboard.press('Enter');
  await menu.getByRole('tab', { name: 'Audio' }).waitFor();
  await page.keyboard.press('Escape');
  await menu.getByRole('button', { name: 'Play', exact: true }).waitFor();

  await menu.getByRole('button', { name: 'Play', exact: true }).focus();
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'play', 'main menu action receives focus before gamepad input');
  await glowmoth.evaluate(() => { window.__menuTestPad.connected = true; });
  await pressPad(glowmoth, 13);
  await glowmoth.waitForFunction(() => document.querySelector('.apex-menu-root')?.ownerDocument.activeElement?.dataset.menuAction === 'customize', null, { timeout: 1200 }).catch(() => {});
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'customize', 'gamepad d-pad moves menu focus');
  await pressPad(glowmoth, 13);
  await glowmoth.waitForFunction(() => document.querySelector('.apex-menu-root')?.ownerDocument.activeElement?.dataset.menuAction === 'options', null, { timeout: 1200 }).catch(() => {});
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'options', 'gamepad d-pad continues through the menu');
  await pressPad(glowmoth, 0);
  await menu.getByRole('tab', { name: 'Audio' }).waitFor();
  await pressPad(glowmoth, 1);
  await menu.getByRole('button', { name: 'Play', exact: true }).waitFor();
  await glowmoth.evaluate(() => { window.__menuTestPad.connected = false; });
  console.log('PASS Glowmoth keyboard and gamepad navigation, activation, and Back');

  await menu.getByRole('button', { name: 'Options', exact: true }).click();
  await menu.getByRole('tab', { name: 'Accessibility' }).click();
  const reduceMotion = menu.getByRole('switch', { name: 'Reduce motion' });
  if (await reduceMotion.isChecked()) await reduceMotion.uncheck();
  await reduceMotion.check();
  await glowmoth.waitForFunction(() => window.Save?.load('glowmoth')?.settings?.reduceMotion === true);
  assert.equal(await menu.getAttribute('data-reduced-motion'), 'true', 'reduced motion updates the menu styling state');
  const scene = await glowmoth.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:120px;height:80px';
    document.body.appendChild(canvas);
    const frames = [];
    const controller = Fx.menuScene(canvas, (ctx, frame) => { frames.push({ static: frame.static, reducedMotion: frame.reducedMotion }); }, {
      gameId: 'menu-gate-probe',
      fallback: (ctx, frame) => { frames.push({ static: frame.static, reducedMotion: frame.reducedMotion, fallback: true }); }
    });
    controller.setReducedMotion(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const profile = controller.profile();
    controller.destroy(); canvas.remove();
    return { profile, frames };
  });
  assert.equal(scene.profile.static, true, 'reduced-motion scene renders as a still');
  assert.equal(scene.profile.reducedMotion, true);
  assert.ok(scene.frames.some((frame) => frame.fallback && frame.static), 'reduced-motion scene uses its static fallback');
  await menu.getByRole('button', { name: 'Back', exact: true }).click();
  console.log('PASS reduced-motion preference persists and scene fallback renders a static frame');

  await menu.getByRole('button', { name: 'Options', exact: true }).click();
  await page.waitForFunction(() => {
    const frame = document.querySelector('#playable-theater-modal iframe');
    return (frame?.contentWindow?.__menuAudioContexts || []).some((context) => context.state === 'running');
  });
  console.log('PASS gesture unlocks the menu Web Audio context');

  const ticTacToe = await openGame('tic-tac-toe', 'Tic-Tac-Toe');
  assert.equal(await ticTacToe.locator('.apex-menu-root').getAttribute('data-menu-archetype'), 'paper');
  assert.ok(await ticTacToe.locator('.apex-menu-root .apex-menu-action').count() >= 5);
  console.log('PASS Tic-Tac-Toe Paper and Ink pilot launches in the theater');

  const merge = await openGame('2048', 'Merge 2048');
  const mergeMenu = merge.locator('.apex-menu-root');
  assert.equal(await mergeMenu.getAttribute('data-menu-archetype'), 'glass');
  await mergeMenu.getByRole('button', { name: 'Play', exact: true }).click();
  const mergePage = page.frames().find((frame) => frame.url().includes('/42-2048/index.html'));
  assert.ok(mergePage, 'Merge 2048 game frame is loaded');
  const intro = mergePage.locator('#bk-dlg');
  if (await intro.count() && await intro.evaluate((dialog) => dialog.open)) await intro.locator('button').first().click();
  await mergePage.locator('#bd .tl').first().waitFor({ state: 'visible' });
  await mergePage.locator('body').press('ArrowRight');
  await mergePage.waitForTimeout(180);
  const savedBoard = await mergePage.locator('#bd .tl').evaluateAll((tiles) => tiles.map((tile) => `${tile.textContent}:${tile.style.left}:${tile.style.top}`).sort().join('|'));
  assert.ok(savedBoard, 'Merge 2048 creates a saved active run');
  await page.getByRole('button', { name: 'Close Theater' }).click();

  const resumed = await openGame('2048', 'Merge 2048');
  const resumedMenu = resumed.locator('.apex-menu-root');
  await resumedMenu.getByRole('button', { name: 'Continue Run', exact: true }).click();
  const resumedFrame = page.frames().find((frame) => frame.url().includes('/42-2048/index.html'));
  await resumedFrame.locator('#bd .tl').first().waitFor({ state: 'visible' });
  const resumedBoard = await resumedFrame.locator('#bd .tl').evaluateAll((tiles) => tiles.map((tile) => `${tile.textContent}:${tile.style.left}:${tile.style.top}`).sort().join('|'));
  assert.equal(resumedBoard, savedBoard, 'Continue Run restores the saved tile positions and values');
  await page.getByRole('button', { name: 'Close Theater' }).click();
  console.log('PASS Merge 2048 Continue Run restores the saved board');

  const exitFrame = await openGame('flappy-bird', 'Glowmoth Gauntlet');
  await exitFrame.locator('.apex-menu-root').getByRole('button', { name: 'Exit', exact: true }).click();
  await page.locator('#playable-theater-modal').waitFor({ state: 'detached' });
  console.log('PASS menu Exit closes its same-origin theater');

  assert.deepEqual(errors, [], `browser errors: ${errors.join('; ')}`);
  console.log('PASS menu pilot gate checks completed with zero browser errors');
} finally {
  await context.close();
  await browser.close();
  await server.close();
}
