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

export interface TouchKeyControl {
  label: string;
  key: string;
}

export interface TouchControlsConfig {
  mode: 'native' | 'virtual';
  directions?: Partial<Record<'up' | 'down' | 'left' | 'right', string>>;
  actions?: TouchKeyControl[];
}

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
  usesDirectTouch?: boolean; // Game handles touch gestures itself and should not receive the theater virtual pad.
  touchControls?: TouchControlsConfig;
  playableEngineId?: PlayableEngineId; // Optional 2.5D Canvas engine
  variant?: string;
  previewType?: string;
  // Launcher metadata. Optional so existing game records remain compatible as data is enriched.
  players?: '1P' | '1-2P' | '1-4P';
  sessionMinutes?: number;
  tags?: string[];
  inputs?: ('keyboard' | 'touch' | 'gamepad' | 'mouse')[];
  modes?: string[];
  storyBlurb?: string;
  levelCount?: number;
  status?: 'classic' | 'enhanced';
  tier?: 'S' | 'A' | 'B';
  twoPlayer?: 'none' | 'hotseat' | 'bot' | 'both';
  moods?: string[];
  collections?: string[];
  supportsDailySeed?: boolean;
}

export interface GameSessionScore {
  gameId: string;
  gameTitle: string;
  score: number;
  date: string;
  durationSeconds: number;
  playedOn?: string;
  difficulty?: DifficultySetting;
}

export interface PlayerStats {
  totalPlayCount: number;
  totalTimeSeconds: number;
  highScores: Record<string, number>;
  favorites: string[];
  recentSessions: GameSessionScore[];
  achievements?: Record<string, string[]>;
  levelProgress?: Record<string, number>;
  profile?: { name: string; avatarSeed: number };
}

export type ApexEventType = 'session_start' | 'score' | 'level_complete' | 'achievement' | 'session_end' | 'mode_start' | 'result' | 'cosmetic_equip';

export interface ApexEventMessage {
  type: 'APEX_EVENT';
  v?: 2;
  gameId: string;
  eventType: ApexEventType;
  mode?: string;
  difficulty?: DifficultySetting;
  seed?: number;
  score?: number;
  level?: number;
  durationSec?: number;
  achievementId?: string;
  cosmetic?: { slot: string; id: string };
  result?: { win: boolean; score?: number; best?: number; stats?: Record<string, unknown> };
  timestamp?: number;
}
