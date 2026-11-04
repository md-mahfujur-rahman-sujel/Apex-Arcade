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
await page.goto(`${origin}/assets/games/24-carrom/index.html?test=1`);
await page.waitForFunction(() => typeof CarromTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = CarromTest;
    const save = () => Save.load('carrom');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const state = () => T.state();
    const out = {};
    out.modes = T.modes();
    out.locked = T.setMode('grandmaster');
    out.modeAfterLock = T.getMode();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));

    T.setSide('two');
    T.setMode('classic');
    T.restart();
    out.s0 = state();
    out.discTypes = T.discs().reduce((m, d) => ((m[d.t] = (m[d.t] || 0) + 1), m), {});

    // A real flick registers a shot.
    const sim = T.simulate(320, -Math.PI / 2, 6);
    out.sim = { ok: !!sim && !sim.blocked, shots: state().shots[0], ach: ach().includes('first-shot') };

    // An uncovered queen returns to the board.
    T.restart();
    const qAlone = T.settle(['q']);
    out.queenAlone = { qOff: qAlone.qOff, owner: qAlone.queenOwner, turn: qAlone.turn, score: qAlone.scores[0], discs: qAlone.discs };

    // Classic scoring sequence.
    T.restart();
    T.settle(['w']);
    out.one = { ...state() };
    T.settle(['w', 'w']);
    out.double = { score: state().scores[0], outw: state().out.w, ach: ach().includes('double') };
    const rival = T.settle(['b']);
    out.rival = { score: rival.scores[0], outb: rival.out.b, turn: rival.turn };
    T.setTurn(0);
    T.settle(['q', 'w']);
    out.queenCover = { score: state().scores[0], qOff: state().qOff, owner: state().queenOwner, outw: state().out.w, ach: ach().includes('first-queen') };
    const foul = T.settle(['s']);
    out.foul = { score: foul.scores[0], fouls: foul.fouls[0], outw: foul.out.w, turn: foul.turn };
    T.setTurn(0);
    const classicWin = T.settle(['w', 'w', 'w', 'w', 'w', 'w']);
    out.classic = { over: classicWin.over, score: classicWin.scores[0], outw: classicWin.out.w, best: stats().bestClassicScore, wins: stats().classicWins, ach: ach().includes('classic-clear'), triple: ach().includes('triple') };
    T.closeModal();

    // Quick Five.
    T.setMode('quick'); T.restart();
    out.quickSetup = { target: state().target, discs: state().discs };
    const quick = T.settle(['w', 'w', 'w', 'w', 'w']);
    out.quick = { over: quick.over, score: quick.scores[0], best: stats().bestQuickScore, wins: stats().quickWins, ach: ach().includes('quick-clear') };
    T.closeModal();

    // Queen Rush: covering the queen ends it.
    T.setMode('queen'); T.restart();
    const queen = T.settle(['q', 'w']);
    out.queen = { over: queen.over, score: queen.scores[0], best: stats().bestQueenScore, wins: stats().queenWins, ach: ach().includes('queen-clear') };
    T.closeModal();

    // Sudden Death, clean sweep.
    T.setMode('sudden'); T.restart();
    out.suddenSetup = { target: state().target, discs: state().discs };
    const sudden = T.settle(['w', 'w', 'w']);
    out.sudden = { over: sudden.over, score: sudden.scores[0], discs: sudden.discs, best: stats().bestSuddenScore, ach: ach().includes('sudden-clear'), perfect: ach().includes('perfect') };
    T.closeModal();

    // Grandmaster unlocks after the Classic win and pays 1.5x.
    out.gmUnlocked = T.setMode('grandmaster');
    T.restart();
    out.gmSetup = { target: state().target, turn: state().turn };
    const gm = T.settle(['w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'w', 'q']);
    out.gm = { over: gm.over, score: gm.scores[0], best: stats().bestGrandmasterScore, wins: stats().grandmasterWins, ach: ach().includes('grandmaster-clear') };
    T.closeModal();

    // Cosmetics.
    out.defaults = T.colors();
    out.striker = T.cosmetic('skin', 'carrom:striker-gold');
    out.board = T.cosmetic('palette', 'carrom:board-slate');
    out.trail = T.cosmetic('effect', 'carrom:trail-violet');
    out.theme = T.cosmetic('theme', 'carrom:theme-night');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'quick', 'queen', 'sudden', 'grandmaster']);
  assert.equal(data.locked, false, 'Grandmaster stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.s0.target, 9);
  assert.equal(data.s0.discs, 19, 'nine + nine coins and the queen');
  assert.deepEqual(data.discTypes, { q: 1, w: 9, b: 9 });
  assert.equal(data.sim.ok, true, 'a straight flick simulates');
  assert.equal(data.sim.shots, 1, 'shooting counts a shot');
  assert.equal(data.sim.ach, true);
  assert.equal(data.queenAlone.qOff, false, 'an uncovered queen is not taken');
  assert.equal(data.queenAlone.owner, -1);
  assert.equal(data.queenAlone.discs, 19, 'the queen returns to the board');
  assert.equal(data.queenAlone.score, 0);
  assert.equal(data.queenAlone.turn, 1, 'an uncovered queen ends the turn');
  assert.equal(data.one.scores[0], 100, 'a light coin is worth 100');
  assert.equal(data.one.out.w, 1);
  assert.equal(data.one.turn, 0, 'potting your own coin keeps the turn');
  assert.equal(data.double.score, 300);
  assert.equal(data.double.ach, true, 'two in a shot unlock Double Pot');
  assert.equal(data.rival.score, 300);
  assert.equal(data.rival.outb, 1);
  assert.equal(data.rival.turn, 1, 'a rival-only pot passes the turn');
  assert.equal(data.queenCover.score, 700, 'coin + covered queen pays 400');
  assert.equal(data.queenCover.qOff, true);
  assert.equal(data.queenCover.owner, 0);
  assert.equal(data.queenCover.ach, true);
  assert.equal(data.foul.score, 650, 'a foul costs 50');
  assert.equal(data.foul.fouls, 1);
  assert.equal(data.foul.outw, 3, 'a foul returns one of your coins');
  assert.equal(data.foul.turn, 1);
  assert.equal(data.classic.over.includes('Light'), true);
  assert.equal(data.classic.score, 2250, '6 coins + Classic bonus 1000 on top of 1250');
  assert.equal(data.classic.best, 2250);
  assert.equal(data.classic.wins, 1);
  assert.equal(data.classic.ach, true);
  assert.equal(data.classic.triple, true);
  assert.equal(data.quickSetup.target, 5);
  assert.equal(data.quickSetup.discs, 10, 'Quick Five has ten coins and no queen');
  assert.equal(data.quick.score, 1100, 'five coins + 600 bonus');
  assert.equal(data.quick.best, 1100);
  assert.equal(data.quick.ach, true);
  assert.equal(data.queen.score, 1320, '(100 + 300 + 800) x 1.1');
  assert.equal(data.queen.best, 1320);
  assert.equal(data.queen.ach, true);
  assert.equal(data.suddenSetup.discs, 6, 'Sudden Death starts with three coins each');
  assert.equal(data.sudden.discs, 3, 'the winning shot clears the rest');
  assert.equal(data.sudden.score, 1200, '(300 + 700) x 1.2');
  assert.equal(data.sudden.best, 1200);
  assert.equal(data.sudden.ach, true);
  assert.equal(data.sudden.perfect, true, 'a foul-free win unlocks Clean Sweep');
  assert.equal(data.gmUnlocked, true, 'a Classic win unlocks Grandmaster');
  assert.equal(data.gmSetup.target, 9);
  assert.equal(data.gmSetup.turn, 0);
  assert.equal(data.gm.score, 3900, '(900 + 300 + 1400) x 1.5');
  assert.equal(data.gm.best, 3900);
  assert.equal(data.gm.wins, 1);
  assert.equal(data.gm.ach, true);
  assert.deepEqual(data.defaults.striker, { a: '#bae6fd', b: '#0284c7' });
  assert.equal(data.defaults.board.surface, '#e6b878');
  assert.equal(data.defaults.trail, '#38bdf8');
  assert.deepEqual(data.striker.striker, { a: '#fef3c7', b: '#b45309' });
  assert.equal(data.board.board.surface, '#9aa7b8');
  assert.equal(data.trail.trail, '#a78bfa');
  assert.match(data.theme.theme, /rgb\(9, 10, 16\)/);
  assert.equal(data.cosmetics.length, 16, 'Carrom ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['carrom:striker-gold', 'carrom:board-slate', 'carrom:trail-violet', 'carrom:theme-night']) assert.ok(data.cosmetics.some((i) => i.id === id), id);
  assert.equal(data.stats.wins, 5, 'five human wins are recorded');
  assert.equal(data.stats.bestScore, 3900);
  assert.equal(data.stats.coinsPocketed, 28, 'pocketed coins accumulate across games');
  for (const id of ['first-shot', 'first-coin', 'first-queen', 'classic-clear', 'quick-clear', 'queen-clear', 'sudden-clear', 'grandmaster-clear', 'double', 'triple', 'perfect', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }

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
