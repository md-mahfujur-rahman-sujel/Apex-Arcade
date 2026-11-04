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
await page.goto(`${origin}/assets/games/26-checkers/index.html?test=1`);
await page.waitForFunction(() => typeof CheckersTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = CheckersTest;
    const save = () => Save.load('checkers');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const empty = Array(64).fill(0);
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('grandmaster');
    out.modeAfterLock = T.getMode();

    T.setSeat('two');
    T.setMode('classic');
    T.restart();
    out.start = T.state();

    /* Double capture ends in a crown. */
    const board = empty.slice();
    board[33] = 'r'; board[26] = 'b'; board[12] = 'b'; board[49] = 'b';
    T.setBoard(board); T.setTurn('r');
    out.jump = T.move(33, 5);
    out.jumpAch = ach().slice();

    /* Giveaway: capturing the rival's last piece hands them the win. */
    T.setMode('giveaway');
    const gb = empty.slice(); gb[24] = 'r'; gb[17] = 'b';
    T.setBoard(gb); T.setTurn('r'); T.setScore('r', 200);
    out.giveaway = T.move(24, 10);
    out.giveawayBest = stats().bestGiveawayScore;
    T.closeModal();

    /* Speed Checkers: flagging loses on time. */
    T.setMode('speed');
    T.setScore('r', 300); T.setClock('r', 500);
    out.speed = T.tick(1000);
    out.speedBest = stats().bestSpeedScore;
    T.closeModal();

    /* Classic win unlocks Grandmaster. */
    T.setMode('classic');
    T.setBoard(empty.slice()); T.setTurn('r'); T.setScore('r', 500);
    out.classic = T.finish('r');
    out.classicBest = stats().bestClassicScore;
    out.classicWins = stats().classicWins;
    T.closeModal();
    out.gmUnlock = T.setMode('grandmaster');
    T.restart();
    T.setBoard(empty.slice()); T.setTurn('r'); T.setScore('r', 600);
    out.grandmaster = T.finish('r');
    out.grandmasterBest = stats().bestGrandmasterScore;
    T.closeModal();

    /* King Hunt ends the moment a side crowns two kings. */
    T.setMode('kings');
    const kb = empty.slice(); kb[8] = 'r'; kb[12] = 'r'; kb[49] = 'b';
    T.setBoard(kb); T.setTurn('r');
    out.king1 = T.move(8, 1);
    out.king2 = T.move(49, 56);
    out.king3 = T.move(12, 5);
    out.kingsBest = stats().bestKingsScore;
    T.closeModal();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'checkers:pieces-neon');
    out.palette = T.cosmetic('palette', 'checkers:board-midnight');
    out.accent = T.cosmetic('effect', 'checkers:accent-lime');
    out.theme = T.cosmetic('theme', 'checkers:theme-sunset');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'speed', 'kings', 'giveaway', 'grandmaster']);
  assert.equal(data.locked, false, 'Grandmaster stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.start.turn, 'r');
  assert.ok(data.start.legal.length > 0, 'Red has legal opening moves');

  assert.equal(data.jump.board[5], 'R', 'the chain ends crowned');
  assert.equal(data.jump.caps.r, 2, 'two pieces captured in one move');
  assert.equal(data.jump.kings.r, 1);
  assert.equal(data.jump.crowns.r, 1);
  assert.equal(data.jump.scores.r, 420, '300 for two captures plus 120 for the crown');
  assert.equal(data.jump.turn, 'b');
  assert.equal(data.jump.over, null);
  for (const id of ['first-move', 'first-capture', 'first-king', 'double-jump']) assert.ok(data.jumpAch.includes(id), id + ' unlocked');

  assert.equal(data.giveaway.over, 'Black wins!', 'capturing the last rival piece loses in Giveaway');
  assert.equal(data.giveaway.scores.r, 350, '200 carried in plus 150 for the capture');
  assert.equal(data.giveawayBest, 455, '350 x 1.3');

  assert.equal(data.speed.over, 'Black wins!');
  assert.equal(data.speedBest, 330, '300 x 1.1 after the flag falls');

  assert.equal(data.classic.over, 'Red wins!');
  assert.equal(data.classicBest, 1500, '500 earned + 1,000 Classic bonus');
  assert.equal(data.classicWins, 1);
  assert.equal(data.gmUnlock, true, 'a Classic win unlocks Grandmaster');
  assert.equal(data.grandmasterBest, 3150, '(600 + 1,500) x 1.5');

  assert.equal(data.king1.crowns.r, 1);
  assert.equal(data.king2.crowns.b, 1, 'Black crowns while stalling');
  assert.equal(data.king3.over, 'Red wins!', 'the second Red crown ends King Hunt');
  assert.equal(data.king3.crowns.r, 2);
  assert.equal(data.kingsBest, 1488, '240 crowns plus the 1,000 bonus at 1.2x');

  assert.equal(data.defaults.pieces.r, 'radial-gradient(circle at 35% 30%, #fb7185, #be123c)');
  assert.match(data.skin.pieces.r, /#f472b6/);
  assert.equal(data.palette.board.light, '#2a3a5c');
  assert.equal(data.accent.accent, '#a3e635');
  assert.match(data.theme.theme, /rgb\(11, 7, 5\)/);
  assert.equal(data.cosmetics.length, 16, 'Checkers ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['checkers:pieces-neon', 'checkers:board-midnight', 'checkers:accent-lime', 'checkers:theme-sunset']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.wins, 3, 'Classic, Grandmaster and King Hunt wins');
  assert.equal(data.stats.bestScore, 3150);
  assert.equal(data.stats.captures, 1, 'the abandoned double-jump game never records its captures');
  assert.equal(data.stats.kingsCrowned, 2, 'King Hunt crowns both sides');
  for (const id of ['first-move', 'first-capture', 'first-king', 'double-jump', 'classic-clear', 'kings-clear', 'grandmaster-clear', 'flawless', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.ok(!data.ach.includes('speed-clear'), 'losing on time does not award the Speed badge');
  assert.ok(!data.ach.includes('giveaway-clear'), 'losing in Giveaway does not award the badge');

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
