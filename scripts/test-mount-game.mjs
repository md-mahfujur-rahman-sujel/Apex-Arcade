import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const distRoot = path.resolve(process.cwd(), 'dist');
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Continue to another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 900, height: 760 }, hasTouch: true });
const errors = [];
try {
  await context.route(`${origin}/**`, async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const filePath = path.resolve(distRoot, `.${pathname}`);
    if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) {
      await route.fulfill({ status: 403, body: 'Forbidden' });
      return;
    }
    try {
      const info = await stat(filePath);
      const resolvedPath = info.isDirectory() ? path.join(filePath, 'index.html') : filePath;
      const ext = path.extname(resolvedPath).toLowerCase();
      const contentType = ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' })[ext] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType, body: await readFile(resolvedPath) });
    } catch {
      await route.fulfill({ status: 404, body: `Not found: ${pathname}` });
    }
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__virtualPads = [];
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => window.__virtualPads });
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${message.text()} ${JSON.stringify(message.location())}`); });
  page.on('requestfailed', (request) => errors.push(`request failed ${request.url()}: ${request.failure()?.errorText}`));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(`${origin}/assets/aistudio/01-flappy-bird.html`);
  await page.waitForFunction(() => window.UI?.mountGame && window.Arcade?.test?.G?.ui?.controls?.isConnected);
  const menu = page.locator('.apex-game-menu');
  const launchMenu = page.locator('.apex-menu-root');
  await launchMenu.locator('[data-menu-action="play"]').tap();
  await launchMenu.waitFor({ state: 'hidden' });
  await page.waitForFunction(() => window.Arcade.test.G.state === 'playing');
  await menu.getByRole('button', { name: 'Pause', exact: true }).tap();
  await page.waitForFunction(() => window.Arcade.test.G.state === 'paused');
  await menu.getByRole('button', { name: 'Settings', exact: true }).tap();
  const shake = page.getByRole('slider', { name: 'Screen shake' });
  await shake.fill('0.4');
  await page.waitForFunction(() => Math.abs(window.Save.load('glowmoth').settings.shake - 0.4) < 0.001);
  const shakeResult = await page.evaluate(() => { var G = window.Arcade.test.G; G.shakeAmt = 0; G.shake(10); return G.shakeAmt; });
  if (Math.abs(shakeResult - 4) > 0.001) throw new Error(`Screen shake setting was saved but not applied (got ${shakeResult})`);
  await menu.getByRole('button', { name: 'Done', exact: true }).tap();
  await menu.getByRole('button', { name: 'Resume', exact: true }).tap();
  await page.waitForFunction(() => window.Arcade.test.G.state === 'playing');

  await page.evaluate(() => window.__virtualPads = [{ buttons: Array.from({ length: 16 }, () => ({ pressed: false })), axes: [0, 0] }]);
  const pad = async (index, pressed) => {
    await page.evaluate(({ index, pressed }) => { window.__virtualPads[0].buttons[index].pressed = pressed; }, { index, pressed });
    await page.waitForTimeout(120);
  };
  await pad(9, true);
  await page.waitForFunction(() => window.Arcade.test.G.state === 'paused');
  await pad(9, false);
  await pad(13, true); await pad(13, false);
  await pad(0, true); await page.waitForFunction(() => Boolean(document.querySelector('.apex-game-menu input[type="range"]'))); await pad(0, false);
  await pad(12, true); await pad(12, false);
  await pad(14, true); await page.waitForFunction(() => Math.abs(window.Save.load('glowmoth').settings.shake - 0.3) < 0.001); await pad(14, false);
  await pad(13, true); await pad(13, false);
  await pad(13, true); await pad(13, false);
  await pad(0, true); await page.waitForFunction(() => !document.querySelector('.apex-game-menu input[type="range"]')); await pad(0, false);
  await pad(12, true); await pad(12, false);
  await pad(12, true); await pad(12, false);
  await pad(0, true); await page.waitForFunction(() => window.Arcade.test.G.state === 'playing'); await pad(0, false);
  await pad(9, true); await page.waitForFunction(() => window.Arcade.test.G.state === 'paused'); await pad(9, false);
  await page.evaluate(() => { window.Arcade.test.G.pauseToggle(); window.Arcade.test.G.over('Verification result', 'test'); });
  await page.waitForFunction(() => window.Arcade.test.G.state === 'over');
  if (!(await menu.locator('[aria-live="polite"]').innerText()).startsWith('Score ')) throw new Error('Results shell did not expose the game score');
  await menu.getByRole('button', { name: 'Back to menu', exact: true }).tap();
  await page.waitForFunction(() => window.Arcade.test.G.state === 'ready');
  const play = menu.getByRole('button', { name: 'Play', exact: true });
  await play.focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.Arcade.test.G.state === 'playing');
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => window.Arcade.test.G.state === 'paused');
  await menu.getByRole('button', { name: 'Settings', exact: true }).focus(); await page.keyboard.press('Enter');
  const keyboardSlider = menu.getByRole('slider', { name: 'Screen shake' });
  await keyboardSlider.focus(); await page.keyboard.press('ArrowRight');
  const keyboardValue = await keyboardSlider.inputValue();
  if (Math.abs(Number(keyboardValue) - 0.4) > 0.001) throw new Error(`Keyboard did not adjust the setting slider (input=${keyboardValue})`);
  await page.waitForFunction(() => Math.abs(window.Save.load('glowmoth').settings.shake - 0.4) < 0.001);
  await menu.getByRole('button', { name: 'Done', exact: true }).focus(); await page.keyboard.press('Enter');
  await menu.getByRole('button', { name: 'Resume', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.Arcade.test.G.state === 'playing');
  await page.evaluate(() => window.Arcade.test.G.over('Keyboard result', 'test'));
  await page.waitForFunction(() => window.Arcade.test.G.state === 'over');
  await menu.getByRole('button', { name: 'Back to menu', exact: true }).focus(); await page.keyboard.press('Enter');
  await page.waitForFunction(() => window.Arcade.test.G.state === 'ready');
  const modeFlow = await page.evaluate(() => {
    const applied = [];
    function mount() {
      const host = document.createElement('div'), canvas = document.createElement('canvas');
      canvas.width = 320; canvas.height = 180; host.appendChild(canvas); document.body.appendChild(host);
      const game = { canvas, state: 'ready', score: 0, hi: 0, title: '', sub: '', begin() { this.state = 'playing'; }, pauseToggle() { this.state = this.state === 'paused' ? 'playing' : 'paused'; }, restart(play) { this.state = play ? 'playing' : 'ready'; } };
      const ui = UI.mountGame(game, { id: 'smoke-mode-probe', title: 'Mode Probe', modes: [{ id: 'classic', name: 'Classic' }, { id: 'rally', name: 'Rally Rush' }], hooks: { applyMode(mode) { applied.push(mode); } } });
      return { host, ui };
    }
    const first = mount();
    const select = first.host.querySelector('select[aria-label="Game mode"]');
    select.value = 'rally'; select.dispatchEvent(new Event('change', { bubbles: true }));
    const saved = Save.load('smoke-mode-probe').settings.mode;
    first.host.remove();
    const second = mount();
    return { applied, saved, restored: second.ui.getMode() };
  });
  if (modeFlow.saved !== 'rally' || modeFlow.restored !== 'rally' || modeFlow.applied.at(-1) !== 'rally') {
    throw new Error(`Game mode selection did not apply and persist: ${JSON.stringify(modeFlow)}`);
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('UI.mountGame verification passed: keyboard, touch and gamepad flows; setting and mode application/persistence; zero browser errors.');
} finally {
  await context.close(); await browser.close();
}
