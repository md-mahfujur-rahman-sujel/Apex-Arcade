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
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
try {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });

  await page.goto(`${origin}/#/game/tic-tac-toe`);
  await page.getByRole('button', { name: /play now/i }).click();
  await page.locator('#playable-theater-modal button[data-ui-open]').click();
  const tic = page.frameLocator('#playable-theater-modal iframe');
  await tic.locator('[data-menu-action="play"], [data-menu-action="continue"]').first().click({ timeout: 5000 });
  await tic.locator('.apex-menu-root').waitFor({ state: 'hidden' });
  await tic.locator('#bd .cl').first().waitFor({ state: 'visible' });
  await tic.locator('#bd .cl.free').first().click();
  const ticPage = page.frames().find((frame) => frame.url().includes('30-tic-tac-toe.html'));
  await ticPage.waitForFunction(() => document.querySelector('#st')?.textContent?.includes('your turn'), null, { timeout: 5000 });
  const ticBefore = await tic.locator('#bd .cl').evaluateAll((cells) => cells.map((cell) => `${cell.textContent}:${cell.className}`).join('|'));
  await ticPage.locator('body').press('Escape');
  await page.getByRole('dialog', { name: 'Game paused' }).waitFor();
  await ticPage.waitForFunction(() => window.ApexGamePaused === true);
  await ticPage.waitForTimeout(200);
  const ticPaused = await tic.locator('#bd .cl').evaluateAll((cells) => cells.map((cell) => `${cell.textContent}:${cell.className}`).join('|'));
  assert.equal(ticPaused, ticBefore, 'Tic-Tac-Toe board stays frozen while the theater is paused');
  await page.getByRole('dialog', { name: 'Game paused' }).getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('dialog', { name: 'Game paused' }).waitFor({ state: 'detached' });
  await ticPage.waitForFunction(() => window.ApexGamePaused === false);
  const ticAfter = await tic.locator('#bd .cl').evaluateAll((cells) => cells.map((cell) => `${cell.textContent}:${cell.className}`).join('|'));
  assert.equal(ticAfter, ticBefore, 'Tic-Tac-Toe resumes with the same board and turn state');
  assert.equal(await ticPage.evaluate(() => Boolean(document.querySelector('#bk-dlg')?.open)), false);
  console.log('PASS Tic-Tac-Toe theater pause freezes and resumes with the board and turn state intact');

  await page.goto(`${origin}/#/game/2048`);
  await page.getByRole('button', { name: /play now/i }).click();
  await page.locator('#playable-theater-modal button[data-ui-open]').click();
  const merge = page.frameLocator('#playable-theater-modal iframe');
  await merge.locator('[data-menu-action="play"], [data-menu-action="continue"]').first().click({ timeout: 5000 });
  await merge.locator('.apex-menu-root').waitFor({ state: 'hidden' });
  await merge.locator('#bd').waitFor({ state: 'visible' });
  const mergePage = page.frames().find((frame) => frame.url().includes('42-2048.html'));
  const intro = merge.locator('#bk-dlg');
  if (await intro.count() && await intro.evaluate((dialog) => dialog.open)) await intro.locator('button').first().click();
  await mergePage.locator('body').press('ArrowRight');
  await mergePage.waitForTimeout(220);
  const signature = async () => merge.locator('#bd .tl').evaluateAll((tiles) => tiles.map((tile) => `${tile.textContent}:${tile.style.left}:${tile.style.top}`).join('|'));
  const mergeBefore = await signature();
  assert.ok(mergeBefore, 'Merge 2048 begins with visible tiles');
  await mergePage.locator('body').press('Escape');
  await page.getByRole('dialog', { name: 'Game paused' }).waitFor();
  await mergePage.waitForFunction(() => window.ApexGamePaused === true);
  await mergePage.waitForTimeout(220);
  assert.equal(await signature(), mergeBefore, 'Merge 2048 freezes tile positions and values while paused');
  await page.getByRole('dialog', { name: 'Game paused' }).getByRole('button', { name: 'Resume', exact: true }).click();
  await page.getByRole('dialog', { name: 'Game paused' }).waitFor({ state: 'detached' });
  await mergePage.waitForFunction(() => window.ApexGamePaused === false);
  assert.equal(await signature(), mergeBefore, 'Merge 2048 resumes with the same tile positions and values');
  assert.equal(await mergePage.evaluate(() => Boolean(document.querySelector('#bk-dlg')?.open)), false);
  console.log('PASS Merge 2048 theater pause freezes tile positions and values; zero browser errors');

  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  const mobilePage = await mobileContext.newPage();
  mobilePage.on('pageerror', (error) => errors.push(error.message));
  mobilePage.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await mobilePage.goto(`${origin}/#/game/2048`);
  await mobilePage.getByRole('button', { name: /play now/i }).click();
  await mobilePage.locator('#playable-theater-modal button[data-ui-open]').click();
  await mobilePage.locator('#playable-theater-modal iframe').waitFor({ state: 'visible' });
  await mobilePage.waitForFunction(() => document.querySelector('#playable-theater-modal iframe')?.contentDocument?.readyState === 'complete');
  const mobileMerge = mobilePage.frames().find((frame) => frame.url().includes('42-2048.html'));
  assert.ok(mobileMerge, '2048 iframe loads in touch viewport');
  await mobileMerge.locator('[data-menu-action="play"], [data-menu-action="continue"]').first().click({ timeout: 5000 });
  await mobileMerge.locator('.apex-menu-root').waitFor({ state: 'hidden' });
  const mobileIntro = mobileMerge.locator('#bk-dlg');
  if (await mobileIntro.count() && await mobileIntro.evaluate((dialog) => dialog.open)) await mobileIntro.locator('button').first().click();
  assert.equal(await mobilePage.getByRole('button', { name: 'Up' }).count(), 0, 'Direct-swipe game omits the overlapping theater d-pad');

  const swipeSignature = async () => mobileMerge.locator('#bd .tl').evaluateAll((tiles) => tiles.map((tile) => `${tile.textContent}:${tile.style.left}:${tile.style.top}`).join('|'));
  let swipeChangedBoard = false;
  // Try vertical swipes first: a synthetic left-to-right touch in Chrome's
  // mobile emulation can be claimed by the browser as a history gesture.
  for (const direction of ['up', 'down', 'left', 'right']) {
    const beforeSwipe = await swipeSignature();
    const boardRect = await mobileMerge.locator('#bd').boundingBox();
    assert.ok(boardRect, 'Mobile game board has visible bounds');
    // boundingBox() inside the iframe's frame is already relative to the page
    // viewport, so dispatch touches at the board box directly.
    const from = {
      x: boardRect.x + boardRect.width * (direction === 'left' ? 0.78 : direction === 'right' ? 0.22 : 0.5),
      y: boardRect.y + boardRect.height * (direction === 'up' ? 0.78 : direction === 'down' ? 0.22 : 0.5),
    };
    const to = {
      x: boardRect.x + boardRect.width * (direction === 'left' ? 0.22 : direction === 'right' ? 0.78 : 0.5),
      y: boardRect.y + boardRect.height * (direction === 'up' ? 0.22 : direction === 'down' ? 0.78 : 0.5),
    };
    const cdp = await mobileContext.newCDPSession(mobilePage);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: to.x, y: to.y, id: 1 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mobileMerge.waitForTimeout(220);
    if (await swipeSignature() !== beforeSwipe) { swipeChangedBoard = true; break; }
  }
  assert.ok(swipeChangedBoard, 'A mobile touch swipe changes the 2048 board');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS Merge 2048 native touch swipe changes the board; virtual controls do not cover actions; zero browser errors');
  await mobileContext.close();
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
