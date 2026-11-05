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
await page.goto(`${origin}/assets/games/50-mahjong/index.html?test=1`);
await page.waitForFunction(() => typeof MahjongTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = MahjongTest;
    const save = () => Save.load('mahjong');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.lockedMaster = T.setMode('master');
    out.modeAfterLock = T.getMode();
    out.initial = T.state();
    out.pausedSweep = (T.sweep(), T.state());

    /* Assist limits on a throwaway board. */
    T.start();
    out.assistBefore = T.state();
    T.hint();
    out.assistAfterHint = T.state();
    T.shuffle();
    out.assistAfterShuffle = T.state();
    T.undo();
    out.assistAfterUndo = T.state();
    T.restart();
    out.assistReset = T.state();

    /* Classic, 60 seconds. */
    T.start();
    T.setElapsed(60);
    out.classic = T.sweep();
    out.classicModal = T.modalOpen();
    out.classicAch = ach().slice();
    T.close();

    out.masterUnlock = T.setMode('master');
    out.masterMode = T.getMode();
    out.masterStart = T.state();
    T.start();
    T.setElapsed(30);
    out.master = T.sweep();
    out.masterModal = T.modalOpen();
    T.close();

    T.setMode('swift');
    out.swiftStart = T.state();
    T.start();
    T.setElapsed(90);
    out.swift = T.sweep();
    out.swiftModal = T.modalOpen();
    T.close();

    T.setMode('blitz');
    out.blitzStart = T.state();
    T.start();
    T.setElapsed(200);
    out.blitz = T.sweep();
    out.blitzModal = T.modalOpen();
    T.close();

    T.setMode('zen');
    out.zenStart = T.state();
    T.start();
    T.setElapsed(100);
    out.zen = T.sweep();
    out.zenModal = T.modalOpen();
    T.close();

    /* Five more Classic clears: ten career wins in five modes. */
    out.classics = [];
    for (let i = 0; i < 5; i++) {
      T.setMode('classic');
      T.start();
      T.setElapsed(60);
      out.classics.push(T.sweep());
      T.close();
    }

    /* Blitz clock can end a board. */
    T.setMode('blitz');
    out.timeoutStart = T.state();
    T.start();
    T.setElapsed(299);
    out.timeout = T.expire();
    out.timeoutModal = T.modalOpen();
    T.close();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'mahjong:tile-ivory');
    out.skin = T.colors();
    T.cosmetic('palette', 'mahjong:felt-night');
    out.palette = T.colors();
    T.cosmetic('effect', 'mahjong:glow-cyan');
    out.effect = T.colors();
    T.cosmetic('theme', 'mahjong:ink-mint');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'swift', 'blitz', 'zen', 'master']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.lockedMaster, false, 'Master stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.equal(data.initial.mode, 'classic');
  assert.equal(data.initial.tiles, 144);
  assert.equal(data.initial.boardPairs, 72);
  assert.equal(data.initial.pairs, 0);
  assert.equal(data.initial.paused, true, 'the menu pauses a fresh board');
  assert.equal(data.initial.hints, 3);
  assert.equal(data.initial.undos, 3);
  assert.equal(data.initial.shuffles, 1);
  assert.equal(data.pausedSweep.left, 144, 'the menu blocks play');
  assert.equal(data.pausedSweep.pairs, 0);

  assert.equal(data.assistBefore.hints, 3);
  assert.equal(data.assistAfterHint.hints, 2, 'a hint is spent');
  assert.equal(data.assistAfterHint.hintsUsed, 1);
  assert.equal(data.assistAfterShuffle.shuffles, 0, 'a shuffle is spent');
  assert.equal(data.assistAfterShuffle.shufflesUsed, 1);
  assert.equal(data.assistAfterUndo.undos, 3, 'undo with no history costs nothing');
  assert.equal(data.assistAfterUndo.undosUsed, 0);
  assert.equal(data.assistReset.hints, 3, 'a new board restores the allowance');
  assert.equal(data.assistReset.shuffles, 1);
  assert.equal(data.assistReset.hintsUsed, 0);
  assert.equal(data.assistReset.shufflesUsed, 0);
  assert.equal(data.assistReset.left, 144);

  assert.equal(data.classic.won, true);
  assert.equal(data.classic.pairs, 72);
  assert.equal(data.classic.moves, 72);
  assert.equal(data.classic.seconds, 60);
  assert.equal(data.classic.score, 8420, '72 pairs + 500 + 720 time bonus');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  for (const id of ['first-clear', 'no-help', 'shuffle-free', 'quick-clear']) assert.ok(data.classicAch.includes(id), id + ' unlocked by the Classic clear');
  assert.equal(data.classicAch.length, 4);

  assert.equal(data.masterUnlock, true, 'a Classic clear unlocks Master');
  assert.equal(data.masterMode, 'master');
  assert.equal(data.masterStart.hints, 0, 'Master offers no hints');
  assert.equal(data.masterStart.undos, 0, 'Master offers no undos');
  assert.equal(data.masterStart.shuffles, 1);
  assert.equal(data.master.won, true);
  assert.equal(data.master.score, 8510, '72 pairs + 500 + 810 time bonus');
  assert.equal(data.masterModal, true);

  assert.equal(data.swiftStart.tiles, 72);
  assert.equal(data.swiftStart.boardPairs, 36);
  assert.equal(data.swiftStart.hints, 2);
  assert.equal(data.swift.won, true);
  assert.equal(data.swift.pairs, 36);
  assert.equal(data.swift.moves, 36);
  assert.equal(data.swift.score, 4730, '36 pairs + 500 + 630 time bonus');
  assert.equal(data.swiftModal, true);

  assert.equal(data.blitzStart.undos, 2);
  assert.equal(data.blitz.won, true);
  assert.equal(data.blitz.score, 8000, '72 pairs + 500 + 300 time bonus');
  assert.equal(data.blitzModal, true);

  assert.equal(data.zenStart.hints, 5);
  assert.equal(data.zenStart.undos, 99);
  assert.equal(data.zenStart.shuffles, 3);
  assert.equal(data.zen.won, true);
  assert.equal(data.zen.score, 8300, '72 pairs + 500 + 600 time bonus');
  assert.equal(data.zenModal, true);

  for (let i = 0; i < 5; i++) {
    assert.equal(data.classics[i].won, true);
    assert.equal(data.classics[i].score, 8420);
  }

  assert.equal(data.timeout.over, true);
  assert.equal(data.timeout.won, false, 'the Blitz clock can end a board');
  assert.equal(data.timeout.overReason, 'time');
  assert.equal(data.timeout.seconds, 300);
  assert.equal(data.timeout.score, 0);
  assert.equal(data.timeoutModal, true);

  assert.equal(data.stats.bestScore, 8510);
  assert.equal(data.stats.plays, 11);
  assert.equal(data.stats.secondsPlayed, 1080);
  assert.equal(data.stats.lastResult, 'Out of time');
  assert.equal(data.stats.lastMode, 'blitz');
  assert.equal(data.stats.wins, 10);
  assert.equal(data.stats.losses, 1);
  assert.equal(data.stats.matches, 11);
  assert.equal(data.stats.pairs, 684);
  assert.equal(data.stats.hints, 0);
  assert.equal(data.stats.undos, 0);
  assert.equal(data.stats.shuffles, 0);
  assert.equal(data.stats.bestPairs, 72);
  assert.equal(data.stats.classicWins, 6);
  assert.equal(data.stats.swiftWins, 1);
  assert.equal(data.stats.blitzWins, 1);
  assert.equal(data.stats.zenWins, 1);
  assert.equal(data.stats.masterWins, 1);
  assert.equal(data.stats.bestScoreClassic, 8420);
  assert.equal(data.stats.bestScoreSwift, 4730);
  assert.equal(data.stats.bestScoreBlitz, 8000);
  assert.equal(data.stats.bestScoreZen, 8300);
  assert.equal(data.stats.bestScoreMaster, 8510);
  assert.equal(data.stats.bestTimeClassic, 60);
  assert.equal(data.stats.bestTimeSwift, 90);
  assert.equal(data.stats.bestTimeBlitz, 200);
  assert.equal(data.stats.bestTimeZen, 100);
  assert.equal(data.stats.bestTimeMaster, 30);
  assert.equal(data.stats.bestMovesClassic, 72);
  assert.equal(data.stats.bestMovesSwift, 36);
  assert.equal(data.stats.bestMovesBlitz, 72);
  assert.equal(data.stats.bestMovesZen, 72);
  assert.equal(data.stats.bestMovesMaster, 72);
  for (const id of ['first-clear', 'no-help', 'shuffle-free', 'quick-clear', 'five-clears', 'ten-clears', 'swift-clear', 'blitz-clear', 'zen-clear', 'master-clear', 'all-modes', 'pairs-100']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.equal(data.ach.length, 12, 'Mahjong ships 12 achievements');

  assert.equal(data.defaults.skin, 'tile-jade', 'the jade table is equipped by default');
  assert.equal(data.defaults.face1, '#f7f0dc');
  assert.equal(data.defaults.face2, '#e4d6b0');
  assert.equal(data.defaults.edge, '#a98b4e');
  assert.equal(data.defaults.ink, '#1f4d3a');
  assert.equal(data.defaults.palette, 'felt-jade');
  assert.equal(data.defaults.felt1, '#1b4d43');
  assert.equal(data.defaults.felt2, '#0a2622');
  assert.equal(data.defaults.effect, 'glow-gold');
  assert.equal(data.defaults.glow, '#f3c96b');
  assert.equal(data.defaults.theme, 'ink-gold');
  assert.equal(data.defaults.accent, '#f3c96b');
  assert.equal(data.skin.face1, '#fffaf0', 'ivory repaints the tiles');
  assert.equal(data.skin.edge, '#c8b184');
  assert.equal(data.skin.ink, '#2b2b2b');
  assert.equal(data.palette.felt1, '#1a2140', 'the night felt repaints the table');
  assert.equal(data.palette.felt2, '#090c18');
  assert.equal(data.effect.glow, '#22d3ee', 'the cyan glow repaints the selection');
  assert.equal(data.theme.accent, '#7ee0a3', 'mint repaints the HUD accent');
  assert.equal(data.cosmetics.length, 16, 'Mahjong ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { MahjongTest.setMode('classic'); MahjongTest.restart(); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => {
    const first = document.querySelector('.mj-tile.free');
    if (first) first.click();
    return {
      help: document.getElementById('bk-help') ? document.getElementById('bk-help').open : null,
      shell: Boolean(document.querySelector('.bar, .help')),
      menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
      paused: MahjongTest.state().paused,
      tiles: document.querySelectorAll('.mj-tile').length,
      free: document.querySelectorAll('.mj-tile.free').length,
      selected: document.querySelectorAll('.mj-tile.selected').length,
      stage: Boolean(document.getElementById('mj-stage')),
    };
  });
  assert.equal(chrome.help, false, 'the help box stays collapsed after play');
  assert.equal(chrome.shell, false, 'no button bar or help box covers the table');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(chrome.paused, false, 'play unpauses the board');
  assert.equal(chrome.stage, true);
  assert.equal(chrome.tiles, 144, 'the full board is laid out');
  assert.ok(chrome.free > 0, 'free tiles are selectable');
  assert.equal(chrome.selected, 1, 'clicking a free tile selects it');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
