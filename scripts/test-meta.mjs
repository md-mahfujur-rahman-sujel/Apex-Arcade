import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const configSource = await readFile(new URL('../public/assets/kits/meta-config.js', import.meta.url), 'utf8');
const kitSource = await readFile(new URL('../public/assets/kits/meta-kit.js', import.meta.url), 'utf8');

function createMetaHarness(configure) {
  const values = new Map();
  const localStorage = {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(String(key), String(value)); },
  };
  const window = { localStorage, events: [], dispatchEvent(event) { this.events.push(event); } };
  class CustomEvent { constructor(type, init) { this.type = type; this.detail = init?.detail; } }
  class MockDate extends Date {
    static currentMs = Date.UTC(2026, 0, 1, 12);
    static zoneOffsetMinutes = 0;
    constructor(...args) { super(...(args.length ? args : [MockDate.currentMs])); }
    static now() { return MockDate.currentMs; }
    localDate() { return new Date(this.getTime() + MockDate.zoneOffsetMinutes * 60000); }
    getFullYear() { return this.localDate().getUTCFullYear(); }
    getMonth() { return this.localDate().getUTCMonth(); }
    getDate() { return this.localDate().getUTCDate(); }
    static set(iso, offsetMinutes = MockDate.zoneOffsetMinutes) { MockDate.currentMs = Date.parse(iso); MockDate.zoneOffsetMinutes = offsetMinutes; }
  }
  vm.runInNewContext(configSource, { window, Object });
  if (configure) configure(window.APEX_META_CONFIG);
  vm.runInNewContext(kitSource, { window, Date: MockDate, CustomEvent, JSON, Math, Object, Array, Number, String });
  return { Meta: window.Meta, config: window.APEX_META_CONFIG, values, Clock: MockDate };
}

const reward = createMetaHarness();
let result = reward.Meta.recordSession({ gameId: 'glowmoth', durationSec: 24, newBest: false });
assert.equal(result.sessionXp, 12);
assert.equal(result.xp, result.sessionXp + result.questXp);
assert.equal(result.sparks, 3);
result = reward.Meta.recordSession({ gameId: 'glowmoth', durationSec: 60, newBest: true });
assert.equal(result.sessionXp, 20);
assert.equal(result.sparks, 5);
result = reward.Meta.recordSession({ gameId: 'glowmoth', durationSec: 999999, newBest: true });
assert.equal(result.sessionXp, 65, 'session time XP is capped at 50');
assert.equal(result.sparks, 16);
assert.equal(reward.values.has('apex:meta'), true);
console.log('PASS session XP, new-best bonus, time cap, Sparks conversion, and persisted key');

const award = createMetaHarness();
result = award.Meta.recordAchievement({ id: 'gold', gameId: 'glowmoth', rarity: 'epic' });
assert.equal(result.xp, 100); assert.equal(result.sparks, 50);
assert.equal(award.Meta.recordAchievement({ id: 'gold', gameId: 'glowmoth', rarity: 'epic' }).xp, 0, 'achievement reward is one time');
assert.equal(award.Meta.addQuestReward('daily').xp, 40);
assert.equal(award.Meta.addQuestReward('weekly').xp, 120);
assert.equal(award.Meta.read().level, 3, 'total XP uses 100 then 140 XP level thresholds');
result = award.Meta.recordDailyGauntlet('2026-01-01');
assert.equal(result.xp, 150); assert.equal(result.sparks, 60);
assert.equal(award.Meta.recordDailyGauntlet('2026-01-01').xp, 0, 'daily Gauntlet reward is one time per local day');
console.log('PASS achievement, quest, daily reward, duplicate prevention, and level thresholds');

const streakHarness = createMetaHarness();
const clock = streakHarness.Clock;
for (let day = 1; day <= 7; day++) {
  clock.set(`2026-01-${String(day).padStart(2, '0')}T12:00:00Z`);
  result = streakHarness.Meta.recordSession({ gameId: 'glowmoth', durationSec: 1 });
}
assert.equal(result.state.streak.count, 7);
assert.equal(result.state.streak.freezes, 1, 'seven consecutive days earn one freeze');
clock.set('2026-01-07T18:00:00Z');
assert.equal(streakHarness.Meta.recordSession({ gameId: 'glowmoth' }).state.streak.freezes, 1, 'same-day play does not farm freezes');
clock.set('2026-01-09T12:00:00Z');
result = streakHarness.Meta.recordSession({ gameId: 'glowmoth' });
assert.equal(result.state.streak.count, 8, 'one missed day is protected by the freeze');
assert.equal(result.state.streak.freezes, 0);
clock.set('2026-01-12T12:00:00Z');
assert.equal(streakHarness.Meta.recordSession({ gameId: 'glowmoth' }).state.streak.count, 1, 'unprotected missed days reset the streak');
console.log('PASS local-date streak increments, freeze earning/use, and reset');

const zoneHarness = createMetaHarness();
const zoneClock = zoneHarness.Clock;
zoneClock.set('2026-01-01T23:30:00Z', -8 * 60);
zoneHarness.Meta.recordSession({ gameId: 'glowmoth' });
zoneClock.set('2026-01-01T23:30:00Z', 14 * 60);
assert.equal(zoneHarness.Meta.recordSession({ gameId: 'glowmoth' }).state.streak.count, 2, 'crossing local midnight advances the streak');
zoneClock.set('2026-01-01T23:30:00Z', -12 * 60);
result = zoneHarness.Meta.recordSession({ gameId: 'glowmoth' });
assert.equal(result.state.streak.count, 2, 'moving the local date backwards does not erase or duplicate a streak day');
assert.equal(result.state.streak.lastDay, '2026-01-02');
console.log('PASS date-mocked timezone changes do not reset or double-count the streak');

const questHarness = createMetaHarness();
const questClock = questHarness.Clock;
questClock.set('2026-01-05T12:00:00Z');
const initialQuests = questHarness.Meta.getQuests();
assert.equal(initialQuests.day.length, questHarness.config.dailyQuestCount);
assert.equal(initialQuests.week.length, questHarness.config.weeklyQuestCount);
assert.deepEqual(
  initialQuests.day.map((quest) => quest.id),
  questHarness.Meta.getQuests().day.map((quest) => quest.id),
  'daily quest selection stays stable within a local day',
);
questClock.set('2026-01-06T12:00:00Z');
const nextDayQuests = questHarness.Meta.getQuests();
assert.equal(nextDayQuests.dayKey, '2026-01-06', 'daily quests rotate at local midnight');
assert.equal(nextDayQuests.day.every((quest) => quest.progress === 0 && !quest.done), true);
questClock.set('2026-01-12T12:00:00Z');
const nextWeekQuests = questHarness.Meta.getQuests();
assert.equal(nextWeekQuests.weekKey, '2026-W03', 'weekly quests rotate at local ISO Monday');
const simpleQuestHarness = createMetaHarness((config) => {
  config.dailyQuestTemplates.splice(0, config.dailyQuestTemplates.length,
    ...Array.from({ length: config.dailyQuestCount }, (_, index) => ({ id: `test-play-${index}`, title: 'Play once', type: 'sessions', goal: 1 })));
  config.weeklyQuestTemplates.splice(0, config.weeklyQuestTemplates.length,
    ...Array.from({ length: config.weeklyQuestCount }, (_, index) => ({ id: `test-week-${index}`, title: 'Play later', type: 'sessions', goal: 100 })));
});
simpleQuestHarness.Clock.set('2026-01-01T12:00:00Z');
result = simpleQuestHarness.Meta.recordSession({ gameId: 'glowmoth', durationSec: 0 });
assert.equal(result.sessionXp, 10);
assert.equal(result.questXp, simpleQuestHarness.config.dailyQuestXp * simpleQuestHarness.config.dailyQuestCount, 'completed daily quests award configured XP once');
assert.equal(result.state.quests.day.every((quest) => quest.done), true);
simpleQuestHarness.Clock.set('2026-01-01T13:00:00Z');
result = simpleQuestHarness.Meta.recordSession({ gameId: 'glowmoth', durationSec: 0 });
assert.equal(result.questXp, 0, 'completed quest cannot be claimed twice');
console.log('PASS stable daily quests, local ISO weekly rotation, and one-time completion rewards');

console.log('All S1-4 Meta rules passed.');
