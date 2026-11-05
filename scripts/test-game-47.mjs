import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

// Both the solver and expected pours work only on serialized copies in Node.
function pourCopy(tubes, cap, source, target) {
  const copy = tubes.map((tube) => tube.slice()), a = copy[source], b = copy[target];
  const color = a[a.length - 1];
  let count = 0;
  while (count < a.length && a[a.length - 1 - count] === color && b.length + count < cap) count++;
  b.push(...a.splice(a.length - count, count));
  return copy;
}

function solveSort(tubes, cap) {
  const full = (tube) => tube.length === cap && tube.every((color) => color === tube[0]);
  const seen = new Set(), path = [];
  let nodes = 0;
  function dfs(board) {
    if (board.every((tube) => !tube.length || full(tube))) return true;
    if (++nodes > 30000) return false;
    const key = board.map((tube) => tube.join(',')).sort().join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    for (let source = 0; source < board.length; source++) {
      const a = board[source];
      if (!a.length || full(a)) continue;
      const color = a[a.length - 1];
      for (let target = 0; target < board.length; target++) {
        const b = board[target];
        if (source === target || b.length >= cap || (b.length && b[b.length - 1] !== color)) continue;
        if (!b.length && a.every((c) => c === color)) continue;
        path.push([source, target]);
        if (dfs(pourCopy(board, cap, source, target))) return true;
        path.pop();
      }
    }
    return false;
  }
  return dfs(tubes.map((tube) => tube.slice())) ? path : null;
}

async function generatedPointerCoverage(browser, origin, errors) {
  for (const touch of [false, true]) {
    const label = touch ? 'touch' : 'desktop', seed = touch ? 4702 : 4701;
    const fresh = await browser.newContext({
      viewport: touch ? { width: 390, height: 844 } : { width: 1200, height: 950 },
      hasTouch: touch, isMobile: touch,
    });
    try {
      // Reproducible randomness, not a fixture: the game generates all tubes.
      await fresh.addInitScript((seed) => {
        let n = seed;
        Math.random = () => ((n = (Math.imul(n, 1664525) + 1013904223) >>> 0) / 4294967296);
      }, seed);
      const play = await fresh.newPage();
      play.setDefaultTimeout(10000);
      play.on('pageerror', (e) => errors.push(`${label}: ${e.message}`));
      play.on('console', (m) => { if (m.type() === 'error' && !m.location().url.includes('favicon')) errors.push(`${label}: ${m.text()}`); });
      play.on('response', (r) => { if (r.status() >= 400 && !r.url().includes('favicon')) errors.push(`${label}: ${r.status()} ${r.url()}`); });
      // Normal URL: no test hooks, fixture injection, or programmatic pours.
      await play.goto(`${origin}/assets/games/47-colour-sort/index.html`);
      await play.waitForFunction(() => typeof gameState === 'function' && !!document.querySelector('.apex-menu-root'));
      assert.equal(await play.evaluate(() => typeof window.SortTest), 'undefined');
      const press = (locator) => touch ? locator.tap() : locator.click();
      const read = () => play.evaluate(() => ({ state: gameState(), board: tubes.map((tube) => tube.slice()) }));
      const initial = await read();
      assert.equal(initial.state.level, 1, `${label}: isolated progress starts at level 1`);
      assert.equal(initial.state.menuPaused, true);
      await press(play.locator('.apex-menu-root [data-menu-action="play"]'));
      await play.waitForFunction(() => document.querySelector('.apex-menu-root').hidden && !gameState().menuPaused);

      for (let level = 1; level <= 3; level++) {
        const message = `${label}, seed ${seed}, generated level ${level}`;
        const before = await read();
        assert.equal(before.state.level, level, message);
        assert.equal(before.state.mode, 'classic', message);
        assert.equal(before.state.done, false, message);
        assert.equal(before.state.started, false, message);
        assert.equal(before.state.moves, 0, message);
        assert.equal(before.state.sel, -1, message);
        assert.ok(before.board.some((tube) => tube.some((color) => color !== tube[0])), `${message}: genuinely mixed rack`);
        assert.equal(await play.locator('#lv').textContent(), String(level), message);
        const path = solveSort(before.board, before.state.cap);
        assert.ok(path && path.length, `${message}: no solution within DFS budget; tubes=${JSON.stringify(before.board)}`);
        assert.deepEqual((await read()).board, before.board, `${message}: planning leaves the live rack untouched`);
        let expected = before.board;
        for (const [step, [source, target]] of path.entries()) {
          const move = `${message}, pour ${step + 1} [${source},${target}]`;
          await press(play.locator(`.tb[data-i="${source}"]`));
          const lifted = await read();
          assert.equal(lifted.state.sel, source, `${move}: source lifts`);
          assert.equal(lifted.state.moves, step, `${move}: selecting does not pour`);
          assert.deepEqual(lifted.board, expected, move);
          expected = pourCopy(expected, before.state.cap, source, target);
          await press(play.locator(`.tb[data-i="${target}"]`));
          const after = await read();
          assert.deepEqual(after.board, expected, `${move}: entire top run moves up to capacity`);
          assert.equal(after.state.moves, step + 1, move);
          assert.equal(after.state.sel, -1, move);
          assert.equal(after.state.done, step === path.length - 1, move);
          assert.equal(after.state.won, step === path.length - 1, move);
          assert.equal(await play.locator('#mv').textContent(), String(step + 1), move);
        }
        const cleared = await read();
        assert.ok(cleared.board.every((tube) => !tube.length || (tube.length === before.state.cap && tube.every((color) => color === tube[0]))), message);
        assert.equal(cleared.state.undos, 0, message);
        assert.equal(cleared.state.spares, 0, message);
        const dialog = play.locator('#bk-dlg[open]');
        await dialog.waitFor({ state: 'visible' });
        assert.equal(await dialog.locator('h2').textContent(), `Level ${level} cleared!`, message);
        const stats = await play.evaluate(() => Save.load('bubble-sort').stats);
        assert.equal(stats.wins, level, message);
        assert.equal(stats.levelsCleared, level, message);
        await press(dialog.getByRole('button', { name: 'Next level', exact: true }));
        await play.waitForFunction((n) => gameState().level === n && !gameState().done && !gameState().menuPaused, level + 1);
        assert.equal(await dialog.count(), 0, `${message}: Next level closes the win dialog`);
        const next = await read();
        assert.equal(next.state.started, false, message);
        assert.equal(next.state.moves, 0, message);
        assert.equal(next.state.sel, -1, message);
        assert.ok(next.board.some((tube) => tube.some((color) => color !== tube[0])), message);
        assert.notDeepEqual(next.board, before.board, `${message}: Next level generates a new rack`);
        assert.equal(await play.locator('#lv').textContent(), String(level + 1), message);
      }
      console.log(`GENERATED_POINTER_OK bubble-sort ${label}: cleared levels 1-3, Next level reached 4 (seed ${seed})`);
    } finally {
      await fresh.close();
    }
  }
}

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
await page.goto(`${origin}/assets/games/47-colour-sort/index.html?test=1`);
await page.waitForFunction(() => typeof SortTest !== 'undefined' && !!document.querySelector('.apex-menu-root'));

try {
  const data = await page.evaluate(() => {
    const T = SortTest;
    const save = () => Save.load('bubble-sort');
    const stats = () => save().stats || {};
    const ach = () => save().achievements || [];
    const out = {};
    /* Two full tubes, each topped by the other colour: three pours sort it. */
    const fixture = () => { const n = T.state().cap; return [[...Array(n - 1).fill(0), 1], [...Array(n - 1).fill(1), 0], [], []]; };
    const solve = () => { T.pour(0, 2); T.pour(1, 0); T.pour(2, 1); return T.state(); };

    out.modes = T.modes();
    out.menuActions = Array.from(document.querySelectorAll('.apex-menu-root [data-menu-action]')).map((n) => n.getAttribute('data-menu-action'));
    out.lockedMaster = T.setMode('master');
    out.modeAfterLock = T.getMode();
    out.initial = T.state();
    out.pausedPick = T.pick(0);

    /* An illegal pour is refused and leaves the rack untouched. */
    T.setMode('classic');
    T.setBoard({ tubes: fixture(), level: 1 });
    T.start();
    out.illegal = T.pour(0, 1);
    out.afterIllegal = T.state();

    /* Classic: three pours, level 1. */
    out.classicStart = T.setBoard({ tubes: fixture(), level: 1, elapsed: 0 });
    out.classic = solve();
    out.classicModal = T.modalOpen();
    out.classicAch = ach().slice();
    T.close();
    out.masterUnlock = T.setMode('master');
    out.masterMode = T.getMode();

    /* Masterclass: a pour, an undo, then the three-pour clear. */
    out.masterStart = T.setBoard({ tubes: fixture(), level: 3, elapsed: 20000 });
    out.masterTaken = T.pour(0, 2);
    out.masterUndone = T.undo();
    out.master = solve();
    out.masterModal = T.modalOpen();
    T.close();

    /* Zen: a spare tube is added before solving. */
    T.setMode('zen');
    out.zenStart = T.setBoard({ tubes: fixture(), level: 2, elapsed: 0 });
    out.zenSpare = T.spare();
    out.zen = solve();
    T.close();

    /* Sprint: 90 of 120 seconds spent. */
    T.setMode('sprint');
    out.sprintStart = T.setBoard({ tubes: fixture(), level: 1, elapsed: 90000 });
    out.sprint = solve();
    T.close();

    /* Precision: undo is refused outright. */
    T.setMode('precision');
    out.precisionStart = T.setBoard({ tubes: fixture(), level: 4, elapsed: 30000 });
    T.pour(0, 2);
    out.precisionUndo = T.undo();
    out.precision = (T.pour(1, 0), T.pour(2, 1), T.state());
    out.precisionModal = T.modalOpen();
    T.close();

    /* Five more Classic clears. */
    T.setMode('classic');
    out.extras = [];
    for (let i = 0; i < 5; i++) {
      T.setBoard({ tubes: fixture(), level: 1, elapsed: 0 });
      out.extras.push(solve());
      T.close();
    }

    /* Sprint timeout: the clock can end a level. */
    T.setMode('sprint');
    out.timeoutStart = T.startLevel(1);
    T.setRun({ started: true });
    out.timeout = T.tick(120000);
    out.timeoutModal = T.modalOpen();
    T.close();

    out.stats = stats();
    out.ach = ach();

    out.defaults = T.colors();
    T.cosmetic('skin', 'bubble-sort:tube-jade');
    out.skin = T.colors();
    T.cosmetic('palette', 'bubble-sort:bg-night');
    out.palette = T.colors();
    T.cosmetic('effect', 'bubble-sort:glow-cyan');
    out.accent = T.colors();
    T.cosmetic('theme', 'bubble-sort:ink-mint');
    out.theme = T.colors();
    out.cosmetics = T.cosmeticList();
    return out;
  });

  assert.deepEqual(data.modes, ['classic', 'sprint', 'zen', 'precision', 'master']);
  assert.deepEqual(data.menuActions, ['play', 'modes', 'customize', 'options', 'more', 'exit']);
  assert.equal(data.lockedMaster, false, 'Masterclass stays locked before a Classic win');
  assert.equal(data.modeAfterLock, 'classic');
  assert.equal(data.initial.mode, 'classic');
  assert.equal(data.initial.level, 1);
  assert.equal(data.initial.cap, 4);
  assert.equal(data.initial.spareLeft, 1);
  assert.equal(data.initial.menuPaused, true, 'the menu pauses a fresh rack');
  assert.equal(data.initial.started, false);
  assert.equal(data.pausedPick.moves, 0, 'the menu blocks pours');

  assert.equal(data.afterIllegal.moves, 0, 'an illegal pour is refused');
  assert.equal(data.afterIllegal.won, false);

  assert.equal(data.classic.won, true);
  assert.equal(data.classic.moves, 3);
  assert.equal(data.classic.score, 1020, '3 pours + 450 + 570');
  assert.equal(data.classicModal, true, 'the result dialog opens');
  for (const id of ['first-clear', 'no-undo', 'no-spare', 'speed-clear']) {
    assert.ok(data.classicAch.includes(id), id + ' unlocked by the Classic clear');
  }
  assert.equal(data.masterUnlock, true, 'a Classic clear unlocks Masterclass');
  assert.equal(data.masterMode, 'master');

  assert.equal(data.masterStart.mode, 'master');
  assert.equal(data.masterStart.cap, 5);
  assert.equal(data.masterTaken.moves, 1);
  assert.equal(data.masterUndone.moves, 0, 'undo rewinds the pour');
  assert.equal(data.masterUndone.undos, 1);
  assert.equal(data.master.won, true);
  assert.equal(data.master.moves, 3);
  assert.equal(data.master.score, 1095, '3 pours + 550 + 570 less one undo');
  assert.equal(data.masterModal, true);
  assert.ok(data.ach.includes('master-clear'), 'Pour Master unlocked');

  assert.equal(data.zenStart.mode, 'zen');
  assert.equal(data.zenStart.cap, 4);
  assert.equal(data.zenSpare.tubes, 5, 'Zen can add a spare tube');
  assert.equal(data.zenSpare.spares, 1);
  assert.equal(data.zen.won, true);
  assert.equal(data.zen.score, 1020, '3 pours + 500 + 570 less one spare');
  assert.ok(data.ach.includes('zen-clear'), 'Zen Sorter unlocked');

  assert.equal(data.sprintStart.mode, 'sprint');
  assert.equal(data.sprintStart.clock, 30, 'Sprint carries a 120-second clock with 90 spent');
  assert.equal(data.sprint.won, true);
  assert.equal(data.sprint.score, 1380, '3 pours + 450 + 570 + 360 clock bonus');
  assert.ok(data.ach.includes('sprint-clear'), 'Sprint Sorter unlocked');
  assert.ok(data.ach.includes('triple-crown'), 'Triple Crown unlocked at three modes');

  assert.equal(data.precisionStart.mode, 'precision');
  assert.equal(data.precisionUndo.undos, 0, 'Precision refuses undo');
  assert.equal(data.precisionUndo.moves, 1, 'the refused undo leaves the pour in place');
  assert.equal(data.precision.won, true);
  assert.equal(data.precision.moves, 3);
  assert.equal(data.precision.score, 1170, '3 pours + 600 + 570');
  assert.equal(data.precisionModal, true);
  assert.ok(data.ach.includes('precision-clear'), 'Diamond Hands unlocked');
  assert.ok(data.ach.includes('all-modes'), 'Every Rack unlocked in every mode');

  for (let i = 0; i < 5; i++) {
    assert.equal(data.extras[i].won, true);
    assert.equal(data.extras[i].score, 1020);
  }
  assert.ok(data.ach.includes('five-levels'), 'Five Racks unlocked at five career wins');
  assert.ok(data.ach.includes('ten-clear'), 'Ten Racks unlocked at ten career wins');

  assert.equal(data.timeoutStart.mode, 'sprint');
  assert.equal(data.timeout.done, true);
  assert.equal(data.timeout.won, false, 'the Sprint clock can end a level');
  assert.equal(data.timeout.clock, 0);
  assert.equal(data.timeout.score, 0);
  assert.equal(data.timeout.overReason, 'time');
  assert.equal(data.timeoutModal, true);

  assert.equal(data.stats.bestScore, 1380);
  assert.equal(data.stats.plays, 11);
  assert.equal(data.stats.secondsPlayed, 260);
  assert.equal(data.stats.lastResult, 'Lost');
  assert.equal(data.stats.lastMode, 'sprint');
  assert.equal(data.stats.wins, 10);
  assert.equal(data.stats.losses, 1);
  assert.equal(data.stats.levelsCleared, 10);
  assert.equal(data.stats.moves, 30);
  assert.equal(data.stats.undos, 1);
  assert.equal(data.stats.spares, 1);
  assert.equal(data.stats.level, 4, 'the level record keeps the deepest win');
  assert.equal(data.stats.classicWins, 6);
  assert.equal(data.stats.sprintWins, 1);
  assert.equal(data.stats.zenWins, 1);
  assert.equal(data.stats.precisionWins, 1);
  assert.equal(data.stats.masterWins, 1);
  assert.equal(data.stats.bestScoreClassic, 1020);
  assert.equal(data.stats.bestScoreSprint, 1380);
  assert.equal(data.stats.bestScoreZen, 1020);
  assert.equal(data.stats.bestScorePrecision, 1170);
  assert.equal(data.stats.bestScoreMaster, 1095);
  assert.equal(data.stats.bestTimeClassic, undefined, 'a zero-second run sets no time record');
  assert.equal(data.stats.bestTimeSprint, 90);
  assert.equal(data.stats.bestTimePrecision, 30);
  assert.equal(data.stats.bestTimeMaster, 20);
  assert.equal(data.stats.bestMovesClassic, 3);
  assert.equal(data.stats.bestMovesSprint, 3);
  assert.equal(data.stats.bestMovesZen, 3);
  assert.equal(data.stats.bestMovesPrecision, 3);
  assert.equal(data.stats.bestMovesMaster, 3);
  for (const id of ['first-clear', 'no-undo', 'no-spare', 'speed-clear', 'five-levels', 'ten-clear', 'triple-crown', 'sprint-clear', 'zen-clear', 'precision-clear', 'master-clear', 'all-modes']) {
    assert.ok(data.ach.includes(id), id + ' unlocked');
  }
  assert.equal(data.ach.length, 12, 'Bubble Sort ships 12 achievements');

  assert.equal(data.defaults.skin, 'tube-glass', 'the glass tubes are equipped by default');
  assert.equal(data.defaults.border, 'rgba(255,255,255,.35)');
  assert.equal(data.defaults.palette, 'bg-slate');
  assert.equal(data.defaults.bg1, '#1a2140');
  assert.equal(data.defaults.bg2, '#121830');
  assert.equal(data.defaults.effect, 'glow-gold');
  assert.equal(data.defaults.glow, '#fde047');
  assert.equal(data.defaults.theme, 'ink-slate');
  assert.equal(data.defaults.ink, 'rgba(0,0,0,.55)');
  assert.equal(data.skin.border, '#6ee7b7', 'jade repaints the tube rims');
  assert.equal(data.skin.body1, 'rgba(52,211,153,.18)');
  assert.equal(data.palette.bg1, '#12141f', 'the night rack repaints the backdrop');
  assert.equal(data.palette.bg2, '#070810');
  assert.equal(data.accent.glow, '#22d3ee', 'the cyan glow repaints the lifted tube');
  assert.equal(data.theme.ink, '#062a22', 'mint repaints the bubble glyphs');
  assert.equal(data.cosmetics.length, 16, 'Bubble Sort ships 16 cosmetics');
  for (const slot of ['skin', 'palette', 'effect', 'theme']) assert.ok(data.cosmetics.some((i) => i.slot === slot), slot + ' registered');

  await page.evaluate(() => { SortTest.setMode('classic'); SortTest.restart(); });
  await page.click('.apex-menu-root [data-menu-action="play"]');
  await page.waitForFunction(() => document.querySelector('.apex-menu-root').hidden === true);
  await page.waitForFunction(() => { const el = document.querySelector('.apex-game-menu'); return !el || getComputedStyle(el).display === 'none'; });
  const chrome = await page.evaluate(() => ({
    help: document.getElementById('bk-help') ? document.getElementById('bk-help').open : null,
    shell: Boolean(document.querySelector('.bar, .help')),
    menuToolbar: (() => { const el = document.querySelector('.apex-game-menu'); return el ? getComputedStyle(el).display : 'none'; })(),
    paused: SortTest.state().menuPaused,
  }));
  assert.equal(chrome.help, false, 'the help box stays collapsed after play');
  assert.equal(chrome.shell, false, 'no button bar or help box covers the rack');
  assert.equal(chrome.menuToolbar, 'none', 'the control toolbar is hidden during play');
  assert.equal(chrome.paused, false, 'play unpauses the rack');

  await generatedPointerCoverage(browser, origin, errors);

  assert.equal(errors.length, 0, 'no browser errors: ' + errors.join(' | '));
  console.log('SMOKE_OK');
} finally {
  await context.close();
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
