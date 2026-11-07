import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const distRoot = path.resolve('dist');
const base = server.config.base;
const gamesSource = await readFile(path.resolve('src', 'data', 'gamesData.ts'), 'utf8');
const folderById = new Map();
{
  let pendingId = null;
  for (const match of gamesSource.matchAll(/^ {4}(id|htmlPath): '([^']+)',$/gm)) {
    if (match[1] === 'id') pendingId = match[2];
    else if (pendingId) { folderById.set(pendingId, match[2].split('/')[3]); pendingId = null; }
  }
}
const gameUrl = (gameId) => {
  const folder = folderById.get(gameId);
  assert.ok(folder, `${gameId} resolves to a standalone game page`);
  return `${origin}${base}assets/games/${folder}/index.html`;
};
/* The theater's Play now starts the run, so the in-frame menu only appears on a
   standalone game page. A bare same-origin host keeps the menu's Exit contract
   testable: it records what the page posts upward and closes when asked. */
const MENU_HOST_PATH = `${base}menu-host.html`;
const MENU_HOST_PAGE = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Menu host</title></head>
<body style="margin:0;background:#101014">
<iframe id="host-frame" style="width:100vw;height:100vh;border:0"></iframe>
<script>
window.__hostMessages = [];
window.addEventListener('message', function (event) {
  var data = event.data;
  if (!data || typeof data.type !== 'string') return;
  window.__hostMessages.push(data.type);
  if (data.type === 'MENU_EXIT') document.getElementById('host-frame').remove();
});
document.getElementById('host-frame').src = new URLSearchParams(location.search).get('src');
</script>
</body></html>`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, serviceWorkers: 'block' });
const page = await context.newPage();
const errors = [];
await context.route(`${origin}/**`, async (route) => {
  const url = new URL(route.request().url());
  const pathname = decodeURIComponent(url.pathname);
  if (pathname === MENU_HOST_PATH) return route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body: MENU_HOST_PAGE });
  const relativePath = pathname.startsWith('/Apex-Arcade/') ? pathname.slice('/Apex-Arcade'.length) : pathname;
  const filePath = path.resolve(distRoot, `.${relativePath}`);
  if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) return route.fulfill({ status: 403, body: 'Forbidden' });
  try {
    const info = await stat(filePath);
    const resolved = info.isDirectory() ? path.join(filePath, 'index.html') : filePath;
    const contentType = ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json; charset=utf-8', '.svg': 'image/svg+xml' })[path.extname(resolved).toLowerCase()] || 'application/octet-stream';
    return route.fulfill({ status: 200, contentType, body: await readFile(resolved) });
  } catch { return route.fulfill({ status: 404, body: `Not found: ${url.pathname}` }); }
});
await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
page.on('pageerror', (error) => errors.push(error.message));
page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
await page.addInitScript(() => {
  if (location.pathname === '/') localStorage.clear();
  window.__menuTestPad = { connected: false, buttons: Array.from({ length: 16 }, () => ({ pressed: false })), axes: [0, 0] };
  Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__menuTestPad] });
  if (window.AudioContext) {
    const NativeAudioContext = window.AudioContext;
    window.__menuAudioContexts = [];
    window.AudioContext = function (...args) {
      const audioContext = new NativeAudioContext(...args);
      window.__menuAudioContexts.push(audioContext);
      return audioContext;
    };
    window.AudioContext.prototype = NativeAudioContext.prototype;
  }
});

/* The menu this suite guards is the one a player boots a game page into, so every
   case opens the standalone page directly. */
async function openGame(gameId, title) {
  await page.goto(gameUrl(gameId));
  await page.locator('.apex-menu-root').waitFor({ state: 'visible' });
  assert.ok(await page.locator('.apex-menu-root').getAttribute('data-menu-game'), `${title} mounts its own menu`);
  await page.waitForFunction(() => {
    const link = document.getElementById('apex-menu-kit-styles');
    return !!(link && link.sheet);
  });
  return page;
}

async function openHostedGame(gameId, title) {
  await page.goto(`${origin}${MENU_HOST_PATH}?src=${encodeURIComponent(gameUrl(gameId))}`);
  const frame = page.frames().find((candidate) => candidate.url().includes('/assets/games/'));
  assert.ok(frame, `${title} game page is hosted in a frame`);
  await frame.locator('.apex-menu-root').waitFor({ state: 'visible' });
  return frame;
}

async function pressPad(frame, button) {
  await frame.evaluate((index) => { window.__menuTestPad.buttons[index].pressed = true; }, button);
  await page.waitForTimeout(100);
  await frame.evaluate((index) => { window.__menuTestPad.buttons[index].pressed = false; }, button);
  await page.waitForTimeout(100);
}

try {
  const glowmoth = await openGame('flappy-bird', 'Glowmoth Gauntlet');
  const menu = glowmoth.locator('.apex-menu-root');
  assert.equal(await menu.getAttribute('data-menu-archetype'), 'banner');
  assert.equal(await menu.evaluate((root) => getComputedStyle(root).position), 'fixed');
  await menu.getByRole('button', { name: 'Play', exact: true }).focus();
  await page.keyboard.press('ArrowDown');
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'customize', 'arrow keys move menu focus to Customize');
  await page.keyboard.press('ArrowDown');
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'options', 'arrow keys continue through the menu');
  await page.keyboard.press('Enter');
  await menu.getByRole('tab', { name: 'Audio' }).waitFor();
  await page.keyboard.press('Escape');
  await menu.getByRole('button', { name: 'Play', exact: true }).waitFor();

  await menu.getByRole('button', { name: 'Play', exact: true }).focus();
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'play', 'main menu action receives focus before gamepad input');
  await glowmoth.evaluate(() => { window.__menuTestPad.connected = true; });
  await pressPad(glowmoth, 13);
  await glowmoth.waitForFunction(() => document.querySelector('.apex-menu-root')?.ownerDocument.activeElement?.dataset.menuAction === 'customize', null, { timeout: 1200 }).catch(() => {});
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'customize', 'gamepad d-pad moves menu focus');
  await pressPad(glowmoth, 13);
  await glowmoth.waitForFunction(() => document.querySelector('.apex-menu-root')?.ownerDocument.activeElement?.dataset.menuAction === 'options', null, { timeout: 1200 }).catch(() => {});
  assert.equal(await menu.evaluate((root) => root.ownerDocument.activeElement.dataset.menuAction), 'options', 'gamepad d-pad continues through the menu');
  await pressPad(glowmoth, 0);
  await menu.getByRole('tab', { name: 'Audio' }).waitFor();
  await pressPad(glowmoth, 1);
  await menu.getByRole('button', { name: 'Play', exact: true }).waitFor();
  await glowmoth.evaluate(() => { window.__menuTestPad.connected = false; });
  console.log('PASS Glowmoth keyboard and gamepad navigation, activation, and Back');

  await menu.getByRole('button', { name: 'Options', exact: true }).click();
  await menu.getByRole('tab', { name: 'Accessibility' }).click();
  const reduceMotion = menu.getByRole('switch', { name: 'Reduce motion' });
  if (await reduceMotion.isChecked()) await reduceMotion.uncheck();
  await reduceMotion.check();
  await glowmoth.waitForFunction(() => window.Save?.load('glowmoth')?.settings?.reduceMotion === true);
  assert.equal(await menu.getAttribute('data-reduced-motion'), 'true', 'reduced motion updates the menu styling state');
  const scene = await glowmoth.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:fixed;left:0;top:0;width:120px;height:80px';
    document.body.appendChild(canvas);
    const frames = [];
    const controller = Fx.menuScene(canvas, (ctx, frame) => { frames.push({ static: frame.static, reducedMotion: frame.reducedMotion }); }, {
      gameId: 'menu-gate-probe',
      fallback: (ctx, frame) => { frames.push({ static: frame.static, reducedMotion: frame.reducedMotion, fallback: true }); }
    });
    controller.setReducedMotion(true);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    const profile = controller.profile();
    controller.destroy(); canvas.remove();
    return { profile, frames };
  });
  assert.equal(scene.profile.static, true, 'reduced-motion scene renders as a still');
  assert.equal(scene.profile.reducedMotion, true);
  assert.ok(scene.frames.some((frame) => frame.fallback && frame.static), 'reduced-motion scene uses its static fallback');
  await menu.getByRole('button', { name: 'Back', exact: true }).click();
  console.log('PASS reduced-motion preference persists and scene fallback renders a static frame');

  await menu.getByRole('button', { name: 'Options', exact: true }).click();
  await page.waitForFunction(() => (window.__menuAudioContexts || []).some((context) => context.state === 'running'));
  console.log('PASS gesture unlocks the menu Web Audio context');

  const ticTacToe = await openGame('tic-tac-toe', 'Tic-Tac-Toe');
  assert.equal(await ticTacToe.locator('.apex-menu-root').getAttribute('data-menu-archetype'), 'paper');
  assert.ok(await ticTacToe.locator('.apex-menu-root .apex-menu-action').count() >= 5);
  console.log('PASS Tic-Tac-Toe Paper and Ink pilot launches its menu');

  const merge = await openGame('2048', 'Merge 2048');
  const mergeMenu = merge.locator('.apex-menu-root');
  assert.equal(await mergeMenu.getAttribute('data-menu-archetype'), 'glass');
  await mergeMenu.getByRole('button', { name: 'Play', exact: true }).click();
  // Play gates the run behind the beginning animation: the board only becomes
  // reachable once that hand is passed to the game.
  await merge.waitForFunction(() => window.ApexIntroRunning !== true, null, { timeout: 20000 });
  const intro = merge.locator('#bk-dlg');
  if (await intro.count() && await intro.evaluate((dialog) => dialog.open)) await intro.locator('button').first().click();
  await merge.locator('#bd .tl').first().waitFor({ state: 'visible' });
  await merge.locator('body').press('ArrowRight');
  await merge.waitForTimeout(180);
  const savedBoard = await merge.locator('#bd .tl').evaluateAll((tiles) => tiles.map((tile) => `${tile.textContent}:${tile.style.left}:${tile.style.top}`).sort().join('|'));
  assert.ok(savedBoard, 'Merge 2048 creates a saved active run');

  const resumed = await openGame('2048', 'Merge 2048');
  const resumedMenu = resumed.locator('.apex-menu-root');
  await resumedMenu.getByRole('button', { name: 'Continue Run', exact: true }).click();
  await resumed.waitForFunction(() => window.ApexIntroRunning !== true, null, { timeout: 20000 });
  await resumed.locator('#bd .tl').first().waitFor({ state: 'visible' });
  const resumedBoard = await resumed.locator('#bd .tl').evaluateAll((tiles) => tiles.map((tile) => `${tile.textContent}:${tile.style.left}:${tile.style.top}`).sort().join('|'));
  assert.equal(resumedBoard, savedBoard, 'Continue Run restores the saved tile positions and values');
  console.log('PASS Merge 2048 Continue Run restores the saved board');

  const exitFrame = await openHostedGame('flappy-bird', 'Glowmoth Gauntlet');
  await exitFrame.locator('.apex-menu-root').getByRole('button', { name: 'Exit', exact: true }).click();
  await page.waitForFunction(() => document.getElementById('host-frame') === null, null, { timeout: 5000 });
  assert.ok(await page.evaluate(() => window.__hostMessages.includes('MENU_EXIT')), 'menu Exit tells its host to close');
  console.log('PASS menu Exit hands the close back to its host');

  const mahjong = await openGame('mahjong', 'Jade Table');
  await mahjong.locator('[data-menu-action="play"]').click();
  await mahjong.waitForFunction(() => window.ApexIntroRunning !== true, null, { timeout: 20000 });
  for (const pair of await mahjong.evaluate(() => solution.map((ids) => ids.slice()))) {
    for (const id of pair) await mahjong.locator(`.mj-tile[data-id="${id}"]`).click();
  }
  await mahjong.locator('#bk-dlg').waitFor({ state: 'visible' });
  await mahjong.locator('#bk-dlg').press('Escape');
  await mahjong.locator('#bk-dlg').waitFor({ state: 'hidden' });
  assert.equal(await mahjong.evaluate(() => Board.paused()), false, 'Escape in a game result does not pause the run');
  assert.equal(await mahjong.locator('.apex-menu-root').evaluate((root) => root.hidden), true, 'Escape in a game result does not open the menu');
  await mahjong.locator('#mj-new').click();
  const freshPair = await mahjong.evaluate(() => availablePairs()[0].map((t) => t.id));
  for (const id of freshPair) await mahjong.locator(`.mj-tile[data-id="${id}"]`).click();
  assert.equal(await mahjong.evaluate(() => pairs), 1);
  console.log('PASS Escape dismisses the game result without trapping pause');

  for (const mobile of [false, true]) {
    const standalone = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, hasTouch: mobile });
    try {
      const game = await standalone.newPage();
      game.on('pageerror', (error) => errors.push(error.message));
      const activate = async (locator, options = {}) => mobile ? locator.tap(options) : locator.click(options);
      for (const folder of ['46-nuts-bolts', '47-colour-sort', '48-fruit-merge', '49-table-tennis', '50-mahjong']) {
        await game.goto(`${origin}${server.config.base}assets/games/${folder}/index.html`);
        await activate(game.locator('[data-menu-action="play"]'));
        // Play gates the run behind the game's beginning animation; Esc during that
        // animation only skips it, so wait for the run to be live before pausing.
        await game.waitForFunction(() => window.ApexIntroRunning !== true, null, { timeout: 20000 });
        for (let cycle = 0; cycle < 2; cycle++) {
          await game.locator('body').press('Escape');
          assert.equal(await game.evaluate(() => Board.paused()), true, folder + ' pauses the native engine');
          await activate(game.getByRole('button', { name: 'Restart game', exact: true }));
          await game.locator('.apex-menu-root').waitFor({ state: 'hidden' });
          assert.equal(await game.evaluate(() => Board.paused()), false, folder + ' Restart unpauses the native engine');
          assert.notEqual(await game.locator('#bk-main').evaluate((el) => getComputedStyle(el).pointerEvents), 'none', folder + ' accepts pointer input');
          if (folder.startsWith('46')) {
            const point = await game.evaluate(() => planks.flatMap((p, i) => p.h.filter((h) => h.on && !p.gone && !blocked(i, h)).map((h) => sp(p, h)))[0]);
            const position = await game.locator('#cv').evaluate((el, p) => ({ x: p.x * el.clientWidth / 480, y: p.y * el.clientHeight / 640 }), point);
            await activate(game.locator('#cv'), { position });
            assert.equal(await game.evaluate(() => runBolts), 1, 'a real click removes a bolt after Restart');
          } else if (folder.startsWith('47')) {
            const pair = await game.evaluate(() => {
              for (let a = 0; a < tubes.length; a++) {
                if (!tubes[a].length) continue;
                for (let b = 0; b < tubes.length; b++) if (a !== b && tubes[b].length < cap && (!tubes[b].length || tubes[b].at(-1) === tubes[a].at(-1))) return [a, b];
              }
            });
            for (const id of pair) await activate(game.locator(`.tb[data-i="${id}"]`));
            assert.equal(await game.evaluate(() => moves), 1, 'a real pour works after Restart');
          } else if (folder.startsWith('48')) {
            await activate(game.locator('#cv'));
            assert.equal(await game.evaluate(() => fr.length), 1, 'a real fruit drop works after Restart');
          } else if (folder.startsWith('49')) {
            await activate(game.locator('#cv'));
            assert.equal(await game.evaluate(() => state), 'rally', 'a real serve works after Restart');
          } else {
            const pair = await game.evaluate(() => availablePairs()[0].map((t) => t.id));
            for (const id of pair) await activate(game.locator(`.mj-tile[data-id="${id}"]`));
            assert.equal(await game.evaluate(() => pairs), 1, 'a real tile match works after Restart');
          }
        }
      }
      console.log(`PASS ${mobile ? 'touch' : 'mouse'} pause/Restart twice and real gameplay in games 46–50`);
    } finally { await standalone.close(); }
  }

  assert.deepEqual(errors, [], `browser errors: ${errors.join('; ')}`);
  console.log('PASS menu pilot gate checks completed with zero browser errors');
} finally {
  await context.close();
  await browser.close();
  await server.close();
}
