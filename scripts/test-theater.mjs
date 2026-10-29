import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await context.newPage();
const errors = [];

async function openTheater(gameId) {
  await page.evaluate((id) => { location.hash = `#/game/${id}`; }, gameId);
  await page.getByRole('button', { name: 'Play now' }).click();
  const theater = page.locator('#playable-theater-modal');
  await theater.waitFor({ state: 'visible' });
  await page.getByRole('button', { name: `Play ${gameId === 'flappy-bird' ? 'Glowmoth Gauntlet' : gameId === '2048' ? 'Merge 2048' : 'Ion Rally'}`, exact: true }).click();
  return theater;
}

try {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.addInitScript(() => {
    localStorage.clear();
    window.__theaterPad = { connected: true, buttons: Array.from({ length: 16 }, () => ({ pressed: false })), axes: [0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__theaterPad] });
  });
  await page.goto(`${origin}/#/game/flappy-bird`);

  let theater = await openTheater('flappy-bird');
  assert.equal(await theater.getAttribute('data-theme'), 'dark');
  assert.equal(await theater.getAttribute('data-touch-mode'), 'virtual');
  assert.equal(await page.locator('#playable-theater-stage').evaluate((stage) => getComputedStyle(stage).backgroundColor), 'rgb(5, 6, 13)', 'the theater stage remains dark');
  const flappyFrame = page.frameLocator('#playable-theater-modal iframe');
  await flappyFrame.locator('[data-menu-action="play"], [data-menu-action="continue"]').first().click({ timeout: 5000 });
  await flappyFrame.locator('.apex-menu-root').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => {
    const button = document.querySelector('#playable-theater-modal button[aria-label="Pause game"]');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.getByRole('dialog', { name: 'Game paused' }).waitFor();
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('dialog', { name: 'Game paused' }).waitFor({ state: 'detached' });

  // Gamepad Start toggles the same single host pause screen.
  const pad = async (index, pressed) => {
    await page.evaluate(({ index, pressed }) => { window.__theaterPad.buttons[index].pressed = pressed; }, { index, pressed });
    await page.waitForTimeout(120);
  };
  await pad(9, true);
  await page.getByRole('dialog', { name: 'Game paused' }).waitFor();
  assert.equal(await page.locator('#playable-theater-modal [role="dialog"][aria-label="Game paused"]').count(), 1, 'gamepad Start opens exactly one pause screen');
  await pad(9, false);
  await pad(9, true);
  await page.getByRole('dialog', { name: 'Game paused' }).waitFor({ state: 'detached' });
  await pad(9, false);
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal iframe')?.contentWindow?.ApexGamePaused === false);
  await page.waitForTimeout(250);
  assert.equal(await page.locator('#playable-theater-modal [role="dialog"][aria-label="Game paused"]').count(), 0, 'gamepad Start resumes without immediately re-pausing');

  await page.getByRole('button', { name: 'Theater settings' }).click();
  const theaterVolume = page.getByRole('slider', { name: 'Theater volume' });
  assert.equal(await theaterVolume.inputValue(), '0.8');
  await theaterVolume.press('ArrowLeft');
  assert.equal(await theaterVolume.inputValue(), '0.75', 'the theater volume control applies live');
  for (const label of ['CRT filter', 'Pixel-perfect scaling', 'Ambient glow']) {
    const checkbox = page.getByRole('checkbox', { name: label });
    await checkbox.check();
    const attr = label === 'CRT filter' ? 'data-crt' : label === 'Pixel-perfect scaling' ? 'data-pixel-perfect' : 'data-ambient-glow';
    await page.waitForFunction(({ attr }) => document.querySelector('#playable-theater-modal')?.getAttribute(attr) === 'true', { attr });
  }
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('apex:theater-display:flappy-bird')));
  assert.deepEqual(stored, { crt: true, pixelPerfect: true, ambientGlow: true }, 'all display modes persist for the game');
  assert.notEqual(await page.locator('#playable-theater-stage').evaluate((stage) => getComputedStyle(stage, '::after').content), 'none', 'CRT scanlines render live');
  assert.equal(await page.locator('#playable-theater-modal iframe').evaluate((frame) => getComputedStyle(frame).imageRendering), 'pixelated', 'pixel-perfect scaling renders live');
  assert.notEqual(await page.locator('#playable-theater-stage').evaluate((stage) => getComputedStyle(stage).boxShadow), 'none', 'ambient glow renders live');

  // Verify touch controls emit the game's configured Space key.
  await page.getByRole('button', { name: 'Close theater settings' }).click();
  await page.evaluate(() => {
    const frame = document.querySelector('#playable-theater-modal iframe');
    frame.contentWindow.__touchMessages = [];
    frame.contentWindow.__touchKeys = [];
    frame.contentWindow.addEventListener('message', (event) => frame.contentWindow.__touchMessages.push(event.data));
    frame.contentDocument.addEventListener('keydown', (event) => frame.contentWindow.__touchKeys.push(event.key));
  });
  const flap = page.getByRole('button', { name: 'Flap (Space)' });
  await flap.dispatchEvent('pointerdown', { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 });
  await flap.dispatchEvent('pointerup', { pointerId: 1, pointerType: 'touch', isPrimary: true, button: 0 });
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal iframe')?.contentWindow.__touchMessages.some((message) => message?.type === 'KEY_EVENT' && message.key === ' ' && message.action === 'down'));
  assert.ok(await page.locator('#playable-theater-modal iframe').evaluate((frame) => frame.contentWindow.__touchKeys.includes(' ')), 'touch key reaches the iframe game keyboard handler');

  // D-pad navigation changes theater focus and A activates a focused control.
  const settingsButton = page.getByRole('button', { name: 'Theater settings' });
  await settingsButton.focus();
  await page.evaluate(() => { window.__theaterPad.buttons[13].pressed = true; });
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') !== 'Theater settings');
  await page.evaluate(() => { window.__theaterPad.buttons[13].pressed = false; });
  await settingsButton.focus();
  await page.evaluate(() => { window.__theaterPad.buttons[0].pressed = true; });
  await page.locator('#theater-settings').waitFor();
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal [aria-label="Theater settings"]')?.getAttribute('aria-expanded') === 'true');
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__theaterPad.buttons[0].pressed = false; });
  await page.getByRole('button', { name: 'Close theater settings' }).click();

  // Fullscreen request state follows browser fullscreenchange, including exit.
  await page.evaluate(() => {
    const root = document.querySelector('#playable-theater-modal').firstElementChild;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => window.__fakeFullscreen || null });
    root.requestFullscreen = async () => { window.__fakeFullscreen = root; document.dispatchEvent(new Event('fullscreenchange')); };
    document.exitFullscreen = async () => { window.__fakeFullscreen = null; document.dispatchEvent(new Event('fullscreenchange')); };
  });
  await page.getByRole('button', { name: 'Toggle Fullscreen' }).click();
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal [title="Toggle Fullscreen"]')?.getAttribute('aria-pressed') === 'true');
  await page.getByRole('button', { name: 'Toggle Fullscreen' }).click();
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal [title="Toggle Fullscreen"]')?.getAttribute('aria-pressed') === 'false');

  await page.getByRole('button', { name: 'Close Theater' }).click();
  theater = await openTheater('flappy-bird');
  assert.equal(await theater.getAttribute('data-crt'), 'true', 'display settings restore when the game opens again');
  assert.equal(await theater.getAttribute('data-pixel-perfect'), 'true');
  assert.equal(await theater.getAttribute('data-ambient-glow'), 'true');
  await page.getByRole('button', { name: 'Close Theater' }).click();

  await openTheater('pong');
  assert.equal(await page.locator('#playable-theater-modal').getAttribute('data-touch-mode'), 'virtual');
  await page.getByRole('button', { name: 'Close Theater' }).click();
  await openTheater('2048');
  assert.equal(await page.locator('#playable-theater-modal').getAttribute('data-touch-mode'), 'native', '2048 keeps its native swipe controls');
  assert.equal(await page.getByRole('button', { name: 'Toggle Virtual Touch Controls' }).count(), 0, 'native touch game has no generic pad toggle');
  await page.getByRole('button', { name: 'Close Theater' }).click();

  await page.goto(`${origin}/#/browse`);
  await page.locator('#catalog [data-game-id]').first().waitFor();
  const gameIds = await page.locator('#catalog [data-game-id]').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-game-id')));
  assert.equal(gameIds.length, 50, 'browse exposes all 50 game records for config checks');
  for (const gameId of gameIds) {
    await page.evaluate((id) => { location.hash = `#/game/${id}`; }, gameId);
    await page.getByRole('button', { name: 'Play now' }).click();
    const gameTheater = page.locator('#playable-theater-modal');
    await gameTheater.waitFor({ state: 'visible' });
    const gameNumber = Number(await gameTheater.getAttribute('data-game-number'));
    assert.equal(await gameTheater.getAttribute('data-touch-mode'), gameNumber <= 20 ? 'virtual' : 'native', `${gameId} receives its configured touch mode`);
    await gameTheater.locator('[data-ui-open]').click();
    if (gameNumber <= 20) {
      const controls = gameTheater.locator('[data-touch-layout] button');
      await controls.first().waitFor();
      await page.locator('#playable-theater-modal iframe').evaluate((frame) => {
        frame.contentWindow.__touchMessages = [];
        frame.contentWindow.addEventListener('message', (event) => frame.contentWindow.__touchMessages.push(event.data));
      });
      const count = await controls.count();
      for (let index = 0; index < count; index++) {
        const button = controls.nth(index);
        const label = await button.getAttribute('aria-label');
        const shownKey = label.slice(label.lastIndexOf('(') + 1, -1);
        const expectedKey = shownKey === 'Space' ? ' ' : shownKey;
        await button.dispatchEvent('pointerdown', { pointerId: 2 + index, pointerType: 'touch', isPrimary: true, button: 0 });
        await button.dispatchEvent('pointerup', { pointerId: 2 + index, pointerType: 'touch', isPrimary: true, button: 0 });
        await page.waitForFunction(({ expectedKey }) => {
          const frame = document.querySelector('#playable-theater-modal iframe');
          return frame?.contentWindow.__touchMessages.some((message) => message?.type === 'KEY_EVENT' && message.key === expectedKey && message.action === 'down');
        }, { expectedKey }, { timeout: 2500 }).catch(() => { throw new Error(`${gameId} control ${label} did not dispatch configured key ${expectedKey}`); });
      }
    } else assert.equal(await page.getByRole('button', { name: 'Toggle Virtual Touch Controls' }).count(), 0, `${gameId} retains in-game native touch UI`);
    await page.getByRole('button', { name: 'Close Theater' }).click();
  }

  // Escape owns pause for iframe games, and every overlay action routes correctly.
  await page.evaluate(() => { location.hash = '#/game/flappy-bird'; });
  await page.getByRole('button', { name: 'Play now' }).click();
  await page.locator('#playable-theater-modal [data-ui-open]').click();
  const pausedFlappy = page.frameLocator('#playable-theater-modal iframe');
  await pausedFlappy.locator('[data-menu-action="play"], [data-menu-action="continue"]').first().click({ timeout: 5000 });
  await pausedFlappy.locator('.apex-menu-root').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => {
    const button = document.querySelector('#playable-theater-modal button[aria-label="Pause game"]');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.keyboard.press('Escape');
  const actionDialog = page.getByRole('dialog', { name: 'Game paused' });
  await actionDialog.waitFor();
  await actionDialog.getByRole('button', { name: 'Settings', exact: true }).click();
  await actionDialog.getByRole('heading', { name: 'Theater settings' }).waitFor();
  await actionDialog.getByRole('button', { name: 'Back to pause' }).click();
  await actionDialog.getByRole('button', { name: 'Restart', exact: true }).click();
  await actionDialog.waitFor({ state: 'detached' });
  await page.waitForFunction(() => {
    const frame = document.querySelector('#playable-theater-modal iframe');
    const menu = frame?.contentDocument?.querySelector('.apex-menu-root');
    return frame?.contentWindow?.location.href.includes('r=') && frame.contentDocument?.readyState === 'complete' && menu && !menu.hidden;
  });
  await pausedFlappy.locator('.apex-menu-root').waitFor({ state: 'visible' });
  await pausedFlappy.locator('[data-menu-action="play"], [data-menu-action="continue"]').first().click({ timeout: 5000 });
  await pausedFlappy.locator('.apex-menu-root').waitFor({ state: 'hidden' });
  await page.waitForFunction(() => {
    const button = document.querySelector('#playable-theater-modal button[aria-label="Pause game"]');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.keyboard.press('Escape');
  await actionDialog.waitFor();
  await actionDialog.getByRole('button', { name: 'Exit to Arcade' }).click();
  await page.locator('#playable-theater-modal').waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('button', { name: 'Play now' }).count(), 1, 'Exit to Arcade returns to the game page');

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS production theater pause overlay, per-game touch input, live persisted display modes, fullscreen synchronization, gamepad Start pause/resume, Escape pause, and all overlay actions');
  console.log('PASS all 50 game records select their configured native or virtual touch layout');
  console.log('PASS zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
