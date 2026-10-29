import { PlayerStats, GameSessionScore } from '../types/game';

const STORAGE_KEY_V1 = 'apex_arcade_stats_v1';
const STORAGE_KEY_V2 = 'apex_arcade_stats_v2';

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
  profile: { name: 'Player One', avatarSeed: 17 },
};

export const getStoredStats = (): PlayerStats => {
  if (typeof window === 'undefined') return defaultStats;
  try {
    // 1. Try reading v2
    const rawV2 = localStorage.getItem(STORAGE_KEY_V2);
    if (rawV2) {
      const parsed = JSON.parse(rawV2);
      return { ...defaultStats, ...parsed };
    }

    // 2. Fallback to v1 migration
    const rawV1 = localStorage.getItem(STORAGE_KEY_V1);
    if (rawV1) {
      const parsedV1 = JSON.parse(rawV1);
      const migrated: PlayerStats = {
        ...defaultStats,
        ...parsedV1,
      };
      // Persist migrated schema
      try {
        localStorage.setItem(STORAGE_KEY_V2, JSON.stringify(migrated));
      } catch {}
      return migrated;
    }

    return defaultStats;
  } catch {
    return defaultStats;
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
    const parsed = JSON.parse(raw) as Partial<PlayerStats> & { format?: string; stats?: Partial<PlayerStats>; localData?: Record<string, unknown> };
    const candidate = (parsed.format === 'apex-arcade-profile' ? parsed.stats : parsed) as Partial<PlayerStats>;
    if (typeof candidate.totalPlayCount !== 'number' || typeof candidate.totalTimeSeconds !== 'number' || !Array.isArray(candidate.favorites)) return null;
    const updated: PlayerStats = { ...defaultStats, ...candidate, achievements: candidate.achievements || {}, levelProgress: candidate.levelProgress || {}, profile: candidate.profile || defaultStats.profile };
    saveStatsToStorage(updated);
    if (parsed.format === 'apex-arcade-profile' && parsed.localData && typeof parsed.localData === 'object') {
      for (const [key, value] of Object.entries(parsed.localData)) {
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
  return defaultStats;
};

export const resetAllProfileData = (): PlayerStats => {
  resetAllStats();
  try {
    const saveKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key?.startsWith('apex:save:')) saveKeys.push(key);
    }
    saveKeys.forEach((key) => localStorage.removeItem(key));
    localStorage.removeItem('apex:meta');
  } catch {}
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('apex:meta'));
  return defaultStats;
};
