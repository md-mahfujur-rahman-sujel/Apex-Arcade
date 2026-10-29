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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
const errors = [];
try {
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`HTTP ${response.status()} ${response.url()}`); });
  await page.goto(`${origin}/#/browse`);
  await page.locator('[data-game-id]').first().waitFor();
  const countStatus = page.locator('[data-result-count]');
  const assertCountMatchesCards = async () => {
    const text = await countStatus.textContent();
    const match = text?.match(/Showing (\d+) of (\d+) games/);
    assert.ok(match, `count is present: ${text}`);
    assert.equal(Number(match[1]), await page.locator('#catalog [data-game-id]').count(), 'displayed count matches rendered results');
    return Number(match[1]);
  };
  assert.equal(await assertCountMatchesCards(), 50);
  assert.ok(await page.locator('#game-search-suggestions option').count() > 0, 'search suggestions are available');

  const facets = [
    ['Mode', 'Classic', 'mode'],
    ['Session length', 'short', 'len'],
    ['Players', '1P', 'players'],
    ['Input', 'keyboard', 'input'],
    ['Tag', 'logic', 'tag'],
  ];
  for (const [label, value, param] of facets) {
    if (label === 'Players' || label === 'Session length') {
      await page.getByLabel(`${label} facet`).selectOption(value);
    } else {
      const details = page.locator(`#${label.toLowerCase().replace(/\s+/g, '-')}-facet`);
      await details.locator('summary').click();
      await details.getByLabel(`Search ${label.toLowerCase()}`).fill(value);
      await details.getByRole('button', { name: new RegExp(`^${value}`, 'i') }).first().click();
    }
    await page.waitForFunction(({ param, value }) => new URLSearchParams(location.hash.split('?')[1]).get(param) === value, { param, value });
    await assertCountMatchesCards();
  }
  const search = page.getByPlaceholder('Search title, genre, rules…');
  await search.fill('2048');
  await page.waitForFunction(() => new URLSearchParams(location.hash.split('?')[1]).get('q') === '2048');
  assert.ok(await page.locator('#game-search-suggestions option').evaluateAll((options) => options.some((option) => option.value.includes('2048'))), 'suggestions include the matching game');
  assert.equal(await assertCountMatchesCards(), 1, 'combined facets narrow results to Merge 2048');
  assert.equal(await page.locator('#catalog [data-game-id]').getAttribute('data-game-id'), '2048');

  const stateBeforeReload = await page.evaluate(() => ({ hash: location.hash, count: document.querySelector('[data-result-count]')?.textContent }));
  await page.reload();
  await page.locator('#catalog [data-game-id]').first().waitFor();
  for (const [label, value] of [['Mode', 'Classic'], ['Input', 'keyboard'], ['Tag', 'logic']]) {
    assert.equal(await page.locator(`#${label.toLowerCase()}-facet summary`).getAttribute('aria-label'), `${label} filter: ${value}`);
  }
  assert.equal(await page.getByLabel('Session length facet').inputValue(), 'short');
  assert.equal(await page.getByLabel('Players facet').inputValue(), '1P');
  assert.equal(await search.inputValue(), '2048');
  assert.deepEqual(await page.evaluate(() => ({ hash: location.hash, count: document.querySelector('[data-result-count]')?.textContent })), stateBeforeReload, 'query and result count round-trip on reload');
  await assertCountMatchesCards();
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS Browse mode, session length, players, input, tag, and search facets each return a visible result count');
  console.log('PASS Search suggestions work and combined facets round-trip through the URL after reload with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
