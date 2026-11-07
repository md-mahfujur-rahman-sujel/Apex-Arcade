import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}${(server.config.base || '/').replace(/\/$/, '')}`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch {} }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1200, height: 950 } });
await context.addInitScript(() => { try { localStorage.clear(); } catch {} });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.location().url.includes('favicon')) errors.push(m.text() + ' @ ' + m.location().url); });
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(r.status() + ' ' + r.url()); });
await page.goto(`${origin}/assets/games/42-2048/index.html?test=1`);
await page.waitForFunction(() => typeof MergeTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = MergeTest;
    const save = () => Save.load('2048');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};

    T.setSync(true);
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));

    /* Classic warm-up: two pairs merge in one move. */
    T.setMode('classic');
    T.setGame({ mode: 'classic', size: 4, values: [2, 2, 4, 4, 2, 8, 16, 32, 4, 16, 32, 64, 8, 32, 64, 128] });
    out.merge = T.move(0);
    out.mergeAch = ach().slice();

    /* Classic win: two 2048 cores forge a 4096 overdrive tile. */
    T.setGame({ mode: 'classic', size: 4, score: 0, values: [2048, 2048, 4, 8, 16, 32, 64, 128] });
    out.classic = T.move(0);
    out.classicModal = T.modalOpen();
    out.keep = T.keep();
    T.close();

    /* Foundry Trials: clear ten of them. */
    const trials = T.trials();
    T.setMode('trial');
    for (let i = 0; i < 10; i++) {
      T.setGame({ mode: 'trial', trialIndex: i, values: [trials[i].tile], score: 1000 });
      T.check();
      T.close();
    }
    out.trialsCleared = (stats().merge2048.completedTrials || []).length;
    out.trialWins = stats().merge2048.trialWins;

    /* Daily Core: clear today's goal. */
    T.setMode('daily');
    T.setGame({ mode: 'daily', score: 600, values: [T.dailyGoal()] });
    out.dailyGoal = T.dailyGoal();
    out.daily = T.check();
    T.close();

    /* Zen: a 1024 core earns Zen Core, then a locked board ends the run. */
    T.setMode('zen');
    T.setGame({ mode: 'zen', size: 4, score: 700, values: [1024] });
    T.check();
    out.zenCore = ach().includes('zen-core');
    T.setGame({ mode: 'zen', size: 4, score: 700, values: [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2] });
    out.zen = T.check();
    T.close();

    /* Blitz: a score rush closes when the clock hits zero. */
    T.setMode('blitz');
    T.setGame({ mode: 'blitz', score: 3200, clock: 5, values: [2, 4, 8, 16, 32] });
    T.setClock(1);
    out.blitz = T.tick(2);
    out.blitzModal = T.modalOpen();
    T.close();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', '2048:core-ember');
    out.skin = T.colors();
    T.cosmetic('palette', '2048:foundry-neon');
    out.palette = T.colors();
    T.cosmetic('effect', '2048:glow-cyan');
    out.effect = T.colors();
    T.cosmetic('theme', '2048:sky-rose');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'trial', 'daily', 'zen', 'blitz']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'about', 'stats', 'exit']);

  assert.equal(data.merge.score, 12, 'two pairs merge for 12 points');
  assert.ok(data.merge.tiles.some((t) => t.v === 8), 'the merged row forges an 8');
  assert.equal(data.merge.mode, 'classic');
  for (const id of ['first-merge', 'eightfold', 'chain-reaction']) assert.ok(data.mergeAch.includes(id), id + ' unlocked by the chain merge');

  assert.equal(data.classic.score, 4096, 'merging two 2048 cores banks 4096 points');
  assert.equal(data.classic.biggest, 4096);
  assert.equal(data.classic.won, true, 'classic run reaches the Prime Core');
  assert.equal(data.classic.over, false, 'the board stays open for a keep-going run');
  assert.equal(data.classicModal, true, 'the Prime Core dialog opens');
  assert.equal(data.keep.keep, true, 'the run continues past 2048');
  assert.ok(data.keep.achievements.includes('beyond-core'), 'Beyond the Core unlocked');

  assert.equal(data.trialsCleared, 10, 'ten trials saved');
  assert.equal(data.trialWins, 10, 'ten trial wins recorded');
  assert.equal(data.dailyGoal >= 128, true, 'today carries a daily goal');
  assert.equal(data.daily.won, true, 'the daily goal is cleared');
  assert.equal(data.daily.score, 600);
  assert.ok(data.daily.achievements.includes('daily-spark'), 'Daily Spark unlocked');

  assert.equal(data.zenCore, true, 'Zen Core unlocked at 1024');
  assert.equal(data.zen.over, true, 'a locked Zen board ends');
  assert.equal(data.zen.result, 'game-over');
  assert.equal(data.zen.score, 700, 'the Zen run banks its score');

  assert.equal(data.blitz.over, true, 'the Blitz clock closes the run');
  assert.equal(data.blitz.clock, 0, 'the clock reaches zero');
  assert.equal(data.blitz.score, 3200);
  assert.equal(data.blitzModal, true, 'the Blitz result dialog opens');

  const record = data.stats.merge2048;
  assert.equal(record.runsCompleted, 14, 'five modes across fourteen completed runs');
  assert.equal(record.wins, 12, 'classic, ten trials and daily count as wins');
  assert.equal(record.gameOvers, 1, 'only the Zen board ran out of moves');
  assert.equal(record.totalScore, 18596, 'scores accumulate across every run');
  assert.equal(record.bestTile, 4096, 'the overdrive tile is the best tile');
  assert.equal(record.bestBySize['4'], 4096, 'the 4x4 board keeps the best score');
  assert.equal(record.completedTrials.length, 10);
  assert.equal(record.trialWins, 10);
  assert.equal(record.dailyCompletions, 1);
  assert.equal(record.blitzRuns, 1);
  assert.equal(record.blitzBest, 3200);
  assert.equal(record.zenRuns, 1);
  assert.equal(record.zenBest, 700);
  assert.equal(data.stats.bestScore, 4096, 'the global best score is the classic run');

  for (const id of ['first-merge', 'eightfold', 'century-core', 'prime-core', 'overdrive', 'beyond-core', 'chain-reaction', 'clean-foundry', 'daily-spark', 'blitz-rush', 'zen-core', 'trial-veteran']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }

  assert.equal(data.defaults.skin, 'core-classic');
  assert.equal(data.defaults.tile, '#eee4da', 'the classic core palette is the default');
  assert.equal(data.defaults.palette, 'foundry-dusk');
  assert.equal(data.defaults.effect, 'glow-amethyst');
  assert.equal(data.defaults.theme, 'sky-indigo');
  assert.equal(data.skin.skin, 'core-ember');
  assert.equal(data.skin.tile, '#f5d0b0', 'ember repaints the 2 core');
  assert.equal(data.palette.palette, 'foundry-neon', 'neon repaints the foundry');
  assert.equal(data.effect.effect, 'glow-cyan', 'cyan repaints the core glow');
  assert.equal(data.effect.glow, 'rgba(34,211,238,.5)');
  assert.equal(data.theme.theme, 'sky-rose', 'rose repaints the frame');
  assert.equal(data.cosmetics.length, 16, 'Merge 2048 ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { MergeTest.setMode('classic'); MergeTest.restart(); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  // Play gates the run behind the beginning animation: the live-run chrome only
  // settles once that gate has released.
  await page.waitForFunction(() => window.ApexIntroRunning !== true, null, { timeout: 20000 });
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    helpOpen: document.getElementById('bk-help').open,
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.helpOpen, false, 'the help box is collapsed during play');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
