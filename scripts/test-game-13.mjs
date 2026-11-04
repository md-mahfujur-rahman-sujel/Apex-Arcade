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
  await page.goto(`${origin}${basePath}/assets/games/13-castlevania/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof LanternboundTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

async function seededRoute(urlSeed) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate(() => {
    const expected = (() => {
      const d = new Date();
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      let x = key ^ 0x6d2b79f5;
      for (const ch of 'lanternbound') x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
      return (x >>> 0) || 1;
    })();
    LanternboundTest.setMode('daily');
    LanternboundTest.restart(true);
    const state = LanternboundTest.state();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      world: LanternboundTest.world(),
      sequence: LanternboundTest.sequence(12),
      level: state.level,
      stage: state.stage,
      lives: state.lives,
      hp: state.hp,
      maxhp: state.maxhp,
      ammo: state.ammo,
      need: state.need,
      stageCount: LanternboundTest.stageCount(),
    };
  });
  await context.close();
  return data;
}

try {
  const routeA = await seededRoute(42);
  const routeB = await seededRoute(77);

  assert.equal(routeA.mode, 'daily', 'Daily Crypt can be selected');
  assert.equal(routeA.expected, routeA.seed, 'Daily Crypt uses the local-day seed');
  assert.equal(routeA.seed, routeB.seed, 'every session shares today’s seed');
  assert.equal(routeA.world, routeB.world, 'today’s crypt layout is identical across sessions');
  assert.deepEqual(routeA.sequence, routeB.sequence, 'today’s RNG stream is identical across sessions');
  assert.equal(routeA.stage, 'Stage 1 · Moonlit Courtyard', 'Daily Crypt starts in the courtyard');
  assert.equal(routeA.lives, 3, 'Daily Crypt starts with three lives');
  assert.equal(routeA.hp, 6, 'Daily Crypt starts at six hearts');
  assert.equal(routeA.maxhp, 6, 'Daily Crypt keeps the standard heart cap');
  assert.equal(routeA.ammo, 5, 'Daily Crypt starts with five axes');
  assert.equal(routeA.need, 0, 'Daily Crypt does not require relic tokens');
  assert.equal(routeA.level, 0, 'Daily Crypt opens on the first stage');
  assert.equal(routeA.stageCount, 3, 'Lanternbound ships three stages');
  console.log('PASS Daily Crypt is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const T = LanternboundTest;
    const state = () => T.state();
    const save = () => Save.load('lanternbound');
    const stats = () => save().stats || {};
    const achievements = () => save().achievements || [];
    const step = (n = 1) => Arcade.test.step(n);

    // Nocturne+ stays locked until Story Hunt is completed.
    const lockedPlus = T.setMode('nocturne-plus') === false;
    const modeAfterLock = state().mode;

    // Story Hunt: level 3 boss, gate clears only after the guardian dies.
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

    // Story completion unlocks Nocturne+, which buffs the Warden and scales score.
    const unlockedPlus = T.setMode('nocturne-plus') === true;
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

    // Relic Hunt: four relics per stage gate the exit.
    T.setMode('relic-hunt');
    T.restart(true);
    const relicStart = state();
    const relicGates = T.world().split('').filter((ch) => ch === 'g').length;
    const relicGateTile = T.gridAt(108, 11);
    T.teleport(108 * 32, 11 * 32);
    step(4);
    const gateBlocked = state();
    T.setTokens(4);
    T.teleport(108 * 32, 11 * 32);
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

    // Daily Crypt completes and records its own best.
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

    // Duke's Gauntlet: the gate waits for the duel to end.
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

    // Difficulty and Nocturne+ scale scoring without changing battle rules.
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
    T.setMode('nocturne-plus');
    T.restart(true);
    const plusScale = (() => {
      const before = Arcade.G.score;
      T.award(100);
      return Arcade.G.score - before;
    })();
    T.setDifficulty('normal');

    // Cosmetics repaint the knight, whip, effects, and backdrop.
    const cosmetics = Meta.getCosmetics('lanternbound').map((item) => ({ id: item.id, slot: item.slot }));
    T.setMode('story');
    T.restart(true);
    const defaultColors = T.colors();
    T.cosmetic('skin', 'lanternbound:knight-crimson');
    const skinColors = T.colors();
    T.cosmetic('palette', 'lanternbound:whip-frost');
    const paletteColors = T.colors();
    T.cosmetic('effect', 'lanternbound:embers');
    T.cosmetic('theme', 'lanternbound:bloodmoon');
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

  assert.equal(gameplay.lockedPlus, true, 'Nocturne+ stays locked before a Story clear');
  assert.equal(gameplay.modeAfterLock, 'story', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedPlus, true, 'completing Story Hunt unlocks Nocturne+');

  assert.equal(gameplay.storyRun.start.stage, 'Stage 1 · Moonlit Courtyard', 'Story Hunt opens in the courtyard');
  assert.equal(gameplay.storyRun.start.need, 0, 'Story Hunt needs no relic tokens');
  assert.equal(gameplay.storyRun.start.lives, 3, 'Story Hunt starts with three lives');
  assert.equal(gameplay.storyRun.start.hp, 6, 'Story Hunt starts at six hearts');
  assert.equal(gameplay.storyRun.start.ammo, 5, 'Story Hunt starts with five axes');
  assert.equal(gameplay.storyRun.start.hasTokens, false, 'Story Hunt does not scatter relic tokens');
  assert.equal(gameplay.storyRun.start.levelName, 'Stage 1 · Moonlit Courtyard', 'the first stage reports its name');
  assert.equal(gameplay.storyRun.start.levelCount, 3, 'Story Hunt runs three stages');
  assert.deepEqual(gameplay.storyRun.bossStart, { hp: 30, hmax: 30, awake: false }, 'the sleeping Hollow Duke has 30 HP');
  assert.equal(gameplay.storyRun.bossAfter.boss, null, 'defeating the duke clears the guardian');
  assert.equal(gameplay.storyRun.bossAfter.gain, 3000, 'the Hollow Duke pays 3000 score');
  assert.equal(gameplay.storyRun.end.state, 'won', 'clearing the final gate wins the run');
  assert.equal(gameplay.storyRun.end.title, 'The Manor Is Silent', 'Story Hunt has its own victory title');
  assert.match(gameplay.storyRun.end.sub, /^Score 3000 · 0 relics · \d+s$/, 'the victory reports score, relics, and time');
  assert.equal(gameplay.storyRun.end.score, 3000, 'the story run scores the boss bounty');
  assert.equal(gameplay.storyRun.stats.storyCompletions, 1, 'a Story clear is recorded');
  assert.equal(gameplay.storyRun.stats.bestScore, 3000, 'the story score is persisted');
  assert.equal(gameplay.storyRun.stats.highestStage, 3, 'the final stage is recorded');
  assert.equal(gameplay.storyRun.stats.lastMode, 'story', 'the last mode is recorded');
  for (const id of ['first-light', 'duke-slayer', 'story-clear', 'personal-best', 'untouched', 'iron-lantern', 'speed-run']) {
    assert.ok(gameplay.storyRun.achievements.includes(id), `${id} unlocks during a clean story run (${gameplay.storyRun.achievements.join(',')})`);
  }
  for (const id of ['relic-keeper', 'daily-player', 'nocturne-clear', 'gauntlet-clear']) {
    assert.ok(!gameplay.storyRun.achievements.includes(id), `${id} still waits for its own mode`);
  }

  assert.deepEqual(gameplay.plusStart, { mode: 'nocturne-plus', level: 0, hp: 6, lives: 3 }, 'Nocturne+ restarts the standard route');
  assert.deepEqual(gameplay.plusSpawn, { k: 'k', hp: 3, hmax: 3 }, 'Nocturne+ scales knight HP by 1.5×');
  assert.equal(gameplay.plusAward, 130, 'Nocturne+ scales score by 1.3×');
  assert.deepEqual(gameplay.plusBoss, { hp: 45, hmax: 45, awake: false }, 'Nocturne+ buffs the Hollow Duke to 45 HP');

  assert.deepEqual(gameplay.relicRun.start, { level: 0, stage: 'Stage 1 · Moonlit Courtyard', need: 4, tokens: 0, gates: 4, gateTile: 'F' }, 'Relic Hunt scatters four relics before the gate');
  assert.deepEqual(gameplay.relicRun.blocked, { level: 0, tokens: 0 }, 'the gate refuses to open without the relics');
  assert.deepEqual(gameplay.relicRun.opened, { score: 500, level: 0 }, 'the fourth relic charges the gate and pays 500');
  assert.deepEqual(gameplay.relicRun.passed, { level: 1, stage: 'Stage 2 · Haunted Library' }, 'the charged gate advances to the library');
  assert.equal(gameplay.relicRun.end.state, 'won', 'clearing the relic route wins the run');
  assert.equal(gameplay.relicRun.end.title, 'The Manor Is Silent', 'Relic Hunt shares the story victory title');
  assert.equal(gameplay.relicRun.end.score, 3500, 'relic gate and boss scoring add up');
  assert.equal(gameplay.relicRun.stats.relicCompletions, 1, 'a Relic Hunt clear is recorded');
  assert.ok(gameplay.relicRun.achievements.includes('relic-keeper'), 'Relic Hunt unlocks Relic Keeper');

  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Crypt wins the run');
  assert.equal(gameplay.dailyRun.title, 'The Manor Is Silent', 'Daily Crypt shares the story victory title');
  assert.equal(gameplay.dailyRun.score, 3000, 'Daily Crypt pays the boss bounty');
  assert.equal(gameplay.dailyRun.best, 3000, 'Daily Crypt stores its best score');
  assert.equal(gameplay.dailyRun.completions, 1, 'Daily Crypt tracks its completion');
  assert.equal(gameplay.dailyRun.achievement, true, 'clearing Daily Crypt unlocks Daily Cryptographer');

  assert.equal(gameplay.rushRun.start.stage, 'Duel 1 · Belfry Ascent', 'Duke’s Gauntlet opens in the belfry');
  assert.equal(gameplay.rushRun.start.need, 0, 'Duke’s Gauntlet never asks for relics');
  assert.deepEqual(gameplay.rushRun.start.boss, { hp: 30, hmax: 30, awake: false }, 'the gauntlet opens with the duke asleep');
  assert.equal(gameplay.rushRun.blocked.level, 0, 'the gate waits while the duke lives');
  assert.deepEqual(gameplay.rushRun.opened, { score: 3500, level: 0 }, 'the duke bounty and gate bonus stack');
  assert.deepEqual(gameplay.rushRun.second, { level: 1, stage: 'Duel 2 · Broken Nave' }, 'the gauntlet advances to the second duel');
  assert.equal(gameplay.rushRun.end.state, 'won', 'clearing all three duels wins the gauntlet');
  assert.equal(gameplay.rushRun.stats.bossRushCompletions, 1, 'a gauntlet clear is recorded');
  assert.ok(gameplay.rushRun.achievements.includes('gauntlet-clear'), 'the gauntlet unlocks its achievement');

  assert.deepEqual(gameplay.awards, { normal: 100, hard: 125, easy: 100, plus: 130 }, 'hard and Nocturne+ scale score without changing base points');

  assert.equal(gameplay.cosmetics.length, 16, 'Lanternbound ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) {
    assert.ok(gameplay.cosmetics.some((item) => item.slot === slot), `Lanternbound has ${slot} cosmetics`);
  }
  for (const id of ['lanternbound:knight-ivory', 'lanternbound:knight-crimson', 'lanternbound:whip-frost', 'lanternbound:embers', 'lanternbound:bloodmoon']) {
    assert.ok(gameplay.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(
    { theme: gameplay.defaultColors.theme, armor: gameplay.defaultColors.armor, whip: gameplay.defaultColors.whip, effect: gameplay.defaultColors.effect },
    { theme: 'courtyard', armor: '#94a3b8', whip: '#fef3c7', effect: '#fbbf24' },
    'the default look is the Ivory Knight in the courtyard',
  );
  assert.equal(gameplay.skinColors.armor, '#b91c1c', 'the Crimson Knight repaints the armour');
  assert.equal(gameplay.paletteColors.whip, '#a5f3fc', 'Frost Whip repaints the chain');
  assert.deepEqual(
    { theme: gameplay.styledColors.theme, effect: gameplay.styledColors.effect },
    { theme: 'bloodmoon', effect: '#fb923c' },
    'theme and effect cosmetics repaint their targets',
  );
  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  console.log('PASS modes, gates, bosses, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    LanternboundTest.setMode('story');
    LanternboundTest.setDifficulty('normal');
    LanternboundTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-13-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/?test=1#/game/castlevania-sotn`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.getByRole('button', { name: 'ENTER THE CRYPT' }).click();
  await theaterPage.waitForFunction(() => typeof window.ActionCombatTest !== 'undefined' && window.ActionCombatTest.state().started === true);
  const theaterMid = await theaterPage.evaluate(() => {
    const test = window.ActionCombatTest;
    const first = test.state();
    test.setZone(2);
    const belfry = test.state();
    test.spawnBoss();
    const spawned = test.state();
    test.killBoss();
    return { first, belfry, spawned, finish: test.state() };
  });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-13-3d-mid.png') });
  assert.equal(theaterMid.first.started, true, 'the theater action engine starts on demand');
  assert.equal(theaterMid.first.phase, 'PLAYING', 'the theater opens in play');
  assert.equal(theaterMid.first.zone, 0, 'the theater starts in the Crypt Halls');
  assert.equal(theaterMid.first.zoneName, 'Crypt Halls', 'the first zone reports its name');
  assert.equal(theaterMid.first.zones, 3, 'the action engine runs three zones');
  assert.equal(theaterMid.first.maxHp, 100, 'the theater hero starts at full HP');
  assert.equal(theaterMid.first.maxAmmo, 4, 'the theater hero carries four axes');
  assert.equal(theaterMid.belfry.zone, 2, 'the third zone is the belfry');
  assert.equal(theaterMid.belfry.zoneName, "Hollow Duke's Belfry", 'the belfry reports its name');
  assert.equal(theaterMid.belfry.bossSpawned, false, 'the duke waits for the arena waves');
  assert.equal(theaterMid.spawned.bossSpawned, true, 'the boss spawns on cue');
  assert.equal(theaterMid.spawned.bossMax, 280, 'the Hollow Duke has 280 HP');
  assert.equal(theaterMid.spawned.bossHp, 280, 'the duke enters at full health');
  assert.equal(theaterMid.finish.phase, 'VICTORY', 'defeating the duke wins the theater run');
  assert.ok(theaterMid.finish.score > 0, 'the theater run reports a score');
  assert.equal(theaterMid.finish.bossHp, null, 'the defeated duke leaves the arena');
  await theaterPage.getByRole('button', { name: 'RUN IT BACK' }).waitFor({ state: 'visible' });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-13-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 13 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
