import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage();
const errors = [];
try {
  await page.addInitScript(() => { localStorage.removeItem('apex:meta'); localStorage.removeItem('apex_arcade_stats_v2'); localStorage.removeItem('apex_arcade_stats_v1'); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}/#/game/flappy-bird`);
  await page.getByRole('heading', { name: 'Glowmoth Gauntlet' }).waitFor({ state: 'visible' });
  await page.getByRole('button', { name: /play now/i }).click();
  await page.locator('#playable-theater-modal').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Play Glowmoth Gauntlet', exact: true }).click();
  const frame = page.frameLocator('#playable-theater-modal iframe');
  await frame.locator('canvas').first().waitFor({ state: 'visible' });
  await page.waitForFunction(() => {
    const frame = document.querySelector('#playable-theater-modal iframe');
    return frame?.contentWindow?.Arcade?.test?.G?.ui?.controls?.isConnected;
  });
  await page.locator('#playable-theater-modal iframe').evaluate((iframe) => {
    const game = iframe.contentWindow.Arcade.test.G;
    game.begin();
    game.over('Meta integration check', 'synthetic test result');
  });
  await page.waitForFunction(() => {
    const state = JSON.parse(localStorage.getItem('apex:meta') || 'null');
    return Boolean(state && state.xp > 0 && state.sparks > 0);
  }, null, { timeout: 5000 });
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('apex:meta')));
  if (saved.xp < 10 || saved.sparks < 2) throw new Error(`Unexpected session reward: xp=${saved.xp}, sparks=${saved.sparks}`);
  await page.goto(`${origin}/#/profile`);
  await page.locator('#profile').waitFor({ state: 'visible' });
  await page.waitForFunction(({ xp, sparks }) => document.querySelector('[data-profile-meta]')?.textContent?.includes(`${xp} XP`) && document.querySelector('[data-profile-sparks]')?.textContent?.includes(String(sparks)), { xp: saved.xp, sparks: saved.sparks });
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('Meta profile verification passed: a real game iframe session_end wrote XP/Sparks through Meta, and Profile displayed both with zero browser errors.');
} finally {
  await browser.close(); await new Promise((resolve) => server.httpServer.close(resolve));
}
