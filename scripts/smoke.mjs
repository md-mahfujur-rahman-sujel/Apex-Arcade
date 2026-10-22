import { access, readFile, writeFile } from 'node:fs/promises';
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

async function signature(frame) {
  return frame.evaluate(() => {
    const root = document.querySelector('#bk-main') || document.querySelector('#bd') || document.body;
    return `${root.innerText}|${[...root.querySelectorAll('[class], [aria-pressed], [data-state]')]
      .map((el) => `${el.tagName}:${el.className}:${el.getAttribute('aria-pressed')}:${el.getAttribute('data-state')}:${el.textContent}`)
      .join('|')}`;
  });
}

async function testMove(frame, isTouch) {
  const arcade = await frame.evaluate(() => Boolean(window.Arcade?.test?.G));
  if (arcade) {
    const canvas = frame.locator('canvas').first();
    if (isTouch) await canvas.tap({ timeout: 1500 });
    else await canvas.click({ timeout: 1500 });
    await frame.waitForFunction(() => window.Arcade?.test?.G?.state === 'playing', null, { timeout: 1500 });
    const before = await frame.evaluate(() => window.Arcade.test.G.t);
    await frame.evaluate(() => window.Arcade.test.tap('Space', 4));
    const after = await frame.evaluate(() => window.Arcade.test.G.t);
    return after > before ? ok('Arcade test input advanced the game loop') : fail('Arcade input did not advance the game loop');
  }

  const before = await signature(frame);
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
    if (await signature(frame) !== before) return ok(`Move changed the board via ${selector}`);
  }

  await frame.locator('body').press('ArrowRight').catch(() => {});
  await frame.waitForTimeout(180);
  return await signature(frame) !== before ? ok('Keyboard input changed the board') : fail('No board move observed after cell and keyboard input');
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

    result.input = await testMove(frame, viewport.hasTouch);

    try {
      await page.waitForFunction(() => window.__smokeApexEvents?.some((event) => event.eventType === 'session_start'), null, { timeout: 3000 });
      result.session_start = ok('session_start reached the host within 3 s of the first game input');
    } catch {
      result.session_start = fail('No session_start message reached the host within 3 s of the first game input');
    }

    try {
      const family = await frame.evaluate(() => window.Arcade?.game ? 'arcade' : window.Board?.shell ? 'board' : 'standalone');
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

    if (isArcade) {
      await frame.locator('.bar [data-a="pause"]').click({ timeout: 1000 });
      const paused = await frame.evaluate(() => window.Arcade.test.G.state === 'paused');
      await frame.locator('.bar [data-a="pause"]').click({ timeout: 1000 });
      const resumed = await frame.evaluate(() => window.Arcade.test.G.state === 'playing');
      result['pause/resume'] = paused && resumed ? ok('Arcade pause and resume controls changed game state') : fail('Arcade pause or resume did not change game state');
    } else if (game.number === '30' || game.number === '42') {
      const boardSelector = game.number === '30' ? '#bd .cl' : '#bd .tl';
      const beforePause = await frame.locator(boardSelector).evaluateAll((nodes) => nodes.map((node) => `${node.textContent}:${node.getAttribute('class')}:${node.getAttribute('style')}`).join('|'));
      await frame.getByRole('button', { name: 'Pause', exact: true }).click({ timeout: 1000 });
      await frame.waitForFunction(() => document.querySelector('#bk-dlg')?.open && document.querySelector('#bk-dlg h2')?.textContent === 'Paused', null, { timeout: 1000 });
      await frame.locator('#bk-dlg').getByRole('button', { name: 'Resume', exact: true }).click({ timeout: 1000 });
      await frame.waitForFunction(() => !document.querySelector('#bk-dlg')?.open, null, { timeout: 1000 });
      const afterPause = await frame.locator(boardSelector).evaluateAll((nodes) => nodes.map((node) => `${node.textContent}:${node.getAttribute('class')}:${node.getAttribute('style')}`).join('|'));
      result['pause/resume'] = beforePause === afterPause
        ? ok('Game Frame pause/resume kept the board state intact')
        : fail('Pause/resume changed the board state');
    } else {
      const pauseControl = frame.getByRole('button', { name: /pause/i }).first();
      result['pause/resume'] = await pauseControl.count()
        ? fail('Pause control found but this runner has no verified pause state for this game')
        : fail('Game has no pause/resume control');
    }

    await page.locator('#playable-theater-modal button[title="Theater settings"]').click({ timeout: 1000 });
    let arcadeTick = null;
    if (isArcade) arcadeTick = await frame.evaluate(() => {
      const gameState = window.Arcade.test.G;
      if (gameState.state !== 'playing') gameState.restart(true);
      return gameState.t;
    });
    await page.locator('#theater-settings select').selectOption('lite', { timeout: 1000 });
    try {
      if (isArcade && await frame.evaluate(() => window.Arcade.test.G.state !== 'playing')) {
        await frame.locator('.bar [data-a="pause"]').click({ timeout: 1000 });
      }
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
        } else if (window.Board?.modal) {
          window.Board.modal('Game over', 'Final score 321');
        } else {
          // Mahjong owns its inline lifecycle and closes sessions on pagehide.
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
