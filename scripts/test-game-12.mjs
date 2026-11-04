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
  await page.goto(`${origin}${basePath}/assets/games/12-chrono-adventure/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof ClockworkDawnTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

async function seededRoute(urlSeed) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate(() => {
    const expected = (() => {
      const d = new Date();
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      let x = key ^ 0x6d2b79f5;
      for (const ch of 'clockwork-dawn') x = Math.imul(x ^ ch.charCodeAt(0), 16777619);
      return (x >>> 0) || 1;
    })();
    ClockworkDawnTest.setMode('daily-dawn');
    ClockworkDawnTest.restart(true);
    const state = ClockworkDawnTest.state();
    return {
      mode: state.mode,
      seed: state.dailySeed,
      expected,
      world: ClockworkDawnTest.world().join('\n'),
      sequence: ClockworkDawnTest.sequence(12),
      party: state.party,
      gold: state.gold,
      inventory: state.inventory,
    };
  });
  await context.close();
  return data;
}

try {
  const routeA = await seededRoute(42);
  const routeB = await seededRoute(77);

  assert.equal(routeA.mode, 'daily-dawn', 'Daily Dawn can be selected');
  assert.equal(routeA.expected, routeA.seed, 'Daily Dawn uses the local-day seed');
  assert.equal(routeA.seed, routeB.seed, 'every session shares today’s seed');
  assert.equal(routeA.world, routeB.world, 'today’s world layout is identical across sessions');
  assert.deepEqual(routeA.sequence, routeB.sequence, 'today’s encounter RNG stream is identical across sessions');
  assert.equal(routeA.gold, 30, 'Daily Dawn starts with the standard purse');
  assert.deepEqual(routeA.inventory, { potion: 3, ether: 1 }, 'Daily Dawn starts with the standard supplies');
  assert.deepEqual(
    routeA.party.map((member) => [member.n, member.hp, member.mhp, member.lvl]),
    [
      ['Kai', 44, 44, 1],
      ['Mira', 34, 34, 1],
    ],
    'Daily Dawn starts the standard level-one party',
  );
  console.log('PASS Daily Dawn is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const state = () => ClockworkDawnTest.state();
    const stats = () => Save.load('clockwork-dawn').stats || {};
    const achievements = () => Save.load('clockwork-dawn').achievements || [];
    const battle = () => (state().battle ? { ...state().battle } : null);
    const tap = (code) => {
      Arcade.test.step(4);
      Arcade.test.tap(code);
    };

    // New Dawn+ stays locked until Story Journey is completed.
    const lockedPlus = ClockworkDawnTest.setMode('new-dawn-plus') === false;
    const modeAfterLock = state().mode;

    // Battle command surface: Attack, Skill, Item, Flee, target selection.
    ClockworkDawnTest.setMode('story');
    ClockworkDawnTest.setDifficulty('normal');
    ClockworkDawnTest.restart(true);
    const defaultColors = ClockworkDawnTest.colors();
    const runStart = state();

    ClockworkDawnTest.startBattle(['moss', 'wisp'], false);
    const battleOpen = battle();
    const beforeAttackHp = battleOpen.foes[0].hp;
    tap('Space');
    const attackPhase = battle().phase;
    tap('Space');
    const afterAttack = battle();
    const attackDamage = beforeAttackHp - afterAttack.foes[0].hp;

    ClockworkDawnTest.closeBattle();
    ClockworkDawnTest.startBattle(['moss'], false);
    const mpBefore = state().party[0].mp;
    tap('ArrowDown');
    tap('Space');
    const skillPhase = battle().phase;
    tap('Space');
    const targetPhase = battle().phase;
    tap('Space');
    const skillResult = battle();
    const skillSpend = mpBefore - state().party[0].mp;

    ClockworkDawnTest.closeBattle();
    ClockworkDawnTest.setPartyHp([10, 34]);
    ClockworkDawnTest.startBattle(['moss'], false);
    tap('ArrowDown');
    tap('ArrowDown');
    tap('Space');
    const itemPhase = battle().phase;
    tap('Space');
    tap('Space');
    const potionResult = { hp: state().party[0].hp, potions: state().inventory.potion };

    ClockworkDawnTest.closeBattle();
    ClockworkDawnTest.healAll();
    ClockworkDawnTest.startBattle(['boss'], true);
    tap('ArrowDown');
    tap('ArrowDown');
    tap('ArrowDown');
    tap('Space');
    const fleeBlocked = battle();

    // Level-ups and the boss encounter pay out score and open the portal.
    ClockworkDawnTest.closeBattle();
    ClockworkDawnTest.startBattle(['knight'], false);
    const knightScoreBefore = state().score;
    ClockworkDawnTest.winBattle();
    const knightWin = { rewards: battle().rewards, party: state().party, gain: state().score - knightScoreBefore };
    ClockworkDawnTest.closeBattle();

    ClockworkDawnTest.startBattle(['boss'], true);
    const bossStart = battle();
    ClockworkDawnTest.winBattle();
    const bossWin = { rewards: battle().rewards, boss: state().boss, portal: state().portal, gold: state().gold };
    ClockworkDawnTest.closeBattle();

    ClockworkDawnTest.setLevel(5);
    ClockworkDawnTest.healAll();
    ClockworkDawnTest.completeRun();
    const storyEnd = state();
    const storySave = Save.load('clockwork-dawn');
    const storyRun = {
      start: { gold: runStart.gold, inventory: runStart.inventory, party: runStart.party.map((member) => [member.n, member.lvl, member.hp]) },
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      state: storyEnd.state,
      score: Arcade.G.score,
      portal: storyEnd.portal,
      stats: stats(),
      achievements: achievements(),
      saveBest: Number(storySave.bestScore) || 0,
    };

    // Story completion unlocks New Dawn+, which inherits the saved level and buffs the Warden.
    const unlockedPlus = ClockworkDawnTest.setMode('new-dawn-plus') === true;
    ClockworkDawnTest.restart(true);
    const plusStart = state();
    ClockworkDawnTest.startBattle(['boss'], true);
    const plusBoss = battle();
    ClockworkDawnTest.closeBattle();

    // Warden Rematch opens with a level-four party, boss only, and a stocked bag.
    ClockworkDawnTest.setMode('warden-rematch');
    ClockworkDawnTest.restart(true);
    const rematchStart = state();
    const rematchBattle = battle();
    ClockworkDawnTest.winBattle();
    const rematchWin = { score: state().score, gold: state().gold, portal: state().portal, title: Arcade.G.title, state: Arcade.G.state };
    ClockworkDawnTest.closeBattle();

    // Difficulty and mutators scale scoring without changing battle rules.
    const award = (setup) => {
      ClockworkDawnTest.setMode('story');
      ClockworkDawnTest.restart(true);
      setup();
      const before = Arcade.G.score;
      ClockworkDawnTest.award(100);
      return Arcade.G.score - before;
    };
    const normalAward = award(() => ClockworkDawnTest.setDifficulty('normal'));
    const hardAward = award(() => ClockworkDawnTest.setDifficulty('hard'));
    ClockworkDawnTest.setDifficulty('normal');
    const goldRush = award(() => Arcade.G.ui.setMutator('gold-rush'));
    ClockworkDawnTest.setMode('story');
    ClockworkDawnTest.restart(true);
    Arcade.G.ui.setMutator('none');

    // Winning Daily Dawn records its own best and achievement.
    ClockworkDawnTest.setMode('daily-dawn');
    ClockworkDawnTest.restart(true);
    const dailyStart = state();
    ClockworkDawnTest.startBattle(['boss'], true);
    ClockworkDawnTest.winBattle();
    ClockworkDawnTest.closeBattle();
    ClockworkDawnTest.completeRun();
    const dailyEnd = state();
    const dailyRun = {
      seed: dailyStart.dailySeed,
      state: dailyEnd.state,
      title: Arcade.G.title,
      score: Arcade.G.score,
      best: Number(stats().dailyBest) || 0,
      achievement: achievements().includes('daily-player'),
    };

    // Cosmetics repaint the fighter, world, effects, and theme.
    const cosmetics = Meta.getCosmetics('clockwork-dawn').map((item) => ({ id: item.id, slot: item.slot }));
    ClockworkDawnTest.setMode('story');
    ClockworkDawnTest.restart(true);
    ClockworkDawnTest.cosmetic('skin', 'clockwork-dawn:kai-rose');
    const skinColors = ClockworkDawnTest.colors();
    ClockworkDawnTest.cosmetic('palette', 'clockwork-dawn:jade-palette');
    const paletteColors = ClockworkDawnTest.colors();
    ClockworkDawnTest.cosmetic('effect', 'clockwork-dawn:sunwheel-gold');
    ClockworkDawnTest.cosmetic('theme', 'clockwork-dawn:moonlit-village');
    const styledColors = ClockworkDawnTest.colors();

    return {
      lockedPlus,
      modeAfterLock,
      unlockedPlus,
      battleOpen: { phase: battleOpen.phase, actor: battleOpen.actor, boss: battleOpen.boss, foes: battleOpen.foes.map((foe) => foe.n) },
      attackPhase,
      attackDamage,
      skillPhase,
      targetPhase,
      skillSpend,
      skillRewards: skillResult.rewards,
      itemPhase,
      potionResult,
      fleeBlocked: { phase: fleeBlocked.phase, log: fleeBlocked.log, boss: fleeBlocked.boss },
      knightWin,
      bossStart: { hp: bossStart.foes[0].mhp, boss: bossStart.boss },
      bossWin,
      storyRun,
      plusStart: plusStart.party.map((member) => ({ n: member.n, lvl: member.lvl, hp: member.hp })),
      plusBoss: { hp: plusBoss.foes[0].mhp },
      plusGold: state().gold,
      rematchStart: {
        party: rematchStart.party.map((member) => ({ n: member.n, lvl: member.lvl, hp: member.hp })),
        inventory: rematchStart.inventory,
        gold: rematchStart.gold,
        battle: rematchBattle ? { boss: rematchBattle.boss, phase: rematchBattle.phase } : null,
      },
      rematchWin,
      awards: { normal: normalAward, hard: hardAward, goldRush },
      dailyRun,
      menuActions: Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((node) => node.getAttribute('data-menu-action')),
      cosmetics,
      defaultColors,
      skinColors,
      paletteColors,
      styledColors,
    };
  });

  assert.equal(gameplay.lockedPlus, true, 'New Dawn+ stays locked before a Story clear');
  assert.equal(gameplay.modeAfterLock, 'story', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.unlockedPlus, true, 'completing Story Journey unlocks New Dawn+');

  assert.equal(gameplay.battleOpen.phase, 'menu', 'battles open on the command menu');
  assert.equal(gameplay.battleOpen.actor, 0, 'Kai leads the party');
  assert.equal(gameplay.battleOpen.boss, false, 'tall-grass encounters are not boss fights');
  assert.deepEqual(gameplay.battleOpen.foes, ['Mossling', 'Gloomwisp'], 'encounter rosters use the requested kinds');
  assert.equal(gameplay.attackPhase, 'target', 'Attack opens target selection');
  assert.ok(gameplay.attackDamage > 0, 'Attack lands damage on the chosen foe');
  assert.equal(gameplay.skillPhase, 'skill', 'Skill opens the skill list');
  assert.equal(gameplay.targetPhase, 'target', 'single-target skills ask for a target');
  assert.equal(gameplay.skillSpend, 3, 'Slash Wave spends 3 MP');
  assert.ok(gameplay.skillRewards && gameplay.skillRewards[0].startsWith('Victory!'), 'Slash Wave can clear a wave and pay rewards');
  assert.equal(gameplay.itemPhase, 'item', 'Item opens the consumables list');
  assert.deepEqual(gameplay.potionResult, { hp: 40, potions: 2 }, 'a Potion restores 30 HP and consumes one');
  assert.equal(gameplay.fleeBlocked.phase, 'menu', 'fleeing the Warden keeps the menu open');
  assert.ok(gameplay.fleeBlocked.log.some((line) => line.includes('Cannot flee')), 'the Warden blocks Flee');

  assert.ok(gameplay.knightWin.rewards.some((line) => line.includes('Kai → Lv 2')), 'a Rustknight win levels Kai');
  assert.equal(gameplay.knightWin.gain, 300, 'a Rustknight pays 30 XP × 10 score');
  assert.equal(gameplay.bossStart.hp, 210, 'the standard Warden has 210 HP');
  assert.equal(gameplay.bossWin.boss, true, 'defeating the standard Warden raises the boss flag');
  assert.equal(gameplay.bossWin.portal, true, 'defeating the Warden opens the dawn portal');
  assert.ok(gameplay.bossWin.rewards.some((line) => line.includes('150 gold')), 'the Warden pays 150 gold');

  assert.equal(gameplay.storyRun.state, 'won', 'stepping through the portal wins the run');
  assert.equal(gameplay.storyRun.title, 'The Dawn Returns', 'Story Journey has its own victory title');
  assert.match(gameplay.storyRun.sub, /^Party level 5 · 204 gold · Score 4420$/, 'the victory reports party level, gold, and score');
  assert.equal(gameplay.storyRun.score, 4420, 'battle XP and the portal bonus add up');
  assert.equal(gameplay.storyRun.stats.storyCompletions, 1, 'a Story clear is recorded');
  assert.equal(gameplay.storyRun.stats.bestScore, 4420, 'the story score is persisted');
  assert.equal(gameplay.storyRun.stats.newDawnLevel, 5, 'the party level is persisted for New Dawn+');
  assert.equal(gameplay.storyRun.stats.newDawnCompletions, 0, 'New Dawn+ clears are tracked separately');
  for (const id of ['first-run', 'steady-hand', 'quick-clear', 'personal-best', 'no-mistakes', 'perfect-round', 'mastery', 'season-ace']) {
    assert.ok(gameplay.storyRun.achievements.includes(id), `${id} unlocks during a clean story run (${gameplay.storyRun.achievements.join(",")})`);
  }
  assert.ok(!gameplay.storyRun.achievements.includes('long-run'), 'Long Run still requires 80 steps');

  assert.deepEqual(
    gameplay.plusStart.map((member) => ({ n: member.n, lvl: member.lvl, hp: member.hp })),
    [
      { n: 'Kai', lvl: 5, hp: 76 },
      { n: 'Mira', lvl: 5, hp: 66 },
    ],
    'New Dawn+ inherits the saved party level',
  );
  assert.equal(gameplay.plusBoss.hp, 305, 'New Dawn+ buffs the Warden to 305 HP');
  assert.equal(gameplay.plusGold, 30, 'New Dawn+ keeps the standard purse');

  assert.deepEqual(
    gameplay.rematchStart.party.map((member) => ({ n: member.n, lvl: member.lvl, hp: member.hp })),
    [
      { n: 'Kai', lvl: 4, hp: 68 },
      { n: 'Mira', lvl: 4, hp: 58 },
    ],
    'Warden Rematch starts a level-four party',
  );
  assert.deepEqual(gameplay.rematchStart.inventory, { potion: 5, ether: 3 }, 'Warden Rematch stocks extra supplies');
  assert.equal(gameplay.rematchStart.gold, 100, 'Warden Rematch starts with 100 gold');
  assert.deepEqual(gameplay.rematchStart.battle, { boss: true, phase: 'menu' }, 'Warden Rematch opens directly into the boss fight');
  assert.equal(gameplay.rematchWin.score, 2000, 'the rematch Warden pays 200 XP × 10 score');
  assert.equal(gameplay.rematchWin.gold, 250, 'the rematch Warden pays 150 gold');
  assert.equal(gameplay.rematchWin.portal, true, 'the rematch also opens the portal');
  assert.equal(gameplay.rematchWin.state, 'playing', 'the rematch reports victory only after the portal');

  assert.deepEqual(gameplay.awards, { normal: 100, hard: 125, goldRush: 125 }, 'hard difficulty and Gold Rush each scale score by 1.25×');

  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Dawn wins the run');
  assert.equal(gameplay.dailyRun.title, 'The Dawn Returns', 'Daily Dawn shares the story victory title');
  assert.equal(gameplay.dailyRun.score, 2000 + 1000 + (30 + 150) * 5, 'Daily Dawn pays boss XP, portal bonus, and gold');
  assert.equal(gameplay.dailyRun.best, gameplay.dailyRun.score, 'Daily Dawn stores its best score');
  assert.equal(gameplay.dailyRun.achievement, true, 'clearing Daily Dawn unlocks Daily Player');

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.equal(gameplay.cosmetics.length, 15, 'Clockwork Dawn ships 15 cosmetics');
  for (const slot of ['palette', 'skin', 'effect', 'theme']) {
    assert.ok(gameplay.cosmetics.some((item) => item.slot === slot), `Clockwork Dawn has ${slot} cosmetics`);
  }
  for (const id of ['clockwork-dawn:amber-palette', 'clockwork-dawn:kai-brass', 'clockwork-dawn:sunwheel-gold', 'clockwork-dawn:moonlit-village']) {
    assert.ok(gameplay.cosmetics.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(
    { scene: gameplay.defaultColors.scene, hero: gameplay.defaultColors.hero, effect: gameplay.defaultColors.effect },
    { scene: 'hearthwick', hero: '#38bdf8', effect: '#67e8f9' },
    'the default look is Hearthwick with Kai in sky blue',
  );
  assert.equal(gameplay.skinColors.hero, '#fb7185', 'the Rose Mantle repaints Kai');
  assert.equal(gameplay.paletteColors.scene, 'jade', 'the Jade palette repaints the world');
  assert.deepEqual({ scene: gameplay.styledColors.scene, effect: gameplay.styledColors.effect }, { scene: 'moonlit', effect: '#fbbf24' }, 'theme and effect cosmetics each repaint their target');
  console.log('PASS modes, battles, boss gates, records, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    ClockworkDawnTest.setMode('story');
    ClockworkDawnTest.setDifficulty('normal');
    ClockworkDawnTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-12-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/#/game/chrono-trigger`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.getByRole('button', { name: 'ENTER THE WILDS' }).click();
  await theaterPage.waitForFunction(() => typeof window.ChronoBattleTest !== 'undefined');
  const theaterMid = await theaterPage.evaluate(() => {
    const test = window.ChronoBattleTest;
    const first = test.state();
    test.winWave();
    const afterFirst = test.state();
    test.select('next');
    test.winWave();
    const afterSecond = test.state();
    test.select('next');
    const boss = test.state();
    return { first, afterFirst, afterSecond, boss };
  });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-12-3d-mid.png') });
  const theaterFinish = await theaterPage.evaluate(() => {
    const test = window.ChronoBattleTest;
    test.winWave();
    return test.state();
  });
  const theaterRun = { ...theaterMid, finish: theaterFinish };
  assert.equal(theaterRun.first.phase, 'MENU', 'the theater opens on the battle menu');
  assert.equal(theaterRun.first.wave, 0, 'the theater starts in the Hearthwilds');
  assert.equal(theaterRun.afterFirst.phase, 'WIN', 'clearing a wave pauses on rewards');
  assert.equal(theaterRun.afterSecond.wave, 1, 'Next Encounter advances to the Gear Gate');
  assert.equal(theaterRun.boss.boss, true, 'the third encounter is the Warden');
  assert.deepEqual(theaterRun.boss.foes.map((foe) => foe.name), ['Clockwork Warden'], 'the boss wave fields the Warden');
  assert.equal(theaterRun.finish.phase, 'VICTORY', 'clearing three waves wins the theater run');
  assert.ok(theaterRun.finish.score > 0, 'the theater run reports a score');
  assert.equal(theaterRun.finish.portal, 1, 'the theater wakes the dawn portal');
  await theaterPage.getByRole('button', { name: 'RUN IT BACK' }).waitFor({ state: 'visible' });
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-12-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 12 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
