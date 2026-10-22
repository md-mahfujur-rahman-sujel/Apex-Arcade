export interface MetaState {
  v: 1;
  xp: number;
  level: number;
  sparks: number;
  streak: { count: number; lastDay: string; freezes: number };
  daily: { day: string; seed: number; games: string[]; done: string[] };
  quests: { day: unknown[]; week: unknown[] };
  seasons: Record<string, Record<string, { best: number; trophy: string }>>;
  trophies: Array<string | { id: string; gameId: string; rarity: string; day: string }>;
}

export interface MetaReward { xp: number; sparks: number; level?: number; state: MetaState; }
export interface MetaGlobal {
  read: () => MetaState;
  recordSession: (payload: { gameId: string; durationSec: number; newBest: boolean; category?: string }) => MetaReward;
  recordAchievement: (payload: { id: string; gameId: string; rarity?: string }) => MetaReward;
  equipCosmetic: (gameId: string, cosmeticId: string) => { ok: boolean; reason?: string };
}

declare global {
  interface Window {
    APEX_META_CONFIG?: { storageKey: string; defaultState: MetaState };
    Meta?: MetaGlobal;
  }
}

const storageKey = () => window.APEX_META_CONFIG?.storageKey || 'apex:meta';
const defaults = (): MetaState => window.APEX_META_CONFIG?.defaultState || {
  v: 1, xp: 0, level: 1, sparks: 0,
  streak: { count: 0, lastDay: '', freezes: 0 },
  daily: { day: '', seed: 0, games: [], done: [] },
  quests: { day: [], week: [] }, seasons: {}, trophies: [],
};

export function getMetaState(): MetaState {
  const base = defaults();
  try {
    const raw = window.localStorage.getItem(storageKey());
    if (!raw) return structuredClone(base);
    const value = JSON.parse(raw) as Partial<MetaState>;
    return {
      ...base,
      ...value,
      v: 1,
      xp: Number.isFinite(value.xp) ? Math.max(0, Number(value.xp)) : 0,
      sparks: Number.isFinite(value.sparks) ? Math.max(0, Number(value.sparks)) : 0,
      level: Number.isFinite(value.level) ? Math.max(1, Number(value.level)) : 1,
      streak: { ...base.streak, ...(value.streak || {}) },
      daily: { ...base.daily, ...(value.daily || {}) },
      quests: { ...base.quests, ...(value.quests || {}) },
      seasons: value.seasons || {},
      trophies: Array.isArray(value.trophies) ? value.trophies : [],
    };
  } catch {
    return structuredClone(base);
  }
}

export function subscribeToMeta(listener: (state: MetaState) => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === storageKey() || event.key === null) listener(getMetaState());
  };
  const onMeta = () => listener(getMetaState());
  window.addEventListener('storage', onStorage);
  window.addEventListener('apex:meta', onMeta);
  return () => {
    window.removeEventListener('storage', onStorage);
    window.removeEventListener('apex:meta', onMeta);
  };
}
