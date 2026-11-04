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
  await page.goto(`${origin}${basePath}/assets/games/16-celeste/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof SkyfallTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

async function seededRoute(urlSeed) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate(() => {
    const expected = (() => {
      const d = new Date();
      const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      let hash = 2166136261;
      for (const ch of `${dayKey}skyfall-ridge`) {
        hash ^= ch.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    })();
    SkyfallTest.setMode('daily');
    SkyfallTest.restart(true);
    const state = SkyfallTest.state();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      dailyTarget: state.dailyTarget,
      room: state.room,
      roomName: state.roomName,
      rooms: state.rooms,
      totalGems: state.totalGems,
    };
  });
  await context.close();
  return data;
}

try {
  const routeA = await seededRoute(42);
  const routeB = await seededRoute(77);

  assert.equal(routeA.mode, 'daily', 'Daily Ridge can be selected');
  assert.equal(routeA.seed, routeA.expected, 'Daily Ridge uses Meta’s local-day seed');
  assert.equal(routeA.seed, routeB.seed, 'every session shares today’s seed');
  assert.equal(routeA.dailyTarget, 150 + (routeA.seed % 121), 'Daily Ridge derives its time target from the seed');
  assert.ok(routeA.dailyTarget >= 150 && routeA.dailyTarget <= 270, 'the daily target stays within 150–270 seconds');
  assert.equal(routeA.room, 0, 'Daily Ridge opens on the first room');
  assert.equal(routeA.roomName, 'First Steps', 'the first room reports its name');
  assert.equal(routeA.rooms, 10, 'Skyfall Ridge ships ten rooms');
  assert.equal(routeA.totalGems, 9, 'the ridge scatters nine shards');
  console.log('PASS Daily Ridge is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const T = SkyfallTest;
    const state = () => T.state();
    const save = () => Save.load('skyfall-ridge');
    const stats = () => save().stats || {};
    const achievements = () => save().achievements || [];
    const step = (n = 1) => Arcade.test.step(n);
    const summit = () => {
      T.goRoom(9);
      const reached = T.reachSummit();
      step(10);
      return reached;
    };

    // Golden Ridge stays locked until Summit Story is cleared.
    const lockedGolden = T.setMode('golden-ridge') === false;
    const modeAfterLock = state().mode;

    // Summit Story: reach the flag with no falls and no shards.
    T.setMode('story');
    T.setDifficulty('normal');
    T.restart(true);
    const storyStart = state();
    const storyWorld = T.world();
    const storySummit = summit();
    const storyEnd = state();
    const storyRun = {
      start: {
        room: storyStart.room,
        roomName: storyStart.roomName,
        rooms: storyStart.rooms,
        shards: storyStart.shards,
        falls: storyStart.falls,
        totalGems: storyStart.totalGems,
        levelCount: storyStart.levelCount,
        startRoomName: T.levelName(0),
        firstRoomHasFlag: storyWorld.includes('F'),
        bestBefore: storyStart.startBest,
      },
      summitReached: storySummit,
      end: { state: storyEnd.state, title: storyEnd.title, sub: storyEnd.sub, room: storyEnd.room },
      score: Arcade.G.score,
      stats: stats(),
      achievements: achievements(),
    };

    // Clearing the story unlocks Golden Ridge.
    const unlockedGolden = T.setMode('golden-ridge') === true;
    T.restart(true);
    const goldenStart = state();
    summit();
    const goldenPartial = state();
    const goldenPartialScore = Arcade.G.score;
    const goldenPartialSub = Arcade.G.sub;

    // A full shard set with no falls clears Golden Ridge at 1.3×.
    T.restart(true);
    const goldenShards = T.fillShards();
    summit();
    const goldenEnd = state();
    const goldenRun = {
      start: { mode: goldenStart.mode, room: goldenStart.room, shards: goldenStart.shards },
      partial: { state: goldenPartial.state, title: goldenPartial.title, sub: goldenPartialSub, score: goldenPartialScore },
      shards: goldenShards,
      end: { state: goldenEnd.state, title: goldenEnd.title, score: Arcade.G.score },
      stats: stats(),
      achievements: achievements(),
    };

    // Time Trial races the same route for a fixed time bonus.
    T.setMode('time-trial');
    T.restart(true);
    const trialStart = state();
    summit();
    const trialEnd = state();
    const trialRun = {
      start: { mode: trialStart.mode, room: trialStart.room },
      end: { state: trialEnd.state, title: trialEnd.title, score: Arcade.G.score },
      stats: stats(),
      achievements: achievements(),
    };

    // Shard Hunt refuses the summit until every shard is collected.
    T.setMode('shard-hunt');
    T.restart(true);
    summit();
    const huntPartial = state();
    const huntPartialSub = Arcade.G.sub;
    T.restart(true);
    const huntShards = T.fillShards();
    summit();
    const huntEnd = state();
    const huntRun = {
      partial: { state: huntPartial.state, title: huntPartial.title, sub: huntPartialSub },
      shards: huntShards,
      end: { state: huntEnd.state, title: huntEnd.title, score: Arcade.G.score },
      stats: stats(),
      achievements: achievements(),
    };

    // Daily Ridge completes and records its own best time and score.
    T.setMode('daily');
    T.restart(true);
    const dailyStart = state();
    summit();
    const dailyEnd = state();
    const dailyRun = {
      seed: dailyStart.seed,
      dailyTarget: dailyStart.dailyTarget,
      state: dailyEnd.state,
      title: dailyEnd.title,
      score: Arcade.G.score,
      best: Number(stats().dailyBest) || 0,
      completions: Number(stats().dailyCompletions) || 0,
      achievement: achievements().includes('daily-ridge'),
    };

    // Difficulty and the Golden multiplier scale scoring without changing rules.
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
      golden: awardWith('golden-ridge', 'normal'),
    };
    T.setDifficulty('normal');

    // Cosmetics repaint the parka, scarf, shards, and backdrop.
    const cosmetics = Meta.getCosmetics('skyfall-ridge').map((item) => ({ id: item.id, slot: item.slot }));
    T.setMode('story');
    T.restart(true);
    const defaultColors = T.colors();
    T.cosmetic('skin', 'skyfall-ridge:parka-rose');
    const skinColors = T.colors();
    T.cosmetic('palette', 'skyfall-ridge:scarf-ember');
    const paletteColors = T.colors();
    T.cosmetic('effect', 'skyfall-ridge:shard-ice');
    T.cosmetic('theme', 'skyfall-ridge:theme-night');
    const styledColors = T.colors();

    return {
      lockedGolden,
      modeAfterLock,
      unlockedGolden,
      storyRun,
      goldenRun,
      trialRun,
      huntRun,
      dailyRun,
      awards,
      cosmetics,
      defaultColors,
      skinColors,
      paletteColors,
      styledColors,
      menuActions: Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((node) => node.getAttribute('data-menu-action')),
    };
  });

  assert.equal(gameplay.lockedGolden, true, 'Golden Ridge stays locked before a Summit Story clear');
  assert.equal(gameplay.modeAfterLock, 'story', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedGolden, true, 'clearing Summit Story unlocks Golden Ridge');

  assert.equal(gameplay.storyRun.start.room, 0, 'Summit Story opens on the first room');
  assert.equal(gameplay.storyRun.start.roomName, 'First Steps', 'the first room reports its name');
  assert.equal(gameplay.storyRun.start.startRoomName, 'First Steps', 'level names track the authored rooms');
  assert.equal(gameplay.storyRun.start.rooms, 10, 'Summit Story runs all ten rooms');
  assert.equal(gameplay.storyRun.start.levelCount, 10, 'the level list has ten entries');
  assert.equal(gameplay.storyRun.start.shards, 0, 'Summit Story starts with no shards');
  assert.equal(gameplay.storyRun.start.falls, 0, 'Summit Story starts with no falls');
  assert.equal(gameplay.storyRun.start.bestBefore, 0, 'the first run starts from no stored best');
  assert.equal(gameplay.storyRun.start.totalGems, 9, 'the ridge always scatters nine shards');
  assert.equal(gameplay.storyRun.start.firstRoomHasFlag, false, 'the summit flag waits in the final room');
  assert.equal(gameplay.storyRun.summitReached, true, 'the summit flag can be reached');
  assert.equal(gameplay.storyRun.end.state, 'won', 'touching the summit flag wins Summit Story');
  assert.equal(gameplay.storyRun.end.room, 9, 'the win happens in the tenth room');
  assert.equal(gameplay.storyRun.end.title, 'Summit reached!', 'Summit Story has its own victory title');
  assert.match(gameplay.storyRun.end.sub, /^\d{2}:\d{2}\.\d\s+·\s+0 falls\s+·\s+0\/9 shards$/, 'the victory reports time, falls, and shards');
  assert.equal(gameplay.storyRun.score, 6000, 'a clean story run pays the full 6000 bonus');
  assert.equal(gameplay.storyRun.stats.storyCompletions, 1, 'a Summit Story clear is recorded');
  assert.equal(gameplay.storyRun.stats.bestScore, 6000, 'the story score is persisted');
  assert.equal(gameplay.storyRun.stats.highestRoom, 10, 'the final room is recorded');
  assert.equal(gameplay.storyRun.stats.lastMode, 'story', 'the last mode is recorded');
  assert.equal(gameplay.storyRun.stats.bestTimeSec, 0, 'the fastest clear is recorded');
  for (const id of ['summit-story', 'no-falls', 'speed-ascent', 'personal-best']) {
    assert.ok(gameplay.storyRun.achievements.includes(id), `${id} unlocks during a clean story run (${gameplay.storyRun.achievements.join(',')})`);
  }
  for (const id of ['first-shard', 'crystal-chain', 'spring-flight', 'daily-ridge', 'all-shards', 'shard-hunt', 'time-trial-clear', 'golden-clear']) {
    assert.ok(!gameplay.storyRun.achievements.includes(id), `${id} still waits for its own run`);
  }

  assert.deepEqual(gameplay.goldenRun.start, { mode: 'golden-ridge', room: 0, shards: 0 }, 'Golden Ridge restarts the full route');
  assert.equal(gameplay.goldenRun.partial.state, 'over', 'Golden Ridge rejects the summit without every shard');
  assert.equal(gameplay.goldenRun.partial.title, 'Summit reached', 'the incomplete summit reports a loss');
  assert.match(gameplay.goldenRun.partial.sub, /Golden Ridge needs every shard · 0\/9$/, 'the loss names the missing shards');
  assert.equal(gameplay.goldenRun.partial.score, 10400, 'the incomplete summit still pays the 1.3× base');
  assert.equal(gameplay.goldenRun.shards, 9, 'all nine shards can be collected');
  assert.equal(gameplay.goldenRun.end.state, 'won', 'every shard with no falls clears Golden Ridge');
  assert.equal(gameplay.goldenRun.end.title, 'Golden Ridge cleared!', 'Golden Ridge has its own victory title');
  assert.equal(gameplay.goldenRun.end.score, 10400, 'Golden Ridge scales the 8000 bonus by 1.3×');
  assert.equal(gameplay.goldenRun.stats.goldenCompletions, 1, 'a Golden Ridge clear is recorded');
  assert.ok(gameplay.goldenRun.achievements.includes('golden-clear'), 'Golden Ridge unlocks its achievement');
  assert.ok(gameplay.goldenRun.achievements.includes('all-shards'), 'collecting every shard unlocks Shard Keeper');

  assert.deepEqual(gameplay.trialRun.start, { mode: 'time-trial', room: 0 }, 'Time Trial restarts the standard route');
  assert.equal(gameplay.trialRun.end.state, 'won', 'reaching the summit wins Time Trial');
  assert.equal(gameplay.trialRun.end.title, 'Trial complete!', 'Time Trial has its own victory title');
  assert.equal(gameplay.trialRun.end.score, 12000, 'a clean trial pays the full 12000 bonus');
  assert.equal(gameplay.trialRun.stats.timeTrialCompletions, 1, 'a Time Trial clear is recorded');
  assert.ok(gameplay.trialRun.achievements.includes('time-trial-clear'), 'Time Trial unlocks its achievement');

  assert.equal(gameplay.huntRun.partial.state, 'over', 'Shard Hunt rejects the summit without every shard');
  assert.match(gameplay.huntRun.partial.sub, /Shard Hunt needs every shard · 0\/9$/, 'the Shard Hunt loss names the missing shards');
  assert.equal(gameplay.huntRun.shards, 9, 'Shard Hunt can collect the full set');
  assert.equal(gameplay.huntRun.end.state, 'won', 'every shard clears Shard Hunt');
  assert.equal(gameplay.huntRun.end.title, 'Every shard found!', 'Shard Hunt has its own victory title');
  assert.equal(gameplay.huntRun.end.score, 4000, 'a clean Shard Hunt pays the full 4000 bonus');
  assert.equal(gameplay.huntRun.stats.shardCompletions, 1, 'a Shard Hunt clear is recorded');
  assert.ok(gameplay.huntRun.achievements.includes('shard-hunt'), 'Shard Hunt unlocks its achievement');

  assert.equal(gameplay.dailyRun.seed, routeA.seed, 'Daily Ridge keeps today’s seed inside the full game');
  assert.equal(gameplay.dailyRun.dailyTarget, routeA.dailyTarget, 'Daily Ridge keeps the seeded target inside the full game');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing the seeded route wins Daily Ridge');
  assert.equal(gameplay.dailyRun.title, 'Daily summit!', 'Daily Ridge has its own victory title');
  assert.equal(gameplay.dailyRun.score, gameplay.dailyRun.dailyTarget * 25, 'the daily bonus counts the remaining seconds');
  assert.equal(gameplay.dailyRun.best, gameplay.dailyRun.score, 'Daily Ridge stores its best score');
  assert.equal(gameplay.dailyRun.completions, 1, 'Daily Ridge tracks its completion');
  assert.equal(gameplay.dailyRun.achievement, true, 'clearing Daily Ridge unlocks Daily Climber');

  assert.deepEqual(gameplay.awards, { normal: 100, hard: 125, easy: 100, golden: 130 }, 'hard and Golden Ridge scale score without changing base points');

  assert.equal(gameplay.cosmetics.length, 16, 'Skyfall Ridge ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) {
    assert.ok(gameplay.cosmetics.some((item) => item.slot === slot), `Skyfall Ridge has ${slot} cosmetics`);
  }
  for (const id of ['skyfall-ridge:parka-amber', 'skyfall-ridge:parka-rose', 'skyfall-ridge:scarf-ember', 'skyfall-ridge:shard-ice', 'skyfall-ridge:theme-night']) {
    assert.ok(gameplay.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(gameplay.defaultColors, { parka: '#f2b134', scarf: '#38d6ff', shard: '#fde047', theme: 'alpine' }, 'the default look is the amber parka at alpine dawn');
  assert.equal(gameplay.skinColors.parka, '#ec7fa9', 'the Rose Parka repaints the climber');
  assert.equal(gameplay.paletteColors.scarf, '#fb7185', 'the Ember Scarf repaints the scarf');
  assert.deepEqual(
    { shard: gameplay.styledColors.shard, theme: gameplay.styledColors.theme },
    { shard: '#7dd3fc', theme: 'night' },
    'effect and theme cosmetics repaint their targets',
  );
  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  console.log('PASS modes, shard gates, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    SkyfallTest.setMode('story');
    SkyfallTest.setDifficulty('normal');
    SkyfallTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-16-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/?test=1#/game/celeste`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.getByRole('button', { name: 'START STAGE' }).click();
  await theaterPage.waitForFunction(() => window.PrecisionTest && window.PrecisionTest.state().phase === 'PLAYING');
  const first = await theaterPage.evaluate(() => window.PrecisionTest.state());
  await theaterPage.evaluate(() => window.PrecisionTest.reachGoal());
  await theaterPage.waitForFunction(() => window.PrecisionTest.state().stage === 1);
  const second = await theaterPage.evaluate(() => window.PrecisionTest.state());
  await theaterPage.evaluate(() => window.PrecisionTest.setStage(2));
  const summit = await theaterPage.evaluate(() => window.PrecisionTest.state());
  await theaterPage.evaluate(() => window.PrecisionTest.reachGoal());
  await theaterPage.waitForFunction(() => window.PrecisionTest.state().phase === 'VICTORY');
  const finish = await theaterPage.evaluate(() => window.PrecisionTest.state());
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-16-3d-mid.png') });
  assert.equal(first.variant, 'celeste', 'the theater mounts the Celeste platformer');
  assert.equal(first.phase, 'PLAYING', 'the theater starts the stage on demand');
  assert.equal(first.stage, 0, 'the theater starts on the first stage');
  assert.equal(first.stageName, 'Ascent', 'the first stage reports its name');
  assert.equal(first.stages, 3, 'the Celeste theater kit ships three stages');
  assert.equal(first.totalGems, 21, 'the Celeste theater kit scatters seven shards per stage');
  assert.equal(second.stage, 1, 'reaching the flag advances the stage');
  assert.equal(second.stageName, 'Crystal Climb', 'the second stage reports its name');
  assert.equal(second.score, 500, 'each cleared stage pays 500');
  assert.equal(summit.stage, 2, 'the theater can jump to the summit stage');
  assert.equal(summit.stageName, 'The Summit', 'the final stage reports its name');
  assert.equal(finish.phase, 'VICTORY', 'clearing the summit stage wins the theater run');
  assert.equal(finish.score, 1000, 'both cleared stages pay 500 each');
  assert.equal(finish.deaths, 0, 'the scripted ascent never falls');
  await theaterPage.getByRole('button', { name: 'Play Again' }).waitFor({ state: 'visible' });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-16-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 16 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
