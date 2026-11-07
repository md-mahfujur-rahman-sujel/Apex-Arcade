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
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await context.newPage();
const errors = [];
const games = [
  'flappy-bird', 'pong', 'snake', 'space-invaders', 'tetris', 'pac-man', 'asteroids',
  'super-mario-bros', 'super-mario-world', 'sonic-the-hedgehog', 'street-fighter-ii',
  'chrono-trigger', 'castlevania-sotn', 'super-metroid', 'hollow-knight', 'celeste',
  'cuphead', 'dead-cells', 'ori-and-the-blind-forest', 'rayman-legends',
];
const startLabels = {
  pong: 'START CIRCUIT',
  snake: 'START RUN',
  'space-invaders': 'START DEFENSE',
  tetris: 'START MATRIX',
  'pac-man': 'START MAZE',
  asteroids: 'LAUNCH STARFALL',
  'super-mario-bros': 'START ROUTE',
  'super-mario-world': 'START ISLE',
  'sonic-the-hedgehog': 'START RUSH',
  'street-fighter-ii': 'START RUSH',
  'chrono-trigger': 'ENTER THE WILDS',
  'castlevania-sotn': 'ENTER THE CRYPT',
  'super-metroid': 'LAND ON ZEBES',
  'hollow-knight': 'ENTER HALLOWNEST',
  celeste: 'START STAGE',
  cuphead: 'TAKE THE STAGE',
  'dead-cells': 'DESCEND',
  'ori-and-the-blind-forest': 'START STAGE',
  'rayman-legends': 'START STAGE',
};

try {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}/#/game/${games[0]}`);

  for (const gameId of games) {
    await page.evaluate((id) => { location.hash = `#/game/${id}`; }, gameId);
    await page.getByRole('button', { name: 'Play now' }).click();
    await page.getByRole('button', { name: '3D', exact: true }).click();
    await page.locator('#playable-theater-modal [data-ui-open]').click();
    const canvas = page.locator('#playable-theater-modal canvas').first();
    await canvas.waitFor({ state: 'visible' });
    await page.waitForFunction(() => {
      const element = document.querySelector('#playable-theater-modal canvas');
      return element instanceof HTMLCanvasElement && element.width > 0 && element.height > 0;
    });
    const actionStart = page.getByTestId('action-start');
    const startLabel = startLabels[gameId];
    if (startLabel) {
      const startButton = page.getByRole('button', { name: startLabel, exact: true });
      if (await startButton.isVisible()) await startButton.click();
      else if (await actionStart.isVisible()) await actionStart.click();
    } else if (await actionStart.isVisible()) await actionStart.click();
    await page.waitForTimeout(250);

    const signature = () => canvas.evaluate((element) => {
      const data = element.getContext('2d').getImageData(0, 0, element.width, element.height).data;
      let hash = 2166136261;
      for (let index = 0; index < data.length; index += 97) {
        hash ^= data[index];
        hash = Math.imul(hash, 16777619);
      }
      return `${element.width}x${element.height}:${hash >>> 0}`;
    });

    const first = await signature();
    await page.waitForTimeout(220);
    let dynamic = await signature() !== first;
    if (!dynamic) {
      await canvas.click({ position: { x: 20, y: 20 } });
      await page.keyboard.press('Space');
      await page.waitForTimeout(220);
      const afterInput = await signature();
      await page.waitForTimeout(220);
      dynamic = await signature() !== afterInput;
    }

    assert.ok(dynamic, `${gameId} is running before pause is tested`);
    await page.keyboard.press('Escape');
    const pauseDialog = page.getByRole('dialog', { name: 'Game paused' });
    await pauseDialog.waitFor();
    assert.equal(await page.locator('#playable-theater-modal [role="dialog"][aria-label="Game paused"]').count(), 1, `${gameId} exposes exactly one host pause screen`);
    // The header difficulty switch is gone; the engine sheet owns it now.
    await pauseDialog.getByRole('button', { name: 'Settings', exact: true }).click();
    const engineDifficulty = page.getByLabel('Difficulty', { exact: true });
    await engineDifficulty.waitFor();
    await engineDifficulty.selectOption('hard');
    assert.equal(await engineDifficulty.inputValue(), 'hard', `${gameId} difficulty is customizable from the settings sheet`);
    await engineDifficulty.selectOption('normal');
    // The engine overlay hosts the sheet inline; its own back button returns to pause.
    await pauseDialog.getByRole('button', { name: 'Back to pause', exact: true }).click();
    const frozen = await signature();
    await page.waitForTimeout(400);
    assert.equal(await signature(), frozen, `${gameId} engine canvas is frozen while paused`);

    await page.keyboard.press('Escape');
    await pauseDialog.waitFor({ state: 'detached' });
    // A difficulty change remounts the engine, and some engines reopen on a
    // start gate, so press through any visible gate before expecting motion.
    const startGate = page.locator('#playable-theater-stage button:visible').first();
    if (await startGate.count()) await startGate.click();
    const resumed = await signature();
    // Remounted engines may show a READY countdown before motion starts.
    let resumedAnimating = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(250);
      if (await signature() !== resumed) { resumedAnimating = true; break; }
    }
    assert.ok(resumedAnimating, `${gameId} engine resumes animation after Escape`);

    await page.getByRole('button', { name: 'Close Theater' }).click();
    await page.locator('#playable-theater-modal').waitFor({ state: 'detached' });
    console.log(`PASS ${gameId} React engine pauses on Escape with one frozen frame and resumes animating`);
  }

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log(`PASS all ${games.length} React-engine games share one Escape pause screen; zero browser errors`);
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
