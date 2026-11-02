import { PlayerStats, GameSessionScore } from '../types/game';

const STORAGE_KEY_V1 = 'apex_arcade_stats_v1';
const STORAGE_KEY_V2 = 'apex_arcade_stats_v2';

const DEFAULT_PROFILE = { name: 'Player One', avatarSeed: 17 };

const defaultStats: PlayerStats = {
  totalPlayCount: 0,
  totalTimeSeconds: 0,
  highScores: {
    'flappy-bird': 0,
    'pong': 0,
    'snake': 0,
    'space-invaders': 0,
    'asteroids': 0,
    'tetris': 0,
    'super-mario-bros': 0,
    'celeste': 0,
  },
  favorites: ['celeste', 'tetris', 'flappy-bird'],
  recentSessions: [],
  achievements: {},
  levelProgress: {},
  profile: DEFAULT_PROFILE,
};

const createDefaultStats = (): PlayerStats => ({
  totalPlayCount: 0,
  totalTimeSeconds: 0,
  highScores: { ...defaultStats.highScores },
  favorites: [...defaultStats.favorites],
  recentSessions: [],
  achievements: {},
  levelProgress: {},
  profile: { ...DEFAULT_PROFILE },
});

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const toNonNegativeInteger = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;

const toNonNegativeNumber = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;

const normalizeSession = (value: unknown): GameSessionScore | null => {
  if (!isRecord(value) || typeof value.gameId !== 'string' || value.gameId.length === 0) return null;
  const score = toNonNegativeNumber(value.score);
  if (score === null) return null;
  const difficulty = value.difficulty;
  return {
    gameId: value.gameId,
    gameTitle: typeof value.gameTitle === 'string' ? value.gameTitle : value.gameId,
    score,
    date: typeof value.date === 'string' ? value.date : '',
    durationSeconds: toNonNegativeInteger(value.durationSeconds),
    ...(typeof value.playedOn === 'string' ? { playedOn: value.playedOn } : {}),
    ...(difficulty === 'easy' || difficulty === 'normal' || difficulty === 'hard' ? { difficulty } : {}),
  };
};

const normalizeHighScores = (value: unknown): Record<string, number> => {
  const scores: Record<string, number> = {};
  if (!isRecord(value)) return scores;
  for (const [gameId, entry] of Object.entries(value)) {
    const score = toNonNegativeNumber(entry);
    if (score !== null) scores[gameId] = score;
  }
  return scores;
};

const normalizeLevelProgress = (value: unknown): Record<string, number> => {
  const progress: Record<string, number> = {};
  if (!isRecord(value)) return progress;
  for (const [gameId, entry] of Object.entries(value)) {
    if (typeof entry === 'number' && Number.isFinite(entry) && entry >= 0) progress[gameId] = Math.floor(entry);
  }
  return progress;
};

const normalizeAchievements = (value: unknown): Record<string, string[]> => {
  const achievements: Record<string, string[]> = {};
  if (!isRecord(value)) return achievements;
  for (const [gameId, entry] of Object.entries(value)) {
    if (Array.isArray(entry)) achievements[gameId] = entry.filter((id): id is string => typeof id === 'string');
  }
  return achievements;
};

const normalizeProfile = (value: unknown): { name: string; avatarSeed: number } => {
  if (!isRecord(value)) return { ...DEFAULT_PROFILE };
  const name = typeof value.name === 'string' && value.name.trim().length > 0 ? value.name : DEFAULT_PROFILE.name;
  const avatarSeed = typeof value.avatarSeed === 'number' && Number.isFinite(value.avatarSeed)
    ? value.avatarSeed
    : DEFAULT_PROFILE.avatarSeed;
  return { name, avatarSeed };
};

/**
 * Coerce anything read from localStorage or an imported backup into the
 * PlayerStats shape. Partial or corrupted payloads degrade to defaults instead
 * of handing arrays/objects of the wrong type to the UI.
 */
const normalizeStats = (value: unknown): PlayerStats => {
  const base = createDefaultStats();
  if (!isRecord(value)) return base;

  return {
    totalPlayCount: toNonNegativeInteger(value.totalPlayCount),
    totalTimeSeconds: toNonNegativeInteger(value.totalTimeSeconds),
    highScores: { ...base.highScores, ...normalizeHighScores(value.highScores) },
    favorites: Array.isArray(value.favorites)
      ? value.favorites.filter((id): id is string => typeof id === 'string')
      : base.favorites,
    recentSessions: Array.isArray(value.recentSessions)
      ? value.recentSessions
          .map(normalizeSession)
          .filter((session): session is GameSessionScore => session !== null)
          .slice(0, 20)
      : base.recentSessions,
    achievements: normalizeAchievements(value.achievements),
    levelProgress: normalizeLevelProgress(value.levelProgress),
    profile: normalizeProfile(value.profile),
  };
};

export const getStoredStats = (): PlayerStats => {
  if (typeof window === 'undefined') return createDefaultStats();
  try {
    // 1. Try reading v2
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      return normalizeStats(JSON.parse(rawV2));
    }

    // 2. Fallback to v1 migration
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const migrated = normalizeStats(JSON.parse(rawV1));
      // Persist migrated schema
      try {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
      } catch {}
      return migrated;
    }

    return createDefaultStats();
  } catch {
    return createDefaultStats();
  }
};

const saveStatsToStorage = (stats: PlayerStats) => {
  try {
    const serialized = JSON.stringify(stats);
    localStorage.setItem(STORAGE_KEY_V2, serialized);
    // Keep v1 in sync for backwards compatibility
    localStorage.setItem(STORAGE_KEY_V1, serialized);
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
};

export const saveProfile = (profile: NonNullable<PlayerStats['profile']>): PlayerStats => {
  const updated = { ...getStoredStats(), profile };
  saveStatsToStorage(updated);
  return updated;
};

export const exportStats = (): string => {
  const localData: Record<string, string> = {};
  try {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key.startsWith('apex:save:') || key === 'apex:meta' || key === 'apex:preferences:v1')) {
        const value = localStorage.getItem(key);
        if (value !== null) localData[key] = value;
      }
    }
  } catch { /* Export whatever data is readable alongside the stats below. */ }
  return JSON.stringify({ format: 'apex-arcade-profile', version: 1, stats: getStoredStats(), localData }, null, 2);
};

export const importStats = (raw: string): PlayerStats | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;
    const candidate = parsed.format === 'apex-arcade-profile' ? parsed.stats : parsed;
    if (!isRecord(candidate)) return null;
    if (typeof candidate.totalPlayCount !== 'number' || !Number.isFinite(candidate.totalPlayCount)) return null;
    if (typeof candidate.totalTimeSeconds !== 'number' || !Number.isFinite(candidate.totalTimeSeconds)) return null;
    if (!Array.isArray(candidate.favorites)) return null;
    const updated = normalizeStats(candidate);
    saveStatsToStorage(updated);
    const localData = parsed.localData;
    if (parsed.format === 'apex-arcade-profile' && isRecord(localData)) {
      for (const [key, value] of Object.entries(localData)) {
        if ((key.startsWith('apex:save:') || key === 'apex:meta' || key === 'apex:preferences:v1') && typeof value === 'string') {
          try { localStorage.setItem(key, value); } catch { /* Continue restoring other records if storage quota is reached. */ }
        }
      }
      window.dispatchEvent(new Event('apex:meta'));
      window.dispatchEvent(new Event('apex:preferences-changed'));
    }
    return updated;
  } catch { return null; }
};

export const saveSessionScore = (
  gameId: string,
  gameTitle: string,
  score: number,
  durationSeconds: number
): PlayerStats => {
  const current = getStoredStats();
  const currentBest = current.highScores[gameId] || 0;
  const isNewBest = score > currentBest;

  const newSession: GameSessionScore = {
    gameId,
    gameTitle,
    score,
    date: new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    durationSeconds,
    playedOn: (() => { const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; })(),
  };

  const updated: PlayerStats = {
    ...current,
    totalPlayCount: current.totalPlayCount + 1,
    totalTimeSeconds: current.totalTimeSeconds + Math.max(1, durationSeconds),
    highScores: {
      ...current.highScores,
      [gameId]: isNewBest ? score : currentBest,
    },
    recentSessions: [newSession, ...current.recentSessions.slice(0, 19)],
  };

  saveStatsToStorage(updated);
  return updated;
};

/**
 * Handle real-time score updates received via APEX_EVENT from iframe games.
 */
export const recordApexScore = (
  gameId: string,
  score: number,
  durationSeconds?: number
): PlayerStats => {
  const current = getStoredStats();
  const currentBest = current.highScores[gameId] || 0;
  const isNewBest = score > currentBest;

  if (!isNewBest && !durationSeconds) return current;

  const updated: PlayerStats = {
    ...current,
    totalTimeSeconds: current.totalTimeSeconds + (durationSeconds ? Math.max(1, durationSeconds) : 0),
    highScores: {
      ...current.highScores,
      [gameId]: isNewBest ? score : currentBest,
    },
  };

  saveStatsToStorage(updated);
  return updated;
};

/**
 * Record an achievement unlock from an APEX_EVENT.
 */
export const recordApexAchievement = (
  gameId: string,
  achievementId: string
): PlayerStats => {
  const current = getStoredStats();
  const gameAchs = current.achievements?.[gameId] || [];
  if (gameAchs.includes(achievementId)) return current;

  const updated: PlayerStats = {
    ...current,
    achievements: {
      ...(current.achievements || {}),
      [gameId]: [...gameAchs, achievementId],
    },
  };

  saveStatsToStorage(updated);
  return updated;
};

export const recordApexLevelProgress = (gameId: string, level: number): PlayerStats => {
  if (!Number.isFinite(level) || level < 0) return getStoredStats();
  const current = getStoredStats();
  const updated: PlayerStats = {
    ...current,
    levelProgress: {
      ...(current.levelProgress || {}),
      [gameId]: Math.max(current.levelProgress?.[gameId] || 0, Math.floor(level)),
    },
  };
  saveStatsToStorage(updated);
  return updated;
};

export const toggleFavoriteGame = (gameId: string): PlayerStats => {
  const current = getStoredStats();
  const isFav = current.favorites.includes(gameId);
  const updated: PlayerStats = {
    ...current,
    favorites: isFav
      ? current.favorites.filter((id) => id !== gameId)
      : [...current.favorites, gameId],
  };
  saveStatsToStorage(updated);
  return updated;
};

export const resetAllStats = (): PlayerStats => {
  try {
    localStorage.removeItem(STORAGE_KEY_V1);
    localStorage.removeItem(STORAGE_KEY_V2);
  } catch {}
  return createDefaultStats();
};

export const resetAllProfileData = (): PlayerStats => {
  resetAllStats();
  try {
    const saveKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('apex:save:') || key === 'apex:meta') saveKeys.push(key);
    }
    saveKeys.forEach((key) => localStorage.removeItem(key));
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('apex:meta'));
  return createDefaultStats();
};
