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
  await page.goto(`${origin}${basePath}/assets/games/06-pac-man/index.html?seed=${seed}`);
  await page.waitForFunction(() => typeof glowBeetleGame !== 'undefined' && !!glowBeetleGame.ui);
  return { context, page };
}

const readPicks = (page) =>
  page.evaluate(() => {
    glowBeetleGame.restart(true);
    const picks = [];
    for (let i = 0; i < 12; i++) picks.push(seededPick([0, 1, 2, 3]));
    return { seed: runSeed, picks };
  });

const today = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
})();

try {
  const first = await openGame(42);
  const seedA = await readPicks(first.page);
  await first.context.close();

  const second = await openGame(42);
  const seedB = await readPicks(second.page);
  await second.context.close();

  const third = await openGame(43);
  const seedC = await readPicks(third.page);
  await third.context.close();

  assert.equal(seedA.seed, 42, 'classic reads the requested seed');
  assert.deepEqual(seedA.picks, seedB.picks, 'the same seed produces the same frightened-drone picks');
  assert.notDeepEqual(seedA.picks, seedC.picks, 'a different seed produces different picks');
  console.log('PASS seeded drone choices are deterministic');

  const dailyOne = await openGame(42);
  const dailyA = await dailyOne.page.evaluate(() => {
    glowBeetleGame.ui.setMode('daily');
    const picks = [];
    for (let i = 0; i < 12; i++) picks.push(seededPick([0, 1, 2, 3]));
    return { mode: activeMode, seed: runSeed, expected: seedForToday(), picks };
  });
  await dailyOne.context.close();

  const dailyTwo = await openGame(43);
  const dailyB = await dailyTwo.page.evaluate(() => {
    glowBeetleGame.ui.setMode('daily');
    const picks = [];
    for (let i = 0; i < 12; i++) picks.push(seededPick([0, 1, 2, 3]));
    return { mode: activeMode, seed: runSeed, picks };
  });
  await dailyTwo.context.close();

  assert.equal(dailyA.mode, 'daily', 'Daily Circuit can be selected');
  assert.equal(dailyA.seed, dailyA.expected, 'Daily Circuit uses the day seed');
  assert.deepEqual(dailyA.picks, dailyB.picks, 'Daily Circuit shares one patrol pattern for the day');
  console.log('PASS Daily Circuit is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };
    const achievements = () => Save.load('glow-beetle').achievements || [];
    const stats = () => Save.load('glow-beetle').stats || {};
    const fresh = (mode) => {
      glowBeetleGame.ui.setMode(mode);
      glowBeetleGame.restart(true);
      A.test.step(110);
    };
    const clearMaze = () => {
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (M[y][x] === '.' || M[y][x] === 'o') M[y][x] = ' ';
        }
      }
      M[15][10] = '.';
      seeds = 1;
      eaten = 0;
      ph = 'run';
      pl.cx = 10;
      pl.cy = 15;
      pl.dx = 0;
      pl.dy = 0;
      pl.p = 0;
      pl.want = [0, 0];
      eatAt(glowBeetleGame, 10, 15);
      A.test.step(100);
    };

    const lockedNightfall = glowBeetleGame.ui.setMode('nightfall') === false;

    fresh('classic');
    const mazeRun = {
      seeds,
      gate: M[8][10],
      tunnel: [M[TUN][0], M[TUN][COLS - 1]],
      drones: gh.map((g) => g.name),
      states: gh.map((g) => g.state),
      lives,
      level,
      hud: [glowBeetleGame.hudL, glowBeetleGame.hudR],
      touch: { left: glowBeetleGame.cfg.touchL, right: glowBeetleGame.cfg.touchR },
    };

    fresh('classic');
    eatAt(glowBeetleGame, 1, 1);
    const coreClassic = {
      score: glowBeetleGame.score,
      frT,
      allFr: gh.every((g) => g.fr),
      coreGone: M[1][1] === ' ',
      achievement: achievements().includes('core-charge'),
    };

    fresh('last-light');
    eatAt(glowBeetleGame, 1, 1);
    const coreLastLight = { score: glowBeetleGame.score, frT };

    fresh('classic');
    const teleport = () => {
      gh.forEach((g) => {
        g.state = 'out';
        g.cx = 10;
        g.cy = 15;
        g.dx = 0;
        g.dy = 0;
        g.p = 0;
        g.fr = true;
        g.rev = false;
      });
    };
    teleport();
    frT = 400;
    combo = 0;
    glowBeetleGame.freezeN = 0;
    A.test.step(1);
    const chainRun = {
      score: glowBeetleGame.score,
      combo,
      states: gh.map((g) => g.state),
      achievement: achievements().includes('combo-four'),
    };

    fresh('classic');
    eaten = 59;
    eatAt(glowBeetleGame, 1, 1);
    const gemSpawn = { pts: gem && gem.pts, col: gem && gem.col };
    pl.cx = 10;
    pl.cy = 12;
    pl.dx = 0;
    pl.dy = 0;
    pl.p = 0;
    pl.want = [0, 0];
    A.test.step(1);
    const gemRun = {
      ...gemSpawn,
      picked: gem === null,
      score: glowBeetleGame.score,
      achievement: achievements().includes('gem-hunter'),
    };

    fresh('classic');
    const reportStart = reports.filter((event) => event.type === 'level_complete').length;
    clearMaze();
    const levelReports = reports.filter((event) => event.type === 'level_complete').slice(reportStart);
    const levelRun = {
      level,
      state: glowBeetleGame.state,
      bestLevel: Number(stats().bestLevel) || 0,
      reports: levelReports,
      clean: achievements().includes('clean-sector'),
      deep: achievements().includes('deep-descent'),
    };

    fresh('classic');
    level = 9;
    clearMaze();
    const tenRun = { level, achievement: achievements().includes('maze-ten') };

    Save.update('glow-beetle', { stats: { glowBeetleStage: 1 } });
    fresh('campaign');
    const campaignStart = { level, mode: activeMode };
    clearMaze();
    const campaignRun = {
      ...campaignStart,
      level,
      stage: campaignStage,
      savedStage: Number(stats().glowBeetleStage) || 0,
      state: glowBeetleGame.state,
    };

    fresh('last-light');
    const lastLightLives = lives;
    clearMaze();
    const lastLightRun = {
      lives: lastLightLives,
      state: glowBeetleGame.state,
      title: glowBeetleGame.title,
      achievement: achievements().includes('last-light'),
    };

    fresh('daily');
    const dailySeedRun = { seed: runSeed, expected: seedForToday(), dailySeed };
    clearMaze();
    const dailySave = Save.load('glow-beetle');
    const dailyRun = {
      ...dailySeedRun,
      state: glowBeetleGame.state,
      title: glowBeetleGame.title,
      sub: glowBeetleGame.sub,
      score: glowBeetleGame.score,
      dailyBest: Number(stats().dailyBest) || 0,
      saveBest: Number(dailySave.daily && dailySave.daily.best) || 0,
      saveDay: dailySave.daily && dailySave.daily.day,
    };

    fresh('classic');
    const runsBefore = Number(stats().runs) || 0;
    glowBeetleGame.addScore(4321);
    lives = 1;
    const hunter = gh[0];
    hunter.state = 'out';
    hunter.cx = 10;
    hunter.cy = 15;
    hunter.dx = 0;
    hunter.dy = 0;
    hunter.p = 0;
    hunter.fr = false;
    hunter.rev = false;
    A.test.step(1);
    A.test.step(130);
    const deathRun = {
      state: glowBeetleGame.state,
      title: glowBeetleGame.title,
      sub: glowBeetleGame.sub,
      runs: (Number(stats().runs) || 0) - runsBefore,
      bestScore: Number(stats().bestScore) || 0,
    };

    Save.update('glow-beetle', { stats: { bestLevel: 5 } });
    const unlockedNightfall = glowBeetleGame.ui.setMode('nightfall') === true;

    fresh('nightfall');
    const nightfallRun = {
      lives,
      drones: gh.map((g) => g.name),
      shade: gh.length === 5 && gh[4].name === 'shade',
    };
    eatAt(glowBeetleGame, 1, 1);
    nightfallRun.score = glowBeetleGame.score;
    nightfallRun.frT = frT;
    nightfallRun.allFr = gh.every((g) => g.fr);
    level = NIGHTFALL_MAZES;
    const nightReportStart = reports.filter((event) => event.type === 'level_complete').length;
    clearMaze();
    nightfallRun.state = glowBeetleGame.state;
    nightfallRun.title = glowBeetleGame.title;
    nightfallRun.clears = Number(stats().nightfallClears) || 0;
    nightfallRun.achievement = achievements().includes('nightfall');
    nightfallRun.reports = reports.filter((event) => event.type === 'level_complete').slice(nightReportStart);

    const menuActions = [...document.querySelectorAll('.apex-menu-root [data-menu-action]')].map((element) => element.getAttribute('data-menu-action'));
    const customizeCatalog = Meta.getCosmetics('glow-beetle').map((item) => ({ id: item.id, slot: item.slot }));

    return {
      lockedNightfall,
      unlockedNightfall,
      mazeRun,
      coreClassic,
      coreLastLight,
      chainRun,
      gemRun,
      levelRun,
      tenRun,
      campaignRun,
      lastLightRun,
      dailyRun,
      deathRun,
      nightfallRun,
      menuActions,
      customizeCatalog,
    };
  });

  assert.equal(gameplay.lockedNightfall, true, 'Nightfall stays locked until level five is reached');
  assert.equal(gameplay.unlockedNightfall, true, 'reaching level five unlocks Nightfall');

  assert.deepEqual(gameplay.mazeRun, {
    seeds: 216,
    gate: '-',
    tunnel: [' ', ' '],
    drones: ['dart', 'lurk', 'flank', 'drift'],
    states: ['out', 'house', 'house', 'house'],
    lives: 3,
    level: 1,
    hud: ['SCORE 0 · LV 1 · ♥3', 'CLASSIC · BEST 0'],
    touch: { left: [['◀', 'ArrowLeft'], ['▲', 'ArrowUp']], right: [['▼', 'ArrowDown'], ['▶', 'ArrowRight']] },
  }, 'the classic maze loads every seed, core gate, tunnel, and drone');

  assert.deepEqual(gameplay.coreClassic, {
    score: 50,
    frT: 385,
    allFr: true,
    coreGone: true,
    achievement: true,
  }, 'a power core scores 50 and frightens every drone for 385 frames');

  assert.deepEqual(gameplay.coreLastLight, { score: 63, frT: 385 }, 'Last Light pays 1.25x for a core');

  assert.deepEqual(gameplay.chainRun, {
    score: 3000,
    combo: 4,
    states: ['eyes', 'eyes', 'eyes', 'eyes'],
    achievement: true,
  }, 'chaining four frightened drones pays 200/400/800/1600 and sends them home');

  assert.deepEqual(gameplay.gemRun, {
    pts: 100,
    col: '#fb7185',
    picked: true,
    score: 150,
    achievement: true,
  }, 'the sixtieth seed spawns a gem worth 100 points');

  assert.equal(gameplay.levelRun.level, 2, 'clearing the maze advances to level two');
  assert.equal(gameplay.levelRun.state, 'playing', 'the next level begins without ending the run');
  assert.equal(gameplay.levelRun.bestLevel, 2, 'the best level is persisted');
  assert.deepEqual(gameplay.levelRun.reports, [
    { gameId: 'glow-beetle', type: 'level_complete', level: 1, score: 510, mode: 'classic' },
  ], 'clearing a level reports progress to the host');
  assert.equal(gameplay.levelRun.clean, true, 'clearing without losing a life unlocks Clean Sector');
  assert.equal(gameplay.levelRun.deep, false, 'level two does not unlock Deep Descent');

  assert.deepEqual(gameplay.tenRun, { level: 10, achievement: true }, 'level ten unlocks Maze Runner');

  assert.deepEqual(gameplay.campaignRun, {
    level: 2,
    mode: 'campaign',
    stage: 2,
    savedStage: 2,
    state: 'playing',
  }, 'the campaign carries the next sector forward and saves it');

  assert.deepEqual(gameplay.lastLightRun, {
    lives: 1,
    state: 'won',
    title: 'Last Light clear!',
    achievement: true,
  }, 'Last Light grants one life and wins on a clear');

  assert.equal(gameplay.dailyRun.seed, gameplay.dailyRun.expected, 'Daily Circuit reseeds from the day');
  assert.ok(gameplay.dailyRun.dailySeed > 0, 'the daily seed is a positive number');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing the Daily Circuit finishes the run');
  assert.equal(gameplay.dailyRun.title, 'Daily Circuit complete!', 'the daily run has its own victory title');
  assert.ok(gameplay.dailyRun.sub.includes(String(gameplay.dailyRun.dailySeed)), 'the daily result names its seed');
  assert.equal(gameplay.dailyRun.dailyBest, gameplay.dailyRun.score, 'the daily best matches the final score');
  assert.equal(gameplay.dailyRun.saveBest, gameplay.dailyRun.score, 'the day record stores the best score');
  assert.equal(gameplay.dailyRun.saveDay, today, 'the daily record is dated today');

  assert.equal(gameplay.deathRun.state, 'over', 'running out of lives ends the run');
  assert.match(gameplay.deathRun.title, /Caught!/, 'the caught title is shown');
  assert.match(gameplay.deathRun.sub, /CLASSIC/, 'the defeat names the active mode');
  assert.equal(gameplay.deathRun.runs, 1, 'a finished run is recorded once');
  assert.equal(gameplay.deathRun.bestScore, 4321, 'the best score is persisted on defeat');

  assert.deepEqual(gameplay.nightfallRun, {
    lives: 2,
    drones: ['dart', 'lurk', 'flank', 'drift', 'shade'],
    shade: true,
    score: 75,
    frT: 270,
    allFr: true,
    state: 'won',
    title: 'Nightfall complete!',
    clears: 1,
    achievement: true,
    reports: [{ gameId: 'glow-beetle', type: 'level_complete', level: 8, score: 840, mode: 'nightfall' }],
  }, 'Nightfall adds a fifth hunter and pays 1.5x across eight mazes');

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'skin'), 'Glow Beetle has shell cosmetics');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'palette'), 'Glow Beetle has maze palettes');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'trail'), 'Glow Beetle has pulse trails');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'theme'), 'Glow Beetle has vault themes');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'glow-beetle:amber-shell'), 'the amber shell is registered');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'glow-beetle:ocean-maze'), 'the ocean maze palette is registered');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'glow-beetle:golden-pulse'), 'the golden pulse trail is registered');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'glow-beetle:dawn-vault'), 'the dawn vault theme is registered');

  await page.evaluate(() => {
    glowBeetleGame.ui.setMode('classic');
    glowBeetleGame.restart(false);
  });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.evaluate(() => A.test.step(120));
  await page.waitForTimeout(150);
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: getComputedStyle(document.querySelector('.apex-game-menu')).display,
  }));
  assert.equal(chrome.shell, false, 'the game shell no longer renders a button bar or controls box');
  assert.equal(chrome.menuToolbar, 'none', 'no control toolbar covers a live run');

  const reporter = await page.evaluate(() => {
    const panel = () => document.getElementById('arc-err')?.textContent || null;
    window.dispatchEvent(new ErrorEvent('error', {
      message: 'args[2]?.includes is not a function',
      filename: 'chrome-extension://test-extension/content/popups-script.js',
      lineno: 68,
    }));
    const foreign = panel();
    window.dispatchEvent(new ErrorEvent('error', { message: 'reporter self test', filename: location.href, lineno: 1 }));
    const local = panel();
    document.getElementById('arc-err')?.remove();
    return { foreign, local };
  });
  assert.equal(reporter.foreign, null, 'extension-injected script errors stay out of the game view');
  assert.match(reporter.local, /reporter self test/, 'the on-screen reporter still surfaces this page\'s own errors');

  await page.screenshot({ path: path.join(tmpdir(), 'game-06-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/#/game/pac-man`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.keyboard.press('Space');
  await theaterPage.getByText('START MAZE').waitFor({ state: 'detached' });
  await theaterPage.waitForTimeout(1800);
  await theaterPage.keyboard.press('ArrowLeft');
  await theaterPage.keyboard.press('ArrowUp');
  await theaterPage.waitForTimeout(500);
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-06-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS maze, cores, chains, gems, levels, modes, records, and menus behave correctly');
  console.log('PASS game 06 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
