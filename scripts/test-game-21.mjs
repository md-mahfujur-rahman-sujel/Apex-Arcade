import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const basePath = (server.config.base || '/').replace(/\/$/, '');
const candidates = [
  process.env.CHROME_BIN,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
].filter(Boolean);
let executablePath;
for (const candidate of candidates) {
  try {
    await access(candidate);
    executablePath = candidate;
    break;
  } catch {
    // Try another installed browser.
  }
}

const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1200, height: 900 } });
await context.addInitScript(() => {
  try {
    localStorage.clear();
  } catch {
    // Storage can be unavailable in privacy modes; the game still runs.
  }
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => {
  if (message.type() === 'error' && !message.location().url.includes('favicon')) errors.push(`${message.text()} @ ${message.location().url}`);
});
page.on('response', (response) => {
  if (response.status() >= 400 && !response.url().includes('favicon')) errors.push(`${response.status()} ${response.url()}`);
});

try {
  await page.goto(`${origin}${basePath}/assets/games/21-chess/index.html?test=1`);
  await page.waitForFunction(() => typeof ChessTest !== 'undefined');

  const data = await page.evaluate(() => {
    const T = ChessTest;
    const state = () => T.state();
    const save = () => Save.load('chess');
    const stats = () => save().stats || {};
    const achievements = () => save().achievements || [];
    const out = {};

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((node) => node.getAttribute('data-menu-action'));
    out.start = state();
    out.locked = T.setMode('grandmaster');
    out.modeAfterLock = T.getMode();

    // Classic: mate in one raises the first-win, scholar and personal-best flags.
    T.setMode('classic');
    T.setFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    out.classicPlay = T.play('a1', 'a8');
    out.classic = state();
    out.classicStats = stats();
    out.classicAch = achievements();
    T.closeModal();

    // Puzzle Sprint: five mate-in-one boards with a single miss on the first.
    out.puzzleMode = T.setMode('puzzle');
    out.puzzleStart = state();
    out.puzzleNames = T.puzzleNames();
    out.puzzleFens = T.puzzleFens().length;
    out.puzzleMisses = T.failPuzzle();
    out.puzzleSolves = [];
    for (let i = 0; i < 5; i += 1) {
      out.puzzleSolves.push(T.solvePuzzle());
      if (state().puzzleIndex < 4) T.advancePuzzle();
    }
    out.puzzleEnd = state();
    out.puzzleStats = stats();
    out.puzzleAch = achievements();
    T.closeModal();

    // Endgame Lab: an injected mate clears the lab inside twenty moves.
    T.setMode('endgame');
    T.setFen('7k/5K2/6Q1/8/8/8/8/8 w - - 0 1');
    out.endgamePlay = T.play('g6', 'g7');
    out.endgame = state();
    out.endgameAch = achievements();
    T.closeModal();

    // Blitz: the side to move loses when its clock hits zero.
    T.setMode('blitz');
    T.clock(10, 10);
    out.blitzFirstTick = T.tick(9000);
    out.blitzFlag = T.tick(2000);
    out.blitzLoss = state();
    T.closeModal();

    // Blitz win with a full clock adds the time bonus and both clock achievements.
    T.setMode('blitz');
    T.setFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    out.blitzPlay = T.play('a1', 'a8');
    out.blitzWin = state();
    out.blitzAch = achievements();
    T.closeModal();

    // A Classic win unlocks Grandmaster and its 1.5x multiplier.
    out.grandmasterUnlocked = T.setMode('grandmaster') === true;
    T.setFen('6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1');
    out.gmPlay = T.play('a1', 'a8');
    out.gmWin = state();
    out.gmAch = achievements();
    T.closeModal();

    out.cosmetics = T.cosmeticList();
    out.defaultColors = T.colors();
    out.neon = T.cosmetic('skin', 'chess:pieces-neon');
    out.slate = T.cosmetic('palette', 'chess:board-slate');
    out.cyan = T.cosmetic('effect', 'chess:glow-cyan');
    out.royal = T.cosmetic('theme', 'chess:theme-royal');
    out.stats = stats();
    out.ach = achievements();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'endgame', 'puzzle', 'grandmaster'], 'Chess ships five modes');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.equal(data.start.turn, 'w', 'White opens the game');
  assert.equal(data.start.legalCount, 20, 'Classic starts from the standard position');
  assert.equal(data.locked, false, 'Grandmaster stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic', 'a locked mode leaves the current mode alone');

  assert.equal(data.classicPlay, true, 'the classic mate-in-one is legal');
  assert.equal(data.classic.over, 'White wins by checkmate', 'the classic mate ends the game');
  assert.equal(data.classic.score, 810, 'a classic checkmate pays 800 plus the check bonus');
  assert.equal(data.classicStats.bestScore, 810, 'the classic score becomes the best');
  assert.equal(data.classicStats.classicWins, 1, 'the Classic win is recorded');
  assert.equal(data.classicStats.fastestMate, 1, 'the fastest mate is recorded');
  for (const id of ['first-move', 'first-win', 'scholar', 'personal-best']) {
    assert.ok(data.classicAch.includes(id), `${id} unlocks on the classic mate (${data.classicAch.join(',')})`);
  }

  assert.equal(data.puzzleMode, true, 'Puzzle Sprint is selectable');
  assert.equal(data.puzzleStart.puzzleIndex, 0, 'Puzzle Sprint opens on the first board');
  assert.equal(data.puzzleStart.legalCount, 17, 'the first puzzle is a normal mate-in-one position');
  assert.deepEqual(data.puzzleNames, ['Back rank', 'Corner net', 'Royal escort', 'Smothered', 'Rank sweep'], 'Puzzle Sprint ships five named boards');
  assert.equal(data.puzzleFens, 5, 'every puzzle has its own FEN');
  assert.equal(data.puzzleMisses, 1, 'a non-mating move counts as a miss');
  assert.deepEqual(data.puzzleSolves, [true, true, true, true, true], 'all five puzzles can be solved');
  assert.equal(data.puzzleEnd.over, 'Puzzle sprint complete', 'solving the last board completes the sprint');
  assert.equal(data.puzzleEnd.puzzlesSolved, 5, 'every puzzle solve is counted');
  assert.equal(data.puzzleEnd.score, 1550, 'five solves pay 300 each plus the check bonuses');
  assert.equal(data.puzzleStats.bestPuzzleSprintScore, 1550, 'the puzzle sprint best is recorded');
  assert.equal(data.puzzleStats.puzzlesSolved, 5, 'the puzzle counter is recorded');
  assert.ok(data.puzzleAch.includes('puzzle-clear'), 'clearing the sprint unlocks Puzzle Master');
  assert.ok(!data.puzzleAch.includes('puzzle-perfect'), 'a miss keeps First Try locked');

  assert.equal(data.endgamePlay, true, 'the endgame mate-in-one is legal');
  assert.equal(data.endgame.over, 'White wins by checkmate', 'the endgame lab mate ends the run');
  assert.equal(data.endgame.endgameMoves, 1, 'the lab counts the mating move');
  assert.equal(data.endgame.score, 1190, 'the lab pays 600 plus 20 per unused move and the check bonus');
  assert.equal(data.endgameAch.includes('endgame-clear'), true, 'an inside-20 mate unlocks Endgame Technique');

  assert.deepEqual(data.blitzFirstTick, { clockW: 1, clockB: 10, over: null }, 'the clock counts down without flagging early');
  assert.equal(data.blitzFlag.over, 'Black wins on time', 'a flag loses the Blitz game');
  assert.equal(data.blitzLoss.clockW, 0, 'the flagged clock stops at zero');
  assert.equal(data.blitzLoss.clockOn, false, 'the flag stops the clocks');
  assert.equal(data.blitzLoss.score, 0, 'a time-out scores nothing');
  assert.equal(data.blitzPlay, true, 'a Blitz mate is legal');
  assert.equal(data.blitzWin.score, 1310, 'a Blitz mate pays 1000 plus the full clock and the check bonus');
  for (const id of ['blitz-clear', 'blitz-fast']) {
    assert.ok(data.blitzAch.includes(id), `${id} unlocks when a full clock wins (${data.blitzAch.join(',')})`);
  }

  assert.equal(data.grandmasterUnlocked, true, 'a Classic win unlocks Grandmaster');
  assert.equal(data.gmPlay, true, 'the Grandmaster mate is legal');
  assert.equal(data.gmWin.score, 2265, 'Grandmaster scales the 1500 mate bonus by 1.5x');
  assert.ok(data.gmAch.includes('grandmaster-clear'), 'beating Grandmaster unlocks its achievement');

  assert.equal(data.cosmetics.length, 16, 'Chess ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) {
    assert.ok(data.cosmetics.some((item) => item.slot === slot), `Chess has ${slot} cosmetics`);
  }
  for (const id of ['chess:pieces-neon', 'chess:board-slate', 'chess:glow-cyan', 'chess:theme-royal']) {
    assert.ok(data.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(data.defaultColors, { w: '#fff', b: '#161a2b', light: '#e9dcc3', dark: '#a9805a', frame: '#2a2f45', last: '245, 158, 11', theme: 'auto' }, 'the default board is ivory on walnut');
  assert.deepEqual({ w: data.neon.w, b: data.neon.b }, { w: '#f0abfc', b: '#0f172a' }, 'Neon pieces repaint both sides');
  assert.deepEqual({ light: data.slate.light, dark: data.slate.dark, frame: data.slate.frame }, { light: '#dbe4ee', dark: '#64748b', frame: '#1e293b' }, 'Slate repaints the board');
  assert.equal(data.cyan.last, '6, 182, 212', 'Cyan Glow repaints the last-move highlight');
  assert.match(data.royal.theme, /radial-gradient\(1100px 520px at 12% -8%, rgb\(43, 31, 110\)/, 'the Royal theme repaints the backdrop');

  assert.deepEqual(data.stats, {
    plays: 6,
    bestScore: 2265,
    secondsPlayed: 0,
    lastResult: 'White wins by checkmate',
    lastMode: 'grandmaster',
    bestClassicScore: 810,
    fastestMate: 1,
    wins: 5,
    classicWins: 1,
    bestPuzzleSprintScore: 1550,
    puzzlesSolved: 5,
    bestEndgameLabScore: 1190,
    endgameWins: 1,
    bestBlitzScore: 1310,
    blitzWins: 1,
    bestGrandmasterScore: 2265,
    grandmasterWins: 1,
  }, 'Chess aggregates every record');
  for (const id of ['first-move', 'first-win', 'scholar', 'personal-best', 'puzzle-clear', 'endgame-clear', 'blitz-clear', 'blitz-fast', 'grandmaster-clear']) {
    assert.ok(data.ach.includes(id), `${id} unlocked (${data.ach.join(',')})`);
  }

  await page.evaluate(() => ChessTest.start());
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: document.querySelector('.apex-game-menu') ? getComputedStyle(document.querySelector('.apex-game-menu')).display : 'none',
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the board');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(errors.length, 0, `no browser errors: ${errors.join(' | ')}`);
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await server.httpServer.close();
}
