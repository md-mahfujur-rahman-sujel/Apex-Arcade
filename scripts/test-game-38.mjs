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
await page.goto(`${origin}/assets/games/38-bowling/index.html?test=1`);
await page.waitForFunction(() => typeof BowlingTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = BowlingTest;
    const save = () => Save.load('bowling');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('master');
    out.modeAfterLock = T.getMode();

    /* League Night: twelve strikes is the textbook 300. */
    T.setMode('classic');
    T.restart(true);
    out.start = T.state();
    T.roll(10);
    out.firstStrike = T.state();
    for (let i = 1; i < 12; i++) T.roll(10);
    out.classic = T.state();
    out.classicBest = stats().bestScore;
    out.classicAch = ach().slice();
    out.classicModal = T.modalOpen();

    /* Speed Lanes: a lapsed clock throws for you, then a clean 300 stands. */
    T.setMode('blitz');
    T.restart(true);
    T.setClock(2);
    out.blitzTimeout = T.tick(12);
    T.restart(true);
    for (let i = 0; i < 12; i++) T.roll(10);
    out.blitz = T.state();
    out.blitzBest = stats().bestScore;

    /* Spare Practice: ten seven-pin leaves, all cleared. */
    T.setMode('spares');
    T.restart(true);
    out.spareStart = T.state();
    for (let i = 0; i < 10; i++) T.roll(7);
    out.spares = T.state();
    out.sparesBest = stats().bestScore;

    /* Triple Header: three perfect games back to back. */
    T.setMode('series');
    T.restart(true);
    for (let i = 0; i < 36; i++) T.roll(10);
    out.series = T.state();
    out.seriesBest = stats().bestScore;

    /* Pro Oil unlocks once a session clears 150. */
    out.masterUnlock = T.setMode('master');
    out.masterGuide = T.state().guide;
    T.restart(true);
    for (let i = 0; i < 12; i++) T.roll(10);
    out.master = T.state();
    out.masterBest = stats().bestScore;

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'bowl:ball-ember');
    out.skin = T.colors();
    T.cosmetic('palette', 'bowl:lane-midnight');
    out.palette = T.colors();
    T.cosmetic('effect', 'bowl:trim-lime');
    out.accent = T.colors();
    T.cosmetic('theme', 'bowl:alley-neon');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'spares', 'series', 'master']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.locked, false, 'Pro Oil stays locked before a 150 session');
  assert.equal(data.modeAfterLock, 'classic');

  assert.equal(data.start.mode, 'classic');
  assert.equal(data.start.state, 'playing');
  assert.equal(data.start.onLane, 10, 'a full rack stands at the start');
  assert.equal(data.start.frame, 0);
  assert.equal(data.firstStrike.strikes, 1, 'the first ball records a strike');
  assert.equal(data.classic.state, 'won');
  assert.equal(data.classic.score, 300, 'twelve strikes score 300');
  assert.equal(data.classic.raw, 300);
  assert.equal(data.classic.frames, 10, 'ten frames are recorded');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  assert.equal(data.classicBest, 300);
  for (const id of ['first-strike', 'double', 'turkey', 'clean-sheet', 'league-regular', 'century-club', 'perfect-game']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the perfect game');
  }

  assert.equal(data.blitzTimeout.phase, 'roll', 'a shot-clock lapse throws the ball');
  assert.equal(data.blitzTimeout.clock <= 0, true);
  assert.match(data.blitzTimeout.msg, /Time/);
  assert.equal(data.blitz.state, 'won');
  assert.equal(data.blitz.score, 360, '300 x 1.2');
  assert.equal(data.blitzBest, 360);
  assert.ok(data.ach.includes('speed-demon'), 'Speed Demon unlocked');

  assert.equal(data.spareStart.mode, 'spares');
  assert.equal(data.spareStart.onLane, 7, 'Spare Practice racks a seven-pin leave');
  assert.equal(data.spares.state, 'won');
  assert.equal(data.spares.score, 425, '(10 x (7 + 30)) x 1.15');
  assert.equal(data.spares.spareFrames.length, 10);
  assert.equal(data.spares.spareFrames.every((f) => f.cleared), true, 'every leave converted');
  assert.equal(data.sparesBest, 425);
  assert.ok(data.ach.includes('spare-artist'), 'Spare Artist unlocked');
  assert.ok(data.ach.includes('spare-master'), 'Spare Master unlocked');

  assert.equal(data.series.state, 'won');
  assert.equal(data.series.score, 1125, 'three 300s at 1.25x');
  assert.equal(data.series.series.length, 2, 'two games archived before the finale');
  assert.deepEqual(data.series.series, [300, 300]);
  assert.equal(data.seriesBest, 1125);
  assert.ok(data.ach.includes('series-champ'), 'Series Champ unlocked');

  assert.equal(data.masterUnlock, true, 'a 150 session unlocks Pro Oil');
  assert.equal(data.masterGuide, false, 'Pro Oil hides the aim guide');
  assert.equal(data.master.hook, 1.9);
  assert.equal(data.master.state, 'won');
  assert.equal(data.master.score, 480, '300 x 1.6');
  assert.equal(data.masterBest, 1125, 'Triple Header keeps the page best');
  assert.ok(data.ach.includes('pro-oil'), 'Pro Oil unlocked');

  assert.equal(data.stats.plays, 5);
  assert.equal(data.stats.games, 7, 'the Triple Header counts three games');
  assert.equal(data.stats.strikes, 72);
  assert.equal(data.stats.spares, 10);
  assert.equal(data.stats.gutters, 0);
  assert.equal(data.stats.pins, 790);
  assert.equal(data.stats.perfectGames, 1, 'only the League Night perfect game counts');
  assert.equal(data.stats.bestGame, 1125);
  assert.equal(data.stats.bestScore, 1125);
  for (const mode of ['classic', 'blitz', 'spares', 'series', 'master']) assert.equal(data.stats[mode + 'Runs'], 1, mode + ' run recorded');
  for (const id of ['first-strike', 'double', 'turkey', 'spare-artist', 'clean-sheet', 'league-regular', 'century-club', 'perfect-game', 'speed-demon', 'spare-master', 'series-champ', 'pro-oil']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }

  assert.equal(data.defaults.ball, '#06b6d4', 'the cyan ball is equipped by default');
  assert.equal(data.defaults.lane, 'lane-classic');
  assert.equal(data.defaults.trim, 'trim-cyan');
  assert.equal(data.defaults.theme, 'alley-night');
  assert.equal(data.skin.ball, '#f97316', 'the ember ball repaints the ball');
  assert.equal(data.palette.lane, 'lane-midnight', 'the midnight lane repaints the wood');
  assert.equal(data.accent.trim, 'trim-lime', 'lime trim repaints the neon');
  assert.equal(data.theme.theme, 'alley-neon', 'the neon alley repaints the room');
  assert.equal(data.cosmetics.length, 16, 'Bowling ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { BowlingTest.setMode('classic'); BowlingTest.restart(false); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the lane');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
