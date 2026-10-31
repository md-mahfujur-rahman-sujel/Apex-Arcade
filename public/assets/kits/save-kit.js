/* save-kit.js — universal persistence engine for Apex Arcade (Phase 1 Kit K1)
   Provides: window.Save singleton with Save.load(gameId), Save.update(gameId, patch), Save.reset(gameId)
   Persists schema v3 to key pattern 'apex:save:<gameId>' with in-memory sandbox fallbacks,
   legacy key migration ('arcade-hi-*', 'arcade-muted', 'apex:mute'), and 'apex:save' event broadcasting.
*/
(function () {
  'use strict';

  var Save = (window.Save = window.Save || {});

  var PREFIX = 'apex:save:';
  var memStore = {};
  var memOnly = {};
  var storageAvailable = null;

  /**
   * Safe probe for localStorage availability (handles incognito, sandboxed iframes, quota blocks).
   * @returns {boolean}
   */
  function isStorageAvailable() {
    if (storageAvailable !== null) return storageAvailable;
    try {
      var testKey = '__apex_storage_probe__';
      window.localStorage.setItem(testKey, '1');
      window.localStorage.removeItem(testKey);
      storageAvailable = true;
    } catch (e) {
      storageAvailable = false;
    }
    return storageAvailable;
  }

  function rawGet(key) {
    if (memOnly[key]) return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
    if (isStorageAvailable()) {
      try {
        return window.localStorage.getItem(key);
      } catch (e) {}
    }
    return Object.prototype.hasOwnProperty.call(memStore, key) ? memStore[key] : null;
  }

  function rawSet(key, value) {
    memStore[key] = value;
    if (isStorageAvailable()) {
      try { window.localStorage.setItem(key, value); delete memOnly[key]; return; } catch (e) { memOnly[key] = true; }
    } else {
      memOnly[key] = true;
    }
  }

  function rawRemove(key) {
    delete memStore[key];
    if (isStorageAvailable()) {
      try { window.localStorage.removeItem(key); delete memOnly[key]; return; } catch (e) { memOnly[key] = true; }
    } else {
      memOnly[key] = true;
    }
  }

  /**
   * Returns a fresh, cloneable schema v3 state object.
   * @returns {Object}
   */
  function createDefaultSchema() {
    return {
      v: 3,
      level: 1,
      stars: {},
      unlocks: [],
      achievements: [],
      settings: {
        musicVol: 0.8,
        sfxVol: 0.8,
        reduceMotion: false,
        colorblind: 'none', // 'none' | 'protan' | 'deutan' | 'tritan'
        difficulty: 'normal',
        particles: 'standard',
        shake: 1,
        textScale: 1,
        assist: {},
        bindings: {},
      },
      stats: {
        plays: 0,
        bestScore: 0,
        secondsPlayed: 0,
      },
      modes: { classic: { best: 0, plays: 0 } },
      cosmetics: { owned: [], equipped: {} },
      daily: { day: '', best: 0 },
      history: [],
    };
  }

  /**
   * Deeply merges a patch object into a target object.
   * - Arrays of primitives (strings/numbers) are unioned.
   * - Plain objects are recursively merged.
   * - Primitives overwrite target values.
   */
  function deepMerge(target, patch) {
    if (!patch || typeof patch !== 'object') return target;
    var keys = Object.keys(patch);
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var v = patch[k];
      if (Array.isArray(v)) {
        if (Array.isArray(target[k])) {
          var seen = {};
          var merged = [];
          var combined = target[k].concat(v);
          for (var j = 0; j < combined.length; j++) {
            var item = combined[j];
            var idKey = typeof item === 'object' && item !== null ? JSON.stringify(item) : String(item);
            if (!seen[idKey]) {
              seen[idKey] = true;
              merged.push(item);
            }
          }
          target[k] = merged;
        } else {
          target[k] = v.slice();
        }
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        if (!target[k] || typeof target[k] !== 'object' || Array.isArray(target[k])) {
          target[k] = {};
        }
        deepMerge(target[k], v);
      } else if (v !== undefined) {
        target[k] = v;
      }
    }
    return target;
  }

  /**
   * Inspects and migrates obsolete legacy storage keys:
   * - 'arcade-hi-<gameId>' -> stats.bestScore
   * - 'apex:mute' or 'arcade-muted' -> settings.musicVol = 0, settings.sfxVol = 0
   * @param {string} gameId
   * @param {Object} state
   * @returns {boolean} true if any legacy data was migrated
   */
  function migrateLegacyKeys(gameId, state) {
    var migrated = false;

    // 1. Check legacy high score
    var legacyHiKey = 'arcade-hi-' + gameId;
    var legacyHi = rawGet(legacyHiKey);
    if (legacyHi !== null && !isNaN(Number(legacyHi))) {
      var scoreVal = Math.max(0, parseInt(legacyHi, 10) || 0);
      if (scoreVal > state.stats.bestScore) {
        state.stats.bestScore = scoreVal;
        migrated = true;
      }
      rawRemove(legacyHiKey);
    }

    // 2. Check legacy mute status
    var legacyMute = rawGet('apex:mute') || rawGet('arcade-muted');
    if (legacyMute === '1' || legacyMute === 'true') {
      state.settings.musicVol = 0;
      state.settings.sfxVol = 0;
      migrated = true;
    }

    return migrated;
  }

  function emitSaveEvent(gameId, state) {
    try {
      if (typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(
          new CustomEvent('apex:save', {
            detail: { gameId: gameId, state: state },
          })
        );
      }
    } catch (e) {}
  }

  /**
   * Load state for gameId. Missing and v2 records are normalized to schema v3.
   * @param {string} gameId
   * @returns {Object}
   */
  Save.load = function (gameId) {
    if (!gameId) gameId = 'default';
    var key = PREFIX + gameId;
    var raw = rawGet(key);
    var state = createDefaultSchema();
    var dirty = raw === null, corrupt = false, parsed = null;

    if (raw !== null) {
      try {
        parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          if (parsed.v === 2 && rawGet(key + ':backup-v2') === null) rawSet(key + ':backup-v2', raw);
          state = deepMerge(createDefaultSchema(), parsed);
          state.v = 3;
          dirty = parsed.v !== 3;
        } else { corrupt = true; dirty = true; }
      } catch (e) { corrupt = true; dirty = true; }
    }
    if (corrupt && rawGet(key + ':corrupt') === null) rawSet(key + ':corrupt', raw);

    if (typeof state.stars !== 'object' || state.stars === null || Array.isArray(state.stars)) {
      state.stars = {}; // migrate legacy numeric stars to per-level map
      dirty = true;
    }
    // Always run legacy migration check if freshly generated or loaded
    if (migrateLegacyKeys(gameId, state)) {
      dirty = true;
    }

    if (dirty) {
      rawSet(key, JSON.stringify(state));
    }

    return state;
  };

  /**
   * Alias to Save.load
   */
  Save.get = function (gameId) {
    return Save.load(gameId);
  };

  /**
   * Deep merges patch into existing state, commits to storage, and dispatches 'apex:save'.
   * @param {string} gameId
   * @param {Object} patch
   * @returns {Object} updated state
   */
  Save.update = function (gameId, patch) {
    if (!gameId) gameId = 'default';
    var state = Save.load(gameId);
    deepMerge(state, patch);
    if (typeof state.stars !== 'object' || state.stars === null || Array.isArray(state.stars)) state.stars = {};
    state.v = 3;

    var key = PREFIX + gameId;
    rawSet(key, JSON.stringify(state));
    emitSaveEvent(gameId, state);
    return state;
  };

  /**
   * Resets gameId state back to initial v3 schema.
   * @param {string} gameId
   * @returns {Object} default state
   */
  Save.reset = function (gameId) {
    if (!gameId) gameId = 'default';
    var state = createDefaultSchema();
    var key = PREFIX + gameId;
    rawSet(key, JSON.stringify(state));
    emitSaveEvent(gameId, state);
    return state;
  };

  /**
   * Collects all save-kit records across all games.
   * @returns {Object.<string, Object>}
   */
  Save.getAll = function () {
    var all = {};
    if (isStorageAvailable()) {
      try {
        for (var i = 0; i < window.localStorage.length; i++) {
          var k = window.localStorage.key(i);
          if (k && k.indexOf(PREFIX) === 0 && !/:(backup-v2|corrupt)$/.test(k)) {
            var gid = k.slice(PREFIX.length);
            all[gid] = Save.load(gid);
          }
        }
      } catch (e) {}
    }
    // Include memory store
    for (var mk in memStore) {
      if (mk.indexOf(PREFIX) === 0 && !/:(backup-v2|corrupt)$/.test(mk)) {
        var mgid = mk.slice(PREFIX.length);
        if (!all[mgid]) all[mgid] = Save.load(mgid);
      }
    }
    return all;
  };

  /**
   * Exports all saves as a serialized JSON string.
   * @returns {string}
   */
  Save.exportAll = function () {
    var output = Save.getAll(), archives = {}, keys = {};
    if (isStorageAvailable()) {
      try { for (var i = 0; i < window.localStorage.length; i++) { var storageKey = window.localStorage.key(i); if (storageKey) keys[storageKey] = true; } } catch (e) {}
    }
    for (var memoryKey in memStore) if (Object.prototype.hasOwnProperty.call(memStore, memoryKey)) keys[memoryKey] = true;
    for (var key in keys) {
      if (!Object.prototype.hasOwnProperty.call(keys, key) || key.indexOf(PREFIX) !== 0) continue;
      var match = key.slice(PREFIX.length).match(/^(.*):(backup-v2|corrupt)$/);
      if (!match) continue;
      var rawArchive = rawGet(key);
      if (rawArchive === null) continue;
      if (!archives[match[1]]) archives[match[1]] = {};
      archives[match[1]][match[2] === 'backup-v2' ? 'backupV2' : 'corrupt'] = rawArchive;
    }
    if (Object.keys(archives).length) output.__apexSaveArchive = archives;
    return JSON.stringify(output, null, 2);
  };

  /**
   * Imports multiple game saves from a JSON string.
   * @param {string} jsonStr
   * @returns {number} count of successfully restored records
   */
  Save.importAll = function (jsonStr) {
    var count = 0;
    try {
      var data = JSON.parse(jsonStr);
      if (data && typeof data === 'object') {
        var archive = data.__apexSaveArchive;
        for (var gid in data) {
          if (Object.prototype.hasOwnProperty.call(data, gid) && gid !== '__apexSaveArchive') {
            Save.update(gid, data[gid]);
            count++;
          }
        }
        if (archive && typeof archive === 'object') {
          for (var archiveId in archive) {
            if (!Object.prototype.hasOwnProperty.call(archive, archiveId) || !archive[archiveId] || typeof archive[archiveId] !== 'object') continue;
            if (typeof archive[archiveId].backupV2 === 'string') rawSet(PREFIX + archiveId + ':backup-v2', archive[archiveId].backupV2);
            if (typeof archive[archiveId].corrupt === 'string') rawSet(PREFIX + archiveId + ':corrupt', archive[archiveId].corrupt);
          }
        }
      }
    } catch (e) {}
    return count;
  };
})();
