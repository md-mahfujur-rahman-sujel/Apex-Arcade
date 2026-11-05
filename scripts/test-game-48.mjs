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
await page.goto(`${origin}/assets/games/48-fruit-merge/index.html?test=1`);
await page.waitForFunction(() => typeof DropTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = DropTest;
    const save = () => Save.load('fruit-merge');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    /* Two same-level fruits at one spot merge on the next tick. */
    const pair = (l) => { T.clear(); T.spawn(l, 200, 500); T.spawn(l, 201, 500); T.step(16); return T.state(); };
    const run = (levels) => { T.setBoard({ elapsed: 0 }); for (const l of levels) pair(l); return T.state(); };

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.lockedZen = T.setMode('zen');
    out.modeAfterLock = T.getMode();
    out.initial = T.state();
    T.spawn(0, 200, 500); T.spawn(0, 201, 500);
    out.pausedStep = T.step(500);
    out.pausedFruits = T.fruits().length;
    T.clear();

    /* Classic: eight merges, +10 +50 +70 +80 +90 +500 +500 +500. */
    T.start();
    out.classicStart = T.setBoard({ elapsed: 0 });
    out.classic = run([0, 4, 6, 7, 8, 9, 9, 9]);
    out.classic = T.finish();
    out.classicAch = ach().slice();
    out.classicModal = T.modalOpen();
    T.close();
    out.zenUnlock = T.setMode('zen');
    out.zenMode = T.getMode();

    /* Blitz: +500 +10, then the 90-second clock runs out. */
    T.setMode('blitz');
    out.blitzStart = run([9, 0]);
    out.blitz = T.tick(90000);
    out.blitzModal = T.modalOpen();
    T.close();

    /* Tiny Basket: +90 +500. */
    T.setMode('tiny');
    out.tinyStart = run([8, 9]);
    out.tiny = T.finish();
    T.close();

    /* Big Harvest: +80 +500. */
    T.setMode('harvest');
    out.harvestStart = run([7, 9]);
    out.harvest = T.finish();
    T.close();

    /* Zen: +70 +500, cashed out by hand. */
    T.setMode('zen');
    out.zenStart = run([6, 9]);
    out.zen = T.finish();
    T.close();

    /* Classic overflow ends the run with a full basket. */
    T.setMode('classic');
    out.overflowStart = T.setBoard({ elapsed: 0 });
    out.overflow = T.overflow();
    out.overflowModal = T.modalOpen();
    T.close();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'fruit-merge:wood-maple');
    out.skin = T.colors();
    T.cosmetic('palette', 'fruit-merge:dusk-night');
    out.palette = T.colors();
    T.cosmetic('effect', 'fruit-merge:aim-lime');
    out.accent = T.colors();
    T.cosmetic('theme', 'fruit-merge:pill-mint');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'tiny', 'harvest', 'zen']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.lockedZen, false, 'Zen stays locked before a 600-point Classic run');
  assert.equal(data.modeAfterLock, 'classic');
  assert.equal(data.initial.mode, 'classic');
  assert.equal(data.initial.menuPaused, true, 'the menu pauses a fresh basket');
  assert.equal(data.initial.started, false);
  assert.equal(data.pausedStep.merges, 0, 'the menu blocks merges');
  assert.equal(data.pausedFruits, 2, 'paused fruit never touches');

  assert.equal(data.classicStart.mode, 'classic');
  assert.equal(data.classic.score, 1800, '8 merges + 10+50+70+80+90 + 500x3');
  assert.equal(data.classic.bestFruit, 9, 'watermelon reached');
  assert.equal(data.classic.best, 1800);
  assert.equal(data.classicModal, true, 'the result dialog opens');
  for (const id of ['first-merge', 'pear-tree', 'pineapple', 'melon', 'watermelon', 'score-500', 'score-1000']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the Classic run');
  }
  assert.equal(data.zenUnlock, true, 'a 1,800-point Classic run unlocks Zen');
  assert.equal(data.zenMode, 'zen');

  assert.equal(data.blitzStart.mode, 'blitz');
  assert.equal(data.blitzStart.clock, 90);
  assert.equal(data.blitz.score, 510, 'a watermelon crash and a cherry merge');
  assert.equal(data.blitz.over, true);
  assert.equal(data.blitz.overReason, 'time', 'the Blitz clock ends the run');
  assert.equal(data.blitz.time, 90);
  assert.equal(data.blitzModal, true);

  assert.equal(data.tinyStart.mode, 'tiny');
  assert.equal(data.tiny.score, 590, 'a melon merge and a watermelon crash');
  assert.equal(data.tiny.overReason, 'cashout');

  assert.equal(data.harvestStart.mode, 'harvest');
  assert.equal(data.harvest.score, 580, 'a pineapple merge and a watermelon crash');

  assert.equal(data.zenStart.mode, 'zen');
  assert.equal(data.zen.score, 570, 'a peach merge and a watermelon crash');
  assert.equal(data.zen.overReason, 'cashout');

  assert.equal(data.overflowStart.mode, 'classic');
  assert.equal(data.overflow.score, 0);
  assert.equal(data.overflow.over, true);
  assert.equal(data.overflow.overReason, 'overflow');
  assert.equal(data.overflowModal, true);

  assert.equal(data.stats.bestScore, 1800);
  assert.equal(data.stats.plays, 6);
  assert.equal(data.stats.secondsPlayed, 90, 'only the Blitz run spends clock time');
  assert.equal(data.stats.lastResult, 'Overflow');
  assert.equal(data.stats.lastMode, 'classic');
  assert.equal(data.stats.runs, 6);
  assert.equal(data.stats.merges, 16);
  assert.equal(data.stats.drops, 0);
  assert.equal(data.stats.classicRuns, 2);
  assert.equal(data.stats.blitzRuns, 1);
  assert.equal(data.stats.tinyRuns, 1);
  assert.equal(data.stats.harvestRuns, 1);
  assert.equal(data.stats.zenRuns, 1);
  assert.equal(data.stats.bestFruit, 9);
  assert.equal(data.stats.bestScoreClassic, 1800);
  assert.equal(data.stats.bestScoreBlitz, 510);
  assert.equal(data.stats.bestScoreTiny, 590);
  assert.equal(data.stats.bestScoreHarvest, 580);
  assert.equal(data.stats.bestScoreZen, 570);
  assert.equal(data.stats.bestFruitClassic, 9);
  for (const id of ['first-merge', 'pear-tree', 'pineapple', 'melon', 'watermelon', 'score-500', 'score-1000', 'blitz-run', 'tiny-run', 'harvest-run', 'zen-run', 'all-modes']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.equal(data.ach.length, 12, 'Orchard Drop ships 12 achievements');

  assert.equal(data.defaults.skin, 'wood-oak', 'the oak basket is equipped by default');
  assert.deepEqual(data.defaults.wood, ['#a8692f', '#7c4a21', '#5a3416']);
  assert.equal(data.defaults.palette, 'dusk-default');
  assert.deepEqual(data.defaults.sky, ['#1b2547', '#3a2b5c', '#1d1530']);
  assert.equal(data.defaults.effect, 'aim-cyan');
  assert.equal(data.defaults.aim, '#67e8f9');
  assert.equal(data.defaults.theme, 'pill-slate');
  assert.equal(data.defaults.pill, 'rgba(10,8,24,.55)');
  assert.deepEqual(data.skin.wood, ['#c08a4a', '#94602f', '#6a4420'], 'maple repaints the basket planks');
  assert.deepEqual(data.palette.sky, ['#0f1428', '#221c38', '#0a0914'], 'the night orchard repaints the sky');
  assert.equal(data.accent.aim, '#a3e635', 'the lime guide repaints the aim line');
  assert.equal(data.theme.pill, 'rgba(6,32,26,.62)', 'mint repaints the next-fruit card');
  assert.equal(data.cosmetics.length, 16, 'Orchard Drop ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { DropTest.setMode('classic'); DropTest.restart(); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    help: document.getElementById('bk-help') ? document.getElementById('bk-help').open : null,
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
    paused: DropTest.state().menuPaused,
  }));
  assert.equal(chrome.help, false, 'the help box stays collapsed after play');
  assert.equal(chrome.shell, false, 'no button bar or help box covers the basket');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(chrome.paused, false, 'play unpauses the basket');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
