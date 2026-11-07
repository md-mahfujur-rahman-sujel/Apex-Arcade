import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
const page = await context.newPage();
const errors = [];

async function openTheater(gameId) {
  await page.evaluate((id) => { location.hash = `#/game/${id}`; }, gameId);
  await page.getByRole('button', { name: 'Play now' }).click();
  const theater = page.locator('#playable-theater-modal');
  await theater.waitFor({ state: 'visible' });
  await page.getByRole('button', { name: `Play ${gameId === 'flappy-bird' ? 'Glowmoth Gauntlet' : gameId === '2048' ? 'Merge 2048' : 'Ion Rally'}`, exact: true }).click();
  return theater;
}

// The lobby's Play is the front door: it starts the run through the game's own
// beginning animation, so a test waits for that animation to hand the screen to
// the live game instead of clicking Play a second time inside the frame.
async function waitUntilRunning() {
  await page.locator('#playable-theater-modal [data-theater-loading]').waitFor({ state: 'detached', timeout: 20000 });
  await page.waitForFunction(() => {
    const frame = document.querySelector('#playable-theater-modal iframe');
    const menu = frame?.contentDocument?.querySelector('.apex-menu-root');
    return frame?.contentWindow?.ApexIntroRunning !== true && (!menu || menu.hidden);
  }, null, { timeout: 20000 });
}

// The game page draws the pause panel and the lobby's second door reveals that
// same page menu, so every pause assertion looks inside the frame and checks the
// host never stacks a second screen over it.
const theaterFrame = page.frameLocator('#playable-theater-modal iframe');
const frameMenu = theaterFrame.locator('.apex-menu-root:not([hidden])');
const framePause = theaterFrame.getByRole('dialog', { name: /pause menu$/ });
const hostPauseCount = () => page.locator('#playable-theater-modal [data-pause-overlay]').count();

try {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.addInitScript(() => {
    localStorage.clear();
    window.__theaterPad = { connected: true, buttons: Array.from({ length: 16 }, () => ({ pressed: false })), axes: [0, 0] };
    Object.defineProperty(navigator, 'getGamepads', { configurable: true, value: () => [window.__theaterPad] });
  });
  await page.goto(`${origin}/#/game/flappy-bird`);

  let theater = await openTheater('flappy-bird');
  assert.equal(await theater.getAttribute('data-theme'), 'dark');
  assert.equal(await theater.getAttribute('data-touch-mode'), 'virtual');
  assert.equal(await page.locator('[data-theater-bar] button[title="Restart Game"]').count(), 0, 'the header no longer duplicates Restart game');
  assert.equal(await page.locator('[data-theater-bar] button[aria-label="Theater settings"]').count(), 0, 'the header no longer carries a settings menu button');
  assert.equal(await page.locator('[data-theater-bar]').getByRole('button', { name: 'easy', exact: true }).count(), 0, 'difficulty is only customizable from the menu options');
  assert.equal(await page.locator('#playable-theater-stage').evaluate((stage) => getComputedStyle(stage).backgroundColor), 'rgb(5, 6, 13)', 'the theater stage remains dark');
  await waitUntilRunning();
  await page.waitForFunction(() => {
    const button = document.querySelector('#playable-theater-modal button[aria-label="Pause game"]');
    return button instanceof HTMLButtonElement && !button.disabled;
  });
  await page.locator('[data-touch-controller] [data-touch-pause="true"]').click();
  await framePause.waitFor();
  assert.equal(await hostPauseCount(), 0, 'the touch pause button opens the game page panel, not a second host screen');
  const livePad = page.getByRole('button', { name: 'Toggle Virtual Touch Controls' });
  const liveBefore = await livePad.getAttribute('aria-pressed');
  await livePad.click();
  assert.notEqual(await livePad.getAttribute('aria-pressed'), liveBefore, 'the remaining header controls stay live while the page pause panel is up');
  await livePad.click();
  await framePause.getByRole('button', { name: 'Resume game', exact: true }).click();
  await framePause.waitFor({ state: 'hidden' });

  // Gamepad Start funnels into that same single panel through the host.
  const pad = async (index, pressed) => {
    await page.evaluate(({ index, pressed }) => { window.__theaterPad.buttons[index].pressed = pressed; }, { index, pressed });
    await page.waitForTimeout(120);
  };
  await pad(9, true);
  await framePause.waitFor();
  assert.equal(await framePause.count(), 1, 'gamepad Start opens exactly one pause screen');
  assert.equal(await hostPauseCount(), 0, 'gamepad Start adds no host pause screen over the page panel');
  await pad(9, false);
  await pad(9, true);
  await framePause.waitFor({ state: 'hidden' });
  await pad(9, false);
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal iframe')?.contentWindow?.ApexGamePaused === false);
  await page.waitForTimeout(250);
  assert.equal(await hostPauseCount(), 0, 'gamepad Start resumes without immediately re-pausing');

  // The theater sheet lost its header button; the pause panel is its door now.
  await page.keyboard.press('Escape');
  await framePause.waitFor();
  await framePause.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.locator('#theater-settings').waitFor();
  const theaterVolume = page.getByRole('slider', { name: 'Theater volume' });
  assert.equal(await theaterVolume.inputValue(), '0.8');
  await theaterVolume.press('ArrowLeft');
  assert.equal(await theaterVolume.inputValue(), '0.75', 'the theater volume control applies live');
  for (const label of ['CRT filter', 'Pixel-perfect scaling', 'Ambient glow']) {
    const checkbox = page.getByRole('checkbox', { name: label });
    await checkbox.check();
    const attr = label === 'CRT filter' ? 'data-crt' : label === 'Pixel-perfect scaling' ? 'data-pixel-perfect' : 'data-ambient-glow';
    await page.waitForFunction(({ attr }) => document.querySelector('#playable-theater-modal')?.getAttribute(attr) === 'true', { attr });
  }
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('apex:theater-display:flappy-bird')));
  assert.deepEqual(stored, { crt: true, pixelPerfect: true, ambientGlow: true }, 'all display modes persist for the game');
  assert.notEqual(await page.locator('#playable-theater-stage').evaluate((stage) => getComputedStyle(stage, '::after').content), 'none', 'CRT scanlines render live');
  assert.equal(await page.locator('#playable-theater-modal iframe').evaluate((frame) => getComputedStyle(frame).imageRendering), 'pixelated', 'pixel-perfect scaling renders live');
  assert.notEqual(await page.locator('#playable-theater-stage').evaluate((stage) => getComputedStyle(stage).boxShadow), 'none', 'ambient glow renders live');

  // Verify touch controls emit the game's configured Space key.
  // Back returns the pause panel to its place instead of resuming the run.
  await page.getByRole('button', { name: 'Back to pause', exact: true }).click();
  await page.locator('#theater-settings').waitFor({ state: 'hidden' });
  await framePause.waitFor({ state: 'visible' });
  await framePause.getByRole('button', { name: 'Resume game', exact: true }).click();
  await framePause.waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    const frame = document.querySelector('#playable-theater-modal iframe');
    frame.contentWindow.__touchKeyboardEvents = [];
    frame.contentWindow.__touchKeys = [];
    frame.contentWindow.addEventListener('keydown', (event) => {
      frame.contentWindow.__touchKeyboardEvents.push({ key: event.key, code: event.code });
      frame.contentWindow.__touchKeys.push(event.key);
    });
  });
  const flap = page.getByRole('button', { name: 'Flap (Space)' });
  await flap.tap();
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal iframe')?.contentWindow.__touchKeyboardEvents.some((event) => event.key === ' ' && event.code === 'Space'));
  assert.ok(await page.locator('#playable-theater-modal iframe').evaluate((frame) => frame.contentWindow.__touchKeys.includes(' ')), 'touch key reaches the iframe game keyboard handler');

  // D-pad navigation changes theater focus and A activates a focused control.
  const padToggle = page.getByRole('button', { name: 'Toggle Virtual Touch Controls' });
  const padBefore = await padToggle.getAttribute('aria-pressed');
  await padToggle.focus();
  await page.evaluate(() => { window.__theaterPad.buttons[13].pressed = true; });
  await page.waitForFunction(() => document.activeElement?.getAttribute('title') !== 'Toggle Virtual Touch Controls');
  await page.evaluate(() => { window.__theaterPad.buttons[13].pressed = false; });
  await padToggle.focus();
  await page.evaluate(() => { window.__theaterPad.buttons[0].pressed = true; });
  await page.waitForFunction((before) => document.querySelector('#playable-theater-modal [title="Toggle Virtual Touch Controls"]')?.getAttribute('aria-pressed') !== before, padBefore);
  await page.evaluate(() => { window.__theaterPad.buttons[0].pressed = false; });
  await padToggle.click();
  assert.equal(await padToggle.getAttribute('aria-pressed'), padBefore, 'A activates the focused header control and a second press restores it');

  // Fullscreen request state follows browser fullscreenchange, including exit.
  await page.evaluate(() => {
    const root = document.querySelector('#playable-theater-modal').firstElementChild;
    Object.defineProperty(document, 'fullscreenElement', { configurable: true, get: () => window.__fakeFullscreen || null });
    root.requestFullscreen = async () => { window.__fakeFullscreen = root; document.dispatchEvent(new Event('fullscreenchange')); };
    document.exitFullscreen = async () => { window.__fakeFullscreen = null; document.dispatchEvent(new Event('fullscreenchange')); };
  });
  await page.getByRole('button', { name: 'Toggle Fullscreen' }).click();
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal [title="Toggle Fullscreen"]')?.getAttribute('aria-pressed') === 'true');
  await page.getByRole('button', { name: 'Toggle Fullscreen' }).click();
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal [title="Toggle Fullscreen"]')?.getAttribute('aria-pressed') === 'false');

  await page.getByRole('button', { name: 'Close Theater' }).click();
  theater = await openTheater('flappy-bird');
  assert.equal(await theater.getAttribute('data-crt'), 'true', 'display settings restore when the game opens again');
  assert.equal(await theater.getAttribute('data-pixel-perfect'), 'true');
  assert.equal(await theater.getAttribute('data-ambient-glow'), 'true');
  await page.getByRole('button', { name: 'Close Theater' }).click();

  await openTheater('pong');
  assert.equal(await page.locator('#playable-theater-modal').getAttribute('data-touch-mode'), 'virtual');
  await page.getByRole('button', { name: 'Close Theater' }).click();
  await openTheater('2048');
  assert.equal(await page.locator('#playable-theater-modal').getAttribute('data-touch-mode'), 'virtual', '2048 exposes the shared controller alongside native swipes');
  assert.equal(await page.getByRole('button', { name: 'Toggle Virtual Touch Controls' }).count(), 1, 'native touch game can toggle the shared controller');
  await page.getByRole('button', { name: 'Close Theater' }).click();

  await page.goto(`${origin}/#/browse`);
  await page.locator('#catalog [data-game-id]').first().waitFor();
  const gameIds = await page.locator('#catalog [data-game-id]').evaluateAll((cards) => cards.map((card) => card.getAttribute('data-game-id')));
  assert.equal(gameIds.length, 50, 'browse exposes all 50 game records for config checks');
  for (const gameId of gameIds) {
    await page.evaluate((id) => { location.hash = `#/game/${id}`; }, gameId);
    await page.locator(`[data-game-page="${gameId}"]`).waitFor();
    await page.getByRole('button', { name: 'Play now' }).click();
    const gameTheater = page.locator('#playable-theater-modal');
    await gameTheater.waitFor({ state: 'visible' });
    assert.equal(await gameTheater.getAttribute('data-touch-mode'), 'virtual', `${gameId} receives the shared touch controller`);
    await gameTheater.locator('[data-ui-open]').click();
    const gameFrame = gameTheater.frameLocator('iframe');
    await waitUntilRunning();
    const controls = gameTheater.locator('[data-touch-layout] button');
    assert.equal(await gameTheater.locator('[data-touch-layout]').getAttribute('data-touch-layout'), gameId, `${gameId} uses its own controller profile`);
    const layout = await page.locator('#playable-theater-modal iframe, #playable-theater-stage canvas').first().evaluate((surface) => {
      const controller = document.querySelector('[data-touch-controller]');
      const frameBox = surface.getBoundingClientRect();
      const controllerBox = controller.getBoundingClientRect();
      return { surfaceBottom: frameBox.bottom, controllerTop: controllerBox.top };
    });
    assert.ok(layout.controllerTop >= layout.surfaceBottom - 1, `${gameId} controller dock sits below the game screen: ${JSON.stringify(layout)}`);
    const firstAction = gameTheater.locator('[data-touch-action]:not(:disabled)').first();
    const hasAction = await firstAction.count() > 0;
    const stick = gameTheater.locator('[data-touch-stick]:not(:disabled)').first();
    const hasStick = await stick.count() > 0;
    const testedControl = hasAction ? firstAction : stick;
    await testedControl.waitFor();
    const isPointerAction = hasAction
      ? (await firstAction.getAttribute('data-touch-pointer')) === 'true'
      : hasStick && (await stick.getAttribute('data-touch-cursor')) === 'true';
    await page.locator('#playable-theater-modal iframe').evaluate((frame) => {
      frame.contentWindow.__touchEvents = [];
      frame.contentWindow.addEventListener('keydown', (event) => frame.contentWindow.__touchEvents.push({ type: 'keydown', key: event.key, code: event.code }));
      frame.contentDocument.addEventListener('pointerdown', () => frame.contentWindow.__touchEvents.push({ type: 'pointerdown' }));
      frame.contentDocument.addEventListener('pointermove', () => frame.contentWindow.__touchEvents.push({ type: 'pointermove' }));
      frame.contentDocument.addEventListener('click', () => frame.contentWindow.__touchEvents.push({ type: 'click' }));
    });
    const actionLabel = await testedControl.getAttribute('aria-label');
    if (hasAction) {
      await testedControl.tap();
    } else {
      // The shared pad now uses one analog stick: drag it off-centre to prove
      // the deflection reaches the game as a key or pointer move.
      const box = await stick.boundingBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      const dirs = ((await stick.getAttribute('data-touch-dirs')) || '').split(',').filter(Boolean);
      const dir = dirs[0] || 'right';
      const vec = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[dir];
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx + vec[0] * box.width * 0.4, cy + vec[1] * box.height * 0.4, { steps: 5 });
    }
    await page.waitForFunction((pointerAction) => {
      const events = document.querySelector('#playable-theater-modal iframe')?.contentWindow.__touchEvents || [];
      return pointerAction
        ? events.some((event) => event.type === 'pointerdown' || event.type === 'pointermove' || event.type === 'click')
        : events.some((event) => event.type === 'keydown');
    }, isPointerAction, { timeout: 2500 }).catch(() => { throw new Error(`${gameId} controller action ${actionLabel} did not reach the game frame`); });
    if (!hasAction) await page.mouse.up();
    assert.ok(await controls.count() >= 2, `${gameId} exposes its configured controls and pause button`);
    assert.equal(await page.getByRole('button', { name: 'Toggle Virtual Touch Controls' }).count(), 1, `${gameId} can toggle the shared controller`);
    await page.getByRole('button', { name: 'Close Theater' }).click();
  }

  // The lobby's second door reveals the waiting page's own menu, so modes and
  // skins come from the renderer the game already ships.
  await page.evaluate(() => { location.hash = '#/game/tetris'; });
  await page.getByRole('button', { name: 'Play now' }).click();
  await page.waitForFunction(() => {
    const door = document.querySelector('#playable-theater-modal [data-theater-menu]');
    return door instanceof HTMLButtonElement && !door.disabled;
  }, null, { timeout: 20000 });
  await page.locator('#playable-theater-modal [data-theater-menu]').click();
  await page.locator('#playable-theater-modal [data-theater-loading]').waitFor({ state: 'detached' });
  await frameMenu.waitFor({ state: 'visible' });
  const revealed = await page.locator('#playable-theater-modal iframe').evaluate((element) => ({ opacity: getComputedStyle(element).opacity, inert: element.inert }));
  assert.equal(revealed.opacity, '1', 'the menu door reveals the game page');
  assert.equal(revealed.inert, false, 'the revealed page menu is interactive');
  const doorActions = await theaterFrame.locator('[data-menu-action]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-menu-action')));
  assert.ok(doorActions.includes('modes') && doorActions.includes('customize'), `the page menu keeps its modes and skins doors: ${doorActions}`);
  await theaterFrame.locator('[data-menu-action="modes"]').click();
  await theaterFrame.getByRole('heading', { name: 'Choose a mode' }).waitFor();
  await theaterFrame.locator('[data-menu-back]').click();
  await theaterFrame.locator('[data-menu-action="customize"]').click();
  await theaterFrame.getByRole('heading', { name: 'Customize', exact: true }).waitFor();
  await theaterFrame.locator('[data-menu-back]').click();
  // Play from that menu still starts the run through its beginning animation.
  await theaterFrame.locator('[data-menu-action="play"]').click();
  await waitUntilRunning();

  // Escape owns pause for iframe games, and every panel action routes correctly.
  await page.keyboard.press('Escape');
  await framePause.waitFor();
  assert.equal(await hostPauseCount(), 0, 'Escape pauses with the game page panel alone');
  for (const label of ['Resume game', 'Restart game', 'Options', 'Settings', 'How to play', 'Exit game']) {
    assert.equal(await framePause.getByRole('button', { name: label, exact: true }).count(), 1, `the page pause panel offers ${label}`);
  }
  await framePause.getByRole('button', { name: 'Options', exact: true }).click();
  await theaterFrame.getByRole('tab', { name: 'Accessibility' }).waitFor();
  // Difficulty has no header switch anymore; the menu owns it and tells the host.
  await theaterFrame.getByRole('tab', { name: 'Gameplay' }).click();
  await theaterFrame.getByLabel('Difficulty', { exact: true }).selectOption('hard');
  await page.getByText('Hard: 1.35x Speed · 1.25x Score!', { exact: true }).waitFor();
  await theaterFrame.getByLabel('Difficulty', { exact: true }).selectOption('normal');
  await page.getByText('Normal: 1.0x Speed', { exact: true }).waitFor();
  await theaterFrame.locator('[data-menu-back]').click();
  await framePause.getByRole('button', { name: 'Restart game', exact: true }).click();
  await framePause.waitFor({ state: 'hidden' });
  // Restart keeps the run live in place, so the next Escape pauses it again.
  await page.waitForFunction(() => document.querySelector('#playable-theater-modal iframe')?.contentWindow?.ApexGamePaused === false, null, { timeout: 20000 });
  await page.keyboard.press('Escape');
  await framePause.waitFor();
  await framePause.getByRole('button', { name: 'Exit game', exact: true }).click();
  await page.locator('#playable-theater-modal').waitFor({ state: 'detached' });
  assert.equal(await page.getByRole('button', { name: 'Play now' }).count(), 1, 'Exit game returns to the game page');

  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS one game-owned pause panel for touch, gamepad and Escape, per-game touch input, live persisted display modes, fullscreen synchronization, and every panel action');
  console.log('PASS the loading card Modes & skins door reveals the page menu and its Play starts the run');
  console.log('PASS all 50 game records select their configured native or virtual touch layout');
  console.log('PASS zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
