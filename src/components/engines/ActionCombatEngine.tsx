import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

const W = 800;
const H = 480;
const GROUND = 392;
const STEP_MS = 1000 / 60;

type Variant = 'hollow' | 'deadcells' | 'castlevania' | 'metroid' | 'cuphead';
type EnemyKind = 'walker' | 'flyer' | 'turret' | 'hopper';
type Phase = 'READY' | 'PLAYING' | 'ZONECLEAR' | 'GAMEOVER' | 'VICTORY';
type AttackKind = 'whip' | 'nail' | 'sword' | 'shot' | 'pea';
type SpecialKind = 'axe' | 'missile' | 'focus' | 'roll' | 'parry';

interface PlatformDef { x: number; y: number; w: number }
interface CandleDef { x: number; y: number }
interface WaveDef { type: EnemyKind; count: number }
interface ZoneDef {
  name: string;
  sky: [string, string];
  platforms: PlatformDef[];
  waves: WaveDef[][];
  candles: CandleDef[];
  boss?: string;
}

interface VariantKit {
  title: string;
  subtitle: string;
  cleared: string;
  accent: string;
  bossName: string;
  attackName: string;
  specialName: string;
  startLabel: string;
  attack: AttackKind;
  special: SpecialKind;
  meleeRange: number;
  meleeDamage: number;
  shotDamage: number;
  speed: number;
  jump: number;
  maxAmmo: number;
  doubleJump: boolean;
  bossHp: number;
  hero: { cloth: string; trim: string; skin: string };
  zones: ZoneDef[];
}

interface Player {
  x: number; y: number; vx: number; vy: number; face: number;
  ground: boolean; jumps: number;
  hp: number; maxHp: number; ammo: number; soul: number;
  iframes: number; hurtT: number;
  atk: number; atkCd: number; swing: number;
  specialCd: number; dashT: number; dashCd: number;
  focusT: number; parryT: number; walk: number;
}

interface Enemy {
  kind: EnemyKind;
  x: number; y: number; baseY: number;
  vx: number; vy: number;
  hp: number; maxHp: number;
  t: number; dir: number; ground: boolean;
  flash: number; lastHit: number; fire: number;
}

interface Shot {
  x: number; y: number; vx: number; vy: number; grav: number;
  dmg: number; r: number; life: number; friendly: boolean;
  color: string; spin: boolean; kind: 'beam' | 'axe' | 'missile' | 'orb';
}

interface Pickup { x: number; y: number; vy: number; vx: number; kind: 'ammo' | 'heart' | 'coin'; t: number }
interface Candle { x: number; y: number; broken: boolean }
interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; color: string; size: number }
interface Popup { x: number; y: number; text: string; color: string; life: number }

interface Boss {
  x: number; y: number; baseY: number;
  hp: number; maxHp: number;
  t: number; mode: 'hover' | 'dive' | 'rise' | 'volley'; modeT: number; volley: number;
  face: number; flash: number; lastHit: number;
}

interface SimCallbacks {
  score: (score: number) => void;
  over: (score: number) => void;
  level?: (level: number) => void;
}

interface Hud {
  hp: number; maxHp: number;
  ammo: number; maxAmmo: number; soul: number; score: number;
  zone: string; zoneIndex: number; zoneTotal: number;
  bossHp: number | null; bossMax: number | null; bossName: string;
  special: SpecialKind; specialCd: number; dashCd: number;
}

interface Sim {
  cfg: VariantKit;
  zoneIndex: number;
  zone: ZoneDef;
  phase: Phase;
  player: Player;
  enemies: Enemy[];
  shots: Shot[];
  pickups: Pickup[];
  candles: Candle[];
  particles: Particle[];
  popups: Popup[];
  boss: Boss | null;
  bossSpawned: boolean;
  wave: number;
  nextKind: '' | 'wave' | 'boss' | 'clear' | 'victory';
  nextT: number;
  score: number;
  frame: number;
  shake: number;
  banner: string;
  bannerT: number;
  zoneClearT: number;
  ended: boolean;
  dmgScale: number;
  callbacks: SimCallbacks;
  sync: () => void;
}

interface Input { left: boolean; right: boolean; jump: boolean; attack: boolean; special: boolean; dash: boolean }

const EMPTY_INPUT: Input = { left: false, right: false, jump: false, attack: false, special: false, dash: false };

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hexAlpha = (hex: string, alpha: number) => {
  const value = parseInt(hex.slice(1), 16);
  return `rgba(${(value >> 16) & 255},${(value >> 8) & 255},${value & 255},${alpha})`;
};

const rrect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
};

const circle = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
};

const ridge = (ctx: CanvasRenderingContext2D, base: number, amp: number, phase: number, color: string) => {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-10, H);
  for (let x = -10; x <= W + 10; x += 18) {
    const y = base + Math.sin(x * 0.011 + phase) * amp + Math.sin(x * 0.028 + phase * 1.7) * amp * 0.45;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 10, H);
  ctx.closePath();
  ctx.fill();
};

/* ---------------- level kits ---------------- */

const groundCandles = (xs: number[], extra: CandleDef[] = []): CandleDef[] => [
  ...xs.map((x) => ({ x, y: GROUND })),
  ...extra,
];

const zone = (
  name: string,
  sky: [string, string],
  platforms: PlatformDef[],
  waves: WaveDef[][],
  candles: CandleDef[],
  boss?: string,
): ZoneDef => ({ name, sky, platforms, waves, candles, boss });

const KITS: Record<Variant, VariantKit> = {
  castlevania: {
    title: 'Dracula Crypt Infiltration',
    subtitle: 'Whip haunted candles, climb the belfry, and break the Hollow Duke.',
    cleared: 'The Hollow Duke falls silent.',
    accent: '#F59E0B',
    bossName: 'Hollow Duke',
    attackName: 'Vampire Killer',
    specialName: 'Throwing Axe',
    startLabel: 'ENTER THE CRYPT',
    attack: 'whip',
    special: 'axe',
    meleeRange: 78,
    meleeDamage: 16,
    shotDamage: 0,
    speed: 3.6,
    jump: 10.4,
    maxAmmo: 4,
    doubleJump: false,
    bossHp: 280,
    hero: { cloth: '#1e293b', trim: '#F59E0B', skin: '#e2e8f0' },
    zones: [
      zone(
        'Crypt Halls',
        ['#080d15', '#1b1208'],
        [{ x: 150, y: 308, w: 120 }, { x: 400, y: 256, w: 110 }, { x: 620, y: 320, w: 110 }],
        [[{ type: 'walker', count: 2 }], [{ type: 'flyer', count: 2 }, { type: 'walker', count: 1 }]],
        groundCandles([110, 300, 520, 680], [{ x: 210, y: 308 }, { x: 660, y: 320 }]),
      ),
      zone(
        'Bone Gallery',
        ['#0b0f1c', '#2a1010'],
        [{ x: 120, y: 300, w: 110 }, { x: 300, y: 246, w: 110 }, { x: 500, y: 300, w: 130 }, { x: 680, y: 236, w: 90 }],
        [[{ type: 'turret', count: 1 }, { type: 'walker', count: 2 }], [{ type: 'flyer', count: 3 }]],
        groundCandles([100, 240, 420, 600], [{ x: 345, y: 246 }, { x: 720, y: 236 }]),
      ),
      zone(
        "Hollow Duke's Belfry",
        ['#0a0d15', '#3a0f12'],
        [{ x: 120, y: 316, w: 90 }, { x: 590, y: 316, w: 90 }, { x: 360, y: 246, w: 90 }],
        [[{ type: 'flyer', count: 2 }, { type: 'walker', count: 1 }], [{ type: 'turret', count: 2 }]],
        groundCandles([90, 300, 500, 740]),
        'Hollow Duke',
      ),
    ],
  },
  metroid: {
    title: 'Zebes Incursion',
    subtitle: 'Push through the caverns and melt the Torizo Sentinel.',
    cleared: 'The sentinel core goes dark.',
    accent: '#22D3EE',
    bossName: 'Torizo Sentinel',
    attackName: 'Plasma Beam',
    specialName: 'Super Missile',
    startLabel: 'LAND ON ZEBES',
    attack: 'shot',
    special: 'missile',
    meleeRange: 44,
    meleeDamage: 0,
    shotDamage: 9,
    speed: 3.7,
    jump: 10.2,
    maxAmmo: 5,
    doubleJump: false,
    bossHp: 320,
    hero: { cloth: '#0f766e', trim: '#22D3EE', skin: '#f97316' },
    zones: [
      zone(
        'Zebes Surface',
        ['#03151c', '#052e2b'],
        [{ x: 170, y: 300, w: 120 }, { x: 430, y: 252, w: 120 }, { x: 640, y: 318, w: 110 }],
        [[{ type: 'walker', count: 2 }], [{ type: 'flyer', count: 2 }, { type: 'turret', count: 1 }]],
        groundCandles([120, 340, 560, 710], [{ x: 225, y: 300 }, { x: 690, y: 318 }]),
      ),
      zone(
        'Magmoor Caverns',
        ['#1a0b06', '#3c1408'],
        [{ x: 120, y: 300, w: 100 }, { x: 300, y: 246, w: 120 }, { x: 520, y: 302, w: 120 }, { x: 690, y: 240, w: 80 }],
        [[{ type: 'hopper', count: 2 }], [{ type: 'flyer', count: 2 }, { type: 'walker', count: 1 }]],
        groundCandles([90, 240, 420, 620], [{ x: 355, y: 246 }, { x: 725, y: 240 }]),
      ),
      zone(
        'Torizo Sanctum',
        ['#04121a', '#102a3a'],
        [{ x: 120, y: 320, w: 90 }, { x: 590, y: 320, w: 90 }, { x: 360, y: 250, w: 90 }],
        [[{ type: 'turret', count: 2 }, { type: 'flyer', count: 1 }], [{ type: 'walker', count: 2 }]],
        groundCandles([90, 300, 500, 740]),
        'Torizo Sentinel',
      ),
    ],
  },
  hollow: {
    title: 'Hallownest Nail Duel',
    subtitle: 'Descend the ruins, guard your mask, and shatter the False Knight.',
    cleared: 'The False Knight is undone.',
    accent: '#A5F3FC',
    bossName: 'False Knight',
    attackName: 'Nail Strike',
    specialName: 'Soul Focus',
    startLabel: 'ENTER HALLOWNEST',
    attack: 'nail',
    special: 'focus',
    meleeRange: 60,
    meleeDamage: 12,
    shotDamage: 0,
    speed: 3.9,
    jump: 10.8,
    maxAmmo: 0,
    doubleJump: true,
    bossHp: 300,
    hero: { cloth: '#e2e8f0', trim: '#A5F3FC', skin: '#0f172a' },
    zones: [
      zone(
        'Forgotten Crossroads',
        ['#05070f', '#0d1626'],
        [{ x: 150, y: 304, w: 110 }, { x: 390, y: 250, w: 120 }, { x: 630, y: 314, w: 100 }],
        [[{ type: 'walker', count: 2 }], [{ type: 'flyer', count: 2 }, { type: 'walker', count: 1 }]],
        groundCandles([100, 300, 540, 700], [{ x: 205, y: 304 }, { x: 680, y: 314 }]),
      ),
      zone(
        'Fungal Wastes',
        ['#0a0710', '#1c1230'],
        [{ x: 120, y: 296, w: 100 }, { x: 300, y: 240, w: 110 }, { x: 500, y: 296, w: 120 }, { x: 680, y: 234, w: 90 }],
        [[{ type: 'hopper', count: 2 }], [{ type: 'flyer', count: 2 }, { type: 'turret', count: 1 }]],
        groundCandles([90, 240, 430, 620], [{ x: 350, y: 240 }, { x: 720, y: 234 }]),
      ),
      zone(
        'False Knight Arena',
        ['#060812', '#241238'],
        [{ x: 120, y: 318, w: 90 }, { x: 590, y: 318, w: 90 }, { x: 360, y: 248, w: 90 }],
        [[{ type: 'flyer', count: 2 }, { type: 'walker', count: 1 }], [{ type: 'turret', count: 2 }]],
        groundCandles([90, 300, 500, 740]),
        'False Knight',
      ),
    ],
  },
  deadcells: {
    title: 'Ashen Descent',
    subtitle: 'Cut through the ash, crack the chests, and fell the Warden of the Spire.',
    cleared: 'The Warden crumbles to ash.',
    accent: '#FB7185',
    bossName: 'The Warden',
    attackName: 'Ashen Blade',
    specialName: 'Roll Dodge',
    startLabel: 'DESCEND',
    attack: 'sword',
    special: 'roll',
    meleeRange: 66,
    meleeDamage: 15,
    shotDamage: 0,
    speed: 4.05,
    jump: 10.3,
    maxAmmo: 0,
    doubleJump: false,
    bossHp: 320,
    hero: { cloth: '#374151', trim: '#FB7185', skin: '#e2e8f0' },
    zones: [
      zone(
        "Prisoner's Quarter",
        ['#0a0d16', '#2a1620'],
        [{ x: 160, y: 306, w: 110 }, { x: 400, y: 248, w: 120 }, { x: 630, y: 312, w: 100 }],
        [[{ type: 'walker', count: 2 }], [{ type: 'turret', count: 1 }, { type: 'walker', count: 1 }]],
        groundCandles([110, 320, 540, 700], [{ x: 215, y: 306 }, { x: 680, y: 312 }]),
      ),
      zone(
        'Toxic Sewers',
        ['#07120f', '#14291a'],
        [{ x: 120, y: 298, w: 100 }, { x: 300, y: 242, w: 110 }, { x: 500, y: 298, w: 120 }, { x: 680, y: 236, w: 90 }],
        [[{ type: 'hopper', count: 2 }], [{ type: 'flyer', count: 2 }, { type: 'turret', count: 1 }]],
        groundCandles([90, 240, 430, 620], [{ x: 350, y: 242 }, { x: 720, y: 236 }]),
      ),
      zone(
        "The Warden's Spire",
        ['#140a10', '#2a1220'],
        [{ x: 120, y: 320, w: 90 }, { x: 590, y: 320, w: 90 }, { x: 360, y: 250, w: 90 }],
        [[{ type: 'flyer', count: 2 }, { type: 'walker', count: 1 }], [{ type: 'turret', count: 2 }]],
        groundCandles([90, 300, 500, 740]),
        'The Warden',
      ),
    ],
  },
  cuphead: {
    title: 'Stormcap Showdown',
    subtitle: 'Dash through the squall and out-parry Mama Thundercloud.',
    cleared: 'Mama Thundercloud blows away.',
    accent: '#F87171',
    bossName: 'Mama Thundercloud',
    attackName: 'Pea Shooter',
    specialName: 'Pink Parry',
    startLabel: 'TAKE THE STAGE',
    attack: 'pea',
    special: 'parry',
    meleeRange: 44,
    meleeDamage: 0,
    shotDamage: 10,
    speed: 3.6,
    jump: 10.4,
    maxAmmo: 0,
    doubleJump: false,
    bossHp: 360,
    hero: { cloth: '#ef4444', trim: '#fde047', skin: '#fef3c7' },
    zones: [
      zone(
        'Inkwell Shore',
        ['#6b7fa8', '#f1e6c9'],
        [{ x: 150, y: 302, w: 110 }, { x: 410, y: 246, w: 120 }, { x: 640, y: 312, w: 100 }],
        [[{ type: 'walker', count: 2 }], [{ type: 'flyer', count: 2 }, { type: 'walker', count: 1 }]],
        groundCandles([100, 300, 540, 700], [{ x: 205, y: 302 }, { x: 690, y: 312 }]),
      ),
      zone(
        'Cloudtop Climb',
        ['#33415c', '#c9c1ab'],
        [{ x: 120, y: 318, w: 90 }, { x: 300, y: 250, w: 110 }, { x: 590, y: 318, w: 90 }, { x: 700, y: 240, w: 70 }],
        [[{ type: 'hopper', count: 2 }, { type: 'flyer', count: 1 }], [{ type: 'turret', count: 1 }, { type: 'walker', count: 1 }]],
        groundCandles([90, 300, 500, 740]),
      ),
      zone(
        'Thunderhead Arena',
        ['#2a1206', '#120905'],
        [{ x: 120, y: 318, w: 90 }, { x: 590, y: 318, w: 90 }, { x: 360, y: 248, w: 90 }],
        [[{ type: 'flyer', count: 2 }, { type: 'turret', count: 1 }], [{ type: 'walker', count: 2 }]],
        groundCandles([90, 300, 500, 740]),
        'Mama Thundercloud',
      ),
    ],
  },
};

const ENEMY_HP: Record<EnemyKind, number> = { walker: 34, flyer: 22, turret: 34, hopper: 30 };
const ENEMY_SCORE: Record<EnemyKind, number> = { walker: 120, flyer: 150, turret: 180, hopper: 140 };

/* ---------------- simulation ---------------- */

function createSim(cfg: VariantKit, dmgScale: number, callbacks: SimCallbacks, sync: () => void): Sim {
  const player: Player = {
    x: 90, y: GROUND, vx: 0, vy: 0, face: 1,
    ground: true, jumps: 1,
    hp: 100, maxHp: 100,
    ammo: cfg.maxAmmo > 0 ? 3 : 0,
    soul: 0,
    iframes: 0, hurtT: 0,
    atk: 0, atkCd: 0, swing: 0,
    specialCd: 0, dashT: 0, dashCd: 0,
    focusT: 0, parryT: 0, walk: 0,
  };
  return {
    cfg,
    zoneIndex: 0,
    zone: cfg.zones[0],
    phase: 'READY',
    player,
    enemies: [],
    shots: [],
    pickups: [],
    candles: [],
    particles: [],
    popups: [],
    boss: null,
    bossSpawned: false,
    wave: 0,
    nextKind: '',
    nextT: 0,
    score: 0,
    frame: 0,
    shake: 0,
    banner: '',
    bannerT: 0,
    zoneClearT: 0,
    ended: false,
    dmgScale,
    callbacks,
    sync,
  };
}

function addScore(sim: Sim, amount: number) {
  if (amount <= 0) return;
  sim.score += amount;
  sim.callbacks.score(sim.score);
}

function loadZone(sim: Sim, index: number) {
  sim.zoneIndex = index;
  sim.zone = sim.cfg.zones[index];
  sim.enemies = [];
  sim.shots = [];
  sim.pickups = [];
  sim.candles = sim.zone.candles.map((c) => ({ x: c.x, y: c.y, broken: false }));
  sim.boss = null;
  sim.bossSpawned = false;
  sim.wave = 0;
  sim.nextKind = '';
  sim.nextT = 0;
  sim.zoneClearT = 0;
  const p = sim.player;
  p.x = 90;
  p.y = GROUND;
  p.vx = 0;
  p.vy = 0;
  p.ground = true;
  p.iframes = 70;
  p.atk = 0;
  sim.banner = sim.zone.name;
  sim.bannerT = 120;
  spawnWave(sim);
}

function addEnemy(sim: Sim, kind: EnemyKind, x: number, index: number) {
  const flyer = kind === 'flyer';
  const y = flyer ? 168 + (index % 3) * 44 : GROUND;
  const enemy: Enemy = {
    kind,
    x,
    y,
    baseY: y,
    vx: 0,
    vy: 0,
    hp: ENEMY_HP[kind],
    maxHp: ENEMY_HP[kind],
    t: Math.floor(Math.random() * 60),
    dir: Math.random() < 0.5 ? -1 : 1,
    ground: !flyer,
    flash: 0,
    lastHit: -1,
    fire: 40 + Math.floor(Math.random() * 50),
  };
  sim.enemies.push(enemy);
}

function spawnWave(sim: Sim) {
  const wave = sim.zone.waves[sim.wave] || [];
  const spots = [430, 560, 690, 330, 480, 640, 740];
  let index = 0;
  for (const group of wave) {
    for (let n = 0; n < group.count; n++) {
      addEnemy(sim, group.type, spots[index % spots.length], index);
      index++;
    }
  }
}

function spawnBoss(sim: Sim) {
  const cfg = sim.cfg;
  sim.boss = {
    x: 620,
    y: 218,
    baseY: 214,
    hp: cfg.bossHp,
    maxHp: cfg.bossHp,
    t: 0,
    mode: 'hover',
    modeT: 110,
    volley: 0,
    face: -1,
    flash: 0,
    lastHit: -1,
  };
  sim.bossSpawned = true;
  sim.banner = sim.zone.boss || cfg.bossName;
  sim.bannerT = 110;
  sim.shake = 7;
  audio.playScore();
}

function spawnEnemyShot(sim: Sim, x: number, y: number, vx: number, vy: number, dmg = 10) {
  sim.shots.push({
    x, y, vx, vy, grav: 0, dmg, r: 6, life: 230, friendly: false,
    color: '#fb7185', spin: false, kind: 'orb',
  });
}

function spawnPickup(sim: Sim, x: number, y: number, kind: Pickup['kind']) {
  sim.pickups.push({ x, y, vy: -3.4, vx: (Math.random() - 0.5) * 1.6, kind, t: 0 });
}

function spawnBurst(sim: Sim, x: number, y: number, count: number, colors: string[], speed = 3) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const force = speed * (0.4 + Math.random() * 0.8);
    sim.particles.push({
      x, y,
      vx: Math.cos(angle) * force,
      vy: Math.sin(angle) * force - 0.6,
      life: 18 + Math.floor(Math.random() * 16),
      max: 34,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 1.6 + Math.random() * 2.4,
    });
  }
}

function popup(sim: Sim, x: number, y: number, text: string, color: string) {
  sim.popups.push({ x, y, text, color, life: 42 });
}

function finishRun(sim: Sim, won: boolean) {
  if (sim.ended) return;
  sim.ended = true;
  sim.phase = won ? 'VICTORY' : 'GAMEOVER';
  const p = sim.player;
  if (won) {
    addScore(sim, 1500);
    audio.playScore();
    spawnBurst(sim, p.x, p.y - 26, 40, [sim.cfg.accent, '#fff', '#fde047'], 5);
  } else {
    audio.playExplosion();
    sim.shake = 14;
    spawnBurst(sim, p.x, p.y - 26, 30, ['#fff', '#fb7185', sim.cfg.accent], 5);
  }
  sim.callbacks.over(sim.score);
  sim.sync();
}

function hurtPlayer(sim: Sim, dmg: number, fromX: number) {
  const p = sim.player;
  if (sim.phase !== 'PLAYING' || p.iframes > 0) return;
  p.hp -= dmg;
  p.iframes = 72;
  p.hurtT = 20;
  p.vx = (p.x < fromX ? -1 : 1) * 5.2;
  p.vy = -5;
  sim.shake = 9;
  audio.playHit();
  spawnBurst(sim, p.x, p.y - 22, 10, ['#fff', '#fca5a5'], 3);
  if (p.hp <= 0) {
    p.hp = 0;
    finishRun(sim, false);
  }
}

function breakCandle(sim: Sim, candle: Candle) {
  candle.broken = true;
  addScore(sim, 50);
  spawnBurst(sim, candle.x, candle.y - 26, 9, ['#fde047', '#fff', sim.cfg.accent], 3);
  popup(sim, candle.x, candle.y - 40, '+50', '#fde047');
  audio.playPongBeep(true);
  const roll = Math.random();
  const kind: Pickup['kind'] = sim.cfg.maxAmmo > 0 && roll < 0.45 ? 'ammo' : roll < 0.68 ? 'heart' : 'coin';
  spawnPickup(sim, candle.x, candle.y - 30, kind);
}

function damageEnemy(sim: Sim, enemy: Enemy, dmg: number) {
  if (enemy.hp <= 0) return;
  enemy.hp -= dmg;
  enemy.flash = 6;
  sim.player.soul = Math.min(100, sim.player.soul + 8);
  spawnBurst(sim, enemy.x, enemy.y - 14, 5, ['#fff', sim.cfg.accent], 3);
  audio.playHit();
  if (enemy.hp > 0) return;
  sim.enemies = sim.enemies.filter((candidate) => candidate !== enemy);
  addScore(sim, ENEMY_SCORE[enemy.kind]);
  popup(sim, enemy.x, enemy.y - 40, `+${ENEMY_SCORE[enemy.kind]}`, '#fde047');
  spawnBurst(sim, enemy.x, enemy.y - 12, 15, [sim.cfg.accent, '#fff'], 3.6);
  audio.playExplosion();
  if (Math.random() < 0.2) spawnPickup(sim, enemy.x, enemy.y - 20, Math.random() < 0.5 ? 'heart' : 'coin');
}

function damageBoss(sim: Sim, dmg: number) {
  const boss = sim.boss;
  if (!boss) return;
  boss.hp -= dmg;
  boss.flash = 6;
  sim.player.soul = Math.min(100, sim.player.soul + 9);
  spawnBurst(sim, boss.x, boss.y, 6, ['#fff', sim.cfg.accent], 3);
  popup(sim, boss.x, boss.y - 68, `${Math.round(dmg)}`, '#fde047');
  audio.playHit();
  if (boss.hp > 0) return;
  boss.hp = 0;
  sim.boss = null;
  sim.shake = 16;
  addScore(sim, 1200);
  spawnBurst(sim, boss.x, boss.y, 46, [sim.cfg.accent, '#fff', '#fb7185'], 5);
  audio.playExplosion();
  sim.callbacks.level?.(sim.cfg.zones.length);
  finishRun(sim, true);
}

function beginZoneClear(sim: Sim) {
  sim.phase = 'ZONECLEAR';
  sim.zoneClearT = 110;
  addScore(sim, 300);
  const p = sim.player;
  p.hp = Math.min(p.maxHp, p.hp + 25);
  sim.banner = 'AREA CLEAR';
  sim.bannerT = 100;
  sim.callbacks.level?.(sim.zoneIndex + 1);
  audio.playScore();
  sim.sync();
}

function enemyBox(enemy: Enemy) {
  if (enemy.kind === 'flyer') return { x1: enemy.x - 17, x2: enemy.x + 17, y1: enemy.y - 15, y2: enemy.y + 15 };
  if (enemy.kind === 'turret') return { x1: enemy.x - 15, x2: enemy.x + 15, y1: enemy.y - 42, y2: enemy.y };
  if (enemy.kind === 'hopper') return { x1: enemy.x - 17, x2: enemy.x + 17, y1: enemy.y - 28, y2: enemy.y };
  return { x1: enemy.x - 15, x2: enemy.x + 15, y1: enemy.y - 32, y2: enemy.y };
}

function playerBox(sim: Sim) {
  const p = sim.player;
  return { x1: p.x - 11, x2: p.x + 11, y1: p.y - 36, y2: p.y };
}

const overlaps = (
  a: { x1: number; x2: number; y1: number; y2: number },
  b: { x1: number; x2: number; y1: number; y2: number },
) => a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;

function updatePickups(sim: Sim) {
  const p = sim.player;
  for (const item of sim.pickups) {
    item.t++;
    item.vy = Math.min(item.vy + 0.34, 9);
    item.y += item.vy;
    item.x += item.vx;
    if (item.y >= GROUND - 8) {
      item.y = GROUND - 8;
      item.vy = 0;
      item.vx *= 0.8;
    }
    if (sim.phase !== 'PLAYING') continue;
    if (Math.hypot(item.x - p.x, item.y - (p.y - 18)) > 26) continue;
    if (item.kind === 'ammo') {
      if (p.ammo >= sim.cfg.maxAmmo) continue;
      p.ammo++;
      popup(sim, p.x, p.y - 46, '+1 AXE', '#fbbf24');
    } else if (item.kind === 'heart') {
      if (p.hp >= p.maxHp) continue;
      p.hp = Math.min(p.maxHp, p.hp + 14);
      popup(sim, p.x, p.y - 46, '+14', '#fb7185');
    } else {
      addScore(sim, 75);
      popup(sim, p.x, p.y - 46, '+75', '#fde047');
    }
    audio.playClick();
    item.t = -1;
  }
  sim.pickups = sim.pickups.filter((item) => item.t >= 0);
}

function updateEffects(sim: Sim) {
  for (const particle of sim.particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.16;
    particle.life--;
  }
  sim.particles = sim.particles.filter((particle) => particle.life > 0);
  for (const text of sim.popups) {
    text.y -= 0.55;
    text.life--;
  }
  sim.popups = sim.popups.filter((text) => text.life > 0);
}

function updateEnemy(sim: Sim, enemy: Enemy) {
  const p = sim.player;
  enemy.t++;
  if (enemy.flash > 0) enemy.flash--;
  if (enemy.kind === 'walker') {
    enemy.dir = p.x < enemy.x ? -1 : 1;
    enemy.x += enemy.dir * 1.05;
    enemy.y = GROUND;
  } else if (enemy.kind === 'flyer') {
    const dx = p.x - enemy.x;
    enemy.dir = dx < 0 ? -1 : 1;
    enemy.x += Math.sign(dx) * 0.55 + Math.sin(enemy.t * 0.05) * 0.9;
    enemy.y = enemy.baseY + Math.sin(enemy.t * 0.06) * 24;
  } else if (enemy.kind === 'turret') {
    enemy.fire--;
    if (enemy.fire <= 0 && Math.abs(p.x - enemy.x) < 380 && Math.abs(p.y - enemy.y) < 210) {
      enemy.fire = 105;
      const dx = p.x - enemy.x;
      const dy = p.y - 20 - (enemy.y - 26);
      const length = Math.hypot(dx, dy) || 1;
      spawnEnemyShot(sim, enemy.x, enemy.y - 26, (dx / length) * 4.2, (dy / length) * 4.2);
      audio.playLaser();
    }
  } else {
    enemy.fire--;
    if (enemy.ground && enemy.fire <= 0) {
      enemy.fire = 60;
      enemy.ground = false;
      enemy.vy = -7.6;
      enemy.vx = Math.sign(p.x - enemy.x) * 1.7;
    }
    enemy.vy = Math.min(enemy.vy + 0.55, 12);
    enemy.x += enemy.vx;
    enemy.y += enemy.vy;
    if (enemy.y >= GROUND) {
      enemy.y = GROUND;
      enemy.vy = 0;
      enemy.vx = 0;
      enemy.ground = true;
    }
    enemy.dir = p.x < enemy.x ? -1 : 1;
  }
  enemy.x = clamp(enemy.x, 40, W - 40);
  if (p.iframes <= 0 && overlaps(playerBox(sim), enemyBox(enemy))) {
    hurtPlayer(sim, Math.round(10 * sim.dmgScale), enemy.x);
  }
}

function updateBoss(sim: Sim) {
  const boss = sim.boss;
  if (!boss) return;
  const p = sim.player;
  boss.t++;
  if (boss.flash > 0) boss.flash--;
  boss.face = p.x < boss.x ? -1 : 1;
  boss.modeT--;
  if (boss.mode === 'hover') {
    boss.x += Math.sign(p.x - boss.x) * 0.9;
    boss.y += (boss.baseY + Math.sin(boss.t * 0.05) * 10 - boss.y) * 0.08;
    if (boss.modeT <= 0) {
      if (Math.random() < 0.55) {
        boss.mode = 'dive';
        boss.modeT = 80;
      } else {
        boss.mode = 'volley';
        boss.modeT = 90;
        boss.volley = 0;
      }
    }
  } else if (boss.mode === 'dive') {
    if (boss.modeT > 44) {
      boss.y += (boss.baseY - 26 - boss.y) * 0.08;
      boss.x += Math.sign(p.x - boss.x) * 1.2;
    } else {
      boss.y += 7;
      boss.x += Math.sign(p.x - boss.x) * 1.4;
      if (boss.y >= GROUND - 36) {
        boss.y = GROUND - 36;
        boss.mode = 'rise';
        boss.modeT = 50;
        sim.shake = 8;
        spawnBurst(sim, boss.x, GROUND - 6, 12, ['#fff', sim.cfg.accent], 3);
        audio.playHit();
      }
    }
  } else if (boss.mode === 'rise') {
    boss.y += (boss.baseY - boss.y) * 0.12 - 0.6;
    if (boss.modeT <= 0 || boss.y <= boss.baseY + 4) {
      boss.mode = 'hover';
      boss.modeT = 100 + Math.floor(Math.random() * 50);
    }
  } else {
    boss.y += (boss.baseY - boss.y) * 0.08;
    boss.volley--;
    if (boss.volley <= 0) {
      boss.volley = 22;
      const dx = p.x - boss.x;
      const dy = p.y - 20 - boss.y;
      const length = Math.hypot(dx, dy) || 1;
      spawnEnemyShot(sim, boss.x, boss.y, (dx / length) * 4.6, (dy / length) * 4.6, Math.round(9 * sim.dmgScale));
      audio.playLaser();
    }
    if (boss.modeT <= 0) {
      boss.mode = 'hover';
      boss.modeT = 90 + Math.floor(Math.random() * 40);
    }
  }
  boss.x = clamp(boss.x, 70, W - 70);
  const bossBox = { x1: boss.x - 42, x2: boss.x + 42, y1: boss.y - 62, y2: boss.y + 52 };
  if (p.iframes <= 0 && overlaps(playerBox(sim), bossBox)) {
    hurtPlayer(sim, Math.round(16 * sim.dmgScale), boss.x);
  }
}

function updateShots(sim: Sim) {
  const p = sim.player;
  for (const shot of sim.shots) {
    shot.x += shot.vx;
    shot.y += shot.vy;
    shot.vy += shot.grav;
    shot.life--;
    if (shot.friendly) {
      if (sim.boss && Math.hypot(shot.x - sim.boss.x, shot.y - sim.boss.y) < 48) {
        damageBoss(sim, shot.dmg);
        shot.life = 0;
      } else {
        for (const enemy of sim.enemies) {
          const box = enemyBox(enemy);
          if (shot.x > box.x1 - shot.r && shot.x < box.x2 + shot.r && shot.y > box.y1 - shot.r && shot.y < box.y2 + shot.r) {
            damageEnemy(sim, enemy, shot.dmg);
            shot.life = 0;
            break;
          }
        }
      }
    } else if (p.parryT > 0 && Math.hypot(shot.x - p.x, shot.y - (p.y - 20)) < 52) {
      shot.life = 0;
      addScore(sim, 60);
      p.soul = Math.min(100, p.soul + 12);
      spawnBurst(sim, shot.x, shot.y, 10, ['#f0abfc', '#fff'], 3.2);
      popup(sim, p.x, p.y - 54, 'PARRY +60', '#f0abfc');
      audio.playPongBeep(true);
    } else if (p.iframes <= 0 && Math.hypot(shot.x - p.x, shot.y - (p.y - 20)) < shot.r + 15) {
      shot.life = 0;
      hurtPlayer(sim, Math.round(shot.dmg * sim.dmgScale), shot.x);
    }
    if (shot.x < -40 || shot.x > W + 40 || shot.y < -50 || shot.y > H + 50 || shot.life <= 0) shot.life = 0;
  }
  sim.shots = sim.shots.filter((shot) => shot.life > 0);
}

function updatePlayer(sim: Sim, input: Input) {
  const p = sim.player;
  const cfg = sim.cfg;
  const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);

  if (p.dashT > 0) {
    p.dashT--;
    p.vx = p.face * 9;
    p.vy = 0;
  } else if (p.focusT > 0) {
    p.vx *= 0.6;
  } else {
    const target = dir * cfg.speed;
    p.vx += (target - p.vx) * (p.ground ? 0.34 : 0.2);
    if (Math.abs(p.vx) < 0.05) p.vx = 0;
  }
  if (dir) p.face = dir;

  if (input.jump) {
    if (p.ground) {
      p.vy = -cfg.jump;
      p.ground = false;
      p.jumps = cfg.doubleJump ? 1 : 0;
      audio.playJump();
    } else if (p.jumps > 0) {
      p.jumps--;
      p.vy = -cfg.jump * 0.92;
      audio.playJump();
    }
  }

  if (p.dashCd <= 0 && p.dashT <= 0 && input.dash) {
    p.dashT = 13;
    p.dashCd = 50;
    p.iframes = Math.max(p.iframes, 16);
    audio.playDash();
    spawnBurst(sim, p.x, p.y - 22, 6, ['#fff', cfg.accent], 2);
  }

  if (input.attack && p.atkCd <= 0) {
    p.swing++;
    const melee = cfg.attack === 'whip' || cfg.attack === 'nail' || cfg.attack === 'sword';
    if (melee) {
      p.atk = cfg.attack === 'whip' ? 16 : 12;
      p.atkCd = cfg.attack === 'whip' ? 22 : 16;
      audio.playPongBeep(true);
    } else {
      p.atk = 8;
      p.atkCd = cfg.attack === 'pea' ? 12 : 16;
      sim.shots.push({
        x: p.x + p.face * 18,
        y: p.y - 24,
        vx: p.face * 10.5,
        vy: 0,
        grav: 0,
        dmg: cfg.shotDamage,
        r: cfg.attack === 'pea' ? 6 : 4,
        life: 72,
        friendly: true,
        color: cfg.accent,
        spin: false,
        kind: 'beam',
      });
      audio.playLaser();
    }
  }

  if (input.special && p.specialCd <= 0) {
    if (cfg.special === 'axe') {
      if (p.ammo > 0) {
        p.ammo--;
        p.specialCd = 30;
        p.atk = 8;
        sim.shots.push({
          x: p.x + p.face * 10, y: p.y - 34, vx: p.face * 6.4, vy: -7.4, grav: 0.27,
          dmg: 20, r: 8, life: 95, friendly: true, color: '#fbbf24', spin: true, kind: 'axe',
        });
        audio.playPongBeep(true);
      } else {
        audio.playClick();
      }
    } else if (cfg.special === 'missile') {
      if (p.ammo > 0) {
        p.ammo--;
        p.specialCd = 38;
        p.atk = 6;
        sim.shots.push({
          x: p.x + p.face * 14, y: p.y - 24, vx: p.face * 11, vy: 0, grav: 0,
          dmg: 34, r: 7, life: 80, friendly: true, color: '#fbbf24', spin: false, kind: 'missile',
        });
        audio.playLaser();
      } else {
        audio.playClick();
      }
    } else if (cfg.special === 'focus') {
      if (p.soul >= 33 && p.ground) {
        p.soul -= 33;
        p.hp = Math.min(p.maxHp, p.hp + 28);
        p.focusT = 46;
        p.specialCd = 48;
        spawnBurst(sim, p.x, p.y - 24, 14, ['#a5f3fc', '#fff'], 2.4);
        popup(sim, p.x, p.y - 50, '+28', '#a5f3fc');
        audio.playScore();
      } else {
        audio.playClick();
      }
    } else if (cfg.special === 'roll') {
      p.dashT = 20;
      p.iframes = Math.max(p.iframes, 24);
      p.specialCd = 44;
      audio.playDash();
    } else {
      p.parryT = 24;
      p.specialCd = 38;
      audio.playPongBeep(true);
    }
  }

  const prevY = p.y;
  p.vy = Math.min(p.vy + 0.62, 13);
  p.x = clamp(p.x + p.vx, 18, W - 18);
  p.y += p.vy;
  p.ground = false;
  if (p.y >= GROUND) {
    p.y = GROUND;
    p.vy = 0;
    p.ground = true;
  }
  if (p.vy > 0) {
    for (const platform of sim.zone.platforms) {
      if (p.x > platform.x - 10 && p.x < platform.x + platform.w + 10 && prevY <= platform.y + 0.5 && p.y >= platform.y) {
        p.y = platform.y;
        p.vy = 0;
        p.ground = true;
      }
    }
  }
  if (p.ground) p.walk += Math.abs(p.vx) * 0.16;

  const melee = cfg.attack === 'whip' || cfg.attack === 'nail' || cfg.attack === 'sword';
  if (melee && p.atk > 2) {
    const reach = cfg.meleeRange;
    const hitbox = {
      x1: p.face > 0 ? p.x + 4 : p.x - reach,
      x2: p.face > 0 ? p.x + reach : p.x - 4,
      y1: p.y - 54,
      y2: p.y - 2,
    };
    for (const enemy of sim.enemies.slice()) {
      if (enemy.lastHit === p.swing) continue;
      if (!overlaps(hitbox, enemyBox(enemy))) continue;
      enemy.lastHit = p.swing;
      damageEnemy(sim, enemy, cfg.meleeDamage);
    }
    if (sim.boss && sim.boss.lastHit !== p.swing) {
      const bossBox = { x1: sim.boss.x - 44, x2: sim.boss.x + 44, y1: sim.boss.y - 64, y2: sim.boss.y + 56 };
      if (overlaps(hitbox, bossBox)) {
        sim.boss.lastHit = p.swing;
        damageBoss(sim, Math.round(cfg.meleeDamage * 1.4));
      }
    }
    for (const candle of sim.candles) {
      if (candle.broken) continue;
      const candleBox = { x1: candle.x - 10, x2: candle.x + 10, y1: candle.y - 46, y2: candle.y };
      if (overlaps(hitbox, candleBox)) breakCandle(sim, candle);
    }
  }
}

function updateStep(sim: Sim, input: Input) {
  sim.frame++;
  if (sim.bannerT > 0) sim.bannerT--;
  if (sim.shake > 0) sim.shake--;
  const p = sim.player;
  p.atkCd = Math.max(0, p.atkCd - 1);
  p.specialCd = Math.max(0, p.specialCd - 1);
  p.dashCd = Math.max(0, p.dashCd - 1);
  if (p.iframes > 0) p.iframes--;
  if (p.hurtT > 0) p.hurtT--;
  if (p.atk > 0) p.atk--;
  if (p.focusT > 0) p.focusT--;
  if (p.parryT > 0) p.parryT--;
  updatePickups(sim);
  updateEffects(sim);

  if (sim.phase === 'ZONECLEAR') {
    sim.zoneClearT--;
    if (sim.zoneClearT <= 0) {
      if (sim.zoneIndex + 1 < sim.cfg.zones.length) {
        loadZone(sim, sim.zoneIndex + 1);
        sim.phase = 'PLAYING';
      } else {
        finishRun(sim, true);
      }
      sim.sync();
    }
    return;
  }
  if (sim.phase !== 'PLAYING') return;

  updatePlayer(sim, input);
  for (const enemy of sim.enemies.slice()) updateEnemy(sim, enemy);
  if (sim.phase !== 'PLAYING') return;
  updateBoss(sim);
  if (sim.phase !== 'PLAYING') return;
  updateShots(sim);
  if (sim.phase !== 'PLAYING') return;

  if (sim.enemies.length === 0 && sim.nextKind === '') {
    if (sim.wave < sim.zone.waves.length - 1) {
      sim.wave++;
      sim.nextKind = 'wave';
      sim.nextT = 45;
    } else if (sim.zone.boss && !sim.bossSpawned) {
      sim.nextKind = 'boss';
      sim.nextT = 60;
    } else if (!sim.zone.boss) {
      sim.nextKind = sim.zoneIndex + 1 < sim.cfg.zones.length ? 'clear' : 'victory';
      sim.nextT = 1;
    }
  }
  if (sim.nextT > 0) {
    sim.nextT--;
    if (sim.nextT <= 0 && sim.nextKind) {
      const kind = sim.nextKind;
      sim.nextKind = '';
      if (kind === 'wave') spawnWave(sim);
      else if (kind === 'boss') spawnBoss(sim);
      else if (kind === 'clear') beginZoneClear(sim);
      else if (kind === 'victory') finishRun(sim, true);
    }
  }
  if (sim.frame % 8 === 0) sim.sync();
}

/* ---------------- rendering ---------------- */

function drawEnemy(ctx: CanvasRenderingContext2D, sim: Sim, enemy: Enemy) {
  const { accent } = sim.cfg;
  const flash = enemy.flash > 0;
  ctx.save();
  ctx.translate(enemy.x, enemy.y);
  if (enemy.kind === 'walker') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#f8fafc' : '#4b5563';
    rrect(ctx, -14, -30, 28, 30, 8);
    ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#334155';
    circle(ctx, 0, -30, 11);
    ctx.fillStyle = accent;
    circle(ctx, -5, -32, 2.4);
    circle(ctx, 5, -32, 2.4);
    ctx.fillStyle = flash ? '#fff' : '#334155';
    ctx.fillRect(-20, -24, 6, 12);
    ctx.fillRect(14, -24, 6, 12);
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-8, -8);
    ctx.lineTo(-10, 0);
    ctx.moveTo(8, -8);
    ctx.lineTo(10, 0);
    ctx.stroke();
  } else if (enemy.kind === 'flyer') {
    const flap = Math.sin(enemy.t * 0.3) * 8;
    ctx.fillStyle = flash ? '#f8fafc' : '#475569';
    ctx.beginPath();
    ctx.moveTo(-4, -2);
    ctx.quadraticCurveTo(-30, -16 - flap, -34, 4);
    ctx.quadraticCurveTo(-20, 0, -4, 8);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(4, -2);
    ctx.quadraticCurveTo(30, -16 - flap, 34, 4);
    ctx.quadraticCurveTo(20, 0, 4, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#1e293b';
    ctx.beginPath();
    ctx.ellipse(0, 2, 11, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = accent;
    circle(ctx, -4, -2, 2.6);
    circle(ctx, 4, -2, 2.6);
  } else if (enemy.kind === 'turret') {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#f8fafc' : '#334155';
    rrect(ctx, -14, -40, 28, 40, 6);
    ctx.fill();
    ctx.strokeStyle = hexAlpha(accent, 0.7);
    ctx.lineWidth = 2;
    const angle = Math.atan2(sim.player.y - 20 - (enemy.y - 30), sim.player.x - enemy.x);
    ctx.beginPath();
    ctx.arc(0, -30, 17, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -30);
    ctx.lineTo(Math.cos(angle) * 20, -30 + Math.sin(angle) * 20);
    ctx.stroke();
    ctx.fillStyle = accent;
    circle(ctx, 0, -30, 5);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    circle(ctx, 0, -30, 2);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath();
    ctx.ellipse(0, 0, 18, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#f8fafc' : '#52616f';
    rrect(ctx, -17, -26, 34, 26, 12);
    ctx.fill();
    ctx.fillStyle = flash ? '#fff' : '#3f4b57';
    circle(ctx, -10, -6, 6);
    circle(ctx, 10, -6, 6);
    ctx.fillStyle = accent;
    circle(ctx, -6, -26, 2.6);
    circle(ctx, 6, -26, 2.6);
  }
  ctx.restore();
}

function drawHero(ctx: CanvasRenderingContext2D, sim: Sim) {
  const p = sim.player;
  const { hero, accent, attack: attackKind } = sim.cfg;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.iframes > 0 && p.hurtT <= 0 && Math.floor(sim.frame / 4) % 2 === 0) ctx.globalAlpha = 0.55;
  const stride = p.ground ? Math.sin(p.walk) * 3 : 0;
  ctx.fillStyle = 'rgba(0,0,0,0.42)';
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.scale(p.face, 1);
  if (p.dashT > 0) {
    ctx.strokeStyle = hexAlpha(accent, 0.5);
    ctx.lineWidth = 3;
    for (let i = 1; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-14 - i * 10, -30 + i * 6);
      ctx.lineTo(-24 - i * 10, -20 + i * 6);
      ctx.stroke();
    }
  }
  ctx.fillStyle = hero.cloth;
  ctx.beginPath();
  ctx.moveTo(-10, -32);
  ctx.quadraticCurveTo(-24, -16, -16, -2);
  ctx.lineTo(-4, -6);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(3, -9);
  ctx.lineTo(3 + stride, -1);
  ctx.moveTo(8, -9);
  ctx.lineTo(8 - stride, -1);
  ctx.stroke();
  ctx.fillStyle = hero.cloth;
  rrect(ctx, -8, -32, 16, 24, 5);
  ctx.fill();
  ctx.fillStyle = hero.trim;
  ctx.fillRect(-8, -12, 16, 3);
  ctx.fillStyle = hero.skin;
  circle(ctx, 1, -37, 9);
  ctx.fillStyle = hexAlpha(accent, 0.95);
  circle(ctx, 4, -38, 2.2);
  if (p.focusT > 0) {
    ctx.strokeStyle = hexAlpha('#a5f3fc', Math.min(1, p.focusT / 30));
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, -20, 26 + Math.sin(sim.frame * 0.2) * 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (p.parryT > 0) {
    ctx.strokeStyle = hexAlpha('#f0abfc', 0.85);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(8, -22, 22, -0.9, 0.9);
    ctx.stroke();
  }
  const melee = attackKind === 'whip' || attackKind === 'nail' || attackKind === 'sword';
  if (melee && p.atk > 0) {
    const progress = 1 - p.atk / (attackKind === 'whip' ? 16 : 12);
    const reach = sim.cfg.meleeRange;
    ctx.strokeStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = 12;
    ctx.lineWidth = attackKind === 'whip' ? 3 : 4;
    if (attackKind === 'whip') {
      ctx.beginPath();
      ctx.moveTo(8, -24);
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        ctx.lineTo(8 + reach * t * Math.min(1, progress * 1.6), -24 - Math.sin(t * Math.PI) * 16 + Math.sin(i + sim.frame * 0.4) * 2);
      }
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(8, -22);
      ctx.lineTo(8 + reach * Math.min(1, progress * 2), -34 + progress * 16);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.beginPath();
      ctx.arc(8, -22, reach * Math.min(1, progress * 2), -0.8, 0.8);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.shadowBlur = 0;
  }
  ctx.restore();
}

function drawBoss(ctx: CanvasRenderingContext2D, sim: Sim) {
  const boss = sim.boss;
  if (!boss) return;
  const { accent } = sim.cfg;
  const flash = boss.flash > 0;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.beginPath();
  ctx.ellipse(boss.x, GROUND, 46, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(boss.x, boss.y + Math.sin(boss.t * 0.05) * 4);
  ctx.beginPath();
  ctx.moveTo(0, -58);
  ctx.quadraticCurveTo(-52, -14, -38, 56);
  ctx.lineTo(38, 56);
  ctx.quadraticCurveTo(52, -14, 0, -58);
  ctx.closePath();
  ctx.fillStyle = flash ? '#f8fafc' : '#121826';
  ctx.fill();
  ctx.strokeStyle = hexAlpha(accent, 0.8);
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-36, 54);
  ctx.quadraticCurveTo(0, 36, 36, 54);
  ctx.strokeStyle = hexAlpha(accent, 0.6);
  ctx.stroke();
  ctx.fillStyle = flash ? '#fff' : '#1e293b';
  circle(ctx, -30, -22, 13);
  circle(ctx, 30, -22, 13);
  ctx.fillStyle = flash ? '#fff' : '#0b1220';
  circle(ctx, 0, -52, 20);
  ctx.fillStyle = '#f59e0b';
  ctx.beginPath();
  ctx.moveTo(-18, -66);
  ctx.lineTo(-12, -84);
  ctx.lineTo(-4, -68);
  ctx.lineTo(0, -88);
  ctx.lineTo(4, -68);
  ctx.lineTo(12, -84);
  ctx.lineTo(18, -66);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = accent;
  ctx.shadowColor = accent;
  ctx.shadowBlur = 10;
  circle(ctx, -7, -54, 3.2);
  circle(ctx, 7, -54, 3.2);
  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawPickup(ctx: CanvasRenderingContext2D, item: Pickup) {
  const bob = Math.sin(item.t * 0.12) * 2;
  if (item.kind === 'coin') {
    ctx.fillStyle = '#fde047';
    ctx.shadowColor = '#fde047';
    ctx.shadowBlur = 10;
    circle(ctx, item.x, item.y + bob, 7);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#a16207';
    circle(ctx, item.x, item.y + bob, 4);
  } else if (item.kind === 'heart') {
    ctx.fillStyle = '#fb7185';
    ctx.shadowColor = '#fb7185';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y + 7 + bob);
    ctx.bezierCurveTo(item.x - 10, item.y - 2 + bob, item.x - 2, item.y - 10 + bob, item.x, item.y - 3 + bob);
    ctx.bezierCurveTo(item.x + 2, item.y - 10 + bob, item.x + 10, item.y - 2 + bob, item.x, item.y + 7 + bob);
    ctx.fill();
    ctx.shadowBlur = 0;
  } else {
    ctx.save();
    ctx.translate(item.x, item.y + bob);
    ctx.rotate(-0.5);
    ctx.fillStyle = '#fbbf24';
    ctx.shadowColor = '#fbbf24';
    ctx.shadowBlur = 10;
    ctx.fillRect(-2, -8, 4, 20);
    ctx.beginPath();
    ctx.moveTo(-7, -8);
    ctx.lineTo(7, -8);
    ctx.lineTo(0, -16);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();
  }
}

function renderScene(ctx: CanvasRenderingContext2D, sim: Sim) {
  const { cfg, zone: area } = sim;
  const t = sim.frame;
  ctx.save();
  if (sim.shake > 0) ctx.translate((Math.random() - 0.5) * sim.shake, (Math.random() - 0.5) * sim.shake);

  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, area.sky[0]);
  sky.addColorStop(1, area.sky[1]);
  ctx.fillStyle = sky;
  ctx.fillRect(-12, -12, W + 24, H + 24);

  const aura = ctx.createRadialGradient(W * 0.72, H * 0.4, 8, W * 0.72, H * 0.4, 380);
  aura.addColorStop(0, hexAlpha(cfg.accent, 0.2));
  aura.addColorStop(0.55, hexAlpha(cfg.accent, 0.05));
  aura.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = aura;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.08)';
  circle(ctx, 628, 92, 46);
  ctx.fillStyle = hexAlpha(cfg.accent, 0.32);
  circle(ctx, 628, 92, 30);

  for (let i = 0; i < 24; i++) {
    const x = (i * 97 + 31) % W;
    const y = 34 + ((i * 53) % 150);
    ctx.globalAlpha = 0.14 + (Math.sin(t * 0.02 + i) * 0.5 + 0.5) * 0.3;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, y, 2, 2);
  }
  ctx.globalAlpha = 1;

  ridge(ctx, GROUND - 118, 30, t * 0.0015, hexAlpha(cfg.accent, 0.1));
  ridge(ctx, GROUND - 74, 22, t * 0.003 + 2, 'rgba(8,12,22,0.6)');

  const groundFill = ctx.createLinearGradient(0, GROUND, 0, H);
  groundFill.addColorStop(0, '#111826');
  groundFill.addColorStop(1, '#05070c');
  ctx.fillStyle = groundFill;
  ctx.fillRect(0, GROUND, W, H - GROUND);
  ctx.fillStyle = hexAlpha(cfg.accent, 0.6);
  ctx.fillRect(0, GROUND - 2, W, 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let x = (t * 0.4) % 48; x < W; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, GROUND);
    ctx.lineTo(x - 20, H);
    ctx.stroke();
  }

  for (const platform of area.platforms) {
    ctx.fillStyle = 'rgba(15,23,37,0.94)';
    rrect(ctx, platform.x, platform.y, platform.w, 12, 4);
    ctx.fill();
    ctx.fillStyle = hexAlpha(cfg.accent, 0.5);
    ctx.fillRect(platform.x + 4, platform.y, platform.w - 8, 2);
  }

  for (const candle of sim.candles) {
    if (candle.broken) continue;
    ctx.fillStyle = '#cbd5e1';
    ctx.fillRect(candle.x - 2, candle.y - 28, 4, 28);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(candle.x - 5, candle.y - 27, 10, 3);
    const flame = 4 + Math.sin(t * 0.25 + candle.x * 0.1) * 1.6;
    ctx.fillStyle = hexAlpha('#fbbf24', 0.9);
    circle(ctx, candle.x, candle.y - 31, flame);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    circle(ctx, candle.x, candle.y - 32, flame * 0.45);
  }

  for (const item of sim.pickups) drawPickup(ctx, item);
  for (const enemy of sim.enemies) drawEnemy(ctx, sim, enemy);
  drawBoss(ctx, sim);

  for (const shot of sim.shots) {
    ctx.save();
    ctx.translate(shot.x, shot.y);
    if (shot.spin) ctx.rotate(sim.frame * 0.25);
    ctx.fillStyle = shot.color;
    ctx.shadowColor = shot.color;
    ctx.shadowBlur = 10;
    if (shot.kind === 'axe') {
      ctx.fillRect(-2, -9, 4, 18);
      ctx.beginPath();
      ctx.moveTo(-8, -9);
      ctx.lineTo(8, -9);
      ctx.lineTo(0, -16);
      ctx.closePath();
      ctx.fill();
    } else if (shot.kind === 'missile') {
      rrect(ctx, -10, -4, 20, 8, 4);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fillRect(-6, -1.5, 8, 3);
    } else if (shot.kind === 'orb') {
      circle(ctx, 0, 0, shot.r);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      circle(ctx, 0, 0, shot.r * 0.45);
    } else {
      rrect(ctx, -9, -3, 18, 6, 3);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  drawHero(ctx, sim);

  for (const particle of sim.particles) {
    ctx.globalAlpha = Math.max(0, particle.life / particle.max);
    ctx.fillStyle = particle.color;
    ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;

  ctx.textAlign = 'center';
  for (const text of sim.popups) {
    ctx.globalAlpha = Math.min(1, text.life / 22);
    ctx.font = '800 13px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillStyle = text.color;
    ctx.fillText(text.text, text.x, text.y);
  }
  ctx.globalAlpha = 1;
  ctx.textAlign = 'start';

  if (sim.bannerT > 0) {
    const fade = Math.min(1, sim.bannerT / 26);
    ctx.globalAlpha = fade;
    ctx.textAlign = 'center';
    ctx.font = '900 34px ui-sans-serif, system-ui, sans-serif';
    ctx.fillStyle = '#f8fafc';
    ctx.shadowColor = hexAlpha(cfg.accent, 0.8);
    ctx.shadowBlur = 18;
    ctx.fillText(sim.banner, W / 2, 138);
    ctx.shadowBlur = 0;
    ctx.font = '800 12px ui-monospace, monospace';
    ctx.fillStyle = hexAlpha(cfg.accent, 0.95);
    ctx.fillText(sim.phase === 'ZONECLEAR' ? 'AREA CLEAR +25' : `AREA ${sim.zoneIndex + 1} / ${sim.cfg.zones.length}`, W / 2, 164);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'start';
  }

  const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.95);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, W, H);

  if (sim.player.hurtT > 0) {
    ctx.fillStyle = `rgba(190,24,60,${Math.min(0.34, sim.player.hurtT / 60)})`;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
}

/* ---------------- component ---------------- */

interface ActionCombatEngineProps {
  variant?: string;
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onLevelComplete?: (level: number) => void;
  onRestart?: () => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  highScore?: number;
}

const SPEED_FOR: Record<DifficultySetting, number> = { easy: 0.8, normal: 1, hard: 1.35 };
const DAMAGE_FOR: Record<DifficultySetting, number> = { easy: 0.75, normal: 1, hard: 1.25 };

const initialHud = (kit: VariantKit): Hud => ({
  hp: 100,
  maxHp: 100,
  ammo: kit.maxAmmo > 0 ? 3 : 0,
  maxAmmo: kit.maxAmmo,
  soul: 0,
  score: 0,
  zone: kit.zones[0].name,
  zoneIndex: 0,
  zoneTotal: kit.zones.length,
  bossHp: null,
  bossMax: null,
  bossName: '',
  special: kit.special,
  specialCd: 0,
  dashCd: 0,
});

export const ActionCombatEngine: React.FC<ActionCombatEngineProps> = ({
  variant = 'hollow',
  onScoreUpdate,
  onGameOver,
  onLevelComplete,
  onRestart,
  isPaused,
  difficulty = 'normal',
  highScore = 0,
}) => {
  const kit = useMemo<VariantKit>(() => KITS[(variant as Variant)] || KITS.hollow, [variant]);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Sim | null>(null);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  const speedRef = useRef(SPEED_FOR[difficulty]);
  speedRef.current = SPEED_FOR[difficulty];
  const damageRef = useRef(DAMAGE_FOR[difficulty]);
  damageRef.current = DAMAGE_FOR[difficulty];
  const kitRef = useRef(kit);
  kitRef.current = kit;
  const keysRef = useRef<Set<string>>(new Set());
  const pressedRef = useRef<Set<string>>(new Set());
  const callbacksRef = useRef({ score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart });
  callbacksRef.current = { score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart };
  const [phase, setPhase] = useState<Phase>('READY');
  const [hud, setHud] = useState<Hud>(() => initialHud(kit));

  const syncNow = useCallback(() => {
    const sim = simRef.current;
    if (!sim) return;
    setPhase(sim.phase);
    const boss = sim.boss;
    setHud((previous) => {
      const next: Hud = {
        hp: Math.max(0, Math.round(sim.player.hp)),
        maxHp: sim.player.maxHp,
        ammo: sim.player.ammo,
        maxAmmo: sim.cfg.maxAmmo,
        soul: Math.floor(sim.player.soul),
        score: sim.score,
        zone: sim.zone.name,
        zoneIndex: sim.zoneIndex,
        zoneTotal: sim.cfg.zones.length,
        bossHp: boss ? Math.max(0, Math.round(boss.hp)) : null,
        bossMax: boss ? boss.maxHp : null,
        bossName: boss ? sim.zone.boss || sim.cfg.bossName : '',
        special: sim.cfg.special,
        specialCd: sim.player.specialCd,
        dashCd: sim.player.dashCd,
      };
      if (
        previous.hp === next.hp &&
        previous.ammo === next.ammo &&
        previous.soul === next.soul &&
        previous.score === next.score &&
        previous.zone === next.zone &&
        previous.bossHp === next.bossHp &&
        previous.specialCd === next.specialCd
      ) return previous;
      return next;
    });
  }, []);

  const startGame = useCallback((replay: boolean) => {
    if (replay) callbacksRef.current.restart?.();
    const sim = createSim(kitRef.current, damageRef.current, {
      score: (score) => callbacksRef.current.score(score),
      over: (score) => callbacksRef.current.over(score),
      level: (level) => callbacksRef.current.level?.(level),
    }, syncNow);
    simRef.current = sim;
    sim.phase = 'PLAYING';
    loadZone(sim, 0);
    audio.playClick();
    syncNow();
  }, [syncNow]);

  useEffect(() => {
    const handled = new Set([
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
      'KeyA', 'KeyD', 'KeyW', 'KeyS', 'KeyJ', 'KeyX', 'KeyK', 'KeyC', 'KeyZ', 'KeyL',
      'ShiftLeft', 'ShiftRight',
    ]);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (handled.has(event.code)) event.preventDefault();
      keysRef.current.add(event.code);
      pressedRef.current.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    const onBlur = () => {
      keysRef.current.clear();
      pressedRef.current.clear();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    if (isPaused) pressedRef.current.clear();
  }, [isPaused]);

  const takeInput = useCallback((): Input => {
    const pressed = pressedRef.current;
    const has = (...codes: string[]) => codes.some((code) => pressed.has(code));
    const keys = keysRef.current;
    const input: Input = {
      left: keys.has('ArrowLeft') || keys.has('KeyA'),
      right: keys.has('ArrowRight') || keys.has('KeyD'),
      jump: has('Space', 'ArrowUp', 'KeyW', 'KeyZ'),
      attack: has('KeyJ', 'KeyX'),
      special: has('KeyK', 'KeyC'),
      dash: has('ShiftLeft', 'ShiftRight', 'KeyL'),
    };
    pressed.clear();
    return input;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    let lastHud = 0;
    const loop = (now: number) => {
      const delta = Math.min(64, now - last);
      last = now;
      const sim = simRef.current;
      if (sim && !pausedRef.current) {
        acc += delta * speedRef.current;
        let steps = 0;
        while (acc >= STEP_MS && steps < 5) {
          updateStep(sim, steps === 0 ? takeInput() : EMPTY_INPUT);
          acc -= STEP_MS;
          steps++;
        }
        if (steps === 5) acc = 0;
        if (now - lastHud > 120) {
          lastHud = now;
          syncNow();
        }
      }
      if (sim) renderScene(ctx, sim);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [syncNow, takeInput]);

  useEffect(() => {
    if (!/(\?|&)test=1(?:&|$)/.test(window.location.search)) return;
    const host = window as typeof window & { ActionCombatTest?: Record<string, unknown> };
    host.ActionCombatTest = {
      state: () => {
        const sim = simRef.current;
        if (!sim) return { phase, started: false };
        return {
          started: true,
          phase: sim.phase,
          zone: sim.zoneIndex,
          zoneName: sim.zone.name,
          zones: sim.cfg.zones.length,
          wave: sim.wave,
          enemies: sim.enemies.length,
          hp: Math.round(sim.player.hp),
          maxHp: sim.player.maxHp,
          ammo: sim.player.ammo,
          maxAmmo: sim.cfg.maxAmmo,
          soul: Math.floor(sim.player.soul),
          score: sim.score,
          bossHp: sim.boss ? Math.round(sim.boss.hp) : null,
          bossMax: sim.boss ? sim.boss.maxHp : null,
          bossSpawned: sim.bossSpawned,
          shots: sim.shots.length,
          candles: sim.candles.filter((candle) => !candle.broken).length,
        };
      },
      start: () => startGame(false),
      restart: () => startGame(true),
      setZone: (index: number) => {
        const sim = simRef.current;
        if (!sim) return;
        loadZone(sim, clamp(index, 0, sim.cfg.zones.length - 1));
        sim.phase = 'PLAYING';
        syncNow();
      },
      clearEnemies: () => {
        const sim = simRef.current;
        if (!sim) return;
        sim.enemies = [];
      },
      spawnBoss: () => {
        const sim = simRef.current;
        if (!sim) return;
        sim.enemies = [];
        sim.bossSpawned = false;
        spawnBoss(sim);
        syncNow();
      },
      damageBoss: (amount?: number) => {
        const sim = simRef.current;
        if (!sim || !sim.boss) return;
        damageBoss(sim, amount ?? 60);
        syncNow();
      },
      killBoss: () => {
        const sim = simRef.current;
        if (!sim || !sim.boss) return;
        damageBoss(sim, 99999);
        syncNow();
      },
      hurt: (amount?: number) => {
        const sim = simRef.current;
        if (!sim) return;
        sim.player.iframes = 0;
        hurtPlayer(sim, amount ?? 12, sim.player.x + 40);
        syncNow();
      },
      setScore: (score: number) => {
        const sim = simRef.current;
        if (!sim) return;
        sim.score = Math.max(0, Math.floor(score));
        sim.callbacks.score(sim.score);
        syncNow();
      },
      press: (code: string) => {
        keysRef.current.add(code);
        pressedRef.current.add(code);
      },
      release: (code: string) => keysRef.current.delete(code),
      step: (frames?: number) => {
        const sim = simRef.current;
        if (!sim) return;
        const count = Math.max(1, Math.min(1200, frames ?? 1));
        for (let i = 0; i < count; i++) updateStep(sim, EMPTY_INPUT);
        syncNow();
      },
    };
    return () => {
      delete host.ActionCombatTest;
    };
  }, [phase, startGame, syncNow]);

  const hpPercent = Math.max(0, Math.min(100, (hud.hp / hud.maxHp) * 100));
  const bossPercent = hud.bossHp !== null && hud.bossMax ? Math.max(0, Math.min(100, (hud.bossHp / hud.bossMax) * 100)) : 0;
  const specialReady = hud.specialCd <= 0;

  return (
    <div className="relative mx-auto aspect-[5/3] w-full max-w-[900px] select-none overflow-hidden rounded-xl border border-white/10 bg-black shadow-2xl">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        aria-label={`${kit.title} gameplay`}
        className="block h-full w-full"
      />

      {phase !== 'READY' && (
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3">
          <div className="min-w-[180px] rounded-lg border border-white/10 bg-black/55 px-3 py-2 backdrop-blur-sm">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-white/70">
              <span>Health</span>
              <span className="font-mono text-amber-300">{hud.hp}/{hud.maxHp}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded bg-white/10">
              <div className="h-full rounded bg-gradient-to-r from-amber-400 to-orange-500 transition-[width] duration-150" style={{ width: `${hpPercent}%` }} />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] font-bold">
              {hud.maxAmmo > 0 && <span className="font-mono text-amber-200">AXES {hud.ammo}/{hud.maxAmmo}</span>}
              {hud.special === 'focus' && <span className="font-mono text-cyan-200">SOUL {hud.soul}</span>}
              {hud.special === 'roll' && <span className={`font-mono ${specialReady ? 'text-emerald-300' : 'text-white/40'}`}>{specialReady ? 'ROLL READY' : 'ROLL ...'}</span>}
              {hud.special === 'parry' && <span className={`font-mono ${specialReady ? 'text-fuchsia-300' : 'text-white/40'}`}>{specialReady ? 'PARRY READY' : 'PARRY ...'}</span>}
              <span className={`font-mono ${hud.dashCd <= 0 ? 'text-cyan-200' : 'text-white/40'}`}>DASH</span>
            </div>
          </div>
          <div className="rounded-lg border border-white/10 bg-black/55 px-3 py-2 text-right backdrop-blur-sm">
            <div className="text-[10px] font-bold uppercase tracking-wider text-white/60">{hud.zone} · {hud.zoneIndex + 1}/{hud.zoneTotal}</div>
            <div className="font-mono text-base font-black leading-tight text-amber-300">{hud.score}</div>
            <div className="text-[10px] text-white/50">BEST {Math.max(highScore, hud.score)}</div>
          </div>
        </div>
      )}

      {phase !== 'READY' && hud.bossHp !== null && (
        <div className="pointer-events-none absolute left-1/2 top-3 w-[42%] -translate-x-1/2">
          <div className="mb-1 text-center text-[10px] font-black uppercase tracking-[0.22em] text-rose-200 drop-shadow">{hud.bossName}</div>
          <div className="h-2 overflow-hidden rounded-full border border-white/20 bg-black/60">
            <div className="h-full bg-gradient-to-r from-rose-500 via-orange-400 to-amber-300 transition-[width] duration-150" style={{ width: `${bossPercent}%` }} />
          </div>
        </div>
      )}

      {phase === 'READY' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#05070d]/85 px-6 text-center">
          <span className="mb-2 text-[10px] font-black uppercase tracking-[0.35em]" style={{ color: kit.accent }}>{kit.subtitle}</span>
          <h3 className="text-2xl font-black text-white sm:text-3xl">{kit.title}</h3>
          <p className="mt-2 max-w-md text-xs text-slate-300">{kit.zones.length} areas · {kit.bossName} waits at the end.</p>
          <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-left text-[11px] font-mono text-slate-300 sm:grid-cols-3">
            <span><b className="text-white">A / D</b> move</span>
            <span><b className="text-white">Space</b> jump</span>
            <span><b className="text-white">J / X</b> {kit.attackName.toLowerCase()}</span>
            <span><b className="text-white">K / C</b> {kit.specialName.toLowerCase()}</span>
            <span><b className="text-white">Shift</b> dash</span>
            <span><b className="text-white">Esc</b> pause</span>
          </div>
          <button
            type="button"
            data-testid="action-start"
            onClick={() => startGame(false)}
            className="mt-6 min-h-11 rounded-xl px-6 text-sm font-black text-slate-950 shadow-lg transition-transform hover:scale-[1.03]"
            style={{ backgroundColor: kit.accent }}
          >
            {kit.startLabel}
          </button>
        </div>
      )}

      {phase === 'GAMEOVER' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
          <div className="text-2xl font-black tracking-tight text-rose-300">RUN ENDED</div>
          <p className="mt-2 text-xs text-slate-300">{kit.bossName} still waits. Score {hud.score}.</p>
          <button
            type="button"
            data-testid="action-restart"
            onClick={() => startGame(true)}
            className="mt-5 min-h-11 rounded-xl px-6 text-sm font-black text-slate-950"
            style={{ backgroundColor: kit.accent }}
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {phase === 'VICTORY' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 px-6 text-center">
          <div className="text-2xl font-black tracking-tight text-emerald-300">RUN CONQUERED</div>
          <p className="mt-2 text-xs text-slate-300">{kit.cleared} Final score {hud.score}.</p>
          <button
            type="button"
            data-testid="action-replay"
            onClick={() => startGame(true)}
            className="mt-5 min-h-11 rounded-xl px-6 text-sm font-black text-slate-950"
            style={{ backgroundColor: kit.accent }}
          >
            RUN IT BACK
          </button>
        </div>
      )}
    </div>
  );
};
