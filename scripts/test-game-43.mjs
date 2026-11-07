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
await page.goto(`${origin}/assets/games/43-sudoku/index.html?test=1`);
await page.waitForFunction(() => typeof SudokuTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = SudokuTest;
    const save = () => Save.load('sudoku');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    const win = (opts) => { if (opts) T.setRun(opts); const state = T.complete(); out.lastModal = T.modalOpen(); T.close(); return state; };

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.lockedDiag = T.setMode('diagonal');
    out.lockedExpert = T.setMode('expert');
    out.modeAfterLock = T.getMode();

    /* Classic solve: 120 seconds, clean, no hints. */
    T.setMode('classic'); T.restart();
    out.classicStart = T.state();
    out.classic = win({ elapsed: 120000 });
    out.classicAch = ach().slice();

    /* A Classic win unlocks Diagonal and Expert. */
    out.diagUnlock = T.setMode('diagonal');
    out.modeAfterDiag = T.getMode();
    T.restart();
    out.diagonal = win({ elapsed: 120000 });

    /* Blitz: a 60-second solve leaves 240 seconds of the clock. */
    T.setMode('blitz'); T.restart();
    out.blitzStart = T.state();
    out.blitz = win({ elapsed: 60000 });

    /* Zen: the clock and hint limit are removed. */
    T.setMode('zen'); T.restart();
    out.zenStart = T.state();
    out.zen = win({ elapsed: 30000 });

    /* Expert: hints are disabled, 26 clues, three mistakes allowed. */
    T.setMode('expert'); T.restart();
    out.expertStart = T.state();
    out.expertHint = T.hint();
    out.expert = win({ elapsed: 120000 });

    /* Five more Classic solves push the career to ten wins. */
    T.setMode('classic');
    for (let i = 0; i < 5; i++) { T.restart(); out['extra' + i] = win({ elapsed: 120000 }); }

    /* Expert ends after the third mistake. */
    T.setMode('expert'); T.restart(); T.setRun({ elapsed: 45000 });
    const soln = T.solution(), puz = T.puzzle();
    const cell = puz.findIndex((v) => !v);
    const right = soln[cell];
    const wrongs = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter((n) => n !== right).slice(0, 3);
    T.select(cell);
    wrongs.forEach((n) => T.place(n));
    out.mistakeOut = T.state();
    out.mistakeModal = T.modalOpen();
    T.close();

    /* Blitz runs out of time with the grid unfinished. */
    T.setMode('blitz'); T.restart();
    T.setRun({ elapsed: 300000 });
    out.timeout = T.tick(0);
    out.timeoutModal = T.modalOpen();
    T.close();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'sudoku:ink-ember');
    out.skin = T.colors();
    T.cosmetic('palette', 'sudoku:paper-night');
    out.palette = T.colors();
    T.cosmetic('effect', 'sudoku:glow-rose');
    out.effect = T.colors();
    T.cosmetic('theme', 'sudoku:frame-rose');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'zen', 'diagonal', 'expert']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.lockedDiag, false, 'Diagonal stays locked before a Classic win');
  assert.equal(data.lockedExpert, false, 'Expert stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');

  assert.equal(data.classicStart.mode, 'classic');
  assert.equal(data.classicStart.done, false);
  assert.equal(data.classicStart.menuPaused, false, 'restart starts the clock');
  assert.ok(data.classicStart.clues <= 32, 'Classic caps clues at 32');
  assert.equal(data.classic.done, true);
  assert.equal(data.classic.won, true);
  assert.equal(data.classic.score, 1360, '120-second Classic solve');
  assert.equal(data.classic.elapsed, 120);
  assert.equal(data.classic.filled, 81);
  assert.equal(data.lastModal, true, 'the result dialog opens');
  for (const id of ['first-solve', 'no-mistakes', 'speed-solve', 'hint-free']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the first solve');
  }

  assert.equal(data.diagUnlock, true, 'a Classic win unlocks Diagonal');
  assert.equal(data.modeAfterDiag, 'diagonal');
  assert.equal(data.diagonal.won, true);
  assert.equal(data.diagonal.score, 1560, '120-second Diagonal solve');
  assert.ok(data.ach.includes('diagonal-clear'), 'Diagonal Adept unlocked');

  assert.equal(data.blitzStart.mode, 'blitz');
  assert.equal(data.blitzStart.clock, 300, 'Blitz carries a five-minute clock');
  assert.equal(data.blitz.won, true);
  assert.equal(data.blitz.score, 1760, '60-second Blitz solve leaves 240 seconds');
  assert.equal(data.blitz.clock, 240);
  assert.ok(data.ach.includes('blitz-clear'), 'Blitz Solver unlocked');

  assert.equal(data.zenStart.mode, 'zen');
  assert.equal(data.zen.won, true);
  assert.equal(data.zen.score, 600, 'Zen solves bank a flat score');
  assert.ok(data.ach.includes('zen-clear'), 'Zen Solver unlocked');
  assert.ok(data.ach.includes('triple-crown'), 'Triple Crown unlocked at three career wins');

  assert.equal(data.expertStart.mode, 'expert');
  assert.equal(data.expertHint.hints, 0, 'Expert refuses hints');
  assert.ok(data.expert.clues <= 26, 'Expert caps clues at 26');
  assert.equal(data.expert.won, true);
  assert.equal(data.expert.score, 2160, '120-second Expert solve');
  for (const id of ['expert-clear', 'marathon', 'all-modes']) {
    assert.ok(data.ach.includes(id), id + ' unlocked by the Expert solve');
  }

  for (let i = 0; i < 5; i++) {
    assert.equal(data['extra' + i].won, true);
    assert.equal(data['extra' + i].score, 1360);
  }
  assert.ok(data.ach.includes('ten-wins'), 'Ten Wins unlocked at ten career wins');

  assert.equal(data.mistakeOut.done, true);
  assert.equal(data.mistakeOut.won, false, 'the third mistake ends an Expert run');
  assert.equal(data.mistakeOut.mistakes, 3);
  assert.equal(data.mistakeOut.score, 0);
  assert.equal(data.mistakeModal, true);

  assert.equal(data.timeout.done, true);
  assert.equal(data.timeout.won, false, 'the Blitz clock can end a run');
  assert.equal(data.timeout.clock, 0);
  assert.equal(data.timeout.score, 0);
  assert.equal(data.timeoutModal, true);

  assert.equal(data.stats.bestScore, 2160);
  assert.equal(data.stats.plays, 12);
  assert.equal(data.stats.secondsPlayed, 1395);
  assert.equal(data.stats.lastResult, 'Lost');
  assert.equal(data.stats.lastMode, 'blitz');
  assert.equal(data.stats.wins, 10);
  assert.equal(data.stats.losses, 2);
  assert.equal(data.stats.solves, 10);
  assert.equal(data.stats.mistakes, 3);
  assert.equal(data.stats.hints, 0);
  assert.equal(data.stats.classicWins, 6);
  assert.equal(data.stats.blitzWins, 1);
  assert.equal(data.stats.zenWins, 1);
  assert.equal(data.stats.diagonalWins, 1);
  assert.equal(data.stats.expertWins, 1);
  assert.equal(data.stats.hintFree, 10);
  assert.equal(data.stats.perfect, 10);
  assert.equal(data.stats.bestScoreClassic, 1360);
  assert.equal(data.stats.bestScoreBlitz, 1760);
  assert.equal(data.stats.bestScoreZen, 600);
  assert.equal(data.stats.bestScoreDiagonal, 1560);
  assert.equal(data.stats.bestScoreExpert, 2160);
  assert.equal(data.stats.bestTimeClassic, 120);
  assert.equal(data.stats.bestTimeDiagonal, 120);
  assert.equal(data.stats.bestTimeExpert, 120);
  assert.equal(data.stats.bestTimeZen, 30);
  for (const id of ['first-solve', 'no-mistakes', 'speed-solve', 'hint-free', 'blitz-clear', 'zen-clear', 'diagonal-clear', 'expert-clear', 'marathon', 'triple-crown', 'ten-wins', 'all-modes']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.equal(data.ach.length, 12, 'Sudoku ships 12 achievements');

  assert.equal(data.defaults.skin, 'ink-classic', 'the classic ink is equipped by default');
  assert.equal(data.defaults.user, '#7dd3fc');
  assert.equal(data.defaults.palette, 'paper-slate');
  assert.equal(data.defaults.effect, 'glow-cyan');
  assert.equal(data.defaults.theme, 'frame-slate');
  assert.equal(data.skin.user, '#fb923c', 'the ember ink repaints player digits');
  assert.equal(data.palette.cell, '#0d1018', 'night paper repaints the cells');
  assert.equal(data.palette.peer, '#141828');
  assert.equal(data.effect.selected, '#5a1e37', 'rose focus repaints the selection');
  assert.equal(data.theme.frame, '#e8a6c4', 'the rose frame repaints the grid lines');
  assert.equal(data.theme.aura, 'rgba(244,114,182,.35)');
  assert.equal(data.cosmetics.length, 16, 'Sudoku ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { SudokuTest.setMode('classic'); SudokuTest.restart(); });
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
  }));
  assert.equal(chrome.help, false, 'the help box stays collapsed after play');
  assert.equal(chrome.shell, false, 'no button bar or help box covers the grid');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
