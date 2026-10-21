import { PlayerStats, GameSessionScore } from '../types/game';

const STORAGE_KEY = 'apex_arcade_stats_v1';

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
};

export const getStoredStats = (): PlayerStats => {
  if (typeof window === 'undefined') return defaultStats;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats;
    const parsed = JSON.parse(raw);
    return { ...defaultStats, ...parsed };
  } catch {
    return defaultStats;
  }
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
    date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }),
    durationSeconds,
  };

  const updated: PlayerStats = {
    ...current,
    totalPlayCount: current.totalPlayCount + 1,
    totalTimeSeconds: current.totalTimeSeconds + durationSeconds,
    highScores: {
      ...current.highScores,
      [gameId]: isNewBest ? score : currentBest,
    },
    recentSessions: [newSession, ...current.recentSessions.slice(0, 19)],
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }

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
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to update favorites', e);
  }
  return updated;
};

export const resetAllStats = (): PlayerStats => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
  return defaultStats;
};
