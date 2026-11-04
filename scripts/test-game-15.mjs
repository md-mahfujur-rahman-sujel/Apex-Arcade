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
  await page.goto(`${origin}${basePath}/assets/games/15-hollow-knight/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof HollowbellTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

async function seededRoute(urlSeed) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate(() => {
    const expected = (() => {
      const d = new Date();
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      let x = key ^ 0x6d2b79f5;
      for (const ch of 'hollowbell') x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
      return (x >>> 0) || 1;
    })();
    HollowbellTest.setMode('daily');
    HollowbellTest.restart(true);
    const state = HollowbellTest.state();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      world: HollowbellTest.world(),
      sequence: HollowbellTest.sequence(12),
      level: state.level,
      stage: state.stage,
      lives: state.lives,
      hp: state.hp,
      maxhp: state.maxhp,
      ammo: state.ammo,
      need: state.need,
      stageCount: HollowbellTest.stageCount(),
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
  assert.equal(routeA.world, routeB.world, 'today’s cave layout is identical across sessions');
  assert.deepEqual(routeA.sequence, routeB.sequence, 'today’s RNG stream is identical across sessions');
  assert.equal(routeA.stage, 'The Sunken Hollow', 'Daily Descent starts in the sunken hollow');
  assert.equal(routeA.lives, 0, 'Hollowbell is a soul run with no spare lives');
  assert.equal(routeA.hp, 5, 'Daily Descent starts at five masks');
  assert.equal(routeA.maxhp, 5, 'Daily Descent keeps the standard mask cap');
  assert.equal(routeA.ammo, 0, 'Hollowbell carries no ammo');
  assert.equal(routeA.need, 0, 'Daily Descent does not require lost bells');
  assert.equal(routeA.level, 0, 'Daily Descent opens on the first depth');
  assert.equal(routeA.stageCount, 3, 'Hollowbell ships three depths');
  console.log('PASS Daily Descent is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const T = HollowbellTest;
    const state = () => T.state();
    const save = () => Save.load('hollowbell');
    const stats = () => save().stats || {};
    const achievements = () => save().achievements || [];
    const step = (n = 1) => Arcade.test.step(n);

    // Hollow+ stays locked until Pilgrimage is completed.
    const lockedPlus = T.setMode('hollow-plus') === false;
    const modeAfterLock = state().mode;

    // Pilgrimage: level 3 boss, gate clears only after the warden dies.
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

    // Pilgrimage completion unlocks Hollow+, which buffs enemies and scales score.
    const unlockedPlus = T.setMode('hollow-plus') === true;
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

    // Shard Hunt: four lost bells per depth gate the exit.
    T.setMode('shard-hunt');
    T.restart(true);
    const relicStart = state();
    const relicGates = T.world().split('').filter((ch) => ch === 'g').length;
    const relicGateTile = T.gridAt(131, 12);
    T.teleport(131 * 32, 12 * 32);
    step(4);
    const gateBlocked = state();
    T.setTokens(4);
    T.teleport(131 * 32, 12 * 32);
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

    // Difficulty and Hollow+ scale scoring without changing battle rules.
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
    T.setMode('hollow-plus');
    T.restart(true);
    const plusScale = (() => {
      const before = Arcade.G.score;
      T.award(100);
      return Arcade.G.score - before;
    })();
    T.setDifficulty('normal');

    // Cosmetics repaint the wanderer, needle, effects, and backdrop.
    const cosmetics = Meta.getCosmetics('hollowbell').map((item) => ({ id: item.id, slot: item.slot }));
    T.setMode('story');
    T.restart(true);
    const defaultColors = T.colors();
    T.cosmetic('skin', 'hollowbell:cloak-ember');
    const skinColors = T.colors();
    T.cosmetic('palette', 'hollowbell:nail-frost');
    const paletteColors = T.colors();
    T.cosmetic('effect', 'hollowbell:wisp-soul');
    T.cosmetic('theme', 'hollowbell:pale-garden');
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

  assert.equal(gameplay.lockedPlus, true, 'Hollow+ stays locked before a Pilgrimage clear');
  assert.equal(gameplay.modeAfterLock, 'story', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedPlus, true, 'completing Pilgrimage unlocks Hollow+');

  assert.equal(gameplay.storyRun.start.stage, 'The Sunken Hollow', 'Pilgrimage opens in the sunken hollow');
  assert.equal(gameplay.storyRun.start.need, 0, 'Pilgrimage needs no lost bells');
  assert.equal(gameplay.storyRun.start.lives, 0, 'Pilgrimage is a soul run');
  assert.equal(gameplay.storyRun.start.hp, 5, 'Pilgrimage starts at five masks');
  assert.equal(gameplay.storyRun.start.ammo, 0, 'Pilgrimage carries no ammo');
  assert.equal(gameplay.storyRun.start.hasTokens, false, 'Pilgrimage does not scatter lost bells');
  assert.equal(gameplay.storyRun.start.levelName, 'The Sunken Hollow', 'the first depth reports its name');
  assert.equal(gameplay.storyRun.start.levelCount, 3, 'Pilgrimage runs three depths');
  assert.deepEqual(gameplay.storyRun.bossStart, { hp: 26, hmax: 26, awake: false }, 'the sleeping Pale Warden has 26 HP');
  assert.equal(gameplay.storyRun.bossAfter.boss, null, 'defeating the warden clears the guardian');
  assert.equal(gameplay.storyRun.bossAfter.gain, 3000, 'the Pale Warden pays 3000 score');
  assert.equal(gameplay.storyRun.end.state, 'won', 'clearing the final gate wins the run');
  assert.equal(gameplay.storyRun.end.title, 'The Bell Falls Silent', 'Pilgrimage has its own victory title');
  assert.match(gameplay.storyRun.end.sub, /^Score 3000 · 0 shards · \d+s$/, 'the victory reports score, shards, and time');
  assert.equal(gameplay.storyRun.end.score, 3000, 'the story run scores the warden bounty');
  assert.equal(gameplay.storyRun.stats.storyCompletions, 1, 'a Pilgrimage clear is recorded');
  assert.equal(gameplay.storyRun.stats.bestScore, 3000, 'the story score is persisted');
  assert.equal(gameplay.storyRun.stats.highestStage, 3, 'the final depth is recorded');
  assert.equal(gameplay.storyRun.stats.lastMode, 'story', 'the last mode is recorded');
  for (const id of ['first-wound', 'warden-slayer', 'story-clear', 'personal-best', 'untouched', 'iron-heart', 'speed-run']) {
    assert.ok(gameplay.storyRun.achievements.includes(id), `${id} unlocks during a clean story run (${gameplay.storyRun.achievements.join(',')})`);
  }
  for (const id of ['wall-breaker', 'shard-keeper', 'daily-player', 'hollow-clear', 'gauntlet-clear']) {
    assert.ok(!gameplay.storyRun.achievements.includes(id), `${id} still waits for its own mode`);
  }

  assert.deepEqual(gameplay.plusStart, { mode: 'hollow-plus', level: 0, hp: 5, lives: 0 }, 'Hollow+ restarts the standard route');
  assert.deepEqual(gameplay.plusSpawn, { k: 'k', hp: 3, hmax: 3 }, 'Hollow+ scales crawler HP by 1.5×');
  assert.equal(gameplay.plusAward, 130, 'Hollow+ scales score by 1.3×');
  assert.deepEqual(gameplay.plusBoss, { hp: 39, hmax: 39, awake: false }, 'Hollow+ buffs the Pale Warden to 39 HP');

  assert.deepEqual(gameplay.relicRun.start, { level: 0, stage: 'The Sunken Hollow', need: 4, tokens: 0, gates: 4, gateTile: 'F' }, 'Shard Hunt scatters four bells before the gate');
  assert.deepEqual(gameplay.relicRun.blocked, { level: 0, tokens: 0 }, 'the gate refuses to open without the bells');
  assert.deepEqual(gameplay.relicRun.opened, { score: 500, level: 0 }, 'the fourth bell charges the gate and pays 500');
  assert.deepEqual(gameplay.relicRun.passed, { level: 1, stage: 'Mistveil Cistern' }, 'the charged gate advances to the cistern');
  assert.equal(gameplay.relicRun.end.state, 'won', 'clearing the Shard Hunt route wins the run');
  assert.equal(gameplay.relicRun.end.title, 'The Bell Falls Silent', 'Shard Hunt shares the story victory title');
  assert.equal(gameplay.relicRun.end.score, 3500, 'bell gate and warden scoring add up');
  assert.equal(gameplay.relicRun.stats.shardCompletions, 1, 'a Shard Hunt clear is recorded');
  assert.ok(gameplay.relicRun.achievements.includes('shard-keeper'), 'Shard Hunt unlocks Shard Keeper');

  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Descent wins the run');
  assert.equal(gameplay.dailyRun.title, 'The Bell Falls Silent', 'Daily Descent shares the story victory title');
  assert.equal(gameplay.dailyRun.score, 3000, 'Daily Descent pays the warden bounty');
  assert.equal(gameplay.dailyRun.best, 3000, 'Daily Descent stores its best score');
  assert.equal(gameplay.dailyRun.completions, 1, 'Daily Descent tracks its completion');
  assert.equal(gameplay.dailyRun.achievement, true, 'clearing Daily Descent unlocks Daily Descent');

  assert.equal(gameplay.rushRun.start.stage, 'Duel 1 · Broken Crossroads', 'Warden Gauntlet opens at the crossroads');
  assert.equal(gameplay.rushRun.start.need, 0, 'Warden Gauntlet never asks for bells');
  assert.deepEqual(gameplay.rushRun.start.boss, { hp: 26, hmax: 26, awake: false }, 'the gauntlet opens with the warden asleep');
  assert.equal(gameplay.rushRun.blocked.level, 0, 'the gate waits while the warden lives');
  assert.deepEqual(gameplay.rushRun.opened, { score: 3500, level: 0 }, 'the warden bounty and gate bonus stack');
  assert.deepEqual(gameplay.rushRun.second, { level: 1, stage: 'Duel 2 · Flooded Nave' }, 'the gauntlet advances to the second duel');
  assert.equal(gameplay.rushRun.end.state, 'won', 'clearing all three duels wins the gauntlet');
  assert.equal(gameplay.rushRun.stats.bossRushCompletions, 1, 'a gauntlet clear is recorded');
  assert.ok(gameplay.rushRun.achievements.includes('gauntlet-clear'), 'the gauntlet unlocks its achievement');

  assert.deepEqual(gameplay.awards, { normal: 100, hard: 125, easy: 100, plus: 130 }, 'hard and Hollow+ scale score without changing base points');

  assert.equal(gameplay.cosmetics.length, 16, 'Hollowbell ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) {
    assert.ok(gameplay.cosmetics.some((item) => item.slot === slot), `Hollowbell has ${slot} cosmetics`);
  }
  for (const id of ['hollowbell:wanderer', 'hollowbell:cloak-ember', 'hollowbell:nail-frost', 'hollowbell:wisp-soul', 'hollowbell:pale-garden']) {
    assert.ok(gameplay.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(
    { theme: gameplay.defaultColors.theme, cloak: gameplay.defaultColors.cloak, mask: gameplay.defaultColors.mask, needle: gameplay.defaultColors.needle, effect: gameplay.defaultColors.effect },
    { theme: 'hollow', cloak: '#0e1726', mask: '#e2e8f0', needle: '#bae6fd', effect: '#5eead4' },
    'the default look is the wanderer in the sunken hollow',
  );
  assert.equal(gameplay.skinColors.cloak, '#3b0a12', 'the Ember Cloak repaints the shell');
  assert.equal(gameplay.paletteColors.needle, '#a5f3fc', 'Frost Nail repaints the needle');
  assert.deepEqual(
    { theme: gameplay.styledColors.theme, effect: gameplay.styledColors.effect },
    { theme: 'pale-garden', effect: '#a78bfa' },
    'theme and effect cosmetics repaint their targets',
  );
  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  console.log('PASS modes, gates, bosses, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    HollowbellTest.setMode('story');
    HollowbellTest.setDifficulty('normal');
    HollowbellTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-15-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/?test=1#/game/hollow-knight`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.getByRole('button', { name: 'ENTER HALLOWNEST' }).click();
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
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-15-3d-mid.png') });
  assert.equal(theaterMid.first.started, true, 'the theater action engine starts on demand');
  assert.equal(theaterMid.first.phase, 'PLAYING', 'the theater opens in play');
  assert.equal(theaterMid.first.zone, 0, 'the theater starts in the crossroads');
  assert.equal(theaterMid.first.zoneName, 'Forgotten Crossroads', 'the first zone reports its name');
  assert.equal(theaterMid.first.zones, 3, 'the action engine runs three zones');
  assert.equal(theaterMid.first.maxHp, 100, 'the theater hero starts at full HP');
  assert.equal(theaterMid.first.maxAmmo, 0, 'the nail hero carries no ammo');
  assert.equal(theaterMid.sanctum.zone, 2, 'the third zone is the arena');
  assert.equal(theaterMid.sanctum.zoneName, 'False Knight Arena', 'the arena reports its name');
  assert.equal(theaterMid.sanctum.bossSpawned, false, 'the False Knight waits for the arena waves');
  assert.equal(theaterMid.spawned.bossSpawned, true, 'the boss spawns on cue');
  assert.equal(theaterMid.spawned.bossMax, 300, 'the False Knight has 300 HP');
  assert.equal(theaterMid.spawned.bossHp, 300, 'the False Knight enters at full health');
  assert.equal(theaterMid.finish.phase, 'VICTORY', 'defeating the False Knight wins the theater run');
  assert.ok(theaterMid.finish.score > 0, 'the theater run reports a score');
  assert.equal(theaterMid.finish.bossHp, null, 'the defeated False Knight leaves the arena');
  await theaterPage.getByRole('button', { name: 'RUN IT BACK' }).waitFor({ state: 'visible' });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-15-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 15 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
