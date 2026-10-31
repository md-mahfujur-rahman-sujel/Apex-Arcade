/* Shared economy constants. Loaded by the host and game frames; edit values here only. */
(function () {
  'use strict';
  window.APEX_META_CONFIG = Object.freeze({
    storageKey: 'apex:meta',
    defaultState: {
      v: 1, xp: 0, level: 1, sparks: 0,
      streak: { count: 0, lastDay: '', freezes: 0 },
      daily: { day: '', seed: 0, games: [], done: [] },
      quests: { day: [], week: [], dayKey: '', weekKey: '' }, seasons: {}, trophies: [],
    },
    sessionXp: 10,
    secondsPerXp: 12,
    maxTimeXp: 50,
    newBestXp: 5,
    sessionSparksDivisor: 4,
    achievementXp: { common: 25, rare: 50, epic: 100, legendary: 250 },
    achievementSparks: { common: 10, rare: 25, epic: 50, legendary: 100 },
    dailyGauntletXp: 150,
    dailyGauntletSparks: 60,
    dailyQuestXp: 40,
    weeklyQuestXp: 120,
    levelBaseXp: 100,
    levelStepXp: 40,
    streakFreezeEvery: 7,
    maxStreakFreezes: 2,
    cosmeticPrices: { common: 100, rare: 250, epic: 600 },
    dailyQuestCount: 3,
    weeklyQuestCount: 2,
    dailyQuestTemplates: [
      { id: 'play-one', title: 'Play 1 session', type: 'sessions', goal: 1 },
      { id: 'play-three', title: 'Play 3 sessions', type: 'sessions', goal: 3 },
      { id: 'try-two-games', title: 'Play 2 different games', type: 'unique-games', goal: 2 },
      { id: 'new-best', title: 'Set a new personal best', type: 'new-best', goal: 1 },
      { id: 'arcade-session', title: 'Play an arcade game', type: 'category', category: 'arcade', goal: 1 },
    ],
    weeklyQuestTemplates: [
      { id: 'week-five', title: 'Play 5 sessions', type: 'sessions', goal: 5 },
      { id: 'week-ten', title: 'Play 10 sessions', type: 'sessions', goal: 10 },
      { id: 'week-three-games', title: 'Play 3 different games', type: 'unique-games', goal: 3 },
      { id: 'week-two-bests', title: 'Set 2 new personal bests', type: 'new-best', goal: 2 },
      { id: 'week-three-categories', title: 'Play 3 game categories', type: 'categories', goal: 3 },
    ],
  });
})();
