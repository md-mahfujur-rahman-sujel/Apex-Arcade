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
  await page.goto(`${origin}${basePath}/assets/games/08-mario/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof FoxCourierTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

const today = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
})();

async function seededRoute(urlSeed, daily) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate((useDaily) => {
    const expected = (() => {
      const d = new Date();
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}:fox-courier`;
      let hash = 2166136261;
      for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0) || 1;
    })();
    if (useDaily) FoxCourierTest.setMode('daily');
    FoxCourierTest.restart(false);
    const state = FoxCourierTest.state();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      total: state.total,
      names: FoxCourierTest.routeNames(),
      layout: FoxCourierTest.layout(),
      sequence: FoxCourierTest.sequence(10),
    };
  }, daily);
  await context.close();
  return data;
}

try {
  const seedA = await seededRoute(42, false);
  const seedB = await seededRoute(42, false);
  const seedC = await seededRoute(43, false);

  assert.equal(seedA.seed, 42, 'the campaign reads the requested seed');
  assert.deepEqual(seedA.sequence, seedB.sequence, 'the same seed produces the same RNG stream');
  assert.deepEqual(seedA.layout, seedB.layout, 'the same seed produces the same course layout');
  assert.notDeepEqual(seedA.sequence, seedC.sequence, 'a different seed produces a different RNG stream');
  console.log('PASS seeded Fox Courier routes are deterministic');

  const dailyA = await seededRoute(42, true);
  const dailyB = await seededRoute(43, true);
  assert.equal(dailyA.mode, 'daily', 'Daily Route can be selected');
  assert.equal(dailyA.expected, dailyA.seed, 'Daily Route uses the day seed');
  assert.equal(dailyA.total, 3, 'Daily Route runs three routes');
  assert.deepEqual(dailyA.layout, dailyB.layout, 'Daily Route shares one start for the day');
  assert.deepEqual(dailyA.sequence, dailyB.sequence, 'Daily Route shares one RNG stream for the day');
  console.log('PASS Daily Route is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };
    const stats = () => Save.load('fox-courier').stats || {};
    const achievements = () => Save.load('fox-courier').achievements || [];
    const state = () => FoxCourierTest.state();
    const clearRoutes = (count) => {
      for (let i = 0; i < count && Arcade.G.state === 'playing'; i++) {
        FoxCourierTest.clearCourse();
        Arcade.test.step(100);
      }
    };
    const awardOnce = (mode) => {
      FoxCourierTest.setMode(mode);
      FoxCourierTest.restart(false);
      FoxCourierTest.setDifficulty('normal');
      const before = Arcade.G.score;
      FoxCourierTest.award(100);
      return Arcade.G.score - before;
    };

    const lockedMidnight = FoxCourierTest.setMode('midnight') === false;
    const modeAfterLock = state().mode;
    const multCampaign = awardOnce('campaign');
    const multDash = awardOnce('dash');
    const multDaily = awardOnce('daily');
    const multEndless = awardOnce('endless');

    FoxCourierTest.setMode('campaign');
    FoxCourierTest.setDifficulty('normal');
    FoxCourierTest.restart(true);
    const campaignStart = state();
    const campaignReportStart = reports.length;
    clearRoutes(3);
    const campaignState = state();
    const campaignRun = {
      start: { lives: campaignStart.lives, course: campaignStart.course, total: campaignStart.total },
      end: { state: campaignState.state, course: campaignState.course, lives: campaignState.lives },
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      score: Arcade.G.score,
      hudL: Arcade.G.hudL,
      hudR: Arcade.G.hudR,
      reports: reports.slice(campaignReportStart).filter((event) => event.type === 'level_complete'),
      stats: stats(),
      achievements: achievements(),
    };

    const unlockedMidnight = FoxCourierTest.setMode('midnight') === true;
    const multMidnight = awardOnce('midnight');

    FoxCourierTest.setMode('midnight');
    FoxCourierTest.setDifficulty('normal');
    FoxCourierTest.restart(true);
    const midnightStart = { lives: state().lives, hp: state().hp };
    clearRoutes(3);
    const midnightState = state();
    const midnightRun = {
      start: midnightStart,
      state: midnightState.state,
      title: Arcade.G.title,
      score: Arcade.G.score,
      hudR: Arcade.G.hudR,
      clears: Number(stats().midnightClears) || 0,
      best: Number(stats().midnightBest) || 0,
      achievements: achievements(),
    };

    FoxCourierTest.setMode('endless');
    FoxCourierTest.setDifficulty('normal');
    FoxCourierTest.restart(true);
    const beforeEarly = Arcade.G.score;
    FoxCourierTest.award(100);
    const endlessFirst = Arcade.G.score - beforeEarly;
    FoxCourierTest.clearCourse();
    Arcade.test.step(100);
    const beforeSecond = Arcade.G.score;
    FoxCourierTest.award(100);
    const endlessSecond = Arcade.G.score - beforeSecond;
    clearRoutes(4);
    const endlessState = state();
    const endlessRun = {
      course: endlessState.course,
      index: endlessState.courseIndex,
      total: endlessState.total,
      names: FoxCourierTest.routeNames(),
      best: Number(stats().endlessBest) || 0,
      achievement: achievements().includes('endless-five'),
    };

    FoxCourierTest.setMode('daily');
    FoxCourierTest.setDifficulty('normal');
    FoxCourierTest.restart(true);
    const dailySeedRun = { seed: state().seed, total: state().total };
    const dailyReportStart = reports.length;
    clearRoutes(3);
    const dailyState = state();
    const dailySave = Save.load('fox-courier');
    const dailyRun = {
      ...dailySeedRun,
      state: dailyState.state,
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      score: Arcade.G.score,
      reports: reports.slice(dailyReportStart).filter((event) => event.type === 'level_complete').map((event) => ({ level: event.level, mode: event.mode })),
      dailyBest: Number(stats().dailyBest) || 0,
      saveBest: Number(dailySave.daily && dailySave.daily.best) || 0,
      saveDay: dailySave.daily && dailySave.daily.day,
      courses: Number(stats().dailyCourses) || 0,
      achievement: achievements().includes('daily-runner'),
    };

    FoxCourierTest.setMode('dash');
    FoxCourierTest.setDifficulty('normal');
    FoxCourierTest.restart(true);
    const dashStart = { lives: state().lives, timerMode: state().timerMode, timer: state().timer, total: state().total };
    FoxCourierTest.setTimer(30);
    FoxCourierTest.clearCourse();
    const dashClearTimer = state().timer;
    FoxCourierTest.restart(true);
    FoxCourierTest.setTimer(0);
    Arcade.test.step(1);
    const dashTimeout = { state: Arcade.G.state, title: Arcade.G.title, sub: Arcade.G.sub };

    FoxCourierTest.setDifficulty('hard');
    FoxCourierTest.restart(false);
    const beforeHard = Arcade.G.score;
    FoxCourierTest.award(100);
    const multHard = Arcade.G.score - beforeHard;

    const menuActions = [...document.querySelectorAll('.apex-menu-root [data-menu-action]')].map((element) => element.getAttribute('data-menu-action'));
    const customizeCatalog = Meta.getCosmetics('fox-courier').map((item) => ({ id: item.id, slot: item.slot }));
    FoxCourierTest.cosmetic('skin', 'fox-courier:courier-mint');
    const skinColors = FoxCourierTest.colors();
    FoxCourierTest.cosmetic('palette', 'fox-courier:coin-solar');
    const paletteColors = FoxCourierTest.colors();
    FoxCourierTest.cosmetic('trail', 'fox-courier:scarf-aurora');
    FoxCourierTest.cosmetic('theme', 'fox-courier:theme-snowline');
    const styledColors = FoxCourierTest.colors();

    return {
      lockedMidnight,
      modeAfterLock,
      unlockedMidnight,
      multCampaign,
      multDash,
      multDaily,
      multEndless,
      multMidnight,
      multHard,
      campaignRun,
      midnightRun,
      endlessFirst,
      endlessSecond,
      endlessRun,
      dailyRun,
      dashStart,
      dashClearTimer,
      dashTimeout,
      menuActions,
      customizeCatalog,
      skinColors,
      paletteColors,
      styledColors,
    };
  });

  assert.equal(gameplay.lockedMidnight, true, 'Midnight Run stays locked until three routes are cleared');
  assert.equal(gameplay.modeAfterLock, 'campaign', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedMidnight, true, 'clearing the campaign unlocks Midnight Run');
  assert.equal(gameplay.multCampaign, 100, 'Campaign pays the base score');
  assert.equal(gameplay.multDash, 100, 'Parcel Dash pays the base score');
  assert.equal(gameplay.multDaily, 125, 'Daily Route pays 1.25x');
  assert.equal(gameplay.multEndless, 110, 'Endless Delivery starts at 1.1x');
  assert.equal(gameplay.multMidnight, 150, 'Midnight Run pays 1.5x');
  assert.equal(gameplay.multHard, 125, 'hard difficulty adds the shared 1.25x bonus');

  assert.deepEqual(gameplay.campaignRun.start, { lives: 3, course: 1, total: 3 }, 'the campaign starts on route one with three lives');
  assert.deepEqual(gameplay.campaignRun.end, { state: 'won', course: 3, lives: 3 }, 'three routes finish the campaign in one running session');
  assert.equal(gameplay.campaignRun.title, 'Parcels Delivered!', 'the campaign has its own victory title');
  assert.match(gameplay.campaignRun.sub, /^All three routes · score 2400$/, 'the campaign reports the route count and final score');
  assert.equal(gameplay.campaignRun.score, 2400, 'each campaign route pays a 800 point clear bonus');
  assert.match(gameplay.campaignRun.hudL, /^SCORE 2400 · COINS 0 · ROUTE 3\/3$/, 'the HUD tracks score, coins, and route progress');
  assert.match(gameplay.campaignRun.hudR, /^♥♥♥  LIVES 3 · CAMPAIGN$/, 'the HUD tracks hearts, lives, and mode');
  assert.deepEqual(
    gameplay.campaignRun.reports.map((event) => ({ gameId: event.gameId, level: event.level, mode: event.mode })),
    [
      { gameId: 'fox-courier', level: 1, mode: 'campaign' },
      { gameId: 'fox-courier', level: 2, mode: 'campaign' },
      { gameId: 'fox-courier', level: 3, mode: 'campaign' },
    ],
    'each route reports progress to the host',
  );
  assert.equal(gameplay.campaignRun.stats.coursesCleared, 3, 'every cleared route is recorded');
  assert.equal(gameplay.campaignRun.stats.bestCourses, 3, 'the best route is persisted');
  assert.equal(gameplay.campaignRun.stats.campaignStage, 1, 'the campaign resets to route one after a full clear');
  assert.equal(gameplay.campaignRun.stats.campaignLives, 3, 'the campaign restores its lives after a full clear');
  assert.equal(gameplay.campaignRun.stats.campaignClears, 1, 'a completed campaign is recorded once');
  assert.equal(gameplay.campaignRun.stats.runs, 1, 'a finished run is recorded once');
  for (const id of ['first-parcel', 'perfect-course', 'all-courses', 'no-loss']) {
    assert.ok(gameplay.campaignRun.achievements.includes(id), `${id} unlocks during a clean campaign`);
  }

  assert.deepEqual(gameplay.midnightRun.start, { lives: 1, hp: 2 }, 'Midnight Run starts with one life and two hearts');
  assert.equal(gameplay.midnightRun.state, 'won', 'three routes finish Midnight Run');
  assert.equal(gameplay.midnightRun.title, 'Midnight Delivery!', 'Midnight Run has its own victory title');
  assert.equal(gameplay.midnightRun.score, 3150, 'Midnight Run pays 1.5x on every two-heart clear bonus');
  assert.match(gameplay.midnightRun.hudR, /^♥♥  LIVES 1 · MIDNIGHT RUN$/, 'the midnight HUD keeps its mode identity');
  assert.equal(gameplay.midnightRun.clears, 1, 'a completed midnight run is recorded');
  assert.equal(gameplay.midnightRun.best, 3, 'the midnight best route is persisted');
  assert.ok(gameplay.midnightRun.achievements.includes('midnight-clear'), 'Midnight Run unlocks its clear achievement');
  assert.ok(gameplay.midnightRun.achievements.includes('untouchable'), 'a clean Midnight Run unlocks Untouchable');

  assert.equal(gameplay.endlessFirst, 110, 'the first endless route pays 1.1x');
  assert.equal(gameplay.endlessSecond, 115, 'the endless multiplier grows with the route number');
  assert.deepEqual(gameplay.endlessRun, {
    course: 6,
    index: 5,
    total: 6,
    names: ['Route 1', 'Route 2', 'Route 3', 'Route 4', 'Route 5', 'Route 6'],
    best: 5,
    achievement: true,
  }, 'Endless Delivery keeps generating routes and records route five');

  assert.equal(gameplay.dailyRun.seed, dailyA.expected, 'Daily Route reseeds from the day');
  assert.equal(gameplay.dailyRun.total, 3, 'Daily Route runs three routes');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Route finishes the run');
  assert.equal(gameplay.dailyRun.title, 'Daily Route Complete!', 'the daily run has its own victory title');
  assert.ok(gameplay.dailyRun.sub.includes(String(gameplay.dailyRun.seed)), 'the daily result names its seed');
  assert.equal(gameplay.dailyRun.score, 3000, 'the daily run pays 1.25x on every clear bonus');
  assert.deepEqual(gameplay.dailyRun.reports, [
    { level: 1, mode: 'daily' },
    { level: 2, mode: 'daily' },
    { level: 3, mode: 'daily' },
  ], 'daily route clears report their mode');
  assert.equal(gameplay.dailyRun.dailyBest, 3000, 'the daily best matches the final score');
  assert.equal(gameplay.dailyRun.saveBest, 3000, 'the day record stores the best score');
  assert.equal(gameplay.dailyRun.saveDay, today, 'the daily record is dated today');
  assert.equal(gameplay.dailyRun.courses, 3, 'all daily routes are recorded');
  assert.equal(gameplay.dailyRun.achievement, true, 'finishing Daily Route unlocks Daily Courier');

  assert.deepEqual(gameplay.dashStart, { lives: 2, timerMode: true, timer: 150, total: 3 }, 'Parcel Dash starts with a 150 second clock');
  assert.equal(gameplay.dashClearTimer, 50, 'clearing a dash route adds twenty seconds');
  assert.equal(gameplay.dashTimeout.state, 'over', 'running the dash clock out ends the run');
  assert.equal(gameplay.dashTimeout.title, 'Out of Time', 'the dash timeout has its own defeat title');
  assert.match(gameplay.dashTimeout.sub, /· PARCEL DASH$/, 'the defeat names Parcel Dash');

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'skin'), 'Fox Courier has courier skins');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'palette'), 'Fox Courier has coin palettes');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'trail'), 'Fox Courier has scarf trails');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'theme'), 'Fox Courier has route themes');
  for (const id of ['fox-courier:courier-mint', 'fox-courier:coin-solar', 'fox-courier:scarf-aurora', 'fox-courier:theme-snowline', 'fox-courier:parcel-gold']) {
    assert.ok(gameplay.customizeCatalog.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(
    { body: gameplay.skinColors.body, scarf: gameplay.skinColors.scarf },
    { body: '#6ee7b7', scarf: '#f0fdfa' },
    'the Mint Courier skin repaints the fox',
  );
  assert.deepEqual(
    { coin: gameplay.paletteColors.coin, spring: gameplay.paletteColors.spring, trail: gameplay.paletteColors.trail },
    { coin: '#fde047', spring: '#fb7185', trail: '#ef4444' },
    'the Solar Coin palette repaints coins and springs but leaves the trail alone',
  );
  assert.deepEqual(
    { trail: gameplay.styledColors.trail, sky: gameplay.styledColors.sky },
    { trail: '#67e8f9', sky: ['#0f172a', '#334155', '#e2e8f0'] },
    'trail and theme cosmetics each repaint their target',
  );

  await page.evaluate(() => {
    FoxCourierTest.setMode('campaign');
    FoxCourierTest.restart(false);
  });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.evaluate(() => Arcade.test.step(120));
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-08-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/#/game/super-mario-bros`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.keyboard.press('Space');
  await theaterPage.getByText('START ROUTE').waitFor({ state: 'detached' });
  await theaterPage.getByText(/Route 1\/3 · Meadow Run/).waitFor({ state: 'visible' });
  await theaterPage.keyboard.down('ArrowRight');
  await theaterPage.waitForTimeout(900);
  await theaterPage.keyboard.press('Space');
  await theaterPage.waitForTimeout(900);
  await theaterPage.keyboard.up('ArrowRight');
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-08-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS modes, campaigns, records, cosmetics, and menus behave correctly');
  console.log('PASS game 08 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
