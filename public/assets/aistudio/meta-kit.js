/* meta-kit.js — shared account progression store. The `Meta` global owns apex:meta writes. */
(function () {
  'use strict';

  var Meta = (window.Meta = window.Meta || {});
  var config = window.APEX_META_CONFIG;
  if (!config) throw new Error('meta-config.js must load before meta-kit.js');
  var memory = null;
  var cosmeticRegistry = [
    { id: 'glowmoth:ember', gameId: 'glowmoth', slot: 'skin', name: 'Ember', rarity: 'common', cost: 100 },
    { id: 'glowmoth:comet-trail', gameId: 'glowmoth', slot: 'trail', name: 'Comet Trail', rarity: 'rare', cost: 250 },
    { id: 'glowmoth:dusk', gameId: 'glowmoth', slot: 'theme', name: 'Dusk Cavern', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:aurora', gameId: 'glowmoth', slot: 'palette', name: 'Aurora', rarity: 'rare', cost: 0, unlock: { achievement: 'gold-medal' } },
    { id: 'glowmoth:moonstone', gameId: 'glowmoth', slot: 'skin', name: 'Moonstone', rarity: 'common', cost: 100 },
    { id: 'glowmoth:tideglass', gameId: 'glowmoth', slot: 'skin', name: 'Tideglass', rarity: 'rare', cost: 250 },
    { id: 'glowmoth:sunflare', gameId: 'glowmoth', slot: 'skin', name: 'Sunflare', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:voidwing', gameId: 'glowmoth', slot: 'skin', name: 'Voidwing', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:mint-glow', gameId: 'glowmoth', slot: 'palette', name: 'Mint Glow', rarity: 'common', cost: 100 },
    { id: 'glowmoth:coral-bloom', gameId: 'glowmoth', slot: 'palette', name: 'Coral Bloom', rarity: 'rare', cost: 250 },
    { id: 'glowmoth:prism', gameId: 'glowmoth', slot: 'palette', name: 'Prism', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:stardust-trail', gameId: 'glowmoth', slot: 'trail', name: 'Stardust Trail', rarity: 'common', cost: 100 },
    { id: 'glowmoth:firefly-trail', gameId: 'glowmoth', slot: 'trail', name: 'Firefly Trail', rarity: 'common', cost: 100 },
    { id: 'glowmoth:nebula-trail', gameId: 'glowmoth', slot: 'trail', name: 'Nebula Trail', rarity: 'epic', cost: 600 },
    { id: 'glowmoth:crystal-garden', gameId: 'glowmoth', slot: 'theme', name: 'Crystal Garden', rarity: 'rare', cost: 250 },
    { id: 'glowmoth:deep-night', gameId: 'glowmoth', slot: 'theme', name: 'Deep Night', rarity: 'common', cost: 100 },
  ];

  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function nonNegative(value) { return Number.isFinite(Number(value)) ? Math.max(0, Number(value)) : 0; }
  function dayKey(date) {
    return String(date.getFullYear()) + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }
  function dayNumber(key) {
    var match = String(key || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? Math.floor(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86400000) : NaN;
  }
  function normalize(input) {
    var state = copy(config.defaultState), source = input && typeof input === 'object' ? input : {};
    Object.keys(source).forEach(function (key) {
      if (key === 'streak' || key === 'daily' || key === 'quests') {
        state[key] = Object.assign({}, state[key], source[key] || {});
      } else if (key === 'seasons') state.seasons = Object.assign({}, source.seasons || {});
      else if (key === 'trophies') state.trophies = Array.isArray(source.trophies) ? source.trophies.slice() : [];
      else state[key] = source[key];
    });
    state.v = 1;
    state.xp = nonNegative(state.xp);
    state.sparks = nonNegative(state.sparks);
    state.level = Math.max(1, Math.floor(nonNegative(state.level)));
    state.streak.count = Math.floor(nonNegative(state.streak.count));
    state.streak.freezes = Math.min(config.maxStreakFreezes, Math.floor(nonNegative(state.streak.freezes)));
    if (!Array.isArray(state.daily.games)) state.daily.games = [];
    if (!Array.isArray(state.daily.done)) state.daily.done = [];
    if (!Array.isArray(state.quests.day)) state.quests.day = [];
    if (!Array.isArray(state.quests.week)) state.quests.week = [];
    if (!state.seasons || typeof state.seasons !== 'object' || Array.isArray(state.seasons)) state.seasons = {};
    if (!Array.isArray(state.trophies)) state.trophies = [];
    return state;
  }
  function levelFor(xp) {
    var level = 1, remaining = nonNegative(xp), cost;
    while (level < 100000) {
      cost = config.levelBaseXp + config.levelStepXp * (level - 1);
      if (remaining < cost) break;
      remaining -= cost; level++;
    }
    return level;
  }
  function readRaw() {
    try {
      var raw = window.localStorage.getItem(config.storageKey);
      if (raw) return normalize(JSON.parse(raw));
    } catch (e) {}
    return memory ? normalize(memory) : copy(config.defaultState);
  }
  function write(state) {
    var normalized = normalize(state), raw = JSON.stringify(normalized);
    memory = normalized;
    try { window.localStorage.setItem(config.storageKey, raw); } catch (e) {}
    try { window.dispatchEvent(new CustomEvent('apex:meta', { detail: { state: copy(normalized) } })); } catch (e) {}
    return copy(normalized);
  }
  function updateStreak(state, now) {
    var today = dayKey(now), previous = state.streak.lastDay, todayNumber = dayNumber(today), previousNumber = dayNumber(previous);
    var advanced = false;
    if (!previous) { state.streak.count = 1; advanced = true; }
    else if (todayNumber > previousNumber) {
      var gap = todayNumber - previousNumber;
      if (gap === 1) state.streak.count += 1;
      else if (gap === 2 && state.streak.freezes > 0) { state.streak.freezes -= 1; state.streak.count += 1; }
      else state.streak.count = 1;
      advanced = true;
      state.streak.lastDay = today;
    } else if (todayNumber < previousNumber) {
      // A timezone change can move the local date backwards. Keep the saved day
      // so crossing back into it cannot erase a streak or count twice.
      return;
    }
    state.streak.lastDay = today;
    if (advanced && state.streak.count > 0 && state.streak.count % config.streakFreezeEvery === 0 && state.streak.freezes < config.maxStreakFreezes) {
      state.streak.freezes += 1;
    }
  }
  function applyReward(state, xp, sparks) {
    state.xp += Math.max(0, Math.floor(xp));
    state.sparks += Math.max(0, Math.floor(sparks));
    state.level = levelFor(state.xp);
  }
  function dailySeed(date, gameId) {
    var input = dayKey(date) + String(gameId || ''), hash = 2166136261;
    for (var i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }
  function weekKey(date) {
    var thursday = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    thursday.setUTCDate(thursday.getUTCDate() + 3 - ((thursday.getUTCDay() + 6) % 7));
    var year = thursday.getUTCFullYear(), firstThursday = new Date(Date.UTC(year, 0, 4));
    firstThursday.setUTCDate(firstThursday.getUTCDate() + 3 - ((firstThursday.getUTCDay() + 6) % 7));
    var week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / 604800000);
    return String(year) + '-W' + String(week).padStart(2, '0');
  }
  function selectQuests(templates, count, seed) {
    var list = (templates || []).map(function (item) { return Object.assign({}, item, { progress: 0, done: false }); });
    var salt = new Date(0), seedKey = String(seed);
    list.sort(function (a, b) { return dailySeed(salt, seedKey + a.id) - dailySeed(salt, seedKey + b.id); });
    return list.slice(0, count);
  }
  function ensureQuests(state, date) {
    var day = dayKey(date), week = weekKey(date), changed = false;
    if (state.quests.dayKey !== day) {
      state.quests.dayKey = day;
      state.quests.day = selectQuests(config.dailyQuestTemplates, config.dailyQuestCount, Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
      changed = true;
    }
    if (state.quests.weekKey !== week) {
      state.quests.weekKey = week;
      state.quests.week = selectQuests(config.weeklyQuestTemplates, config.weeklyQuestCount, week);
      changed = true;
    }
    return changed;
  }
  function progressQuestList(state, list, payload, rewardXp) {
    var earned = 0;
    (list || []).forEach(function (quest) {
      if (quest.done) return;
      if (quest.type === 'sessions') quest.progress = nonNegative(quest.progress) + 1;
      else if (quest.type === 'unique-games' && payload.gameId) {
        quest.games = quest.games || [];
        if (!quest.games.includes(payload.gameId)) quest.games.push(payload.gameId);
        quest.progress = quest.games.length;
      } else if (quest.type === 'new-best' && payload.newBest) quest.progress = nonNegative(quest.progress) + 1;
      else if (quest.type === 'category' && payload.category === quest.category) quest.progress = nonNegative(quest.progress) + 1;
      else if (quest.type === 'categories' && payload.category) {
        quest.categories = quest.categories || [];
        if (!quest.categories.includes(payload.category)) quest.categories.push(payload.category);
        quest.progress = quest.categories.length;
      }
      if (quest.progress >= quest.goal) { quest.done = true; earned += rewardXp; }
    });
    return earned;
  }

  Meta.read = function () { return readRaw(); };
  Meta.getQuests = function (now) {
    var state = readRaw();
    if (ensureQuests(state, now instanceof Date ? now : new Date())) return write(state).quests;
    return copy(state.quests);
  };
  Meta.getDailySeed = function (gameId, now) { return dailySeed(now || new Date(), gameId); };
  Meta.getCosmetics = function (gameId) {
    var save = window.Save && typeof window.Save.load === 'function' ? window.Save.load(gameId) : null;
    var cosmetics = save && save.cosmetics ? save.cosmetics : { owned: [], equipped: {} };
    var owned = cosmetics && Array.isArray(cosmetics.owned) ? cosmetics.owned : [];
    var equipped = cosmetics && cosmetics.equipped && typeof cosmetics.equipped === 'object' ? cosmetics.equipped : {};
    var state = readRaw();
    return cosmeticRegistry.filter(function (item) { return !gameId || item.gameId === gameId; }).map(function (item) {
      var achievementUnlocked = !item.unlock || !item.unlock.achievement || state.trophies.some(function (trophy) {
        return (typeof trophy === 'string' ? trophy : trophy.id) === item.gameId + ':' + item.unlock.achievement;
      });
      return Object.assign({}, item, {
        owned: owned.includes(item.id),
        equipped: equipped[item.slot] === item.id,
        achievementUnlocked: achievementUnlocked,
      });
    });
  };
  Meta.purchaseCosmetic = function (gameId, cosmeticId) {
    var item = cosmeticRegistry.find(function (candidate) { return candidate.id === cosmeticId && candidate.gameId === gameId; });
    var state = readRaw();
    if (!item || !window.Save || typeof window.Save.load !== 'function' || typeof window.Save.update !== 'function') {
      return { ok: false, reason: 'unknown-cosmetic', sparks: state.sparks, state: state };
    }
    var save = window.Save.load(gameId), cosmetics = save.cosmetics || { owned: [], equipped: {} };
    var owned = Array.isArray(cosmetics.owned) ? cosmetics.owned : [];
    if (owned.includes(item.id)) return { ok: true, purchased: false, sparks: state.sparks, state: state };
    if (item.unlock && item.unlock.achievement) {
      var trophyId = gameId + ':' + item.unlock.achievement;
      if (!state.trophies.some(function (trophy) { return (typeof trophy === 'string' ? trophy : trophy.id) === trophyId; })) {
        return { ok: false, reason: 'achievement-required', sparks: state.sparks, state: state };
      }
    }
    var cost = item.unlock ? 0 : (Number.isFinite(item.cost) ? item.cost : (config.cosmeticPrices[item.rarity] || 0));
    if (state.sparks < cost) return { ok: false, reason: 'insufficient-sparks', sparks: state.sparks, state: state };
    window.Save.update(gameId, { cosmetics: { owned: [item.id] } });
    state.sparks -= cost;
    var saved = write(state);
    return { ok: true, purchased: true, cost: cost, sparks: saved.sparks, state: saved };
  };
  Meta.equipCosmetic = function (gameId, cosmeticId) {
    var item = cosmeticRegistry.find(function (candidate) { return candidate.id === cosmeticId && candidate.gameId === gameId; });
    if (!item || !window.Save || typeof window.Save.load !== 'function' || typeof window.Save.update !== 'function') return { ok: false, reason: 'unknown-cosmetic' };
    var save = window.Save.load(gameId), cosmetics = save.cosmetics || { owned: [], equipped: {} };
    if (!Array.isArray(cosmetics.owned) || !cosmetics.owned.includes(item.id)) return { ok: false, reason: 'not-owned' };
    var updated = window.Save.update(gameId, { cosmetics: { equipped: (function () { var slots = {}; slots[item.slot] = item.id; return slots; })() } });
    return { ok: true, item: Object.assign({}, item), state: updated };
  };
  Meta.recordSession = function (payload, now) {
    payload = payload || {};
    var state = readRaw(), date = now instanceof Date ? now : new Date();
    var gameId = String(payload.gameId || '').slice(0, 64);
    if (!gameId) return { xp: 0, sparks: 0, state: state };
    ensureQuests(state, date);
    var duration = Math.min(86400, nonNegative(payload.durationSec));
    var xp = config.sessionXp + Math.min(config.maxTimeXp, Math.floor(duration / config.secondsPerXp)) + (payload.newBest ? config.newBestXp : 0);
    var sparks = Math.floor(xp / config.sessionSparksDivisor);
    updateStreak(state, date);
    var today = dayKey(date);
    if (state.daily.day !== today) state.daily = { day: today, seed: dailySeed(date, gameId), games: [], done: [] };
    if (!state.daily.games.includes(gameId)) state.daily.games.push(gameId);
    var questXp = progressQuestList(state, state.quests.day, payload, config.dailyQuestXp)
      + progressQuestList(state, state.quests.week, payload, config.weeklyQuestXp);
    applyReward(state, xp, sparks);
    if (questXp) applyReward(state, questXp, 0);
    var saved = write(state);
    return { xp: xp + questXp, sessionXp: xp, questXp: questXp, sparks: sparks, level: saved.level, streak: saved.streak.count, state: saved };
  };
  Meta.recordAchievement = function (payload) {
    payload = payload || {};
    var id = String(payload.id || '').slice(0, 64), gameId = String(payload.gameId || '').slice(0, 64);
    var rarity = ['common', 'rare', 'epic', 'legendary'].includes(payload.rarity) ? payload.rarity : 'common';
    if (!id) return { xp: 0, sparks: 0, state: readRaw() };
    var state = readRaw(), trophyId = (gameId ? gameId + ':' : '') + id;
    if (state.trophies.some(function (trophy) { return (typeof trophy === 'string' ? trophy : trophy.id) === trophyId; })) return { xp: 0, sparks: 0, state: state };
    var xp = config.achievementXp[rarity], sparks = config.achievementSparks[rarity];
    state.trophies.push({ id: trophyId, gameId: gameId, rarity: rarity, day: dayKey(new Date()) });
    applyReward(state, xp, sparks);
    return { xp: xp, sparks: sparks, level: state.level, state: write(state) };
  };
  Meta.recordDailyGauntlet = function (day) {
    var state = readRaw(), date = String(day || dayKey(new Date()));
    if (state.daily.done.includes('gauntlet:' + date)) return { xp: 0, sparks: 0, state: state };
    state.daily.done.push('gauntlet:' + date);
    applyReward(state, config.dailyGauntletXp, config.dailyGauntletSparks);
    return { xp: config.dailyGauntletXp, sparks: config.dailyGauntletSparks, state: write(state) };
  };
  Meta.addQuestReward = function (kind) {
    var xp = kind === 'weekly' ? config.weeklyQuestXp : config.dailyQuestXp;
    var state = readRaw(); applyReward(state, xp, Math.floor(xp / config.sessionSparksDivisor));
    return { xp: xp, sparks: Math.floor(xp / config.sessionSparksDivisor), state: write(state) };
  };
})();
