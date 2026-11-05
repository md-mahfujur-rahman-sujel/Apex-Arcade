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
await page.goto(`${origin}/assets/games/39-basketball/index.html?test=1`);
await page.waitForFunction(() => typeof BasketballTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = BasketballTest;
    const save = () => Save.load('basketball');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('master');
    out.modeAfterLock = T.getMode();

    /* Pickup Game: ten deep swishes, then let the buzzer land. */
    T.setMode('classic');
    T.restart(true);
    out.start = T.state();
    for (let i = 0; i < 10; i++) T.make(true, true);
    out.classicLive = T.state();
    out.classicAch = ach().slice();
    out.classic = T.tick(3700);
    out.classicBest = stats().bestScore;

    /* Rapid Fire: four makes before the short clock runs out. */
    T.setMode('rapid');
    T.restart(true);
    for (let i = 0; i < 4; i++) T.make(true, true);
    out.rapid = T.tick(1900);

    /* Downtown: every spot starts behind the arc. */
    T.setMode('downtown');
    T.restart(true);
    out.downtownSpot = T.state();
    for (let i = 0; i < 2; i++) T.make(true, true);
    out.downtown = T.tick(3700);

    /* Hot Hand: makes should top the clock back up. */
    T.setMode('hot');
    T.restart(true);
    for (let i = 0; i < 3; i++) T.make(true, true);
    out.hotLive = T.state();
    out.hot = T.tick(4200);

    /* Rooftop Wind unlocks once a Pickup Game clears 20. */
    out.masterUnlock = T.setMode('master');
    T.restart(true);
    out.masterStart = T.state();
    for (let i = 0; i < 2; i++) T.make(true, true);
    out.master = T.tick(3100);
    out.masterModal = T.modalOpen();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'basketball:ball-ruby');
    out.skin = T.colors();
    T.cosmetic('palette', 'basketball:court-neon');
    out.palette = T.colors();
    T.cosmetic('effect', 'basketball:aim-lime');
    out.accent = T.colors();
    T.cosmetic('theme', 'basketball:sky-sunrise');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'rapid', 'downtown', 'hot', 'master']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.locked, false, 'Rooftop Wind stays locked before a 20-point session');
  assert.equal(data.modeAfterLock, 'classic');

  assert.equal(data.start.mode, 'classic');
  assert.equal(data.start.state, 'playing');
  assert.equal(data.start.guide, true, 'Pickup Game shows the shot guide');
  assert.equal(data.classicLive.shots, 10);
  assert.equal(data.classicLive.made, 10);
  assert.equal(data.classicLive.swishes, 10);
  assert.equal(data.classicLive.threes, 10);
  assert.equal(data.classicLive.bestStreak, 10);
  assert.equal(data.classicLive.bestSwish, 10);
  assert.equal(data.classicLive.score, 48, 'two 4-pointers then eight 5-pointers');
  assert.equal(data.classic.state, 'won', 'the buzzer closes the session');
  assert.equal(data.classic.score, 48);
  assert.equal(data.classicBest, 48);
  for (const id of ['first-basket', 'swish', 'long-ball', 'triple-threat', 'heater', 'sharpshooter', 'twenty-club', 'sniper']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the opening run');
  }

  assert.equal(data.rapid.state, 'won');
  assert.equal(data.rapid.score, 22, 'four deep swishes at 1.25x');
  assert.ok(data.ach.includes('rapid-clear'), 'Quick Release unlocked');

  assert.equal(data.downtownSpot.three, true, 'every Downtown spot is behind the arc');
  assert.equal(data.downtownSpot.spot >= 340, true, 'Downtown spawns are deep');
  assert.equal(data.downtown.state, 'won');
  assert.equal(data.downtown.score, 10, 'two 4-pointers at 1.3x');
  assert.ok(data.ach.includes('downtown-clear'), 'City Lights unlocked');

  assert.equal(data.hotLive.timeLeft > 3600, true, 'Hot Hand banks time on every make');
  assert.equal(data.hot.state, 'won');
  assert.equal(data.hot.score, 17, 'two 5s and a 7 at 1.35x');
  assert.ok(data.ach.includes('hot-clear'), 'Still Hot unlocked');

  assert.equal(data.masterUnlock, true, 'a 20-point Pickup Game unlocks Rooftop Wind');
  assert.equal(data.masterStart.guide, false, 'Rooftop Wind hides the guide');
  assert.equal(data.masterStart.wind, -0.02);
  assert.equal(data.master.state, 'won');
  assert.equal(data.master.score, 12, 'two 6-pointers at 1.6x');
  assert.equal(data.masterModal, true, 'the result dialog opens');
  assert.ok(data.ach.includes('rooftop-clear'), 'Against The Wind unlocked');

  assert.equal(data.stats.plays, 5);
  assert.equal(data.stats.sessions, 5);
  assert.equal(data.stats.shots, 21);
  assert.equal(data.stats.made, 21);
  assert.equal(data.stats.swishes, 21);
  assert.equal(data.stats.threes, 21);
  assert.equal(data.stats.points, 109);
  assert.equal(data.stats.bestSession, 48);
  assert.equal(data.stats.bestScore, 48);
  assert.equal(data.stats.bestStreak, 10);
  assert.equal(data.stats.bestSwish, 10);
  assert.equal(data.stats.classicBest, 48);
  for (const mode of ['classic', 'rapid', 'downtown', 'hot', 'master']) assert.equal(data.stats[mode + 'Sessions'], 1, mode + ' session recorded');
  for (const id of ['first-basket', 'swish', 'long-ball', 'triple-threat', 'heater', 'sharpshooter', 'twenty-club', 'sniper', 'rapid-clear', 'downtown-clear', 'hot-clear', 'rooftop-clear']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }

  assert.equal(data.defaults.ball, '#c2410c', 'the ember ball is equipped by default');
  assert.equal(data.defaults.court, 'court-hardwood');
  assert.equal(data.defaults.aim, 'aim-white');
  assert.equal(data.defaults.sky, 'sky-dusk');
  assert.equal(data.skin.ball, '#be123c', 'the ruby ball repaints the ball');
  assert.equal(data.palette.court, 'court-neon', 'the neon court repaints the floor');
  assert.equal(data.accent.aim, 'aim-lime', 'lime repaints the arc');
  assert.equal(data.theme.sky, 'sky-sunrise', 'the sunrise sky repaints the gym');
  assert.equal(data.cosmetics.length, 16, 'Basketball ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { BasketballTest.setMode('classic'); BasketballTest.restart(false); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the court');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
