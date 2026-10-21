export type GameEra =
  | 'Arcade Pioneers'
  | '16-Bit Golden Age'
  | 'Modern Indie Masterpieces'
  | 'Tabletop & Classics';

export type GameCategory = 'all' | 'arcade' | 'board' | 'sports' | 'puzzle' | 'cards';

export type DifficultySetting = 'easy' | 'normal' | 'hard';

export type PlayableEngineId =
  | 'cyber-flap'
  | 'holo-pong'
  | 'quantum-snake'
  | 'space-invaders'
  | 'asteroids-core'
  | 'iso-tetris'
  | 'precision-platformer'
  | 'pac-maze'
  | 'sonic-speedway'
  | 'street-brawler'
  | 'chrono-battle'
  | 'action-combat';

export interface GameInfo {
  id: string;
  gameNumber: number; // 1 to 50
  title: string;
  of: string; // Inspiration (e.g. 'Flappy Bird', 'Strategy for two')
  year: number;
  era: GameEra;
  genre: string;
  category: 'arcade' | 'board' | 'sports' | 'puzzle' | 'cards';
  developer: string;
  originalPlatform: string;
  tagline: string;
  description: string;
  legacy?: string;
  keyMechanics?: string[];
  controlsSummary: string;
  keys: string;
  accentColor: string;
  icon: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Brutal';
  htmlPath: string; // Direct path to the complete dedicated HTML game
  playableEngineId?: PlayableEngineId; // Optional 2.5D Canvas engine
  variant?: string;
  previewType?: string;
}

export interface GameSessionScore {
  gameId: string;
  gameTitle: string;
  score: number;
  date: string;
  durationSeconds: number;
  difficulty?: DifficultySetting;
}

export interface PlayerStats {
  totalPlayCount: number;
  totalTimeSeconds: number;
  highScores: Record<string, number>;
  favorites: string[];
  recentSessions: GameSessionScore[];
}
