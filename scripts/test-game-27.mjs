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
await page.goto(`${origin}/assets/games/27-connect-four/index.html?test=1`);
await page.waitForFunction(() => typeof ConnectTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = ConnectTest;
    const save = () => Save.load('connect-four');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('grandmaster');
    out.modeAfterLock = T.getMode();

    T.setSeat('two');
    T.setMode('classic');
    T.restart();
    out.start = T.state();

    /* Gold stacks a horizontal four across the bottom row. */
    T.drop(3); T.drop(0); T.drop(4); T.drop(0); T.drop(5); T.drop(1);
    out.classic = T.drop(6);
    out.classicBest = stats().bestClassicScore;
    out.classicWins = stats().classicWins;
    T.closeModal();

    /* Triple Threat wins with three in a column. */
    T.setMode('triple'); T.restart();
    T.drop(3); T.drop(0); T.drop(3); T.drop(0);
    out.triple = T.drop(3);
    out.tripleBest = stats().bestTripleScore;
    T.closeModal();

    /* Marathon needs five. */
    T.setMode('marathon'); T.restart();
    T.drop(3); T.drop(0); T.drop(3); T.drop(0); T.drop(3); T.drop(0); T.drop(3); T.drop(0);
    out.marathon = T.drop(3);
    out.marathonBest = stats().bestMarathonScore;
    T.closeModal();

    /* Blitz: flagging on time loses. */
    T.setMode('blitz'); T.restart();
    T.setScore('y', 200); T.setClock('y', 500);
    out.blitz = T.tick(1000);
    out.blitzBest = stats().bestBlitzScore;
    T.closeModal();

    out.gmUnlock = T.setMode('grandmaster');
    T.restart();
    T.setScore('y', 500);
    out.grandmaster = T.finish('y');
    out.grandmasterBest = stats().bestGrandmasterScore;
    T.closeModal();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'c4:discs-neon');
    out.palette = T.cosmetic('palette', 'c4:board-violet');
    out.accent = T.cosmetic('effect', 'c4:accent-cyan');
    out.theme = T.cosmetic('theme', 'c4:theme-space');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'triple', 'marathon', 'blitz', 'grandmaster']);
  assert.equal(data.locked, false, 'Grandmaster stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.start.target, 4);
  assert.deepEqual(data.start.legal, [true, true, true, true, true, true, true]);

  assert.equal(data.classic.over, 'Gold wins!');
  assert.deepEqual(data.classic.winLine, [38, 39, 40, 41], 'four across the bottom row');
  assert.equal(data.classic.hist, 7);
  assert.equal(data.classic.scores.y, 80, 'twenty per drop');
  assert.equal(data.classicBest, 1080, '80 earned + 1,000 Classic bonus');
  assert.equal(data.classicWins, 1);

  assert.equal(data.triple.over, 'Gold wins!');
  assert.equal(data.triple.winLine.length, 3);
  assert.equal(data.tripleBest, 1056, '(60 + 900) x 1.1');

  assert.equal(data.marathon.over, 'Gold wins!');
  assert.equal(data.marathon.winLine.length, 5);
  assert.equal(data.marathonBest, 1440, '(100 + 1,100) x 1.2');

  assert.equal(data.blitz.over, 'Crimson wins!');
  assert.equal(data.blitzBest, 260, '200 x 1.3 after the flag falls');
  assert.equal(data.gmUnlock, true, 'a Classic win unlocks Grandmaster');
  assert.equal(data.grandmaster.over, 'Gold wins!');
  assert.equal(data.grandmasterBest, 3000, '(500 + 1,500) x 1.5');

  assert.equal(data.defaults.discs.y, 'radial-gradient(circle at 35% 30%, #fde68a, #f59e0b)');
  assert.match(data.skin.discs.y, /#bef264/);
  assert.equal(data.palette.board.board, '#5b21b6');
  assert.equal(data.accent.accent, '#22d3ee');
  assert.match(data.theme.theme, /rgb\(9, 10, 16\)/);
  assert.equal(data.cosmetics.length, 16, 'Connect Four ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['c4:discs-neon', 'c4:board-violet', 'c4:accent-cyan', 'c4:theme-space']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.wins, 4, 'Classic, Triple Threat, Marathon and Grandmaster wins');
  assert.equal(data.stats.bestScore, 3000);
  assert.equal(data.stats.discsDropped, 12);
  assert.equal(data.stats.fewestMoves, 5);
  for (const id of ['first-drop', 'first-win', 'classic-clear', 'triple-clear', 'marathon-clear', 'grandmaster-clear', 'vertical-win', 'quick-win', 'center-stage', 'personal-best']) {
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
