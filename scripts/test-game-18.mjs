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
  await page.goto(`${origin}${basePath}/assets/games/18-dead-cells/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof AshenTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

async function seededRoute(urlSeed) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate(() => {
    const expected = (() => {
      const d = new Date();
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      let x = key ^ 0x6d2b79f5;
      for (const ch of 'ashen-descent') x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
      return (x >>> 0) || 1;
    })();
    AshenTest.setMode('daily');
    AshenTest.restart(true);
    const state = AshenTest.state();
    const world = AshenTest.world();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      world,
      chests: world.split('').filter((ch) => ch === 'K').length,
      sequence: AshenTest.sequence(12),
      level: state.level,
      stage: state.stage,
      lives: state.lives,
      hp: state.hp,
      maxhp: state.maxhp,
      weapon: state.weapon,
      levelCount: state.levelCount,
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
  assert.equal(routeA.world, routeB.world, 'today’s biome layout is identical across sessions');
  assert.deepEqual(routeA.sequence, routeB.sequence, 'today’s RNG stream is identical across sessions');
  assert.equal(routeA.stage, "Prisoner's Quarter", 'Daily Descent starts in the prisoner quarters');
  assert.equal(routeA.lives, 1, 'Ashen Descent is a one-life run');
  assert.equal(routeA.hp, 8, 'Daily Descent starts at eight health');
  assert.equal(routeA.maxhp, 8, 'Daily Descent keeps the standard health cap');
  assert.equal(routeA.weapon, 'Rusty Sword', 'every run opens with the rusty sword');
  assert.ok(routeA.chests >= 1, 'every biome scatters at least one weapon chest');
  assert.equal(routeA.level, 0, 'Daily Descent opens on the first biome');
  assert.equal(routeA.levelCount, 3, 'Ashen Descent ships three biomes');
  console.log('PASS Daily Descent is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const T = AshenTest;
    const state = () => T.state();
    const save = () => Save.load('ashen-descent');
    const stats = () => save().stats || {};
    const achievements = () => save().achievements || [];
    const step = (n = 1) => Arcade.test.step(n);
    const firstChest = () => {
      const rows = T.world().split('\n');
      for (let r = 0; r < rows.length; r++) {
        const c = rows[r].indexOf('K');
        if (c >= 0) return [c, r];
      }
      return null;
    };

    // Ashen+ stays locked until the Ashen Run is completed.
    const lockedPlus = T.setMode('plus') === false;
    const modeAfterLock = state().mode;

    // Ashen Run: final Warden pays the boss bounty plus the completion bonus.
    T.setMode('story');
    T.setDifficulty('normal');
    T.restart(true);
    const storyStart = state();
    const storyWorld = T.world();
    const storyRun = { start: { ...storyStart, chests: storyWorld.split('').filter((ch) => ch === 'K').length, levelName: T.levelName(0) } };
    T.goLevel(2);
    const storyBoss = state();
    const bossScoreBefore = state().score;
    T.killBoss();
    const bossAfter = state();
    T.finishLevel();
    step(30);
    const storyEnd = state();
    storyRun.bossStart = storyBoss.boss;
    storyRun.bossAfter = { boss: bossAfter.boss, score: bossAfter.score, gain: bossAfter.score - bossScoreBefore };
    storyRun.end = { state: storyEnd.state, title: Arcade.G.title, sub: Arcade.G.sub, score: Arcade.G.score };
    storyRun.stats = stats();
    storyRun.achievements = achievements();

    // Completing the Ashen Run unlocks Ashen+, which scales foes and score.
    const unlockedPlus = T.setMode('plus') === true;
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
    T.restart(true);
    T.goLevel(2);
    T.killBoss();
    T.finishLevel();
    step(30);
    const plusEnd = state();
    const plusRun = {
      state: plusEnd.state,
      score: plusEnd.score,
      completions: Number(stats().plusCompletions) || 0,
      achievement: achievements().includes('plus-clear'),
    };

    // Chests swap weapons and heal in normal modes.
    T.setMode('story');
    T.setDifficulty('normal');
    T.restart(true);
    const storyChest = firstChest();
    T.clearEnemies();
    T.setHp(5);
    T.teleport(storyChest[0] * 32 + 6, storyChest[1] * 32 + 4);
    step(3);
    const chestStory = state();
    const openedStory = { hp: chestStory.hp, weapon: chestStory.weapon, chests: chestStory.chests };

    // Cursed Run chests still swap weapons but never heal.
    T.setMode('no-heal');
    T.restart(true);
    const cursedChest = firstChest();
    T.clearEnemies();
    T.setHp(5);
    T.teleport(cursedChest[0] * 32 + 6, cursedChest[1] * 32 + 4);
    step(3);
    const chestCursed = state();
    const openedCursed = { hp: chestCursed.hp, weapon: chestCursed.weapon, chests: chestCursed.chests };

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
      mode: dailyStart.mode,
      seed: dailyStart.seed,
      state: dailyEnd.state,
      title: Arcade.G.title,
      score: dailyEnd.score,
      best: Number(stats().dailyBest) || 0,
      completions: Number(stats().dailyCompletions) || 0,
      achievement: achievements().includes('daily-clear'),
    };

    // Cursed Run completion keeps its bonus and achievement.
    T.setMode('no-heal');
    T.restart(true);
    T.goLevel(2);
    T.killBoss();
    T.finishLevel();
    step(30);
    const cursedEnd = state();
    const cursedRun = {
      state: cursedEnd.state,
      score: cursedEnd.score,
      completions: Number(stats().noHealCompletions) || 0,
      achievement: achievements().includes('no-heal-clear'),
    };

    // Warden Gauntlet: the ash gate waits for the duel to end.
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
      start: { stage: rushStart.stage, level: rushStart.level, boss: rushStart.boss },
      blocked: { level: rushBlocked.level },
      opened: { score: rushOpened.score, level: rushOpened.level },
      second: { level: rushSecond.level, stage: rushSecond.stage },
      end: { state: rushEnd.state, title: Arcade.G.title, score: rushEnd.score },
      completions: Number(stats().bossRushCompletions) || 0,
      achievement: achievements().includes('gauntlet-clear'),
    };

    // Death ends the one-life run and still records it.
    const runsBeforeDeath = Number(stats().runs) || 0;
    T.setMode('story');
    T.restart(true);
    T.setHp(1);
    T.hurt(5);
    step(120);
    const deathEnd = state();
    const deathRun = {
      state: deathEnd.state,
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      score: deathEnd.score,
      runsBefore: runsBeforeDeath,
      runsAfter: Number(stats().runs) || 0,
    };

    // Difficulty and Ashen+ scale scoring without changing base points.
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

    // Cosmetics repaint the prisoner, blade, effects, and backdrop.
    const cosmetics = Meta.getCosmetics('ashen-descent').map((item) => ({ id: item.id, slot: item.slot }));
    T.setMode('story');
    T.restart(true);
    const defaultColors = T.colors();
    T.cosmetic('skin', 'ashen-descent:sentinel');
    const skinColors = T.colors();
    T.cosmetic('palette', 'ashen-descent:blade-frost');
    const paletteColors = T.colors();
    T.cosmetic('effect', 'ashen-descent:ash-mint');
    T.cosmetic('theme', 'ashen-descent:theme-sewers');
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
      plusRun,
      openedStory,
      openedCursed,
      dailyRun,
      cursedRun,
      rushRun,
      deathRun,
      awards: { normal: normalAward, hard: hardAward, easy: easyAward, plus: plusScale },
      cosmetics,
      defaultColors,
      skinColors,
      paletteColors,
      styledColors,
      menuActions: Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((node) => node.getAttribute('data-menu-action')),
    };
  });

  assert.equal(gameplay.lockedPlus, true, 'Ashen+ stays locked before an Ashen Run clear');
  assert.equal(gameplay.modeAfterLock, 'story', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedPlus, true, 'completing the Ashen Run unlocks Ashen+');

  assert.equal(gameplay.storyRun.start.stage, "Prisoner's Quarter", 'the Ashen Run opens in the prisoner quarters');
  assert.equal(gameplay.storyRun.start.lives, 1, 'the Ashen Run is a one-life run');
  assert.equal(gameplay.storyRun.start.hp, 8, 'the Ashen Run starts at eight health');
  assert.equal(gameplay.storyRun.start.maxhp, 8, 'the Ashen Run keeps the standard health cap');
  assert.equal(gameplay.storyRun.start.weapon, 'Rusty Sword', 'the Ashen Run opens with the rusty sword');
  assert.ok(gameplay.storyRun.start.chests >= 1, 'the first biome holds a weapon chest');
  assert.equal(gameplay.storyRun.start.levelName, "Prisoner's Quarter", 'the first biome reports its name');
  assert.equal(gameplay.storyRun.start.levelCount, 3, 'the Ashen Run runs three biomes');
  assert.deepEqual(gameplay.storyRun.bossStart, { hp: 36, hmax: 36, awake: false }, 'the sleeping Warden has 36 HP');
  assert.equal(gameplay.storyRun.bossAfter.boss, null, 'defeating the Warden clears the guardian');
  assert.equal(gameplay.storyRun.bossAfter.gain, 3000, 'the Warden pays 3000 score');
  assert.equal(gameplay.storyRun.end.state, 'won', 'clearing the final gate wins the run');
  assert.equal(gameplay.storyRun.end.title, 'The Ashen Gate Opens', 'the Ashen Run has its own victory title');
  assert.match(gameplay.storyRun.end.sub, /^Score 9000 · \d+s · 1 kill$/, 'the victory reports score, time, and kills');
  assert.equal(gameplay.storyRun.end.score, 9000, 'the Ashen Run banks the boss bounty and completion bonus');
  assert.equal(gameplay.storyRun.stats.runs, 1, 'the Ashen Run is recorded as a run');
  assert.equal(gameplay.storyRun.stats.storyCompletions, 1, 'an Ashen Run clear is recorded');
  assert.equal(gameplay.storyRun.stats.bestScore, 9000, 'the run score is persisted');
  assert.equal(gameplay.storyRun.stats.highestStage, 3, 'the final biome is recorded');
  assert.equal(gameplay.storyRun.stats.lastMode, 'story', 'the last mode is recorded');
  assert.equal(gameplay.storyRun.stats.bossesFelled, 1, 'the fallen Warden is counted');
  for (const id of ['first-blood', 'warden-slayer', 'story-clear', 'personal-best', 'untouched', 'iron-heart', 'speed-run']) {
    assert.ok(gameplay.storyRun.achievements.includes(id), `${id} unlocks during a clean Ashen Run (${gameplay.storyRun.achievements.join(',')})`);
  }
  for (const id of ['chest-opener', 'hunter', 'daily-clear', 'no-heal-clear', 'gauntlet-clear', 'plus-clear', 'score-15000']) {
    assert.ok(!gameplay.storyRun.achievements.includes(id), `${id} still waits for its own mode`);
  }

  assert.deepEqual(gameplay.plusStart, { mode: 'plus', level: 0, hp: 8, lives: 1 }, 'Ashen+ restarts the standard route');
  assert.deepEqual(gameplay.plusSpawn, { k: 'k', hp: 3, hmax: 3 }, 'Ashen+ scales crawler HP by 1.5×');
  assert.equal(gameplay.plusAward, 160, 'Ashen+ scales score by 1.6×');
  assert.deepEqual(gameplay.plusBoss, { hp: 54, hmax: 54, awake: false }, 'Ashen+ buffs the Warden to 54 HP');
  assert.deepEqual(gameplay.plusRun, { state: 'won', score: 21600, completions: 1, achievement: true }, 'clearing Ashen+ pays its bonus and records the clear');

  assert.equal(gameplay.openedStory.hp, 7, 'story chests heal two health');
  assert.equal(gameplay.openedStory.chests, 1, 'a story chest is counted');
  assert.notEqual(gameplay.openedStory.weapon, 'Rusty Sword', 'a chest swaps to a different weapon');
  assert.equal(gameplay.openedCursed.hp, 5, 'Cursed Run chests never heal');
  assert.equal(gameplay.openedCursed.chests, 1, 'a cursed chest is counted');
  assert.notEqual(gameplay.openedCursed.weapon, 'Rusty Sword', 'cursed chests still swap weapons');

  assert.equal(gameplay.dailyRun.mode, 'daily', 'Daily Descent records its mode');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Descent wins the run');
  assert.equal(gameplay.dailyRun.title, 'The Ashen Gate Opens', 'Daily Descent shares the story victory title');
  assert.equal(gameplay.dailyRun.score, 8000, 'Daily Descent pays the boss bounty and its own bonus');
  assert.equal(gameplay.dailyRun.best, 8000, 'Daily Descent stores its best score');
  assert.equal(gameplay.dailyRun.completions, 1, 'Daily Descent tracks its completion');
  assert.equal(gameplay.dailyRun.achievement, true, 'clearing Daily Descent unlocks Daily Descent');

  assert.deepEqual(gameplay.cursedRun, { state: 'won', score: 12350, completions: 1, achievement: true }, 'the Cursed Run banks its larger bonus and records the clear');

  assert.equal(gameplay.rushRun.start.stage, 'Duel 1 · Ash Gate', 'Warden Gauntlet opens at the ash gate');
  assert.deepEqual(gameplay.rushRun.start.boss, { hp: 36, hmax: 36, awake: false }, 'the gauntlet opens with the Warden asleep');
  assert.equal(gameplay.rushRun.blocked.level, 0, 'the ash gate waits while the Warden lives');
  assert.deepEqual(gameplay.rushRun.opened, { score: 4900, level: 0 }, 'the Warden bounty and gate bonus stack');
  assert.deepEqual(gameplay.rushRun.second, { level: 1, stage: 'Duel 2 · Sunken Ossuary' }, 'the gauntlet advances to the second duel');
  assert.equal(gameplay.rushRun.end.state, 'won', 'clearing all three duels wins the gauntlet');
  assert.equal(gameplay.rushRun.end.score, 20300, 'two Warden bounties, one gate, and the gauntlet bonus add up');
  assert.equal(gameplay.rushRun.completions, 1, 'a gauntlet clear is recorded');
  assert.equal(gameplay.rushRun.achievement, true, 'the gauntlet unlocks its achievement');

  assert.equal(gameplay.deathRun.state, 'over', 'falling in a one-life run ends the game');
  assert.equal(gameplay.deathRun.title, 'You Died', 'a death reports the Ashen Descent defeat title');
  assert.match(gameplay.deathRun.sub, /^Score 0 · reached Prisoner's Quarter$/, 'the defeat reports the last biome');
  assert.equal(gameplay.deathRun.score, 0, 'a fresh death scores nothing');
  assert.equal(gameplay.deathRun.runsAfter, gameplay.deathRun.runsBefore + 1, 'a death is recorded as a run');

  assert.deepEqual(gameplay.awards, { normal: 100, hard: 125, easy: 100, plus: 160 }, 'hard and Ashen+ scale score without changing base points');

  assert.equal(gameplay.cosmetics.length, 16, 'Ashen Descent ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) {
    assert.ok(gameplay.cosmetics.some((item) => item.slot === slot), `Ashen Descent has ${slot} cosmetics`);
  }
  for (const id of ['ashen-descent:prisoner', 'ashen-descent:gilded', 'ashen-descent:blade-frost', 'ashen-descent:ash-mint', 'ashen-descent:theme-sewers']) {
    assert.ok(gameplay.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(
    { theme: gameplay.defaultColors.theme, skin: gameplay.defaultColors.skin, trim: gameplay.defaultColors.trim, weapon: gameplay.defaultColors.weapon, effect: gameplay.defaultColors.effect },
    { theme: 'auto', skin: '#374151', trim: '#6b7280', weapon: '#e5e7eb', effect: '#fb923c' },
    'the default look is the prisoner with a rusty blade',
  );
  assert.deepEqual({ skin: gameplay.skinColors.skin, trim: gameplay.skinColors.trim }, { skin: '#1d4ed8', trim: '#93c5fd' }, 'the Sentinel skin repaints the prisoner');
  assert.equal(gameplay.paletteColors.weapon, '#a5f3fc', 'Frost Blade repaints the weapon');
  assert.deepEqual({ theme: gameplay.styledColors.theme, effect: gameplay.styledColors.effect }, { theme: 'sewers', effect: '#5eead4' }, 'theme and effect cosmetics repaint their targets');
  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  console.log('PASS modes, gates, bosses, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    AshenTest.setMode('story');
    AshenTest.setDifficulty('normal');
    AshenTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-18-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/?test=1#/game/dead-cells`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.getByRole('button', { name: 'DESCEND' }).click();
  await theaterPage.waitForFunction(() => typeof window.ActionCombatTest !== 'undefined' && window.ActionCombatTest.state().started === true);
  const theaterMid = await theaterPage.evaluate(() => {
    const test = window.ActionCombatTest;
    const first = test.state();
    test.setZone(2);
    const spire = test.state();
    test.spawnBoss();
    const spawned = test.state();
    test.killBoss();
    return { first, spire, spawned, finish: test.state() };
  });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-18-3d-mid.png') });
  assert.equal(theaterMid.first.started, true, 'the theater action engine starts on demand');
  assert.equal(theaterMid.first.phase, 'PLAYING', 'the theater opens in play');
  assert.equal(theaterMid.first.zone, 0, 'the theater starts in the prisoner quarters');
  assert.equal(theaterMid.first.zoneName, "Prisoner's Quarter", 'the first zone reports its name');
  assert.equal(theaterMid.first.zones, 3, 'the action engine runs three zones');
  assert.equal(theaterMid.first.maxHp, 100, 'the theater hero starts at full HP');
  assert.equal(theaterMid.first.maxAmmo, 0, 'the blade hero carries no ammo');
  assert.equal(theaterMid.spire.zone, 2, 'the third zone is the spire');
  assert.equal(theaterMid.spire.zoneName, "The Warden's Spire", 'the spire reports its name');
  assert.equal(theaterMid.spire.bossSpawned, false, 'the Warden waits for the spire waves');
  assert.equal(theaterMid.spawned.bossSpawned, true, 'the boss spawns on cue');
  assert.equal(theaterMid.spawned.bossMax, 320, 'the Warden has 320 HP');
  assert.equal(theaterMid.spawned.bossHp, 320, 'the Warden enters at full health');
  assert.equal(theaterMid.finish.phase, 'VICTORY', 'defeating the Warden wins the theater run');
  assert.ok(theaterMid.finish.score > 0, 'the theater run reports a score');
  assert.equal(theaterMid.finish.bossHp, null, 'the defeated Warden leaves the arena');
  await theaterPage.getByRole('button', { name: 'RUN IT BACK' }).waitFor({ state: 'visible' });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-18-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 18 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
