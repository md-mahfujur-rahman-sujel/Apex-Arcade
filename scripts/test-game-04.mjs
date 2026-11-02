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
  await page.goto(`${origin}${basePath}/assets/games/04-space-invaders/index.html?seed=${seed}`);
  await page.waitForFunction(() => typeof hivefallGame !== 'undefined' && !!hivefallGame.ui);
  return { context, page };
}

const readSeed = (page) =>
  page.evaluate(() => ({ mode: activeMode, seed: dailySeed, roll: random01() }));

try {
  const first = await openGame(42);
  const seedA = await readSeed(first.page);
  await first.context.close();

  const second = await openGame(42);
  const seedB = await readSeed(second.page);
  await second.context.close();

  const third = await openGame(43);
  const seedC = await readSeed(third.page);
  await third.context.close();

  assert.equal(seedA.seed, 42, 'classic reads the requested seed');
  assert.equal(seedA.roll, seedB.roll, 'the same seed produces the same first roll');
  assert.notEqual(seedA.roll, seedC.roll, 'a different seed produces a different roll');
  console.log('PASS seeded swarm rolls are deterministic');

  const dailyOne = await openGame(42);
  const dailyA = await dailyOne.page.evaluate(() => {
    hivefallGame.ui.setMode('daily');
    return { mode: activeMode, seed: dailySeed, roll: random01() };
  });
  await dailyOne.context.close();

  const dailyTwo = await openGame(43);
  const dailyB = await dailyTwo.page.evaluate(() => {
    hivefallGame.ui.setMode('daily');
    return { mode: activeMode, seed: dailySeed, roll: random01() };
  });
  await dailyTwo.context.close();

  assert.equal(dailyA.mode, 'daily', 'Daily Uplink can be selected');
  assert.equal(dailyA.seed, dailyB.seed, 'Daily Uplink shares one seed per day');
  assert.equal(dailyA.roll, dailyB.roll, 'Daily Uplink shares the same opening roll');
  console.log('PASS Daily Uplink is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };
    const achievements = () => Save.load('hivefall').achievements || [];
    const cellCount = () => shields[0].cells.reduce((total, cell) => total + (cell ? 1 : 0), 0);

    hivefallGame.ui.setMode('classic');
    const lockedIron = hivefallGame.ui.setMode('iron-line');
    const lockedMode = hivefallGame.ui.getMode();
    Save.update('hivefall', { stats: { bestWave: 10 } });
    const unlockedIron = hivefallGame.ui.setMode('iron-line');
    const ironLine = { mode: activeMode, lives, lockedIron, lockedMode, unlockedIron };
    const unlockedQueen = hivefallGame.ui.setMode('queen');
    const queenMode = { mode: activeMode, boss: Boolean(queen), hp: queen ? queen.hp : 0, unlockedQueen };

    hivefallGame.ui.setMode('classic');
    hivefallGame.restart(true);
    const baseline = hivefallGame.score;
    for (let index = 0; index < 15; index++) killAlien(hivefallGame, fleet.a[index], 30);
    const comboRun = {
      gained: hivefallGame.score - baseline,
      combo,
      overdrive,
      firstBlood: achievements().includes('first-blood'),
      comboTen: achievements().includes('combo-ten'),
    };

    A.test.step(1);
    hivefallGame.freezeN = 0;
    A.test.tap('KeyK', 1);
    const overdriveRun = {
      charge: overdrive,
      active: overdriveT > 0,
      achievement: achievements().includes('overdrive'),
    };

    const shieldBefore = cellCount();
    shields[0].cells[5] = 0;
    const shieldDamaged = cellCount();
    collectPod(hivefallGame, { x: ship.x, y: PY, type: 'repair', t: 0 });
    collectPod(hivefallGame, { x: ship.x, y: PY, type: 'charge', t: 0 });
    collectPod(hivefallGame, { x: ship.x, y: PY, type: 'rapid', t: 0 });
    const livesBeforeLife = lives;
    collectPod(hivefallGame, { x: ship.x, y: PY, type: 'life', t: 0 });
    collectPod(hivefallGame, { x: ship.x, y: PY, type: 'repair', t: 0 });
    const podRun = {
      repaired: cellCount() === shieldBefore,
      damaged: shieldDamaged === shieldBefore - 1,
      charge: overdrive,
      rapid: rapidT > 0,
      lifeUp: lives === livesBeforeLife + 1,
      collected: podsCollected,
      achievement: achievements().includes('pod-runner'),
    };

    saucersKilled = 0;
    saucer = { x: 300, dir: 1 }; killSaucer(hivefallGame);
    saucer = { x: 300, dir: 1 }; killSaucer(hivefallGame);
    saucer = { x: 300, dir: 1 }; killSaucer(hivefallGame);
    const saucerRun = { count: saucersKilled, pods: pods.length, achievement: achievements().includes('saucer-hunter') };

    Save.update('hivefall', { stats: { bestWave: 0 } });
    hivefallGame.restart(true);
    const reportStart = reports.filter((event) => event.type === 'level_complete').length;
    waveT = 0;
    fleet.a.forEach((alien) => { alien.live = false; });
    A.test.step(1);
    const waveRun = {
      wave,
      score: hivefallGame.score,
      bestWave: Number((Save.load('hivefall').stats || {}).bestWave) || 0,
      level: Save.load('hivefall').level,
      untouched: achievements().includes('untouched'),
      reports: reports.filter((event) => event.type === 'level_complete').slice(reportStart),
    };

    hivefallGame.ui.setMode('daily');
    hivefallGame.begin();
    hivefallGame.score = 123;
    lives = 1;
    inv = 0;
    eBul = [];
    hurtPlayer(hivefallGame);
    const dailyRun = {
      state: hivefallGame.state,
      title: hivefallGame.title,
      sub: hivefallGame.sub,
      dailyBest: Number((Save.load('hivefall').stats || {}).dailyBest) || 0,
      achievement: achievements().includes('daily-uplink'),
    };

    Save.update('hivefall', { stats: { bestWave: 10 } });
    const queenSelected = hivefallGame.ui.setMode('queen');
    hivefallGame.begin();
    queen.hp = 2;
    hitQueen(hivefallGame, 2);
    const queenRun = {
      selected: queenSelected,
      state: hivefallGame.state,
      title: hivefallGame.title,
      queenKills: Number((Save.load('hivefall').stats || {}).queenKills) || 0,
      achievement: achievements().includes('queen-slayer'),
    };

    const menuActions = [...document.querySelectorAll('.apex-menu-root [data-menu-action]')].map((element) => element.getAttribute('data-menu-action'));
    const customizeCatalog = Meta.getCosmetics('hivefall').map((item) => ({ id: item.id, slot: item.slot, owned: item.owned }));

    return {
      ironLine,
      queenMode,
      comboRun,
      overdriveRun,
      podRun,
      saucerRun,
      waveRun,
      dailyRun,
      queenRun,
      menuActions,
      customizeCatalog,
      touch: { left: hivefallGame.cfg.touchL, right: hivefallGame.cfg.touchR },
    };
  });

  assert.deepEqual(gameplay.ironLine, {
    mode: 'iron-line', lives: 1, lockedIron: false, lockedMode: 'classic', unlockedIron: true,
  }, 'Iron Line stays locked until wave 10 is reached, then starts on one life');
  assert.deepEqual(gameplay.queenMode, {
    mode: 'queen', boss: true, hp: 220, unlockedQueen: true,
  }, 'Hive Queen is gated the same way and spawns the 220-HP boss');

  assert.deepEqual(gameplay.comboRun, {
    gained: 990, combo: 15, overdrive: 100, firstBlood: true, comboTen: true,
  }, 'kills build a combo multiplier and charge the overdrive meter');
  assert.deepEqual(gameplay.overdriveRun, {
    charge: 0, active: true, achievement: true,
  }, 'K spends a full meter on a timed overdrive barrage');

  assert.deepEqual(gameplay.podRun, {
    repaired: true, damaged: true, charge: 50, rapid: true, lifeUp: true, collected: 5, achievement: true,
  }, 'supply pods repair bunkers, add charge, rapid fire, and a spare life');

  assert.deepEqual(gameplay.saucerRun, {
    count: 3, pods: 3, achievement: true,
  }, 'three saucer kills unlock the hunter achievement and drop pods');

  assert.deepEqual(gameplay.waveRun, {
    wave: 2,
    score: 100,
    bestWave: 2,
    level: 2,
    untouched: true,
    reports: [{ gameId: 'hivefall', type: 'level_complete', level: 1, score: 100, mode: 'classic' }],
  }, 'clearing wave 1 advances the ladder, reports progress, and unlocks Untouched');

  assert.equal(gameplay.dailyRun.state, 'over', 'losing the last life ends a Daily Uplink');
  assert.equal(gameplay.dailyRun.title, 'Defenders Down', 'the daily run ends with its own title');
  assert.match(gameplay.dailyRun.sub, /DAILY UPLINK/, 'the result names the active mode');
  assert.equal(gameplay.dailyRun.dailyBest, 123, 'Daily Uplink stores its best score');
  assert.equal(gameplay.dailyRun.achievement, false, 'Daily Uplink only unlocks on a clear');

  assert.equal(gameplay.queenRun.selected, true, 'the unlocked queen mode can be selected');
  assert.equal(gameplay.queenRun.state, 'won', 'destroying the queen wins the boss mode');
  assert.equal(gameplay.queenRun.title, 'Hive Queen Slain!', 'the boss has its own victory title');
  assert.equal(gameplay.queenRun.queenKills, 1, 'queen kills are counted');
  assert.equal(gameplay.queenRun.achievement, true, 'the queen kill unlocks its achievement');

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'palette'), 'Hivefall has palette cosmetics');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'trail'), 'Hivefall has a trail cosmetic');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'theme'), 'Hivefall has theme cosmetics');
  assert.deepEqual(gameplay.touch.left, [['◀', 'ArrowLeft'], ['▶', 'ArrowRight']], 'left touch controls steer');
  assert.deepEqual(gameplay.touch.right, [['●', 'Space'], ['⚡', 'KeyK']], 'right touch controls fire and overdrive');

  await page.evaluate(() => hivefallGame.ui.setMode('classic'));
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
  await page.screenshot({ path: path.join(tmpdir(), 'game-04-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/#/game/space-invaders`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.keyboard.press('Space');
  await theaterPage.waitForTimeout(600);
  await theaterPage.keyboard.press('ArrowLeft');
  await theaterPage.waitForTimeout(250);
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-04-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS combos, overdrive, pods, bunkers, waves, daily seed, boss, and achievements behave correctly');
  console.log('PASS game 04 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
