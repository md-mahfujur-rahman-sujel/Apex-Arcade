import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { chromium } from 'playwright';
import { preview } from 'vite';
import { createApexEventRateLimiter, normalizeApexEvent } from '../src/services/apexEvent.ts';

const v1 = normalizeApexEvent({ type: 'APEX_EVENT', gameId: 'legacy-id', eventType: 'score', score: 25 });
assert.equal(v1?.v, undefined, 'legacy messages without v remain valid');
assert.equal(v1?.score, 25);
assert.equal(normalizeApexEvent({ type: 'APEX_EVENT', gameId: 'legacy-id', eventType: 'mode_start' }), null, 'v1 cannot claim v2-only events');

const v2 = normalizeApexEvent({
  type: 'APEX_EVENT', v: 2, gameId: 'glowmoth', eventType: 'result', mode: 'classic', difficulty: 'hard',
  seed: 20261022, score: 1_000_000_001, level: 100_001, durationSec: 90_000,
  result: { win: true, score: 1_000_000_001, best: 70, stats: { combo: 4 } },
  cosmetic: { slot: 'skin', id: 'ember' }, timestamp: 1761120000000,
});
assert.equal(v2?.v, 2);
assert.equal(v2?.eventType, 'result');
assert.equal(v2?.score, 1e9, 'score clamps at 1e9');
assert.equal(v2?.level, 100_000, 'level clamps at 100,000');
assert.equal(v2?.durationSec, 86_400, 'duration clamps at one day');
assert.equal(v2?.result?.score, 1e9);
assert.deepEqual(v2?.cosmetic, { slot: 'skin', id: 'ember' });

const badMessages = [
  null,
  { type: 'OTHER', v: 2, gameId: 'game', eventType: 'score' },
  { type: 'APEX_EVENT', v: 3, gameId: 'game', eventType: 'score' },
  { type: 'APEX_EVENT', v: 2, gameId: 'game', eventType: 'unknown' },
  { type: 'APEX_EVENT', v: 2, gameId: 'game', eventType: 'score', score: '10' },
  { type: 'APEX_EVENT', v: 2, gameId: 'game', eventType: 'score', score: Infinity },
  { type: 'APEX_EVENT', v: 2, gameId: 'game', eventType: 'level_complete', level: 1.5 },
  { type: 'APEX_EVENT', v: 2, gameId: 'x'.repeat(65), eventType: 'score' },
  { type: 'APEX_EVENT', v: 2, gameId: 'game', eventType: 'achievement', achievementId: 'x'.repeat(65) },
  { type: 'APEX_EVENT', v: 2, gameId: 'game', eventType: 'result', result: { win: 'yes' } },
];
for (const message of badMessages) assert.equal(normalizeApexEvent(message), null, `invalid message must be dropped: ${String(message)}`);

const allow = createApexEventRateLimiter(20, 1000);
for (let i = 0; i < 20; i++) assert.equal(allow(5000), true, `event ${i + 1} inside cap is allowed`);
assert.equal(allow(5000), false, 'event 21 in the same second is ignored');
assert.equal(allow(6000), true, 'new one-second window resets the cap');
assert.equal(allow(4000), true, 'clock moving backwards safely starts a fresh window');
console.log('PASS APEX_EVENT v1/v2 validation, numeric clamps, invalid payload rejection, and rate limit');

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage();
const errors = [];
try {
  await page.addInitScript(() => { localStorage.removeItem('apex_arcade_stats_v2'); localStorage.removeItem('apex_arcade_stats_v1'); });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(`${origin}/#/game/flappy-bird`);
  await page.getByRole('button', { name: /play now/i }).click();
  await page.locator('#playable-theater-modal').waitFor({ state: 'visible' });
  await page.getByRole('button', { name: 'Play Glowmoth Gauntlet', exact: true }).click();
  await page.locator('#playable-theater-modal iframe').evaluate((iframe) => {
    window.__apexEvents = [];
    window.addEventListener('apex:game-event', (event) => window.__apexEvents.push(event.detail));
    const frame = iframe.contentWindow;
    const send = (value) => frame.eval(`parent.postMessage(${JSON.stringify(value)}, parent.location.origin)`);
    send({ type: 'APEX_EVENT', gameId: 'untrusted-id', eventType: 'score', score: 900 });
    send({ type: 'APEX_EVENT', v: 2, gameId: 'untrusted-id', eventType: 'score', mode: 'classic', difficulty: 'normal', seed: 20261022, score: 1000000001 });
    send({ type: 'APEX_EVENT', v: 2, gameId: 'untrusted-id', eventType: 'score', score: 'not-a-number' });
    send({ type: 'APEX_EVENT', v: 3, gameId: 'untrusted-id', eventType: 'score', score: 55 });
  });
  await page.waitForFunction(() => window.__apexEvents?.length === 2);
  const result = await page.evaluate(() => ({
    events: window.__apexEvents,
    stats: JSON.parse(localStorage.getItem('apex_arcade_stats_v2') || '{}'),
  }));
  assert.equal(result.events[0].v, undefined, 'host dispatches accepted legacy event');
  assert.equal(result.events[1].v, 2, 'host dispatches accepted v2 event');
  assert.equal(result.events[0].gameId, 'flappy-bird', 'host replaces informational game id with theater game id');
  assert.equal(result.stats.highScores['flappy-bird'], 1e9, 'clamped v2 score is stored against the mounted game');
  assert.equal(result.stats.highScores['untrusted-id'], undefined, 'message game id is never used as storage key');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS production host accepts v1/v2 iframe events, clamps and stores against the mounted game, and drops malformed payloads');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
