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
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} @ ${message.location().url}`);
  });
  await page.goto(`${origin}${basePath}/assets/games/02-pong/index.html?seed=${seed}`);
  await page.waitForFunction(() => typeof ionGame !== 'undefined' && !!ionGame.ui && !!pod);
  return { context, page };
}

const readPod = (page) =>
  page.evaluate(() => ({ x: Math.round(pod.x * 100) / 100, y: Math.round(pod.y * 100) / 100 }));

try {
  const first = await openGame(42);
  const podA = await readPod(first.page);
  await first.context.close();

  const second = await openGame(42);
  const podB = await readPod(second.page);
  await second.context.close();

  const third = await openGame(43);
  const podC = await readPod(third.page);
  await third.context.close();

  assert.deepEqual(podA, podB, 'the same seed spawns the Ion Pod in the same place');
  assert.notDeepEqual(podA, podC, 'a different seed spawns the Ion Pod elsewhere');
  console.log('PASS seeded pod placement is deterministic');

  const { context, page } = await openGame(7);

  const gameplay = await page.evaluate(() => {
    const reports = [];
    const originalReport = window.Apex.report;
    window.Apex.report = (event) => {
      reports.push({ ...event });
      return originalReport.call(window.Apex, event);
    };

    ionGame.restart(true);
    A.test.step(1);
    const hudDuringServe = { hud: ionGame.hudL, serveT, state: ionGame.state };

    ionGame.restart(true);
    ionGame.score = 0;
    overcharge = [0, 0];
    lastHitter = 0;
    mode = 1;
    pod = { x: 400, y: 250, r: 15, active: true };
    podRespawn = 0;
    collectPod(ionGame);
    const podPickup = {
      score: ionGame.score,
      overcharge: overcharge[0],
      active: pod.active,
      height: paddleH(0),
      hud: hudText(),
    };
    overcharge[0] = 2;
    A.test.step(6);
    const expired = { overcharge: overcharge[0], height: paddleH(0) };

    ionGame.restart(true);
    const rush = ionGame.ui.setMode('rally-rush');
    const rushState = { ok: rush, state: ionGame.state, winTarget, active: activeMode };
    const locked = ionGame.ui.setMode('grand-circuit');
    const lockedMode = ionGame.ui.getMode();

    const city = ionGame.ui.setMode('city-circuit');
    const cityState = { ok: city, state: ionGame.state };
    ionGame.begin();
    A.test.tap('Digit2');
    const guard = { mode, active: activeMode };

    const levels = [];
    const bests = [];
    for (let pilot = 0; pilot < 5; pilot++) {
      sc[0] = winTarget - 1;
      pointScored(ionGame, 0);
      levels.push(Save.load('ion-rally').level);
      bests.push(Number((Save.load('ion-rally').stats || {}).cityCircuitBest) || 0);
    }
    const circuitDone = {
      levels,
      bests,
      state: ionGame.state,
      title: ionGame.title,
      level: Save.load('ion-rally').level,
      best: Number((Save.load('ion-rally').stats || {}).cityCircuitBest) || 0,
      achievements: Save.load('ion-rally').achievements || [],
      result: ionGame.ui.config.hooks.getResult(),
    };

    const grandUnlocked = ionGame.ui.setMode('grand-circuit');
    const grandState = { ok: grandUnlocked, state: ionGame.state, active: activeMode, tier: cpuTier, winTarget };
    ionGame.begin();
    sc[0] = winTarget - 1;
    pointScored(ionGame, 0);
    const grandPilot = {
      best: Number((Save.load('ion-rally').stats || {}).grandCircuitBest) || 0,
      level: Save.load('ion-rally').level,
      state: ionGame.state,
    };

    ionGame.restart(true);
    const startY = L.y;
    document.querySelector('.touch .L button:nth-child(2)').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 1 }));
    A.test.step(6);
    const touchY = L.y;
    document.querySelector('.touch .L button:nth-child(2)').dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 1 }));
    const touch = { startY, touchY, left: ionGame.cfg.touchL, right: ionGame.cfg.touchR };

    return {
      hudDuringServe,
      podPickup,
      expired,
      rushState,
      locked,
      lockedMode,
      cityState,
      guard,
      circuitDone,
      grandState,
      grandPilot,
      touch,
      events: reports.filter((event) => event.type === 'level_complete').map((event) => ({ level: event.level, mode: event.mode })),
    };
  });

  assert.match(gameplay.hudDuringServe.hud, /YOU vs CPU/, 'the HUD names the CPU match');
  assert.match(gameplay.hudDuringServe.hud, /first to 7/, 'the HUD shows the match target during the serve countdown');
  assert.equal(gameplay.hudDuringServe.state, 'playing', 'the HUD updates while the serve is pending');

  assert.equal(gameplay.podPickup.score, 75, 'an Ion Pod awards 75 points');
  assert.equal(gameplay.podPickup.overcharge, 480, 'an Ion Pod grants eight seconds of overcharge');
  assert.equal(gameplay.podPickup.active, false, 'a collected pod leaves the court');
  assert.equal(gameplay.podPickup.height, 98, 'overcharge lengthens the paddle');
  assert.match(gameplay.podPickup.hud, /OVERCHARGE 8s/, 'the HUD counts down the overcharge');
  assert.equal(gameplay.expired.overcharge, 0, 'overcharge expires after its timer');
  assert.equal(gameplay.expired.height, 80, 'the paddle returns to its normal length');

  assert.deepEqual(gameplay.rushState, { ok: true, state: 'ready', winTarget: 5, active: 'rally-rush' }, 'switching modes returns to the ready screen');
  assert.equal(gameplay.locked, false, 'Grand Circuit stays locked before City Circuit is cleared');
  assert.equal(gameplay.lockedMode, 'rally-rush', 'a locked Grand Circuit selection keeps the current mode');
  assert.deepEqual(gameplay.cityState, { ok: true, state: 'ready' }, 'City Circuit is selectable');
  assert.deepEqual(gameplay.guard, { mode: 1, active: 'city-circuit' }, 'press 2 cannot clobber a circuit mode');

  assert.deepEqual(gameplay.circuitDone.levels, [2, 3, 4, 5, 5], 'each cleared pilot saves and announces the next level');
  assert.deepEqual(gameplay.circuitDone.bests, [1, 2, 3, 4, 5], 'City Circuit best tracks every pilot cleared');
  assert.equal(gameplay.circuitDone.state, 'won', 'clearing the fifth pilot completes the circuit');
  assert.match(gameplay.circuitDone.title, /City Circuit cleared/, 'the circuit ends on its own victory screen');
  assert.equal(gameplay.circuitDone.best, 5, 'clearing the circuit stores a best of five');
  assert.ok(gameplay.circuitDone.achievements.includes('city-circuit'), 'clearing the circuit unlocks its achievement');
  assert.equal(gameplay.circuitDone.result.stats.cityCircuitBest, 5, 'the result payload reports circuit progress');

  assert.deepEqual(gameplay.grandState, { ok: true, state: 'ready', active: 'grand-circuit', tier: 1, winTarget: 7 }, 'a best of five unlocks the Grand Circuit');
  assert.equal(gameplay.grandPilot.best, 1, 'Grand Circuit progress is tracked separately');
  assert.equal(gameplay.grandPilot.level, 2, 'winning a Grand Circuit pilot reports level 2');
  assert.equal(gameplay.grandPilot.state, 'playing', 'the Grand Circuit continues after a pilot win');

  const levelEvents = gameplay.events.map((event) => event.level);
  assert.deepEqual(levelEvents, [2, 3, 4, 5, 5, 2], 'level completions are reported to the host');

  assert.equal(gameplay.touch.touchY > gameplay.touch.startY, true, 'the touch pad steers the left paddle');
  assert.deepEqual(gameplay.touch.left, [['▲', 'KeyW'], ['▼', 'KeyS']], 'left touch controls map to W/S');
  assert.deepEqual(gameplay.touch.right, [['▲', 'ArrowUp'], ['▼', 'ArrowDown']], 'right touch controls map to the arrow keys');

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
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  theaterPage.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${message.text()} @ ${message.location().url}`);
  });
  await theaterPage.goto(`${origin}${basePath}/#/game/pong`);
  await theaterPage.getByRole('button', { name: 'Play now' }).click();
  await theaterPage.getByRole('button', { name: '3D', exact: true }).click();
  await theaterPage.locator('#playable-theater-modal [data-ui-open]').click();
  const canvas = theaterPage.locator('#playable-theater-modal canvas').first();
  await canvas.waitFor({ state: 'visible' });
  const startCircuit = theaterPage.getByRole('button', { name: 'START CIRCUIT' });
  await startCircuit.waitFor({ state: 'visible' });
  await startCircuit.click();

  const box = await canvas.boundingBox();
  if (box) await theaterPage.mouse.move(box.x + box.width / 2, box.y + box.height - 6);

  const rematch = theaterPage.getByRole('button', { name: 'Rematch' });
  const readPlays = () =>
    theaterPage.evaluate(() => Number((JSON.parse(localStorage.getItem('apex_arcade_stats_v2') || '{}').totalPlayCount) || 0));

  const playsBefore = await readPlays();
  await rematch.waitFor({ state: 'visible', timeout: 90000 });
  const playsAfterFirst = await readPlays();
  await rematch.click();
  await rematch.waitFor({ state: 'detached' });
  if (box) await theaterPage.mouse.move(box.x + box.width / 2, box.y + box.height - 6);
  await rematch.waitFor({ state: 'visible', timeout: 90000 });
  const playsAfterSecond = await readPlays();
  await theater.close();

  assert.equal(playsAfterFirst, playsBefore + 1, 'the 3D engine records its first circuit');
  assert.equal(playsAfterSecond, playsAfterFirst + 1, 'Rematch reopens the theater session and records the next circuit');
  console.log('PASS 3D Rematch reopens the theater session');

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS pods, overcharge, circuit gates, touch mapping, and mode guards behave correctly');
  console.log('PASS game 02 regression suite completed with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
