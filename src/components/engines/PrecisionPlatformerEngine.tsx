import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface PrecisionPlatformerEngineProps {
  variant?: string; // 'celeste' | 'mario' | 'mario-world' | 'rayman' | 'ori'
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  highScore?: number;
  onLevelComplete?: (level: number) => void;
  onRestart?: () => void;
}

interface Platform {
  x: number;
  y: number;
  w: number;
  h: number;
  isSpike?: boolean;
}

interface Gem {
  x: number;
  y: number;
  collected: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface StageDef {
  name: string;
  width: number;
  goalX: number;
  goalY: number;
  sky: [string, string, string];
  ridge: string;
  platforms: Platform[];
  gems: Gem[];
}

const CELESTE_STAGES: StageDef[] = [
  {
    name: 'Ascent',
    width: 1540,
    goalX: 1400,
    goalY: 120,
    sky: ['#040714', '#0B1528', '#1A1832'],
    ridge: 'rgba(15, 23, 42, 0.6)',
    platforms: [
      { x: 0, y: 420, w: 340, h: 60 },
      { x: 380, y: 370, w: 100, h: 20 },
      { x: 520, y: 310, w: 90, h: 20 },
      { x: 340, y: 460, w: 400, h: 20, isSpike: true },
      { x: 670, y: 160, w: 30, h: 260 },
      { x: 770, y: 120, w: 30, h: 300 },
      { x: 860, y: 220, w: 110, h: 20 },
      { x: 1020, y: 180, w: 100, h: 20 },
      { x: 1160, y: 140, w: 120, h: 20 },
      { x: 1340, y: 120, w: 200, h: 80 },
    ],
    gems: [
      { x: 430, y: 330, collected: false },
      { x: 565, y: 270, collected: false },
      { x: 720, y: 230, collected: false },
      { x: 915, y: 180, collected: false },
      { x: 1070, y: 140, collected: false },
      { x: 1220, y: 100, collected: false },
      { x: 1440, y: 80, collected: false },
    ],
  },
  {
    name: 'Crystal Climb',
    width: 1720,
    goalX: 1560,
    goalY: 160,
    sky: ['#06081F', '#101A3A', '#1F2A5C'],
    ridge: 'rgba(49, 46, 129, 0.55)',
    platforms: [
      { x: 0, y: 420, w: 260, h: 60 },
      { x: 330, y: 390, w: 90, h: 20 },
      { x: 470, y: 340, w: 90, h: 20 },
      { x: 610, y: 290, w: 90, h: 20 },
      { x: 560, y: 460, w: 520, h: 20, isSpike: true },
      { x: 750, y: 240, w: 30, h: 220 },
      { x: 850, y: 200, w: 30, h: 260 },
      { x: 940, y: 290, w: 100, h: 20 },
      { x: 1090, y: 250, w: 100, h: 20 },
      { x: 1240, y: 210, w: 110, h: 20 },
      { x: 1400, y: 170, w: 120, h: 20 },
      { x: 1560, y: 160, w: 160, h: 80 },
    ],
    gems: [
      { x: 375, y: 350, collected: false },
      { x: 515, y: 300, collected: false },
      { x: 655, y: 250, collected: false },
      { x: 800, y: 210, collected: false },
      { x: 990, y: 250, collected: false },
      { x: 1140, y: 210, collected: false },
      { x: 1460, y: 130, collected: false },
    ],
  },
  {
    name: 'The Summit',
    width: 1900,
    goalX: 1740,
    goalY: 100,
    sky: ['#0B0716', '#221033', '#3B1B4D'],
    ridge: 'rgba(88, 28, 135, 0.5)',
    platforms: [
      { x: 0, y: 420, w: 240, h: 60 },
      { x: 300, y: 380, w: 100, h: 20 },
      { x: 450, y: 330, w: 90, h: 20 },
      { x: 590, y: 280, w: 90, h: 20 },
      { x: 730, y: 320, w: 100, h: 20 },
      { x: 880, y: 260, w: 90, h: 20 },
      { x: 1020, y: 210, w: 100, h: 20 },
      { x: 1170, y: 260, w: 90, h: 20 },
      { x: 1310, y: 200, w: 100, h: 20 },
      { x: 1460, y: 150, w: 120, h: 20 },
      { x: 1620, y: 100, w: 280, h: 80 },
    ],
    gems: [
      { x: 350, y: 340, collected: false },
      { x: 495, y: 290, collected: false },
      { x: 635, y: 240, collected: false },
      { x: 780, y: 280, collected: false },
      { x: 925, y: 220, collected: false },
      { x: 1215, y: 220, collected: false },
      { x: 1520, y: 110, collected: false },
    ],
  },
];

const ORI_STAGES: StageDef[] = [
  {
    name: 'Sunken Glades',
    width: 1640,
    goalX: 1500,
    goalY: 150,
    sky: ['#041B1E', '#0A3334', '#14494A'],
    ridge: 'rgba(13, 148, 136, 0.35)',
    platforms: [
      { x: 0, y: 420, w: 280, h: 60 },
      { x: 340, y: 380, w: 110, h: 20 },
      { x: 500, y: 330, w: 90, h: 20 },
      { x: 650, y: 280, w: 90, h: 20 },
      { x: 800, y: 330, w: 100, h: 20 },
      { x: 960, y: 270, w: 100, h: 20 },
      { x: 1120, y: 220, w: 100, h: 20 },
      { x: 1290, y: 180, w: 120, h: 20 },
      { x: 1480, y: 150, w: 160, h: 80 },
    ],
    gems: [
      { x: 395, y: 340, collected: false },
      { x: 545, y: 290, collected: false },
      { x: 695, y: 240, collected: false },
      { x: 850, y: 290, collected: false },
      { x: 1010, y: 230, collected: false },
      { x: 1170, y: 180, collected: false },
      { x: 1345, y: 140, collected: false },
    ],
  },
  {
    name: 'Ginso Tree',
    width: 1780,
    goalX: 1640,
    goalY: 110,
    sky: ['#1A0B26', '#31124A', '#4A1C63'],
    ridge: 'rgba(126, 34, 206, 0.4)',
    platforms: [
      { x: 0, y: 420, w: 250, h: 60 },
      { x: 320, y: 380, w: 90, h: 20 },
      { x: 460, y: 330, w: 90, h: 20 },
      { x: 600, y: 280, w: 90, h: 20 },
      { x: 740, y: 230, w: 90, h: 20 },
      { x: 690, y: 460, w: 480, h: 20, isSpike: true },
      { x: 880, y: 190, w: 30, h: 270 },
      { x: 970, y: 280, w: 90, h: 20 },
      { x: 1110, y: 230, w: 100, h: 20 },
      { x: 1260, y: 180, w: 100, h: 20 },
      { x: 1420, y: 140, w: 120, h: 20 },
      { x: 1640, y: 110, w: 140, h: 80 },
    ],
    gems: [
      { x: 365, y: 340, collected: false },
      { x: 505, y: 290, collected: false },
      { x: 645, y: 240, collected: false },
      { x: 785, y: 190, collected: false },
      { x: 1015, y: 240, collected: false },
      { x: 1160, y: 190, collected: false },
      { x: 1480, y: 100, collected: false },
    ],
  },
  {
    name: 'Spirit Willow',
    width: 1920,
    goalX: 1780,
    goalY: 90,
    sky: ['#06131C', '#0F2B3A', '#1C4A55'],
    ridge: 'rgba(34, 211, 238, 0.3)',
    platforms: [
      { x: 0, y: 420, w: 240, h: 60 },
      { x: 290, y: 390, w: 100, h: 20 },
      { x: 440, y: 340, w: 90, h: 20 },
      { x: 580, y: 290, w: 90, h: 20 },
      { x: 720, y: 250, w: 100, h: 20 },
      { x: 870, y: 300, w: 90, h: 20 },
      { x: 1010, y: 240, w: 100, h: 20 },
      { x: 1160, y: 190, w: 100, h: 20 },
      { x: 1310, y: 240, w: 90, h: 20 },
      { x: 1450, y: 170, w: 110, h: 20 },
      { x: 1610, y: 120, w: 130, h: 20 },
      { x: 1770, y: 90, w: 150, h: 80 },
    ],
    gems: [
      { x: 340, y: 350, collected: false },
      { x: 485, y: 300, collected: false },
      { x: 625, y: 250, collected: false },
      { x: 770, y: 210, collected: false },
      { x: 915, y: 260, collected: false },
      { x: 1060, y: 200, collected: false },
      { x: 1660, y: 80, collected: false },
    ],
  },
];

const RAYMAN_STAGES: StageDef[] = [
  {
    name: 'Dream Forest',
    width: 1600,
    goalX: 1460,
    goalY: 160,
    sky: ['#1B1033', '#3B1B5A', '#6D28D9'],
    ridge: 'rgba(109, 40, 217, 0.4)',
    platforms: [
      { x: 0, y: 420, w: 280, h: 60 },
      { x: 340, y: 380, w: 100, h: 20 },
      { x: 490, y: 330, w: 90, h: 20 },
      { x: 640, y: 280, w: 90, h: 20 },
      { x: 790, y: 320, w: 100, h: 20 },
      { x: 950, y: 260, w: 100, h: 20 },
      { x: 1110, y: 210, w: 100, h: 20 },
      { x: 1270, y: 170, w: 120, h: 20 },
      { x: 1440, y: 160, w: 160, h: 80 },
    ],
    gems: [
      { x: 390, y: 340, collected: false },
      { x: 535, y: 290, collected: false },
      { x: 685, y: 240, collected: false },
      { x: 840, y: 280, collected: false },
      { x: 1000, y: 220, collected: false },
      { x: 1160, y: 170, collected: false },
      { x: 1325, y: 130, collected: false },
    ],
  },
  {
    name: 'Band Land',
    width: 1820,
    goalX: 1680,
    goalY: 110,
    sky: ['#2A0F1C', '#54122E', '#8C1D40'],
    ridge: 'rgba(190, 24, 93, 0.4)',
    platforms: [
      { x: 0, y: 420, w: 250, h: 60 },
      { x: 310, y: 380, w: 90, h: 20 },
      { x: 450, y: 330, w: 90, h: 20 },
      { x: 590, y: 280, w: 90, h: 20 },
      { x: 530, y: 460, w: 560, h: 20, isSpike: true },
      { x: 730, y: 230, w: 30, h: 230 },
      { x: 840, y: 190, w: 30, h: 270 },
      { x: 930, y: 280, w: 90, h: 20 },
      { x: 1070, y: 230, w: 100, h: 20 },
      { x: 1220, y: 180, w: 100, h: 20 },
      { x: 1380, y: 140, w: 120, h: 20 },
      { x: 1680, y: 110, w: 140, h: 80 },
    ],
    gems: [
      { x: 355, y: 340, collected: false },
      { x: 495, y: 290, collected: false },
      { x: 635, y: 240, collected: false },
      { x: 790, y: 200, collected: false },
      { x: 975, y: 240, collected: false },
      { x: 1120, y: 190, collected: false },
      { x: 1440, y: 100, collected: false },
    ],
  },
  {
    name: 'Candy Chasm',
    width: 1960,
    goalX: 1820,
    goalY: 90,
    sky: ['#1A0B1F', '#3F1035', '#7A1F4C'],
    ridge: 'rgba(236, 72, 153, 0.35)',
    platforms: [
      { x: 0, y: 420, w: 240, h: 60 },
      { x: 290, y: 390, w: 100, h: 20 },
      { x: 440, y: 340, w: 90, h: 20 },
      { x: 580, y: 290, w: 90, h: 20 },
      { x: 720, y: 250, w: 100, h: 20 },
      { x: 870, y: 300, w: 90, h: 20 },
      { x: 1010, y: 240, w: 100, h: 20 },
      { x: 1160, y: 190, w: 100, h: 20 },
      { x: 1310, y: 240, w: 90, h: 20 },
      { x: 1450, y: 170, w: 110, h: 20 },
      { x: 1610, y: 120, w: 130, h: 20 },
      { x: 1810, y: 90, w: 150, h: 80 },
    ],
    gems: [
      { x: 340, y: 350, collected: false },
      { x: 485, y: 300, collected: false },
      { x: 625, y: 250, collected: false },
      { x: 770, y: 210, collected: false },
      { x: 915, y: 260, collected: false },
      { x: 1060, y: 200, collected: false },
      { x: 1660, y: 80, collected: false },
    ],
  },
];

const MARIO_STAGES: StageDef[] = [
  {
    name: 'Meadow Run',
    width: 1540,
    goalX: 1400,
    goalY: 120,
    sky: ['#04121a', '#0a2431', '#1c2c1f'],
    ridge: 'rgba(16, 60, 48, 0.55)',
    platforms: [
      { x: 0, y: 420, w: 340, h: 60 },
      { x: 380, y: 370, w: 100, h: 20 },
      { x: 520, y: 310, w: 90, h: 20 },
      { x: 340, y: 460, w: 400, h: 20, isSpike: true },
      { x: 670, y: 160, w: 30, h: 260 },
      { x: 770, y: 120, w: 30, h: 300 },
      { x: 860, y: 220, w: 110, h: 20 },
      { x: 1020, y: 180, w: 100, h: 20 },
      { x: 1160, y: 140, w: 120, h: 20 },
      { x: 1340, y: 120, w: 200, h: 80 },
    ],
    gems: [
      { x: 430, y: 330, collected: false },
      { x: 565, y: 270, collected: false },
      { x: 720, y: 220, collected: false },
      { x: 915, y: 180, collected: false },
      { x: 1070, y: 140, collected: false },
      { x: 1220, y: 100, collected: false },
      { x: 1440, y: 80, collected: false },
    ],
  },
  {
    name: 'Canyon Crossing',
    width: 1860,
    goalX: 1740,
    goalY: 160,
    sky: ['#150b0a', '#2a1410', '#3a1d13'],
    ridge: 'rgba(88, 42, 24, 0.45)',
    platforms: [
      { x: 0, y: 420, w: 220, h: 60 },
      { x: 220, y: 460, w: 900, h: 20, isSpike: true },
      { x: 300, y: 380, w: 90, h: 20 },
      { x: 460, y: 340, w: 90, h: 20 },
      { x: 620, y: 300, w: 90, h: 20 },
      { x: 780, y: 340, w: 90, h: 20 },
      { x: 940, y: 280, w: 80, h: 20 },
      { x: 1100, y: 240, w: 90, h: 20 },
      { x: 1260, y: 200, w: 110, h: 20 },
      { x: 1430, y: 120, w: 30, h: 300 },
      { x: 1520, y: 180, w: 110, h: 20 },
      { x: 1680, y: 160, w: 180, h: 80 },
    ],
    gems: [
      { x: 345, y: 340, collected: false },
      { x: 505, y: 300, collected: false },
      { x: 665, y: 260, collected: false },
      { x: 825, y: 300, collected: false },
      { x: 980, y: 240, collected: false },
      { x: 1145, y: 200, collected: false },
      { x: 1315, y: 160, collected: false },
      { x: 1575, y: 140, collected: false },
      { x: 1720, y: 120, collected: false },
    ],
  },
  {
    name: 'Sunset Rooftops',
    width: 1970,
    goalX: 1830,
    goalY: 80,
    sky: ['#120a20', '#2a1038', '#4a1838'],
    ridge: 'rgba(76, 29, 88, 0.5)',
    platforms: [
      { x: 0, y: 420, w: 260, h: 60 },
      { x: 260, y: 460, w: 1300, h: 20, isSpike: true },
      { x: 330, y: 380, w: 100, h: 20 },
      { x: 490, y: 330, w: 100, h: 20 },
      { x: 650, y: 280, w: 90, h: 20 },
      { x: 800, y: 240, w: 90, h: 20 },
      { x: 950, y: 200, w: 110, h: 20 },
      { x: 1120, y: 240, w: 90, h: 20 },
      { x: 1270, y: 180, w: 100, h: 20 },
      { x: 1430, y: 140, w: 100, h: 20 },
      { x: 1590, y: 100, w: 140, h: 20 },
      { x: 1770, y: 80, w: 200, h: 80 },
    ],
    gems: [
      { x: 380, y: 340, collected: false },
      { x: 540, y: 290, collected: false },
      { x: 695, y: 240, collected: false },
      { x: 845, y: 200, collected: false },
      { x: 1005, y: 160, collected: false },
      { x: 1165, y: 200, collected: false },
      { x: 1320, y: 140, collected: false },
      { x: 1480, y: 100, collected: false },
      { x: 1660, y: 60, collected: false },
      { x: 1810, y: 40, collected: false },
    ],
  },
];

const MARIO_TOTAL_GEMS = MARIO_STAGES.reduce((sum, stage) => sum + stage.gems.length, 0);

const MARIO_WORLD_STAGES: StageDef[] = [
  {
    name: 'Floating Isles',
    width: 1600,
    goalX: 1480,
    goalY: 140,
    sky: ['#38BDF8', '#BAE6FD', '#FEF9C3'],
    ridge: 'rgba(110, 231, 183, 0.55)',
    platforms: [
      { x: 0, y: 420, w: 240, h: 60 },
      { x: 300, y: 390, w: 120, h: 20 },
      { x: 480, y: 340, w: 110, h: 20 },
      { x: 650, y: 300, w: 90, h: 20 },
      { x: 800, y: 350, w: 100, h: 20 },
      { x: 950, y: 290, w: 110, h: 20 },
      { x: 1130, y: 250, w: 100, h: 20 },
      { x: 1300, y: 200, w: 140, h: 20 },
      { x: 1460, y: 140, w: 180, h: 80 },
    ],
    gems: [
      { x: 360, y: 350, collected: false },
      { x: 530, y: 300, collected: false },
      { x: 700, y: 260, collected: false },
      { x: 850, y: 310, collected: false },
      { x: 1000, y: 250, collected: false },
      { x: 1180, y: 210, collected: false },
      { x: 1360, y: 160, collected: false },
      { x: 1520, y: 100, collected: false },
    ],
  },
  {
    name: 'Windmill Heights',
    width: 1780,
    goalX: 1700,
    goalY: 120,
    sky: ['#F59E0B', '#FDBA74', '#FEF3C7'],
    ridge: 'rgba(180, 83, 9, 0.45)',
    platforms: [
      { x: 0, y: 420, w: 220, h: 60 },
      { x: 280, y: 380, w: 90, h: 20 },
      { x: 430, y: 330, w: 90, h: 20 },
      { x: 580, y: 280, w: 90, h: 20 },
      { x: 730, y: 320, w: 100, h: 20 },
      { x: 890, y: 260, w: 90, h: 20 },
      { x: 1040, y: 220, w: 100, h: 20 },
      { x: 1200, y: 280, w: 90, h: 20 },
      { x: 1350, y: 200, w: 110, h: 20 },
      { x: 1520, y: 150, w: 140, h: 20 },
      { x: 1660, y: 120, w: 120, h: 60 },
    ],
    gems: [
      { x: 320, y: 340, collected: false },
      { x: 480, y: 290, collected: false },
      { x: 625, y: 240, collected: false },
      { x: 780, y: 280, collected: false },
      { x: 935, y: 220, collected: false },
      { x: 1090, y: 180, collected: false },
      { x: 1245, y: 240, collected: false },
      { x: 1405, y: 160, collected: false },
      { x: 1560, y: 110, collected: false },
      { x: 1700, y: 80, collected: false },
    ],
  },
  {
    name: 'Starlit Bridge',
    width: 1880,
    goalX: 1750,
    goalY: 140,
    sky: ['#1E1B4B', '#312E81', '#6D28D9'],
    ridge: 'rgba(76, 29, 149, 0.6)',
    platforms: [
      { x: 0, y: 420, w: 240, h: 60 },
      { x: 290, y: 380, w: 100, h: 20 },
      { x: 440, y: 340, w: 80, h: 20 },
      { x: 570, y: 300, w: 80, h: 20 },
      { x: 700, y: 340, w: 90, h: 20 },
      { x: 840, y: 280, w: 90, h: 20 },
      { x: 980, y: 320, w: 80, h: 20 },
      { x: 1110, y: 260, w: 90, h: 20 },
      { x: 1250, y: 220, w: 90, h: 20 },
      { x: 1390, y: 280, w: 90, h: 20 },
      { x: 1530, y: 180, w: 100, h: 20 },
      { x: 1680, y: 140, w: 200, h: 80 },
    ],
    gems: [
      { x: 340, y: 340, collected: false },
      { x: 490, y: 300, collected: false },
      { x: 610, y: 260, collected: false },
      { x: 745, y: 300, collected: false },
      { x: 885, y: 240, collected: false },
      { x: 1020, y: 280, collected: false },
      { x: 1155, y: 220, collected: false },
      { x: 1295, y: 180, collected: false },
      { x: 1435, y: 240, collected: false },
      { x: 1580, y: 140, collected: false },
    ],
  },
];

const MARIO_WORLD_TOTAL_GEMS = MARIO_WORLD_STAGES.reduce((sum, stage) => sum + stage.gems.length, 0);
const CELESTE_TOTAL_GEMS = CELESTE_STAGES.reduce((sum, stage) => sum + stage.gems.length, 0);
const ORI_TOTAL_GEMS = ORI_STAGES.reduce((sum, stage) => sum + stage.gems.length, 0);
const RAYMAN_TOTAL_GEMS = RAYMAN_STAGES.reduce((sum, stage) => sum + stage.gems.length, 0);

export const PrecisionPlatformerEngine: React.FC<PrecisionPlatformerEngineProps> = ({
  variant = 'celeste',
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
  highScore = 0,
  onLevelComplete,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [collectibles, setCollectibles] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [stage, setStage] = useState(0);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'VICTORY'>('READY');

  const isMario = variant === 'mario';
  const isMarioWorld = variant === 'mario-world';
  const stageDefsRef = useRef<StageDef[]>(
    isMario
      ? MARIO_STAGES
      : isMarioWorld
      ? MARIO_WORLD_STAGES
      : variant === 'ori'
      ? ORI_STAGES
      : variant === 'rayman'
      ? RAYMAN_STAGES
      : CELESTE_STAGES,
  );
  const stageIndexRef = useRef(0);
  const bannerRef = useRef<{ title: string; sub: string; frames: number } | null>(null);
  const glideHeldRef = useRef(false);

  const themeConfig = {
    title: isMario
      ? 'Fox Courier: Parcel Run 2.5D'
      : isMarioWorld
      ? 'Cloudhop Pip: Sky Isle Run 2.5D'
      : variant === 'rayman'
      ? 'Rayman Rhythm Glide 2.5D'
      : variant === 'ori'
      ? 'Nibel Spirit Restorer 2.5D'
      : 'Ascent 2.5D (Celeste Mountain)',
    tagline: isMario
      ? 'Three routes of wall jumps, coin lines, and flagpole sprints'
      : isMarioWorld
      ? 'Double-jump the floating isles and glide home'
      : 'Wall-jump, air dash, and scale the peak',
    collectibleName:
      variant === 'mario' || isMarioWorld
        ? 'Gold Coins'
        : variant === 'rayman'
        ? 'Lums'
        : variant === 'ori'
        ? 'Light Orbs'
        : 'Strawberries',
    collectibleColor:
      variant === 'mario' || isMarioWorld || variant === 'rayman'
        ? '#FACC15'
        : variant === 'ori'
        ? '#38BDF8'
        : '#F43F5E',
    heroColor:
      isMarioWorld
        ? '#22C55E'
        : variant === 'mario'
        ? '#EF4444'
        : variant === 'rayman'
        ? '#EC4899'
        : variant === 'ori'
        ? '#E0F2FE'
        : '#0284C7',
    dashLabel:
      variant === 'mario'
        ? 'Shift: Super Sprint'
        : isMarioWorld
        ? 'Shift: Cape Glide'
        : variant === 'rayman'
        ? 'Shift: Hair Glide'
        : variant === 'ori'
        ? 'Shift: Spirit Dash'
        : 'Shift: Air Dash',
  };

  const controlsLabel = isMarioWorld
    ? 'A/D: Move · Space: Jump ×2 · Shift: Glide'
    : `A/D: Move · Space: Jump · ${themeConfig.dashLabel}`;

  const totalGems = isMario
    ? MARIO_TOTAL_GEMS
    : isMarioWorld
    ? MARIO_WORLD_TOTAL_GEMS
    : variant === 'ori'
    ? ORI_TOTAL_GEMS
    : variant === 'rayman'
    ? RAYMAN_TOTAL_GEMS
    : CELESTE_TOTAL_GEMS;

  const playerRef = useRef({
    x: 60,
    y: 360,
    vx: 0,
    vy: 0,
    w: 16,
    h: 22,
    grounded: false,
    onWall: 0,
    hasDash: true,
    dashTimer: 0,
    facing: 1,
    jumps: 0,
    gliding: false,
  });

  const cameraXRef = useRef(0);
  const platformsRef = useRef<Platform[]>([]);
  const gemsRef = useRef<Gem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const deathsRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'VICTORY'>('READY');
  stateRef.current = gameState;

  const initLevel = useCallback((index: number) => {
    const def = stageDefsRef.current[index];
    platformsRef.current = def.platforms.map((plat) => ({ ...plat }));
    gemsRef.current = def.gems.map((gem) => ({ ...gem, collected: false }));
    const p = playerRef.current;
    p.x = 60;
    p.y = 360;
    p.vx = 0;
    p.vy = 0;
    p.grounded = false;
    p.onWall = 0;
    p.hasDash = true;
    p.dashTimer = 0;
    p.facing = 1;
    p.jumps = 0;
    p.gliding = false;
    glideHeldRef.current = false;
    cameraXRef.current = 0;
    particlesRef.current = [];
  }, []);

  const respawn = useCallback(() => {
    deathsRef.current++;
    setDeaths(deathsRef.current);
    audio.playHit();
    const p = playerRef.current;
    p.x = 60;
    p.y = 360;
    p.vx = 0;
    p.vy = 0;
    p.hasDash = true;
    p.dashTimer = 0;
    p.jumps = 0;
    p.gliding = false;
  }, []);

  const startGame = useCallback(() => {
    if (stateRef.current === 'VICTORY') onRestart?.();
    stageIndexRef.current = 0;
    setStage(0);
    scoreRef.current = 0;
    deathsRef.current = 0;
    setCollectibles(0);
    setDeaths(0);
    initLevel(0);
    stateRef.current = 'PLAYING';
    setGameState('PLAYING');
    audio.playClick();
  }, [initLevel, onRestart]);

  const jump = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    const p = playerRef.current;
    if (p.grounded) {
      p.vy = -8.8;
      p.grounded = false;
      p.jumps = 1;
      audio.playJump();
    } else if (p.onWall !== 0) {
      p.vy = -8.2;
      p.vx = -p.onWall * 6.5;
      p.facing = -p.onWall;
      p.hasDash = true;
      p.jumps = 1;
      audio.playJump();
    } else if (isMarioWorld && p.jumps === 1) {
      p.vy = -7.4;
      p.jumps = 2;
      audio.playJump();
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: p.x + (Math.random() - 0.5) * 10,
          y: p.y + p.h,
          vx: (Math.random() - 0.5) * 2.4,
          vy: 1 + Math.random() * 1.6,
          life: 18,
          color: '#86EFAC',
        });
      }
    }
  }, [isMarioWorld]);

  const dash = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    const p = playerRef.current;
    if (p.hasDash && p.dashTimer <= 0) {
      p.hasDash = false;
      p.dashTimer = 14;
      p.vx = p.facing * 12;
      p.vy = 0;
      audio.playDash();

      for (let i = 0; i < 8; i++) {
        particlesRef.current.push({
          x: p.x + (Math.random() - 0.5) * 8,
          y: p.y + (Math.random() - 0.5) * 8,
          vx: -p.facing * (2 + Math.random() * 2),
          vy: (Math.random() - 0.5) * 2,
          life: 20,
          color: themeConfig.collectibleColor,
        });
      }
    }
  }, [themeConfig.collectibleColor]);

  // Controls
  useEffect(() => {
    const keys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;
      keys.add(e.code);
      if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (stateRef.current === 'PLAYING') {
          jump();
        } else {
          startGame();
        }
      } else if (e.code === 'ShiftLeft' || e.code === 'KeyK' || e.code === 'KeyJ') {
        e.preventDefault();
        if (isMarioWorld) glideHeldRef.current = true;
        else dash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
      if (e.code === 'ShiftLeft' || e.code === 'KeyK' || e.code === 'KeyJ') glideHeldRef.current = false;
    };

    const handleBlur = () => {
      keys.clear();
      glideHeldRef.current = false;
    };

    const interval = setInterval(() => {
      if (isPaused || stateRef.current !== 'PLAYING') return;
      const p = playerRef.current;
      if (p.dashTimer > 0) return;

      const speedMult = difficulty === 'hard' ? 1.2 : difficulty === 'easy' ? 0.85 : 1.0;
      const accel = (p.grounded ? 0.9 : 0.45) * speedMult;
      const maxSpeed = 4.8 * speedMult;

      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        p.vx = Math.max(-maxSpeed, p.vx - accel);
        p.facing = -1;
      } else if (keys.has('KeyD') || keys.has('ArrowRight')) {
        p.vx = Math.min(maxSpeed, p.vx + accel);
        p.facing = 1;
      } else {
        p.vx *= p.grounded ? 0.75 : 0.92;
      }
    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [dash, difficulty, isMarioWorld, isPaused, jump, startGame]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const loop = () => {
      if (isPaused) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;
      const stages = stageDefsRef.current;
      const stageIndex = stageIndexRef.current;
      const stageDef = stages[stageIndex];

      // UPDATE
      if (stateRef.current === 'PLAYING') {
        const p = playerRef.current;

        if (p.dashTimer > 0) {
          p.dashTimer--;
          p.x += p.vx;
        } else {
          p.vy += 0.42;
          if (p.onWall !== 0 && p.vy > 1.8) {
            p.vy = 1.8;
          }
          p.gliding =
            isMarioWorld && glideHeldRef.current && !p.grounded && p.vy > 0 && p.jumps > 0;
          if (p.gliding) p.vy = Math.min(p.vy, 2.2);
          p.x += p.vx;
          p.y += p.vy;
        }

        const targetCamX = p.x - width * 0.35;
        cameraXRef.current += (targetCamX - cameraXRef.current) * 0.1;
        cameraXRef.current = Math.max(0, Math.min(stageDef.width - width, cameraXRef.current));

        const wasGrounded = p.grounded;
        p.grounded = false;
        p.onWall = 0;

        let spikesHit = false;
        for (const plat of platformsRef.current) {
          if (plat.isSpike) {
            if (
              p.x + p.w > plat.x &&
              p.x < plat.x + plat.w &&
              p.y + p.h > plat.y &&
              p.y < plat.y + plat.h
            ) {
              respawn();
              spikesHit = true;
              break;
            }
            continue;
          }

          if (
            p.x + p.w > plat.x &&
            p.x < plat.x + plat.w &&
            p.y + p.h > plat.y &&
            p.y < plat.y + plat.h
          ) {
            if (p.vy > 0 && p.y + p.h - p.vy <= plat.y + 8) {
              p.y = plat.y - p.h;
              p.vy = 0;
              p.grounded = true;
              p.hasDash = true;
            } else if (p.vy < 0 && p.y - p.vy >= plat.y + plat.h - 8) {
              p.y = plat.y + plat.h;
              p.vy = 0;
            } else {
              if (p.vx > 0) {
                p.x = plat.x - p.w;
                p.vx = 0;
                p.onWall = 1;
              } else if (p.vx < 0) {
                p.x = plat.x + plat.w;
                p.vx = 0;
                p.onWall = -1;
              }
            }
          }
        }

        if (isMarioWorld) {
          if (p.grounded) p.jumps = 0;
          else if (wasGrounded && p.jumps === 0) p.jumps = 1;
        }

        if (!spikesHit) {
          // Collectibles check
          for (const gem of gemsRef.current) {
            if (!gem.collected && Math.hypot(p.x + p.w / 2 - gem.x, p.y + p.h / 2 - gem.y) < 22) {
              gem.collected = true;
              scoreRef.current += 100;
              setCollectibles((prev) => prev + 1);
              onScoreUpdate(scoreRef.current);
              audio.playScore();

              for (let i = 0; i < 12; i++) {
                particlesRef.current.push({
                  x: gem.x,
                  y: gem.y,
                  vx: (Math.random() - 0.5) * 6,
                  vy: (Math.random() - 0.5) * 6,
                  life: 30,
                  color: themeConfig.collectibleColor,
                });
              }
            }
          }

          if (p.y > height + 80) respawn();

          if (p.x >= stageDef.goalX) {
            scoreRef.current += 500;
            onScoreUpdate(scoreRef.current);
            audio.playScore();
            onLevelComplete?.(stageIndex + 1);

            if (stageIndex + 1 < stages.length) {
              stageIndexRef.current = stageIndex + 1;
              setStage(stageIndex + 1);
              initLevel(stageIndex + 1);
              bannerRef.current = {
                title: `${isMarioWorld ? 'ISLE' : 'ROUTE'} ${stageIndex + 2}`,
                sub: stages[stageIndex + 1].name,
                frames: 120,
              };
            } else {
              stateRef.current = 'VICTORY';
              setGameState('VICTORY');
              onGameOver(scoreRef.current);
            }
          }
        }
      }

      // Update particles
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const pt = particlesRef.current[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life--;
        if (pt.life <= 0) particlesRef.current.splice(i, 1);
      }

      // RENDER
      ctx.clearRect(0, 0, width, height);
      const camX = cameraXRef.current;

      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, stageDef.sky[0]);
      skyGrad.addColorStop(0.6, stageDef.sky[1]);
      skyGrad.addColorStop(1, stageDef.sky[2]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Mountain / Hill Peaks Parallax
      ctx.fillStyle = stageDef.ridge;
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let mx = 0; mx <= width; mx += 80) {
        const my = height - 160 - Math.sin((mx + camX * 0.2) * 0.02) * 60;
        ctx.lineTo(mx, my);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.translate(-camX, 0);

      // Platforms
      platformsRef.current.forEach((plat) => {
        if (plat.isSpike) {
          ctx.fillStyle = '#EF4444';
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 8;
          for (let sx = plat.x; sx < plat.x + plat.w; sx += 14) {
            ctx.beginPath();
            ctx.moveTo(sx, plat.y + plat.h);
            ctx.lineTo(sx + 7, plat.y);
            ctx.lineTo(sx + 14, plat.y + plat.h);
            ctx.closePath();
            ctx.fill();
          }
          ctx.shadowBlur = 0;
          return;
        }

        ctx.fillStyle = themeConfig.collectibleColor;
        ctx.fillRect(plat.x, plat.y, plat.w, 4);

        const bodyGrad = ctx.createLinearGradient(plat.x, plat.y, plat.x, plat.y + plat.h);
        bodyGrad.addColorStop(0, '#1E293B');
        bodyGrad.addColorStop(1, '#0F172A');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(plat.x, plat.y + 4, plat.w, plat.h - 4);

        ctx.fillStyle = '#090D16';
        ctx.fillRect(plat.x + plat.w - 4, plat.y, 4, plat.h);
      });

      // Goal flag
      const wave = Math.sin(Date.now() * 0.006) * 4;
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(stageDef.goalX, stageDef.goalY);
      ctx.lineTo(stageDef.goalX, stageDef.goalY - 96);
      ctx.stroke();
      ctx.fillStyle = themeConfig.collectibleColor;
      ctx.shadowColor = themeConfig.collectibleColor;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(stageDef.goalX + 1, stageDef.goalY - 96);
      ctx.lineTo(stageDef.goalX + 46 + wave, stageDef.goalY - 84);
      ctx.lineTo(stageDef.goalX + 1, stageDef.goalY - 70);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;

      // Collectibles
      gemsRef.current.forEach((gem) => {
        if (gem.collected) return;
        const bob = Math.sin(Date.now() * 0.005) * 4;
        ctx.fillStyle = themeConfig.collectibleColor;
        ctx.shadowColor = themeConfig.collectibleColor;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(gem.x, gem.y + bob, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Particles
      particlesRef.current.forEach((pt) => {
        ctx.fillStyle = pt.color;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
      });

      // Player
      const p = playerRef.current;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
      ctx.beginPath();
      ctx.ellipse(p.x + p.w / 2, p.y + p.h, p.w * 0.6, 3, 0, 0, Math.PI * 2);
      ctx.fill();

      if (isMarioWorld) {
        const bob = p.gliding ? Math.sin(Date.now() * 0.012) * 1.5 : 0;
        const cx = p.x + p.w / 2;

        // Cape catching the wind
        if (p.gliding) {
          ctx.fillStyle = 'rgba(103, 232, 249, 0.35)';
          ctx.beginPath();
          ctx.ellipse(cx - p.facing * 9, p.y + p.h / 2 + 2, 12, 7, -p.facing * 0.35, 0, Math.PI * 2);
          ctx.fill();
        }

        // Feet
        ctx.fillStyle = '#15803D';
        ctx.fillRect(p.x + 1, p.y + p.h - 5, 6, 5);
        ctx.fillRect(p.x + p.w - 7, p.y + p.h - 5, 6, 5);

        // Body
        ctx.fillStyle = themeConfig.heroColor;
        ctx.shadowColor = themeConfig.heroColor;
        ctx.shadowBlur = p.gliding ? 12 : 4;
        ctx.beginPath();
        ctx.ellipse(cx, p.y + 14 + bob, 9, 10, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Belly
        ctx.fillStyle = '#FEF08A';
        ctx.beginPath();
        ctx.ellipse(cx + p.facing, p.y + 17 + bob, 4.5, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Eye bumps
        ctx.fillStyle = themeConfig.heroColor;
        ctx.beginPath();
        ctx.arc(cx - 5, p.y + 4 + bob, 4.5, 0, Math.PI * 2);
        ctx.arc(cx + 5, p.y + 4 + bob, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(cx - 5, p.y + 4 + bob, 3, 0, Math.PI * 2);
        ctx.arc(cx + 5, p.y + 4 + bob, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(cx - 5 + p.facing, p.y + 4 + bob, 1.4, 0, Math.PI * 2);
        ctx.arc(cx + 5 + p.facing, p.y + 4 + bob, 1.4, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Hero Body
        ctx.fillStyle = themeConfig.heroColor;
        ctx.shadowColor = themeConfig.heroColor;
        ctx.shadowBlur = p.hasDash ? 10 : 3;
        ctx.fillRect(p.x, p.y + 6, p.w, p.h - 6);
        ctx.shadowBlur = 0;

        // Face
        ctx.fillStyle = '#FED7AA';
        ctx.fillRect(p.x + (p.facing === 1 ? 4 : 0), p.y + 2, 10, 8);
        ctx.fillStyle = '#000000';
        ctx.fillRect(p.x + (p.facing === 1 ? 10 : 3), p.y + 4, 2.5, 3);
      }

      ctx.restore();

      // Route banner
      const banner = bannerRef.current;
      if (banner) {
        const alpha = Math.min(1, banner.frames / 30);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
        ctx.fillRect(width / 2 - 150, height * 0.34, 300, 74);
        ctx.textAlign = 'center';
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '700 20px system-ui, sans-serif';
        ctx.fillText(banner.title, width / 2, height * 0.34 + 32);
        ctx.fillStyle = '#FACC15';
        ctx.font = '600 13px system-ui, sans-serif';
        ctx.fillText(banner.sub, width / 2, height * 0.34 + 56);
        ctx.globalAlpha = 1;
        banner.frames--;
        if (banner.frames <= 0) bannerRef.current = null;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [
    initLevel,
    isMarioWorld,
    isPaused,
    onGameOver,
    onLevelComplete,
    onScoreUpdate,
    respawn,
    themeConfig.collectibleColor,
    themeConfig.heroColor,
  ]);

  useEffect(() => {
    if (!/(\?|&)test=1(?:&|$)/.test(window.location.search)) return;
    const host = window as typeof window & { PrecisionTest?: Record<string, unknown> };
    host.PrecisionTest = {
      state: () => ({
        variant,
        phase: stateRef.current,
        stage: stageIndexRef.current,
        stageName: stageDefsRef.current[stageIndexRef.current]?.name ?? '',
        stages: stageDefsRef.current.length,
        gems: gemsRef.current.filter((gem) => gem.collected).length,
        totalGems,
        deaths: deathsRef.current,
        score: scoreRef.current,
      }),
      start: () => startGame(),
      setStage: (index: number) => {
        const next = Math.max(0, Math.min(stageDefsRef.current.length - 1, Math.floor(index)));
        stageIndexRef.current = next;
        setStage(next);
        initLevel(next);
        stateRef.current = 'PLAYING';
        setGameState('PLAYING');
      },
      reachGoal: () => {
        const def = stageDefsRef.current[stageIndexRef.current];
        const p = playerRef.current;
        p.x = def.goalX + 2;
        p.y = def.goalY - 40;
        p.vx = 0;
        p.vy = 0;
      },
      collectAll: () => {
        const remaining = gemsRef.current.filter((gem) => !gem.collected).length;
        gemsRef.current.forEach((gem) => {
          gem.collected = true;
        });
        if (remaining > 0) {
          scoreRef.current += remaining * 100;
          setCollectibles((prev) => prev + remaining);
          onScoreUpdate(scoreRef.current);
        }
      },
      setScore: (score: number) => {
        scoreRef.current = Math.max(0, Math.floor(score));
        onScoreUpdate(scoreRef.current);
      },
    };
    return () => {
      delete host.PrecisionTest;
    };
  }, [initLevel, onScoreUpdate, startGame, totalGems, variant]);

  const stageName = stageDefsRef.current[stage]?.name ?? '';

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      {/* In-Game HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <div className="flex items-center gap-1.5">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: themeConfig.collectibleColor }}
            />
            <span className="text-sm font-mono font-bold text-white tabular-nums">
              {collectibles} / {totalGems} {themeConfig.collectibleName}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-xs text-slate-400">
            Deaths: <span className="font-mono text-amber-400">{deaths}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
            {isMarioWorld ? 'Isle' : isMario ? 'Route' : 'Trail'} {stage + 1}/{stageDefsRef.current.length} · {stageName}
          </div>
          <div className="text-xs font-mono text-slate-400 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
            {controlsLabel}
          </div>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">{themeConfig.title}</div>
          <p className="text-sm text-slate-300 mb-5">{themeConfig.tagline}</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            {isMario ? 'START ROUTE' : isMarioWorld ? 'START ISLE' : 'START STAGE'}
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-emerald-400 mb-1 tracking-tight">
            {isMario
              ? 'All Routes Delivered!'
              : isMarioWorld
              ? 'All Isles Cleared!'
              : variant === 'rayman'
              ? 'Dream Worlds Freed!'
              : variant === 'ori'
              ? 'Nibel Restored!'
              : 'Mountain Summited!'}
          </div>
          <div className="text-sm text-slate-300 mb-1">
            {themeConfig.collectibleName}: <span className="font-mono text-cyan-300 font-bold">{collectibles}/{totalGems}</span> · Deaths: <span className="font-mono text-amber-300">{deaths}</span>
          </div>
          <div className="text-xs text-slate-400 mb-4">
            Score <span className="font-mono text-emerald-300">{scoreRef.current}</span>
            {highScore > 0 && (
              <> · Best <span className="font-mono text-amber-300">{Math.max(highScore, scoreRef.current)}</span></>
            )}
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            {isMario || isMarioWorld ? 'Run Again' : 'Play Again'}
          </button>
        </div>
      )}
    </div>
  );
};
