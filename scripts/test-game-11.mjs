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
  await page.goto(`${origin}${basePath}/assets/games/11-street-fighter/index.html?seed=${seed}&test=1`);
  await page.waitForFunction(() => typeof IronCircuitTest !== 'undefined' && typeof Arcade !== 'undefined' && !!Arcade.G);
  return { context, page };
}

const today = (() => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
})();

async function seededRoute(urlSeed, daily) {
  const { context, page } = await openGame(urlSeed);
  const data = await page.evaluate((useDaily) => {
    const expected = (() => {
      const d = new Date();
      const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}:iron-circuit`;
      let hash = 2166136261;
      for (let i = 0; i < key.length; i++) {
        hash ^= key.charCodeAt(i);
        hash = Math.imul(hash, 16777619);
      }
      return (hash >>> 0) || 1;
    })();
    if (useDaily) IronCircuitTest.setMode('daily');
    else IronCircuitTest.setMode('endless');
    IronCircuitTest.restart(false);
    const state = IronCircuitTest.state();
    return {
      mode: state.mode,
      seed: state.seed,
      expected,
      total: state.rivalTotal,
      names: IronCircuitTest.rosterNames(),
      sequence: IronCircuitTest.sequence(10),
    };
  }, daily);
  await context.close();
  return data;
}

try {
  const seedA = await seededRoute(42, false);
  const seedB = await seededRoute(42, false);
  const seedC = await seededRoute(43, false);

  assert.equal(seedA.seed, 42, 'the endless run reads the requested seed');
  assert.equal(seedA.total, 12, 'Endless Circuit schedules twelve rivals');
  assert.deepEqual(seedA.sequence, seedB.sequence, 'the same seed produces the same RNG stream');
  assert.deepEqual(seedA.names, seedB.names, 'the same seed produces the same endless roster');
  assert.notDeepEqual(seedA.sequence, seedC.sequence, 'a different seed produces a different RNG stream');
  console.log('PASS seeded Iron Circuit rosters are deterministic');

  const dailyA = await seededRoute(42, true);
  const dailyB = await seededRoute(43, true);
  assert.equal(dailyA.mode, 'daily', 'Daily Duel can be selected');
  assert.equal(dailyA.expected, dailyA.seed, 'Daily Duel uses the local-day seed');
  assert.equal(dailyA.total, 6, 'Daily Duel runs six rivals');
  assert.deepEqual(dailyA.names, dailyB.names, 'Daily Duel shares one rival order for the day');
  assert.deepEqual(dailyA.sequence, dailyB.sequence, 'Daily Duel shares one RNG stream for the day');
  console.log('PASS Daily Duel is deterministic across sessions');

  const { context, page } = await openGame(7);
  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };
    const stats = () => Save.load('iron-circuit').stats || {};
    const achievements = () => Save.load('iron-circuit').achievements || [];
    const state = () => IronCircuitTest.state();
    const awardOnce = (mode) => {
      IronCircuitTest.setMode(mode);
      IronCircuitTest.restart(false);
      IronCircuitTest.setDifficulty('normal');
      const before = Arcade.G.score;
      IronCircuitTest.award(100);
      return Arcade.G.score - before;
    };
    const finishRivals = (count) => {
      for (let i = 0; i < count; i++) IronCircuitTest.finishRival();
    };

    const defaultColors = IronCircuitTest.colors();

    // Overdrive stays locked until the player has defeated six rivals.
    const lockedOverdrive = IronCircuitTest.setMode('overdrive') === false;
    const modeAfterLock = state().mode;

    const multCampaign = awardOnce('campaign');
    const multBlitz = awardOnce('blitz');
    const multDaily = awardOnce('daily');
    const multEndless = awardOnce('endless');

    // Clean three-rival campaign: two rounds per rival.
    IronCircuitTest.setMode('campaign');
    IronCircuitTest.setDifficulty('normal');
    IronCircuitTest.restart(true);
    const campaignStart = state();
    const campaignReports = reports.length;
    const beforeFirstRound = Arcade.G.score;
    IronCircuitTest.winRound();
    const firstRoundGain = Arcade.G.score - beforeFirstRound;
    IronCircuitTest.advanceNow();
    for (let i = 0; i < 5; i++) {
      IronCircuitTest.winRound();
      IronCircuitTest.advanceNow();
    }
    const campaignEnd = state();
    const campaignRun = {
      start: { lives: campaignStart.lives, total: campaignStart.rivalTotal, timer: campaignStart.timer },
      end: { state: campaignEnd.state, beaten: campaignEnd.beaten, lives: campaignEnd.lives, rival: campaignEnd.rival },
      roster: IronCircuitTest.rosterNames(),
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      score: Arcade.G.score,
      reports: reports.slice(campaignReports).filter((event) => event.type === 'level_complete').map((event) => ({ level: event.level, mode: event.mode })),
      stats: stats(),
      achievements: achievements(),
      firstRoundGain,
    };

    // The campaign's three rivals are not enough to unlock Overdrive.
    const stillLocked = IronCircuitTest.setMode('overdrive') === false;
    const modeAfterCampaign = state().mode;

    // Endless Circuit: six scaled rivals unlock Overdrive and the finish line.
    IronCircuitTest.setMode('endless');
    IronCircuitTest.setDifficulty('normal');
    IronCircuitTest.restart(true);
    const endlessStart = state();
    const endlessNames = IronCircuitTest.rosterNames();
    finishRivals(6);
    const endlessEnd = state();
    const endlessRun = {
      total: endlessStart.rivalTotal,
      names: endlessNames,
      beaten: endlessEnd.beaten,
      next: endlessEnd.rival,
      achievement: achievements().includes('endless-six'),
      rivalsBeaten: Number(stats().rivalsBeaten) || 0,
      bestRivals: Number(stats().bestRivals) || 0,
    };

    const unlockedOverdrive = IronCircuitTest.setMode('overdrive') === true;
    const multOverdrive = awardOnce('overdrive');

    // Overdrive: one life, six rivals, 1.5x scoring, comeback on the last round.
    IronCircuitTest.setMode('overdrive');
    IronCircuitTest.setDifficulty('normal');
    IronCircuitTest.restart(true);
    const overdriveStart = { lives: state().lives, total: state().rivalTotal, timer: state().timer };
    for (let i = 0; i < 6; i++) {
      if (i === 5) IronCircuitTest.setHp(10);
      IronCircuitTest.winRound();
      IronCircuitTest.advanceNow();
    }
    const overdriveEnd = state();
    const overdriveRun = {
      start: overdriveStart,
      state: overdriveEnd.state,
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      score: Arcade.G.score,
      achievements: achievements(),
    };

    // Daily Duel: seeded six-rival run with its own record.
    IronCircuitTest.setMode('daily');
    IronCircuitTest.setDifficulty('normal');
    IronCircuitTest.restart(true);
    const dailyStart = { seed: state().seed, total: state().rivalTotal };
    const dailyReports = reports.length;
    for (let i = 0; i < 6; i++) {
      IronCircuitTest.winRound();
      IronCircuitTest.advanceNow();
    }
    const dailyEnd = state();
    const dailySave = Save.load('iron-circuit');
    const dailyRun = {
      ...dailyStart,
      state: dailyEnd.state,
      title: Arcade.G.title,
      sub: Arcade.G.sub,
      score: Arcade.G.score,
      reports: reports.slice(dailyReports).filter((event) => event.type === 'level_complete').map((event) => ({ level: event.level, mode: event.mode })),
      dailyBest: Number(stats().dailyBest) || 0,
      saveBest: Number(dailySave.daily && dailySave.daily.best) || 0,
      saveDay: dailySave.daily && dailySave.daily.day,
      achievement: achievements().includes('daily-duel'),
    };

    // Blitz Run: a timeout costs a life, and two losses end the run.
    IronCircuitTest.setMode('blitz');
    IronCircuitTest.setDifficulty('normal');
    IronCircuitTest.restart(true);
    const blitzStart = { lives: state().lives, timer: state().timer, total: state().rivalTotal };
    Arcade.test.step(200);
    IronCircuitTest.setHp(40);
    IronCircuitTest.setTimer(0);
    Arcade.test.step(61);
    IronCircuitTest.advanceNow();
    const blitzLivesAfterLoss = state().lives;
    Arcade.test.step(200);
    IronCircuitTest.setHp(40);
    IronCircuitTest.setTimer(0);
    Arcade.test.step(61);
    IronCircuitTest.advanceNow();
    const blitzEnd = state();
    const blitzRun = {
      start: blitzStart,
      livesAfterLoss: blitzLivesAfterLoss,
      state: blitzEnd.state,
      title: Arcade.G.title,
      sub: Arcade.G.sub,
    };

    // Rift Rush consumes half the meter.
    IronCircuitTest.setMode('campaign');
    IronCircuitTest.setDifficulty('normal');
    IronCircuitTest.restart(true);
    Arcade.test.step(131);
    IronCircuitTest.setMeter(100);
    Arcade.test.press('KeyH');
    Arcade.test.step(2);
    Arcade.test.release('KeyH');
    const rift = { meter: state().meter };
    IronCircuitTest.setParries(5);
    IronCircuitTest.setCombo(5);
    const bonusAchievements = achievements();

    const menuActions = [...document.querySelectorAll('.apex-menu-root [data-menu-action]')].map((element) => element.getAttribute('data-menu-action'));
    const customizeCatalog = Meta.getCosmetics('iron-circuit').map((item) => ({ id: item.id, slot: item.slot }));
    IronCircuitTest.cosmetic('skin', 'iron-circuit:skin-cobalt');
    const skinColors = IronCircuitTest.colors();
    IronCircuitTest.cosmetic('palette', 'iron-circuit:palette-aurora');
    const paletteColors = IronCircuitTest.colors();
    IronCircuitTest.cosmetic('trail', 'iron-circuit:trail-violet');
    IronCircuitTest.cosmetic('theme', 'iron-circuit:theme-neon');
    const styledColors = IronCircuitTest.colors();

    return {
      lockedOverdrive,
      modeAfterLock,
      stillLocked,
      modeAfterCampaign,
      unlockedOverdrive,
      multCampaign,
      multBlitz,
      multDaily,
      multEndless,
      multOverdrive,
      campaignRun,
      endlessRun,
      overdriveRun,
      dailyRun,
      blitzRun,
      rift,
      bonusAchievements,
      menuActions,
      customizeCatalog,
      defaultColors,
      skinColors,
      paletteColors,
      styledColors,
    };
  });

  assert.equal(gameplay.lockedOverdrive, true, 'Overdrive stays locked until six rivals fall');
  assert.equal(gameplay.modeAfterLock, 'campaign', 'a locked mode does not replace the active mode');
  assert.equal(gameplay.stillLocked, true, 'campaign clear alone does not unlock Overdrive');
  assert.equal(gameplay.modeAfterCampaign, 'campaign', 'the locked Overdrive does not steal selection');
  assert.equal(gameplay.unlockedOverdrive, true, 'defeating six rivals unlocks Overdrive');
  assert.equal(gameplay.multCampaign, 100, 'Campaign pays the base score');
  assert.equal(gameplay.multBlitz, 110, 'Blitz Run pays 1.1x');
  assert.equal(gameplay.multDaily, 125, 'Daily Duel pays 1.25x');
  assert.equal(gameplay.multEndless, 110, 'Endless Circuit pays 1.1x');
  assert.equal(gameplay.multOverdrive, 150, 'Overdrive pays 1.5x');

  assert.deepEqual(gameplay.campaignRun.start, { lives: 3, total: 3, timer: 60 }, 'the campaign starts with three lives and a 60 second clock');
  assert.deepEqual(gameplay.campaignRun.roster, ['Brakk', 'Sable', 'Warden Orlo'], 'the campaign opens with the first three rivals');
  assert.deepEqual(gameplay.campaignRun.end, { state: 'won', beaten: 3, lives: 3, rival: 'Warden Orlo' }, 'six round wins finish the campaign');
  assert.equal(gameplay.campaignRun.title, 'Circuit Champion!', 'the campaign has its own victory title');
  assert.match(gameplay.campaignRun.sub, /^All 3 rivals defeated · score 11880$/, 'the campaign reports rivals and final score');
  assert.equal(gameplay.campaignRun.score, 11880, 'round bonuses and rival payouts add up');
  assert.equal(gameplay.campaignRun.firstRoundGain, 1380, 'a full-health round win pays 1380 in Campaign');
  assert.deepEqual(
    gameplay.campaignRun.reports,
    [
      { level: 1, mode: 'campaign' },
      { level: 2, mode: 'campaign' },
      { level: 3, mode: 'campaign' },
    ],
    'each defeated rival reports progress to the host',
  );
  assert.equal(gameplay.campaignRun.stats.runs, 1, 'a finished run is recorded once');
  assert.equal(gameplay.campaignRun.stats.bestScore, 11880, 'the best score is persisted');
  assert.equal(gameplay.campaignRun.stats.totalRivals, 3, 'every defeated rival is recorded');
  assert.equal(gameplay.campaignRun.stats.bestRivals, 3, 'the best rival streak is persisted');
  assert.equal(gameplay.campaignRun.stats.campaignClears, 1, 'a completed campaign is recorded');
  assert.equal(gameplay.campaignRun.stats.rivalsBeaten, 3, 'rival defeats feed the Overdrive gate');
  for (const id of ['first-blood', 'perfect-round', 'circuit-clear']) {
    assert.ok(gameplay.campaignRun.achievements.includes(id), `${id} unlocks during a clean campaign`);
  }

  assert.equal(gameplay.endlessRun.total, 12, 'Endless Circuit schedules twelve rivals');
  assert.deepEqual(gameplay.endlessRun.names.slice(0, 7), ['Brakk', 'Sable', 'Warden Orlo', 'Vex', 'Mira', 'Ash', 'Brakk II'], 'endless rivals scale after one full cycle');
  assert.equal(gameplay.endlessRun.beaten, 6, 'six endless rivals are defeated');
  assert.equal(gameplay.endlessRun.next, 'Brakk II', 'the seventh rival is a scaled rematch');
  assert.equal(gameplay.endlessRun.achievement, true, 'six endless rivals unlock Six Deep');
  assert.equal(gameplay.endlessRun.rivalsBeaten, 9, 'endless defeats accumulate with the campaign');
  assert.equal(gameplay.endlessRun.bestRivals, 6, 'the best rival streak updates');

  assert.deepEqual(gameplay.overdriveRun.start, { lives: 1, total: 6, timer: 45 }, 'Overdrive starts on one life with a 45 second clock');
  assert.equal(gameplay.overdriveRun.state, 'won', 'six rivals finish Overdrive');
  assert.equal(gameplay.overdriveRun.title, 'Overdrive Cleared!', 'Overdrive has its own victory title');
  assert.match(gameplay.overdriveRun.sub, /^One life, 6 rivals · score 21330$/, 'Overdrive reports its single-life run');
  assert.equal(gameplay.overdriveRun.score, 21330, 'Overdrive pays 1.5x on round and rival payouts');
  for (const id of ['comeback', 'overdrive-clear', 'score-20000']) {
    assert.ok(gameplay.overdriveRun.achievements.includes(id), `${id} unlocks in the Overdrive run`);
  }

  assert.equal(gameplay.dailyRun.total, 6, 'Daily Duel runs six rivals');
  assert.equal(gameplay.dailyRun.state, 'won', 'clearing Daily Duel finishes the run');
  assert.equal(gameplay.dailyRun.title, 'Daily Duel Won!', 'the daily run has its own victory title');
  assert.ok(gameplay.dailyRun.sub.includes(String(gameplay.dailyRun.seed)), 'the daily result names its seed');
  assert.equal(gameplay.dailyRun.score, 18750, 'Daily Duel pays 1.25x on every payout');
  assert.deepEqual(gameplay.dailyRun.reports, [
    { level: 1, mode: 'daily' },
    { level: 2, mode: 'daily' },
    { level: 3, mode: 'daily' },
    { level: 4, mode: 'daily' },
    { level: 5, mode: 'daily' },
    { level: 6, mode: 'daily' },
  ], 'daily rival defeats report their mode');
  assert.equal(gameplay.dailyRun.dailyBest, 18750, 'the daily best matches the final score');
  assert.equal(gameplay.dailyRun.saveBest, 18750, 'the day record stores the best score');
  assert.equal(gameplay.dailyRun.saveDay, today, 'the daily record is dated today');
  assert.equal(gameplay.dailyRun.achievement, true, 'winning Daily Duel unlocks Daily Duelist');

  assert.deepEqual(gameplay.blitzRun.start, { lives: 2, timer: 40, total: 6 }, 'Blitz Run starts with two lives and a 40 second clock');
  assert.equal(gameplay.blitzRun.livesAfterLoss, 1, 'a timed-out round costs one life');
  assert.equal(gameplay.blitzRun.state, 'over', 'the second loss ends the Blitz Run');
  assert.equal(gameplay.blitzRun.title, 'Fell to Brakk', 'the defeat names the rival that ended the run');
  assert.match(gameplay.blitzRun.sub, /· BLITZ RUN$/, 'the defeat names Blitz Run');

  assert.equal(gameplay.rift.meter, 50, 'Rift Rush consumes half the meter on input');
  for (const id of ['parry-master', 'combo-5']) {
    assert.ok(gameplay.bonusAchievements.includes(id), `${id} unlocks from run counters`);
  }

  assert.deepEqual(gameplay.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit'], 'the front menu exposes every screen');
  assert.equal(gameplay.customizeCatalog.length, 12, 'Iron Circuit ships 12 cosmetics');
  for (const slot of ['skin', 'palette', 'trail', 'theme']) {
    assert.ok(gameplay.customizeCatalog.some((item) => item.slot === slot), `Iron Circuit has ${slot} cosmetics`);
  }
  for (const id of ['iron-circuit:skin-ember', 'iron-circuit:palette-neon', 'iron-circuit:trail-gold', 'iron-circuit:theme-midnight']) {
    assert.ok(gameplay.customizeCatalog.some((item) => item.id === id), `${id} is registered`);
  }
  assert.deepEqual(
    { cloth: gameplay.skinColors.cloth, trim: gameplay.skinColors.trim },
    { cloth: '#0369a1', trim: '#a5f3fc' },
    'the Cobalt skin repaints the fighter',
  );
  assert.deepEqual(
    { accent: gameplay.paletteColors.accent, accent2: gameplay.paletteColors.accent2, meter: gameplay.paletteColors.meter },
    { accent: '#22d3ee', accent2: '#a78bfa', meter: '#6ee7b7' },
    'the Aurora palette repaints the UI accents',
  );
  assert.deepEqual(
    { trail: gameplay.styledColors.trail, theme: gameplay.styledColors.theme },
    { trail: '#c084fc', theme: 'rgba(34,211,238,.10)' },
    'trail and theme cosmetics each repaint their target',
  );
  assert.deepEqual(
    { accent: gameplay.defaultColors.accent, accent2: gameplay.defaultColors.accent2 },
    { accent: '#f59e0b', accent2: '#fde047' },
    'the default sunset palette keeps the title amber',
  );
  console.log('PASS modes, rounds, records, Rift Rush, cosmetics, and menus behave correctly');

  await page.evaluate(() => {
    IronCircuitTest.setMode('campaign');
    IronCircuitTest.setDifficulty('normal');
    IronCircuitTest.restart(false);
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

  await page.screenshot({ path: path.join(tmpdir(), 'game-11-gameplay.png') });
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
  await theaterPage.goto(`${origin}${basePath}/#/game/street-fighter-ii`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.keyboard.press('Space');
  await theaterPage.getByText('START RUSH').waitFor({ state: 'detached' });
  await theaterPage.waitForTimeout(1700);
  await theaterPage.keyboard.down('ArrowRight');
  await theaterPage.waitForTimeout(500);
  await theaterPage.keyboard.press('KeyF');
  await theaterPage.waitForTimeout(300);
  await theaterPage.keyboard.press('KeyH');
  await theaterPage.waitForTimeout(400);
  await theaterPage.keyboard.up('ArrowRight');
  await theaterPage.screenshot({ path: path.join(tmpdir(), 'game-11-3d.png') });
  await theater.close();

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS game 11 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
