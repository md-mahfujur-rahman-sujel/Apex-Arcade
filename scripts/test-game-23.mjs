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
const context = await browser.newContext({ viewport: { width: 1100, height: 900 } });
await context.addInitScript(() => { try { localStorage.clear(); } catch {} });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error' && !m.location().url.includes('favicon')) errors.push(m.text() + ' @ ' + m.location().url); });
page.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(r.status() + ' ' + r.url()); });
await page.goto(`${origin}/assets/games/23-ludo/index.html?test=1`);
await page.waitForFunction(() => typeof LudoTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = LudoTest;
    const save = () => Save.load('ludo');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const state = () => T.state();
    const out = {};
    out.modes = T.modes();
    out.locked = T.setMode('duel');
    out.modeAfterLock = T.getMode();
    out.s0 = state();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));

    // Leaving the yard on a six.
    const leave = T.turn(6, 0);
    out.leave = { ...leave, ach: ach().includes('first-roll'), six: state().players[0].sixStreak };

    // A token reaching home.
    T.setPositions(0, [56, 0, 0, 0]);
    const home = T.turn(1, 0);
    out.home = { ...home, ach: ach().includes('first-home') };

    // Capture on an open square (track cell 9).
    T.setPositions(0, [9, 0, 0, 0]);
    T.setPositions(1, [36, 0, 0, 0]);
    T.setTurn(0);
    const cap = T.turn(1, 0);
    out.capture = { ...cap, ach: ach().includes('first-capture'), foe: state().players[1].t[0], captures: state().players[0].captures };

    // A star (cell 8) is safe in Classic but not in Hunter.
    T.setMode('classic'); T.restart();
    T.setPositions(0, [8, 0, 0, 0]);
    T.setPositions(1, [35, 0, 0, 0]);
    T.setTurn(0);
    const starSafe = T.turn(1, 0);
    out.starSafe = { capture: starSafe.capture, foe: state().players[1].t[0] };
    T.setMode('hunter'); T.restart();
    T.setPositions(0, [8, 0, 0, 0]);
    T.setPositions(1, [35, 0, 0, 0]);
    T.setTurn(0);
    const starHunter = T.turn(1, 0);
    out.starHunter = { capture: starHunter.capture, foe: state().players[1].t[0], score: starHunter.score };

    // Sprint: two tokens, win at two home.
    T.setMode('sprint'); T.restart();
    out.sprintTokens = state().players.map((p) => p.t.length);
    T.setPositions(0, [57, 56]);
    T.setTurn(0);
    const sprint = T.turn(1, 1);
    out.sprint = { ...sprint, target: state().target, best: stats().bestSprintScore, wins: stats().sprintWins, ach: ach().includes('sprint-clear') };
    T.closeModal();

    // Hunter win records its bonus.
    T.setMode('hunter'); T.restart();
    T.setPositions(0, [8, 0, 0, 0]); T.setPositions(1, [35, 0, 0, 0]); T.setTurn(0); T.turn(1, 0);
    T.finish(0);
    out.hunter = { best: stats().bestHunterScore, wins: stats().hunterWins, ach: ach().includes('hunter-clear') };
    T.closeModal();

    // Steady Pace: no extra roll for a six, 1.2x score.
    T.setMode('steady'); T.restart();
    const steady = T.turn(6, 0);
    out.steady = { extra: steady.extra, cur: steady.cur, score: steady.score };
    T.setPositions(0, [57, 57, 57, 56]); T.setTurn(0);
    const steadyWin = T.turn(1, 3);
    out.steadyWin = { win: steadyWin.win, score: steadyWin.score, best: stats().bestSteadyScore, ach: ach().includes('steady-clear') };
    T.closeModal();

    // Classic win unlocks Duel.
    T.setMode('classic'); T.restart();
    T.setPositions(0, [57, 57, 57, 56]); T.setTurn(0);
    const classic = T.turn(1, 3);
    out.classic = { win: classic.win, score: classic.score, best: stats().bestClassicScore, wins: stats().classicWins, ach: ach().includes('classic-clear'), flawless: ach().includes('flawless') };
    T.closeModal();
    out.duelUnlocked = T.setMode('duel');
    out.duelSetup = state();
    T.finish(0);
    out.duel = { best: stats().bestDuelScore, wins: stats().duelWins, ach: ach().includes('duel-clear') };
    T.closeModal();

    // Three sixes in a row.
    T.setMode('classic'); T.restart();
    T.turn(6, 0); T.turn(6, 0); T.turn(6, 0);
    out.sextet = ach().includes('sextet');

    // Three captures in one game unlock Sharpshooter at the finish.
    T.restart();
    T.setCounters(0, { captures: 3 });
    T.finish(0);
    out.sharp = ach().includes('sharpshooter');
    T.closeModal();

    // Cosmetics repaint every layer.
    out.defaults = T.colors();
    out.tokens = T.cosmetic('skin', 'ludo:tokens-neon');
    out.board = T.cosmetic('palette', 'ludo:board-ivory');
    out.glow = T.cosmetic('effect', 'ludo:glow-cyan');
    out.theme = T.cosmetic('theme', 'ludo:theme-garden');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'sprint', 'hunter', 'steady', 'duel']);
  assert.equal(data.locked, false, 'Duel stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic', 'a locked mode leaves the current mode alone');
  assert.equal(data.s0.players.length, 2, 'You vs 1 computer seats two players');
  assert.deepEqual(data.s0.players.map((p) => p.t.length), [4, 4], 'Classic gives four tokens each');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.leave.pick, 0);
  assert.equal(data.leave.extra, true, 'a six earns another roll');
  assert.equal(data.leave.score, 20, 'leaving the yard scores 20');
  assert.equal(data.leave.ach, true);
  assert.equal(data.home.home, true);
  assert.equal(data.home.extra, true, 'reaching home earns another roll');
  assert.equal(data.home.score, 270, 'home adds 250 to the yard bonus');
  assert.equal(data.home.ach, true);
  assert.equal(data.capture.capture, true, 'landing on a rival captures it');
  assert.equal(data.capture.foe, 0, 'the rival token returns to the yard');
  assert.equal(data.capture.captures, 1);
  assert.equal(data.capture.ach, true);
  assert.equal(data.starSafe.capture, false, 'a star protects a rival in Classic');
  assert.equal(data.starSafe.foe, 35);
  assert.equal(data.starHunter.capture, true, 'Hunter ignores star protection');
  assert.equal(data.starHunter.foe, 0);
  assert.equal(data.starHunter.score, 150, 'Hunter captures pay 150');
  assert.deepEqual(data.sprintTokens, [2, 2], 'Sprint gives two tokens each');
  assert.equal(data.sprint.win, true, 'Sprint wins at two home');
  assert.equal(data.sprint.target, 2);
  assert.equal(data.sprint.best, 850, 'Sprint pays 250 home + 600 win');
  assert.equal(data.sprint.wins, 1);
  assert.equal(data.sprint.ach, true);
  assert.equal(data.hunter.best, 1050, 'Hunter pays 150 capture + 900 win');
  assert.equal(data.hunter.wins, 1);
  assert.equal(data.hunter.ach, true);
  assert.equal(data.steady.extra, false, 'Steady Pace removes the six bonus');
  assert.equal(data.steady.cur, 1, 'the turn passes after a six');
  assert.equal(data.steady.score, 24, 'Steady scales the yard bonus by 1.2×');
  assert.equal(data.steadyWin.score, 1644, 'Steady pays 300 home + 1320 win');
  assert.equal(data.steadyWin.ach, true);
  assert.equal(data.classic.win, true);
  assert.equal(data.classic.score, 1250, 'Classic pays 250 home + 1000 win');
  assert.equal(data.classic.wins, 1);
  assert.equal(data.classic.ach, true);
  assert.equal(data.classic.flawless, true, 'a clean win unlocks Flawless Finish');
  assert.equal(data.duelUnlocked, true, 'a Classic win unlocks Duel');
  assert.equal(data.duelSetup.mode, 'duel');
  assert.equal(data.duelSetup.players.length, 2);
  assert.deepEqual(data.duelSetup.players.map((p) => p.t.length), [4, 4]);
  assert.equal(data.duel.best, 2100, 'Duel pays 1400 × 1.5');
  assert.equal(data.duel.wins, 1);
  assert.equal(data.duel.ach, true);
  assert.equal(data.sextet, true, 'three sixes unlock Triple Six');
  assert.equal(data.sharp, true, 'three captures unlock Sharpshooter');
  assert.deepEqual(data.defaults.tokens, ['#ef4444', '#22c55e', '#eab308', '#3b82f6']);
  assert.deepEqual(data.tokens.tokens, ['#f43f5e', '#a3e635', '#facc15', '#22d3ee']);
  assert.equal(data.board.board.track, '#f3ead9');
  assert.equal(data.glow.glow, '#22d3ee');
  assert.match(data.theme.theme, /rgb\(7, 13, 9\)/);
  assert.equal(data.cosmetics.length, 16, 'Ludo ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' slot registered');
  assert.ok(data.cosmetics.some((i) => i.id === 'ludo:tokens-neon'));
  assert.ok(data.cosmetics.some((i) => i.id === 'ludo:board-ivory'));
  assert.ok(data.cosmetics.some((i) => i.id === 'ludo:glow-cyan'));
  assert.ok(data.cosmetics.some((i) => i.id === 'ludo:theme-garden'));
  assert.equal(data.stats.wins, 6, 'six human wins are recorded');
  assert.equal(data.stats.bestScore, 2100, 'best score tracks the highest run');
  assert.equal(data.stats.captures >= 4, true, 'captures counter accumulates');
  for (const id of ['first-roll', 'first-capture', 'first-home', 'classic-clear', 'sprint-clear', 'hunter-clear', 'steady-clear', 'duel-clear', 'flawless', 'sextet', 'sharpshooter', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }

  await page.evaluate(() => LudoTest.start());
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the board');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await server.httpServer.close();
}
