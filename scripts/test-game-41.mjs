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
await page.goto(`${origin}/assets/games/41-soccer-pool/index.html?test=1`);
await page.waitForFunction(() => typeof SoccerPoolTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = SoccerPoolTest;
    const save = () => Save.load('soccer-pool');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    const goal = (who, fromX) => { T.scoreGoal(who, fromX); T.tick(1); };
    const play = (n, fromX) => { for (let i = 0; i < n; i++) goal(0, i === 0 ? fromX : undefined); };

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('master');
    out.modeAfterLock = T.getMode();

    /* Classic Match: a 5–0 clean sheet. */
    T.setMode('classic');
    T.restart(true);
    out.start = T.state();
    play(5);
    out.classic = T.state();
    out.classicAch = ach().slice();
    out.classicBest = stats().classicBest;
    out.classicModal = T.modalOpen();

    /* Blitz: a 75-second clock can close the match with the player ahead. */
    T.setMode('blitz');
    T.restart(true);
    out.blitzStart = T.state();
    goal(0); goal(0); goal(1);
    T.setClock(1);
    out.blitzTimeout = T.tick(2);
    out.blitz = T.state();

    /* Power Play: trail by two, then run five straight. */
    T.setMode('power');
    T.restart(true);
    out.powerStart = T.state();
    goal(1); goal(1);
    play(5);
    out.power = T.state();

    /* Derby Night: a thunderbolt from the player's own half. */
    T.setMode('derby');
    T.restart(true);
    out.derbyStart = T.state();
    play(5, 300);
    out.derby = T.state();

    /* Masterclass unlocks after a Classic win. */
    out.masterUnlock = T.setMode('master');
    T.restart(true);
    out.masterStart = T.state();
    play(5);
    out.master = T.state();
    out.masterModal = T.modalOpen();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'soccer:ball-ember');
    out.skin = T.colors();
    T.cosmetic('palette', 'soccer:pitch-neon');
    out.palette = T.colors();
    T.cosmetic('effect', 'soccer:aim-cyan');
    out.accent = T.colors();
    T.cosmetic('theme', 'soccer:sky-sunset');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'power', 'derby', 'master']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.locked, false, 'Masterclass stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');

  assert.equal(data.start.mode, 'classic');
  assert.equal(data.start.state, 'playing');
  assert.equal(data.start.target, 5, 'Classic is first to five');
  assert.equal(data.start.guide, true, 'Classic shows the aim guide');
  assert.equal(data.start.clock, 0, 'Classic has no match clock');
  assert.deepEqual(data.classic.score, [5, 0]);
  assert.equal(data.classic.state, 'won');
  assert.equal(data.classic.title, 'You win 5–0!');
  assert.equal(data.classic.points, 800, 'five goals plus the win bonus');
  assert.equal(data.classicBest, 800);
  assert.equal(data.classicModal, true, 'the result dialog opens');
  for (const id of ['first-goal', 'hat-trick', 'clean-sheet', 'five-star']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the Classic match');
  }

  assert.equal(data.blitzStart.target, 3, 'Blitz is first to three');
  assert.equal(data.blitzStart.clock, 4500, 'Blitz carries a 75-second clock');
  assert.equal(data.blitzTimeout.state, 'won', 'the clock can close the match');
  assert.equal(data.blitzTimeout.title, 'Time! You lead 2–1', 'the clock freezes a lead');
  assert.equal(data.blitz.points, 625, 'two goals and a win bonus at 1.25×');
  assert.ok(data.ach.includes('blitz-clear'), 'Blitz Champion unlocked');

  assert.equal(data.powerStart.power, 1.25, 'Power Play hits harder');
  assert.equal(data.powerStart.mult, 1.3);
  assert.deepEqual(data.power.score, [5, 2]);
  assert.equal(data.power.state, 'won');
  assert.equal(data.power.points, 1040, 'five goals and a win bonus at 1.3×');
  assert.ok(data.ach.includes('comeback'), 'Comeback Kid unlocked');
  assert.ok(data.ach.includes('power-clear'), 'Power Player unlocked');

  assert.equal(data.derbyStart.cpuNoise, 0.018, 'Derby Night sharpens the rival');
  assert.deepEqual(data.derby.score, [5, 0]);
  assert.equal(data.derby.state, 'won');
  assert.equal(data.derby.points, 1120, 'five goals and a win bonus at 1.4×');
  assert.ok(data.ach.includes('thunderbolt'), 'Thunderbolt unlocked');
  assert.ok(data.ach.includes('derby-clear'), 'Derby Winner unlocked');

  assert.equal(data.masterUnlock, true, 'a Classic win unlocks Masterclass');
  assert.equal(data.masterStart.guide, false, 'Masterclass hides the aim guide');
  assert.equal(data.masterStart.target, 5);
  assert.equal(data.master.state, 'won');
  assert.equal(data.master.points, 1280, 'five goals and a win bonus at 1.6×');
  assert.equal(data.masterModal, true, 'the result dialog opens');
  assert.ok(data.ach.includes('master-clear'), 'Table Master unlocked');

  assert.equal(data.stats.plays, 5);
  assert.equal(data.stats.matches, 5);
  assert.equal(data.stats.goals, 22);
  assert.equal(data.stats.conceded, 3);
  assert.equal(data.stats.wins, 5);
  assert.equal(data.stats.losses, 0);
  assert.equal(data.stats.cleanSheets, 3);
  assert.equal(data.stats.bestMatch, 5);
  assert.equal(data.stats.bestMargin, 5);
  assert.equal(data.stats.bestScore, 1280);
  assert.equal(data.stats.classicBest, 800);
  assert.equal(data.stats.classicMatches, 1);
  assert.equal(data.stats.classicWins, 1);
  for (const mode of ['blitz', 'power', 'derby', 'master']) {
    assert.equal(data.stats[mode + 'Matches'], 1, mode + ' match recorded');
    assert.equal(data.stats[mode + 'Wins'], 1, mode + ' win recorded');
  }
  for (const id of ['first-goal', 'hat-trick', 'clean-sheet', 'five-star', 'comeback', 'thunderbolt', 'season-striker', 'fortress', 'blitz-clear', 'power-clear', 'derby-clear', 'master-clear']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }

  assert.equal(data.defaults.ball, '#f8fafc', 'the classic ball is equipped by default');
  assert.equal(data.defaults.pitch, 'pitch-stadium');
  assert.equal(data.defaults.aim, 'aim-white');
  assert.equal(data.defaults.theme, 'sky-floodlit');
  assert.equal(data.skin.ball, '#fb923c', 'the ember ball repaints the ball');
  assert.equal(data.palette.pitch, 'pitch-neon', 'neon turf repaints the pitch');
  assert.equal(data.accent.aim, 'aim-cyan', 'cyan repaints the aim line');
  assert.equal(data.theme.theme, 'sky-sunset', 'the sunset repaints the stadium sky');
  assert.equal(data.cosmetics.length, 16, 'Soccer Pool ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { SoccerPoolTest.setMode('classic'); SoccerPoolTest.restart(false); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the pitch');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
