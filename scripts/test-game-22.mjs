import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const basePath = (server.config.base || '/').replace(/\/$/, '');
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) {
  try { await access(candidate); executablePath = candidate; break; } catch {}
}
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
await context.addInitScript(() => { try { localStorage.clear(); } catch {} });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.location().url.includes('favicon')) errors.push(m.text() + ' @ ' + m.location().url); });
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(r.status() + ' ' + r.url()); });
await page.goto(`${origin}${basePath}/assets/games/22-snakes-ladders/index.html?test=1`);
await page.waitForFunction(() => typeof SnakesTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = SnakesTest;
    const save = () => Save.load('snakes-ladders');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    out.modes = T.modes();
    out.locked = T.setMode('marathon');
    out.modeAfterLock = T.getMode();
    out.players = T.state().players.length;
    out.start = T.state().players.map((p) => p.pos);
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));

    // Classic first roll + exact win from 96.
    T.setMode('classic'); T.restart();
    const first = T.turn(3);
    out.firstRoll = { message: first.message, ach: ach().includes('first-roll') };
    T.setPos(0, 96); T.setTurn(0);
    const finish = T.turn(4);
    out.classic = {
      win: finish.win, pos: finish.pos, score: finish.score, over: finish.over,
      modal: T.modalOpen(),
      stats: { wins: stats().wins, classicWins: stats().classicWins, plays: stats().plays, best: stats().bestScore, bestClassic: stats().bestClassicScore, rolls: stats().rolls, fewest: stats().fewestRolls },
      ach: ach().filter((id) => ['classic-clear', 'exact-finish', 'no-snakes', 'first-roll', 'personal-best'].includes(id)),
    };
    T.closeModal();
    out.marathonUnlocked = T.setMode('marathon');
    out.modeNow = T.getMode();

    // Quick Dash starts at 24 and wins from 76.
    T.setMode('quick'); T.restart();
    out.quickStart = T.state().players.map((p) => p.pos);
    T.setPos(0, 76); T.setTurn(0);
    out.quick = T.turn(24);
    out.quickStats = { bestQuick: stats().bestQuickScore, quickWins: stats().quickWins, ach: ach().includes('quick-clear') };
    T.closeModal();

    // Twin Dice: double six grants another roll; 12 from 88 wins.
    T.setMode('twin'); T.restart();
    const dbl = T.turn(6, 6);
    out.twinDouble = { cur: dbl.cur, extra: dbl.extra, r: dbl.r };
    T.setPos(0, 88);
    out.twinWin = T.turn(6, 6);
    out.twinStats = { bestTwin: stats().bestTwinScore, twinWins: stats().twinWins, ach: ach().includes('twin-clear') };
    T.closeModal();

    // Chaos board relocates the ladder it uses.
    T.setMode('chaos'); T.restart();
    const before = T.board();
    const chaosRoll = T.turn(1);
    const after = T.board();
    out.chaos = {
      ladder: chaosRoll.ladder, pos: chaosRoll.pos, score: chaosRoll.score,
      oldGone: before.ladders['1'] !== undefined && after.ladders['1'] === undefined,
      relocated: Object.keys(after.ladders).length === Object.keys(before.ladders).length,
      ach: ach().includes('chaos-clear'),
    };
    T.setPos(0, 98); T.setTurn(0);
    out.chaosWin = T.turn(2);
    out.chaosStats = { bestChaos: stats().bestChaosScore, ach: ach().includes('chaos-clear') };
    T.closeModal();

    // Marathon: three laps, bonus win.
    T.setMode('marathon'); T.restart();
    out.marathonStart = T.state().players[0].laps;
    T.setPos(0, 95, 2); T.setTurn(0);
    out.marathonWin = T.turn(5);
    out.marathonStats = { bestMarathon: stats().bestMarathonScore, marathonWins: stats().marathonWins, ach: ach().includes('marathon-clear') };
    T.closeModal();

    // Snake, six streak, comeback.
    T.setMode('classic'); T.restart();
    T.setPos(0, 15); T.setTurn(0);
    out.snake = T.turn(1);
    out.snakeAch = ach().includes('first-snake');
    T.setPos(0, 40); T.setTurn(0);
    T.turn(6); T.turn(6); T.turn(6);
    out.sixStreak = ach().includes('six-streak');
    T.setPos(0, 5); T.setTurn(0);
    out.comebackStep = T.turn(1);
    T.setPos(0, 96); T.setTurn(0);
    out.comebackStep2 = T.turn(4);
    out.comebackState = T.state();
    out.comeback = ach().includes('comeback');
    T.closeModal();

    // Difficulty changes snake drops.
    T.setMode('classic'); T.restart(); T.setDifficulty('hard');
    out.hardSnake = T.turn(0); // skipped because r=0? use setPos
    T.setPos(0, 15); T.setTurn(0);
    out.hardSnake = T.turn(1);
    T.setDifficulty('normal');

    // Cosmetics paint the palette.
    out.defaults = T.colors();
    out.tokens = T.cosmetic('skin', 'snl:tokens-ocean');
    out.board = T.cosmetic('palette', 'snl:board-paper');
    out.snakes = T.cosmetic('effect', 'snl:snakes-neon');
    out.theme = T.cosmetic('theme', 'snl:theme-jungle');
    out.cosmetics = T.cosmeticList();
    out.statsFinal = stats();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'quick', 'twin', 'chaos', 'marathon']);
  assert.equal(data.locked, false, 'Marathon stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic', 'a locked mode does not replace the mode');
  assert.equal(data.players, 2, 'You vs 1 computer starts two players');
  assert.deepEqual(data.start, [0, 0], 'Classic starts both tokens at square 0');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.firstRoll.ach, true, 'first-roll unlocks');
  assert.equal(data.classic.win, true, 'exact 4 from 96 wins Classic');
  assert.equal(data.classic.pos, 100);
  assert.equal(data.classic.over, true);
  assert.equal(data.classic.modal, true, 'the win opens the result dialog');
  assert.equal(data.classic.stats.wins, 1);
  assert.equal(data.classic.stats.classicWins, 1, 'Classic win counter is stored as classicWins');
  assert.equal(data.classic.stats.bestClassic, 800, 'Classic banked its 800 win bonus');
  assert.equal(data.classic.stats.best, 800);
  assert.equal(data.classic.stats.fewest, 2, 'fewest rolls records both rolls');
  assert.deepEqual(data.classic.ach.sort(), ['classic-clear', 'exact-finish', 'first-roll', 'no-snakes', 'personal-best'].sort());
  assert.equal(data.marathonUnlocked, true, 'a Classic win unlocks Marathon');
  assert.equal(data.modeNow, 'marathon');
  assert.deepEqual(data.quickStart, [24, 24], 'Quick Dash starts on square 24');
  assert.equal(data.quick.win, true, 'exact 24 from 76 wins Quick Dash');
  assert.equal(data.quickStats.bestQuick, 600, 'Quick Dash banks 600');
  assert.equal(data.quickStats.quickWins, 1);
  assert.equal(data.quickStats.ach, true);
  assert.equal(data.twinDouble.extra, true, 'double six earns another roll');
  assert.equal(data.twinDouble.cur, 0, 'the same player rolls again');
  assert.equal(data.twinDouble.r, 12);
  assert.equal(data.twinWin.win, true, '12 from 88 lands exactly on 100');
  assert.equal(data.twinStats.bestTwin, 900);
  assert.equal(data.twinStats.ach, true);
  assert.equal(data.chaos.ladder, true, 'square 1 climbs the first ladder');
  assert.equal(data.chaos.pos, 38);
  assert.equal(data.chaos.score, 52, 'Chaos ladder points are scaled 1.3×');
  assert.equal(data.chaos.oldGone, true, 'the used ladder leaves square 1');
  assert.equal(data.chaos.relocated, true, 'Chaos keeps the same ladder count');
  assert.equal(data.chaosWin.win, true);
  assert.equal(data.chaosStats.bestChaos > 0, true);
  assert.equal(data.chaosStats.ach, true);
  assert.equal(data.marathonStart, 0);
  assert.equal(data.marathonWin.win, true, 'finishing lap three wins Marathon');
  assert.equal(data.marathonWin.score, 1800, 'Marathon win bonus is 1200 × 1.5');
  assert.equal(data.marathonStats.bestMarathon, 1800);
  assert.equal(data.marathonStats.ach, true);
  assert.equal(data.snake.snake, true, 'square 16 slides down');
  assert.equal(data.snake.pos, 6);
  assert.equal(data.snakeAch, true);
  assert.equal(data.sixStreak, true, 'three sixes unlock Six Streak');
  assert.equal(data.comeback, true, 'winning after square 5 unlocks From The Back');
  assert.equal(data.hardSnake.snake, true);
  assert.equal(data.hardSnake.pos, 1, 'Hard extends the snake drop by five');
  assert.deepEqual(data.defaults.tokens, ['#f43f5e', '#22d3ee', '#facc15', '#4ade80']);
  assert.deepEqual(data.tokens.tokens, ['#38bdf8', '#818cf8', '#2dd4bf', '#c084fc']);
  assert.equal(data.board.board.a, '#efe6d3');
  assert.equal(data.snakes.snakes[0], '#22d3ee');
  assert.match(data.theme.theme, /rgb\(7, 13, 9\)/);
  assert.equal(data.cosmetics.length, 16, 'Snakes ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' slot registered');
  assert.ok(data.cosmetics.some((i) => i.id === 'snl:tokens-ember'));
  assert.ok(data.cosmetics.some((i) => i.id === 'snl:board-paper'));
  assert.ok(data.cosmetics.some((i) => i.id === 'snl:snakes-neon'));
  assert.ok(data.cosmetics.some((i) => i.id === 'snl:theme-jungle'));
  assert.equal(data.statsFinal.bestScore, 1800, 'best score tracks the highest human score');
  assert.equal(data.statsFinal.plays >= 6, true, 'every completed run is recorded');

  // Chrome-free check after Play.
  await page.evaluate(() => SnakesTest.start());
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
    status: document.getElementById('status').textContent,
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the board');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await server.httpServer.close();
}
