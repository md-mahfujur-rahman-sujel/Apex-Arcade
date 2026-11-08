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
  await page.goto(`${origin}${basePath}/assets/games/17-cuphead/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof StormcapTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

async function seededDuel(urlSeed) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate(() => {
    const expected = (() => {
      const d = new Date();
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let hash = 2166136261;
      for (const ch of `${dayKey}stormcap-showdown`) {
        hash ^= ch.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    })();
    StormcapTest.setMode('daily');
    StormcapTest.restart(true);
    const state = StormcapTest.state();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      dailyTarget: state.dailyTarget,
      rounds: state.rounds,
      bossMax: state.bossMax,
    };
  });
  await context.close();
  return data;
}

try {
  const duelA = await seededDuel(11);
  const duelB = await seededDuel(68);

  assert.equal(duelA.mode, 'daily', 'Daily Squall can be selected');
  assert.equal(duelA.seed, duelA.expected, 'Daily Squall uses Meta’s local-day seed');
  assert.equal(duelA.seed, duelB.seed, 'every session shares today’s seed');
  assert.equal(duelA.dailyTarget, 90 + (duelA.seed % 61), 'Daily Squall derives its time target from the seed');
  assert.ok(duelA.dailyTarget >= 90 && duelA.dailyTarget <= 150, 'the daily target stays within 90–150 seconds');
  assert.equal(duelA.rounds, 1, 'Daily Squall is a single duel');
  assert.equal(duelA.bossMax, 360, 'the seeded duel uses the standard 360 HP storm');
  console.log('PASS Daily Squall is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const T = StormcapTest;
    const state = () => T.state();
    const save = () => Save.load('stormcap-showdown');
    const stats = () => save().stats || {};
    const achievements = () => save().achievements || [];
    const step = (n = 1) => Arcade.test.step(n);
    const clearDuel = () => {
      T.skipIntro();
      T.killBoss();
      step(140);
    };

    // The gauntlet stays locked until the story duel is cleared.
    const lockedGauntlet = T.setMode('gauntlet') === false;
    const modeAfterLock = state().mode;

    // Story duel: a clean first-phase knockout with the super untouched.
    T.setMode('story');
    T.setDifficulty('normal');
    T.restart(true);
    const storyStart = state();
    clearDuel();
    const storyEnd = state();
    const storyRun = {
      start: {
        mode: storyStart.mode,
        bossMax: storyStart.bossMax,
        rounds: storyStart.rounds,
        hp: storyStart.hp,
        startBest: storyStart.startBest,
        timeSec: storyStart.timeSec,
      },
      end: { state: storyEnd.state, title: storyEnd.title, sub: storyEnd.sub, grade: storyEnd.grade },
      score: Arcade.G.score,
      stats: stats(),
      achievements: achievements(),
    };

    // Clearing the story unlocks the three-round gauntlet.
    const unlockedGauntlet = T.setMode('gauntlet') === true;
    T.restart(true);
    const gauntletStart = state();
    clearDuel();
    const roundTwo = state();
    clearDuel();
    const roundThree = state();
    clearDuel();
    const gauntletEnd = state();
    const gauntletRun = {
      start: { rounds: gauntletStart.rounds, bossMax: gauntletStart.bossMax, hp: gauntletStart.hp },
      roundTwo: { round: roundTwo.round, bossMax: roundTwo.bossMax, state: roundTwo.state, hp: roundTwo.hp },
      roundThree: { round: roundThree.round, bossMax: roundThree.bossMax, state: roundThree.state },
      end: { state: gauntletEnd.state, title: gauntletEnd.title, grade: gauntletEnd.grade },
      score: Arcade.G.score,
      stats: stats(),
      achievements: achievements(),
    };

    // No-Hit Duel pays 1.5× for a flawless knockout.
    T.setMode('no-hit');
    T.restart(true);
    clearDuel();
    const noHitEnd = state();
    const noHitRun = {
      end: { state: noHitEnd.state, title: noHitEnd.title, grade: noHitEnd.grade },
      score: Arcade.G.score,
      stats: stats(),
      achievements: achievements(),
    };

    // Parry Rush pays 150 a parry on top of an S-grade finish.
    T.setMode('parry-rush');
    T.restart(true);
    T.skipIntro();
    T.setParries(10);
    T.killBoss();
    step(140);
    const parryEnd = state();
    const parryRun = {
      end: { state: parryEnd.state, title: parryEnd.title, grade: parryEnd.grade },
      parries: parryEnd.parries,
      score: Arcade.G.score,
      stats: stats(),
      achievements: achievements(),
    };

    // Daily Squall pays the leftover time target.
    T.setMode('daily');
    T.restart(true);
    const dailyStart = state();
    clearDuel();
    const dailyEnd = state();
    const dailyRun = {
      seed: dailyStart.seed,
      dailyTarget: dailyStart.dailyTarget,
      end: { state: dailyEnd.state, title: dailyEnd.title, grade: dailyEnd.grade },
      score: Arcade.G.score,
      best: Number(stats().dailyBest) || 0,
      completions: Number(stats().dailyCompletions) || 0,
      achievement: achievements().includes('daily-storm'),
    };

    // Difficulty and mode multipliers scale score without changing base points.
    const awardWith = (mode, difficulty) => {
      T.setMode(mode);
      T.setDifficulty(difficulty);
      T.restart(true);
      const before = Arcade.G.score;
      T.award(100);
      return Arcade.G.score - before;
    };
    const awards = {
      normal: awardWith('story', 'normal'),
      hard: awardWith('story', 'hard'),
      easy: awardWith('story', 'easy'),
      noHit: awardWith('no-hit', 'normal'),
      gauntlet: awardWith('gauntlet', 'normal'),
    };
    T.setDifficulty('normal');

    // Cosmetics repaint the kettle, shots, parry sparks, and backdrop.
    const cosmetics = Meta.getCosmetics('stormcap-showdown').map((item) => ({ id: item.id, slot: item.slot }));
    T.setMode('story');
    T.restart(true);
    const defaultColors = T.colors();
    T.cosmetic('skin', 'stormcap-showdown:kettle-blue');
    const skinColors = T.colors();
    T.cosmetic('palette', 'stormcap-showdown:shot-sky');
    const paletteColors = T.colors();
    T.cosmetic('effect', 'stormcap-showdown:parry-mint');
    T.cosmetic('theme', 'stormcap-showdown:theme-inkwell');
    const inkwellColors = T.colors();
    T.cosmetic('theme', 'stormcap-showdown:theme-storm');
    const styledColors = T.colors();

    return {
      lockedGauntlet,
      modeAfterLock,
      unlockedGauntlet,
      storyRun,
      gauntletRun,
      noHitRun,
      parryRun,
      dailyRun,
      awards,
      cosmetics,
      defaultColors,
      skinColors,
      paletteColors,
      inkwellColors,
      styledColors,
      menuActions: Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((node) => node.getAttribute('data-menu-action')),
    };
  });

  assert.equal(gameplay.lockedGauntlet, true, 'Thunder Gauntlet stays locked before a story clear');
  assert.equal(gameplay.modeAfterLock, 'story', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedGauntlet, true, 'clearing the story unlocks Thunder Gauntlet');

  assert.equal(gameplay.storyRun.start.mode, 'story', 'Stormcap Showdown opens in story mode');
  assert.equal(gameplay.storyRun.start.bossMax, 360, 'Mama Thundercloud enters the story duel at 360 HP');
  assert.equal(gameplay.storyRun.start.rounds, 1, 'the story duel is a single round');
  assert.equal(gameplay.storyRun.start.hp, 3, 'the duel starts with three hearts');
  assert.equal(gameplay.storyRun.start.startBest, 0, 'the first run starts from no stored best');
  assert.equal(gameplay.storyRun.end.state, 'won', 'knocking out Mama Thundercloud wins the story duel');
  assert.equal(gameplay.storyRun.end.title, 'STORM CLEARED!', 'the story duel has its own victory title');
  assert.equal(gameplay.storyRun.end.grade, 'S', 'a flawless knockout earns an S grade');
  assert.equal(gameplay.storyRun.end.sub, 'SHOWDOWN · Grade S · 0:00 · Hits 0 · Parries 0', 'the victory card reports grade, time, hits, and parries');
  assert.equal(gameplay.storyRun.score, 8900, 'a clean story knockout pays the 6000 storm bonus');
  assert.equal(gameplay.storyRun.stats.storyCompletions, 1, 'a story clear is recorded');
  assert.equal(gameplay.storyRun.stats.bestScore, 8900, 'the story score is persisted');
  assert.equal(gameplay.storyRun.stats.runs, 1, 'the run counter increments');
  assert.equal(gameplay.storyRun.stats.highestRound, 1, 'the highest round is recorded');
  assert.equal(gameplay.storyRun.stats.lastMode, 'story', 'the last mode is recorded');
  assert.equal(gameplay.storyRun.stats.bestGrade, 'S', 'the best grade is recorded');
  assert.equal(gameplay.storyRun.stats.bestTimeSec, 0, 'the fastest clear is recorded');
  for (const id of ['phase-three', 'storm-clear', 'grade-s', 'perfect-storm', 'speed-duel', 'untouchable', 'personal-best']) {
    assert.ok(gameplay.storyRun.achievements.includes(id), `${id} unlocks during a clean story run (${gameplay.storyRun.achievements.join(',')})`);
  }
  for (const id of ['first-parry', 'super-star', 'no-hit', 'parry-clear', 'daily-storm', 'gauntlet-clear', 'parry-master']) {
    assert.ok(!gameplay.storyRun.achievements.includes(id), `${id} still waits for its own run`);
  }

  assert.deepEqual(gameplay.gauntletRun.start, { rounds: 3, bossMax: 300, hp: 3 }, 'the gauntlet opens on a three-round storm');
  assert.deepEqual(gameplay.gauntletRun.roundTwo, { round: 2, bossMax: 360, state: 'playing', hp: 3 }, 'the second storm adds 60 HP and heals a heart');
  assert.deepEqual(gameplay.gauntletRun.roundThree, { round: 3, bossMax: 420, state: 'playing' }, 'the third storm adds another 60 HP');
  assert.equal(gameplay.gauntletRun.end.state, 'won', 'clearing all three storms wins the gauntlet');
  assert.equal(gameplay.gauntletRun.end.title, 'GAUNTLET CLEARED!', 'the gauntlet has its own victory title');
  assert.equal(gameplay.gauntletRun.end.grade, 'S', 'a clean gauntlet earns an S grade');
  assert.equal(gameplay.gauntletRun.score, 17360, 'the gauntlet scales the 12400 payout by 1.4×');
  assert.equal(gameplay.gauntletRun.stats.gauntletCompletions, 1, 'a gauntlet clear is recorded');
  assert.equal(gameplay.gauntletRun.stats.highestRound, 3, 'the gauntlet records all three rounds');
  assert.ok(gameplay.gauntletRun.achievements.includes('gauntlet-clear'), 'the gauntlet unlocks its achievement');

  assert.equal(gameplay.noHitRun.end.state, 'won', 'a flawless knockout wins No-Hit Duel');
  assert.equal(gameplay.noHitRun.end.title, 'PERFECT STORM!', 'No-Hit Duel has its own victory title');
  assert.equal(gameplay.noHitRun.score, 16350, 'No-Hit Duel scales the 10900 payout by 1.5×');
  assert.equal(gameplay.noHitRun.stats.noHitCompletions, 1, 'a No-Hit clear is recorded');
  assert.ok(gameplay.noHitRun.achievements.includes('no-hit'), 'No-Hit Duel unlocks its achievement');

  assert.equal(gameplay.parryRun.end.state, 'won', 'ten parries plus a knockout win Parry Rush');
  assert.equal(gameplay.parryRun.end.title, 'PARRY MASTER!', 'Parry Rush has its own victory title');
  assert.equal(gameplay.parryRun.parries, 10, 'the parry counter tracks ten parries');
  assert.equal(gameplay.parryRun.score, 6000, 'Parry Rush pays 150 a parry and scales the total by 1.2×');
  assert.equal(gameplay.parryRun.stats.parryCompletions, 1, 'a Parry Rush clear is recorded');
  assert.ok(gameplay.parryRun.achievements.includes('parry-clear'), 'Parry Rush unlocks its clear achievement');
  assert.ok(gameplay.parryRun.achievements.includes('parry-master'), 'ten parries unlock Parry Master');

  assert.equal(gameplay.dailyRun.seed, duelA.seed, 'Daily Squall keeps today’s seed inside the full game');
  assert.equal(gameplay.dailyRun.dailyTarget, duelA.dailyTarget, 'Daily Squall keeps the seeded target inside the full game');
  assert.equal(gameplay.dailyRun.end.state, 'won', 'clearing the seeded storm wins Daily Squall');
  assert.equal(gameplay.dailyRun.end.title, 'DAILY SQUALL CLEARED!', 'Daily Squall has its own victory title');
  assert.equal(gameplay.dailyRun.score, 2900 + gameplay.dailyRun.dailyTarget * 30, 'the daily bonus counts the remaining seconds');
  assert.equal(gameplay.dailyRun.best, gameplay.dailyRun.score, 'Daily Squall stores its best score');
  assert.equal(gameplay.dailyRun.completions, 1, 'Daily Squall tracks its completion');
  assert.equal(gameplay.dailyRun.achievement, true, 'clearing Daily Squall unlocks Daily Forecaster');

  assert.deepEqual(gameplay.awards, { normal: 100, hard: 125, easy: 100, noHit: 150, gauntlet: 140 }, 'difficulty and mode multipliers scale score without changing base points');

  assert.equal(gameplay.cosmetics.length, 16, 'Stormcap Showdown ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) {
    assert.ok(gameplay.cosmetics.some((item) => item.slot === slot), `Stormcap Showdown has ${slot} cosmetics`);
  }
  for (const id of ['stormcap-showdown:kettle-crimson', 'stormcap-showdown:kettle-blue', 'stormcap-showdown:shot-gold', 'stormcap-showdown:parry-mint', 'stormcap-showdown:theme-inkwell', 'stormcap-showdown:theme-storm']) {
    assert.ok(gameplay.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(gameplay.defaultColors, { skin: '#ef4444', shot: '#ffffff', parry: '#f9a8d4', theme: 'inkwell' }, 'the default look is the crimson kettle at Inkwell dawn');
  assert.equal(gameplay.skinColors.skin, '#3b82f6', 'the Blue Kettle repaints the hero');
  assert.equal(gameplay.paletteColors.shot, '#7dd3fc', 'Sky Shots repaint the bullets');
  assert.deepEqual(
    { parry: gameplay.inkwellColors.parry, theme: gameplay.inkwellColors.theme },
    { parry: '#6ee7b7', theme: 'inkwell' },
    'parry sparks and the Inkwell theme apply independently',
  );
  assert.equal(gameplay.styledColors.theme, 'storm', 'Storm Front repaints the backdrop');
  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  console.log('PASS modes, gauntlet rounds, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    StormcapTest.setMode('story');
    StormcapTest.setDifficulty('normal');
    StormcapTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-17-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/?test=1#/game/cuphead`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.getByRole('button', { name: 'TAKE THE STAGE' }).click();
  await theaterPage.waitForFunction(() => typeof window.ActionCombatTest !== 'undefined' && window.ActionCombatTest.state().started === true);
  const theaterMid = await theaterPage.evaluate(() => {
    const test = window.ActionCombatTest;
    const first = test.state();
    test.setZone(2);
    const arena = test.state();
    test.spawnBoss();
    const spawned = test.state();
    test.killBoss();
    return { first, arena, spawned, finish: test.state() };
  });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-17-3d-mid.png') });
  assert.equal(theaterMid.first.started, true, 'the theater action engine starts on demand');
  assert.equal(theaterMid.first.phase, 'PLAYING', 'the theater opens in play');
  assert.equal(theaterMid.first.zone, 0, 'the theater starts on Inkwell Shore');
  assert.equal(theaterMid.first.zoneName, 'Inkwell Shore', 'the first zone reports its name');
  assert.equal(theaterMid.first.zones, 3, 'the action engine runs three zones');
  assert.equal(theaterMid.first.maxHp, 100, 'the theater hero starts at full HP');
  assert.equal(theaterMid.first.maxAmmo, 0, 'the pea shooter hero carries no ammo');
  assert.equal(theaterMid.arena.zone, 2, 'the third zone is the arena');
  assert.equal(theaterMid.arena.zoneName, 'Thunderhead Arena', 'the arena reports its name');
  assert.equal(theaterMid.arena.bossSpawned, false, 'Mama Thundercloud waits for the arena waves');
  assert.equal(theaterMid.spawned.bossSpawned, true, 'the boss spawns on cue');
  assert.equal(theaterMid.spawned.bossMax, 360, 'Mama Thundercloud has 360 HP');
  assert.equal(theaterMid.spawned.bossHp, 360, 'Mama Thundercloud enters at full health');
  assert.equal(theaterMid.finish.phase, 'VICTORY', 'defeating Mama Thundercloud wins the theater run');
  assert.ok(theaterMid.finish.score > 0, 'the theater run reports a score');
  assert.equal(theaterMid.finish.bossHp, null, 'the defeated storm leaves the arena');
  // The host result card is the theater's single end screen; the engine's own
  // victory panel stays behind it and out of the accessibility tree.
  await theaterPage.locator('[data-game-result]').waitFor({ state: 'visible' });
  await theaterPage.getByRole('button', { name: 'Play again' }).waitFor({ state: 'visible' });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-17-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 17 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
