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
await page.goto(`${origin}/assets/games/35-memory-match/index.html?test=1`);
await page.waitForFunction(() => typeof MemoryTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  /* Start the game so the boards' shared timers are running. */
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  // Play gates the run behind the beginning animation: read the live run only
  // once that gate has released.
  await page.waitForFunction(() => window.ApexIntroRunning !== true, null, { timeout: 20000 });
  const chrome = await page.evaluate(() => ({
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
  }));
  assert.equal(chrome.shell, false, 'no button bar or help box covers the board');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');

  const data = await page.evaluate(async () => {
    const T = MemoryTest;
    const save = () => Save.load('memory-match');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const range = (n) => Array.from({ length: n }, (_, k) => k);
    const out = {};
    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.locked = T.setMode('master');
    out.modeAfterLock = T.getMode();

    /* Classic: a real flip pair, a hint, then a completed board. */
    T.setMode('classic');
    T.restart();
    out.start = T.state();
    out.firstFlip = T.flip(0);
    out.match = T.flip(T.pairOf(0));
    await new Promise((resolve) => setTimeout(resolve, 550));
    out.matched = T.state();
    out.matchAch = ach().slice();
    T.setScore(100);
    out.hint = T.hint();
    T.setGame({ size: 16, matched: range(16), moves: 8, mismatches: 0, score: 200 });
    out.classic = T.finish(true);
    out.classicBest = stats().bestClassicScore;
    out.classicWins = stats().classicWins;
    out.classicModal = T.modalOpen();
    T.closeModal();

    /* Quick Spot: 1.15x multiplier. */
    T.setMode('quick');
    T.setGame({ size: 12, matched: range(12), moves: 6, mismatches: 1, score: 150 });
    out.quick = T.finish(true);
    out.quickBest = stats().bestQuickScore;
    T.closeModal();

    /* Expert: 36 cards at 1.35x. */
    T.setMode('expert');
    T.setGame({ size: 36, matched: range(36), moves: 18, mismatches: 2, score: 450 });
    out.expert = T.finish(true);
    out.expertBest = stats().bestExpertScore;
    T.closeModal();

    /* Duel: player 1 takes the board 8-4. */
    T.setMode('duel');
    T.setGame({ size: 24, matched: range(24), moves: 12, mismatches: 0, score: 300, p1: 8, p2: 4 });
    out.duel = T.finish(true);
    out.duelBest = stats().bestDuelScore;
    T.closeModal();

    /* Master: 24 cards on a three-minute clock; the clock runs out. */
    out.masterUnlock = T.setMode('master');
    T.setGame({ size: 24, matched: [], moves: 0, score: 450 });
    T.setClock(100);
    out.master = T.tick(1000);
    out.masterBest = stats().bestMasterScore;
    out.masterAch = ach().slice();
    T.closeModal();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    out.skin = T.cosmetic('skin', 'mm:backs-violet');
    out.palette = T.cosmetic('palette', 'mm:table-slate');
    out.accent = T.cosmetic('effect', 'mm:accent-lime');
    out.theme = T.cosmetic('theme', 'mm:theme-dusk');
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'quick', 'expert', 'duel', 'master']);
  assert.equal(data.locked, false, 'Master stays locked before a Classic clear');
  assert.equal(data.modeAfterLock, 'classic');
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.start.mode, 'classic');
  assert.equal(data.start.size, 16);
  assert.equal(data.start.pairs, 8);
  assert.equal(data.start.two, false);
  assert.equal(data.start.menuPaused, false, 'the ready screen released the pause');

  assert.equal(data.firstFlip.up.length, 1);
  assert.equal(data.firstFlip.flips, 1);
  assert.equal(data.match.up.length, 2, 'both cards stay up while the match resolves');
  assert.equal(data.matched.found, 1, 'the pair is matched');
  assert.equal(data.matched.score, 25, 'a first-pair match scores 25');
  for (const id of ['first-flip', 'first-pair']) assert.ok(data.matchAch.includes(id), id + ' unlocked');
  assert.equal(data.hint.score, 60, 'the hint costs 40 points');
  assert.match(data.hint.note, /Hint cost 40 points/);

  assert.equal(data.classic.over, true);
  assert.equal(data.classic.won, true);
  assert.equal(data.classic.overText, 'All 8 pairs found in 8 moves');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  assert.equal(data.classicBest, 1800, '200 earned + 1,000 bonus + 600 speed bonus');
  assert.equal(data.classicWins, 1);

  assert.equal(data.quick.won, true);
  assert.equal(data.quick.overText, 'All 6 pairs found in 6 moves');
  assert.equal(data.quickBest, 1782, '(150 + 800 + 600) x 1.15');

  assert.equal(data.expert.won, true);
  assert.equal(data.expertBest, 3443, '(450 + 1,500 + 600) x 1.35');

  assert.equal(data.duel.two, true);
  assert.equal(data.duel.won, true);
  assert.equal(data.duel.overText, 'Player 1 wins 8–4');
  assert.equal(data.duelBest, 360, '300 x 1.2 with no completion bonus in Duel');

  assert.equal(data.masterUnlock, true, 'a Classic clear unlocks Master');
  assert.equal(data.master.over, true);
  assert.equal(data.master.won, false);
  assert.equal(data.master.overText, 'Time up — 0 of 12 pairs found');
  assert.equal(data.masterBest, 675, '450 x 1.5 with no time-out bonus');
  assert.ok(!data.masterAch.includes('master-clear'), 'the timed-out Master game earns no clear');

  assert.equal(data.defaults.back.includes('#1e2a52'), true, 'midnight card backs by default');
  assert.equal(data.defaults.table, '#0c1226');
  assert.equal(data.defaults.accent, '#06b6d4');
  assert.equal(data.skin.back.includes('#3b0764'), true, 'Violet Backs recolour the deck');
  assert.equal(data.palette.table, '#111827', 'Slate Table recolours the board');
  assert.equal(data.accent.accent, '#a3e635');
  assert.match(data.theme.theme, /rgb\(11, 7, 5\)/);
  assert.equal(data.cosmetics.length, 16, 'Memory Match ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');
  for (const id of ['mm:backs-violet', 'mm:table-slate', 'mm:accent-lime', 'mm:theme-dusk']) assert.ok(data.cosmetics.some((i) => i.id === id), id);

  assert.equal(data.stats.plays, 5);
  assert.equal(data.stats.wins, 4);
  assert.equal(data.stats.bestScore, 3443);
  assert.equal(data.stats.bestClassicScore, 1800);
  assert.equal(data.stats.bestQuickScore, 1782);
  assert.equal(data.stats.bestExpertScore, 3443);
  assert.equal(data.stats.bestDuelScore, 360);
  assert.equal(data.stats.bestMasterScore, 675);
  assert.equal(data.stats.pairsFound, 44);
  assert.equal(data.stats.flips, 88);
  assert.equal(data.stats.mismatches, 3);
  assert.equal(data.stats.classicWins, 1);
  for (const id of ['first-flip', 'first-pair', 'perfect', 'speedy', 'classic-clear', 'quick-clear', 'expert-clear', 'duel-clear', 'high-score', 'personal-best']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.ok(!data.ach.includes('master-clear'), 'Master was lost on time');

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
