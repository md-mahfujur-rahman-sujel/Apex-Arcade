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
await page.goto(`${origin}/assets/games/29-reversi/index.html?test=1`);
await page.waitForFunction(() => typeof ReversiTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = ReversiTest;
    const save = () => Save.load('reversi');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('grandmaster');
    out.modeAfterLock = T.getMode();

    T.setSeat('two');
    T.setMode('classic');
    T.restart();
    out.start = T.state();
    out.move = T.play(19);
    out.moveAch = ach().slice();
    T.restart();

    /* Mini uses a 4x4 board and the same flanking rules. */
    T.setMode('mini'); T.restart();
    out.mini = T.state();
    out.miniMove = T.play(1);
    T.restart();

    /* Corner Rush ends as soon as one side holds three corners. */
    T.setMode('corners');
    const cb = Array(64).fill(0); cb[0] = 1; cb[7] = 1; cb[56] = 1; cb[63] = 2;
    T.setBoard(cb); T.setScore(1, 100);
    out.corners = T.finish(1);
    out.cornersBest = stats().bestCornersScore;
    T.closeModal();

    /* All four corners earns Corner Lord. */
    T.setMode('classic'); T.restart();
    const lb = Array(64).fill(0); lb[0] = 1; lb[7] = 1; lb[56] = 1; lb[63] = 1; lb[27] = 2;
    T.setBoard(lb);
    out.cornerLord = T.finish(1);
    out.classicBest = stats().bestClassicScore;
    out.classicWins = stats().classicWins;
    T.closeModal();

    out.gmUnlock = T.setMode('grandmaster');
    T.restart();
    T.setScore(1, 500);
    out.grandmaster = T.finish(1);
    out.grandmasterBest = stats().bestGrandmasterScore;
    T.closeModal();

    /* Blitz: flagging on time loses. */
    T.setMode('blitz'); T.restart();
    T.setScore(1, 200); T.setClock(1, 500);
    out.blitz = T.tick(1000);
    out.blitzBest = stats().bestBlitzScore;
    T.closeModal();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'reversi:discs-ruby');
    out.palette = T.cosmetic('palette', 'reversi:board-slate');
    out.accent = T.cosmetic('effect', 'reversi:accent-rose');
    out.theme = T.cosmetic('theme', 'reversi:theme-forest');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'corners', 'mini', 'grandmaster']);
  assert.equal(data.locked, false, 'Grandmaster stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.start.size, 8);
  assert.equal(data.start.legal.length, 4, 'the classic opening has four legal moves');
  assert.equal(data.start.black, 2);
  assert.equal(data.start.white, 2);

  assert.equal(data.move.board[19], 1);
  assert.equal(data.move.black, 4);
  assert.equal(data.move.white, 1, 'the flanked disc flips');
  assert.equal(data.move.scores[1], 30, 'ten for the placement plus twenty for the flip');
  assert.equal(data.move.flips[1], 1);
  assert.equal(data.move.biggest[1], 1);
  assert.equal(data.move.last, 19);
  assert.equal(data.move.over, null);
  for (const id of ['first-place', 'first-flip']) assert.ok(data.moveAch.includes(id), id + ' unlocked');

  assert.equal(data.mini.size, 4, 'Mini shrinks to a 4x4 board');
  assert.ok(data.mini.legal.some((m) => m.at === 1), 'the 4x4 opening offers a flank at square 1');
  assert.equal(data.miniMove.board[1], 1);
  assert.equal(data.miniMove.black, 4);
  assert.equal(data.miniMove.white, 1);
  assert.equal(data.miniMove.scores[1], 30);

  assert.equal(data.corners.over, 'Black wins 3\u20131');
  assert.equal(data.corners.corners[1], 3);
  assert.equal(data.cornersBest, 1320, '(100 + 1,000) x 1.2');
  assert.equal(data.cornerLord.corners[1], 4);
  assert.equal(data.classicBest, 1000, 'classic bonus only');
  assert.equal(data.classicWins, 1);
  assert.equal(data.gmUnlock, true, 'a Classic win unlocks Grandmaster');
  assert.equal(data.grandmasterBest, 3000, '(500 + 1,500) x 1.5');

  assert.equal(data.blitz.over, 'White wins 2\u20132');
  assert.equal(data.blitzBest, 220, '200 x 1.1 after the flag falls');

  assert.equal(data.defaults.discs.b, 'radial-gradient(circle at 35% 30%, #52525b, #09090b)');
  assert.match(data.skin.discs.b, /#7f1d1d/);
  assert.equal(data.palette.board.sq, '#3f4b5f');
  assert.equal(data.accent.accent, '#fb7185');
  assert.match(data.theme.theme, /rgb\(7, 13, 9\)/);
  assert.equal(data.cosmetics.length, 16, 'Reversi ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['reversi:discs-ruby', 'reversi:board-slate', 'reversi:accent-rose', 'reversi:theme-forest']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.wins, 3, 'Corner Rush, Classic and Grandmaster wins');
  assert.equal(data.stats.bestScore, 3000);
  for (const id of ['first-place', 'first-flip', 'corners-clear', 'classic-clear', 'corner-lord', 'grandmaster-clear', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.ok(!data.ach.includes('blitz-clear'), 'losing on time does not award the Blitz badge');
  assert.ok(!data.ach.includes('shutout'), 'the rival still held discs in every win');

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
