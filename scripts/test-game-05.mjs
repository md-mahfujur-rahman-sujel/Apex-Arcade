import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
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
const errors = [];

async function openGame(seed) {
  const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
  await context.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // Storage can be unavailable in privacy modes; the game still runs.
    }
  });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('favicon')) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error' && !message.location().url.includes('favicon')) errors.push(`${message.text()} @ ${message.location().url}`);
  });
  await page.goto(`${origin}${basePath}/assets/games/05-tetris/index.html?seed=${seed}`);
  await page.waitForFunction(() => typeof prismGame !== 'undefined' && !!prismGame.ui);
  return { context, page };
}

const readSequence = (page) =>
  page.evaluate(() => {
    queue = [];
    while (queue.length < 14) refill();
    return { mode: activeMode, seed: runSeed, sequence: queue.slice(0, 14) };
  });

try {
  const first = await openGame(42);
  const seedA = await readSequence(first.page);
  await first.context.close();

  const second = await openGame(42);
  const seedB = await readSequence(second.page);
  await second.context.close();

  const third = await openGame(43);
  const seedC = await readSequence(third.page);
  await third.context.close();

  assert.equal(seedA.seed, 42, 'marathon reads the requested seed');
  assert.deepEqual(seedA.sequence, seedB.sequence, 'the same seed produces the same 7-bag sequence');
  assert.notDeepEqual(seedA.sequence, seedC.sequence, 'a different seed produces a different sequence');
  console.log('PASS seeded seven-bag sequences are deterministic');

  const dailyOne = await openGame(42);
  const dailyA = await dailyOne.page.evaluate(() => {
    prismGame.ui.setMode('daily');
    const seq = (() => { queue = []; while (queue.length < 14) refill(); return queue.slice(0, 14); })();
    return { mode: activeMode, seed: runSeed, sequence: seq, expected: dailySeed() };
  });
  await dailyOne.context.close();

  const dailyTwo = await openGame(43);
  const dailyB = await dailyTwo.page.evaluate(() => {
    prismGame.ui.setMode('daily');
    const seq = (() => { queue = []; while (queue.length < 14) refill(); return queue.slice(0, 14); })();
    return { mode: activeMode, seed: runSeed, sequence: seq };
  });
  await dailyTwo.context.close();

  assert.equal(dailyA.mode, 'daily', 'Daily Prism can be selected');
  assert.equal(dailyA.seed, dailyA.expected, 'Daily Prism uses the day seed');
  assert.deepEqual(dailyA.sequence, dailyB.sequence, 'Daily Prism shares one bag sequence for the day');
  console.log('PASS Daily Prism is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };
    const achievements = () => Save.load('prism-stack').achievements || [];
    const stats = () => Save.load('prism-stack').stats || {};
    const fresh = (mode) => {
      prismGame.ui.setMode(mode);
      prismGame.restart(true);
    };
    const clearBoard = () => board.forEach((row) => row.fill(0));
    const singleClear = () => {
      clearBoard();
      board[0][0] = 2;
      for (let x = 0; x < 10; x++) board[19][x] = x < 4 ? 0 : 1;
      p = { t: 0, rot: 0, x: 0, y: 18 };
      spinFlag = false;
      lockPiece(prismGame);
      A.test.step(24);
    };

    fresh('marathon');
    queue = [];
    refill();
    const firstBag = [...queue].sort((a, b) => a - b);
    queue = [];
    refill();
    const secondBag = [...queue].sort((a, b) => a - b);
    const bagRun = { firstBag, secondBag };

    fresh('marathon');
    const startKey = p.t;
    const expectedNext = queue[0];
    A.test.tap('KeyC', 1);
    const heldOnce = { hold, canHold, next: p.t, expectedNext, startKey };
    A.test.tap('Space', 1);
    const heldPiece = hold;
    A.test.tap('KeyC', 1);
    const holdRun = {
      ...heldOnce,
      swapIn: p.t === startKey,
      swapped: hold !== heldPiece,
      canHoldAgain: canHold,
    };

    fresh('marathon');
    clearBoard();
    for (let x = 0; x < 10; x++) board[19][x] = x === 4 ? 0 : 1;
    board[17][3] = 1;
    board[17][5] = 1;
    p = { t: 5, rot: 2, x: 3, y: 17 };
    spinFlag = true;
    const scoreBeforeSpin = prismGame.score;
    lockPiece(prismGame);
    const spinImmediate = { gained: prismGame.score - scoreBeforeSpin, tspins, achievement: achievements().includes('t-spin-prism') };
    A.test.step(24);
    const tSpinRun = {
      ...spinImmediate,
      lines,
      level,
      achievement: achievements().includes('t-spin-prism'),
      perfectClears,
    };

    fresh('marathon');
    clearBoard();
    for (let x = 0; x < 10; x++) board[19][x] = x < 4 ? 0 : 1;
    p = { t: 0, rot: 0, x: 0, y: 18 };
    spinFlag = false;
    lockPiece(prismGame);
    A.test.step(24);
    const perfectRun = {
      score: prismGame.score,
      perfectClears,
      empty: board.every((row) => row.every((cell) => !cell)),
      achievement: achievements().includes('perfect-prism'),
    };

    fresh('marathon');
    const reportStart = reports.filter((event) => event.type === 'level_complete').length;
    lines = 9;
    singleClear();
    const levelReports = reports.filter((event) => event.type === 'level_complete').slice(reportStart);
    const levelRun = {
      lines,
      level,
      bestLevel: Number(stats().bestLevel) || 0,
      reports: levelReports,
      deepStack: achievements().includes('deep-stack'),
    };

    fresh('marathon');
    lines = 89;
    level = 8;
    singleClear();
    const deepRun = { lines, level, achievement: achievements().includes('deep-stack') };

    fresh('sprint');
    lines = 39;
    singleClear();
    const sprintRun = {
      state: prismGame.state,
      title: prismGame.title,
      bestSprintSeconds: Number(stats().bestSprintSeconds),
      achievement: achievements().includes('sprint-dash'),
    };

    fresh('ultra');
    const ultraSetup = { mode: activeMode, finiteTarget: Number.isFinite(targetLines), ultraT };
    prismGame.addScore(321);
    ultraT = 1;
    A.test.step(1);
    const ultraRun = {
      ...ultraSetup,
      state: prismGame.state,
      title: prismGame.title,
      ultraBest: Number(stats().ultraBest) || 0,
      achievement: achievements().includes('ultra-runner'),
    };

    fresh('daily');
    prismGame.score = 123;
    lines = 5;
    endRun(prismGame, 'Topped Out', 'test run');
    const dailyRun = {
      state: prismGame.state,
      title: prismGame.title,
      sub: prismGame.sub,
      dailyBest: Number(stats().dailyBest) || 0,
    };

    Save.update('prism-stack', { stats: { prismCircuitStage: 1 } });
    fresh('circuit');
    const circuitTarget = targetLines;
    lines = 9;
    singleClear();
    const circuitRun = {
      target: circuitTarget,
      state: prismGame.state,
      title: prismGame.title,
      stage: Number(stats().prismCircuitStage) || 0,
    };

    const menuActions = [...document.querySelectorAll('.apex-menu-root [data-menu-action]')].map((element) => element.getAttribute('data-menu-action'));
    const customizeCatalog = Meta.getCosmetics('prism-stack').map((item) => ({ id: item.id, slot: item.slot }));

    return {
      bagRun,
      holdRun,
      tSpinRun,
      perfectRun,
      levelRun,
      deepRun,
      sprintRun,
      ultraRun,
      dailyRun,
      circuitRun,
      menuActions,
      customizeCatalog,
      touch: { left: prismGame.cfg.touchL, right: prismGame.cfg.touchR },
    };
  });

  assert.deepEqual(gameplay.bagRun, {
    firstBag: [0, 1, 2, 3, 4, 5, 6],
    secondBag: [0, 1, 2, 3, 4, 5, 6],
  }, 'the queue refills as complete seven-bags');

  assert.equal(gameplay.holdRun.hold, gameplay.holdRun.startKey, 'hold stores the first piece');
  assert.equal(gameplay.holdRun.next, gameplay.holdRun.expectedNext, 'holding pulls the next queued piece');
  assert.equal(gameplay.holdRun.canHold, false, 'one hold is allowed per piece');
  assert.equal(gameplay.holdRun.swapIn, true, 'the stored piece returns after the next lock');
  assert.equal(gameplay.holdRun.swapped, true, 'the outgoing piece becomes the new hold');
  assert.equal(gameplay.holdRun.canHoldAgain, false, 'the swapped piece also limits one hold');

  assert.deepEqual(gameplay.tSpinRun, {
    gained: 800,
    tspins: 1,
    achievement: true,
    lines: 1,
    level: 1,
    perfectClears: 0,
  }, 'a three-corner T-spin scores 800 and unlocks Spin Doctor');

  assert.deepEqual(gameplay.perfectRun, {
    score: 1100,
    perfectClears: 1,
    empty: true,
    achievement: true,
  }, 'emptying the board awards the perfect-clear bonus');

  assert.equal(gameplay.levelRun.lines, 10, 'ten lines advances the run');
  assert.equal(gameplay.levelRun.level, 2, 'the next level starts at ten lines');
  assert.equal(gameplay.levelRun.bestLevel, 2, 'the best level is persisted');
  assert.deepEqual(gameplay.levelRun.reports, [
    { gameId: 'prism-stack', type: 'level_complete', level: 1, score: 100, mode: 'marathon' },
  ], 'clearing a level reports progress to the host');
  assert.equal(gameplay.levelRun.deepStack, false, 'level 2 does not unlock Deep Stack');

  assert.deepEqual(gameplay.deepRun, { lines: 90, level: 10, achievement: true }, 'level 10 unlocks Deep Stack');

  assert.equal(gameplay.sprintRun.state, 'won', 'clearing 40 lines finishes the Sprint');
  assert.equal(gameplay.sprintRun.title, 'Sprint Complete!', 'the sprint has its own victory title');
  assert.ok(gameplay.sprintRun.bestSprintSeconds <= 120, 'the sprint stores its completion time');
  assert.equal(gameplay.sprintRun.achievement, true, 'a sub-two-minute sprint unlocks Sprint Dash');

  assert.deepEqual(gameplay.ultraRun, {
    mode: 'ultra',
    finiteTarget: false,
    ultraT: 7200,
    state: 'won',
    title: 'Ultra Prism Complete',
    ultraBest: 321,
    achievement: true,
  }, 'Ultra Prism runs for two minutes and stores its best score');

  assert.equal(gameplay.dailyRun.state, 'over', 'ending a Daily Prism run tops out');
  assert.match(gameplay.dailyRun.title, /Topped Out/, 'the daily run reports the top-out title');
  assert.match(gameplay.dailyRun.sub, /DAILY/, 'the result names the active mode');
  assert.equal(gameplay.dailyRun.dailyBest, 123, 'Daily Prism stores its best score');

  assert.equal(gameplay.circuitRun.target, 10, 'Circuit stage one targets ten lines');
  assert.equal(gameplay.circuitRun.state, 'won', 'clearing a circuit stage completes it');
  assert.match(gameplay.circuitRun.title, /Stage 1 Clear/, 'the circuit names the cleared stage');
  assert.equal(gameplay.circuitRun.stage, 2, 'the next circuit stage is saved');

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'palette'), 'Prism Stack has palette cosmetics');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'trail'), 'Prism Stack has trail cosmetics');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'theme'), 'Prism Stack has theme cosmetics');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'prism-stack:frost-palette'), 'the frost palette is registered');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'prism-stack:violet-ghost'), 'the violet ghost trail is registered');
  assert.deepEqual(gameplay.touch.left, [['◀', 'ArrowLeft'], ['▶', 'ArrowRight'], ['▼', 'ArrowDown']], 'left touch controls move and soft drop');
  assert.deepEqual(gameplay.touch.right, [['⟳', 'ArrowUp'], ['⤓', 'Space'], ['H', 'KeyC']], 'right touch controls rotate, drop, and hold');

  await page.evaluate(() => {
    prismGame.ui.setMode('marathon');
    prismGame.restart(false);
  });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.evaluate(() => A.test.step(34));
  await page.waitForTimeout(150);
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: getComputedStyle(document.querySelector('.apex-game-menu')).display,
  }));
  assert.equal(chrome.shell, false, 'the game shell no longer renders a button bar or controls box');
  assert.equal(chrome.menuToolbar, 'none', 'no control toolbar covers a live run');
  await page.screenshot({ path: path.join(tmpdir(), 'game-05-gameplay.png') });
  await context.close();

  const theater = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await theater.addInitScript(() => {
    try {
      localStorage.clear();
    } catch {
      // Storage can be unavailable in privacy modes; the theater still runs.
    }
  });
  const theaterPage = await theater.newPage();
  theaterPage.on('pageerror', (error) => errors.push(error.message));
  theaterPage.on('response', (response) => {
    if (response.status() >= 400 && !response.url().includes('favicon')) errors.push(`${response.status()} ${response.url()}`);
  });
  theaterPage.on('console', (message) => {
    if (message.type() === 'error' && !message.location().url.includes('favicon')) errors.push(`${message.text()} @ ${message.location().url}`);
  });
  await theaterPage.goto(`${origin}${basePath}/#/game/tetris`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.keyboard.press('Space');
  await theaterPage.waitForTimeout(500);
  await theaterPage.keyboard.press('ArrowLeft');
  await theaterPage.keyboard.press('ArrowUp');
  await theaterPage.keyboard.press('KeyC');
  await theaterPage.waitForTimeout(300);
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-05-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS seven-bags, hold, T-spins, perfect clears, Ultra, Sprint, Circuit, and records behave correctly');
  console.log('PASS game 05 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
