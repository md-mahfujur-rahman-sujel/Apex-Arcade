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
  await page.goto(`${origin}${basePath}/assets/games/14-metroid/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof DeepcoreTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

async function seededRoute(urlSeed) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate(() => {
    const expected = (() => {
      const d = new Date();
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      let x = key ^ 0x6d2b79f5;
      for (const ch of 'deepcore-drifter') x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
      return (x >>> 0) || 1;
    })();
    DeepcoreTest.setMode('daily');
    DeepcoreTest.restart(true);
    const state = DeepcoreTest.state();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      world: DeepcoreTest.world(),
      sequence: DeepcoreTest.sequence(12),
      level: state.level,
      stage: state.stage,
      lives: state.lives,
      hp: state.hp,
      maxhp: state.maxhp,
      ammo: state.ammo,
      need: state.need,
      stageCount: DeepcoreTest.stageCount(),
    };
  });
  await context.close();
  return data;
}

try {
  const routeA = await seededRoute(42);
  const routeB = await seededRoute(77);

  assert.equal(routeA.mode, 'daily', 'Daily Descent can be selected');
  assert.equal(routeA.expected, routeA.seed, 'Daily Descent uses the local-day seed');
  assert.equal(routeA.seed, routeB.seed, 'every session shares today’s seed');
  assert.equal(routeA.world, routeB.world, 'today’s descent layout is identical across sessions');
  assert.deepEqual(routeA.sequence, routeB.sequence, 'today’s RNG stream is identical across sessions');
  assert.equal(routeA.stage, 'Sector 1 · Collapsed Core', 'Daily Descent starts in the collapsed core');
  assert.equal(routeA.lives, 3, 'Daily Descent starts with three lives');
  assert.equal(routeA.hp, 6, 'Daily Descent starts at six hearts');
  assert.equal(routeA.maxhp, 6, 'Daily Descent keeps the standard heart cap');
  assert.equal(routeA.ammo, 0, 'Daily Descent starts without missiles');
  assert.equal(routeA.need, 0, 'Daily Descent does not require core shards');
  assert.equal(routeA.level, 0, 'Daily Descent opens on the first sector');
  assert.equal(routeA.stageCount, 3, 'Deepcore Drifter ships three sectors');
  console.log('PASS Daily Descent is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const T = DeepcoreTest;
    const state = () => T.state();
    const save = () => Save.load('deepcore-drifter');
    const stats = () => save().stats || {};
    const achievements = () => save().achievements || [];
    const step = (n = 1) => Arcade.test.step(n);

    // Nightcore+ stays locked until Story Drift is completed.
    const lockedPlus = T.setMode('nightcore-plus') === false;
    const modeAfterLock = state().mode;

    // Story Drift: the third-sector boss, then the gate.
    T.setMode('story');
    T.setDifficulty('normal');
    T.restart(true);
    const storyStart = state();
    const storyWorld = T.world();
    const storyHasTokens = storyWorld.includes('g');
    const storyLevelName = T.levelName(0);
    T.goLevel(2);
    const storyBoss = state();
    const bossScoreBefore = state().score;
    T.killBoss();
    const bossAfter = state();
    T.finishLevel();
    step(30);
    const storyEnd = state();
    const storyRun = {
      start: {
        level: storyStart.level,
        stage: storyStart.stage,
        need: storyStart.need,
        lives: storyStart.lives,
        hp: storyStart.hp,
        ammo: storyStart.ammo,
        hasTokens: storyHasTokens,
        levelName: storyLevelName,
        levelCount: T.stageCount(),
      },
      bossStart: storyBoss.boss,
      bossAfter: { boss: bossAfter.boss, score: bossAfter.score, gain: bossAfter.score - bossScoreBefore },
      end: {
        state: storyEnd.state,
        title: Arcade.G.title,
        sub: Arcade.G.sub,
        score: Arcade.G.score,
      },
      stats: stats(),
      achievements: achievements(),
    };

    // Story completion unlocks Nightcore+, which buffs enemies and scales score.
    const unlockedPlus = T.setMode('nightcore-plus') === true;
    T.restart(true);
    const plusStart = state();
    const plusSpawn = T.spawn('k', 320, 352);
    const plusAward = (() => {
      const before = Arcade.G.score;
      T.award(100);
      return Arcade.G.score - before;
    })();
    T.goLevel(2);
    const plusBoss = state().boss;

    // Core Hunt: four shards per sector gate the exit.
    T.setMode('core-hunt');
    T.restart(true);
    const relicStart = state();
    const relicGates = T.world().split('').filter((ch) => ch === 'g').length;
    const relicGateTile = T.gridAt(147, 16);
    T.teleport(147 * 32, 16 * 32);
    step(4);
    const gateBlocked = state();
    T.setTokens(4);
    T.teleport(147 * 32, 16 * 32);
    step(3);
    const gateOpened = state();
    step(95);
    const gatePassed = state();
    T.goLevel(2);
    T.killBoss();
    T.finishLevel();
    step(30);
    const relicEnd = state();
    const relicRun = {
      start: { level: relicStart.level, stage: relicStart.stage, need: relicStart.need, tokens: relicStart.tokens, gates: relicGates, gateTile: relicGateTile },
      blocked: { level: gateBlocked.level, tokens: gateBlocked.tokens },
      opened: { score: gateOpened.score, level: gateOpened.level },
      passed: { level: gatePassed.level, stage: gatePassed.stage },
      end: { state: relicEnd.state, title: Arcade.G.title, score: relicEnd.score },
      stats: stats(),
      achievements: achievements(),
    };

    // Daily Descent completes and records its own best.
    T.setMode('daily');
    T.restart(true);
    const dailyStart = state();
    T.goLevel(2);
    T.killBoss();
    T.finishLevel();
    step(30);
    const dailyEnd = state();
    const dailyRun = {
      seed: dailyStart.seed,
      state: dailyEnd.state,
      title: Arcade.G.title,
      score: dailyEnd.score,
      best: Number(stats().dailyBest) || 0,
      completions: Number(stats().dailyCompletions) || 0,
      achievement: achievements().includes('daily-player'),
    };

    // Warden Gauntlet: the gate waits for the duel to end.
    T.setMode('boss-rush');
    T.restart(true);
    const rushStart = state();
    T.teleport(37 * 32, 11 * 32);
    step(5);
    const rushBlocked = state();
    T.killBoss();
    step(20);
    T.teleport(37 * 32, 11 * 32);
    step(3);
    const rushOpened = state();
    step(110);
    const rushSecond = state();
    T.goLevel(2);
    T.killBoss();
    T.finishLevel();
    step(30);
    const rushEnd = state();
    const rushRun = {
      start: { level: rushStart.level, stage: rushStart.stage, need: rushStart.need, boss: rushStart.boss },
      blocked: { level: rushBlocked.level },
      opened: { score: rushOpened.score, level: rushOpened.level },
      second: { level: rushSecond.level, stage: rushSecond.stage },
      end: { state: rushEnd.state, title: Arcade.G.title },
      stats: stats(),
      achievements: achievements(),
    };

    // Difficulty and Nightcore+ scale scoring without changing battle rules.
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
    T.setMode('nightcore-plus');
    T.restart(true);
    const plusScale = (() => {
      const before = Arcade.G.score;
      T.award(100);
      return Arcade.G.score - before;
    })();
    T.setDifficulty('normal');

    // Cosmetics repaint the drifter, beam, effects, and backdrop.
    const cosmetics = Meta.getCosmetics('deepcore-drifter').map((item) => ({ id: item.id, slot: item.slot }));
    T.setMode('story');
    T.restart(true);
    const defaultColors = T.colors();
    T.cosmetic('skin', 'deepcore-drifter:drifter-ember');
    const skinColors = T.colors();
    T.cosmetic('palette', 'deepcore-drifter:beam-plasma');
    const paletteColors = T.colors();
    T.cosmetic('effect', 'deepcore-drifter:static');
    T.cosmetic('theme', 'deepcore-drifter:frozen-abyss');
    const styledColors = T.colors();

    return {
      lockedPlus,
      modeAfterLock,
      unlockedPlus,
      storyRun,
      plusStart: { mode: plusStart.mode, level: plusStart.level, hp: plusStart.hp, lives: plusStart.lives },
      plusSpawn,
      plusAward,
      plusBoss,
      relicRun,
      dailyRun,
      rushRun,
      awards: { normal: normalAward, hard: hardAward, easy: easyAward, plus: plusScale },
      cosmetics,
      defaultColors,
      skinColors,
      paletteColors,
      styledColors,
      menuActions: Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((node) => node.getAttribute('data-menu-action')),
    };
  });

  assert.equal(gameplay.lockedPlus, true, 'Nightcore+ stays locked before a Story clear');
  assert.equal(gameplay.modeAfterLock, 'story', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedPlus, true, 'completing Story Drift unlocks Nightcore+');

  assert.equal(gameplay.storyRun.start.stage, 'Sector 1 · Collapsed Core', 'Story Drift opens in the collapsed core');
  assert.equal(gameplay.storyRun.start.need, 0, 'Story Drift needs no core shards');
  assert.equal(gameplay.storyRun.start.lives, 3, 'Story Drift starts with three lives');
  assert.equal(gameplay.storyRun.start.hp, 6, 'Story Drift starts at six hearts');
  assert.equal(gameplay.storyRun.start.ammo, 0, 'Story Drift starts without missiles');
  assert.equal(gameplay.storyRun.start.hasTokens, false, 'Story Drift does not scatter core shards');
  assert.equal(gameplay.storyRun.start.levelName, 'Sector 1 · Collapsed Core', 'the first sector reports its name');
  assert.equal(gameplay.storyRun.start.levelCount, 3, 'Story Drift runs three sectors');
  assert.deepEqual(gameplay.storyRun.bossStart, { hp: 36, hmax: 36, awake: false }, 'the sleeping Brood Warden has 36 HP');
  assert.equal(gameplay.storyRun.bossAfter.boss, null, 'defeating the warden clears the guardian');
  assert.equal(gameplay.storyRun.bossAfter.gain, 3000, 'the Brood Warden pays 3000 score');
  assert.equal(gameplay.storyRun.end.state, 'won', 'clearing the final gate wins the run');
  assert.equal(gameplay.storyRun.end.title, 'Core Stabilised', 'Story Drift has its own victory title');
  assert.match(gameplay.storyRun.end.sub, /^Score 3000 · 0 shards · \d+s$/, 'the victory reports score, shards, and time');
  assert.equal(gameplay.storyRun.end.score, 3000, 'the story run scores the boss bounty');
  assert.equal(gameplay.storyRun.stats.storyCompletions, 1, 'a Story clear is recorded');
  assert.equal(gameplay.storyRun.stats.bestScore, 3000, 'the story score is persisted');
  assert.equal(gameplay.storyRun.stats.highestStage, 3, 'the final sector is recorded');
  assert.equal(gameplay.storyRun.stats.lastMode, 'story', 'the last mode is recorded');
  for (const id of ['first-blood', 'warden-slayer', 'story-clear', 'personal-best', 'untouched', 'iron-drifter', 'speed-run']) {
    assert.ok(gameplay.storyRun.achievements.includes(id), `${id} unlocks during a clean story run (${gameplay.storyRun.achievements.join(',')})`);
  }
  for (const id of ['scavenger', 'core-keeper', 'daily-player', 'nightcore-clear', 'gauntlet-clear']) {
    assert.ok(!gameplay.storyRun.achievements.includes(id), `${id} still waits for its own mode`);
  }

  assert.deepEqual(gameplay.plusStart, { mode: 'nightcore-plus', level: 0, hp: 6, lives: 3 }, 'Nightcore+ restarts the standard route');
  assert.deepEqual(gameplay.plusSpawn, { k: 'k', hp: 3, hmax: 3 }, 'Nightcore+ scales crawler HP by 1.5×');
  assert.equal(gameplay.plusAward, 130, 'Nightcore+ scales score by 1.3×');
  assert.deepEqual(gameplay.plusBoss, { hp: 54, hmax: 54, awake: false }, 'Nightcore+ buffs the Brood Warden to 54 HP');

  assert.deepEqual(gameplay.relicRun.start, { level: 0, stage: 'Sector 1 · Collapsed Core', need: 4, tokens: 0, gates: 4, gateTile: 'F' }, 'Core Hunt scatters four shards before the gate');
  assert.deepEqual(gameplay.relicRun.blocked, { level: 0, tokens: 0 }, 'the gate refuses to open without the shards');
  assert.deepEqual(gameplay.relicRun.opened, { score: 500, level: 0 }, 'the fourth shard charges the gate and pays 500');
  assert.deepEqual(gameplay.relicRun.passed, { level: 1, stage: 'Sector 2 · Ion Trench' }, 'the charged gate advances to the ion trench');
  assert.equal(gameplay.relicRun.end.state, 'won', 'clearing the Core Hunt route wins the run');
  assert.equal(gameplay.relicRun.end.title, 'Core Stabilised', 'Core Hunt shares the story victory title');
  assert.equal(gameplay.relicRun.end.score, 3500, 'shard gate and boss scoring add up');
  assert.equal(gameplay.relicRun.stats.coreCompletions, 1, 'a Core Hunt clear is recorded');
  assert.ok(gameplay.relicRun.achievements.includes('core-keeper'), 'Core Hunt unlocks Core Keeper');

  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Descent wins the run');
  assert.equal(gameplay.dailyRun.title, 'Core Stabilised', 'Daily Descent shares the story victory title');
  assert.equal(gameplay.dailyRun.score, 3000, 'Daily Descent pays the boss bounty');
  assert.equal(gameplay.dailyRun.best, 3000, 'Daily Descent stores its best score');
  assert.equal(gameplay.dailyRun.completions, 1, 'Daily Descent tracks its completion');
  assert.equal(gameplay.dailyRun.achievement, true, 'clearing Daily Descent unlocks Daily Descent');

  assert.equal(gameplay.rushRun.start.stage, 'Duel 1 · Deep Vault', 'Warden Gauntlet opens in the deep vault');
  assert.equal(gameplay.rushRun.start.need, 0, 'Warden Gauntlet never asks for shards');
  assert.deepEqual(gameplay.rushRun.start.boss, { hp: 36, hmax: 36, awake: false }, 'the gauntlet opens with the warden asleep');
  assert.equal(gameplay.rushRun.blocked.level, 0, 'the gate waits while the warden lives');
  assert.deepEqual(gameplay.rushRun.opened, { score: 3500, level: 0 }, 'the warden bounty and gate bonus stack');
  assert.deepEqual(gameplay.rushRun.second, { level: 1, stage: 'Duel 2 · Pressure Lock' }, 'the gauntlet advances to the second duel');
  assert.equal(gameplay.rushRun.end.state, 'won', 'clearing all three duels wins the gauntlet');
  assert.equal(gameplay.rushRun.stats.bossRushCompletions, 1, 'a gauntlet clear is recorded');
  assert.ok(gameplay.rushRun.achievements.includes('gauntlet-clear'), 'the gauntlet unlocks its achievement');

  assert.deepEqual(gameplay.awards, { normal: 100, hard: 125, easy: 100, plus: 130 }, 'hard and Nightcore+ scale score without changing base points');

  assert.equal(gameplay.cosmetics.length, 16, 'Deepcore Drifter ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) {
    assert.ok(gameplay.cosmetics.some((item) => item.slot === slot), `Deepcore Drifter has ${slot} cosmetics`);
  }
  for (const id of ['deepcore-drifter:drifter-standard', 'deepcore-drifter:drifter-ember', 'deepcore-drifter:beam-plasma', 'deepcore-drifter:static', 'deepcore-drifter:frozen-abyss']) {
    assert.ok(gameplay.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(
    { theme: gameplay.defaultColors.theme, suit: gameplay.defaultColors.suit, beam: gameplay.defaultColors.beam, effect: gameplay.defaultColors.effect },
    { theme: 'deepcore', suit: '#f97316', beam: '#67e8f9', effect: '#22d3ee' },
    'the default look is the standard suit in the deepcore',
  );
  assert.equal(gameplay.skinColors.suit, '#ef4444', 'the Ember Suit repaints the armour');
  assert.equal(gameplay.paletteColors.beam, '#f472b6', 'Plasma Beam repaints the shot');
  assert.deepEqual(
    { theme: gameplay.styledColors.theme, effect: gameplay.styledColors.effect },
    { theme: 'frozen-abyss', effect: '#a3e635' },
    'theme and effect cosmetics repaint their targets',
  );
  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  console.log('PASS modes, gates, bosses, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    DeepcoreTest.setMode('story');
    DeepcoreTest.setDifficulty('normal');
    DeepcoreTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-14-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/?test=1#/game/super-metroid`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.getByRole('button', { name: 'LAND ON ZEBES' }).click();
  await theaterPage.waitForFunction(() => typeof window.ActionCombatTest !== 'undefined' && window.ActionCombatTest.state().started === true);
  const theaterMid = await theaterPage.evaluate(() => {
    const test = window.ActionCombatTest;
    const first = test.state();
    test.setZone(2);
    const sanctum = test.state();
    test.spawnBoss();
    const spawned = test.state();
    test.killBoss();
    return { first, sanctum, spawned, finish: test.state() };
  });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-14-3d-mid.png') });
  assert.equal(theaterMid.first.started, true, 'the theater action engine starts on demand');
  assert.equal(theaterMid.first.phase, 'PLAYING', 'the theater opens in play');
  assert.equal(theaterMid.first.zone, 0, 'the theater starts on the Zebes surface');
  assert.equal(theaterMid.first.zoneName, 'Zebes Surface', 'the first zone reports its name');
  assert.equal(theaterMid.first.zones, 3, 'the action engine runs three zones');
  assert.equal(theaterMid.first.maxHp, 100, 'the theater hero starts at full HP');
  assert.equal(theaterMid.first.maxAmmo, 5, 'the theater hero carries five missiles');
  assert.equal(theaterMid.sanctum.zone, 2, 'the third zone is the sanctum');
  assert.equal(theaterMid.sanctum.zoneName, 'Torizo Sanctum', 'the sanctum reports its name');
  assert.equal(theaterMid.sanctum.bossSpawned, false, 'the sentinel waits for the arena waves');
  assert.equal(theaterMid.spawned.bossSpawned, true, 'the boss spawns on cue');
  assert.equal(theaterMid.spawned.bossMax, 320, 'the Torizo Sentinel has 320 HP');
  assert.equal(theaterMid.spawned.bossHp, 320, 'the sentinel enters at full health');
  assert.equal(theaterMid.finish.phase, 'VICTORY', 'defeating the sentinel wins the theater run');
  assert.ok(theaterMid.finish.score > 0, 'the theater run reports a score');
  assert.equal(theaterMid.finish.bossHp, null, 'the defeated sentinel leaves the arena');
  await theaterPage.getByRole('button', { name: 'RUN IT BACK' }).waitFor({ state: 'visible' });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-14-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 14 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
