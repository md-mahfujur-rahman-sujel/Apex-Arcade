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
  await page.goto(`${origin}${basePath}/assets/games/10-sonic/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof RolloRushTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
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
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}:rollo-rush`;
      let hash = 2166136261;
      for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0) || 1;
    })();
    if (useDaily) RolloRushTest.setMode('daily');
    else RolloRushTest.setMode('endless');
    RolloRushTest.restart(false);
    const state = RolloRushTest.state();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      total: state.total,
      names: RolloRushTest.routeNames(),
      layout: RolloRushTest.layout(),
      sequence: RolloRushTest.sequence(10),
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
  assert.deepEqual(seedA.layout, seedB.layout, 'the same seed produces the same zone layout');
  assert.notDeepEqual(seedA.sequence, seedC.sequence, 'a different seed produces a different RNG stream');
  assert.notDeepEqual(seedA.layout, seedC.layout, 'a different seed produces a different zone layout');
  console.log('PASS seeded Rollo Rush zones are deterministic');

  const dailyA = await seededRoute(42, true);
  const dailyB = await seededRoute(43, true);
  assert.equal(dailyA.mode, 'daily', 'Daily Dash can be selected');
  assert.equal(dailyA.expected, dailyA.seed, 'Daily Dash uses the local-day seed');
  assert.equal(dailyA.total, 3, 'Daily Dash runs three zones');
  assert.deepEqual(dailyA.layout, dailyB.layout, 'Daily Dash shares one start for the day');
  assert.deepEqual(dailyA.sequence, dailyB.sequence, 'Daily Dash shares one RNG stream for the day');
  console.log('PASS Daily Dash is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };
    const stats = () => Save.load('rollo-rush').stats || {};
    const achievements = () => Save.load('rollo-rush').achievements || [];
    const state = () => RolloRushTest.state();
    const clearZones = (count) => {
      for (let i = 0; i < count && Arcade.G.state === 'playing'; i++) {
        RolloRushTest.clearZone();
        Arcade.test.step(100);
      }
    };
    const awardOnce = (mode) => {
      RolloRushTest.setMode(mode);
      RolloRushTest.restart(false);
      RolloRushTest.setDifficulty('normal');
      const before = Arcade.G.score;
      RolloRushTest.award(100);
      return Arcade.G.score - before;
    };

    // Boost pad and spin dash
    RolloRushTest.setMode('campaign');
    RolloRushTest.restart(true);
    Arcade.test.step(2);
    RolloRushTest.teleportTile(14, 11);
    Arcade.test.press('ArrowRight');
    Arcade.test.step(6);
    const boostState = state();
    const boostUnlocked = achievements().includes('speed-demon');
    Arcade.test.release('ArrowRight');

    RolloRushTest.restart(true);
    Arcade.test.step(2);
    Arcade.test.press('ShiftLeft');
    Arcade.test.step(1);
    Arcade.test.release('ShiftLeft');
    Arcade.test.step(2);
    const dashState = state();

    // Ring scatter on damage
    RolloRushTest.restart(true);
    RolloRushTest.grantRings(20);
    Arcade.test.step(2);
    const beforeHurt = state();
    RolloRushTest.hurt();
    Arcade.test.step(2);
    const afterHurt = state();

    const lockedOverdrive = RolloRushTest.setMode('overdrive') === false;
    const modeAfterLock = state().mode;
    const multCampaign = awardOnce('campaign');
    const multBlitz = awardOnce('blitz');
    const multDaily = awardOnce('daily');
    const multEndless = awardOnce('endless');

    RolloRushTest.setMode('campaign');
    RolloRushTest.setDifficulty('normal');
    RolloRushTest.restart(true);
    const campaignStart = state();
    const campaignReportStart = reports.length;
    clearZones(3);
    const campaignState = state();
    const campaignRun = {
      start: { lives: campaignStart.lives, zone: campaignStart.zone, total: campaignStart.total },
      end: { state: campaignState.state, zone: campaignState.zone, lives: campaignState.lives },
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      score: Arcade.G.score,
      hudL: Arcade.G.hudL,
      hudR: Arcade.G.hudR,
      reports: reports.slice(campaignReportStart).filter((event) => event.type === 'level_complete'),
      stats: stats(),
      achievements: achievements(),
    };

    const unlockedOverdrive = RolloRushTest.setMode('overdrive') === true;
    const multOverdrive = awardOnce('overdrive');

    RolloRushTest.setMode('overdrive');
    RolloRushTest.setDifficulty('normal');
    RolloRushTest.restart(true);
    const overdriveStart = { lives: state().lives, hp: state().hp, timerMode: state().timerMode, total: state().total };
    clearZones(3);
    const overdriveState = state();
    const overdriveRun = {
      start: overdriveStart,
      state: overdriveState.state,
      title: Arcade.G.title,
      score: Arcade.G.score,
      hudR: Arcade.G.hudR,
      clears: Number(stats().overdriveClears) || 0,
      best: Number(stats().overdriveBest) || 0,
      achievements: achievements(),
    };

    RolloRushTest.setMode('endless');
    RolloRushTest.setDifficulty('normal');
    RolloRushTest.restart(true);
    const beforeEarly = Arcade.G.score;
    RolloRushTest.award(100);
    const endlessFirst = Arcade.G.score - beforeEarly;
    RolloRushTest.clearZone();
    Arcade.test.step(100);
    const beforeSecond = Arcade.G.score;
    RolloRushTest.award(100);
    const endlessSecond = Arcade.G.score - beforeSecond;
    clearZones(5);
    const endlessState = state();
    const endlessRun = {
      zone: endlessState.zone,
      index: endlessState.zoneIndex,
      total: endlessState.total,
      names: RolloRushTest.routeNames(),
      best: Number(stats().endlessBest) || 0,
      achievement: achievements().includes('endless-six'),
    };

    RolloRushTest.setMode('daily');
    RolloRushTest.setDifficulty('normal');
    RolloRushTest.restart(true);
    const dailySeedRun = { seed: state().seed, total: state().total };
    const dailyReportStart = reports.length;
    clearZones(3);
    const dailyState = state();
    const dailySave = Save.load('rollo-rush');
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
      zones: Number(stats().dailyZones) || 0,
      achievement: achievements().includes('daily-dash'),
    };

    RolloRushTest.setMode('blitz');
    RolloRushTest.setDifficulty('normal');
    RolloRushTest.restart(true);
    const blitzStart = { lives: state().lives, timerMode: state().timerMode, timer: state().timer, total: state().total };
    RolloRushTest.setTimer(30);
    RolloRushTest.clearZone();
    const blitzClearTimer = state().timer;
    RolloRushTest.restart(true);
    RolloRushTest.setTimer(0);
    Arcade.test.step(1);
    const blitzTimeout = { state: Arcade.G.state, title: Arcade.G.title, sub: Arcade.G.sub };

    RolloRushTest.setDifficulty('hard');
    RolloRushTest.restart(false);
    const beforeHard = Arcade.G.score;
    RolloRushTest.award(100);
    const multHard = Arcade.G.score - beforeHard;

    RolloRushTest.setBoosts(5);
    RolloRushTest.setStomps(10);
    RolloRushTest.grantRings(50);
    const bonusAchievements = achievements();

    const menuActions = [...document.querySelectorAll('.apex-menu-root [data-menu-action]')].map((element) => element.getAttribute('data-menu-action'));
    const customizeCatalog = Meta.getCosmetics('rollo-rush').map((item) => ({ id: item.id, slot: item.slot }));
    RolloRushTest.cosmetic('skin', 'rollo-rush:rollo-ember');
    const skinColors = RolloRushTest.colors();
    RolloRushTest.cosmetic('palette', 'rollo-rush:ring-sunset');
    const paletteColors = RolloRushTest.colors();
    RolloRushTest.cosmetic('trail', 'rollo-rush:scarf-aurora');
    RolloRushTest.cosmetic('theme', 'rollo-rush:theme-neon');
    const styledColors = RolloRushTest.colors();

    return {
      boostState,
      boostUnlocked,
      dashState,
      beforeHurt,
      afterHurt,
      lockedOverdrive,
      modeAfterLock,
      unlockedOverdrive,
      multCampaign,
      multBlitz,
      multDaily,
      multEndless,
      multOverdrive,
      multHard,
      campaignRun,
      overdriveRun,
      endlessFirst,
      endlessSecond,
      endlessRun,
      dailyRun,
      blitzStart,
      blitzClearTimer,
      blitzTimeout,
      bonusAchievements,
      menuActions,
      customizeCatalog,
      skinColors,
      paletteColors,
      styledColors,
    };
  });

  assert.equal(gameplay.boostState.boosts, 1, 'touching a cyan pad counts one boost');
  assert.ok(gameplay.boostState.speed >= 6.8, 'boost pads push Rollo past normal top speed');
  assert.equal(gameplay.boostUnlocked, true, 'boost speed unlocks Speed Demon');
  assert.ok(gameplay.dashState.dash > 0, 'Shift starts a spin dash');
  assert.ok(gameplay.dashState.dashCd > 0, 'the spin dash has a cooldown');
  assert.ok(gameplay.dashState.speed >= 7, 'the spin dash bursts above running speed');

  assert.equal(gameplay.beforeHurt.rings, 20, 'rings can be granted before a hit');
  assert.equal(gameplay.afterHurt.hp, 2, 'a hit costs one heart');
  assert.equal(gameplay.afterHurt.rings, 10, 'a hit scatters half the rings');
  assert.equal(gameplay.afterHurt.drops, 10, 'scattered rings become recoverable pickups');

  assert.equal(gameplay.lockedOverdrive, true, 'Overdrive stays locked until three zones are cleared');
  assert.equal(gameplay.modeAfterLock, 'campaign', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedOverdrive, true, 'clearing the campaign unlocks Overdrive');
  assert.equal(gameplay.multCampaign, 100, 'Campaign pays the base score');
  assert.equal(gameplay.multBlitz, 100, 'Blitz Run pays the base score');
  assert.equal(gameplay.multDaily, 125, 'Daily Dash pays 1.25x');
  assert.equal(gameplay.multEndless, 110, 'Endless Rush starts at 1.1x');
  assert.equal(gameplay.multOverdrive, 150, 'Overdrive pays 1.5x');
  assert.equal(gameplay.multHard, 125, 'hard difficulty adds the shared 1.25x bonus');

  assert.deepEqual(gameplay.campaignRun.start, { lives: 3, zone: 1, total: 3 }, 'the campaign starts on zone one with three lives');
  assert.deepEqual(gameplay.campaignRun.end, { state: 'won', zone: 3, lives: 3 }, 'three zones finish the campaign in one running session');
  assert.equal(gameplay.campaignRun.title, 'Zones Cleared!', 'the campaign has its own victory title');
  assert.match(gameplay.campaignRun.sub, /^Three zones at full speed · score 2400$/, 'the campaign reports the zone count and final score');
  assert.equal(gameplay.campaignRun.score, 2400, 'each campaign zone pays an 800 point clear bonus');
  assert.match(gameplay.campaignRun.hudL, /^SCORE 2400 · RINGS 0 · ZONE 3\/3$/, 'the HUD tracks score, rings, and zone progress');
  assert.match(gameplay.campaignRun.hudR, /^♥♥♥  LIVES 3 · CAMPAIGN$/, 'the HUD tracks hearts, lives, and mode');
  assert.deepEqual(
    gameplay.campaignRun.reports.map((event) => ({ gameId: event.gameId, level: event.level, mode: event.mode })),
    [
      { gameId: 'rollo-rush', level: 1, mode: 'campaign' },
      { gameId: 'rollo-rush', level: 2, mode: 'campaign' },
      { gameId: 'rollo-rush', level: 3, mode: 'campaign' },
    ],
    'each zone reports progress to the host',
  );
  assert.equal(gameplay.campaignRun.stats.zonesCleared, 3, 'every cleared zone is recorded');
  assert.equal(gameplay.campaignRun.stats.bestZones, 3, 'the best zone is persisted');
  assert.equal(gameplay.campaignRun.stats.campaignStage, 1, 'the campaign resets to zone one after a full clear');
  assert.equal(gameplay.campaignRun.stats.campaignLives, 3, 'the campaign restores its lives after a full clear');
  assert.equal(gameplay.campaignRun.stats.campaignClears, 1, 'a completed campaign is recorded once');
  assert.equal(gameplay.campaignRun.stats.runs, 1, 'a finished run is recorded once');
  for (const id of ['first-zone', 'soft-landing', 'all-zones', 'no-loss']) {
    assert.ok(gameplay.campaignRun.achievements.includes(id), `${id} unlocks during a clean campaign`);
  }

  assert.deepEqual(gameplay.overdriveRun.start, { lives: 1, hp: 2, timerMode: false, total: 3 }, 'Overdrive starts with one life and two hearts');
  assert.equal(gameplay.overdriveRun.state, 'won', 'three zones finish Overdrive');
  assert.equal(gameplay.overdriveRun.title, 'Overdrive Cleared!', 'Overdrive has its own victory title');
  assert.equal(gameplay.overdriveRun.score, 3150, 'Overdrive pays 1.5x on every two-heart clear bonus');
  assert.match(gameplay.overdriveRun.hudR, /^♥♥  LIVES 1 · OVERDRIVE$/, 'the Overdrive HUD keeps its mode identity');
  assert.equal(gameplay.overdriveRun.clears, 1, 'a completed Overdrive run is recorded');
  assert.equal(gameplay.overdriveRun.best, 3, 'the Overdrive best zone is persisted');
  assert.ok(gameplay.overdriveRun.achievements.includes('overdrive-clear'), 'Overdrive unlocks its clear achievement');

  assert.equal(gameplay.endlessFirst, 110, 'the first endless zone pays 1.1x');
  assert.equal(gameplay.endlessSecond, 115, 'the endless multiplier grows with the zone number');
  assert.equal(gameplay.endlessRun.zone, 7, 'Endless Rush keeps generating zones');
  assert.equal(gameplay.endlessRun.index, 6, 'the endless index tracks every generated zone');
  assert.equal(gameplay.endlessRun.total, 7, 'every generated zone is appended to the route');
  assert.deepEqual(gameplay.endlessRun.names, ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5', 'Zone 6', 'Zone 7'], 'endless zones are numbered in order');
  assert.equal(gameplay.endlessRun.best, 6, 'the endless best records zone six');
  assert.equal(gameplay.endlessRun.achievement, true, 'reaching zone six unlocks Marathon');

  assert.equal(gameplay.dailyRun.seed, dailyA.expected, 'Daily Dash reseeds from the local day');
  assert.equal(gameplay.dailyRun.total, 3, 'Daily Dash runs three zones');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Dash finishes the run');
  assert.equal(gameplay.dailyRun.title, 'Daily Dash Complete!', 'the daily run has its own victory title');
  assert.ok(gameplay.dailyRun.sub.includes(String(gameplay.dailyRun.seed)), 'the daily result names its seed');
  assert.equal(gameplay.dailyRun.score, 3000, 'the daily run pays 1.25x on every clear bonus');
  assert.deepEqual(gameplay.dailyRun.reports, [
    { level: 1, mode: 'daily' },
    { level: 2, mode: 'daily' },
    { level: 3, mode: 'daily' },
  ], 'daily zone clears report their mode');
  assert.equal(gameplay.dailyRun.dailyBest, 3000, 'the daily best matches the final score');
  assert.equal(gameplay.dailyRun.saveBest, 3000, 'the day record stores the best score');
  assert.equal(gameplay.dailyRun.saveDay, today, 'the daily record is dated today');
  assert.equal(gameplay.dailyRun.zones, 3, 'all daily zones are recorded');
  assert.equal(gameplay.dailyRun.achievement, true, 'finishing Daily Dash unlocks Daily Dasher');

  assert.deepEqual(gameplay.blitzStart, { lives: 2, timerMode: true, timer: 120, total: 3 }, 'Blitz Run starts with a 120 second clock');
  assert.equal(gameplay.blitzClearTimer, 45, 'clearing a blitz zone adds fifteen seconds');
  assert.equal(gameplay.blitzTimeout.state, 'over', 'running the blitz clock out ends the run');
  assert.equal(gameplay.blitzTimeout.title, 'Out of Time', 'the blitz timeout has its own defeat title');
  assert.match(gameplay.blitzTimeout.sub, /· BLITZ RUN$/, 'the defeat names Blitz Run');

  for (const id of ['boost-junkie', 'spin-stomper', 'ring-runner']) {
    assert.ok(gameplay.bonusAchievements.includes(id), `${id} unlocks from run counters`);
  }

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.equal(gameplay.customizeCatalog.length, 13, 'Rollo Rush ships 13 cosmetics');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'skin'), 'Rollo Rush has runner skins');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'palette'), 'Rollo Rush has ring palettes');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'trail'), 'Rollo Rush has scarf trails');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'theme'), 'Rollo Rush has sky themes');
  for (const id of ['rollo-rush:rollo-teal', 'rollo-rush:ring-prism', 'rollo-rush:scarf-aurora', 'rollo-rush:theme-neon', 'rollo-rush:rollo-violet']) {
    assert.ok(gameplay.customizeCatalog.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(
    { body: gameplay.skinColors.body, belly: gameplay.skinColors.belly },
    { body: '#fb7185', belly: '#fecdd3' },
    'the Ember Rollo skin repaints the runner',
  );
  assert.deepEqual(
    { ring: gameplay.paletteColors.ring, spring: gameplay.paletteColors.spring, boost: gameplay.paletteColors.boost, trail: gameplay.paletteColors.trail },
    { ring: '#fdba74', spring: '#fb7185', boost: '#fb923c', trail: '#2dd4bf' },
    'the Sunset Rings palette repaints rings, springs, and boost pads but leaves the scarf alone',
  );
  assert.deepEqual(
    { trail: gameplay.styledColors.trail, sky: gameplay.styledColors.sky },
    { trail: '#67e8f9', sky: ['#0b0716', '#4c1d95', '#f0abfc'] },
    'scarf and theme cosmetics each repaint their target',
  );
  console.log('PASS modes, boost, spin dash, ring scatter, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    RolloRushTest.setMode('campaign');
    RolloRushTest.setDifficulty('normal');
    RolloRushTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-10-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/#/game/sonic-the-hedgehog`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.keyboard.press('Space');
  await theaterPage.getByText('START RUSH').waitFor({ state: 'detached' });
  await theaterPage.getByText(/ZONE 1\/3 · Sunny Shore/).waitFor({ state: 'visible' });
  await theaterPage.keyboard.down('ArrowRight');
  await theaterPage.waitForTimeout(600);
  await theaterPage.keyboard.press('Space');
  await theaterPage.waitForTimeout(250);
  await theaterPage.keyboard.press('ShiftLeft');
  await theaterPage.waitForTimeout(500);
  await theaterPage.keyboard.up('ArrowRight');
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-10-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 10 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
