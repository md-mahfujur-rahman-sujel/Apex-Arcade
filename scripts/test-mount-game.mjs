import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Continue to another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 900, height: 760 }, hasTouch: true });
const errors = [];
try {
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
  await menu.getByRole('button', { name: 'Play', exact: true }).tap();
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
  await pad(0, true); await page.waitForFunction(() => !document.querySelector('.apex-game-menu input[type="range"]')); await pad(0, false);
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
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('UI.mountGame verification passed: keyboard, touch and gamepad boot/play/pause/settings/results/menu paths; setting persistence/application; zero browser errors.');
} finally {
  await context.close(); await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve));
}
