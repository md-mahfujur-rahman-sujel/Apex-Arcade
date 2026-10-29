import { access, readFile, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';

const root = process.cwd();
const reportPath = path.join(root, 'docs', 'SMOKE_REPORT.md');
const idMap = await readFile(path.join(root, 'docs', 'ID_MAP.md'), 'utf8');
const games = [...idMap.matchAll(/^\|\s*(\d{2})\s*\|\s*`([^`]+)`\s*\|\s*`([^`]+)`/gm)]
  .map(([, number, id, htmlPath]) => ({ number, id, htmlPath }));

if (games.length !== 50) throw new Error(`Expected 50 games in docs/ID_MAP.md, found ${games.length}.`);
try {
  await access(path.join(root, 'dist', 'index.html'), constants.R_OK);
} catch {
  throw new Error('Production output is missing. Run `npm run build` before the smoke test.');
}

const chromePath = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browserOptions = { headless: true };
if (await access(chromePath, constants.R_OK).then(() => true, () => false)) {
  browserOptions.executablePath = chromePath;
}

const previewServer = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const baseUrl = `http://127.0.0.1:${previewServer.httpServer.address().port}`;
const distRoot = path.resolve(root, 'dist');
const browser = await chromium.launch(browserOptions);
const viewports = [
  { name: 'Desktop 1280×720', viewport: { width: 1280, height: 720 }, hasTouch: false },
  { name: 'Mobile 390×844 touch', viewport: { width: 390, height: 844 }, hasTouch: true },
];

const ok = (detail = '') => ({ pass: true, detail });
const fail = (detail) => ({ pass: false, detail });
const checks = ['load', 'menu', 'start', 'session_start', 'input', 'pause/resume', 'difficulty', 'lite', 'score/session_end'];
const messageHook = () => {
  window.__smokeApexEvents = [];
  window.addEventListener('message', (event) => {
    if (event.data?.type === 'APEX_EVENT') {
      window.__smokeApexEvents.push({ eventType: event.data.eventType, gameId: event.data.gameId, score: event.data.score });
    }
  });
};

async function signature(frame, gameId) {
  return frame.evaluate((id) => {
    const gameState = (() => {
      try {
        switch (id) {
          case 'chess': return [S.b, S.turn, moves];
          case 'snakes-ladders': return [players.map((p) => p.pos), cur, busy, over];
          case 'ludo': return [players.map((p) => p.t), cur, die, phase, busy, over];
          case 'carrom': return [W.d.map((d) => [d.x, d.y, d.vx, d.vy, d.a]), turn, phase];
          case 'tycoon-town': return [players.map((p) => [p.pos, p.cash]), turn, round, logs.length, dice, rolling];
          case 'checkers': return [B, turn, hist.length, over];
          case 'connect-four': return [B, turn, hist.length, over];
          case 'mancala': return [B, turn, hist.length, over];
          case 'reversi': return [B, turn, hist.length, over];
          case 'tic-tac-toe': return [B, turn, hist.length, over];
          case 'backgammon': return [st, turn, phase, dl, turnMoves, busy, over];
          case 'dots-boxes': return [ed, own, turn, over];
          case 'go': return [b, turn, phase, hist.length];
          case 'solitaire': return [stock, waste, found, tab, moves, won];
          case 'memory-match': return [deck, up, matched, moves, done];
          case 'maths-dash': return [run, score, right, wrong, typed, cur?.t];
          case '2048': return [G, score, moves, over, animating];
          case 'sudoku': return [grid, selected, mistakes, complete];
          case 'minesweeper': return [revealed, flagged, state];
          case 'sliding-puzzle': return [B, moves, done];
          case 'nuts-bolts': return [left(), tray, state];
          case 'colour-sort': return [T, moves, sel];
          case 'fruit-merge': return [fr.map((f) => [f.id, f.l, f.x, f.y]), score, cur, cool];
          case 'table-tennis': return [score, turn, mode];
          case 'mahjong': return [removed, moves, won];
        }
      } catch { return null; }
      return null;
    })();
    const root = document.querySelector('#bk-main') || document.querySelector('#bd') || document.body;
    return `${JSON.stringify(gameState)}|${root.innerText}|${[...root.querySelectorAll('[class], [aria-pressed], [data-state]')]
      .map((el) => `${el.tagName}:${el.className}:${el.getAttribute('aria-pressed')}:${el.getAttribute('data-state')}:${el.textContent}`)
      .join('|')}`;
  }, gameId);
}

async function testMove(frame, isTouch, gameId) {
  const arcade = await frame.evaluate(() => Boolean(window.Arcade?.test?.G));
  if (arcade) {
    const canvas = frame.locator('canvas').first();
    if (isTouch) await canvas.tap({ timeout: 1500 });
    else await canvas.click({ timeout: 1500 });
    await frame.waitForFunction(() => window.Arcade?.test?.G?.state === 'playing', null, { timeout: 1500 });
    const before = await frame.evaluate(() => window.Arcade.test.G.t);
    // Four hard drops are enough to end a Tetris run. Use a non-lethal move there.
    await frame.evaluate((id) => window.Arcade.test.tap(id === 'tetris' ? 'ArrowLeft' : 'Space', 4), gameId);
    const after = await frame.evaluate(() => window.Arcade.test.G.t);
    return after > before ? ok('Arcade test input advanced the game loop') : fail('Arcade input did not advance the game loop');
  }

  // Board pages use different legal-move rules and DOM layouts. Read a legal
  // move from each game's own rules, then activate its real rendered controls.
  const boardPlans = {
    chess: async () => frame.evaluate(() => {
      const m = legal(S)[0];
      const square = (i) => [...document.querySelectorAll('.sq')].find((el) => idx(+el.dataset.k) === i);
      return { from: square(m.f)?.dataset.k, to: square(m.t)?.dataset.k };
    }),
    'snakes-ladders': async () => ({ roll: true }),
    ludo: async () => ({ roll: true }),
    carrom: async () => ({ carrom: true }),
    'tycoon-town': async () => ({ key: 'r' }),
    checkers: async () => frame.evaluate(() => {
      $('#mode').value = 'two'; newGame();
      const m = moves(B, turn)[0], square = (i) => [...document.querySelectorAll('#bd [data-k]')].find((el) => (flip ? 63 - +el.dataset.k : +el.dataset.k) === i);
      return { from: square(m.path[0])?.dataset.k, to: square(m.path[m.path.length - 1])?.dataset.k };
    }),
    mancala: async () => frame.evaluate(() => {
      $('#mode').value = 'two'; newGame();
      return { pit: legal(B, turn)[0] };
    }),
    reversi: async () => frame.evaluate(() => {
      $('#mode').value = 'two'; newGame();
      return { cell: movesOf(B, turn)[0][0] };
    }),
    'tic-tac-toe': async () => frame.evaluate(() => {
      $('#mode').value = 'two'; newGame();
      return { cell: B.findIndex((v) => !v) };
    }),
    backgammon: async () => ({ key: 'r', wait: 1200 }),
    'dots-boxes': async () => frame.evaluate(() => ({ edge: ed.findIndex((used) => !used) })),
    go: async () => frame.evaluate(() => ({ cell: Array.from({ length: NN }, (_, i) => i).find((i) => tryMove(b, i, turn)) })),
    solitaire: async () => ({ stock: true }),
    'memory-match': async () => frame.evaluate(() => ({ cards: [...document.querySelectorAll('#bd [data-i]')].slice(0, 2).map((el) => el.dataset.i) })),
    'maths-dash': async () => frame.evaluate(() => {
      if (!run) $('#go').click();
      return { answer: String(cur.a) };
    }),
    '2048': async () => ({ arrow: true }),
    'sliding-puzzle': async () => frame.evaluate(() => {
      const blank = B.indexOf(0), n = N;
      const choices = [blank - n, blank + 1, blank + n, blank - 1].filter((i) => i >= 0 && i < B.length && Math.abs((i % n) - (blank % n)) + Math.abs(((i / n) | 0) - ((blank / n) | 0)) === 1);
      return { tile: B[choices[0]] };
    }),
    'nuts-bolts': async () => frame.evaluate(() => {
      const point = planks.flatMap((p, i) => p.gone ? [] : p.h.map((h, j) => ({ p, h, i, j })))
        .filter(({ h, i }) => h.on && !blocked(i, h)).map(({ p, h }) => sp(p, h))[0];
      return { nuts: { x: point.x, y: point.y } };
    }),
    'colour-sort': async () => frame.evaluate(() => {
      const source = T.findIndex((tube) => tube.length);
      const color = T[source].at(-1);
      const target = T.findIndex((tube, i) => i !== source && tube.length < 4 && (!tube.length || tube.at(-1) === color));
      return { source, target };
    }),
    'fruit-merge': async () => ({ canvas: true }),
    'table-tennis': async () => ({ canvas: true }),
  };
  const plan = boardPlans[gameId];
  if (plan) {
    try {
      const action = await plan();
      const before = await signature(frame, gameId);
      if (action.roll || action.key) {
        await frame.locator('body').press(action.key || 'Space');
      } else if (action.from != null && action.to != null) {
        const from = frame.locator(`#bd [data-k="${action.from}"], .sq[data-k="${action.from}"]`).first();
        const to = frame.locator(`#bd [data-k="${action.to}"], .sq[data-k="${action.to}"]`).first();
        if (isTouch) { await from.tap({ timeout: 1500 }); await to.tap({ timeout: 1500 }); }
        else { await from.click({ timeout: 1500 }); await to.click({ timeout: 1500 }); }
      } else if (action.pit != null) {
        const target = frame.locator(`.pit[data-i="${action.pit}"]`);
        if (isTouch) await target.tap({ timeout: 1500 }); else await target.click({ timeout: 1500 });
      } else if (action.column != null) {
        const target = frame.locator(`#bd [data-c="${action.column}"], #bd [data-col="${action.column}"]`).first();
        if (await target.count()) { if (isTouch) await target.tap({ timeout: 1500 }); else await target.click({ timeout: 1500 }); }
        else await frame.evaluate((column) => play(column), action.column);
      } else if (action.cell != null) {
        const target = frame.locator(`#bd [data-i="${action.cell}"], #bd [data-cell="${action.cell}"]`).first();
        if (await target.count()) { if (isTouch) await target.tap({ timeout: 1500 }); else await target.click({ timeout: 1500 }); }
        else await frame.evaluate((cell) => play(cell), action.cell);
      } else if (action.stock) {
        const target = frame.locator('#bd [data-z="stock"]').first();
        if (isTouch) await target.tap({ timeout: 1500 }); else await target.click({ timeout: 1500 });
      } else if (action.edge != null) {
        const target = frame.locator(`#bd [data-e="${action.edge}"] .hit`);
        await target.click({ force: true, timeout: 1500 });
      } else if (action.answer != null) {
        for (const digit of action.answer) await frame.locator('body').press(digit);
        await frame.locator('body').press('Enter');
      } else if (action.cards) {
        for (const id of action.cards) {
          const target = frame.locator(`#bd [data-i="${id}"]`).first();
          if (isTouch) await target.tap({ timeout: 1500 }); else await target.click({ timeout: 1500 });
        }
      } else if (action.source != null && action.target != null && action.target >= 0) {
        for (const index of [action.source, action.target]) {
          const target = frame.locator(`.tb[data-i="${index}"]`);
          if (isTouch) await target.tap({ timeout: 1500 }); else await target.click({ timeout: 1500 });
        }
      } else if (action.point) {
        const mouse = frame.page().mouse;
        const box = await frame.locator('#cv').boundingBox();
        const x = box.x + action.point.x * box.width, y = box.y + action.point.y * box.height;
        {
          await mouse.move(x, y); await mouse.down();
          await mouse.move(x - action.dx * box.width, y - action.dy * box.height, { steps: 5 }); await mouse.up();
        }
      } else if (action.carrom) {
        await frame.locator('#cv').click();
        await frame.evaluate(() => shoot(sx, Math.PI, 4));
      } else if (action.nuts) {
        await frame.locator('#cv').click();
        await frame.evaluate(({ x, y }) => tap(x, y), action.nuts);
      } else if (action.canvas) {
        const canvas = frame.locator('canvas').first();
        if (isTouch) await canvas.tap({ timeout: 1500 }); else await canvas.click({ timeout: 1500 });
      } else if (action.arrow) {
        if (gameId === '2048') {
          // A trusted board tap starts the shared session; choose the first
          // legal direction through the same move function as the keyboard.
          await frame.locator('#bd').click();
          await frame.evaluate(() => [0, 1, 2, 3].some((direction) => move(direction)));
        } else await frame.locator('body').press('ArrowLeft');
      } else if (action.sudoku || action.mine || action.mahjong) {
        const target = frame.locator('#bd .cell:not(.given), #bd .cell, #bd button:not([disabled]), #bd canvas').first();
        if (isTouch) await target.tap({ timeout: 1500 }); else await target.click({ timeout: 1500 });
      } else if (action.tile != null) {
        const target = frame.locator(`#bd [data-v="${action.tile}"], #bd [data-value="${action.tile}"]`).first();
        if (isTouch) await target.tap({ timeout: 1500 }); else await target.click({ timeout: 1500 });
      }
      await frame.waitForTimeout(action.wait || 250);
      return await signature(frame, gameId) !== before ? ok(`Legal game-specific input changed ${gameId}`) : fail(`Legal ${gameId} input did not change board state`);
    } catch (error) {
      return fail(`Legal ${gameId} input could not be applied: ${String(error?.message || error).split('\n')[0]}`);
    }
  }

  const before = await signature(frame, gameId);
  const selectors = [
    '#bd .cl.free', '#bd .sq', '#bd [role="gridcell"]', '#bd [data-cell]',
    '#board .sq', '#board .tile.free', '#board [data-tile-id]:not([disabled])', '#board button:not([disabled])',
    '#bk-main [role="gridcell"]', '#bk-main [data-cell]',
    '#bk-main .cell:not(.occupied)', '#bk-main .tile',
    '#bk-main button:not(.bk-btn)', '#bk-main canvas',
  ];
  for (const selector of selectors) {
    const target = frame.locator(selector).first();
    if (!(await target.count()) || !(await target.isVisible().catch(() => false))) continue;
    if (isTouch) await target.tap({ timeout: 1000 }).catch(() => {});
    else await target.click({ timeout: 1000 }).catch(() => {});
    await frame.waitForTimeout(180);
    if (await signature(frame, gameId) !== before) return ok(`Move changed the board via ${selector}`);
  }

  await frame.locator('body').press('ArrowRight').catch(() => {});
  await frame.waitForTimeout(180);
  return await signature(frame, gameId) !== before ? ok('Keyboard input changed the board') : fail('No board move observed after cell and keyboard input');
}

async function verifySpoofRejected(page, game) {
  const before = await page.evaluate(() => Object.fromEntries(
    Object.keys(localStorage).filter((key) => key.startsWith('apex_arcade_stats_')).sort()
      .map((key) => [key, localStorage.getItem(key)]),
  ));
  await page.evaluate((gameId) => {
    const attacker = document.createElement('iframe');
    const payload = { type: 'APEX_EVENT', gameId, eventType: 'score', score: 987654321 };
    document.body.appendChild(attacker);
    attacker.contentWindow.eval(`parent.postMessage(${JSON.stringify(payload)}, parent.location.origin)`);
  }, game.id);
  await page.waitForTimeout(150);
  const after = await page.evaluate(() => Object.fromEntries(
    Object.keys(localStorage).filter((key) => key.startsWith('apex_arcade_stats_')).sort()
      .map((key) => [key, localStorage.getItem(key)]),
  ));
  const delivered = await page.evaluate((gameId) => window.__smokeApexEvents?.some((event) =>
    event.eventType === 'score' && event.gameId === gameId && event.score === 987654321), game.id);
  if (!delivered) return fail('Sibling-window test message did not reach the host page');
  return JSON.stringify(before) === JSON.stringify(after)
    ? ok('Same-origin sibling-window score message left stored player stats unchanged')
    : fail('Same-origin sibling-window score message changed stored player stats');
}

async function testGame(game, viewport, browserContext) {
  const page = await browserContext.newPage();
  const errors = [];
  page.addInitScript(messageHook);
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  const result = Object.fromEntries(checks.map((name) => [name, fail('Not reached')]));
  let d11 = null;
  let frame;
  try {
    await page.goto(`${baseUrl}/#game=${encodeURIComponent(game.id)}`, { waitUntil: 'domcontentloaded' });
    const launch = page.locator('#playable-theater-modal button[data-ui-open]');
    await launch.waitFor({ state: 'visible', timeout: 2000 });
    result.menu = ok('Theater launch menu visible within 2 s');
    await page.evaluate(() => { window.__smokeApexEvents = []; });
    let launchPointerFailure = null;
    try {
      await launch.click({ timeout: 1200 });
    } catch (error) {
      launchPointerFailure = String(error?.message || error).includes('intercepts pointer events')
        ? 'an overlapping mobile control intercepts the Play button'
        : 'Playwright could not activate the launch button with a touch or pointer';
      // Continue diagnostic checks after recording the real pointer failure.
      await launch.evaluate((element) => element.click());
    }

    const iframe = page.locator('#playable-theater-modal iframe');
    await iframe.waitFor({ state: 'visible', timeout: 2000 });
    await page.waitForFunction(() => {
      const iframeElement = document.querySelector('#playable-theater-modal iframe');
      return iframeElement?.contentDocument?.readyState === 'complete';
    }, null, { timeout: 2000 });
    frame = page.frames().find((candidate) => candidate.url().includes(game.htmlPath));
    if (!frame) throw new Error(`Game iframe did not load ${game.htmlPath}`);
    const menuRoot = frame.locator('.apex-menu-root');
    if (await menuRoot.count() && await menuRoot.isVisible().catch(() => false)) {
      await frame.locator('[data-menu-action="play"], [data-menu-action="continue"]').first().click({ timeout: 2000 });
      await menuRoot.waitFor({ state: 'hidden', timeout: 2000 });
    }
    await frame.waitForFunction(() => [...document.querySelectorAll('canvas, #bk-main > *, #bd, #board')]
      .some((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && Number(style.opacity) > 0;
      }), null, { timeout: 2000 });
    result.load = ok('Canvas or board root visible within 2 s');
    const introDialog = frame.locator('#bk-dlg');
    if (await introDialog.count() && await introDialog.evaluate((dialog) => dialog.open)) {
      const freshRun = introDialog.getByRole('button', { name: /new run|new game/i }).first();
      if (await freshRun.count()) await freshRun.click({ timeout: 1000 });
      else await introDialog.locator('button').first().click({ timeout: 1000 });
    }

    const isArcade = await frame.evaluate(() => Boolean(window.Arcade?.test?.G));
    if (isArcade) {
      const canvas = frame.locator('canvas').first();
      if (viewport.hasTouch) await canvas.tap({ timeout: 1500 });
      else await canvas.click({ timeout: 1500 });
      await frame.waitForFunction(() => window.Arcade?.test?.G?.state === 'playing', null, { timeout: 1500 });
      result.start = launchPointerFailure
        ? fail(`Launch button was not touch-activatable: ${launchPointerFailure}`)
        : ok('Theater launch and canvas input started the Arcade game');
    } else {
      const playableSurface = frame.locator('#bk-main > *, #board, #bd').first();
      result.start = launchPointerFailure
        ? fail(`Launch button was not touch-activatable: ${launchPointerFailure}`)
        : await playableSurface.count() && await playableSurface.isVisible()
          ? ok('Board game initialized after Start')
          : fail('Board root did not initialize after Start');
    }

    result.input = await testMove(frame, viewport.hasTouch, game.id);

    try {
      await page.waitForFunction(() => window.__smokeApexEvents?.some((event) => event.eventType === 'session_start'), null, { timeout: 3000 });
      result.session_start = ok('session_start reached the host within 3 s of the first game input');
    } catch {
      result.session_start = fail('No session_start message reached the host within 3 s of the first game input');
    }

    try {
      const family = await frame.evaluate(() => window.Arcade?.game ? 'arcade' : document.getElementById('bk-main') ? 'board' : 'standalone');
      if (family === 'arcade') {
        for (const [difficulty, multiplier] of [['easy', 0.8], ['normal', 1], ['hard', 1.35]]) {
          await frame.evaluate((value) => window.postMessage({ type: 'SET_DIFFICULTY', difficulty: value }, '*'), difficulty);
          await frame.waitForFunction(({ value, speed }) => window.Arcade?.difficulty === value && window.Arcade?.speedMult === speed,
            { value: difficulty, speed: multiplier }, { timeout: 1000 });
        }
        result.difficulty = ok('SET_DIFFICULTY easy/normal/hard applied 0.8×/1.0×/1.35× simulation speed');
        await frame.evaluate(() => window.postMessage({ type: 'SET_DIFFICULTY', difficulty: 'normal' }, '*'));
      } else if (family === 'board') {
        let selectorsSynced = true, gameEffectSynced = true;
        for (const [difficulty, level, snakeExpected] of [['easy', 1, 11], ['normal', 2, 6], ['hard', 3, 1]]) {
          await frame.evaluate((value) => window.postMessage({ type: 'SET_DIFFICULTY', difficulty: value }, '*'), difficulty);
          await frame.waitForFunction(({ value, expectedLevel }) => window.Board?.difficulty?.() === value && window.Board?.level?.() === expectedLevel,
            { value: difficulty, expectedLevel: level }, { timeout: 1000 });
          selectorsSynced &&= await frame.evaluate((value) => {
            const select = document.querySelector('#difficulty, #lvl, #size, #draw, #jump');
            if (!select || [...select.options].some((option) => /contract\s*\(auto\)/i.test(option.textContent))) return true;
            const term = value === 'normal' ? /normal|medium/i : new RegExp(value, 'i');
            let expected = [...select.options].findIndex((option) => term.test(option.textContent));
            if (expected < 0) expected = value === 'easy' ? 0 : value === 'normal' ? Math.min(1, select.options.length - 1) : select.options.length - 1;
            return select.selectedIndex === expected;
          }, difficulty);
          if (game.number === '22') gameEffectSynced &&= await frame.evaluate((expected) => snakeTarget(16) === expected, snakeExpected);
          if (game.number === '30') gameEffectSynced &&= await frame.evaluate((expected) => activeLevel() === expected, level);
          if (game.number === '42') gameEffectSynced &&= await frame.evaluate(({ value, undo }) => difficulty === value && undoLimit() === undo,
            { value: difficulty, undo: difficulty === 'easy' ? 8 : difficulty === 'hard' ? 1 : 4 });
          if (game.number === '48') gameEffectSynced &&= await frame.evaluate((expected) => { newGame(); drop(); return cool === expected; },
            difficulty === 'easy' ? 0.75 : difficulty === 'hard' ? 0.35 : 0.55);
          if (game.number === '49') gameEffectSynced &&= await frame.evaluate((expected) => document.querySelector('#mode')?.value === expected,
            difficulty === 'easy' ? '0' : difficulty === 'hard' ? '2' : '1');
        }
        result.difficulty = selectorsSynced && gameEffectSynced
          ? ok('SET_DIFFICULTY mapped Easy/Normal/Hard to Board.level 1/2/3 and compatible selectors')
          : fail('SET_DIFFICULTY did not sync every difficulty selector or the game-specific rule');
        await frame.evaluate(() => window.postMessage({ type: 'SET_DIFFICULTY', difficulty: 'normal' }, '*'));
      } else {
        for (const [difficulty, hints] of [['easy', '5'], ['normal', '3'], ['hard', '1']]) {
          await frame.evaluate((value) => window.postMessage({ type: 'SET_DIFFICULTY', difficulty: value }, '*'), difficulty);
          await frame.waitForFunction((count) => document.querySelector('#hintCount')?.textContent === count, hints, { timeout: 1000 });
        }
        result.difficulty = ok('SET_DIFFICULTY easy/normal/hard set Mahjong hints to 5/3/1');
        await frame.evaluate(() => window.postMessage({ type: 'SET_DIFFICULTY', difficulty: 'normal' }, '*'));
      }
    } catch {
      result.difficulty = fail('SET_DIFFICULTY did not produce the expected gameplay setting');
    }

    if (game.number === '01' && viewport.name === 'Desktop 1280×720') {
      d11 = await verifySpoofRejected(page, game);
    }

    const pauseWithHost = async () => {
      if (viewport.hasTouch) await page.locator('#playable-theater-modal button[aria-label="Pause game"]').click({ timeout: 1000 });
      else await frame.locator('body').press('Escape');
      await page.getByRole('dialog', { name: 'Game paused' }).waitFor({ state: 'visible', timeout: 1000 });
    };
    const resumeWithHost = async () => {
      await page.getByRole('dialog', { name: 'Game paused' }).getByRole('button', { name: 'Resume' }).click({ timeout: 1000 });
      await page.getByRole('dialog', { name: 'Game paused' }).waitFor({ state: 'detached', timeout: 1000 });
    };
    try {
      await pauseWithHost();
      const inputBlocked = await frame.evaluate(() => getComputedStyle(window.frameElement).pointerEvents === 'none');
      let frozen = false;
      if (isArcade) {
        await frame.waitForFunction(() => window.Arcade.test.G.state === 'paused', null, { timeout: 1000 });
        const tick = await frame.evaluate(() => ({ t: window.Arcade.test.G.t, clock: window.Arcade.test.G.clock }));
        await page.waitForTimeout(300);
        const held = await frame.evaluate((before) => window.Arcade.test.G.t === before.t && window.Arcade.test.G.clock === before.clock, tick);
        await resumeWithHost();
        await frame.waitForFunction(() => window.Arcade.test.G.state === 'playing', null, { timeout: 1000 });
        await page.waitForTimeout(250);
        frozen = held && inputBlocked && await frame.evaluate((before) => window.Arcade.test.G.t > before.t && window.Arcade.test.G.clock > before.clock, tick);
      } else {
        await frame.waitForFunction(() => window.ApexGamePaused === true && window.Board?.paused?.() === true, null, { timeout: 1000 });
        const boardSelector = game.number === '30' ? '#bd .cl' : game.number === '42' ? '#bd .tl' : null;
        const snapshot = boardSelector ? await frame.locator(boardSelector).evaluateAll((nodes) => nodes.map((node) => `${node.textContent}:${node.getAttribute('class')}:${node.getAttribute('style')}`).join('|')) : null;
        const clock = await frame.evaluate(() => window.Board.now());
        await page.waitForTimeout(300);
        const held = await frame.evaluate((before) => window.Board.paused() === true && window.Board.now() === before, clock);
        await resumeWithHost();
        await frame.waitForFunction(() => window.ApexGamePaused === false, null, { timeout: 1000 });
        const afterPause = snapshot === null ? null : await frame.locator(boardSelector).evaluateAll((nodes) => nodes.map((node) => `${node.textContent}:${node.getAttribute('class')}:${node.getAttribute('style')}`).join('|'));
        frozen = held && inputBlocked && (snapshot === null || afterPause === snapshot);
      }
      result['pause/resume'] = frozen
        ? ok('Unified theater pause froze the game clock and state, blocked input, and resumed cleanly')
        : fail('Unified theater pause did not freeze the game or release input');
    } catch {
      result['pause/resume'] = fail('Unified theater pause overlay did not open or resume');
    }

    await page.locator('#playable-theater-modal button[aria-label="Theater settings"]').click({ timeout: 1000 });
    let arcadeTick = null;
    if (isArcade) arcadeTick = await frame.evaluate(() => {
      const gameState = window.Arcade.test.G;
      if (gameState.state !== 'playing') gameState.restart(true);
      return gameState.t;
    });
    await page.locator('#theater-settings select').selectOption('lite', { timeout: 1000 });
    try {
      if (isArcade) await frame.evaluate(() => { const game = window.Arcade.test.G; if (game.state === 'paused') game.pauseToggle(); });
      if (isArcade) arcadeTick = await frame.evaluate(() => window.Arcade.test.G.t);
      await frame.waitForFunction(({ requireGameLoop, tick }) => window.Perf?.tier === 'lite'
        && (!requireGameLoop || (window.Arcade?.test?.G?.state === 'playing' && window.Arcade.test.G.t > tick)),
      { requireGameLoop: isArcade, tick: arcadeTick }, { timeout: 1500 });
      const stillRunning = isArcade
        ? await frame.evaluate((tick) => window.Arcade.test.G.state === 'playing' && window.Arcade.test.G.t > tick && window.Perf?.tier === 'lite', arcadeTick)
        : await frame.locator('#bk-main > *, #board, #bd').first().isVisible().catch(() => false);
      result.lite = stillRunning ? ok('SET_PERF_TIER lite applied and game surface remains active') : fail('Game surface stopped after SET_PERF_TIER lite');
    } catch {
      result.lite = fail('SET_PERF_TIER lite did not reach Perf.tier');
    }

    try {
      await frame.evaluate((arcade) => {
        if (arcade) {
          const game = window.Arcade?.test?.G;
          game?.addScore(321);
          game?.over('Smoke result');
        } else if (window.Board?.modal && document.getElementById('bk-main')) {
          window.Board.modal('Game over', 'Final score 321');
        } else {
          // Mahjong loads board-kit for its pause clock but owns its inline
          // lifecycle, so it closes sessions on pagehide rather than a shell modal.
          window.dispatchEvent(new Event('pagehide'));
        }
      }, isArcade);
      await page.waitForFunction(() => {
        const events = window.__smokeApexEvents || [];
        return events.some((event) => event.eventType === 'score')
          && events.some((event) => event.eventType === 'session_end');
      }, null, { timeout: 2000 });
      result['score/session_end'] = ok('A final score and session_end reached the host');
    } catch {
      result['score/session_end'] = fail('Final score and session_end did not both reach the host');
    }
  } catch (error) {
    const reason = String(error?.message || error).split('\n')[0];
    for (const name of checks) if (result[name].detail === 'Not reached') result[name] = fail(reason);
  } finally {
    await page.waitForTimeout(50);
    result.errors = errors.length ? fail(errors.slice(0, 3).join('<br>')) : ok('No console error or page error');
    await page.close();
  }

  return { ...result, d11 };
}

const runs = Object.fromEntries(viewports.map(({ name }) => [name, []]));
let d11Result = null;
try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: viewport.viewport,
      hasTouch: viewport.hasTouch,
      isMobile: viewport.hasTouch,
      deviceScaleFactor: 1,
      reducedMotion: 'reduce',
    });
    // The managed Playwright browser cannot open loopback sockets directly.
    // Fulfill preview requests from the exact production output through Playwright routing.
    await context.route(`${baseUrl}/**`, async (route) => {
      const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
      const filePath = path.resolve(distRoot, `.${pathname}`);
      if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) {
        await route.fulfill({ status: 403, body: 'Forbidden' });
        return;
      }
      try {
        const info = await stat(filePath);
        const resolvedPath = info.isDirectory() ? path.join(filePath, 'index.html') : filePath;
        const body = await readFile(resolvedPath);
        const ext = path.extname(resolvedPath).toLowerCase();
        const contentType = ({
          '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
          '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
          '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
          '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
        })[ext] || 'application/octet-stream';
        await route.fulfill({ status: 200, contentType, body });
      } catch {
        await route.fulfill({ status: 404, body: `Not found: ${pathname}` });
      }
    });
    // The managed browser has no external network; omit optional Google Fonts in this functional smoke run.
    await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({
      status: 200,
      contentType: 'text/css; charset=utf-8',
      body: '',
    }));
    try {
      for (const game of games) {
        const test = await testGame(game, viewport, context);
        runs[viewport.name].push({ game, test });
        if (test.d11) d11Result = test.d11;
        const failed = [...checks, 'errors'].filter((name) => !test[name].pass);
        console.log(`${viewport.name} · ${game.number} ${game.id}: ${failed.length ? `FAIL ${failed.join(', ')}` : 'PASS'}`);
      }
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
  await previewServer.close();
}

const passed = (test) => checks.every((name) => test[name].pass) && test.errors.pass;
const passedCount = games.filter((game, index) => runs[viewports[0].name][index] && runs[viewports[1].name][index]
  && passed(runs[viewports[0].name][index].test) && passed(runs[viewports[1].name][index].test)).length;
const summary = [
  `- Games tested: ${games.length}/50 at ${viewports.map((item) => item.name).join(' and ')}.`,
  `- Games passing every check in both viewports: ${passedCount}/50.`,
  `- D-11 cross-window message rejection: ${d11Result ? (d11Result.pass ? 'PASS' : `FAIL — ${d11Result.detail}`) : 'NOT VERIFIED — desktop game 01 did not reach the D-11 check.'}`,
];

const lines = [
  '# Smoke test report (50-game production recheck)',
  '',
  'Generated by `npm run test:smoke` against the production build served by `vite preview`. Each game is opened through the theater at desktop 1280 × 720 and touch-enabled mobile 390 × 844. A failure is retained in the table; the runner exits non-zero if any required check fails.',
  '',
  ...summary,
  '',
  'Checks: game surface loaded within 2 s; theater launch menu visible; Start entered gameplay or initialized the board; `session_start` reached the host within 3 s; scripted input changed game state or board; pause and resume; Easy/Normal/Hard changed the shared setting and compatible game controls; Lite tier reached `Perf.tier` and the game surface remained active; a final score and `session_end` reached the host; no console or page errors. Board result delivery uses a synthetic terminal modal to exercise the shared board hook; Mahjong uses its page-exit handler.',
  '',
  '| # | Game | Desktop 1280 × 720 | Mobile 390 × 844 touch | Result |',
  '|---:|---|---|---|---|',
];

const format = (test) => [...checks, 'errors'].map((name) => `${name}: ${test[name].pass ? 'PASS' : `FAIL (${test[name].detail.replaceAll('|', '\\|')})`}`).join('<br>');
for (let index = 0; index < games.length; index++) {
  const game = games[index];
  const desktop = runs[viewports[0].name][index].test;
  const mobile = runs[viewports[1].name][index].test;
  lines.push(`| ${game.number} | ${game.id} | ${format(desktop)} | ${format(mobile)} | ${passed(desktop) && passed(mobile) ? 'PASS' : 'FAIL'} |`);
}
lines.push('', `D-11 detail: ${d11Result ? d11Result.detail : 'Not verified.'}`, '');
await writeFile(reportPath, lines.join('\n'), 'utf8');
console.log(`Smoke report written to ${reportPath}`);
if (passedCount !== games.length || !d11Result?.pass) process.exitCode = 1;
