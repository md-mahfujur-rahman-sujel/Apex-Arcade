import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
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
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto(`${origin}${basePath}/assets/games/01-flappy-bird/index.html?seed=${seed}`);
  await page.waitForFunction(() => typeof glowmothGame !== 'undefined' && !!glowmothGame.ui);
  return { context, page };
}

const readLayout = (page) =>
  page.evaluate(() =>
    pillars.map((pillar) => ({
      base: Math.round(pillar.base * 100) / 100,
      gap: Math.round(pillar.gap * 100) / 100,
      hue: pillar.hue,
      mote: Boolean(pillar.mote),
    }))
  );

try {
  const first = await openGame(42);
  const layoutA = await readLayout(first.page);
  await first.context.close();

  const second = await openGame(42);
  const layoutB = await readLayout(second.page);
  await second.context.close();

  const third = await openGame(43);
  const layoutC = await readLayout(third.page);
  await third.context.close();

  assert.ok(layoutA.length >= 2, 'seed 42 spawns the opening crystal columns');
  assert.deepEqual(layoutA, layoutB, 'the same seed produces the same opening layout');
  assert.notDeepEqual(layoutA, layoutC, 'a different seed produces a different opening layout');
  assert.ok(layoutA.some((pillar) => pillar.mote), 'the opening layout includes at least one mote');
  console.log('PASS seeded runs are deterministic and include motes');

  const { context, page } = await openGame(7);

  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };

    motes = 0;
    shield = 0;
    collectMote(glowmothGame, 100, 100);
    collectMote(glowmothGame, 100, 100);
    const twoMotes = { motes, shield };
    collectMote(glowmothGame, 100, 100);
    const fullCharge = { motes, shield };

    glowmothGame.score = 10;
    syncChapter(glowmothGame);
    const afterTen = {
      level: Save.load('glowmoth').level,
      banner: chapterBanner,
      events: reports.filter((event) => event.type === 'level_complete').map((event) => event.level),
    };
    syncChapter(glowmothGame);
    const repeated = reports.filter((event) => event.type === 'level_complete').length;

    glowmothGame.score = 40;
    syncChapter(glowmothGame);
    const afterForty = {
      level: Save.load('glowmoth').level,
      banner: chapterBanner,
      events: reports.filter((event) => event.type === 'level_complete').map((event) => event.level),
    };

    return { twoMotes, fullCharge, afterTen, repeated, afterForty };
  });

  assert.deepEqual(gameplay.twoMotes, { motes: 2, shield: 0 }, 'two motes do not charge the shield');
  assert.deepEqual(gameplay.fullCharge, { motes: 0, shield: 1 }, 'three motes charge one Dawn Shield');
  assert.equal(gameplay.afterTen.level, 2, 'reaching score 10 saves chapter 2 progress');
  assert.match(gameplay.afterTen.banner, /CHAPTER 2/, 'reaching score 10 announces chapter 2');
  assert.deepEqual(gameplay.afterTen.events, [2], 'reaching score 10 reports one level completion');
  assert.equal(gameplay.repeated, 1, 're-syncing the same chapter does not duplicate level events');
  assert.equal(gameplay.afterForty.level, 5, 'reaching score 40 unlocks the final chapter');
  assert.deepEqual(gameplay.afterForty.events, [2, 5], 'chapter jumps report the new chapter once');

  const modeGate = await page.evaluate(() => {
    const locked = glowmothGame.ui.setMode('nightfall');
    const lockedMode = glowmothGame.ui.getMode();
    Save.update('glowmoth', { stats: { bestScore: 20 } });
    const unlocked = glowmothGame.ui.setMode('nightfall');
    return {
      locked,
      lockedMode,
      unlocked,
      mode: glowmothGame.ui.getMode(),
      nightMode,
      savedMode: Save.load('glowmoth').settings.mode,
      sky: currentSky(),
    };
  });

  assert.equal(modeGate.locked, false, 'Nightfall stays locked before a best of 20');
  assert.equal(modeGate.lockedMode, 'classic', 'a locked Nightfall selection keeps Classic active');
  assert.equal(modeGate.unlocked, true, 'Nightfall unlocks at a best of 20');
  assert.equal(modeGate.mode, 'nightfall', 'selecting Nightfall updates the active mode');
  assert.equal(modeGate.nightMode, true, 'Nightfall applies the night palette');
  assert.equal(modeGate.savedMode, 'nightfall', 'the selected mode persists to the save file');
  assert.deepEqual(modeGate.sky, ['#07050f', '#1a0a2e', '#3b0d3f', '#7f1d4d'], 'Nightfall uses its own sky');

  const collision = await page.evaluate(() => {
    glowmothGame.restart(true);
    shield = 1;
    invulnT = 0;
    const shieldedPipe = pillars[0];
    bird.x = shieldedPipe.x + PW / 2;
    bird.y = shieldedPipe.center - shieldedPipe.gap / 2 - 20;
    update(glowmothGame);
    const absorbed = { state: glowmothGame.state, shield, invulnerable: invulnT > 0 };

    glowmothGame.restart(true);
    const fatalPipe = pillars[0];
    bird.x = fatalPipe.x + PW / 2;
    bird.y = fatalPipe.center - fatalPipe.gap / 2 - 20;
    update(glowmothGame);
    const fatal = { state: glowmothGame.state };
    return { absorbed, fatal };
  });

  assert.equal(collision.absorbed.state, 'playing', 'the Dawn Shield keeps the run alive');
  assert.equal(collision.absorbed.shield, 0, 'the Dawn Shield is consumed by a collision');
  assert.equal(collision.absorbed.invulnerable, true, 'a shield collision grants brief invulnerability');
  assert.equal(collision.fatal.state, 'over', 'a collision without a shield ends the run');

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
  theaterPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await theaterPage.goto(`${origin}${basePath}/#/game/flappy-bird`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  await theaterPage.waitForTimeout(250);

  const readPlays = () =>
    theaterPage.evaluate(() => Number((JSON.parse(localStorage.getItem('apex_arcade_stats_v2') || '{}').totalPlayCount) || 0));
  const playAgain = theaterPage.getByRole('button', { name: 'Play again' });

  const playsBefore = await readPlays();
  await canvas.click({ position: { x: 320, y: 240 } });
  await playAgain.waitFor({ state: 'visible', timeout: 8000 });
  const playsAfterFirst = await readPlays();
  await playAgain.click();
  await playAgain.waitFor({ state: 'detached' });
  await canvas.click({ position: { x: 320, y: 240 } });
  await playAgain.waitFor({ state: 'visible', timeout: 8000 });
  const playsAfterSecond = await readPlays();
  await theater.close();

  assert.equal(playsAfterFirst, playsBefore + 1, 'the 3D engine records its first run');
  assert.equal(playsAfterSecond, playsAfterFirst + 1, 'Play again reopens the theater session and records the next run');
  console.log('PASS 3D engine restarts record a new theater session');

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS chapters, motes, shields, Nightfall gate, and collisions behave correctly');
  console.log('PASS game 01 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
