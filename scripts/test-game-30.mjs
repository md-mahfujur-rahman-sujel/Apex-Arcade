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
await page.goto(`${origin}/assets/games/30-tic-tac-toe/index.html?test=1`);
await page.waitForFunction(() => typeof TicTacToeTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = TicTacToeTest;
    const save = () => Save.load('tic-tac-toe');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    out.modes = T.modes();
    out.menuItems = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('grandmaster');
    out.modeAfterLock = T.getMode();

    T.setSeat('two');
    T.setMode('classic');
    T.restart();
    out.start = T.state();
    T.play(0); T.play(3); T.play(1); T.play(4);
    out.classic = T.play(2);
    out.classicBest = stats().bestClassicScore;
    out.classicWins = stats().classicWins;
    T.closeModal();

    /* Four in a Row uses a 4x4 grid and needs four marks. */
    T.setMode('four'); T.restart();
    out.fourSetup = T.state();
    T.play(0); T.play(4); T.play(1); T.play(5); T.play(2); T.play(6);
    out.four = T.play(3);
    out.fourBest = stats().bestFourScore;
    T.closeModal();

    /* Ultimate routes the rival into the matching small board. */
    T.setMode('ultimate'); T.restart();
    out.ultimateSetup = T.state();
    out.u1 = T.play(40);
    out.u2 = T.play(30);
    out.u3 = T.play(0);
    T.closeModal();

    /* Blitz: flagging on time loses. */
    T.setMode('blitz'); T.restart();
    T.setScore('x', 100); T.setClock('x', 500);
    out.blitz = T.tick(1000);
    out.blitzBest = stats().bestBlitzScore;
    T.closeModal();

    out.gmUnlock = T.setMode('grandmaster');
    T.restart();
    T.setScore('x', 150);
    out.grandmaster = T.finish('x');
    out.grandmasterBest = stats().bestGrandmasterScore;
    T.closeModal();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'tic-tac-toe:marks-neon');
    out.palette = T.cosmetic('palette', 'tic-tac-toe:board-plum');
    out.accent = T.cosmetic('effect', 'tic-tac-toe:accent-lime');
    out.theme = T.cosmetic('theme', 'tic-tac-toe:theme-forest');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'four', 'ultimate', 'blitz', 'grandmaster']);
  assert.equal(data.locked, false, 'Grandmaster stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  for (const item of ['play', 'modes', 'customize', 'stats']) assert.ok(data.menuItems.includes(item), 'menu has ' + item);
  assert.equal(data.start.format, 'classic');
  assert.equal(data.start.size, 3);
  assert.equal(data.start.target, 3);

  assert.equal(data.classic.over, 'X wins!');
  assert.equal(data.classic.wins.x, 1);
  assert.equal(data.classic.scores.x, 30, 'ten points per mark');
  assert.equal(data.classic.marksPlaced, 5);
  assert.equal(data.classicBest, 230, '30 earned + 200 Classic bonus');
  assert.equal(data.classicWins, 1);

  assert.equal(data.fourSetup.format, 'four');
  assert.equal(data.fourSetup.size, 4);
  assert.equal(data.fourSetup.target, 4);
  assert.equal(data.four.over, 'X wins!');
  assert.equal(data.four.scores.x, 40);
  assert.equal(data.fourBest, 432, '(40 + 320) x 1.2');

  assert.equal(data.ultimateSetup.format, 'ultimate');
  assert.equal(data.ultimateSetup.size, 9);
  assert.equal(data.u1.board[40], 'x');
  assert.equal(data.u1.forcedBoard, 4, 'play in the matching board');
  assert.equal(data.u2.forcedBoard, 0);
  assert.equal(data.u3.board[0], 'x');
  assert.equal(data.u3.over, '');

  assert.equal(data.blitz.over, 'O wins on time!');
  assert.equal(data.blitzBest, 140, '100 x 1.4 after the flag falls');
  assert.equal(data.gmUnlock, true, 'a Classic win unlocks Grandmaster');
  assert.equal(data.grandmaster.over, 'X wins!');
  assert.equal(data.grandmasterBest, 825, '(150 + 400) x 1.5');

  assert.equal(data.defaults.marks.x, '#22d3ee');
  assert.equal(data.skin.marks.x, '#f472b6');
  assert.equal(data.palette.board.panel, '#241a33');
  assert.equal(data.accent.accent, '#a3e635');
  assert.match(data.theme.theme, /rgb\(7, 13, 9\)/);
  assert.equal(data.cosmetics.length, 16, 'Tic-Tac-Toe ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['tic-tac-toe:marks-neon', 'tic-tac-toe:board-plum', 'tic-tac-toe:accent-lime', 'tic-tac-toe:theme-forest']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.wins, 3, 'Classic, Four in a Row and Grandmaster wins');
  assert.equal(data.stats.bestScore, 825);
  assert.equal(data.stats.marksPlaced, 12, 'Classic 5 plus Four in a Row 7; Ultimate never concludes');
  assert.equal(data.stats.fewestMoves, 5);
  assert.equal(data.stats.ticTacToe.wins, 3);
  assert.equal(data.stats.ticTacToe.losses, 1);
  assert.equal(data.stats.ticTacToe.rounds, 4);
  assert.equal(data.stats.ticTacToe.lastMode, 'grandmaster');
  for (const id of ['first-mark', 'corner-start', 'first-line', 'classic-clear', 'four-clear', 'grandmaster-clear', 'clean-sweep', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.ok(!data.ach.includes('blitz-clear'), 'losing on time does not award the Blitz badge');
  assert.ok(!data.ach.includes('ultimate-clear'), 'Ultimate was not won in this run');

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
