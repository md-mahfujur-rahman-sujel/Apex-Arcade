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
await page.goto(`${origin}/assets/games/32-dots-boxes/index.html?test=1`);
await page.waitForFunction(() => typeof DotsBoxesTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = DotsBoxesTest;
    const save = () => Save.load('dots-boxes');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const edges = Array(24).fill(1); edges[23] = 0;
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('grandmaster');
    out.modeAfterLock = T.getMode();

    T.setSeat('1');
    T.setMode('classic');
    T.setBoard({ size: 3, edges, own: [1, 1, 1, 1, 1, 2, 2, 2, 0] });
    T.setScore(1, 500);
    out.start = T.state();
    out.classic = T.play(23);
    out.classicBest = stats().bestClassicScore;
    out.classicWins = stats().classicWins;
    out.classicModal = T.modalOpen();
    T.closeModal();

    /* Sprint ends as soon as a side reaches five boxes. */
    T.setMode('sprint');
    T.setBoard({ size: 3, edges, own: [1, 1, 1, 1, 2, 2, 2, 2, 0] });
    T.setScore(1, 100);
    out.sprint = T.play(23);
    out.sprintBest = stats().bestSprintScore;
    T.closeModal();

    /* Blitz: flagging loses instantly, with no win bonus. */
    T.setMode('blitz');
    T.setScore(1, 200); T.setTurn(2); T.setClock(2, 100);
    out.blitz = T.tick(1000);
    out.blitzBest = stats().bestBlitzScore;
    T.closeModal();

    /* Double Trouble pays double per box. */
    T.setMode('double');
    T.setBoard({ size: 3, edges, own: [1, 1, 1, 1, 1, 1, 2, 2, 0] });
    T.setScore(1, 100);
    out.double = T.play(23);
    out.doubleBest = stats().bestDoubleScore;
    T.closeModal();

    /* A Classic win unlocks Grandmaster. */
    out.gmUnlock = T.setMode('grandmaster');
    T.setBoard({ size: 3, edges, own: [1, 1, 1, 1, 1, 1, 2, 2, 0] });
    T.setScore(1, 100);
    out.grandmaster = T.play(23);
    out.grandmasterBest = stats().bestGrandmasterScore;
    T.closeModal();

    /* Undo restores lines, points and the turn. */
    T.setSeat('two');
    T.setMode('classic');
    T.setBoard({ size: 3, edges: Array(24).fill(0), own: Array(9).fill(0) });
    out.afterLine = T.play(0);
    out.undo = T.undo();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'db:lines-violet');
    out.palette = T.cosmetic('palette', 'db:board-forest');
    out.accent = T.cosmetic('effect', 'db:accent-lime');
    out.theme = T.cosmetic('theme', 'db:theme-sea');
    out.cosmetics = T.cosmeticList();
    out.stats = stats();
    out.ach = ach();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'blitz', 'sprint', 'double', 'grandmaster']);
  assert.equal(data.locked, false, 'Grandmaster stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.start.size, 3);
  assert.equal(data.start.boxes, 9);
  assert.equal(data.start.edgeCount, 24);
  assert.equal(data.start.target, 0);
  assert.deepEqual(data.start.free, [23], 'only the last line is open');

  assert.equal(data.classic.over, true);
  assert.equal(data.classic.overText, 'Cyan wins 6–3');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  assert.equal(data.classicBest, 1330, '500 + 5 line + 25 box + 800 bonus');
  assert.equal(data.classicWins, 1);

  assert.equal(data.sprint.over, true);
  assert.equal(data.sprint.overText, 'Cyan wins 5–4');
  assert.equal(data.sprintBest, 996, '(100 + 30 + 700) x 1.2');

  assert.equal(data.blitz.over, true);
  assert.equal(data.blitz.overText, 'Cyan wins on time');
  assert.equal(data.blitzBest, 220, '200 x 1.1 with no time-out bonus');

  assert.equal(data.double.over, true);
  assert.equal(data.double.overText, 'Cyan wins 7–2');
  assert.equal(data.doubleBest, 1372, '(100 + 5 + 50 + 900) x 1.3');

  assert.equal(data.gmUnlock, true, 'a Classic win unlocks Grandmaster');
  assert.equal(data.grandmaster.over, true);
  assert.equal(data.grandmasterBest, 1995, '(100 + 5 + 25 + 1200) x 1.5');

  assert.equal(data.afterLine.lines, 1);
  assert.equal(data.afterLine.points[1], 5, 'a line scores five points');
  assert.equal(data.afterLine.turn, 2);
  assert.equal(data.undo.lines, 0, 'undo removes the line');
  assert.equal(data.undo.points[1], 0, 'undo restores the points');
  assert.equal(data.undo.turn, 1);

  assert.equal(data.defaults.lines[1], '#06b6d4');
  assert.equal(data.skin.lines[1], '#a78bfa');
  assert.equal(data.palette.board.frame, '#1f5138');
  assert.equal(data.accent.accent, '#a3e635');
  assert.match(data.theme.theme, /rgb\(4, 21, 20\)/);
  assert.equal(data.cosmetics.length, 16, 'Dots & Boxes ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['db:lines-violet', 'db:board-forest', 'db:accent-lime', 'db:theme-sea']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.plays, 5);
  assert.equal(data.stats.wins, 5);
  assert.equal(data.stats.bestScore, 1995);
  assert.equal(data.stats.boxesClaimed, 25);
  assert.equal(data.stats.linesDrawn, 4);
  assert.equal(data.stats.bestWinMargin, 5);
  assert.equal(data.stats.fewestLines, 1);
  for (const id of ['first-line', 'first-box', 'classic-clear', 'blitz-clear', 'sprint-clear', 'double-clear', 'grandmaster-clear', 'high-score', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.ok(!data.ach.includes('double-box'), 'single-box claims do not award the double badge');
  assert.ok(!data.ach.includes('long-chain'), 'no four-box chain happened');
  assert.ok(!data.ach.includes('shutout'), 'the human conceded boxes in every win');

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
