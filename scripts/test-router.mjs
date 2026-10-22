import { chromium } from 'playwright';
import { preview } from 'vite';
import { access } from 'node:fs/promises';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browserPaths = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of browserPaths) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try the next installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
const check = async (hash, selector, text) => {
  await page.goto(`${origin}/${hash}`);
  await page.locator(selector).first().waitFor({ state: 'visible', timeout: 10000 });
  if (text && !(await page.locator(selector).first().innerText()).includes(text)) throw new Error(`${hash}: expected ${JSON.stringify(text)} in ${selector}`);
};

try {
  await check('#/', '#catalog');
  await check('#/browse?mode=Classic&len=short&players=1P&input=keyboard&tag=logic&mood=elemental&q=2048', '#catalog');
  if (await page.getByPlaceholder('Search title, genre, rules…').inputValue() !== '2048') throw new Error('Browse q parameter did not initialize the search control');
  const filters = page.locator('#catalog label select');
  for (const [index, label, value] of [[1, 'Players', '1P'], [2, 'Session', 'short'], [3, 'Mode', 'Classic'], [4, 'Input', 'keyboard'], [5, 'Tag', 'logic']]) {
    if (await filters.nth(index).inputValue() !== value) throw new Error(`Browse ${label} parameter did not initialize its control`);
  }
  await page.getByText('Merge 2048', { exact: true }).first().waitFor({ state: 'visible' });
  await check('#/game/flappy-bird', 'h1', 'Glowmoth Gauntlet');
  await check('#/game/not-a-game', 'h1', 'Game not found');
  await check('#/play/flappy-bird?mode=classic&diff=hard', '#playable-theater-modal');
  if (new URL(page.url()).hash !== '#/play/flappy-bird?mode=classic&diff=hard') throw new Error('Play route query was not preserved');
  await check('#/profile', '#profile');
  await check('#/quests', 'h1', 'Quests');
  await check('#/collections', 'h1', 'Collections');
  await check('#/collections/favorites', 'h1', 'Collections');
  await check('#/settings', 'h1', 'Settings');
  await check('#/unknown', 'h1', 'Page not found');
  await page.goto(`${origin}/#/`);
  await page.locator('[data-card-dossier]').first().click();
  await page.locator('[data-dossier-backdrop]').waitFor({ state: 'visible' });
  await page.locator('[data-dossier-backdrop]').click({ position: { x: 4, y: 4 } });
  await page.locator('[data-dossier-backdrop]').waitFor({ state: 'hidden' });

  await page.goto(`${origin}/#game=flappy-bird`);
  await page.waitForFunction(() => location.hash === '#/play/flappy-bird');
  await page.locator('#playable-theater-modal').waitFor({ state: 'visible' });
  await page.locator('#playable-theater-modal [data-ui-close]').click();
  await page.waitForFunction(() => location.hash === '#/');

  await page.goto(`${origin}/#/game/flappy-bird`);
  await page.getByRole('button', { name: /play now/i }).click();
  await page.waitForFunction(() => location.hash === '#/play/flappy-bird');
  await page.locator('#playable-theater-modal [data-ui-close]').click();
  await page.waitForFunction(() => location.hash === '#/game/flappy-bird');
  await page.getByRole('button', { name: /play now/i }).click();
  await page.waitForFunction(() => location.hash === '#/play/flappy-bird');
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#/game/flappy-bird');
  await page.goForward();
  await page.waitForFunction(() => location.hash === '#/play/flappy-bird');
  await page.goBack();
  await page.waitForFunction(() => location.hash === '#/game/flappy-bird');

  await page.goto(`${origin}/#/settings`);
  await page.getByRole('button', { name: /current theme/i }).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.getByRole('button', { name: /return home/i }).click();
  await page.waitForFunction(() => location.hash === '#/');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('Router verification passed: direct route loads, legacy redirect, not-found states, back/forward, play close, and theme persistence across navigation.');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
