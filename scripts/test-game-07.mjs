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
  await page.goto(`${origin}${basePath}/assets/games/07-asteroids/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof StarfallRiftTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

const today = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
})();

async function seededField(urlSeed, daily) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate((useDaily) => {
    const expected = (() => {
      const d = new Date();
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}:starfall-rift`;
      let hash = 2166136261;
      for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0) || 1;
    })();
    const selected = useDaily ? StarfallRiftTest.setMode('daily') : true;
    StarfallRiftTest.restart(false);
    const state = StarfallRiftTest.state();
    return {
      selected,
      mode: state.mode,
      seed: state.seed,
      expected,
      snapshot: StarfallRiftTest.snapshot(),
      sequence: StarfallRiftTest.sequence(8),
    };
  }, daily);
  await context.close();
  return data;
}

try {
  const seedA = await seededField(42, false);
  const seedB = await seededField(42, false);
  const seedC = await seededField(43, false);

  assert.equal(seedA.seed, 42, 'Classic Orbit reads the requested seed');
  assert.deepEqual(seedA.snapshot, seedB.snapshot, 'the same seed produces the same starting field');
  assert.deepEqual(seedA.sequence, seedB.sequence, 'the same seed produces the same rock shapes and drift');
  assert.notDeepEqual(seedA.snapshot, seedC.snapshot, 'a different seed produces a different starting field');
  assert.notDeepEqual(seedA.sequence, seedC.sequence, 'a different seed produces different rock shapes and drift');
  console.log('PASS seeded rift fields are deterministic');

  const dailyA = await seededField(42, true);
  const dailyB = await seededField(43, true);
  assert.equal(dailyA.mode, 'daily', 'Daily Rift can be selected');
  assert.equal(dailyA.expected, dailyA.seed, 'Daily Rift uses the day seed');
  assert.equal(dailyA.selected, true, 'Daily Rift selects through the launcher');
  assert.deepEqual(dailyA.snapshot, dailyB.snapshot, 'Daily Rift shares one field for the day');
  assert.deepEqual(dailyA.sequence, dailyB.sequence, 'Daily Rift shares one RNG stream for the day');
  console.log('PASS Daily Rift is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(async () => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };
    const stats = () => Save.load('starfall-rift').stats || {};
    const achievements = () => Save.load('starfall-rift').achievements || [];
    const state = () => StarfallRiftTest.state();
    const runWaves = (maxFrames) => {
      let frames = 0;
      for (let f = 0; f < maxFrames && Arcade.G.state === 'playing'; f++) {
        StarfallRiftTest.clearWave();
        Arcade.test.step(1);
        frames++;
      }
      return frames;
    };
    const awardOnce = (mode) => {
      StarfallRiftTest.setMode(mode);
      StarfallRiftTest.restart(false);
      StarfallRiftTest.setDifficulty('normal');
      StarfallRiftTest.award(100);
      return Arcade.G.score;
    };

    const lockedDeep = StarfallRiftTest.setMode('deep-rift') === false;
    const modeAfterLock = state().mode;
    const multClassic = awardOnce('classic');
    const multLastOrbit = awardOnce('last-orbit');

    StarfallRiftTest.setMode('classic');
    StarfallRiftTest.setDifficulty('normal');
    StarfallRiftTest.restart(true);
    const waveReportStart = reports.length;
    const waveScoreStart = Arcade.G.score;
    StarfallRiftTest.clearWave();
    Arcade.test.step(115);
    const waveRun = {
      wave: state().wave,
      score: Arcade.G.score - waveScoreStart,
      bestWave: Number(stats().bestWave) || 0,
      reports: reports.slice(waveReportStart).filter((event) => event.type === 'level_complete'),
      clean: achievements().includes('untouched-sector'),
      state: Arcade.G.state,
      hudL: Arcade.G.hudL,
      hudR: Arcade.G.hudR,
    };

    StarfallRiftTest.restart(true);
    StarfallRiftTest.award(4321);
    const runsBefore = Number(stats().runs) || 0;
    for (let i = 0; i < 8 && Arcade.G.state === 'playing'; i++) {
      StarfallRiftTest.impact();
      Arcade.test.step(110);
    }
    const deathRun = {
      state: Arcade.G.state,
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      runs: (Number(stats().runs) || 0) - runsBefore,
      bestScore: Number(stats().bestScore) || 0,
      score: Arcade.G.score,
    };

    Save.update('starfall-rift', { stats: { bestWave: 5 } });
    const unlockedDeep = StarfallRiftTest.setMode('deep-rift') === true;
    const multDeep = awardOnce('deep-rift');
    const deepStart = { lives: state().lives, targetWave: state().targetWave };

    StarfallRiftTest.setMode('deep-rift');
    StarfallRiftTest.setDifficulty('normal');
    StarfallRiftTest.restart(true);
    const deepReportStart = reports.length;
    const deepFrames = runWaves(2500);
    const deepState = state();
    const deepRun = {
      ...deepStart,
      frames: deepFrames,
      wave: deepState.wave,
      state: deepState.state,
      title: deepState.title,
      score: Arcade.G.score,
      bestWave: Number(stats().bestWave) || 0,
      clears: Number(stats().deepRiftClears) || 0,
      achievement: achievements().includes('deep-rift'),
      reports: reports.slice(deepReportStart).filter((event) => event.type === 'level_complete').map((event) => event.level),
    };

    StarfallRiftTest.setMode('campaign');
    StarfallRiftTest.restart(true);
    const campaignStart = { lives: state().lives, targetWave: state().targetWave };
    runWaves(1200);
    const campaignState = state();
    const campaignRun = {
      ...campaignStart,
      state: campaignState.state,
      title: campaignState.title,
      sub: campaignState.sub,
      score: Arcade.G.score,
      stage: Number(stats().riftCampaignStage) || 0,
      campaignLives: Number(stats().riftCampaignLives) || 0,
      clears: Number(stats().sectorClears) || 0,
    };

    StarfallRiftTest.setMode('last-orbit');
    StarfallRiftTest.restart(true);
    const lastOrbitStart = { lives: state().lives, targetWave: state().targetWave };
    runWaves(1500);
    const lastOrbitState = state();
    const lastOrbitRun = {
      ...lastOrbitStart,
      state: lastOrbitState.state,
      title: lastOrbitState.title,
      score: Arcade.G.score,
      clears: Number(stats().lastOrbitClears) || 0,
      achievement: achievements().includes('last-orbit'),
    };

    StarfallRiftTest.setMode('daily');
    StarfallRiftTest.restart(true);
    const dailySeedRun = { seed: state().seed, targetWave: state().targetWave };
    runWaves(1200);
    const dailyState = state();
    const dailySave = Save.load('starfall-rift');
    const dailyRun = {
      ...dailySeedRun,
      state: dailyState.state,
      title: dailyState.title,
      sub: dailyState.sub,
      score: Arcade.G.score,
      dailyBest: Number(stats().dailyBest) || 0,
      saveBest: Number(dailySave.daily && dailySave.daily.best) || 0,
      saveDay: dailySave.daily && dailySave.daily.day,
      achievement: achievements().includes('daily-navigator'),
    };

    StarfallRiftTest.setMode('classic');
    StarfallRiftTest.restart(true);
    StarfallRiftTest.pickup('S');
    Arcade.test.step(1);
    const shieldT = state().shieldT;
    Arcade.test.tap('ShiftLeft', 1);
    const hyperRun = { cd: state().hyperCd, achievement: achievements().includes('emergency-jump') };
    StarfallRiftTest.restart(true);
    StarfallRiftTest.spawnSaucer();
    const saucerOn = state().saucer === 1;

    StarfallRiftTest.setDifficulty('hard');
    StarfallRiftTest.restart(false);
    StarfallRiftTest.award(100);
    const multHard = Arcade.G.score;

    const menuActions = [...document.querySelectorAll('.apex-menu-root [data-menu-action]')].map((element) => element.getAttribute('data-menu-action'));
    const customizeCatalog = Meta.getCosmetics('starfall-rift').map((item) => ({ id: item.id, slot: item.slot }));
    StarfallRiftTest.cosmetic('skin', 'starfall-rift:ship-solar');
    const solarColors = StarfallRiftTest.colors();
    StarfallRiftTest.cosmetic('palette', 'starfall-rift:coral-spectrum');
    StarfallRiftTest.cosmetic('trail', 'starfall-rift:ice-trail');
    StarfallRiftTest.cosmetic('theme', 'starfall-rift:ocean-field');
    const styledColors = StarfallRiftTest.colors();

    return {
      lockedDeep,
      modeAfterLock,
      multClassic,
      multLastOrbit,
      multDeep,
      multHard,
      unlockedDeep,
      waveRun,
      deathRun,
      deepRun,
      campaignRun,
      lastOrbitRun,
      dailyRun,
      shieldT,
      hyperRun,
      saucerOn,
      menuActions,
      customizeCatalog,
      solarColors,
      styledColors,
    };
  });

  assert.equal(gameplay.lockedDeep, true, 'Deep Rift stays locked until wave five is reached');
  assert.equal(gameplay.modeAfterLock, 'classic', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedDeep, true, 'reaching wave five unlocks Deep Rift');
  assert.equal(gameplay.multClassic, 100, 'Classic Orbit pays the base score');
  assert.equal(gameplay.multLastOrbit, 125, 'Last Orbit pays 1.25x');
  assert.equal(gameplay.multDeep, 150, 'Deep Rift pays 1.5x');
  assert.equal(gameplay.multHard, 125, 'hard difficulty adds one 1.25x score bonus');

  assert.equal(gameplay.waveRun.wave, 2, 'clearing the field advances to the next wave');
  assert.equal(gameplay.waveRun.score, 250, 'the first wave pays a 250 point clear bonus');
  assert.equal(gameplay.waveRun.bestWave, 1, 'the best wave is persisted');
  assert.equal(gameplay.waveRun.state, 'playing', 'the next wave begins without ending the run');
  assert.deepEqual(gameplay.waveRun.reports, [
    { gameId: 'starfall-rift', type: 'level_complete', level: 1, score: 0, mode: 'classic' },
  ], 'clearing a wave reports progress to the host');
  assert.equal(gameplay.waveRun.clean, true, 'clearing without losing a ship unlocks Untouched Sector');
  assert.match(gameplay.waveRun.hudL, /^SCORE 250 · WAVE 2 · ♥3$/, 'the HUD tracks score, wave, and hulls');
  assert.match(gameplay.waveRun.hudR, /^CLASSIC · BEST \d+$/, 'the HUD names the mode and best score');

  assert.equal(gameplay.deathRun.state, 'over', 'running out of hulls ends the run');
  assert.equal(gameplay.deathRun.title, 'Ship Lost', 'the defeat title is shown');
  assert.match(gameplay.deathRun.sub, /^Reached wave \d+ · CLASSIC$/, 'the defeat names the active mode');
  assert.equal(gameplay.deathRun.runs, 1, 'a finished run is recorded once');
  assert.equal(gameplay.deathRun.bestScore, 4321, 'the best score is persisted on defeat');
  assert.equal(gameplay.deathRun.score, 4321, 'no extra points are scored during the death sequence');

  const { frames: deepFrames, ...deepResult } = gameplay.deepRun;
  assert.ok(deepFrames >= 800 && deepFrames <= 900, 'eight waves take roughly one field cycle each');
  assert.deepEqual(deepResult, {
    lives: 2,
    targetWave: 8,
    wave: 8,
    state: 'won',
    title: 'Deep Rift Complete!',
    score: 5100,
    bestWave: 8,
    clears: 1,
    achievement: true,
    reports: [1, 2, 3, 4, 5, 6, 7, 8],
  }, 'Deep Rift clears eight waves with two hulls, 1.5x score, and its own achievement');

  assert.deepEqual(gameplay.campaignRun, {
    lives: 3,
    targetWave: 3,
    state: 'won',
    title: 'Sector 1 Clear',
    sub: 'Checkpoint saved · sector 2 is ready',
    score: 900,
    stage: 2,
    campaignLives: 3,
    clears: 1,
  }, 'the campaign saves a checkpoint after the third wave');

  assert.deepEqual(gameplay.lastOrbitRun, {
    lives: 1,
    targetWave: 6,
    state: 'won',
    title: 'Last Orbit Clear!',
    score: 2814,
    clears: 1,
    achievement: true,
  }, 'Last Orbit clears six waves on one hull with a 1.25x bonus');

  assert.equal(gameplay.dailyRun.seed, dailyA.expected, 'Daily Rift reseeds from the day');
  assert.equal(gameplay.dailyRun.targetWave, 5, 'Daily Rift runs five waves');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing the Daily Rift finishes the run');
  assert.equal(gameplay.dailyRun.title, 'Daily Rift Complete!', 'the daily run has its own victory title');
  assert.ok(gameplay.dailyRun.sub.includes(String(gameplay.dailyRun.seed)), 'the daily result names its seed');
  assert.equal(gameplay.dailyRun.score, 1750, 'the daily run pays every wave clear bonus');
  assert.equal(gameplay.dailyRun.dailyBest, 1750, 'the daily best matches the final score');
  assert.equal(gameplay.dailyRun.saveBest, 1750, 'the day record stores the best score');
  assert.equal(gameplay.dailyRun.saveDay, today, 'the daily record is dated today');
  assert.equal(gameplay.dailyRun.achievement, true, 'finishing Daily Rift unlocks Daily Navigator');

  assert.equal(gameplay.shieldT, 600, 'a shield pick-up grants ten seconds of protection');
  assert.equal(gameplay.hyperRun.cd, 180, 'hyperspace goes on a three second cooldown');
  assert.equal(gameplay.hyperRun.achievement, true, 'the first hyperspace jump unlocks Emergency Jump');
  assert.equal(gameplay.saucerOn, true, 'raider saucers can enter the field');

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'skin'), 'Starfall Rift has hull cosmetics');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'palette'), 'Starfall Rift has bolt palettes');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'trail'), 'Starfall Rift has exhaust trails');
  assert.ok(gameplay.customizeCatalog.some((item) => item.slot === 'theme'), 'Starfall Rift has starfield themes');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'starfall-rift:ship-solar'), 'the solar craft is registered');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'starfall-rift:coral-spectrum'), 'the coral spectrum is registered');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'starfall-rift:ice-trail'), 'the ice trail is registered');
  assert.ok(gameplay.customizeCatalog.some((item) => item.id === 'starfall-rift:ocean-field'), 'the ocean field theme is registered');
  assert.deepEqual(
    { shipColor: gameplay.solarColors.shipColor, shipLower: gameplay.solarColors.shipLower },
    { shipColor: '#fde68a', shipLower: '#d97706' },
    'the Solar Craft cosmetic repaints the hull',
  );
  assert.deepEqual(
    { shotColor: gameplay.styledColors.shotColor, flameColor: gameplay.styledColors.flameColor, scene: gameplay.styledColors.scene },
    { shotColor: '#fb7185', flameColor: '#67e8f9', scene: ['#031521', '#0a2942', '#124a63'] },
    'palette, trail, and theme cosmetics each repaint their target',
  );

  await page.evaluate(() => {
    StarfallRiftTest.setMode('classic');
    StarfallRiftTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-07-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/#/game/asteroids`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.keyboard.press('Space');
  await theaterPage.getByText('LAUNCH STARFALL').waitFor({ state: 'detached' });
  await theaterPage.waitForTimeout(1400);
  await theaterPage.keyboard.press('ArrowUp');
  await theaterPage.keyboard.press('Space');
  await theaterPage.waitForTimeout(500);
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-07-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS rifts, multipliers, campaigns, records, cosmetics, and menus behave correctly');
  console.log('PASS game 07 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
