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
  await page.goto(`${origin}${basePath}/assets/games/20-rayman/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof GlimmerTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

async function seededRoute(urlSeed) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate(() => {
    const expected = (() => {
      const d = new Date();
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      let x = key ^ 0x6d2b79f5;
      for (const ch of 'glimmer-gadabout') x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
      return (x >>> 0) || 1;
    })();
    GlimmerTest.setMode('daily');
    GlimmerTest.restart(true);
    const state = GlimmerTest.state();
    const world = GlimmerTest.world();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      world,
      gems: world.split('').filter((ch) => ch === 'g').length,
      sequence: GlimmerTest.sequence(12),
      level: state.level,
      stage: state.stage,
      lives: state.lives,
      hp: state.hp,
      maxhp: state.maxhp,
      glide: state.glide,
      levelCount: state.levelCount,
    };
  });
  await context.close();
  return data;
}

try {
  const routeA = await seededRoute(42);
  const routeB = await seededRoute(77);

  assert.equal(routeA.mode, 'daily', 'Daily Encore can be selected');
  assert.equal(routeA.expected, routeA.seed, 'Daily Encore uses the local-day seed');
  assert.equal(routeA.seed, routeB.seed, 'every session shares today’s seed');
  assert.equal(routeA.world, routeB.world, 'today’s stage layout is identical across sessions');
  assert.deepEqual(routeA.sequence, routeB.sequence, 'today’s RNG stream is identical across sessions');
  assert.ok(routeA.gems >= 2, 'Daily Encore scatters seeded sparks');
  assert.equal(routeA.stage, 'Drumline Meadow', 'Daily Encore starts on the first stage');
  assert.equal(routeA.lives, 3, 'Glimmer Gadabout grants three lives');
  assert.equal(routeA.hp, 4, 'Daily Encore starts at four health');
  assert.equal(routeA.maxhp, 4, 'Daily Encore keeps the standard health cap');
  assert.equal(routeA.glide, true, 'Daily Encore keeps the hair glide');
  assert.equal(routeA.level, 0, 'Daily Encore opens on the first stage');
  assert.equal(routeA.levelCount, 3, 'Glimmer Gadabout ships three stages');
  console.log('PASS Daily Encore is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const T = GlimmerTest;
    const state = () => T.state();
    const save = () => Save.load('glimmer-gadabout');
    const stats = () => save().stats || {};
    const achievements = () => save().achievements || [];
    const step = (n = 1) => Arcade.test.step(n);

    // Glimmer+ stays locked until the On Stage run is completed.
    const lockedPlus = T.setMode('plus') === false;
    const modeAfterLock = state().mode;

    // Clearing every stage in one run unlocks both kill achievements.
    T.setMode('story');
    T.setDifficulty('normal');
    T.restart(true);
    T.clearEnemies();
    T.goLevel(1);
    T.clearEnemies();
    T.goLevel(2);
    T.clearEnemies();
    const killState = state();
    const killRun = {
      kills: killState.kills,
      first: achievements().includes('first-punch'),
      ten: achievements().includes('crowd-pleaser'),
      show: achievements().includes('showstopper'),
    };

    // Every Spark adds deterministic sparks and demands all of them.
    T.setMode('spark');
    T.restart(true);
    const sparkStart = state();
    const sparkFirstGems = T.world().split('').filter((ch) => ch === 'g').length;
    const grabbed = T.grabSparks(14);
    T.goLevel(1);
    T.grabSparks(1);
    const hoardState = state();
    const hoardRun = {
      start: { level: sparkStart.level, need: sparkStart.need, gems: sparkFirstGems },
      grabbed,
      sparks: hoardState.sparks,
      achievement: achievements().includes('spark-hoarder'),
    };

    // On Stage: clear the final gate for the completion bonus.
    T.setMode('story');
    T.setDifficulty('normal');
    T.restart(true);
    const storyStart = state();
    const storyRun = { start: { ...storyStart, levelName: T.levelName(0) } };
    T.goLevel(2);
    T.finishLevel();
    step(30);
    const storyEnd = state();
    storyRun.end = { state: storyEnd.state, title: Arcade.G.title, sub: Arcade.G.sub, score: Arcade.G.score };
    storyRun.stats = stats();
    storyRun.achievements = achievements();

    // Completing On Stage unlocks Glimmer+, which scales foes and score.
    const unlockedPlus = T.setMode('plus') === true;
    T.restart(true);
    const plusStart = state();
    const plusSpawn = T.spawn('k', 320, 352);
    const plusAward = (() => {
      const before = Arcade.G.score;
      T.award(100);
      return Arcade.G.score - before;
    })();
    T.restart(true);
    T.goLevel(2);
    T.finishLevel();
    step(30);
    const plusEnd = state();
    const plusRun = {
      state: plusEnd.state,
      score: plusEnd.score,
      completions: Number(stats().plusCompletions) || 0,
      achievement: achievements().includes('plus-clear'),
      legend: achievements().includes('light-12000'),
    };

    // Grounded Run removes the hair glide and pays 1.3×.
    T.setMode('grounded');
    T.restart(true);
    const groundedStart = state();
    T.goLevel(2);
    T.finishLevel();
    step(30);
    const groundedEnd = state();
    const groundedRun = {
      glide: groundedStart.glide,
      state: groundedEnd.state,
      score: groundedEnd.score,
      completions: Number(stats().groundedCompletions) || 0,
      achievement: achievements().includes('grounded-clear'),
    };

    // Every Spark gates each stage on every spark and pays 1.2×.
    T.setMode('spark');
    T.restart(true);
    const shardStart = state();
    const shardGems = T.world().split('').filter((ch) => ch === 'g').length;
    T.goLevel(2);
    const shardNeedLast = T.need();
    const shardWorld = T.world();
    const shardLastGems = shardWorld.split('').filter((ch) => ch === 'g').length;
    T.setTokens(shardNeedLast);
    T.finishLevel();
    step(30);
    const shardEnd = state();
    const shardRun = {
      start: { level: shardStart.level, need: shardStart.need, gems: shardGems },
      lastNeed: shardNeedLast,
      lastGems: shardLastGems,
      state: shardEnd.state,
      score: shardEnd.score,
      completions: Number(stats().sparkCompletions) || 0,
      achievement: achievements().includes('spark-clear'),
    };

    // Daily Encore completes and records its own best.
    T.setMode('daily');
    T.restart(true);
    const dailyStart = state();
    T.goLevel(2);
    T.finishLevel();
    step(30);
    const dailyEnd = state();
    const dailyRun = {
      mode: dailyStart.mode,
      seed: dailyStart.seed,
      state: dailyEnd.state,
      title: Arcade.G.title,
      score: dailyEnd.score,
      best: Number(stats().dailyBest) || 0,
      completions: Number(stats().dailyCompletions) || 0,
      achievement: achievements().includes('daily-clear'),
    };

    // Three deaths end the run and still record it.
    const runsBeforeDeath = Number(stats().runs) || 0;
    T.setMode('story');
    T.restart(true);
    T.setHp(1); T.hurt(5); step(90);
    T.setHp(1); T.hurt(5); step(90);
    T.setHp(1); T.hurt(5); step(120);
    const deathEnd = state();
    const deathRun = {
      state: deathEnd.state,
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      score: deathEnd.score,
      runsBefore: runsBeforeDeath,
      runsAfter: Number(stats().runs) || 0,
    };

    // Difficulty and Glimmer+ scale scoring without changing base points.
    const awardWith = (setup) => {
      T.setMode('story');
      T.restart(true);
      setup();
      const before = Arcade.G.score;
      T.award(100);
      return Arcade.G.score - before;
    };
    const normalAward = awardWith(() => T.setDifficulty('normal'));
    const hardAward = awardWith(() => T.setDifficulty('hard'));
    const easyAward = awardWith(() => T.setDifficulty('easy'));
    T.setDifficulty('normal');
    T.setMode('plus');
    T.restart(true);
    const plusScale = (() => {
      const before = Arcade.G.score;
      T.award(100);
      return Arcade.G.score - before;
    })();
    T.setDifficulty('normal');

    // Cosmetics repaint the gadabout, fists, trail, and backdrop.
    const cosmetics = Meta.getCosmetics('glimmer-gadabout').map((item) => ({ id: item.id, slot: item.slot }));
    T.setMode('story');
    T.restart(true);
    const defaultColors = T.colors();
    T.cosmetic('skin', 'glimmer-gadabout:gad-mint');
    const skinColors = T.colors();
    T.cosmetic('palette', 'glimmer-gadabout:punch-lime');
    const paletteColors = T.colors();
    T.cosmetic('effect', 'glimmer-gadabout:trail-violet');
    const effectColors = T.colors();
    T.cosmetic('theme', 'glimmer-gadabout:theme-chasm');
    const styledColors = T.colors();

    return {
      lockedPlus,
      modeAfterLock,
      unlockedPlus,
      killRun,
      hoardRun,
      storyRun,
      plusStart: { mode: plusStart.mode, level: plusStart.level, hp: plusStart.hp, lives: plusStart.lives },
      plusSpawn,
      plusAward,
      plusRun,
      groundedRun,
      shardRun,
      dailyRun,
      deathRun,
      awards: { normal: normalAward, hard: hardAward, easy: easyAward, plus: plusScale },
      cosmetics,
      defaultColors,
      skinColors,
      paletteColors,
      effectColors,
      styledColors,
      menuActions: Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((node) => node.getAttribute('data-menu-action')),
    };
  });

  assert.equal(gameplay.lockedPlus, true, 'Glimmer+ stays locked before an On Stage clear');
  assert.equal(gameplay.modeAfterLock, 'story', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedPlus, true, 'completing On Stage unlocks Glimmer+');

  assert.deepEqual(gameplay.killRun, { kills: 19, first: true, ten: true, show: true }, 'clearing all three stages unlocks the kill achievements');

  assert.deepEqual(gameplay.hoardRun.start, { level: 0, need: 14, gems: 14 }, 'Every Spark adds six extra sparks to the meadow');
  assert.equal(gameplay.hoardRun.grabbed, 14, 'every meadow spark can be collected');
  assert.equal(gameplay.hoardRun.sparks, 15, 'spark pickups stack across stages');
  assert.equal(gameplay.hoardRun.achievement, true, 'collecting 15 sparks unlocks Spark Hoarder');

  assert.equal(gameplay.storyRun.start.stage, 'Drumline Meadow', 'On Stage opens in the meadow');
  assert.equal(gameplay.storyRun.start.lives, 3, 'On Stage grants three lives');
  assert.equal(gameplay.storyRun.start.hp, 4, 'On Stage starts at four health');
  assert.equal(gameplay.storyRun.start.maxhp, 4, 'On Stage keeps the standard health cap');
  assert.equal(gameplay.storyRun.start.glide, true, 'On Stage keeps the hair glide');
  assert.equal(gameplay.storyRun.start.levelName, 'Drumline Meadow', 'the first stage reports its name');
  assert.equal(gameplay.storyRun.start.levelCount, 3, 'On Stage runs three stages');
  assert.equal(gameplay.storyRun.end.state, 'won', 'clearing the final gate wins the run');
  assert.equal(gameplay.storyRun.end.title, 'Encore!', 'On Stage has its own victory title');
  assert.match(gameplay.storyRun.end.sub, /^Score 6000 · \d+s · 0 kills$/, 'the victory reports score, time, and kills');
  assert.equal(gameplay.storyRun.end.score, 6000, 'On Stage banks its completion bonus');
  assert.equal(gameplay.storyRun.stats.runs, 1, 'On Stage is recorded as a run');
  assert.equal(gameplay.storyRun.stats.storyCompletions, 1, 'an On Stage clear is recorded');
  assert.equal(gameplay.storyRun.stats.bestScore, 6000, 'the run score is persisted');
  assert.equal(gameplay.storyRun.stats.highestStage, 3, 'the final stage is recorded');
  assert.equal(gameplay.storyRun.stats.lastMode, 'story', 'the last mode is recorded');
  assert.equal(gameplay.storyRun.stats.sparks, 0, 'the clean story run collects no sparks');
  for (const id of ['story-clear', 'personal-best', 'untouched', 'full-heart', 'swift-show']) {
    assert.ok(gameplay.storyRun.achievements.includes(id), `${id} unlocks during a clean On Stage run (${gameplay.storyRun.achievements.join(',')})`);
  }
  for (const id of ['daily-clear', 'grounded-clear', 'spark-clear', 'plus-clear', 'light-12000']) {
    assert.ok(!gameplay.storyRun.achievements.includes(id), `${id} still waits for its own mode`);
  }

  assert.deepEqual(gameplay.plusStart, { mode: 'plus', level: 0, hp: 4, lives: 3 }, 'Glimmer+ restarts the standard route');
  assert.deepEqual(gameplay.plusSpawn, { k: 'k', hp: 2, hmax: 2 }, 'Glimmer+ scales walker HP by 1.5×');
  assert.equal(gameplay.plusAward, 160, 'Glimmer+ scales score by 1.6×');
  assert.deepEqual(gameplay.plusRun, { state: 'won', score: 12800, completions: 1, achievement: true, legend: true }, 'clearing Glimmer+ pays its bonus and records the clear');

  assert.equal(gameplay.groundedRun.glide, false, 'Grounded Run removes the hair glide');
  assert.equal(gameplay.groundedRun.state, 'won', 'Grounded Run still reaches the encore');
  assert.equal(gameplay.groundedRun.score, 8450, 'Grounded Run scales its completion bonus by 1.3×');
  assert.equal(gameplay.groundedRun.completions, 1, 'a Grounded clear is recorded');
  assert.equal(gameplay.groundedRun.achievement, true, 'Grounded Run unlocks its achievement');

  assert.deepEqual(gameplay.shardRun.start, { level: 0, need: 14, gems: 14 }, 'Every Spark gates the meadow on all fourteen sparks');
  assert.equal(gameplay.shardRun.lastNeed, gameplay.shardRun.lastGems, 'the final gate demands every spark in the chasm');
  assert.equal(gameplay.shardRun.state, 'won', 'Every Spark still reaches the encore');
  assert.equal(gameplay.shardRun.score, 6600, 'Every Spark scales its completion bonus by 1.2×');
  assert.equal(gameplay.shardRun.completions, 1, 'an Every Spark clear is recorded');
  assert.equal(gameplay.shardRun.achievement, true, 'Every Spark unlocks its achievement');

  assert.equal(gameplay.dailyRun.mode, 'daily', 'Daily Encore records its mode');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Encore wins the run');
  assert.equal(gameplay.dailyRun.title, 'Encore!', 'Daily Encore shares the story victory title');
  assert.equal(gameplay.dailyRun.score, 5000, 'Daily Encore pays its own bonus');
  assert.equal(gameplay.dailyRun.best, 5000, 'Daily Encore stores its best score');
  assert.equal(gameplay.dailyRun.completions, 1, 'Daily Encore tracks its completion');
  assert.equal(gameplay.dailyRun.achievement, true, 'clearing Daily Encore unlocks its achievement');

  assert.equal(gameplay.deathRun.state, 'over', 'losing every life ends the game');
  assert.equal(gameplay.deathRun.title, 'The Curtain Falls', 'a death reports the Glimmer Gadabout defeat title');
  assert.match(gameplay.deathRun.sub, /^Score 0 · reached Drumline Meadow$/, 'the defeat reports the last stage');
  assert.equal(gameplay.deathRun.score, 0, 'a fresh death scores nothing');
  assert.equal(gameplay.deathRun.runsAfter, gameplay.deathRun.runsBefore + 1, 'a death is recorded as a run');

  assert.deepEqual(gameplay.awards, { normal: 100, hard: 125, easy: 100, plus: 160 }, 'hard and Glimmer+ scale score without changing base points');

  assert.equal(gameplay.cosmetics.length, 16, 'Glimmer Gadabout ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) {
    assert.ok(gameplay.cosmetics.some((item) => item.slot === slot), `Glimmer Gadabout has ${slot} cosmetics`);
  }
  for (const id of ['glimmer-gadabout:gad-rose', 'glimmer-gadabout:gad-candy', 'glimmer-gadabout:punch-sky', 'glimmer-gadabout:trail-mint', 'glimmer-gadabout:theme-chasm']) {
    assert.ok(gameplay.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(gameplay.defaultColors, { body: '#f97316', head: '#fde68a', hair: '#facc15', eye: '#111827', punch: '#fb923c', effect: '#fde047', theme: 'auto' }, 'the default look is the rose gadabout');
  assert.deepEqual({ body: gameplay.skinColors.body, hair: gameplay.skinColors.hair }, { body: '#10b981', hair: '#5eead4' }, 'the Mint skin repaints the gadabout');
  assert.equal(gameplay.paletteColors.punch, '#a3e635', 'Lime Fists repaint the punch');
  assert.equal(gameplay.effectColors.effect, '#c4b5fd', 'Violet Trail repaints the air trail');
  assert.deepEqual({ theme: gameplay.styledColors.theme, effect: gameplay.styledColors.effect }, { theme: 'chasm', effect: '#c4b5fd' }, 'theme and effect cosmetics repaint their targets');
  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  console.log('PASS modes, sparks, gates, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    GlimmerTest.setMode('story');
    GlimmerTest.setDifficulty('normal');
    GlimmerTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-20-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/?test=1#/game/rayman-legends`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.getByRole('button', { name: 'START STAGE' }).click();
  await theaterPage.waitForFunction(() => typeof window.PrecisionTest !== 'undefined' && window.PrecisionTest.state().phase === 'PLAYING');
  const theaterMid = await theaterPage.evaluate(() => {
    const test = window.PrecisionTest;
    const first = test.state();
    test.collectAll();
    const collected = test.state();
    test.setStage(2);
    const third = test.state();
    test.collectAll();
    test.reachGoal();
    return { first, collected, third };
  });
  await theaterPage.waitForFunction(() => window.PrecisionTest.state().phase === 'VICTORY');
  const theaterEnd = await theaterPage.evaluate(() => window.PrecisionTest.state());
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-20-3d.png') });
  assert.equal(theaterMid.first.variant, 'rayman', 'the theater runs the Rayman variant');
  assert.equal(theaterMid.first.phase, 'PLAYING', 'the theater opens in play');
  assert.equal(theaterMid.first.stageName, 'Dream Forest', 'the first stage reports its name');
  assert.equal(theaterMid.first.stages, 3, 'the precision engine runs three stages');
  assert.equal(theaterMid.first.totalGems, 21, 'the three stages hold 21 Lums');
  assert.equal(theaterMid.collected.gems, 7, 'collecting every Lum records seven');
  assert.equal(theaterMid.third.stage, 2, 'the third stage is selectable');
  assert.equal(theaterMid.third.stageName, 'Candy Chasm', 'the third stage reports its name');
  assert.equal(theaterEnd.phase, 'VICTORY', 'reaching the final goal wins the theater run');
  assert.ok(theaterEnd.score > 0, 'the theater run reports a score');
  await theaterPage.getByText('Dream Worlds Freed!').waitFor({ state: 'visible' });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 20 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
