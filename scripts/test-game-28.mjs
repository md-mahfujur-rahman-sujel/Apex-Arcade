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
await page.goto(`${origin}/assets/games/28-mancala/index.html?test=1`);
await page.waitForFunction(() => typeof MancalaTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(async () => {
    const T = MancalaTest;
    const save = () => Save.load('mancala');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    if (window.ApexPauseGame) window.ApexPauseGame(false);
    T.start();
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('grandmaster');
    out.modeAfterLock = T.getMode();

    T.setSeat('two');
    T.setMode('classic');
    T.restart();
    out.start = T.state();
    out.sow = await T.play(0);

    /* Landing the last stone in your own store earns another turn. */
    T.setMode('classic'); T.restart();
    T.setBoard([0, 0, 0, 3, 0, 0, 0, 4, 4, 4, 4, 4, 4, 0]);
    T.setTurn(0);
    out.extra = await T.play(3);

    /* Capture an empty pit opposite a loaded rival pit, then bank the win. */
    T.setMode('classic'); T.restart();
    T.setBoard([1, 0, 0, 0, 1, 0, 0, 5, 2, 0, 0, 0, 0, 0]);
    T.setTurn(0);
    out.capture = await T.play(4);
    out.classic = T.finish(0);
    out.classicBest = stats().bestClassicScore;
    out.classicWins = stats().classicWins;
    T.closeModal();

    /* Sudden Death ends the instant a store reaches 25. */
    T.setMode('sudden'); T.restart();
    T.setBoard([0, 0, 0, 0, 0, 1, 24, 3, 3, 3, 3, 3, 3, 0]);
    T.setTurn(0);
    out.sudden = await T.play(5);
    out.suddenBest = stats().bestSuddenScore;
    T.closeModal();

    /* Harvest starts with six stones per pit. */
    T.setMode('harvest'); T.restart();
    out.harvestSetup = T.state();
    T.setScore(0, 200);
    out.harvest = T.finish(0);
    out.harvestBest = stats().bestHarvestScore;
    T.closeModal();

    /* Blitz: flagging on time loses. */
    T.setMode('blitz'); T.restart();
    T.setScore(0, 200); T.setClock(0, 500);
    out.blitz = T.tick(1000);
    out.blitzBest = stats().bestBlitzScore;
    T.closeModal();

    out.gmUnlock = T.setMode('grandmaster');
    T.restart();
    T.setScore(0, 500);
    out.grandmaster = T.finish(0);
    out.grandmasterBest = stats().bestGrandmasterScore;
    T.closeModal();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'mancala:stones-gem');
    out.palette = T.cosmetic('palette', 'mancala:board-midnight');
    out.accent = T.cosmetic('effect', 'mancala:accent-lime');
    out.theme = T.cosmetic('theme', 'mancala:theme-dusk');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'harvest', 'sudden', 'grandmaster']);
  assert.equal(data.locked, false, 'Grandmaster stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.start.board[0], 4);
  assert.deepEqual(data.start.stores, [0, 0]);
  assert.equal(data.start.turn, 0);

  assert.equal(data.sow.board[0], 0);
  assert.equal(data.sow.board[6], 0, 'four stones do not reach the store');
  assert.equal(data.sow.turn, 1);
  assert.equal(data.sow.moves, 1);

  assert.equal(data.extra.turn, 0, 'the extra turn stays with the sower');
  assert.equal(data.extra.stores[0], 1);
  assert.equal(data.extra.scores[1], 0);
  assert.equal(data.extra.scores[0], 20, 'an extra turn scores 20');

  assert.equal(data.capture.stores[0], 6, 'the landed stone plus five captured');
  assert.equal(data.capture.board[7], 0);
  assert.equal(data.capture.scores[0], 60, 'six stones captured at ten each');
  assert.equal(data.capture.caps[0], 6);
  assert.equal(data.capture.turn, 1);
  assert.equal(data.classicBest, 1060, '60 earned + 1,000 Classic bonus');
  assert.equal(data.classicWins, 1);

  assert.equal(data.sudden.over, 'Amber wins!');
  assert.equal(data.sudden.stores[0], 25);
  assert.equal(data.suddenBest, 1586, '(20 + 1,200) x 1.3');

  assert.equal(data.harvestSetup.board[0], 6, 'Harvest starts with six stones per pit');
  assert.equal(data.harvestBest, 1560, '(200 + 1,100) x 1.2');

  assert.equal(data.blitz.over, 'Violet wins!');
  assert.equal(data.blitzBest, 220, '200 x 1.1 after the flag falls');
  assert.equal(data.gmUnlock, true, 'a Classic win unlocks Grandmaster');
  assert.equal(data.grandmasterBest, 3000, '(500 + 1,500) x 1.5');

  assert.equal(data.defaults.stones[0], '#fbbf24');
  assert.equal(data.skin.stones[0], '#22d3ee');
  assert.equal(data.palette.board.a, '#1e3a5f');
  assert.equal(data.accent.accent, '#a3e635');
  assert.match(data.theme.theme, /rgb\(9, 10, 16\)/);
  assert.equal(data.cosmetics.length, 16, 'Mancala ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['mancala:stones-gem', 'mancala:board-midnight', 'mancala:accent-lime', 'mancala:theme-dusk']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.wins, 4, 'Classic, Sudden Death, Harvest and Grandmaster wins');
  assert.equal(data.stats.bestScore, 3000);
  assert.equal(data.stats.stonesCaptured, 6);
  assert.equal(data.stats.movesPlayed, 2);
  assert.equal(data.stats.fewestMoves, 1);
  for (const id of ['first-sow', 'extra-turn', 'first-capture', 'big-capture', 'classic-clear', 'sudden-clear', 'harvest-clear', 'grandmaster-clear', 'shutout', 'landslide', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.ok(!data.ach.includes('blitz-clear'), 'losing on time does not award the Blitz badge');

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
