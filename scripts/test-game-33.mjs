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
await page.goto(`${origin}/assets/games/33-go/index.html?test=1`);
await page.waitForFunction(() => typeof GoTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = GoTest;
    const save = () => Save.load('go');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('master');
    out.modeAfterLock = T.getMode();

    /* Capture, undo and replay in a two-player Classic game. */
    T.setSeat('two');
    T.setMode('classic');
    T.restart();
    out.start = T.state();
    out.firstStone = T.play(40);
    T.setBoard({ turn: 1, stones: { 39: 1, 31: 1, 41: 1, 40: 2 } });
    out.capture = T.play(49);
    out.captureAch = ach().slice();
    out.afterUndo = T.undo();
    out.replay = T.play(49);
    out.captureWin = T.finish(1);
    out.captureBest = stats().bestClassicScore;
    out.captureWins = stats().classicWins;
    out.captureModal = T.modalOpen();
    T.closeModal();

    /* Full-board Classic win. */
    T.setSeat('1');
    T.setMode('classic');
    T.setBoard({ size: 9, board: Array(81).fill(1), turn: 1 });
    T.setScore(1, 500);
    out.classic = T.finish(1);
    out.classicBest = stats().bestClassicScore;
    T.closeModal();

    /* Quick: 7x7 board. */
    T.setMode('quick');
    T.setBoard({ size: 7, board: Array(49).fill(1), turn: 1 });
    T.setScore(1, 400);
    out.quick = T.finish(1);
    out.quickBest = stats().bestQuickScore;
    T.closeModal();

    /* Blitz: the clock decides. */
    T.setMode('blitz');
    T.setScore(1, 200); T.setTurn(2); T.setClock(2, 100);
    out.blitz = T.tick(1000);
    out.blitzBest = stats().bestBlitzScore;
    T.closeModal();

    /* Grand: 13x13 board. */
    T.setMode('grand');
    T.setBoard({ size: 13, board: Array(169).fill(1), turn: 1 });
    T.setScore(1, 300);
    out.grand = T.finish(1);
    out.grandBest = stats().bestGrandScore;
    T.closeModal();

    /* A Classic win unlocks Master. */
    out.masterUnlock = T.setMode('master');
    T.setBoard({ size: 9, board: Array(81).fill(1), turn: 1 });
    T.setScore(1, 100);
    out.master = T.finish(1);
    out.masterBest = stats().bestMasterScore;
    T.closeModal();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'go:stones-violet');
    out.palette = T.cosmetic('palette', 'go:board-slate');
    out.accent = T.cosmetic('effect', 'go:accent-lime');
    out.theme = T.cosmetic('theme', 'go:theme-dusk');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'quick', 'grand', 'master']);
  assert.equal(data.locked, false, 'Master stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.start.size, 9);
  assert.equal(data.start.komi, 7.5);
  assert.equal(data.start.phase, 'play');
  assert.equal(data.start.free.length, 81);
  assert.equal(data.firstStone.score[1], 2, 'a stone scores two points');

  assert.equal(data.capture.caps[1], 1, 'the surrounded stone is captured');
  assert.equal(data.capture.stones[40], 0, 'the captured stone leaves the board');
  assert.equal(data.capture.score[1], 16, '2 move points + 14 for the capture');
  assert.equal(data.capture.placed, 2);
  assert.equal(data.capture.captured, 1);
  for (const id of ['first-stone', 'first-capture']) assert.ok(data.captureAch.includes(id), id + ' unlocked');
  assert.equal(data.afterUndo.stones[40], 2, 'undo restores the captured stone');
  assert.equal(data.afterUndo.caps[1], 0);
  assert.equal(data.afterUndo.score[1], 2, 'undo restores the points');
  assert.equal(data.afterUndo.placed, 1);
  assert.equal(data.replay.score[1], 16, 'the capture can be replayed after undo');

  assert.equal(data.captureWin.over, true);
  assert.equal(data.captureModal, true, 'the result dialog opens');
  assert.match(data.captureWin.overText, /^Black wins by 73\.5 points/, 'Black 81 area vs White 7.5 komi');
  assert.equal(data.captureBest, 1516, '16 earned + 1,500 Classic bonus');
  assert.equal(data.captureWins, 1);

  assert.equal(data.classic.over, true);
  assert.match(data.classic.overText, /^Black wins by 73\.5 points/);
  assert.equal(data.classicBest, 2000, '500 earned + 1,500 bonus');

  assert.equal(data.quick.over, true);
  assert.match(data.quick.overText, /^Black wins by 42\.5 points/, '49 area vs 6.5 komi');
  assert.equal(data.quickBest, 1680, '(400 + 1,000) x 1.2');

  assert.equal(data.blitz.over, true);
  assert.equal(data.blitz.overText, 'Black wins on time');
  assert.equal(data.blitzBest, 220, '200 x 1.1 with no time-out bonus');

  assert.equal(data.grand.over, true);
  assert.match(data.grand.overText, /^Black wins by 161\.5 points/, '169 area vs 7.5 komi');
  assert.equal(data.grandBest, 2730, '(300 + 1,800) x 1.3');

  assert.equal(data.masterUnlock, true, 'a Classic win unlocks Master');
  assert.equal(data.master.over, true);
  assert.equal(data.masterBest, 3150, '(100 + 2,000) x 1.5');

  assert.equal(data.defaults.stones[1].light, '#6b7280');
  assert.equal(data.skin.stones[1].light, '#6d28d9');
  assert.equal(data.palette.board.bg1, '#94a3b8');
  assert.equal(data.accent.accent, '#a3e635');
  assert.match(data.theme.theme, /rgb\(11, 7, 5\)/);
  assert.equal(data.cosmetics.length, 16, 'Go ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['go:stones-violet', 'go:board-slate', 'go:accent-lime', 'go:theme-dusk']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.plays, 6);
  assert.equal(data.stats.wins, 6);
  assert.equal(data.stats.bestScore, 3150);
  assert.equal(data.stats.bestArea, 169, 'the 13x13 game holds the largest area');
  assert.equal(data.stats.bestCapture, 1);
  assert.equal(data.stats.stonesPlaced, 2, 'only the capture game placed stones');
  assert.equal(data.stats.stonesCaptured, 1);
  assert.equal(data.stats.classicWins, 2);
  assert.equal(data.stats.fewestMoves, 2);
  for (const id of ['first-stone', 'first-capture', 'territory-50', 'shutout', 'classic-clear', 'quick-clear', 'blitz-clear', 'grand-clear', 'master-clear', 'high-score', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.ok(!data.ach.includes('big-capture'), 'no five-stone sweep happened');

  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the board');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
