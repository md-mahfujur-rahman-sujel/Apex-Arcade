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
await page.goto(`${origin}/assets/games/34-solitaire/index.html?test=1`);
await page.waitForFunction(() => typeof SolitaireTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = SolitaireTest;
    const save = () => Save.load('solitaire');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const full = (s) => Array.from({ length: 13 }, (_, k) => ({ s, r: k + 1, up: true }));
    const nearWin = () => ({
      stock: [], waste: [{ s: 3, r: 13, up: true }],
      found: [full(0), full(1), full(2), full(3).slice(0, 12)],
      tab: [[], [], [], [], [], [], []],
    });
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('master');
    out.modeAfterLock = T.getMode();

    /* Classic: the final card completes all four foundations. */
    T.setMode('classic');
    T.restart();
    out.start = T.state();
    T.setGame(nearWin());
    T.setScore(100);
    out.classic = T.move('waste', 'f3');
    out.classicBest = stats().bestClassicScore;
    out.classicWins = stats().classicWins;
    out.classicModal = T.modalOpen();
    T.closeModal();

    /* Draw Three: 1.25x multiplier. */
    T.setMode('draw3');
    T.setGame(nearWin());
    out.draw3 = T.move('waste', 'f3');
    out.draw3Best = stats().bestDraw3Score;
    T.closeModal();

    /* Single Pass: the waste can never be recycled. */
    T.setMode('singlepass');
    T.setGame({
      stock: [], waste: [{ s: 3, r: 12, up: true }, { s: 3, r: 13, up: true }],
      found: [full(0), full(1), full(2), full(3).slice(0, 12)],
      tab: [[], [], [], [], [], [], []],
    });
    T.setScore(50);
    out.recycle = T.drawStock();
    out.singlepass = T.move('waste', 'f3');
    out.singlepassBest = stats().bestSinglepassScore;
    T.closeModal();

    /* Blitz: the three-minute clock decides. */
    T.setMode('blitz');
    T.setGame({ stock: [], waste: [], found: [], tab: [] });
    T.setScore(60);
    T.setClock(100);
    out.blitz = T.tick(1000);
    out.blitzBest = stats().bestBlitzScore;
    T.closeModal();

    /* A Classic win unlocks Master. */
    out.masterUnlock = T.setMode('master');
    T.setGame(nearWin());
    out.master = T.move('waste', 'f3');
    out.masterBest = stats().bestMasterScore;
    out.stats = stats();
    out.ach = ach();
    T.closeModal();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'sol:cards-violet');
    out.palette = T.cosmetic('palette', 'sol:felt-slate');
    out.accent = T.cosmetic('effect', 'sol:accent-lime');
    out.theme = T.cosmetic('theme', 'sol:theme-dusk');
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'draw3', 'singlepass', 'blitz', 'master']);
  assert.equal(data.locked, false, 'Master stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.start.mode, 'classic');
  assert.equal(data.start.draw, 1);
  assert.equal(data.start.undoAllowed, true);
  assert.equal(data.start.foundations, 0);
  assert.equal(data.start.tab.reduce((n, c) => n + c, 0), 28, 'the opening tableau holds 28 cards');

  assert.equal(data.classic.moved, true, 'the final card goes to its foundation');
  assert.equal(data.classic.over, true);
  assert.equal(data.classic.won, true);
  assert.match(data.classic.overText, /^All four foundations complete/);
  assert.equal(data.classic.score, 110, '100 set + 10 for the foundation card');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  assert.equal(data.classicBest, 2110, '110 earned + 2,000 Classic bonus');
  assert.equal(data.classicWins, 1);

  assert.equal(data.draw3.moved, true);
  assert.equal(data.draw3.won, true);
  assert.equal(data.draw3Best, 2763, '(10 + 2,200) x 1.25');

  assert.equal(data.recycle.stock, 0);
  assert.equal(data.recycle.waste, 2, 'the waste cannot be moved back to the stock');
  assert.equal(data.recycle.moves, 0, 'a blocked recycle is not a move');
  assert.equal(data.recycle.note, 'Single pass — the stock cannot be recycled.');
  assert.equal(data.singlepass.moved, true);
  assert.equal(data.singlepassBest, 2938, '(50 + 10 + 2,200) x 1.3');

  assert.equal(data.blitz.over, true);
  assert.equal(data.blitz.overText, 'Time up — 0 of 52 cards placed');
  assert.equal(data.blitzBest, 69, '60 x 1.15 with no time-out bonus');

  assert.equal(data.masterUnlock, true, 'a Classic win unlocks Master');
  assert.equal(data.master.moved, true);
  assert.equal(data.masterBest, 3765, '(10 + 2,500) x 1.5');

  assert.equal(data.defaults.back.includes('#1d4ed8'), true, 'blue card backs by default');
  assert.equal(data.defaults.felt.bg1, '#14603f', 'green felt by default');
  assert.equal(data.defaults.accent, '#06b6d4');
  assert.equal(data.skin.back.includes('#5b21b6'), true, 'Violet Backs recolour the deck');
  assert.equal(data.palette.felt.bg1, '#1e293b', 'Slate Felt recolours the table');
  assert.equal(data.accent.accent, '#a3e635');
  assert.match(data.theme.theme, /rgb\(11, 7, 5\)/);
  assert.equal(data.cosmetics.length, 16, 'Solitaire ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['sol:cards-violet', 'sol:felt-slate', 'sol:accent-lime', 'sol:theme-dusk']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.plays, 5);
  assert.equal(data.stats.wins, 4);
  assert.equal(data.stats.bestScore, 3765);
  assert.equal(data.stats.bestClassicScore, 2110);
  assert.equal(data.stats.bestDraw3Score, 2763);
  assert.equal(data.stats.bestSinglepassScore, 2938);
  assert.equal(data.stats.bestBlitzScore, 69);
  assert.equal(data.stats.bestMasterScore, 3765);
  assert.equal(data.stats.foundationCards, 4, 'one card placed per winning game');
  assert.equal(data.stats.movesPlayed, 4);
  assert.equal(data.stats.bestFoundation, 52);
  assert.equal(data.stats.fewestMoves, 1);
  assert.equal(data.stats.classicWins, 1);
  for (const id of ['first-move', 'first-foundation', 'full-set', 'swift', 'flawless', 'classic-clear', 'draw3-clear', 'singlepass-clear', 'master-clear', 'high-score', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.ok(!data.ach.includes('blitz-clear'), 'the Blitz game ran out of time');

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
  await new Promise((resolve) => server.httpServer.close(resolve));
}
