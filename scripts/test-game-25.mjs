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
await page.goto(`${origin}/assets/games/25-tycoon-town/index.html?test=1`);
await page.waitForFunction(() => typeof TycoonTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = TycoonTest;
    const save = () => Save.load('tycoon-town');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const state = () => T.state();
    const out = {};
    out.modes = T.modes();
    out.locked = T.setMode('empire');
    out.modeAfterLock = T.getMode();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));

    T.setPlayers('2');
    T.setMode('classic');
    out.s0 = state();
    out.roll = T.rollNow(0, 3, 4);
    out.rollAch = ach().includes('first-roll');

    const b1 = T.buyNow(0, 1);
    out.buy1 = { ok: b1.ok, cash: b1.players[0].cash, score: b1.players[0].score, owner: b1.owners[1] };
    const b2 = T.buyNow(0, 3);
    out.buy2 = { score: b2.players[0].score, full: ach().includes('full-set'), bought: ach().includes('first-buy') };
    const h1 = T.buildNow(0, 1);
    out.house = { ok: h1.ok, cash: h1.players[0].cash, score: h1.players[0].score, houses: h1.houses[1], ach: ach().includes('first-house') };
    T.setHouses(1, 4);
    const h2 = T.buildNow(0, 1);
    out.hotel = { houses: h2.houses[1], cash: h2.players[0].cash, score: h2.players[0].score, ach: ach().includes('hotel') };
    out.worth0 = T.worth(0);
    const rent = T.rentNow(1, 0, 1, 7);
    out.rent = { paid: rent.rent, cash0: rent.players[0].cash, cash1: rent.players[1].cash, score0: rent.players[0].score, rents: rent.players[0].rents, ach: ach().includes('first-rent') };
    const done = T.finish(0);
    out.classic = { over: done.over, best: stats().bestClassicScore, wins: stats().classicWins, ach: ach().includes('classic-clear'), pb: ach().includes('personal-best') };
    T.closeModal();

    // Quick Round: ten rounds then net worth decides.
    T.setMode('quick'); T.restart();
    out.quickSetup = { target: state().target, cash: state().players[0].cash };
    T.finish(0);
    out.quick = { best: stats().bestQuickScore, wins: stats().quickWins, ach: ach().includes('quick-clear') };
    T.closeModal();

    // Boom Town: rent doubled.
    T.setMode('boom'); T.restart();
    T.setOwner(1, 0);
    out.boomRent = T.rentOf(1, 7);
    out.boomFinish = stats().bestBoomScore;
    T.finish(0);
    out.boom = { best: stats().bestBoomScore, ach: ach().includes('boom-clear') };
    T.closeModal();

    // Market Crash: $900 start.
    T.setMode('crash'); T.restart();
    out.crashSetup = state().players[0].cash;
    T.finish(0);
    out.crash = { best: stats().bestCrashScore, ach: ach().includes('crash-clear') };
    T.closeModal();

    // Property Empire unlocks after the Classic win and pays 2x.
    T.setMode('classic'); T.restart(); T.setPlayers('4c');
    out.empirePre = state().players.length;
    out.empireUnlocked = T.setMode('empire');
    T.restart();
    out.empireSetup = { cash: state().players[0].cash, sel: state().sel, players: state().players.length, disabled: document.getElementById('side').disabled };
    T.finish(0);
    out.empire = { best: stats().bestEmpireScore, wins: stats().empireWins, ach: ach().includes('empire-clear') };
    T.closeModal();

    // Bankruptcy wipes a player out and returns their deeds to the bank.
    T.setMode('classic'); T.restart();
    T.setOwner(1, 1);
    const bank = T.bankrupt(1);
    out.bankrupt = { alive: bank.players[1].alive, cash: bank.players[1].cash, owner: bank.owners[1] };

    // Cosmetics repaint every layer.
    out.defaults = T.colors();
    out.board = T.cosmetic('skin', 'tycoon:board-ivory');
    out.tokens = T.cosmetic('palette', 'tycoon:tokens-neon');
    out.tokenCol = state().players[0].col;
    out.accent = T.cosmetic('effect', 'tycoon:accent-cyan');
    out.theme = T.cosmetic('theme', 'tycoon:theme-harbor');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'quick', 'boom', 'crash', 'empire']);
  assert.equal(data.locked, false, 'Property Empire stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.s0.players.length, 2);
  assert.equal(data.s0.players[0].cash, 1500, 'Classic starts with $1,500');
  assert.equal(data.s0.players[0].worth, 1500);
  assert.equal(data.s0.target, 0, 'Classic has no round limit');
  assert.deepEqual(data.roll, [3, 4]);
  assert.equal(data.rollAch, true);
  assert.equal(data.buy1.ok, true);
  assert.equal(data.buy1.cash, 1440);
  assert.equal(data.buy1.score, 80, 'a purchase scores 80');
  assert.equal(data.buy1.owner, 0);
  assert.equal(data.buy2.score, 410, 'completing the set adds 250');
  assert.equal(data.buy2.full, true);
  assert.equal(data.buy2.bought, true);
  assert.equal(data.house.ok, true);
  assert.equal(data.house.cash, 1330);
  assert.equal(data.house.score, 470);
  assert.equal(data.house.houses, 1);
  assert.equal(data.house.ach, true);
  assert.equal(data.hotel.houses, 5, 'four houses plus one becomes a hotel');
  assert.equal(data.hotel.cash, 1280);
  assert.equal(data.hotel.score, 530);
  assert.equal(data.hotel.ach, true);
  assert.equal(data.worth0, 1650, 'cash + deeds + houses');
  assert.equal(data.rent.paid, 250, 'a hotel on Mill Lane charges 250');
  assert.equal(data.rent.cash0, 1530);
  assert.equal(data.rent.cash1, 1250);
  assert.equal(data.rent.score0, 780);
  assert.equal(data.rent.rents, 250);
  assert.equal(data.rent.ach, true);
  assert.equal(data.classic.over, true);
  assert.equal(data.classic.best, 3280, '780 earned + 2500 Classic bonus');
  assert.equal(data.classic.wins, 1);
  assert.equal(data.classic.ach, true);
  assert.equal(data.classic.pb, true, 'the first win sets a personal best');
  assert.equal(data.quickSetup.target, 10, 'Quick Round stops after ten rounds');
  assert.equal(data.quickSetup.cash, 2000);
  assert.equal(data.quick.best, 2160, '1800 x 1.2');
  assert.equal(data.quick.wins, 1);
  assert.equal(data.quick.ach, true);
  assert.equal(data.boomRent, 4, 'Boom Town doubles Mill Lane rent');
  assert.equal(data.boom.best, 3080, '2200 x 1.4');
  assert.equal(data.boom.ach, true);
  assert.equal(data.crashSetup, 900, 'Market Crash starts at $900');
  assert.equal(data.crash.best, 3200, '2000 x 1.6');
  assert.equal(data.crash.ach, true);
  assert.equal(data.empireUnlocked, true, 'a Classic win unlocks Property Empire');
  assert.equal(data.empirePre, 4, 'the pre-empire game can seat four players');
  assert.deepEqual(data.empireSetup, { cash: 2500, sel: '2c', players: 2, disabled: true }, 'Property Empire forces a two-seat 1v1');
  assert.equal(data.empire.best, 8000, '4000 x 2');
  assert.equal(data.empire.wins, 1);
  assert.equal(data.empire.ach, true);
  assert.equal(data.bankrupt.alive, false, 'a player who cannot pay goes bankrupt');
  assert.equal(data.bankrupt.cash, 0);
  assert.equal(data.bankrupt.owner, -1, 'their deed returns to the bank');
  assert.equal(data.defaults.board.bg, '#0d3b2e');
  assert.deepEqual(data.defaults.tokens, ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b']);
  assert.equal(data.defaults.accent, '#fde047');
  assert.equal(data.board.board.sq, '#f7f1e3');
  assert.deepEqual(data.tokens.tokens, ['#22d3ee', '#a3e635', '#f472b6', '#facc15']);
  assert.equal(data.tokenCol, '#22d3ee', 'token recolour reaches the players');
  assert.equal(data.accent.accent, '#22d3ee');
  assert.match(data.theme.theme, /rgb\(7, 12, 18\)/);
  assert.equal(data.cosmetics.length, 16, 'Tycoon Town ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['tycoon:board-ivory', 'tycoon:tokens-neon', 'tycoon:accent-cyan', 'tycoon:theme-harbor']) assert.ok(data.cosmetics.some((i) => i.id === id), id);
  assert.equal(data.stats.wins, 5);
  assert.equal(data.stats.bestScore, 8000);
  assert.equal(data.stats.propertiesBought, 2);
  assert.equal(data.stats.rentCollected, 250);
  assert.equal(data.stats.housesBuilt, 2);
  assert.equal(data.stats.fewestRounds, 1);
  for (const id of ['first-roll', 'first-buy', 'first-rent', 'first-house', 'full-set', 'hotel', 'classic-clear', 'quick-clear', 'boom-clear', 'crash-clear', 'empire-clear', 'personal-best']) {
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
