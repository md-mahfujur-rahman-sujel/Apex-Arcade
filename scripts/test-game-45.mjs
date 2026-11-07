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
await page.goto(`${origin}/assets/games/45-sliding-puzzle/index.html?test=1`);
await page.waitForFunction(() => typeof SlideTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = SlideTest;
    const save = () => Save.load('sliding-puzzle');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    const win = (elapsed, moves, undos) => { T.setRun({ elapsed, moves, undos }); const state = T.complete(); out.lastModal = T.modalOpen(); T.close(); return state; };

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.lockedMirror = T.setMode('mirror');
    out.modeAfterLock = T.getMode();
    out.initial = T.state();

    /* A hand-built 3×3 checks slides, undo, and refused moves. */
    out.fixture = T.setBoard({ n: 3, values: [1, 2, 3, 4, 5, 6, 7, 0, 8] });
    out.goal3 = T.goal();
    out.slid = T.slide(6);
    out.boardAfterSlide = T.board().slice();
    out.undone = T.undo();
    out.boardAfterUndo = T.board().slice();
    out.refused = T.slide(0);
    out.boardAfterRefused = T.board().slice();

    /* Classic: a 60-second, 100-move solve. */
    T.setMode('classic');
    T.restart();
    out.classicStart = T.state();
    out.classic = win(60000, 100, 0);
    out.classicAch = ach().slice();
    out.classicBest = stats().bestScoreClassic;
    out.mirrorUnlock = T.setMode('mirror');
    out.mirrorStart = T.restart();

    /* Sprint: 3×3 on a 90-second clock. */
    T.setMode('sprint');
    out.sprintStart = T.restart();
    out.sprint = win(30000, 50, 0);

    /* Zen: 5×5 with two undos. */
    T.setMode('zen');
    out.zenStart = T.restart();
    out.zen = win(120000, 200, 2);

    /* Daily: the shared 4×4 shuffle. */
    T.setMode('daily');
    out.dailyStart = T.restart();
    out.daily = win(90000, 80, 0);

    /* Mirror: descending order. */
    T.setMode('mirror');
    out.mirrorStart = T.restart();
    out.mirrorGoal = T.goal().slice();
    out.mirror = win(60000, 120, 0);

    for (let i = 0; i < 5; i++) {
      T.setMode('classic');
      T.restart();
      out['extra' + i] = win(60000, 100, 0);
    }

    /* Sprint timeout: the clock can end a run. */
    T.setMode('sprint');
    T.restart();
    T.setBoard({ n: 3, values: T.board() });
    out.timeout = T.tick(90000);
    out.timeoutModal = T.modalOpen();
    T.close();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'sliding-puzzle:tiles-ember');
    out.skin = T.colors();
    T.cosmetic('palette', 'sliding-puzzle:board-night');
    out.palette = T.colors();
    T.cosmetic('effect', 'sliding-puzzle:glow-cyan');
    out.accent = T.colors();
    T.cosmetic('theme', 'sliding-puzzle:ink-ember');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'sprint', 'zen', 'mirror', 'daily']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.lockedMirror, false, 'Mirror stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.equal(data.initial.mode, 'classic');
  assert.equal(data.initial.n, 4);
  assert.equal(data.initial.menuPaused, true, 'the menu pauses a fresh grid');
  assert.equal(data.initial.started, false);

  assert.deepEqual(data.goal3, [1, 2, 3, 4, 5, 6, 7, 8, 0]);
  assert.deepEqual(data.boardAfterSlide, [1, 2, 3, 4, 5, 6, 0, 7, 8], 'a same-row tile slides into the gap');
  assert.equal(data.slid.moves, 1);
  assert.equal(data.undone.moves, 0, 'undo rewinds the move count');
  assert.equal(data.undone.undos, 1);
  assert.deepEqual(data.boardAfterUndo, [1, 2, 3, 4, 5, 6, 7, 0, 8]);
  assert.equal(data.refused.moves, 0, 'a tile off the gap line is refused');
  assert.deepEqual(data.boardAfterRefused, [1, 2, 3, 4, 5, 6, 7, 0, 8]);

  assert.equal(data.classicStart.mode, 'classic');
  assert.equal(data.classicStart.n, 4);
  assert.equal(data.classicStart.order, 'asc');
  assert.equal(data.classic.won, true);
  assert.equal(data.classic.time, 60);
  assert.equal(data.classic.score, 1520, '60-second Classic solve in 100 moves');
  assert.equal(data.lastModal, true, 'the result dialog opens');
  assert.equal(data.classicBest, 1520);
  for (const id of ['first-solve', 'low-move', 'speed-solve', 'no-undo']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the Classic solve');
  }
  assert.equal(data.mirrorUnlock, true, 'a Classic win unlocks Mirror');

  assert.equal(data.mirrorStart.mode, 'mirror');
  assert.deepEqual(data.mirrorGoal.slice(0, 3), [0, 15, 14], 'Mirror solves 15 down to 1');

  assert.equal(data.sprintStart.mode, 'sprint');
  assert.equal(data.sprintStart.n, 3);
  assert.equal(data.sprintStart.clock, 90, 'Sprint carries a 90-second clock');
  assert.equal(data.sprint.won, true);
  assert.equal(data.sprint.score, 1160, '30-second Sprint solve with 60 left');
  assert.equal(data.sprint.clock, 60);
  assert.ok(data.ach.includes('sprint-clear'), 'Sprint Slider unlocked');

  assert.equal(data.zenStart.n, 5);
  assert.equal(data.zen.won, true);
  assert.equal(data.zen.score, 760, 'Zen banks 800 less two undos');
  assert.ok(data.ach.includes('zen-clear'), 'Zen Slider unlocked');
  assert.ok(data.ach.includes('five-grid'), 'Wide Grid unlocked on 5×5');
  assert.ok(data.ach.includes('triple-crown'), 'Triple Crown unlocked at three modes');

  assert.equal(data.dailyStart.mode, 'daily');
  assert.ok(data.dailyStart.dailySeed > 0, 'Daily carries a date seed');
  assert.equal(data.daily.won, true);
  assert.equal(data.daily.score, 1310, '90-second Daily solve');
  assert.ok(data.ach.includes('daily-clear'), 'Daily Tiles unlocked');

  assert.equal(data.mirror.won, true);
  assert.equal(data.mirror.score, 2220, '60-second Mirror solve in 120 moves');
  assert.ok(data.ach.includes('mirror-clear'), 'Mirror Finish unlocked');
  assert.ok(data.ach.includes('all-modes'), 'Complete Slider unlocked in every mode');

  for (let i = 0; i < 5; i++) {
    assert.equal(data['extra' + i].won, true);
    assert.equal(data['extra' + i].score, 1520);
  }
  assert.ok(data.ach.includes('ten-wins'), 'Ten Solves unlocked at ten career wins');

  assert.equal(data.timeout.done, true);
  assert.equal(data.timeout.won, false, 'the Sprint clock can end a run');
  assert.equal(data.timeout.clock, 0);
  assert.equal(data.timeout.score, 0);
  assert.equal(data.timeoutModal, true);

  assert.equal(data.stats.bestScore, 2220);
  assert.equal(data.stats.plays, 11);
  assert.equal(data.stats.secondsPlayed, 750);
  assert.equal(data.stats.lastResult, 'Lost');
  assert.equal(data.stats.lastMode, 'sprint');
  assert.equal(data.stats.wins, 10);
  assert.equal(data.stats.losses, 1);
  assert.equal(data.stats.solves, 10);
  assert.equal(data.stats.moves, 1050);
  assert.equal(data.stats.undos, 2);
  assert.equal(data.stats.classicWins, 6);
  assert.equal(data.stats.sprintWins, 1);
  assert.equal(data.stats.zenWins, 1);
  assert.equal(data.stats.dailyWins, 1);
  assert.equal(data.stats.mirrorWins, 1);
  assert.equal(data.stats.bestScoreClassic, 1520);
  assert.equal(data.stats.bestScoreSprint, 1160);
  assert.equal(data.stats.bestScoreZen, 760);
  assert.equal(data.stats.bestScoreDaily, 1310);
  assert.equal(data.stats.bestScoreMirror, 2220);
  assert.equal(data.stats.bestTimeClassic, 60);
  assert.equal(data.stats.bestTimeSprint, 30);
  assert.equal(data.stats.bestTimeZen, 120);
  assert.equal(data.stats.bestTimeDaily, 90);
  assert.equal(data.stats.bestTimeMirror, 60);
  assert.equal(data.stats.bestMovesClassic, 100);
  assert.equal(data.stats.bestMovesSprint, 50);
  assert.equal(data.stats.bestMovesZen, 200);
  assert.equal(data.stats.bestMovesDaily, 80);
  assert.equal(data.stats.bestMovesMirror, 120);
  for (const id of ['first-solve', 'low-move', 'speed-solve', 'no-undo', 'sprint-clear', 'zen-clear', 'daily-clear', 'mirror-clear', 'five-grid', 'triple-crown', 'ten-wins', 'all-modes']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.equal(data.ach.length, 12, 'Slide Tiles ships 12 achievements');

  assert.equal(data.defaults.skin, 'tiles-classic', 'the classic tiles are equipped by default');
  assert.equal(data.defaults.hue, '190');
  assert.equal(data.defaults.sat, '75%');
  assert.equal(data.defaults.light, '68%');
  assert.equal(data.defaults.palette, 'board-slate');
  assert.equal(data.defaults.board, '#2a2f45');
  assert.equal(data.defaults.effect, 'glow-green');
  assert.equal(data.defaults.glow, 'rgba(74,222,128,.7)');
  assert.equal(data.defaults.theme, 'ink-navy');
  assert.equal(data.defaults.ink, '#0b1220');
  assert.equal(data.skin.hue, '20', 'the ember tiles repaint every number');
  assert.equal(data.palette.board, '#171b2b', 'the night board repaints the frame');
  assert.equal(data.accent.glow, 'rgba(34,211,238,.7)', 'the cyan glow repaints placed tiles');
  assert.equal(data.theme.ink, '#2a1208', 'ember ink repaints the digits');
  assert.equal(data.theme.aura, 'rgba(251,146,60,.28)');
  assert.equal(data.cosmetics.length, 16, 'Slide Tiles ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { SlideTest.setMode('classic'); SlideTest.restart(); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  // Play gates the run behind the beginning animation: the live-run chrome only
  // settles once that gate has released.
  await page.waitForFunction(() => window.ApexIntroRunning !== true, null, { timeout: 20000 });
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    help: document.getElementById('bk-help') ? document.getElementById('bk-help').open : null,
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
    paused: SlideTest.state().menuPaused,
  }));
  assert.equal(chrome.help, false, 'the help box stays collapsed after play');
  assert.equal(chrome.shell, false, 'no button bar or help box covers the grid');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(chrome.paused, false, 'play unpauses the board');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
