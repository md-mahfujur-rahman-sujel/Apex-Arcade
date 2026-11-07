/* Contract + live check for the shared loading screen and the 50 per-game
   beginning animations. Run with: npm run test:intros */
import assert from 'node:assert/strict';
import { readFileSync, mkdirSync } from 'node:fs';
import { access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { preview } from 'vite';

const repo = path.resolve(import.meta.dirname, '..');
const read = (...parts) => readFileSync(path.join(repo, ...parts), 'utf8');

const introSource = read('public', 'assets', 'kits', 'intro-kit.js');
const bootstrapSource = read('public', 'assets', 'kits', 'menu-bootstrap.js');
const dataSource = read('src', 'data', 'gamesData.ts');

/* ---------- 1. the runtime keeps exactly one scene per game ---------- */

const scenes = [...introSource.matchAll(/^ {2}register\('([^']+)', \{([\s\S]*?)\n {2}}\);$/gm)];
const keys = scenes.map((match) => match[1]);
assert.equal(keys.length, 50, 'intro-kit registers one scene for each of the 50 games');
assert.equal(new Set(keys).size, 50, 'no two scenes share a registration key');
const durations = scenes.map((match) => Number(/duration: (\d+)/.exec(match[2])?.[1] || 0));
durations.forEach((duration, index) => {
  assert.ok(duration >= 1200 && duration <= 2600, `${keys[index]} runs between 1.2s and 2.6s`);
});

const transitions = scenes.map((match) => /transition: '([A-Za-z0-9]+)'/.exec(match[2])?.[1] || '');
transitions.forEach((transition, index) => assert.ok(transition, `${keys[index]} hands off with a named transition`));
assert.ok(new Set(transitions).size >= 10, 'the handoffs use at least ten distinct wipe styles');

// Two scenes only count as unique when their drawing code differs.
const bodies = scenes.map((match) => match[2].replace(/\s+/g, ' ').trim());
assert.equal(new Set(bodies).size, 50, 'every game animates a different subject');

/* ---------- 2. every shipped game resolves to one of those scenes ---------- */

const folderToRow = new Map(
  [...bootstrapSource.matchAll(/^ *\['([a-z0-9-]+)','([a-z0-9-]+)'/gm)].map((match) => [match[1], match[2]])
);
const games = [];
{
  let pendingId = null;
  for (const match of dataSource.matchAll(/^ {4}(id|htmlPath): '([^']+)',$/gm)) {
    if (match[1] === 'id') pendingId = match[2];
    else if (pendingId) { games.push({ id: pendingId, htmlPath: match[2] }); pendingId = null; }
  }
}
assert.equal(games.length, 50, 'gamesData still ships 50 playable games');

const folderOf = (game) => game.htmlPath.split('/')[3];

const introKeyOf = (game) => {
  const folder = folderOf(game);
  if (folderToRow.has(folder)) return folderToRow.get(folder);
  const page = read('public', 'assets', 'games', folder, 'index.html');
  const inline = /Menu\.mount\(\{\s*gameId: '([^']+)'/m.exec(page) || /GAME_ID\s*=\s*'([^']+)'/m.exec(page);
  return inline ? inline[1] : '';
};

const resolved = games.map((game) => ({ ...game, introKey: introKeyOf(game) }));
resolved.forEach(({ id, introKey }) => {
  assert.ok(introKey, `${id} publishes an intro key to the menu kit`);
  assert.ok(keys.includes(introKey), `${id} resolves to a scene that exists (${introKey})`);
});
assert.deepEqual(
  [...new Set(resolved.map((game) => game.introKey))].sort(),
  [...keys].sort(),
  'all 50 scenes are used and none is orphaned'
);

/* ---------- 3. live: loading screen, handoff, and start ---------- */

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const shotDir = path.join(tmpdir(), 'apex-intros');
mkdirSync(shotDir, { recursive: true });
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });

const sampleIds = ['flappy-bird', 'asteroids', 'street-fighter-ii', 'chess', 'pool', '2048', 'ludo'];
const sampleGames = sampleIds
  .map((id) => resolved.find((game) => game.id === id))
  .filter(Boolean);
assert.equal(sampleGames.length, sampleIds.length, 'the live sample covers arcade, action, board, sports and puzzle titles');

try {
  for (const game of sampleGames) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => { if (message.type() === 'error' && !message.location().url.includes('favicon')) errors.push(`${message.text()} @ ${message.location().url}`); });
    page.on('requestfailed', (request) => errors.push(`request failed: ${request.url()}`));

    await page.goto(`${origin}/#/game/${game.id}`);
    await page.getByRole('button', { name: /play now/i }).click();
    const modal = page.locator('#playable-theater-modal');
    await modal.waitFor();

    // The lobby is a real loading screen: the bar has to reach a completed boot.
    const lobby = modal.locator('[data-theater-loading]');
    await lobby.waitFor({ state: 'visible' });
    const bar = lobby.getByRole('progressbar');
    await page.waitForFunction(
      () => Number(document.querySelector('[data-theater-loading] [role="progressbar"]')?.getAttribute('aria-valuenow')) >= 100,
      null,
      { timeout: 20000 }
    );
    const title = await modal.locator('h3').first().innerText();
    assert.ok(title.trim().length > 2, `${game.id} shows its own name while loading`);
    const stage = await bar.getAttribute('aria-label');
    assert.equal(stage, `Loading ${title}`, `${game.id} labels its own loading bar`);

    const folder = folderOf(game);
    const frame = page.frames().find((candidate) => candidate.url().includes(`/${folder}/index.html`));
    assert.ok(frame, `${game.id} boots its own game page behind the lobby`);
    await frame.waitForSelector('.apex-menu-root:not([hidden])', { timeout: 20000 });
    assert.ok(
      await frame.evaluate((key) => Boolean(window.ApexIntro) && window.ApexIntro.has(key), game.introKey),
      `${game.id} loads the animation kit and keeps its own scene inside the frame`
    );

    // The lobby owns the screen while it lasts: the page boots behind it but
    // must not paint its menu through the loading card.
    const frameOpacity = () => page.locator('#playable-theater-modal iframe').evaluate((el) => getComputedStyle(el).opacity);
    assert.equal(await frameOpacity(), '0', `${game.id} keeps the game page invisible behind the lobby`);

    // The lobby's Play is the front door: it starts the run through the game's
    // own beginning animation, with no second click inside the frame.
    await modal.locator('button[data-ui-open]').click();
    const intro = frame.locator('.apex-intro-root');
    await intro.waitFor({ state: 'attached', timeout: 20000 });
    assert.equal(
      await intro.getAttribute('data-intro-key'),
      game.introKey,
      `${game.id} plays its own beginning animation from the lobby Play`
    );
    await lobby.waitFor({ state: 'detached' });
    assert.equal(await frameOpacity(), '1', `${game.id} shows the game once its animation takes over the frame`);
    await page.waitForTimeout(900);
    await page.screenshot({ path: path.join(shotDir, `${folder}-${game.introKey}.png`) });

    // The animation gates the run: the clock only starts as the scene wipes away.
    await intro.waitFor({ state: 'detached', timeout: 20000 });
    assert.equal(
      await frame.evaluate(() => window.ApexIntroRunning),
      false,
      `${game.id} opens the run as soon as its animation ends`
    );
    await frame.waitForSelector('.apex-menu-root[hidden]', { state: 'attached', timeout: 20000 });
    assert.equal(
      await frame.evaluate(() => document.querySelector('.apex-intro-root') === null),
      true,
      `${game.id} removes its animation before play continues`
    );
    await page.waitForTimeout(400);
    assert.deepEqual(errors, [], `${game.id} loads, animates and starts without browser errors`);
    console.log(`PASS ${game.id}: lobby progress, ${game.introKey} intro, clean handoff to play`);
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}

console.log(`PASS 50 unique intros wired, ${sampleGames.length} verified live (screenshots in ${shotDir})`);
