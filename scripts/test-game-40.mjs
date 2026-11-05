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
await page.goto(`${origin}/assets/games/40-mini-golf/index.html?test=1`);
await page.waitForFunction(() => typeof MiniGolfTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = MiniGolfTest;
    const save = () => Save.load('minigolf');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    const play = (plan) => { for (const [n, pickup] of plan) { T.finish(n, pickup); T.tick(110); } };
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('master');
    out.modeAfterLock = T.getMode();

    /* Classic Round: aces on 1 and 3, eagles on 9, birdies elsewhere. */
    T.setMode('classic');
    T.restart(true);
    out.start = T.state();
    play([[1, false], [2, false], [1, false], [2, false], [2, false], [2, false], [2, false], [3, false], [2, false]]);
    out.classic = T.state();
    out.classicAch = ach().slice();
    out.classicBest = stats().bestScore;
    out.classicModal = T.modalOpen();

    /* Speed Golf: the clock can end a round early, then a clean five-hole card. */
    T.setMode('sprint');
    T.restart(true);
    out.sprintStart = T.state();
    T.setClock(2);
    out.sprintTimeout = T.tick(4);
    T.restart(true);
    play([[2, false], [3, false], [3, false], [3, false], [3, false]]);
    out.sprint = T.state();

    /* Windy Links: nine pars. */
    T.setMode('windy');
    T.restart(true);
    out.windyStart = T.state();
    play([[2, false], [3, false], [3, false], [3, false], [3, false], [3, false], [3, false], [4, false], [4, false]]);
    out.windy = T.state();

    /* Tight Cup: nine pars again, with a smaller cup. */
    T.setMode('tight');
    T.restart(true);
    out.tightStart = T.state();
    play([[2, false], [3, false], [3, false], [3, false], [3, false], [3, false], [3, false], [4, false], [4, false]]);
    out.tight = T.state();

    /* Championship unlocks once the Classic card clears 200. */
    out.masterUnlock = T.setMode('master');
    T.restart(true);
    out.masterStart = T.state();
    play([[2, false], [3, false], [3, false], [3, false], [3, false], [3, false], [3, false], [4, false], [4, false]]);
    out.master = T.state();
    out.masterModal = T.modalOpen();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'minigolf:ball-gold');
    out.skin = T.colors();
    T.cosmetic('palette', 'minigolf:grass-night');
    out.palette = T.colors();
    T.cosmetic('effect', 'minigolf:aim-cyan');
    out.accent = T.colors();
    T.cosmetic('theme', 'minigolf:sky-sunset');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'sprint', 'windy', 'tight', 'master']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.locked, false, 'Championship stays locked before a 200 round');
  assert.equal(data.modeAfterLock, 'classic');

  assert.equal(data.start.mode, 'classic');
  assert.equal(data.start.state, 'playing');
  assert.equal(data.start.holes, 9, 'Classic plays all nine holes');
  assert.equal(data.start.guide, true, 'Classic shows the aim guide');
  assert.equal(data.classic.phase, 'between');
  assert.equal(data.classic.played, 9, 'all nine holes are on the card');
  assert.equal(data.classic.toPar, -11, '17 strokes against a par of 28');
  assert.equal(data.classic.aces, 2);
  assert.equal(data.classic.eagles, 1);
  assert.equal(data.classic.birdies, 6);
  assert.equal(data.classic.score, 450, 'two aces, six birdies and an eagle');
  assert.equal(data.classic.state, 'won', 'the round closes after the ninth hole');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  assert.equal(data.classicBest, 450);
  for (const id of ['first-hole', 'ace', 'ace-pair', 'eagle', 'birdie', 'steady', 'red-numbers', 'clean-card']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the Classic round');
  }

  assert.equal(data.sprintStart.holes, 5, 'Speed Golf is a five-hole card');
  assert.equal(data.sprintStart.clock, 5400);
  assert.equal(data.sprintTimeout.state, 'won', 'the clock can end the round');
  assert.equal(data.sprintTimeout.title, 'Time!', 'the clock closes the card early');
  assert.equal(data.sprint.state, 'won');
  assert.equal(data.sprint.played, 5);
  assert.equal(data.sprint.score, 180, 'five pars at 1.2x');
  assert.ok(data.ach.includes('sprint-clear'), 'Quick Round unlocked');

  assert.equal(data.windyStart.wind, 0.05, 'Windy Links pushes the ball sideways');
  assert.equal(data.windy.state, 'won');
  assert.equal(data.windy.score, 351, 'nine pars at 1.3x');
  assert.ok(data.ach.includes('windy-clear'), 'Wind Player unlocked');

  assert.equal(data.tightStart.cup, 8, 'Tight Cup shrinks the cup');
  assert.equal(data.tight.state, 'won');
  assert.equal(data.tight.score, 378, 'nine pars at 1.4x');
  assert.ok(data.ach.includes('tight-clear'), 'Threading It unlocked');

  assert.equal(data.masterUnlock, true, 'a 200-point Classic round unlocks Championship');
  assert.equal(data.masterStart.guide, false, 'Championship hides the aim guide');
  assert.equal(data.masterStart.cup, 8);
  assert.equal(data.masterStart.wind, -0.045);
  assert.equal(data.master.state, 'won');
  assert.equal(data.master.score, 432, 'nine pars at 1.6x');
  assert.equal(data.masterModal, true, 'the result dialog opens');
  assert.ok(data.ach.includes('master-clear'), 'Club Champion unlocked');

  assert.equal(data.stats.plays, 6);
  assert.equal(data.stats.rounds, 6);
  assert.equal(data.stats.holes, 41);
  assert.equal(data.stats.strokes, 115);
  assert.equal(data.stats.aces, 2);
  assert.equal(data.stats.birdies, 6);
  assert.equal(data.stats.eagles, 1);
  assert.equal(data.stats.pars, 32);
  assert.equal(data.stats.pickups, 0);
  assert.equal(data.stats.bestRound, 450);
  assert.equal(data.stats.bestScore, 450);
  assert.equal(data.stats.bestToPar, -11);
  assert.equal(data.stats.bestStrokes, 17);
  assert.equal(data.stats.classicBest, 450);
  assert.equal(data.stats.classicRounds, 1);
  assert.equal(data.stats.sprintRounds, 2, 'the timed-out attempt counts as a round');
  for (const mode of ['windy', 'tight', 'master']) assert.equal(data.stats[mode + 'Rounds'], 1, mode + ' round recorded');
  for (const id of ['first-hole', 'ace', 'ace-pair', 'eagle', 'birdie', 'steady', 'red-numbers', 'clean-card', 'sprint-clear', 'windy-clear', 'tight-clear', 'master-clear']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }

  assert.equal(data.defaults.ball, '#f8fafc', 'the classic ball is equipped by default');
  assert.equal(data.defaults.grass, 'grass-emerald');
  assert.equal(data.defaults.aim, 'aim-white');
  assert.equal(data.defaults.sky, 'sky-dusk');
  assert.equal(data.skin.ball, '#d97706', 'the gold ball repaints the ball');
  assert.equal(data.palette.grass, 'grass-night', 'the night green repaints the course');
  assert.equal(data.accent.aim, 'aim-cyan', 'cyan repaints the aim line');
  assert.equal(data.theme.sky, 'sky-sunset', 'the sunset sky repaints the backdrop');
  assert.equal(data.cosmetics.length, 16, 'Mini Golf ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { MiniGolfTest.setMode('classic'); MiniGolfTest.restart(false); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the course');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
