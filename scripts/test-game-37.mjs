import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}${(server.config.base || '/').replace(/\/$/, '')}`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch {} }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1200, height: 950 } });
await context.addInitScript(() => { try { localStorage.clear(); } catch {} });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.location().url.includes('favicon')) errors.push(m.text() + ' @ ' + m.location().url); });
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(r.status() + ' ' + r.url()); });
await page.goto(`${origin}/assets/games/37-pool/index.html?test=1`);
await page.waitForFunction(() => typeof PoolTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = PoolTest;
    const save = () => Save.load('pool');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('master');
    out.modeAfterLock = T.getMode();

    /* Classic: break with a pot, clear the solids, sink the 8. */
    T.setMode('classic');
    T.restart(true);
    out.start = T.state();
    out.first = T.resolveShot({ first: 1, potted: [1] });
    for (const n of [2, 3, 4, 5, 6, 7]) T.resolveShot({ first: n, potted: [n] });
    out.beforeEight = T.state();
    out.classic = T.resolveShot({ first: 8, potted: [8] });
    out.classicScore = out.classic.score;
    out.classicBest = stats().bestScore;
    out.classicWins = stats().classicWins;
    out.classicAch = ach().slice();
    out.classicModal = T.modalOpen();

    /* Blitz: the shot clock hands over ball in hand, then a clean rack wins. */
    T.setMode('blitz');
    T.restart(true);
    T.setShotClock(3);
    out.blitzTimeout = T.tick(3);
    T.restart(true);
    T.resolveShot({ first: 1, potted: [1] });
    for (const n of [2, 3, 4, 5, 6, 7]) T.resolveShot({ first: n, potted: [n] });
    out.blitz = T.resolveShot({ first: 8, potted: [8] });
    out.blitzBest = stats().bestScore;
    out.blitzWins = stats().blitzWins;

    /* Solo Run: clear all fifteen balls alone. */
    T.setMode('solo');
    T.restart(true);
    out.soloStart = T.state();
    for (const n of [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15]) T.resolveShot({ first: n, potted: [n] });
    out.soloBeforeEight = T.state();
    out.solo = T.resolveShot({ first: 8, potted: [8] });
    out.soloScore = out.solo.score;
    out.soloBest = stats().bestScore;
    out.soloStrokes = stats().bestSoloStrokes;

    /* Bank Shot: rail-first pots pay triple. */
    T.setMode('bank');
    T.restart(true);
    out.bankFirst = T.resolveShot({ first: 1, potted: [1], banked: [true] });
    for (const n of [2, 3, 4, 5, 6, 7]) T.resolveShot({ first: n, potted: [n], banked: [true] });
    out.bank = T.resolveShot({ first: 8, potted: [8] });
    out.bankScore = out.bank.score;
    out.bankBest = stats().bestScore;
    out.bankWins = stats().bankWins;

    /* Grandmaster unlocks after the Classic clear. */
    out.masterUnlock = T.setMode('master');
    out.masterGuide = T.state().guide;
    T.restart(true);
    T.resolveShot({ first: 1, potted: [1] });
    for (const n of [2, 3, 4, 5, 6, 7]) T.resolveShot({ first: n, potted: [n] });
    out.master = T.resolveShot({ first: 8, potted: [8] });
    out.masterScore = out.master.score;
    out.masterBest = stats().bestScore;
    out.masterWins = stats().masterWins;

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'pool:cue-maple');
    out.skin = T.colors();
    T.cosmetic('palette', 'pool:cloth-plum');
    out.palette = T.colors();
    T.cosmetic('effect', 'pool:aim-lime');
    out.accent = T.colors();
    T.cosmetic('theme', 'pool:room-hall');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'solo', 'bank', 'master']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.locked, false, 'Grandmaster stays locked before a Classic clear');
  assert.equal(data.modeAfterLock, 'classic');

  assert.equal(data.start.mode, 'classic');
  assert.equal(data.start.state, 'playing');
  assert.equal(data.start.left, 15, 'a full rack of fifteen object balls');
  assert.equal(data.start.guide, true, 'Classic shows the aim guide');
  assert.equal(data.first.score, 50, 'a first pot scores 50');
  assert.equal(data.first.fouls, 0);
  assert.equal(data.beforeEight.left, 8, 'seven solids down: seven stripes plus the 8 remain');
  assert.equal(data.classic.state, 'won');
  assert.equal(data.classicScore, 850, '7 x 50 + 500 win bonus');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  assert.equal(data.classicBest, 850);
  assert.equal(data.classicWins, 1);
  for (const id of ['first-pot', 'break-pot', 'three-in-a-row', 'table-runner', 'house-champion', 'spotless', 'pool-shark']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the Classic rack');
  }

  assert.equal(data.blitzTimeout.turn, 1, 'a shot-clock lapse hands the turn to the computer');
  assert.equal(data.blitzTimeout.phase, 'cpu');
  assert.equal(data.blitzTimeout.fouls, 1, 'the lapse counts as a foul');
  assert.match(data.blitzTimeout.msg, /Shot clock/);
  assert.equal(data.blitz.state, 'won');
  assert.equal(data.blitz.score, 1066, '(7 x 63) + 625 at 1.25x');
  assert.equal(data.blitzBest, 1066);
  assert.equal(data.blitzWins, 1);
  assert.ok(data.ach.includes('beat-the-clock'), 'Beat the Clock unlocked');

  assert.equal(data.soloStart.mode, 'solo');
  assert.equal(data.soloStart.left, 15);
  assert.equal(data.soloBeforeEight.left, 1);
  assert.equal(data.solo.state, 'won');
  assert.equal(data.soloScore, 2415, '15 x 46 + 1,725 clear bonus at 1.15x');
  assert.equal(data.soloBest, 2415);
  assert.equal(data.soloStrokes, 15, 'the solo rack records its stroke count');
  assert.ok(data.ach.includes('full-rack'), 'Full Rack unlocked');

  assert.equal(data.bankFirst.score, 195, 'a banked pot pays 150 x 1.3');
  assert.equal(data.bankFirst.banks, 1);
  assert.equal(data.bank.state, 'won');
  assert.equal(data.bankScore, 2015, '(7 x 195) + 650 at 1.3x');
  assert.equal(data.bankBest, 2415, 'the Solo run still holds the page best');
  assert.equal(data.bankWins, 1);
  assert.ok(data.ach.includes('off-the-rail'), 'Off the Rail unlocked');

  assert.equal(data.masterUnlock, true, 'a Classic clear unlocks Grandmaster');
  assert.equal(data.masterGuide, false, 'Grandmaster hides the aim guide');
  assert.equal(data.master.state, 'won');
  assert.equal(data.masterScore, 1360, '(7 x 80) + 800 at 1.6x');
  assert.equal(data.masterBest, 2415, 'Solo Run keeps the page best');
  assert.equal(data.masterWins, 1);
  assert.ok(data.ach.includes('grandmaster'), 'Grandmaster unlocked');

  assert.equal(data.stats.plays, 5);
  assert.equal(data.stats.runs, 5);
  assert.equal(data.stats.rackWins, 5);
  assert.equal(data.stats.rackLosses, 0);
  assert.equal(data.stats.classicWins, 1);
  assert.equal(data.stats.potted, 43);
  assert.equal(data.stats.banks, 7);
  assert.equal(data.stats.fouls, 0, 'the abandoned clock-lapse rack is never recorded');
  assert.equal(data.stats.shots, 47);
  assert.equal(data.stats.bestBreak, 15, 'the solo rack runs the whole table in one visit');
  assert.equal(data.stats.bestSoloStrokes, 15);
  assert.equal(data.stats.bestScore, 2415);
  for (const id of ['first-pot', 'break-pot', 'three-in-a-row', 'table-runner', 'off-the-rail', 'house-champion', 'beat-the-clock', 'full-rack', 'bank-manager', 'grandmaster', 'spotless', 'pool-shark']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }

  assert.equal(data.defaults.cue.butt, '#14181f', 'the ebony cue is equipped by default');
  assert.equal(data.defaults.cloth, 'cloth-emerald');
  assert.equal(data.defaults.aim, '#67e8f9');
  assert.equal(data.defaults.theme, 'room-night');
  assert.equal(data.skin.cue.butt, '#b5651d', 'the maple cue recolours the butt');
  assert.equal(data.palette.cloth, 'cloth-plum', 'the plum cloth repaints the felt');
  assert.equal(data.accent.aim, '#a3e635', 'lime sight repaints the guide');
  assert.equal(data.theme.theme, 'room-hall', 'the hall room repaints the rails');
  assert.equal(data.cosmetics.length, 16, '8-Ball Pool ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { PoolTest.setMode('classic'); PoolTest.restart(false); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the table');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
