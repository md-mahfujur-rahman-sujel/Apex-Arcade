import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const origin = 'http://127.0.0.1:4173';
const distRoot = path.resolve('dist');
await access(path.join(distRoot, 'index.html'));

async function routeProductionFiles(context) {
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
      const contentType = ({
        '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
        '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
        '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
      })[ext] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType, body: await readFile(resolvedPath) });
    } catch {
      await route.fulfill({ status: 404, body: `Not found: ${pathname}` });
    }
  });
  await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'text/css; charset=utf-8',
    body: '',
  }));
}

const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
await routeProductionFiles(context);
const page = await context.newPage();
const errors = [];
try {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.addInitScript(() => {
    const now = new Date().toISOString();
    localStorage.setItem('apex_arcade_stats_v2', JSON.stringify({
      totalPlayCount: 3, totalTimeSeconds: 480, highScores: {}, favorites: [], achievements: {}, levelProgress: { celeste: 2 },
      recentSessions: [
        { gameId: 'flappy-bird', gameTitle: 'Sky Hopper', score: 8, date: now, durationSeconds: 120 },
        { gameId: 'pong', gameTitle: 'Holo-Pong', score: 4, date: now, durationSeconds: 180 },
        { gameId: 'snake', gameTitle: 'Neon Serpent', score: 20, date: now, durationSeconds: 180 },
      ],
    }));
  });
  await page.goto(origin);
  const home = page.getByRole('region', { name: 'Arcade home' });
  const removedSections = ['Recently played', 'Daily Gauntlet', 'New and updated', 'Quick 5-minute games', 'Local two-player', 'Because you played', 'Boss Rush playlists', 'Adrenaline rush', '5-minute fun', 'With friends', 'Timeless classics', 'Just relax', 'Train your brain', 'Retro tributes', 'Board night', 'Brain games'];
  for (const section of removedSections) assert.equal(await home.getByRole('region', { name: section }).count(), 0, `removed home section should stay hidden: ${section}`);
  const categoryButtons = home.getByRole('button', { name: /^Browse / });
  assert.equal(await categoryButtons.count(), 6, 'home shows five catalog categories plus Recommended games');
  const arcadeButton = home.getByRole('button', { name: /^Browse Arcade, \d+ games$/ });
  assert.equal(await arcadeButton.count(), 1, 'Arcade category is available from the home strip');
  const arcadeCount = Number((await arcadeButton.getAttribute('aria-label')).match(/(\d+) games$/)?.[1]);
  assert.ok(arcadeCount > 0, 'Arcade category reports its catalog count');
  assert.ok(await home.getByRole('button', { name: /^Browse Recommended games, [1-9]\d* games$/ }).count() === 1, 'Recommended games remains populated for players with history');
  assert.equal(await home.locator('[aria-label="Continue playing"]').getByRole('button', { name: /^Continue .* at level 3$/ }).count(), 1, 'Continue uses saved level progress');
  assert.equal(await page.locator('[aria-label="Arcade home"] section[aria-label] h2:empty').count(), 0, 'no blank home section headings render');
  await arcadeButton.click();
  await page.waitForFunction(() => location.hash === '#/browse?category=arcade');
  await page.locator('#catalog [data-catalog-card]').first().waitFor();
  assert.equal(await page.locator('#catalog [data-catalog-card]').count(), arcadeCount, 'category card opens the matching filtered catalog');
  await page.evaluate(() => { location.hash = '#/'; });
  await page.locator('[aria-label="Continue playing"]').waitFor();
  await page.locator('[aria-label="Continue playing"]').getByRole('button', { name: /^Continue .* at level 3$/ }).click();
  await page.waitForFunction(() => location.hash === '#/play/celeste?level=3');
  const emptyContext = await browser.newContext();
  await routeProductionFiles(emptyContext);
  const emptyPage = await emptyContext.newPage();
  await emptyPage.goto(origin);
  assert.equal(await emptyPage.getByRole('region', { name: 'Continue playing' }).count(), 0, 'Continue stays hidden without saved level progress');
  assert.ok(await emptyPage.getByRole('button', { name: /^Browse Recommended games, [1-9]\d* games$/ }).count() === 1, 'new players still get a curated recommendation mix');
  await emptyContext.close();
  for (const [path, signature] of [
    ['/assets/aistudio/43-sudoku.html', () => [...document.querySelectorAll('#bd .c')].map((cell) => `${cell.textContent}:${cell.className}`).join('|')],
    ['/assets/aistudio/44-minesweeper.html', () => [...document.querySelectorAll('#bd .k')].map((cell) => `${cell.textContent}:${cell.className}`).join('|')],
    ['/assets/aistudio/50-mahjong.html', () => [...document.querySelectorAll('#board .tile')].map((cell) => cell.getAttribute('aria-label')).join('|')],
  ]) {
    const sample = async (seed) => {
      const gameContext = await browser.newContext({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
      await routeProductionFiles(gameContext);
      const gamePage = await gameContext.newPage();
      const gameErrors = [];
      gamePage.on('pageerror', (error) => gameErrors.push(error.message));
      gamePage.on('console', (message) => { if (message.type() === 'error') gameErrors.push(message.text()); });
      await gamePage.goto(`${origin}${path}?seed=${seed}`);
      const launchMenu = gamePage.locator('.apex-menu-root');
      if (await launchMenu.count()) {
        await launchMenu.locator('[data-menu-action="play"]').click();
        await launchMenu.waitFor({ state: 'hidden' });
      }
      if (path.includes('44-minesweeper')) await gamePage.locator('#bd .k[data-i="0"]').click();
      await gamePage.waitForTimeout(50);
      const result = await gamePage.evaluate(signature);
      await gameContext.close();
      assert.deepEqual(gameErrors, [], `${path} browser errors`);
      return result;
    };
    const first = await sample(987654321);
    assert.ok(first.length > 0, `${path} generated a board`);
    assert.equal(await sample(987654321), first, `${path} repeats board generation for the same seed`);
    assert.notEqual(await sample(123456789), first, `${path} changes board generation for a different seed`);
    console.log(`PASS ${path.split('/').at(-1)} produces repeatable seeded board layouts`);
  }
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log(`PASS Home categories filter the catalog; removed duplicate rails stay hidden; recommendations render with and without history; Continue launches saved level progress`);
  console.log('PASS Home layout browser test completed with zero browser errors');
} finally {
  await context.close();
  await browser.close();
}
