import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../public/assets/kits/save-kit.js', import.meta.url), 'utf8');

function createHarness({ blocked = false, quota = false, seed = {} } = {}) {
  const values = new Map(Object.entries(seed));
  const storage = {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { if (blocked) throw new Error('blocked'); return values.has(String(key)) ? values.get(String(key)) : null; },
    setItem(key, value) {
      if (blocked || (quota && key !== '__apex_storage_probe__')) throw new Error('unavailable');
      values.set(String(key), String(value));
    },
    removeItem(key) { if (blocked) throw new Error('blocked'); values.delete(String(key)); },
  };
  const window = { localStorage: storage, events: [], dispatchEvent(event) { this.events.push(event); } };
  class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
  vm.runInNewContext(source, { window, CustomEvent, JSON, Math, Object, Array, Number, String, isNaN, parseInt });
  return { Save: window.Save, storage, values };
}

// Rule 1: keep the original v2 bytes once, before replacing the canonical record.
const originalV2 = JSON.stringify({ v: 2, level: 7, stars: { '1': 3 }, unlocks: ['first'], achievements: ['bronze'], settings: { musicVol: 0.25, colorblind: 'deutan' }, stats: { bestScore: 88 } });
const migration = createHarness({ seed: { 'apex:save:glowmoth': originalV2 } });
const upgraded = migration.Save.load('glowmoth');
assert.equal(migration.storage.getItem('apex:save:glowmoth:backup-v2'), originalV2, 'v2 raw backup is exact');
assert.equal(upgraded.v, 3);
assert.equal(upgraded.level, 7);
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.stars)), { '1': 3 });
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.unlocks)), ['first']);
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.achievements)), ['bronze']);
assert.equal(upgraded.settings.musicVol, 0.25);
assert.equal(upgraded.settings.colorblind, 'deutan');
assert.equal(upgraded.stats.bestScore, 88);
assert.equal(upgraded.settings.difficulty, 'normal');
assert.equal(upgraded.settings.particles, 'standard');
assert.equal(upgraded.settings.shake, 1);
assert.equal(upgraded.settings.textScale, 1);
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.settings.assist)), {});
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.settings.bindings)), {});
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.modes)), { classic: { best: 0, plays: 0 } });
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.cosmetics)), { owned: [], equipped: {} });
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.daily)), { day: '', best: 0 });
assert.deepEqual(JSON.parse(JSON.stringify(upgraded.history)), []);
migration.storage.setItem('apex:save:glowmoth', JSON.stringify({ v: 2, level: 99 }));
migration.Save.load('glowmoth');
assert.equal(migration.storage.getItem('apex:save:glowmoth:backup-v2'), originalV2, 'existing backup is never overwritten');
console.log('PASS v2 backup once, v3 defaults, and existing values preserved');

// Rule 3: corrupt input is replaced with defaults while its exact text stays exportable.
const malformed = '{"level":broken';
const corrupt = createHarness({ seed: { 'apex:save:broken': malformed } });
const recovered = corrupt.Save.load('broken');
assert.equal(recovered.v, 3);
assert.equal(recovered.level, 1);
assert.equal(corrupt.storage.getItem('apex:save:broken:corrupt'), malformed);
console.log('PASS corrupt raw text retained and valid defaults restored');

// Rule 4: plain v2 imports and v3 exports/imports both remain supported, including archives.
const sourceSaves = createHarness({ seed: {
  'apex:save:old-game': JSON.stringify({ v: 2, level: 4, settings: { musicVol: 0.4 }, stats: { bestScore: 17 } }),
  'apex:save:broken:corrupt': malformed,
  'apex:save:legacy:backup-v2': originalV2,
} });
sourceSaves.Save.update('new-game', { v: 3, level: 9, cosmetics: { owned: ['ember'] }, stats: { bestScore: 31 } });
const exported = sourceSaves.Save.exportAll();
const exportData = JSON.parse(exported);
assert.equal(exportData['old-game'].v, 3);
assert.equal(exportData['new-game'].v, 3);
assert.equal(exportData.__apexSaveArchive.broken.corrupt, malformed);
assert.equal(exportData.__apexSaveArchive.legacy.backupV2, originalV2);
const imported = createHarness();
assert.equal(imported.Save.importAll(exported), 2);
assert.equal(imported.Save.load('old-game').level, 4);
assert.equal(imported.Save.load('old-game').settings.musicVol, 0.4);
assert.equal(imported.Save.load('new-game').level, 9);
assert.deepEqual(JSON.parse(JSON.stringify(imported.Save.load('new-game').cosmetics.owned)), ['ember']);
assert.equal(imported.storage.getItem('apex:save:broken:corrupt'), malformed);
assert.equal(imported.storage.getItem('apex:save:legacy:backup-v2'), originalV2);
const plainV2 = createHarness();
assert.equal(plainV2.Save.importAll(JSON.stringify({ 'plain-v2': { v: 2, level: 5 } })), 1);
assert.equal(plainV2.Save.load('plain-v2').level, 5);
assert.equal(plainV2.Save.load('plain-v2').v, 3);
console.log('PASS v2/v3 import-export round trip and raw archive round trip');

// Rule 5: blocked and full storage remain usable through the in-memory fallback.
const offline = createHarness({ blocked: true });
assert.doesNotThrow(() => offline.Save.update('offline', { stats: { bestScore: 12 } }));
assert.equal(offline.Save.load('offline').stats.bestScore, 12);
const full = createHarness({ quota: true, seed: { 'apex:save:full': JSON.stringify({ v: 2, level: 3 }) } });
assert.doesNotThrow(() => full.Save.load('full'));
full.Save.update('full', { stats: { bestScore: 22 } });
assert.equal(full.Save.load('full').v, 3);
assert.equal(full.Save.load('full').level, 3);
assert.equal(full.Save.load('full').stats.bestScore, 22);
console.log('PASS blocked/full storage keeps read-write behavior in memory');

console.log('All five Save v3 migration rules passed.');
