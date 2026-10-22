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
const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
const errors = [];
try {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.addInitScript(() => {
    localStorage.setItem('apex_arcade_stats_v2', JSON.stringify({
      totalPlayCount: 2, totalTimeSeconds: 120, highScores: { 'flappy-bird': 42 }, favorites: [], recentSessions: [
        { gameId: 'flappy-bird', gameTitle: 'Skyfall Ridge', score: 42, date: 'today', durationSeconds: 60 },
      ], achievements: { 'flappy-bird': ['bronze-medal'] }, levelProgress: { 'flappy-bird': 2 },
    }));
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async (value) => { window.__copiedShareUrl = value; } } });
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  });
  await page.goto(`${origin}/#/browse`);
  await page.locator('[data-game-id]').first().waitFor();
  const gameIds = await page.locator('#catalog [data-game-id]').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-game-id')));
  assert.equal(gameIds.length, 50, 'all 50 game IDs are available in Browse');
  for (const [index, gameId] of gameIds.entries()) {
    await page.evaluate((value) => { location.hash = `#/game/${encodeURIComponent(value)}`; }, gameId);
    const pageRoot = page.locator('[data-game-page]');
    await pageRoot.waitFor();
    await page.waitForFunction((expected) => document.querySelector('[data-game-page]')?.getAttribute('data-game-page') === expected, gameId);
    assert.ok((await page.getByRole('heading', { level: 1 }).textContent())?.trim(), `game ${index + 1} has a title`);
    for (const region of ['overview', 'Available modes', 'Controls diagram', 'Achievement preview', 'Your stats', 'Related games']) {
      assert.equal(await page.getByRole('region', { name: region }).count(), 1, `game ${index + 1} has ${region}`);
      assert.ok((await page.getByRole('region', { name: region }).innerText()).trim().length > 0, `game ${index + 1} ${region} is populated`);
    }
    assert.ok(await page.locator('[data-card-scene-canvas]').count(), `game ${index + 1} has a live preview canvas`);
    await page.waitForFunction(() => {
      const canvas = document.querySelector('canvas[data-card-scene-canvas]');
      if (!canvas || !canvas.width || !canvas.height) return false;
      const ctx = canvas.getContext('2d');
      if (!ctx) return false;
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let i = 3; i < pixels.length; i += 4) if (pixels[i] > 0) return true;
      return false;
    }, undefined, { timeout: 5000 }).catch(() => { throw new Error(`game ${index + 1} preview canvas has no rendered pixels`); });
    assert.ok(await page.getByRole('button', { name: 'Play now' }).count(), `game ${index + 1} has Play`);
  }
  await page.goto(`${origin}/#/game/flappy-bird`);
  await page.getByRole('button', { name: 'Share game' }).click();
  await page.waitForFunction(() => window.__copiedShareUrl?.includes('#/game/flappy-bird'));
  assert.equal(await page.getByRole('button', { name: 'Link copied' }).count(), 1, 'share action provides copied-link feedback');
  await page.locator('[data-related-game]').first().click();
  await page.waitForFunction(() => location.hash.startsWith('#/game/') && location.hash !== '#/game/flappy-bird');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS all 50 game pages show a live preview, modes, controls, achievement preview, player stats, and related games');
  console.log('PASS share copies a deep link with feedback; related game links navigate; zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
