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
await page.goto(`${origin}/assets/games/44-minesweeper/index.html?test=1`);
await page.waitForFunction(() => typeof MineTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = MineTest;
    const save = () => Save.load('minesweeper');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    const win = (elapsed) => { if (elapsed != null) T.setRun({ elapsed }); const state = T.complete(); out.lastModal = T.modalOpen(); T.close(); return state; };

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.lockedNoFlags = T.setMode('noflags');
    out.lockedEvil = T.setMode('evil');
    out.modeAfterLock = T.getMode();
    out.initial = T.state();

    /* A hand-built field checks flagging and chording inside a mine pocket. */
    const pocket = [];
    for (let i = 0; i < 25; i++) if (![6, 7, 11, 12, 24].includes(i)) pocket.push(i);
    T.setBoard({ w: 5, h: 5, mines: pocket });
    out.board = T.state();
    out.revealedOne = T.reveal(6);
    out.chordNoFlags = T.chord(6);
    [0, 1, 2, 5, 10].forEach((i) => T.flag(i));
    out.flagged = T.state();
    out.chorded = T.chord(6);

    /* The first click is always safe. */
    T.setMode('classic'); T.restart();
    out.classicStart = T.state();
    out.firstClick = T.reveal(136);

    /* Classic clear at 120 seconds. */
    T.restart();
    out.classic = win(120000);
    out.classicAch = ach().slice();

    /* A Classic clear unlocks the two advanced modes. */
    out.noFlagsUnlock = T.setMode('noflags');
    out.evilUnlock = T.setMode('evil');
    out.modeAfterUnlock = T.getMode();

    /* Sprint: a 30-second clear leaves a full minute on the clock. */
    T.setMode('sprint'); T.restart();
    out.sprintStart = T.state();
    out.sprint = win(30000);

    /* Zen: the first mine is defused, the next one would end the run. */
    T.setMode('zen'); T.restart();
    T.setRun({ elapsed: 10000 });
    out.zenBoom = T.boom();
    out.zenAch = ach().slice();
    out.zen = win(45000);

    /* No Flag: flagging is refused. */
    T.setMode('noflags'); T.restart();
    out.noFlagStart = T.state();
    out.noFlagHidden = document.getElementById('fl').hidden;
    out.noFlagAttempt = T.flag(10);
    out.noFlags = win(120000);

    /* Evil: the dense 55-mine field. */
    T.setMode('evil'); T.restart();
    out.evilStart = T.state();
    out.evil = win(120000);

    /* Five more Classic clears reach ten career wins. */
    T.setMode('classic');
    for (let i = 0; i < 5; i++) { T.restart(); out['extra' + i] = win(120000); }

    /* Sprint times out. */
    T.setMode('sprint'); T.restart();
    T.setRun({ elapsed: 90000 });
    out.timeout = T.tick(0);
    out.timeoutModal = T.modalOpen();
    T.close();

    /* Evil ends on a mine. */
    T.setMode('evil'); T.restart();
    T.setRun({ elapsed: 60000 });
    out.boom = T.boom();
    out.boomModal = T.modalOpen();
    T.close();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'minesweeper:tile-ember');
    out.skin = T.colors();
    T.cosmetic('palette', 'minesweeper:board-night');
    out.palette = T.colors();
    T.cosmetic('effect', 'minesweeper:focus-cyan');
    out.effect = T.colors();
    T.cosmetic('theme', 'minesweeper:hud-mint');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'sprint', 'zen', 'noflags', 'evil']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.lockedNoFlags, false, 'No Flag stays locked before a Classic clear');
  assert.equal(data.lockedEvil, false, 'Evil stays locked before a Classic clear');
  assert.equal(data.modeAfterLock, 'classic');
  assert.equal(data.initial.w, 16);
  assert.equal(data.initial.h, 16);
  assert.equal(data.initial.mines, 40);
  assert.equal(data.initial.revealed, 0);
  assert.equal(data.initial.done, false);
  assert.equal(data.initial.menuPaused, true, 'the menu pauses a fresh field');

  assert.equal(data.board.w, 5);
  assert.equal(data.board.mines, 20);
  assert.equal(data.revealedOne.revealed, 1, 'a numbered cell opens alone');
  assert.equal(data.chordNoFlags.revealed, 1, 'a chord needs matching flags');
  assert.equal(data.flagged.flags, 5);
  assert.equal(data.chorded.revealed, 4, 'a matching chord opens every neighbour');
  assert.equal(data.chorded.done, false);

  assert.equal(data.classicStart.mode, 'classic');
  assert.equal(data.firstClick.started, true);
  assert.equal(data.firstClick.done, false);
  assert.ok(data.firstClick.revealed >= 1, 'the first click always opens a safe region');

  assert.equal(data.classic.won, true);
  assert.equal(data.classic.time, 120);
  assert.equal(data.classic.score, 960, '120-second Classic clear');
  assert.equal(data.lastModal, true, 'the result dialog opens');
  assert.ok(data.classicAch.includes('first-clear'), 'First Field unlocked');
  assert.ok(data.classicAch.includes('clean-sweep'), 'Clean Sweep unlocked');

  assert.equal(data.noFlagsUnlock, true, 'a Classic clear unlocks No Flag');
  assert.equal(data.evilUnlock, true, 'a Classic clear unlocks Evil');

  assert.equal(data.sprintStart.mode, 'sprint');
  assert.equal(data.sprintStart.clock, 90, 'Sprint carries a 90-second clock');
  assert.equal(data.sprintStart.w, 9);
  assert.equal(data.sprint.won, true);
  assert.equal(data.sprint.score, 980, '30-second Sprint clear');
  assert.equal(data.sprint.clock, 60);
  assert.ok(data.ach.includes('sprint-clear'), 'Sprint Sweeper unlocked');
  assert.ok(data.ach.includes('speed-clear'), 'Quick Sweep unlocked');

  assert.equal(data.zenBoom.done, false, 'the first Zen mine is defused');
  assert.equal(data.zenBoom.won, false);
  assert.equal(data.zenBoom.defuses, 0);
  assert.equal(data.zenBoom.flags, 1, 'the defused mine is marked');
  assert.ok(data.zenAch.includes('defused'), 'Defused unlocked immediately');
  assert.equal(data.zen.won, true);
  assert.equal(data.zen.score, 500, 'Zen clears bank a flat score');
  assert.ok(data.ach.includes('zen-clear'), 'Zen Sweeper unlocked');
  assert.ok(data.ach.includes('triple-crown'), 'Triple Crown unlocked at three modes');

  assert.equal(data.noFlagStart.mode, 'noflags');
  assert.equal(data.noFlagHidden, true, 'the flag button is hidden in No Flag');
  assert.equal(data.noFlagAttempt.flags, 0, 'flagging is refused in No Flag');
  assert.equal(data.noFlags.won, true);
  assert.equal(data.noFlags.score, 1560, '120-second No Flag clear');
  assert.ok(data.ach.includes('noflag-clear'), 'Bare Hands unlocked');

  assert.equal(data.evilStart.mines, 55);
  assert.equal(data.evil.won, true);
  assert.equal(data.evil.score, 2460, '120-second Evil clear');
  for (const id of ['evil-clear', 'career-five', 'all-modes']) {
    assert.ok(data.ach.includes(id), id + ' unlocked by the Evil clear');
  }

  for (let i = 0; i < 5; i++) {
    assert.equal(data['extra' + i].won, true);
    assert.equal(data['extra' + i].score, 960);
  }
  assert.ok(data.ach.includes('ten-wins'), 'Ten Fields unlocked at ten career wins');

  assert.equal(data.timeout.done, true);
  assert.equal(data.timeout.won, false, 'the Sprint clock can end a run');
  assert.equal(data.timeout.clock, 0);
  assert.equal(data.timeout.score, 0);
  assert.equal(data.timeoutModal, true);

  assert.equal(data.boom.done, true);
  assert.equal(data.boom.won, false, 'Evil ends on a mine');
  assert.equal(data.boom.score, 0);
  assert.equal(data.boomModal, true);

  assert.equal(data.stats.bestScore, 2460);
  assert.equal(data.stats.plays, 12);
  assert.equal(data.stats.secondsPlayed, 1185);
  assert.equal(data.stats.lastResult, 'Lost');
  assert.equal(data.stats.lastMode, 'evil');
  assert.equal(data.stats.wins, 10);
  assert.equal(data.stats.losses, 2);
  assert.equal(data.stats.fieldsCleared, 10);
  assert.equal(data.stats.mines, 2, 'one defused mine and one fatal mine');
  assert.equal(data.stats.flagsPlaced, 0);
  assert.equal(data.stats.chords, 0);
  assert.equal(data.stats.defuses, 1);
  assert.equal(data.stats.classicWins, 6);
  assert.equal(data.stats.sprintWins, 1);
  assert.equal(data.stats.zenWins, 1);
  assert.equal(data.stats.noflagsWins, 1);
  assert.equal(data.stats.evilWins, 1);
  assert.equal(data.stats.bestScoreClassic, 960);
  assert.equal(data.stats.bestScoreSprint, 980);
  assert.equal(data.stats.bestScoreZen, 500);
  assert.equal(data.stats.bestScoreNoflags, 1560);
  assert.equal(data.stats.bestScoreEvil, 2460);
  assert.equal(data.stats.bestTimeClassic, 120);
  assert.equal(data.stats.bestTimeSprint, 30);
  assert.equal(data.stats.bestTimeZen, 45);
  assert.equal(data.stats.bestTimeNoflags, 120);
  assert.equal(data.stats.bestTimeEvil, 120);
  for (const id of ['first-clear', 'clean-sweep', 'speed-clear', 'sprint-clear', 'zen-clear', 'noflag-clear', 'evil-clear', 'defused', 'career-five', 'triple-crown', 'ten-wins', 'all-modes']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.equal(data.ach.length, 12, 'Minefield ships 12 achievements');

  assert.equal(data.defaults.skin, 'tile-graphite', 'the graphite tiles are equipped by default');
  assert.equal(data.defaults.tileA, '#5b6490');
  assert.equal(data.defaults.open, '#181c2e');
  assert.equal(data.defaults.palette, 'board-slate');
  assert.equal(data.defaults.frame, '#2a2f45');
  assert.equal(data.defaults.effect, 'focus-amber');
  assert.equal(data.defaults.focus, '#fde047');
  assert.equal(data.defaults.theme, 'hud-ruby');
  assert.equal(data.defaults.lcd, '#fb7185');
  assert.equal(data.skin.tileA, '#a1583a', 'ember tiles repaint the field');
  assert.equal(data.skin.open, '#2a1712');
  assert.equal(data.palette.frame, '#1b2033', 'the night board repaints the frame');
  assert.equal(data.effect.focus, '#67e8f9', 'the cyan cursor repaints the selection');
  assert.equal(data.theme.lcd, '#34d399', 'the mint HUD repaints the counters');
  assert.equal(data.theme.aura, 'rgba(52,211,153,.28)');
  assert.equal(data.cosmetics.length, 16, 'Minefield ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { MineTest.setMode('classic'); MineTest.restart(); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    help: document.getElementById('bk-help') ? document.getElementById('bk-help').open : null,
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.help, false, 'the help box stays collapsed after play');
  assert.equal(chrome.shell, false, 'no button bar or help box covers the field');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
