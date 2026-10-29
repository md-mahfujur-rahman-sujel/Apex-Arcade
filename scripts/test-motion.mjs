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

try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.clear());
  await page.goto(`${origin}/#/`);

  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const toMilliseconds = (raw) => {
      const value = raw.trim();
      const duration = Number.parseFloat(value);
      return value.endsWith('ms') ? duration : duration * 1000;
    };
    const easing = style.getPropertyValue('--apex-ease-standard').match(/cubic-bezier\(([^)]+)\)/)?.[1].split(',').map(Number);
    return {
      fast: toMilliseconds(style.getPropertyValue('--apex-motion-fast')),
      base: toMilliseconds(style.getPropertyValue('--apex-motion-base')),
      slow: toMilliseconds(style.getPropertyValue('--apex-motion-slow')),
      easing,
      utilityDuration: getComputedStyle(document.querySelector('header button')).transitionDuration,
    };
  });
  assert.deepEqual(tokens, {
    fast: 120,
    base: 220,
    slow: 420,
    easing: [0.2, 0, 0, 1],
    utilityDuration: '0.12s',
  }, 'the shared motion tokens expose the required durations and easing');

  const firstCard = page.locator('#catalog [data-catalog-card]').first();
  await firstCard.scrollIntoViewIfNeeded();
  await firstCard.evaluate((card) => {
    const rect = card.getBoundingClientRect();
    const pointer = { bubbles: true, clientX: rect.right - 1, clientY: rect.bottom - 1, relatedTarget: document.body };
    card.dispatchEvent(new MouseEvent('mouseover', pointer));
    card.dispatchEvent(new MouseEvent('mousemove', pointer));
  });
  const tilt = await firstCard.evaluate((card) => {
    const transform = (card).style.transform;
    return [...transform.matchAll(/rotate[XY]\((-?[\d.]+)deg\)/g)].map((match) => Number(match[1]));
  });
  assert.equal(tilt.length, 2, 'card hover applies both tilt axes');
  assert.ok(tilt.every((degrees) => Math.abs(degrees) <= 6), `card tilt stays within 6 degrees per axis: ${tilt}`);
  assert.match(await firstCard.evaluate((card) => card.style.transition), /var\(--apex-motion-(fast|base)\).*var\(--apex-ease-standard\)/);

  await page.evaluate(() => { location.hash = '#/browse'; });
  await page.waitForFunction(() => document.querySelector('[data-app-page="browse"]')?.getAnimations().some((animation) => animation.playState === 'running'));
  const routeDuration = await page.locator('[data-app-page="browse"]').evaluate((element) => Math.max(...element.getAnimations().map((animation) => Number(animation.effect?.getTiming().duration) || 0)));
  assert.ok(routeDuration <= 240 && routeDuration > 0, `route transition is within 240 ms (observed ${routeDuration} ms)`);

  await page.evaluate(() => { location.hash = '#/game/flappy-bird'; });
  await page.getByRole('button', { name: 'Play now' }).click();
  await page.getByRole('button', { name: 'Play Glowmoth Gauntlet', exact: true }).click();
  await page.getByRole('button', { name: 'Theater settings' }).click();
  const reducedMotion = page.getByRole('checkbox', { name: 'Reduced motion' });
  await reducedMotion.check();
  await page.waitForFunction(() => {
    const frame = document.querySelector('#playable-theater-modal iframe');
    return document.querySelector('#playable-theater-modal')?.getAttribute('data-apex-reduced-motion') === 'true'
      && frame?.contentDocument?.documentElement.getAttribute('data-apex-reduced-motion') === 'true'
      && frame.contentWindow.Save.load(frame.contentWindow.Arcade.G.cfg.id).settings.reduceMotion === true
      && frame.contentWindow.Fx.reducedMotion(frame.contentWindow.Arcade.G.cfg.id) === true;
  });
  assert.equal(await page.evaluate(() => localStorage.getItem('apex:reduced-motion:flappy-bird')), 'true', 'the per-game preference persists in the host');

  await reducedMotion.uncheck();
  await page.waitForFunction(() => {
    const frame = document.querySelector('#playable-theater-modal iframe');
    return !document.querySelector('#playable-theater-modal')?.hasAttribute('data-apex-reduced-motion')
      && frame?.contentDocument?.documentElement.getAttribute('data-apex-reduced-motion') === null
      && frame.contentWindow.Save.load(frame.contentWindow.Arcade.G.cfg.id).settings.reduceMotion === false
      && frame.contentWindow.Fx.reducedMotion(frame.contentWindow.Arcade.G.cfg.id) === false;
  });
  assert.equal(await page.evaluate(() => localStorage.getItem('apex:reduced-motion:flappy-bird')), 'false', 'turning reduced motion off persists for that game');

  await page.getByRole('button', { name: 'Close theater settings' }).click();
  const gameFrame = page.frameLocator('#playable-theater-modal iframe');
  const launchMenu = gameFrame.locator('.apex-menu-root');
  await launchMenu.locator('[data-menu-action="play"]').click();
  await launchMenu.waitFor({ state: 'hidden' });
  await page.keyboard.press('Escape');
  const pauseOverlay = page.locator('[data-pause-overlay]');
  await pauseOverlay.waitFor({ state: 'visible' });
  await pauseOverlay.getByRole('button', { name: 'Settings', exact: true }).click();
  const pauseReducedMotion = pauseOverlay.getByRole('checkbox', { name: 'Reduced motion' });
  await pauseReducedMotion.check();
  await page.waitForFunction(() => localStorage.getItem('apex:reduced-motion:flappy-bird') === 'true'
    && document.querySelector('#playable-theater-modal')?.getAttribute('data-apex-reduced-motion') === 'true');
  await pauseReducedMotion.uncheck();
  await page.waitForFunction(() => {
    const frame = document.querySelector('#playable-theater-modal iframe');
    return localStorage.getItem('apex:reduced-motion:flappy-bird') === 'false'
      && !document.querySelector('#playable-theater-modal')?.hasAttribute('data-apex-reduced-motion')
      && frame?.contentDocument?.documentElement.getAttribute('data-apex-reduced-motion') === null;
  });
  assert.equal(await gameFrame.locator('html').getAttribute('data-apex-reduced-motion'), null, 'the pause setting turns reduced motion off in its frame');
  await pauseOverlay.getByRole('button', { name: 'Back to pause' }).click();
  await pauseOverlay.getByRole('button', { name: 'Resume' }).click();
  await context.close();

  const reducedContext = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const reducedPage = await reducedContext.newPage();
  await reducedPage.goto(`${origin}/#/`);
  const systemPreference = await reducedPage.evaluate(() => ({
    matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    transition: getComputedStyle(document.querySelector('button')).transitionDuration,
    animation: getComputedStyle(document.querySelector('button')).animationDuration,
  }));
  assert.deepEqual(systemPreference, { matches: true, transition: '0s', animation: '0s' }, 'system reduced motion disables CSS transitions and animations');
  await reducedPage.evaluate(() => { location.hash = '#/browse'; });
  await reducedPage.waitForFunction(() => document.querySelector('[data-app-page="browse"]')?.getAnimations().every((animation) => Number(animation.effect?.getTiming().duration) === 0) ?? false);
  await reducedContext.close();

  console.log('PASS shared motion tokens, 220 ms route transition, <=6 degree card tilt, persistent per-game reduced motion, and system reduced-motion behavior');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
