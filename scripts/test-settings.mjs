import assert from 'node:assert/strict';
import { access, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const root = process.cwd();
const distRoot = path.resolve(root, 'dist');
await access(path.join(distRoot, 'index.html'));
const chromePath = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const browserOptions = { headless: true };
if (await access(chromePath).then(() => true, () => false)) browserOptions.executablePath = chromePath;
const browser = await chromium.launch(browserOptions);
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.route('http://127.0.0.1:4173/**', async (route) => {
    const pathname = decodeURIComponent(new URL(route.request().url()).pathname);
    const filePath = path.resolve(distRoot, `.${pathname}`);
    if (filePath !== distRoot && !filePath.startsWith(`${distRoot}${path.sep}`)) {
      await route.fulfill({ status: 403, body: 'Forbidden' });
      return;
    }
    try {
      const info = await stat(filePath);
      const resolvedPath = info.isDirectory() ? path.join(filePath, 'index.html') : filePath;
      const contentType = ({ '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml' })[path.extname(resolvedPath)] || 'application/octet-stream';
      await route.fulfill({ status: 200, contentType, body: await readFile(resolvedPath) });
    } catch {
      await route.fulfill({ status: 404, body: `Not found: ${pathname}` });
    }
  });
  await context.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/#/settings');
  await page.locator('[data-settings-page]').waitFor({ state: 'visible' });

  await page.locator('[data-settings-page] select').nth(0).selectOption('dark');
  await page.locator('[data-settings-page] select').nth(1).selectOption('deutan');
  await page.getByLabel('Reduce motion').check();
  await page.locator('[data-settings-page] select').nth(2).selectOption('lite');
  await page.locator('[data-settings-page] input[type=range]').nth(0).fill('0.35');
  await page.locator('[data-settings-page] input[type=range]').nth(1).fill('0.6');
  await page.getByLabel('CRT effect').check();
  const prefs = await page.evaluate(() => JSON.parse(localStorage.getItem('apex:preferences:v1')));
  assert.equal(prefs.theme, 'dark');
  assert.equal(prefs.colourBlindPalette, 'deutan');
  assert.equal(prefs.reducedMotion, true);
  assert.equal(prefs.particleLevel, 'lite');
  assert.equal(prefs.musicVolume, 0.35);
  assert.equal(prefs.sfxVolume, 0.6);
  assert.equal(prefs.displayModes.crt, true);
  await page.reload();
  await page.locator('[data-settings-page]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-settings-page] select').nth(0).inputValue(), 'dark');
  assert.equal(await page.locator('[data-settings-page] select').nth(1).inputValue(), 'deutan');
  assert.equal(await page.locator('[data-settings-page] input[type=range]').nth(0).inputValue(), '0.35');

  await page.goto('http://127.0.0.1:4173/#/quests');
  await page.locator('[data-quests-page]').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-quests-page] section[aria-label="Today"] h3').count(), 3);
  assert.equal(await page.locator('[data-quests-page] section[aria-label="This week"] h3').count(), 2);

  await page.goto('http://127.0.0.1:4173/#/collections');
  await page.locator('[data-collections-page]').waitFor({ state: 'visible' });
  assert.ok(await page.locator('[data-collections-page] button.w-full').count() >= 3);
  await page.locator('[data-collections-page] button.w-full').first().click();
  assert.ok(await page.locator('[data-collections-page] button').filter({ hasText: 'Play' }).count() > 0);

  await page.goto('http://127.0.0.1:4173/#/settings');
  await page.locator('[data-settings-page]').waitFor({ state: 'visible' });

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export save' }).click();
  assert.equal((await download).suggestedFilename(), 'apex-arcade-save.json');

  const importBundle = {
    format: 'apex-arcade-profile', version: 1,
    stats: { totalPlayCount: 4, totalTimeSeconds: 90, favorites: ['pong'] },
    localData: {
      'apex:preferences:v1': JSON.stringify({ ...prefs, colourBlindPalette: 'tritan' }),
      'apex:meta': JSON.stringify({ xp: 90, sparks: 9 }),
      'apex:save:test-game': JSON.stringify({ schemaVersion: 3 }),
    },
  };
  await page.locator('input[type=file]').setInputFiles({
    name: 'profile.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(importBundle)),
  });
  await page.getByRole('status').getByText('Save imported.').waitFor({ state: 'visible' });
  assert.equal(await page.locator('[data-settings-page] select').nth(1).inputValue(), 'tritan');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('apex_arcade_stats_v2')).totalPlayCount), 4);
  assert.ok(await page.evaluate(() => localStorage.getItem('apex:save:test-game')));

  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Reset progress' }).click();
  assert.equal(await page.evaluate(() => localStorage.getItem('apex:meta')), null);
  assert.equal(await page.evaluate(() => localStorage.getItem('apex:save:test-game')), null);
  assert.equal(await page.locator('[data-settings-page] select').nth(1).inputValue(), 'tritan');

  await context.close();
  console.log('PASS Settings persist and profile export, import, and progress reset work in the production UI.');
} finally {
  await browser.close();
}
