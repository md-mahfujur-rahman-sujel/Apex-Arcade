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
  await page.goto(`${origin}${basePath}/assets/games/19-ori/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof LumenTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

async function seededRoute(urlSeed) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate(() => {
    const expected = (() => {
      const d = new Date();
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      let x = key ^ 0x6d2b79f5;
      for (const ch of 'lumen-sprite') x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
      return (x >>> 0) || 1;
    })();
    LumenTest.setMode('daily');
    LumenTest.restart(true);
    const state = LumenTest.state();
    const world = LumenTest.world();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      world,
      gems: world.split('').filter((ch) => ch === 'g').length,
      sequence: LumenTest.sequence(12),
      level: state.level,
      stage: state.stage,
      lives: state.lives,
      hp: state.hp,
      maxhp: state.maxhp,
      charms: state.charms,
      levelCount: state.levelCount,
    };
  });
  await context.close();
  return data;
}

try {
  const routeA = await seededRoute(42);
  const routeB = await seededRoute(77);

  assert.equal(routeA.mode, 'daily', 'Daily Glade can be selected');
  assert.equal(routeA.expected, routeA.seed, 'Daily Glade uses the local-day seed');
  assert.equal(routeA.seed, routeB.seed, 'every session shares today’s seed');
  assert.equal(routeA.world, routeB.world, 'today’s glade layout is identical across sessions');
  assert.deepEqual(routeA.sequence, routeB.sequence, 'today’s RNG stream is identical across sessions');
  assert.ok(routeA.gems >= 2, 'Daily Glade scatters seeded motes');
  assert.equal(routeA.stage, 'Whispering Grove', 'Daily Glade starts in the grove');
  assert.equal(routeA.lives, 3, 'Lumen Sprite grants three lives');
  assert.equal(routeA.hp, 5, 'Daily Glade starts at five health');
  assert.equal(routeA.maxhp, 5, 'Daily Glade keeps the standard health cap');
  assert.equal(routeA.charms, 0, 'every run opens without charms');
  assert.equal(routeA.level, 0, 'Daily Glade opens on the first glade');
  assert.equal(routeA.levelCount, 3, 'Lumen Sprite ships three glades');
  console.log('PASS Daily Glade is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const T = LumenTest;
    const state = () => T.state();
    const save = () => Save.load('lumen-sprite');
    const stats = () => save().stats || {};
    const achievements = () => save().achievements || [];
    const step = (n = 1) => Arcade.test.step(n);

    // Radiant+ stays locked until the Lumen Run is completed.
    const lockedPlus = T.setMode('plus') === false;
    const modeAfterLock = state().mode;

    // Lumen Run: collect both charms, then finish the tower.
    T.setMode('story');
    T.setDifficulty('normal');
    T.restart(true);
    const storyStart = state();
    const storyRun = { start: { ...storyStart, levelName: T.levelName(0) } };
    T.teleport(14 * 32 + 6, 12 * 32 + 4);
    step(2);
    const afterLeaf = state();
    T.teleport(46 * 32 + 6, 12 * 32 + 4);
    step(2);
    const afterStar = state();
    const charmTiles = { leaf: T.gridAt(14, 12), star: T.gridAt(46, 12) };
    T.goLevel(2);
    const storyTower = state();
    T.finishLevel();
    step(30);
    const storyEnd = state();
    storyRun.charms = { afterLeaf: afterLeaf.charms, afterStar: afterStar.charms, tiles: charmTiles };
    storyRun.tower = { rise: storyTower.rise, level: storyTower.level };
    storyRun.end = { state: storyEnd.state, title: Arcade.G.title, sub: Arcade.G.sub, score: Arcade.G.score };
    storyRun.stats = stats();
    storyRun.achievements = achievements();

    // Completing the Lumen Run unlocks Radiant+, which scales foes and score.
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
      light: achievements().includes('light-12000'),
    };

    // A charmless Lumen Run earns Spirit Bound.
    T.setMode('story');
    T.setDifficulty('normal');
    T.restart(true);
    T.goLevel(2);
    T.finishLevel();
    step(30);
    const spiritRun = {
      state: state().state,
      score: state().score,
      achievement: achievements().includes('spirit-bound'),
      personalBest: achievements().includes('personal-best'),
    };

    // Mote Hunt adds motes and gates every glade on them.
    T.setMode('shard');
    T.restart(true);
    const shardStart = state();
    const shardGems = T.world().split('').filter((ch) => ch === 'g').length;
    const shardNeedFirst = T.need();
    T.setTokens(shardNeedFirst);
    T.goLevel(2);
    const shardNeedLast = T.need();
    T.setTokens(shardNeedLast);
    T.finishLevel();
    step(30);
    const shardEnd = state();
    const shardRun = {
      start: { level: shardStart.level, need: shardNeedFirst, gems: shardGems },
      lastNeed: shardNeedLast,
      state: shardEnd.state,
      score: shardEnd.score,
      completions: Number(stats().moteCompletions) || 0,
      achievement: achievements().includes('mote-clear'),
    };

    // Daily Glade completes and records its own best.
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

    // Nightfall Rush raises the dark in every glade.
    T.setMode('dark');
    T.restart(true);
    const darkStart = state();
    T.goLevel(2);
    T.finishLevel();
    step(30);
    const darkEnd = state();
    const darkRun = {
      rise: darkStart.rise,
      state: darkEnd.state,
      score: darkEnd.score,
      completions: Number(stats().nightCompletions) || 0,
      achievement: achievements().includes('night-clear'),
    };

    // Ten grove creatures unlock the Hunter achievement.
    T.setMode('story');
    T.restart(true);
    T.clearEnemies();
    const huntState = state();
    const huntRun = {
      kills: huntState.kills,
      first: achievements().includes('first-glow'),
      hunter: achievements().includes('hunter-light'),
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

    // Difficulty and Radiant+ scale scoring without changing base points.
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

    // Cosmetics repaint the spirit, flare, trail, and backdrop.
    const cosmetics = Meta.getCosmetics('lumen-sprite').map((item) => ({ id: item.id, slot: item.slot }));
    T.setMode('story');
    T.restart(true);
    const defaultColors = T.colors();
    T.cosmetic('skin', 'lumen-sprite:spirit-jade');
    const skinColors = T.colors();
    T.cosmetic('palette', 'lumen-sprite:flare-mint');
    const paletteColors = T.colors();
    T.cosmetic('effect', 'lumen-sprite:trail-violet');
    const effectColors = T.colors();
    T.cosmetic('theme', 'lumen-sprite:theme-echo');
    const styledColors = T.colors();

    return {
      lockedPlus,
      modeAfterLock,
      unlockedPlus,
      storyRun,
      plusStart: { mode: plusStart.mode, level: plusStart.level, hp: plusStart.hp, lives: plusStart.lives },
      plusSpawn,
      plusAward,
      plusRun,
      spiritRun,
      shardRun,
      dailyRun,
      darkRun,
      huntRun,
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

  assert.equal(gameplay.lockedPlus, true, 'Radiant+ stays locked before a Lumen Run clear');
  assert.equal(gameplay.modeAfterLock, 'story', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedPlus, true, 'completing the Lumen Run unlocks Radiant+');

  assert.equal(gameplay.storyRun.start.stage, 'Whispering Grove', 'the Lumen Run opens in the grove');
  assert.equal(gameplay.storyRun.start.lives, 3, 'the Lumen Run grants three lives');
  assert.equal(gameplay.storyRun.start.hp, 5, 'the Lumen Run starts at five health');
  assert.equal(gameplay.storyRun.start.maxhp, 5, 'the Lumen Run keeps the standard health cap');
  assert.equal(gameplay.storyRun.start.charms, 0, 'the Lumen Run opens without charms');
  assert.equal(gameplay.storyRun.start.levelName, 'Whispering Grove', 'the first glade reports its name');
  assert.equal(gameplay.storyRun.start.levelCount, 3, 'the Lumen Run runs three glades');
  assert.deepEqual(gameplay.storyRun.charms, { afterLeaf: 1, afterStar: 2, tiles: { leaf: ' ', star: ' ' } }, 'both charms are collected from their tiles');
  assert.deepEqual(gameplay.storyRun.tower, { rise: { on: true }, level: 2 }, 'the tower raises the dark in story');
  assert.equal(gameplay.storyRun.end.state, 'won', 'clearing the final gate wins the run');
  assert.equal(gameplay.storyRun.end.title, 'Dawn Breaks', 'the Lumen Run has its own victory title');
  assert.match(gameplay.storyRun.end.sub, /^Score 6000 · \d+s · 0 kills$/, 'the victory reports score, time, and kills');
  assert.equal(gameplay.storyRun.end.score, 6000, 'the Lumen Run banks its completion bonus');
  assert.equal(gameplay.storyRun.stats.runs, 1, 'the Lumen Run is recorded as a run');
  assert.equal(gameplay.storyRun.stats.storyCompletions, 1, 'a Lumen Run clear is recorded');
  assert.equal(gameplay.storyRun.stats.bestScore, 6000, 'the run score is persisted');
  assert.equal(gameplay.storyRun.stats.highestStage, 3, 'the final glade is recorded');
  assert.equal(gameplay.storyRun.stats.lastMode, 'story', 'the last mode is recorded');
  assert.equal(gameplay.storyRun.stats.charms, 2, 'both collected charms are counted');
  for (const id of ['charm-hunter', 'story-clear', 'personal-best', 'untouched', 'full-heart', 'swift-light']) {
    assert.ok(gameplay.storyRun.achievements.includes(id), `${id} unlocks during a clean Lumen Run (${gameplay.storyRun.achievements.join(',')})`);
  }
  for (const id of ['first-glow', 'hunter-light', 'daily-clear', 'night-clear', 'mote-clear', 'plus-clear', 'light-12000', 'spirit-bound']) {
    assert.ok(!gameplay.storyRun.achievements.includes(id), `${id} still waits for its own mode`);
  }

  assert.deepEqual(gameplay.plusStart, { mode: 'plus', level: 0, hp: 5, lives: 3 }, 'Radiant+ restarts the standard route');
  assert.deepEqual(gameplay.plusSpawn, { k: 'k', hp: 3, hmax: 3 }, 'Radiant+ scales crawler HP by 1.5×');
  assert.equal(gameplay.plusAward, 160, 'Radiant+ scales score by 1.6×');
  assert.deepEqual(gameplay.plusRun, { state: 'won', score: 12800, completions: 1, achievement: true, light: true }, 'clearing Radiant+ pays its bonus and records the clear');

  assert.equal(gameplay.spiritRun.state, 'won', 'a charmless run still wins');
  assert.equal(gameplay.spiritRun.score, 6000, 'a charmless run keeps the same bonus');
  assert.equal(gameplay.spiritRun.achievement, true, 'a charmless Lumen Run unlocks Spirit Bound');
  assert.equal(gameplay.spiritRun.personalBest, true, 'personal best was already earned earlier');

  assert.deepEqual(gameplay.shardRun.start, { level: 0, need: 6, gems: 6 }, 'Mote Hunt seeds the grove with six motes');
  assert.equal(gameplay.shardRun.lastNeed, 5, 'the tower gate asks for five motes');
  assert.equal(gameplay.shardRun.state, 'won', 'Mote Hunt still reaches the dawn');
  assert.equal(gameplay.shardRun.score, 6600, 'Mote Hunt scales its completion bonus by 1.2×');
  assert.equal(gameplay.shardRun.completions, 1, 'a Mote Hunt clear is recorded');
  assert.equal(gameplay.shardRun.achievement, true, 'Mote Hunt unlocks its achievement');

  assert.equal(gameplay.dailyRun.mode, 'daily', 'Daily Glade records its mode');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Glade wins the run');
  assert.equal(gameplay.dailyRun.title, 'Dawn Breaks', 'Daily Glade shares the story victory title');
  assert.equal(gameplay.dailyRun.score, 5000, 'Daily Glade pays its own bonus');
  assert.equal(gameplay.dailyRun.best, 5000, 'Daily Glade stores its best score');
  assert.equal(gameplay.dailyRun.completions, 1, 'Daily Glade tracks its completion');
  assert.equal(gameplay.dailyRun.achievement, true, 'clearing Daily Glade unlocks Daily Glade');

  assert.deepEqual(gameplay.darkRun.rise, { on: true }, 'Nightfall Rush turns the dark loose in the grove');
  assert.equal(gameplay.darkRun.state, 'won', 'Nightfall Rush still reaches the dawn');
  assert.equal(gameplay.darkRun.score, 8450, 'Nightfall Rush scales its completion bonus by 1.3×');
  assert.equal(gameplay.darkRun.completions, 1, 'a Nightfall clear is recorded');
  assert.equal(gameplay.darkRun.achievement, true, 'Nightfall Rush unlocks its achievement');

  assert.deepEqual(gameplay.huntRun, { kills: 10, first: true, hunter: true }, 'ten grove creatures unlock both kill achievements');

  assert.equal(gameplay.deathRun.state, 'over', 'losing every life ends the game');
  assert.equal(gameplay.deathRun.title, 'The Dark Takes Hold', 'a death reports the Lumen Sprite defeat title');
  assert.match(gameplay.deathRun.sub, /^Score 0 · reached Whispering Grove$/, 'the defeat reports the last glade');
  assert.equal(gameplay.deathRun.score, 0, 'a fresh death scores nothing');
  assert.equal(gameplay.deathRun.runsAfter, gameplay.deathRun.runsBefore + 1, 'a death is recorded as a run');

  assert.deepEqual(gameplay.awards, { normal: 100, hard: 125, easy: 100, plus: 160 }, 'hard and Radiant+ scale score without changing base points');

  assert.equal(gameplay.cosmetics.length, 16, 'Lumen Sprite ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) {
    assert.ok(gameplay.cosmetics.some((item) => item.slot === slot), `Lumen Sprite has ${slot} cosmetics`);
  }
  for (const id of ['lumen-sprite:spirit-ivory', 'lumen-sprite:spirit-violet', 'lumen-sprite:flare-sky', 'lumen-sprite:trail-mint', 'lumen-sprite:theme-echo']) {
    assert.ok(gameplay.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(gameplay.defaultColors, { body: '#fffbeb', glow: '#fde68a', eye: '#1e293b', flare: '#fde68a', effect: '#fde68a', theme: 'auto' }, 'the default look is the ivory spirit');
  assert.deepEqual({ body: gameplay.skinColors.body, glow: gameplay.skinColors.glow }, { body: '#d1fae5', glow: '#34d399' }, 'the Jade Spirit skin repaints the sprite');
  assert.equal(gameplay.paletteColors.flare, '#5eead4', 'Mint Flare repaints the flare');
  assert.equal(gameplay.effectColors.effect, '#c4b5fd', 'Violet Trail repaints the dash trail');
  assert.deepEqual({ theme: gameplay.styledColors.theme, effect: gameplay.styledColors.effect }, { theme: 'echo', effect: '#c4b5fd' }, 'theme and effect cosmetics repaint their targets');
  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  console.log('PASS modes, charms, gates, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    LumenTest.setMode('story');
    LumenTest.setDifficulty('normal');
    LumenTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-19-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/?test=1#/game/ori-and-the-blind-forest`);
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
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-19-3d.png') });
  assert.equal(theaterMid.first.variant, 'ori', 'the theater runs the Ori variant');
  assert.equal(theaterMid.first.phase, 'PLAYING', 'the theater opens in play');
  assert.equal(theaterMid.first.stageName, 'Sunken Glades', 'the first stage reports its name');
  assert.equal(theaterMid.first.stages, 3, 'the precision engine runs three stages');
  assert.equal(theaterMid.first.totalGems, 21, 'the three stages hold 21 light orbs');
  assert.equal(theaterMid.collected.gems, 7, 'collecting every orb records seven');
  assert.equal(theaterMid.third.stage, 2, 'the third stage is selectable');
  assert.equal(theaterMid.third.stageName, 'Spirit Willow', 'the third stage reports its name');
  assert.equal(theaterEnd.phase, 'VICTORY', 'reaching the final goal wins the theater run');
  assert.ok(theaterEnd.score > 0, 'the theater run reports a score');
  await theaterPage.getByText('Nibel Restored!').waitFor({ state: 'visible' });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 19 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
