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
await page.goto(`${origin}/assets/games/49-table-tennis/index.html?test=1`);
await page.waitForFunction(() => typeof TennisTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = TennisTest;
    const save = () => Save.load('table-tennis');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.lockedPro = T.setMode('pro');
    out.modeAfterLock = T.getMode();
    out.initial = T.state();

    /* Classic: 11–0 with a 20-shot rally at the end. */
    T.start();
    out.classicStart = T.restart();
    for (const n of [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 20]) T.award(0, n);
    out.classic = T.state();
    out.classicModal = T.modalOpen();
    out.classicAch = ach().slice();
    T.close();
    out.proUnlock = T.setMode('pro');
    out.proMode = T.getMode();

    /* Blitz: trail 0–5, win 7–5 for the comeback. */
    T.setMode('blitz');
    out.blitzStart = T.state();
    T.start();
    for (let i = 0; i < 5; i++) T.award(1, 2);
    for (let i = 0; i < 7; i++) T.award(0, 2);
    out.blitz = T.state();
    out.blitzModal = T.modalOpen();
    T.close();

    /* Marathon: 21–10. */
    T.setMode('marathon');
    out.marathonStart = T.state();
    T.start();
    for (let i = 0; i < 10; i++) T.award(1, 2);
    for (let i = 0; i < 21; i++) T.award(0, 2);
    out.marathon = T.state();
    T.close();

    /* Pro Tour: 11–9. */
    T.setMode('pro');
    out.proStart = T.state();
    T.start();
    for (let i = 0; i < 9; i++) T.award(1, 2);
    for (let i = 0; i < 11; i++) T.award(0, 2);
    out.pro = T.state();
    T.close();

    /* Two Players: player one wins 11–8. */
    T.setMode('duo');
    out.duoStart = T.state();
    T.start();
    for (let i = 0; i < 8; i++) T.award(1, 2);
    for (let i = 0; i < 11; i++) T.award(0, 2);
    out.duo = T.state();
    out.duoModal = T.modalOpen();
    T.close();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'table-tennis:table-emerald');
    out.skin = T.colors();
    T.cosmetic('palette', 'table-tennis:arena-sunset');
    out.palette = T.colors();
    T.cosmetic('effect', 'table-tennis:trail-cyan');
    out.accent = T.colors();
    T.cosmetic('theme', 'table-tennis:rubber-jade');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'marathon', 'pro', 'duo']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.lockedPro, false, 'Pro Tour stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.equal(data.initial.mode, 'classic');
  assert.equal(data.initial.target, 11);
  assert.equal(data.initial.paused, true, 'the menu pauses a fresh match');
  assert.deepEqual(data.initial.sc, [0, 0]);

  assert.equal(data.classicStart.mode, 'classic');
  assert.equal(data.classicStart.ai, 1);
  assert.deepEqual(data.classic.sc, [11, 0]);
  assert.equal(data.classic.over, true);
  assert.equal(data.classic.state, 'over');
  assert.equal(data.classic.bestRally, 20);
  assert.equal(data.classic.score, 2530, '1320 + 500 rally + 600 win + 110');
  assert.equal(data.classic.recorded, true);
  assert.equal(data.classicModal, true, 'the result dialog opens');
  for (const id of ['first-win', 'perfect-game', 'clean-win', 'rally-10', 'rally-20']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the Classic win');
  }
  assert.equal(data.proUnlock, true, 'a Classic win unlocks Pro Tour');
  assert.equal(data.proMode, 'pro');

  assert.equal(data.blitzStart.mode, 'blitz');
  assert.equal(data.blitzStart.target, 7);
  assert.equal(data.blitzStart.ai, 2);
  assert.deepEqual(data.blitz.sc, [7, 5]);
  assert.equal(data.blitz.over, true);
  assert.equal(data.blitz.score, 1560, '840 + 50 rally + 600 win + 70');
  assert.equal(data.blitzModal, true);

  assert.equal(data.marathonStart.mode, 'marathon');
  assert.equal(data.marathonStart.target, 21);
  assert.deepEqual(data.marathon.sc, [21, 10]);
  assert.equal(data.marathon.score, 3380, '2520 + 50 rally + 600 win + 210');

  assert.equal(data.proStart.mode, 'pro');
  assert.deepEqual(data.pro.sc, [11, 9]);
  assert.equal(data.pro.score, 2080, '1320 + 50 rally + 600 win + 110');

  assert.equal(data.duoStart.mode, 'duo');
  assert.equal(data.duoStart.ai, 3);
  assert.deepEqual(data.duo.sc, [11, 8]);
  assert.equal(data.duo.score, 2080);

  assert.equal(data.stats.bestScore, 3380);
  assert.equal(data.stats.plays, 5);
  assert.equal(data.stats.matches, 5);
  assert.equal(data.stats.wins, 5);
  assert.equal(data.stats.losses, 0);
  assert.equal(data.stats.points, 93);
  assert.equal(data.stats.smashes, 0);
  assert.equal(data.stats.bestRally, 20);
  assert.equal(data.stats.secondsPlayed, 0);
  assert.equal(data.stats.lastResult, 'Victory');
  assert.equal(data.stats.lastMode, 'duo');
  assert.equal(data.stats.classicWins, 1);
  assert.equal(data.stats.blitzWins, 1);
  assert.equal(data.stats.marathonWins, 1);
  assert.equal(data.stats.proWins, 1);
  assert.equal(data.stats.duoWins, 1);
  assert.equal(data.stats.bestScoreClassic, 2530);
  assert.equal(data.stats.bestScoreBlitz, 1560);
  assert.equal(data.stats.bestScoreMarathon, 3380);
  assert.equal(data.stats.bestScorePro, 2080);
  assert.equal(data.stats.bestScoreDuo, 2080);
  for (const id of ['first-win', 'perfect-game', 'clean-win', 'rally-10', 'rally-20', 'blitz-win', 'marathon-win', 'pro-win', 'duo-win', 'comeback', 'five-wins', 'all-modes']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.equal(data.ach.length, 12, 'Table Tennis ships 12 achievements');

  assert.equal(data.defaults.table, 'table-azure', 'the azure table is equipped by default');
  assert.deepEqual(data.defaults.tableTop, ['#173f93', '#215ac2', '#2a6ee0']);
  assert.deepEqual(data.defaults.tableEdge, ['#2c64cf', '#0b2a6b']);
  assert.equal(data.defaults.arena, 'arena-apex');
  assert.deepEqual(data.defaults.sky, ['#02061a', '#091848', '#0c2560']);
  assert.deepEqual(data.defaults.floor, ['#08153a', '#0c2352']);
  assert.equal(data.defaults.trail, 'trail-white');
  assert.equal(data.defaults.trailRgb, '255,255,255');
  assert.equal(data.defaults.rubber, 'rubber-slate');
  assert.deepEqual(data.defaults.rubberColors, ['#4a4f70', '#0a0b12']);
  assert.deepEqual(data.skin.tableTop, ['#0f5132', '#12805a', '#1aa875'], 'emerald repaints the table');
  assert.deepEqual(data.palette.sky, ['#1a0614', '#3a0f26', '#54173a'], 'the sunset arena repaints the hall');
  assert.equal(data.accent.trailRgb, '56,189,248', 'the cyan trail repaints the ball trail');
  assert.deepEqual(data.theme.rubberColors, ['#0f766e', '#042f2e'], 'jade repaints the paddle rubber');
  assert.equal(data.cosmetics.length, 16, 'Table Tennis ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { TennisTest.setMode('classic'); TennisTest.restart(); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  // Play gates the run behind the beginning animation: the live-run chrome only
  // settles once that gate has released.
  await page.waitForFunction(() => window.ApexIntroRunning !== true, null, { timeout: 20000 });
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    help: document.getElementById('bk-help') ? document.getElementById('bk-help').open : null,
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
    paused: TennisTest.state().paused,
  }));
  assert.equal(chrome.help, false, 'the help box stays collapsed after play');
  assert.equal(chrome.shell, false, 'no button bar or help box covers the table');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(chrome.paused, false, 'play unpauses the match');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
