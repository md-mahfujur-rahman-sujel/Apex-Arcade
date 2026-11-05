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
await page.goto(`${origin}/assets/games/46-nuts-bolts/index.html?test=1`);
await page.waitForFunction(() => typeof BoltsTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = BoltsTest;
    const save = () => Save.load('nuts-bolts');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    /* Planks stack on one point; only the top bolt is free, so the whole
       stack has to be unscrewed from the top down. */
    const stack = (n, color = 0) => Array.from({ length: n }, (_, i) => ({ x: 240, y: 260, a: 0, l: 200 + i, w: 38, gone: false, h: [{ t: 0, c: color, on: true }] }));
    const clearStack = (n) => { for (let i = n - 1; i >= 0; i--) T.take(i, 0); return T.state(); };

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.lockedMaster = T.setMode('master');
    out.modeAfterLock = T.getMode();
    out.initial = T.state();

    /* Coverage and a refused tap on a buried bolt. */
    T.setBoard({ planks: [
      { x: 240, y: 320, a: 0, l: 200, w: 38, gone: false, h: [{ t: 0, c: 0, on: true }] },
      { x: 240, y: 300, a: 0, l: 200, w: 38, gone: false, h: [{ t: 60, c: 1, on: true }] },
    ], level: 1 });
    T.start();
    out.covers = [T.blocked(0, 0), T.blocked(1, 0)];
    out.tapBlocked = T.tap(240, 320);
    out.afterBlocked = T.state();
    out.tapOpen = T.tap(300, 300);

    /* Classic: three bolts, one match, level 1. */
    T.setMode('classic');
    out.classicStart = T.setBoard({ planks: stack(3), level: 1, elapsed: 0 });
    out.classic = clearStack(3);
    out.classicModal = T.modalOpen();
    out.classicAch = ach().slice();
    out.classicBest = stats().bestScoreClassic;
    T.close();
    out.masterUnlock = T.setMode('master');
    out.masterMode = T.getMode();

    /* Masterclass: a take, an undo, then a three-bolt clear. */
    out.masterStart = T.setBoard({ planks: stack(3), level: 3, elapsed: 20000 });
    out.masterTaken = T.take(2, 0);
    out.masterUndone = T.undo();
    out.master = clearStack(3);
    out.masterModal = T.modalOpen();
    T.close();

    /* Relaxed: six bolts, two matches, level 2. */
    T.setMode('relaxed');
    out.relaxedStart = T.setBoard({ planks: stack(6), level: 2, elapsed: 0 });
    out.relaxed = clearStack(6);
    T.close();

    /* Blitz: 90-second clock, 86 seconds spent. */
    T.setMode('blitz');
    out.blitzStart = T.setBoard({ planks: stack(3), level: 1, elapsed: 86000 });
    out.blitz = clearStack(3);
    T.close();

    /* Precision: no undo at all. */
    T.setMode('precision');
    out.precisionStart = T.setBoard({ planks: stack(6), level: 4, elapsed: 30000 });
    T.take(5, 0);
    out.precisionNoUndo = T.undo();
    out.precision = clearStack(6);
    T.close();

    /* One long stack plus four short Classic clears. */
    T.setMode('classic');
    out.bigStart = T.setBoard({ planks: stack(18), level: 1, elapsed: 0 });
    out.big = clearStack(18);
    T.close();
    out.extras = [];
    for (let i = 0; i < 4; i++) {
      T.setBoard({ planks: stack(3), level: 1, elapsed: 0 });
      out.extras.push(clearStack(3));
      T.close();
    }

    /* Blitz timeout: the clock can end a level. */
    T.setMode('blitz');
    out.timeoutStart = T.startLevel(1);
    T.setRun({ started: true });
    out.timeout = T.tick(90000);
    out.timeoutModal = T.modalOpen();
    T.close();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'nuts-bolts:wood-ebony');
    out.skin = T.colors();
    T.cosmetic('palette', 'nuts-bolts:bench-night');
    out.palette = T.colors();
    T.cosmetic('effect', 'nuts-bolts:glow-cyan');
    out.accent = T.colors();
    T.cosmetic('theme', 'nuts-bolts:tray-rose');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'relaxed', 'blitz', 'precision', 'master']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.lockedMaster, false, 'Masterclass stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.equal(data.initial.mode, 'classic');
  assert.equal(data.initial.level, 1);
  assert.equal(data.initial.trayCap, 6);
  assert.equal(data.initial.menuPaused, true, 'the menu pauses a fresh bench');
  assert.equal(data.initial.started, false);

  assert.deepEqual(data.covers, [true, false], 'only the top bolt is free');
  assert.equal(data.tapBlocked.bolts, 2, 'a covered bolt refuses the tap');
  assert.equal(data.afterBlocked.trayUsed, 0);
  assert.equal(data.afterBlocked.runBolts, 0);
  assert.equal(data.tapOpen.bolts, 1);
  assert.equal(data.tapOpen.trayUsed, 1);

  assert.equal(data.classicStart.mode, 'classic');
  assert.equal(data.classic.won, true);
  assert.equal(data.classic.score, 630, '3 bolts + 1 match + 400 + level 1');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  assert.equal(data.classicBest, 630);
  assert.ok(data.classicAch.includes('first-clear'), 'Bench Hand unlocked');
  assert.ok(data.classicAch.includes('speed-clear'), 'Quick Hands unlocked');
  assert.ok(data.classicAch.includes('clean-hands'), 'Clean Hands unlocked');
  assert.equal(data.masterUnlock, true, 'a Classic clear unlocks Masterclass');
  assert.equal(data.masterMode, 'master');

  assert.equal(data.masterStart.mode, 'master');
  assert.equal(data.masterStart.trayCap, 5);
  assert.equal(data.masterTaken.bolts, 2);
  assert.equal(data.masterTaken.trayUsed, 1);
  assert.equal(data.masterUndone.bolts, 3, 'undo restores the bolt');
  assert.equal(data.masterUndone.trayUsed, 0, 'undo frees the tray slot');
  assert.equal(data.masterUndone.runUndos, 1);
  assert.equal(data.master.won, true);
  assert.equal(data.master.score, 715, '4 bolts + 1 match + 550 less one undo');
  assert.equal(data.masterModal, true);
  assert.equal(data.ach.includes('master-clear'), true, 'Master Mechanic unlocked');

  assert.equal(data.relaxedStart.mode, 'relaxed');
  assert.equal(data.relaxedStart.trayCap, 8);
  assert.equal(data.relaxed.won, true);
  assert.equal(data.relaxed.score, 860, '6 bolts + 2 matches + 500');
  assert.ok(data.ach.includes('relaxed-clear'), 'Easy Does It unlocked');
  assert.ok(data.ach.includes('triple-crown'), 'Triple Crown unlocked at three modes');

  assert.equal(data.blitzStart.mode, 'blitz');
  assert.equal(data.blitzStart.clock, 4, 'Blitz carries a 90-second clock');
  assert.equal(data.blitz.won, true);
  assert.equal(data.blitz.score, 800, '3 bolts + 1 match + 450 + 170 clock bonus');
  assert.ok(data.ach.includes('blitz-clear'), 'Blitz Bench unlocked');

  assert.equal(data.precisionStart.mode, 'precision');
  assert.equal(data.precisionStart.trayCap, 5);
  assert.equal(data.precisionNoUndo.bolts, 5, 'undone? no — Precision keeps the bolt');
  assert.equal(data.precisionNoUndo.runUndos, 0);
  assert.equal(data.precisionNoUndo.trayUsed, 1);
  assert.equal(data.precision.won, true);
  assert.equal(data.precision.score, 960, '6 bolts + 2 matches + 600');
  assert.ok(data.ach.includes('precision-clear'), 'Steady Hands unlocked');
  assert.ok(data.ach.includes('all-modes'), 'Toolbox Complete unlocked in every mode');

  assert.equal(data.bigStart.mode, 'classic');
  assert.equal(data.big.won, true);
  assert.equal(data.big.score, 1530, '18 bolts + 6 matches + 450');
  for (let i = 0; i < 4; i++) {
    assert.equal(data.extras[i].won, true);
    assert.equal(data.extras[i].score, 630);
  }
  assert.ok(data.ach.includes('bolt-collector'), 'Bolt Collector unlocked past 50 bolts');
  assert.ok(data.ach.includes('ten-clear'), 'Ten Benches unlocked at ten career clears');

  assert.equal(data.timeoutStart.mode, 'blitz');
  assert.equal(data.timeout.done, true);
  assert.equal(data.timeout.won, false, 'the Blitz clock can end a level');
  assert.equal(data.timeout.clock, 0);
  assert.equal(data.timeout.score, 0);
  assert.equal(data.timeout.overReason, 'time');
  assert.equal(data.timeoutModal, true);

  assert.equal(data.stats.bestScore, 1530);
  assert.equal(data.stats.plays, 11);
  assert.equal(data.stats.secondsPlayed, 226);
  assert.equal(data.stats.lastResult, 'Lost');
  assert.equal(data.stats.lastMode, 'blitz');
  assert.equal(data.stats.wins, 10);
  assert.equal(data.stats.losses, 1);
  assert.equal(data.stats.levelsCleared, 10);
  assert.equal(data.stats.bolts, 52);
  assert.equal(data.stats.matches, 17);
  assert.equal(data.stats.undos, 1);
  assert.equal(data.stats.level, 4, 'the level record keeps the deepest win');
  assert.equal(data.stats.classicWins, 6);
  assert.equal(data.stats.relaxedWins, 1);
  assert.equal(data.stats.blitzWins, 1);
  assert.equal(data.stats.precisionWins, 1);
  assert.equal(data.stats.masterWins, 1);
  assert.equal(data.stats.bestScoreClassic, 1530);
  assert.equal(data.stats.bestScoreRelaxed, 860);
  assert.equal(data.stats.bestScoreBlitz, 800);
  assert.equal(data.stats.bestScorePrecision, 960);
  assert.equal(data.stats.bestScoreMaster, 715);
  assert.equal(data.stats.bestTimeClassic, undefined, 'a zero-second run sets no time record');
  assert.equal(data.stats.bestTimeBlitz, 86);
  assert.equal(data.stats.bestTimePrecision, 30);
  assert.equal(data.stats.bestTimeMaster, 20);
  for (const id of ['first-clear', 'speed-clear', 'clean-hands', 'bolt-collector', 'five-levels', 'triple-crown', 'ten-clear', 'blitz-clear', 'relaxed-clear', 'precision-clear', 'master-clear', 'all-modes']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.equal(data.ach.length, 12, 'Nuts & Bolts ships 12 achievements');

  assert.equal(data.defaults.skin, 'wood-pine', 'the pine planks are equipped by default');
  assert.equal(data.defaults.light, '#d9a066');
  assert.equal(data.defaults.dark, '#a8703a');
  assert.equal(data.defaults.palette, 'bench-slate');
  assert.equal(data.defaults.top, '#26304f');
  assert.equal(data.defaults.bottom, '#141a30');
  assert.equal(data.defaults.effect, 'glow-amber');
  assert.equal(data.defaults.glow, 'rgba(251,191,36,.85)');
  assert.equal(data.defaults.theme, 'tray-slate');
  assert.equal(data.defaults.tray, '#0c1226');
  assert.equal(data.skin.light, '#6a5548', 'ebony repaints the planks');
  assert.equal(data.skin.dark, '#3a2c24');
  assert.equal(data.palette.top, '#171a26', 'the night bench repaints the backdrop');
  assert.equal(data.palette.bottom, '#0a0c14');
  assert.equal(data.accent.glow, 'rgba(34,211,238,.85)', 'the cyan ring repaints the bolts');
  assert.equal(data.theme.tray, '#24101a', 'rose repaints the tray');
  assert.equal(data.cosmetics.length, 16, 'Nuts & Bolts ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { BoltsTest.setMode('classic'); BoltsTest.restart(); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    help: document.getElementById('bk-help') ? document.getElementById('bk-help').open : null,
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
    paused: BoltsTest.state().menuPaused,
  }));
  assert.equal(chrome.help, false, 'the help box stays collapsed after play');
  assert.equal(chrome.shell, false, 'no button bar or help box covers the bench');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(chrome.paused, false, 'play unpauses the bench');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
