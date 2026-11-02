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
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} @ ${message.location().url}`);
  });
  await page.goto(`${origin}${basePath}/assets/games/03-snake/index.html?seed=${seed}`);
  await page.waitForFunction(() => typeof emberSerpentGame !== 'undefined' && !!emberSerpentGame.ui);
  return { context, page };
}

const readBoard = (page) =>
  page.evaluate(() => ({
    food: food ? { x: food.x, y: food.y } : null,
    seed: dailySeed,
    mode: activeMode,
    wrap,
  }));

try {
  const first = await openGame(42);
  const boardA = await readBoard(first.page);
  await first.context.close();

  const second = await openGame(42);
  const boardB = await readBoard(second.page);
  await second.context.close();

  const third = await openGame(43);
  const boardC = await readBoard(third.page);
  await third.context.close();

  assert.deepEqual(boardA.food, boardB.food, 'the same seed places the first fruit in the same cell');
  assert.notDeepEqual(boardA.food, boardC.food, 'a different seed places fruit elsewhere');
  console.log('PASS seeded fruit placement is deterministic');

  const { context, page } = await openGame(7);

  const dailyDeterminism = await (async () => {
    const other = await openGame(7);
    const dailyA = await page.evaluate(() => {
      emberSerpentGame.ui.setMode('daily');
      return { food, seed: dailySeed, wrap, mode: activeMode };
    });
    const dailyB = await other.page.evaluate(() => {
      emberSerpentGame.ui.setMode('daily');
      return { food, seed: dailySeed, wrap, mode: activeMode };
    });
    await other.context.close();
    return { dailyA, dailyB };
  })();

  assert.equal(dailyDeterminism.dailyA.mode, 'daily', 'Daily Ember can be selected');
  assert.equal(dailyDeterminism.dailyA.wrap, false, 'Daily Ember keeps solid walls');
  assert.equal(dailyDeterminism.dailyA.seed, dailyDeterminism.dailyB.seed, 'Daily Ember shares one seed per day');
  assert.deepEqual(dailyDeterminism.dailyA.food, dailyDeterminism.dailyB.food, 'Daily Ember shares the same opening fruit');

  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };

    emberSerpentGame.ui.setMode('classic');
    const lockedBefore = emberSerpentGame.ui.setMode('gauntlet');
    const lockedMode = emberSerpentGame.ui.getMode();    Save.update('ember-serpent', { stats: { bestLevel: 5 } });
    const unlockedAfter = emberSerpentGame.ui.setMode('gauntlet');
    const gauntlet = { mode: activeMode, endless, wrap, lockedBefore, lockedMode, unlockedAfter };

    emberSerpentGame.ui.setMode('classic');
    emberSerpentGame.restart(true);

    const scoreAfter = () => emberSerpentGame.score;
    const stepTick = () => A.test.step(interval);

    food = { x: cur[0].x + 1, y: cur[0].y };
    bonus = null;
    rocks = [];
    stepTick();
    const firstBite = { score: scoreAfter(), combo, mult: comboMult(), eaten, grow, achievement: Save.load('ember-serpent').achievements.includes('first-bite') };

    food = { x: cur[0].x + 1, y: cur[0].y };
    stepTick();
    const secondBite = { score: scoreAfter(), combo, mult: comboMult() };

    bonus = { x: cur[0].x + 1, y: cur[0].y, t: 540 };
    food = { x: 0, y: 0 };
    const beforeGem = scoreAfter();
    stepTick();
    const gem = { gained: scoreAfter() - beforeGem, collected: bonus === null, gems, grow };

    const reportStart = reports.filter((event) => event.type === 'level_complete').length;
    eaten = PER_LEVEL - 1;
    food = { x: cur[0].x + 1, y: cur[0].y };
    stepTick();
    const levelTwo = {
      level,
      eaten,
      score: scoreAfter(),
      bestLevel: Number((Save.load('ember-serpent').stats || {}).bestLevel) || 0,
      savedLevel: Save.load('ember-serpent').level,
      reports: reports.filter((event) => event.type === 'level_complete').slice(reportStart),
      rocks: rocks.length,
      rockfall: Save.load('ember-serpent').achievements.includes('rockfall'),
    };

    const wrapBefore = wrap;
    A.test.tap('KeyT', 1);
    const toggledWrap = { before: wrapBefore, after: wrap, saved: !!(Save.load('ember-serpent').settings || {}).wrap };
    A.test.tap('KeyT', 1);
    const restoredWrap = wrap;

    emberSerpentGame.ui.setMode('gate');
    emberSerpentGame.begin();
    A.test.tap('KeyT', 1);
    const gateGuard = { mode: activeMode, wrap };

    emberSerpentGame.ui.setMode('daily');
    emberSerpentGame.begin();
    emberSerpentGame.score = 123;
    cur = [{ x: 0, y: 5 }, { x: 1, y: 5 }];
    prev = cur.map((segment) => ({ ...segment }));
    dir = [-1, 0];
    queue = [];
    rocks = [];
    A.test.step(interval);
    const dailyDeath = {
      state: emberSerpentGame.state,
      title: emberSerpentGame.title,
      sub: emberSerpentGame.sub,
      dailyBest: Number((Save.load('ember-serpent').stats || {}).dailyBest) || 0,
      achievement: Save.load('ember-serpent').achievements.includes('daily-ember'),
    };

    const menuActions = [...document.querySelectorAll('.apex-menu-root [data-menu-action]')].map((el) => el.getAttribute('data-menu-action'));
    const customizeCatalog = Meta.getCosmetics('ember-serpent').map((item) => ({ id: item.id, slot: item.slot, owned: item.owned }));

    return {
      gauntlet,
      firstBite,
      secondBite,
      gem,
      levelTwo,
      toggledWrap,
      restoredWrap,
      gateGuard,
      dailyDeath,
      menuActions,
      customizeCatalog,
      touch: { left: emberSerpentGame.cfg.touchL, right: emberSerpentGame.cfg.touchR },
      events: reports.filter((event) => event.type === 'level_complete').map((event) => ({ level: event.level, mode: event.mode })),
    };
  });

  assert.deepEqual(gameplay.gauntlet, {
    mode: 'gauntlet', endless: true, wrap: false,
    lockedBefore: false, lockedMode: 'classic', unlockedAfter: true,
  }, 'Molten Gauntlet stays locked until level 5 is reached');

  assert.deepEqual(gameplay.firstBite, { score: 15, combo: 1, mult: 1.15, eaten: 1, grow: 1, achievement: true }, 'first fruit scores the solid-wall bonus and starts a combo');
  assert.equal(gameplay.secondBite.score, 32, 'a second quick fruit raises the combo multiplier');
  assert.equal(gameplay.secondBite.combo, 2, 'the combo counter climbs');
  assert.equal(gameplay.gem.gained, 65, 'a golden gem pays the level and combo multiplier');
  assert.equal(gameplay.gem.collected, true, 'collecting a gem clears it');
  assert.equal(gameplay.gem.gems, 1, 'gems are counted per run');

  assert.equal(gameplay.levelTwo.level, 2, 'six fruits advance a level');
  assert.equal(gameplay.levelTwo.eaten, 0, 'the fruit counter resets on level up');
  assert.equal(gameplay.levelTwo.bestLevel, 5, 'progress never lowers a saved best level');
  assert.equal(gameplay.levelTwo.savedLevel, 2, 'the level pips track progress');
  assert.equal(gameplay.levelTwo.rockfall, false, 'rockfall waits for level 5');
  assert.equal(gameplay.levelTwo.rocks, 3, 'level two adds a first set of rocks');
  assert.deepEqual(gameplay.levelTwo.reports.map((event) => event.level), [2], 'level completion is reported to the host');

  assert.deepEqual(gameplay.toggledWrap, { before: false, after: true, saved: true }, 'T toggles wrap and remembers the choice');
  assert.equal(gameplay.restoredWrap, false, 'T toggles back to solid walls');
  assert.deepEqual(gameplay.gateGuard, { mode: 'gate', wrap: true }, 'Serpent Gate ignores the wall toggle');

  assert.equal(gameplay.dailyDeath.state, 'over', 'hitting a wall ends the run');
  assert.equal(gameplay.dailyDeath.title, 'Burned Out', 'the run ends with its own title');
  assert.match(gameplay.dailyDeath.sub, /DAILY EMBER/, 'the result names the active mode');
  assert.equal(gameplay.dailyDeath.dailyBest, 123, 'Daily Ember stores its best score');
  assert.equal(gameplay.dailyDeath.achievement, true, 'finishing Daily Ember unlocks its achievement');

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'about', 'stats', 'exit'], 'the front menu exposes every screen');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'palette') && gameplay.customizeCatalog.some((item) => item.slot === 'trail'), 'Ember Serpent has palette and trail cosmetics');
  assert.deepEqual(gameplay.touch.left, [['◀', 'ArrowLeft'], ['▲', 'ArrowUp'], ['🎨', 'KeyK']], 'left touch controls steer and change skin');
  assert.deepEqual(gameplay.touch.right, [['▼', 'ArrowDown'], ['▶', 'ArrowRight'], ['↺', 'KeyT']], 'right touch controls steer and toggle walls');

  await page.evaluate(() => emberSerpentGame.ui.setMode('classic'));
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
  await page.screenshot({ path: path.join(tmpdir(), 'game-03-gameplay.png') });
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
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  theaterPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} @ ${message.location().url}`);
  });
  await theaterPage.goto(`${origin}${basePath}/#/game/snake`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  const startRun = theaterPage.getByRole('button', { name: 'START RUN' });
  await startRun.waitFor({ state: 'visible' });
  await startRun.click();
  await theaterPage.waitForTimeout(900);
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-03-3d.png') });
  await theaterPage.keyboard.press('ArrowUp');

  const rematch = theaterPage.getByRole('button', { name: 'Rematch' });
  const readPlays = () =>
    theaterPage.evaluate(() => Number((JSON.parse(localStorage.getItem('apex_arcade_stats_v2') || '{}').totalPlayCount) || 0));

  const playsBefore = await readPlays();
  await rematch.waitFor({ state: 'visible', timeout: 30000 });
  const playsAfterFirst = await readPlays();
  await rematch.click();
  await rematch.waitFor({ state: 'detached' });
  await theaterPage.keyboard.press('ArrowUp');
  await rematch.waitFor({ state: 'visible', timeout: 30000 });
  const playsAfterSecond = await readPlays();
  await theater.close();

  assert.equal(playsAfterFirst, playsBefore + 1, 'the 3D engine records its first run');
  assert.equal(playsAfterSecond, playsAfterFirst + 1, 'Rematch reopens the theater session and records the next run');
  console.log('PASS 3D Rematch reopens the theater session');

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS combos, gems, levels, wrap guards, daily seed, and achievements behave correctly');
  console.log('PASS game 03 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
