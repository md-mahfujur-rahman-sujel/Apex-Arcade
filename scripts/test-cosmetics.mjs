import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { chromium } from 'playwright';
import { preview } from 'vite';

const [saveSource, configSource, metaSource] = await Promise.all([
  readFile(new URL('../public/assets/aistudio/save-kit.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/assets/aistudio/meta-config.js', import.meta.url), 'utf8'),
  readFile(new URL('../public/assets/aistudio/meta-kit.js', import.meta.url), 'utf8'),
]);
const values = new Map([['apex:meta', JSON.stringify({ v: 1, sparks: 250 })]]);
const localStorage = {
  get length() { return values.size; },
  getItem(key) { return values.has(key) ? values.get(key) : null; },
  setItem(key, value) { values.set(String(key), String(value)); },
  removeItem(key) { values.delete(String(key)); },
  key(index) { return [...values.keys()][index] || null; },
};
const window = { localStorage, dispatchEvent() {} };
class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
const context = { window, CustomEvent, JSON, Math, Number, String, Array, Object, Date, isNaN, parseInt };
vm.runInNewContext(saveSource, context);
vm.runInNewContext(configSource, context);
vm.runInNewContext(metaSource, context);
assert.equal(window.Meta.getCosmetics('glowmoth').length, 16, 'game 01 has at least 15 catalog entries across four slots');
let result = window.Meta.purchaseCosmetic('glowmoth', 'glowmoth:ember');
assert.equal(result.ok, true);
assert.equal(result.sparks, 150);
assert.equal(window.Meta.purchaseCosmetic('glowmoth', 'glowmoth:ember').purchased, false, 'buying an owned cosmetic cannot charge twice');
assert.equal(window.Meta.purchaseCosmetic('glowmoth', 'glowmoth:comet-trail').reason, 'insufficient-sparks');
assert.equal(window.Meta.equipCosmetic('glowmoth', 'glowmoth:ember').ok, true);
assert.equal(window.Save.load('glowmoth').cosmetics.equipped.skin, 'glowmoth:ember');
assert.equal(window.Meta.purchaseCosmetic('glowmoth', 'glowmoth:aurora').reason, 'achievement-required');
window.Meta.recordAchievement({ gameId: 'glowmoth', id: 'gold-medal', rarity: 'epic' });
assert.equal(window.Meta.purchaseCosmetic('glowmoth', 'glowmoth:aurora').ok, true, 'achievement-unlocked cosmetics cost no Sparks');
console.log('PASS registry pricing, one-time purchase, insufficient balance, equip persistence, and achievement unlock');

const restarted = { window: { localStorage, dispatchEvent() {} }, CustomEvent, JSON, Math, Number, String, Array, Object, Date, isNaN, parseInt };
vm.runInNewContext(saveSource, restarted);
vm.runInNewContext(configSource, restarted);
vm.runInNewContext(metaSource, restarted);
const restored = restarted.window.Meta.getCosmetics('glowmoth');
assert.equal(restored.find((item) => item.id === 'glowmoth:ember')?.equipped, true, 'equipped cosmetic reloads from Save v3');
assert.equal(restored.find((item) => item.id === 'glowmoth:aurora')?.owned, true, 'purchase survives a fresh Meta/Save instance');
console.log('PASS cosmetic ownership and equipment survive reinitializing both shared kits');

const server = await preview({ preview: { host: '127.0.0.1', port: 0 } });
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const candidates = [process.env.CHROME_BIN, 'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].filter(Boolean);
let executablePath;
for (const candidate of candidates) { try { await access(candidate); executablePath = candidate; break; } catch { /* Try another installed browser. */ } }
const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage();
const errors = [];
try {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('__cosmetic-test-initialized')) {
      localStorage.setItem('apex:meta', JSON.stringify({ v: 1, sparks: 250 }));
      localStorage.removeItem('apex:save:glowmoth');
      localStorage.removeItem('apex_arcade_stats_v2');
      localStorage.removeItem('apex_arcade_stats_v1');
      sessionStorage.setItem('__cosmetic-test-initialized', '1');
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
  async function openGame() {
    await page.goto(`${origin}/#/game/flappy-bird`);
    await page.getByRole('button', { name: /play now/i }).click();
    await page.locator('#playable-theater-modal').waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Play Glowmoth Gauntlet', exact: true }).click();
    await page.frameLocator('#playable-theater-modal iframe').locator('canvas').first().waitFor({ state: 'visible' });
  }
  await openGame();
  const frame = page.frameLocator('#playable-theater-modal iframe');
  const menu = frame.locator('.apex-menu-root');
  await menu.locator('[data-menu-action="customize"]').click();
  await menu.getByRole('button', { name: 'Ember · 100 Sparks' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('apex:meta') || '{}').sparks === 150);
  await menu.getByRole('button', { name: 'Ember · Equip' }).click();
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('apex:save:glowmoth') || '{}').cosmetics?.equipped?.skin === 'glowmoth:ember');
  await menu.getByRole('button', { name: 'Ember · Equipped' }).waitFor();
  await menu.getByRole('button', { name: 'Back', exact: true }).click();
  await page.reload();
  await openGame();
  const restoredItems = await page.locator('#playable-theater-modal iframe').evaluate((iframe) => iframe.contentWindow.Meta.getCosmetics('glowmoth'));
  if (!restoredItems.find((item) => item.id === 'glowmoth:ember')?.equipped) throw new Error('Ember was not equipped after reloading the game page');
  if (errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('PASS Glowmoth launch-menu Customize buys Ember, equips it, and restores the equipped skin after a page reload with zero browser errors');
} finally {
  await browser.close();
  await new Promise((resolve) => server.httpServer.close(resolve));
}
