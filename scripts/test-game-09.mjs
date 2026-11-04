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
  await page.goto(`${origin}${basePath}/assets/games/09-mario-world/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof CloudhopPipTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
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
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}:cloudhop-pip`;
      let hash = 2166136261;
      for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0) || 1;
    })();
    if (useDaily) CloudhopPipTest.setMode('daily');
    else CloudhopPipTest.setMode('endless');
    CloudhopPipTest.restart(false);
    const state = CloudhopPipTest.state();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      total: state.total,
      names: CloudhopPipTest.routeNames(),
      layout: CloudhopPipTest.layout(),
      sequence: CloudhopPipTest.sequence(10),
    };
  }, daily);
  await context.close();
  return data;
}

try {
  const seedA = await seededRoute(42, false);
  const seedB = await seededRoute(42, false);
  const seedC = await seededRoute(43, false);

  assert.equal(seedA.seed, 42, 'the endless run reads the requested seed');
  assert.deepEqual(seedA.sequence, seedB.sequence, 'the same seed produces the same RNG stream');
  assert.deepEqual(seedA.layout, seedB.layout, 'the same seed produces the same isle layout');
  assert.notDeepEqual(seedA.sequence, seedC.sequence, 'a different seed produces a different RNG stream');
  assert.notDeepEqual(seedA.layout, seedC.layout, 'a different seed produces a different isle layout');
  console.log('PASS seeded Cloudhop Pip isles are deterministic');

  const dailyA = await seededRoute(42, true);
  const dailyB = await seededRoute(43, true);
  assert.equal(dailyA.mode, 'daily', 'Daily Drift can be selected');
  assert.equal(dailyA.expected, dailyA.seed, 'Daily Drift uses the local-day seed');
  assert.equal(dailyA.total, 3, 'Daily Drift runs three isles');
  assert.deepEqual(dailyA.layout, dailyB.layout, 'Daily Drift shares one start for the day');
  assert.deepEqual(dailyA.sequence, dailyB.sequence, 'Daily Drift shares one RNG stream for the day');
  console.log('PASS Daily Drift is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };
    const stats = () => Save.load('cloudhop-pip').stats || {};
    const achievements = () => Save.load('cloudhop-pip').achievements || [];
    const state = () => CloudhopPipTest.state();
    const clearRoutes = (count) => {
      for (let i = 0; i < count && Arcade.G.state === 'playing'; i++) {
        CloudhopPipTest.clearCourse();
        Arcade.test.step(100);
      }
    };
    const awardOnce = (mode) => {
      CloudhopPipTest.setMode(mode);
      CloudhopPipTest.restart(false);
      CloudhopPipTest.setDifficulty('normal');
      const before = Arcade.G.score;
      CloudhopPipTest.award(100);
      return Arcade.G.score - before;
    };

    // Double jump, cape glide, and checkpoint respawn
    CloudhopPipTest.setMode('campaign');
    CloudhopPipTest.restart(true);
    Arcade.test.step(2);
    Arcade.test.press('Space');
    Arcade.test.step(2);
    Arcade.test.release('Space');
    const firstJump = state();
    Arcade.test.step(4);
    Arcade.test.press('Space');
    Arcade.test.step(1);
    Arcade.test.release('Space');
    const secondJump = state();
    Arcade.test.press('ShiftLeft');
    let glide = { seen: false, vy: null };
    for (let i = 0; i < 24; i++) {
      Arcade.test.step(1);
      const s = state();
      if (s.gliding) {
        glide = { seen: true, vy: s.vy };
        break;
      }
    }
    Arcade.test.release('ShiftLeft');
    const doubleJumpUnlocked = achievements().includes('double-jumper');

    CloudhopPipTest.restart(true);
    Arcade.test.step(2);
    CloudhopPipTest.teleportTile(52, 11);
    Arcade.test.step(3);
    const checkpoint = state();
    CloudhopPipTest.die();
    Arcade.test.step(75);
    const respawn = state();
    const checkpointUnlocked = achievements().includes('checkpoint');

    const lockedStorm = CloudhopPipTest.setMode('storm') === false;
    const modeAfterLock = state().mode;
    const multCampaign = awardOnce('campaign');
    const multDash = awardOnce('dash');
    const multDaily = awardOnce('daily');
    const multEndless = awardOnce('endless');

    CloudhopPipTest.setMode('campaign');
    CloudhopPipTest.setDifficulty('normal');
    CloudhopPipTest.restart(true);
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

    const unlockedStorm = CloudhopPipTest.setMode('storm') === true;
    const multStorm = awardOnce('storm');

    CloudhopPipTest.setMode('storm');
    CloudhopPipTest.setDifficulty('normal');
    CloudhopPipTest.restart(true);
    const stormStart = { lives: state().lives, hp: state().hp, timerMode: state().timerMode, total: state().total };
    clearRoutes(3);
    const stormState = state();
    const stormRun = {
      start: stormStart,
      state: stormState.state,
      title: Arcade.G.title,
      score: Arcade.G.score,
      hudR: Arcade.G.hudR,
      clears: Number(stats().stormfrontClears) || 0,
      best: Number(stats().stormBest) || 0,
      achievements: achievements(),
    };

    CloudhopPipTest.setMode('endless');
    CloudhopPipTest.setDifficulty('normal');
    CloudhopPipTest.restart(true);
    const beforeEarly = Arcade.G.score;
    CloudhopPipTest.award(100);
    const endlessFirst = Arcade.G.score - beforeEarly;
    CloudhopPipTest.clearCourse();
    Arcade.test.step(100);
    const beforeSecond = Arcade.G.score;
    CloudhopPipTest.award(100);
    const endlessSecond = Arcade.G.score - beforeSecond;
    clearRoutes(5);
    const endlessState = state();
    const endlessRun = {
      course: endlessState.course,
      index: endlessState.courseIndex,
      total: endlessState.total,
      names: CloudhopPipTest.routeNames(),
      best: Number(stats().endlessBest) || 0,
      achievement: achievements().includes('endless-six'),
    };

    CloudhopPipTest.setMode('daily');
    CloudhopPipTest.setDifficulty('normal');
    CloudhopPipTest.restart(true);
    const dailySeedRun = { seed: state().seed, total: state().total };
    const dailyReportStart = reports.length;
    clearRoutes(3);
    const dailyState = state();
    const dailySave = Save.load('cloudhop-pip');
    const dailyRun = {
      ...dailySeedRun,
      state: dailyState.state,
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      score: Arcade.G.score,
      reports: reports
        .slice(dailyReportStart)
        .filter((event) => event.type === 'level_complete')
        .map((event) => ({ level: event.level, mode: event.mode })),
      dailyBest: Number(stats().dailyBest) || 0,
      saveBest: Number(dailySave.daily && dailySave.daily.best) || 0,
      saveDay: dailySave.daily && dailySave.daily.day,
      courses: Number(stats().dailyCourses) || 0,
      achievement: achievements().includes('daily-drift'),
    };

    CloudhopPipTest.setMode('dash');
    CloudhopPipTest.setDifficulty('normal');
    CloudhopPipTest.restart(true);
    const dashStart = { lives: state().lives, timerMode: state().timerMode, timer: state().timer, total: state().total };
    CloudhopPipTest.setTimer(30);
    CloudhopPipTest.clearCourse();
    const dashClearTimer = state().timer;
    CloudhopPipTest.restart(true);
    CloudhopPipTest.setTimer(0);
    Arcade.test.step(1);
    const dashTimeout = { state: Arcade.G.state, title: Arcade.G.title, sub: Arcade.G.sub };

    CloudhopPipTest.setDifficulty('hard');
    CloudhopPipTest.restart(false);
    const beforeHard = Arcade.G.score;
    CloudhopPipTest.award(100);
    const multHard = Arcade.G.score - beforeHard;

    const menuActions = [...document.querySelectorAll('.apex-menu-root [data-menu-action]')].map((element) => element.getAttribute('data-menu-action'));
    const customizeCatalog = Meta.getCosmetics('cloudhop-pip').map((item) => ({ id: item.id, slot: item.slot }));
    CloudhopPipTest.cosmetic('skin', 'cloudhop-pip:pip-lilac');
    const skinColors = CloudhopPipTest.colors();
    CloudhopPipTest.cosmetic('palette', 'cloudhop-pip:coin-sunrise');
    const paletteColors = CloudhopPipTest.colors();
    CloudhopPipTest.cosmetic('trail', 'cloudhop-pip:scarf-aurora');
    CloudhopPipTest.cosmetic('theme', 'cloudhop-pip:theme-starfall');
    const styledColors = CloudhopPipTest.colors();

    return {
      firstJump,
      secondJump,
      glide,
      doubleJumpUnlocked,
      checkpoint,
      respawn,
      checkpointUnlocked,
      lockedStorm,
      modeAfterLock,
      unlockedStorm,
      multCampaign,
      multDash,
      multDaily,
      multEndless,
      multStorm,
      multHard,
      campaignRun,
      stormRun,
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

  assert.deepEqual(
    { jumps: gameplay.firstJump.jumps, double: gameplay.firstJump.doubleJumps },
    { jumps: 1, double: 0 },
    'the first jump leaves one air jump available',
  );
  assert.deepEqual(
    { jumps: gameplay.secondJump.jumps, double: gameplay.secondJump.doubleJumps },
    { jumps: 2, double: 1 },
    'the second press performs a double jump',
  );
  assert.equal(gameplay.glide.seen, true, 'holding Shift while falling glides');
  assert.ok(gameplay.glide.vy > 0 && gameplay.glide.vy <= 2.2, 'gliding caps the fall speed');
  assert.equal(gameplay.doubleJumpUnlocked, false, 'one double jump does not unlock the twenty-jump achievement');
  assert.equal(gameplay.checkpoint.check, true, 'touching a checkpoint lights it');
  assert.equal(gameplay.respawn.check, true, 'respawn keeps the checkpoint');
  assert.equal(gameplay.respawn.lives, 2, 'dying costs one life');
  assert.equal(gameplay.respawn.x, 1670, 'respawn returns to the checkpoint tile');
  assert.equal(gameplay.checkpointUnlocked, true, 'lighting a checkpoint unlocks Cloud Anchor');

  assert.equal(gameplay.lockedStorm, true, 'Stormfront stays locked until three isles are cleared');
  assert.equal(gameplay.modeAfterLock, 'campaign', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedStorm, true, 'clearing the campaign unlocks Stormfront');
  assert.equal(gameplay.multCampaign, 100, 'Campaign pays the base score');
  assert.equal(gameplay.multDash, 100, 'Breeze Dash pays the base score');
  assert.equal(gameplay.multDaily, 125, 'Daily Drift pays 1.25x');
  assert.equal(gameplay.multEndless, 110, 'Endless Ascent starts at 1.1x');
  assert.equal(gameplay.multStorm, 150, 'Stormfront pays 1.5x');
  assert.equal(gameplay.multHard, 125, 'hard difficulty adds the shared 1.25x bonus');

  assert.deepEqual(gameplay.campaignRun.start, { lives: 3, course: 1, total: 3 }, 'the campaign starts on isle one with three lives');
  assert.deepEqual(gameplay.campaignRun.end, { state: 'won', course: 3, lives: 3 }, 'three isles finish the campaign in one running session');
  assert.equal(gameplay.campaignRun.title, 'Sky Cleared!', 'the campaign has its own victory title');
  assert.match(gameplay.campaignRun.sub, /^All three isles · score 2400$/, 'the campaign reports the isle count and final score');
  assert.equal(gameplay.campaignRun.score, 2400, 'each campaign isle pays an 800 point clear bonus');
  assert.match(gameplay.campaignRun.hudL, /^SCORE 2400 · COINS 0 · ISLE 3\/3$/, 'the HUD tracks score, coins, and isle progress');
  assert.match(gameplay.campaignRun.hudR, /^♥♥♥  LIVES 3 · CAMPAIGN$/, 'the HUD tracks hearts, lives, and mode');
  assert.deepEqual(
    gameplay.campaignRun.reports.map((event) => ({ gameId: event.gameId, level: event.level, mode: event.mode })),
    [
      { gameId: 'cloudhop-pip', level: 1, mode: 'campaign' },
      { gameId: 'cloudhop-pip', level: 2, mode: 'campaign' },
      { gameId: 'cloudhop-pip', level: 3, mode: 'campaign' },
    ],
    'each isle reports progress to the host',
  );
  assert.equal(gameplay.campaignRun.stats.coursesCleared, 3, 'every cleared isle is recorded');
  assert.equal(gameplay.campaignRun.stats.bestCourses, 3, 'the best isle is persisted');
  assert.equal(gameplay.campaignRun.stats.campaignStage, 1, 'the campaign resets to isle one after a full clear');
  assert.equal(gameplay.campaignRun.stats.campaignLives, 3, 'the campaign restores its lives after a full clear');
  assert.equal(gameplay.campaignRun.stats.campaignClears, 1, 'a completed campaign is recorded once');
  assert.equal(gameplay.campaignRun.stats.runs, 1, 'a finished run is recorded once');
  for (const id of ['first-hop', 'perfect-isle', 'all-isles', 'no-loss']) {
    assert.ok(gameplay.campaignRun.achievements.includes(id), `${id} unlocks during a clean campaign`);
  }

  assert.deepEqual(gameplay.stormRun.start, { lives: 1, hp: 2, timerMode: false, total: 3 }, 'Stormfront starts with one life and two hearts');
  assert.equal(gameplay.stormRun.state, 'won', 'three isles finish Stormfront');
  assert.equal(gameplay.stormRun.title, 'Stormfront Cleared!', 'Stormfront has its own victory title');
  assert.equal(gameplay.stormRun.score, 3150, 'Stormfront pays 1.5x on every two-heart clear bonus');
  assert.match(gameplay.stormRun.hudR, /^♥♥  LIVES 1 · STORMFRONT$/, 'the Stormfront HUD keeps its mode identity');
  assert.equal(gameplay.stormRun.clears, 1, 'a completed Stormfront run is recorded');
  assert.equal(gameplay.stormRun.best, 3, 'the Stormfront best isle is persisted');
  assert.ok(gameplay.stormRun.achievements.includes('storm-clear'), 'Stormfront unlocks its clear achievement');
  assert.ok(gameplay.stormRun.achievements.includes('untouchable'), 'a clean Stormfront unlocks Untouchable');

  assert.equal(gameplay.endlessFirst, 110, 'the first endless isle pays 1.1x');
  assert.equal(gameplay.endlessSecond, 115, 'the endless multiplier grows with the isle number');
  assert.equal(gameplay.endlessRun.course, 7, 'Endless Ascent keeps generating isles');
  assert.equal(gameplay.endlessRun.index, 6, 'the endless index tracks every generated isle');
  assert.equal(gameplay.endlessRun.total, 7, 'every generated isle is appended to the route');
  assert.deepEqual(gameplay.endlessRun.names, ['Isle 1', 'Isle 2', 'Isle 3', 'Isle 4', 'Isle 5', 'Isle 6', 'Isle 7'], 'endless isles are numbered in order');
  assert.equal(gameplay.endlessRun.best, 6, 'the endless best records isle six');
  assert.equal(gameplay.endlessRun.achievement, true, 'reaching isle six unlocks High Climber');

  assert.equal(gameplay.dailyRun.seed, dailyA.expected, 'Daily Drift reseeds from the local day');
  assert.equal(gameplay.dailyRun.total, 3, 'Daily Drift runs three isles');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Drift finishes the run');
  assert.equal(gameplay.dailyRun.title, 'Daily Drift Complete!', 'the daily run has its own victory title');
  assert.ok(gameplay.dailyRun.sub.includes(String(gameplay.dailyRun.seed)), 'the daily result names its seed');
  assert.equal(gameplay.dailyRun.score, 3000, 'the daily run pays 1.25x on every clear bonus');
  assert.deepEqual(gameplay.dailyRun.reports, [
    { level: 1, mode: 'daily' },
    { level: 2, mode: 'daily' },
    { level: 3, mode: 'daily' },
  ], 'daily isle clears report their mode');
  assert.equal(gameplay.dailyRun.dailyBest, 3000, 'the daily best matches the final score');
  assert.equal(gameplay.dailyRun.saveBest, 3000, 'the day record stores the best score');
  assert.equal(gameplay.dailyRun.saveDay, today, 'the daily record is dated today');
  assert.equal(gameplay.dailyRun.courses, 3, 'all daily isles are recorded');
  assert.equal(gameplay.dailyRun.achievement, true, 'finishing Daily Drift unlocks Daily Drifter');

  assert.deepEqual(gameplay.dashStart, { lives: 2, timerMode: true, timer: 140, total: 3 }, 'Breeze Dash starts with a 140 second clock');
  assert.equal(gameplay.dashClearTimer, 45, 'clearing a dash isle adds fifteen seconds');
  assert.equal(gameplay.dashTimeout.state, 'over', 'running the dash clock out ends the run');
  assert.equal(gameplay.dashTimeout.title, 'Out of Time', 'the dash timeout has its own defeat title');
  assert.match(gameplay.dashTimeout.sub, /· BREEZE DASH$/, 'the defeat names Breeze Dash');

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.equal(gameplay.customizeCatalog.length, 13, 'Cloudhop Pip ships 13 cosmetics');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'skin'), 'Cloudhop Pip has frog skins');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'palette'), 'Cloudhop Pip has coin palettes');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'trail'), 'Cloudhop Pip has cape trails');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'theme'), 'Cloudhop Pip has sky themes');
  for (const id of ['cloudhop-pip:pip-mint', 'cloudhop-pip:coin-star', 'cloudhop-pip:scarf-aurora', 'cloudhop-pip:theme-starfall', 'cloudhop-pip:pip-midnight']) {
    assert.ok(gameplay.customizeCatalog.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(
    { body: gameplay.skinColors.body, belly: gameplay.skinColors.belly },
    { body: '#a78bfa', belly: '#f5d0fe' },
    'the Lilac Pip skin repaints the frog',
  );
  assert.deepEqual(
    { coin: gameplay.paletteColors.coin, spring: gameplay.paletteColors.spring, trail: gameplay.paletteColors.trail },
    { coin: '#fdba74', spring: '#fb7185', trail: '#f43f5e' },
    'the Sunrise Coin palette repaints coins and springs but leaves the cape alone',
  );
  assert.deepEqual(
    { trail: gameplay.styledColors.trail, sky: gameplay.styledColors.sky },
    { trail: '#67e8f9', sky: ['#0b0716', '#4c1d95', '#f0abfc'] },
    'cape and theme cosmetics each repaint their target',
  );
  console.log('PASS modes, double jump, glide, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    CloudhopPipTest.setMode('campaign');
    CloudhopPipTest.setDifficulty('normal');
    CloudhopPipTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-09-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/#/game/super-mario-world`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.keyboard.press('Space');
  await theaterPage.getByText('START ISLE').waitFor({ state: 'detached' });
  await theaterPage.getByText(/Isle 1\/3 · Floating Isles/).waitFor({ state: 'visible' });
  await theaterPage.keyboard.down('ArrowRight');
  await theaterPage.waitForTimeout(700);
  await theaterPage.keyboard.press('Space');
  await theaterPage.waitForTimeout(250);
  await theaterPage.keyboard.press('Space');
  await theaterPage.keyboard.down('ShiftLeft');
  await theaterPage.waitForTimeout(500);
  await theaterPage.keyboard.up('ShiftLeft');
  await theaterPage.keyboard.up('ArrowRight');
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-09-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 09 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
