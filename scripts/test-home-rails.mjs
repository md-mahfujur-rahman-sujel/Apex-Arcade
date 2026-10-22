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
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
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
  const expectedVisibleRails = ['Continue playing', 'Daily Gauntlet', 'Recently played', 'New and updated', 'Quick 5-minute games', 'Local two-player', 'Because you played', 'Boss Rush playlists', 'Adrenaline rush', '5-minute fun', 'With friends', 'Timeless classics', 'Train your brain', 'Just relax', 'Retro tributes', 'Brain games', 'Board night'];
  for (const rail of expectedVisibleRails) assert.equal(await home.getByRole('region', { name: rail }).count(), 1, `expected populated rail: ${rail}`);
  assert.equal(await home.locator('[aria-label="Daily Gauntlet"] [data-recommendation-card]').count(), 3, 'Gauntlet contains three verified seed-capable games');
  assert.equal(await home.locator('[aria-label="Continue playing"]').getByRole('button', { name: /^Continue .* at level 3$/ }).count(), 1, 'Continue uses saved level progress');
  assert.equal(await home.locator('[aria-label="Recently played"] [data-recommendation-card]').count(), 3);
  assert.ok(await home.locator('[aria-label="Because you played"] [data-recommendation-card]').count() > 0);
  assert.equal(await page.locator('[aria-label="Arcade home"] section[aria-label] h2:empty').count(), 0, 'no blank rail headings render');
  await home.getByRole('region', { name: 'Daily Gauntlet' }).locator('button[data-ui-open]').first().click();
  await page.waitForFunction(() => /^#\/play\/.+\?seed=\d+$/.test(location.hash));
  const dailySeed = await page.evaluate(() => new URLSearchParams(location.hash.split('?')[1]).get('seed'));
  await page.getByRole('button', { name: /^Play / }).click();
  await page.waitForFunction((seed) => document.querySelector('iframe')?.src.includes(`seed=${seed}`), dailySeed);
  await page.evaluate(() => { location.hash = '#/'; });
  await page.locator('[aria-label="Continue playing"]').getByRole('button', { name: /^Continue .* at level 3$/ }).click();
  await page.waitForFunction(() => location.hash === '#/play/celeste?level=3');
  const emptyContext = await browser.newContext();
  const emptyPage = await emptyContext.newPage();
  await emptyPage.goto(origin);
  assert.equal(await emptyPage.getByRole('region', { name: 'Continue playing' }).count(), 0, 'Continue stays hidden without saved level progress');
  await emptyContext.close();
  for (const [path, signature] of [
    ['/assets/aistudio/43-sudoku.html', () => [...document.querySelectorAll('#bd .c')].map((cell) => `${cell.textContent}:${cell.className}`).join('|')],
    ['/assets/aistudio/44-minesweeper.html', () => [...document.querySelectorAll('#bd .k')].map((cell) => `${cell.textContent}:${cell.className}`).join('|')],
    ['/assets/aistudio/50-mahjong.html', () => [...document.querySelectorAll('#board .tile')].map((cell) => cell.getAttribute('aria-label')).join('|')],
  ]) {
    const sample = async (seed) => {
      const gamePage = await browser.newPage({ viewport: { width: 1280, height: 1000 }, reducedMotion: 'reduce' });
      const gameErrors = [];
      gamePage.on('pageerror', (error) => gameErrors.push(error.message));
      gamePage.on('console', (message) => { if (message.type() === 'error') gameErrors.push(message.text()); });
      await gamePage.goto(`${origin}${path}?seed=${seed}`);
      if (path.includes('44-minesweeper')) await gamePage.locator('#bd .k[data-i="0"]').click();
      await gamePage.waitForTimeout(50);
      const result = await gamePage.evaluate(signature);
      await gamePage.close();
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
  console.log(`PASS Home rails render from game metadata and three recent sessions (${expectedVisibleRails.length} populated rails); Continue launches saved level progress; unsupported empty rails stay hidden`);
  console.log('PASS Home rail browser test completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
