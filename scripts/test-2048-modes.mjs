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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, reducedMotion: 'reduce' });
const errors = [];
try {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`${message.text()} (${message.location().url})`); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204, body: '' }));
  await page.goto(`${origin}/assets/aistudio/42-2048.html`);
  const enter = page.locator('#bk-dlg').getByRole('button', { name: 'Enter the Foundry' });
  if (await enter.count()) await enter.click();

  await page.locator('#mode').selectOption('daily');
  const dailyStart = await page.evaluate(() => ({
    date: runDate,
    seed: seedState,
    goal: dailyGoal(),
    tiles: G.map(({ v, r, c }) => `${v}:${r}:${c}`).join('|'),
    label: document.querySelector('#goal')?.textContent,
  }));
  assert.match(dailyStart.label, new RegExp(`Daily Core · Reach ${dailyStart.goal} · 80 moves left`));
  for (const direction of [0, 3, 2, 1]) {
    const changed = await page.evaluate((value) => move(value), direction);
    if (changed) await page.waitForTimeout(150);
  }
  await page.locator('#new').click();
  const dailyRetry = await page.evaluate(() => ({
    date: runDate,
    seed: seedState,
    goal: dailyGoal(),
    tiles: G.map(({ v, r, c }) => `${v}:${r}:${c}`).join('|'),
  }));
  assert.deepEqual(dailyRetry, { date: dailyStart.date, seed: dailyStart.seed, goal: dailyStart.goal, tiles: dailyStart.tiles }, 'Daily Core retry preserves date seed, goal, and initial board');
  console.log('PASS Daily Core uses the date goal and retry restores the same seeded board');

  await page.locator('#mode').selectOption('trial');
  const trialStart = await page.evaluate(() => ({
    mode: runMode,
    index: trialIndex,
    target: TRIALS[trialIndex].tile,
    limit: TRIALS[trialIndex].moves,
    label: document.querySelector('#goal')?.textContent,
  }));
  assert.equal(trialStart.mode, 'trial');
  assert.equal(trialStart.index, 0);
  assert.match(trialStart.label, new RegExp(`Foundry trial 1 / 30 · Reach ${trialStart.target} · ${trialStart.limit} moves left`));

  await page.evaluate(() => {
    G = [{ id: 1, v: 8, r: 0, c: 0 }, { id: 2, v: 8, r: 0, c: 1 }];
    id = 2; moves = 0; score = 0; hist = []; over = false; won = false; draw();
  });
  assert.equal(await page.evaluate(() => move(0)), true, 'A valid merge move is accepted in the trial');
  await page.waitForFunction(() => document.querySelector('#bk-dlg h2')?.textContent === 'Trial 1 cleared!');
  const savedTrial = await page.evaluate(() => Save.load('2048'));
  assert.equal(savedTrial.stats.merge2048.trialWins, 1);
  assert.deepEqual(savedTrial.stats.merge2048.completedTrials, [1]);
  assert.equal(savedTrial.stars['1'], 3, 'Completing the target in the minimum move count earns three stars');
  console.log('PASS Foundry Trial target, move limit, win record, completion, and star award');

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS 2048 mode tests completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
