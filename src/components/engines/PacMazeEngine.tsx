import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface PacMazeEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onRestart?: () => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  seed?: number;
}

type PlayState = 'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';
type Phase = 'intro' | 'run' | 'dying' | 'clear';
type DroneState = 'house' | 'leave' | 'out' | 'eyes';
type Vec = [number, number];

const W = 640;
const H = 480;
const COLS = 21;
const ROWS = 23;
const CELL = 18;
const OX = Math.round((W - COLS * CELL) / 2);
const OY = 34;
const TUN = 10;
const MAX_LEVELS = 10;
const FRAME = 1000 / 60;

const MAP = [
  '#####################',
  '#o........#........o#',
  '#.###.###.#.###.###.#',
  '#...................#',
  '#.###.#.#####.#.###.#',
  '#.....#...#...#.....#',
  '#####.###.#.###.#####',
  '#####.#.......#.#####',
  '#####.#.##-##.#.#####',
  '#####.#.#   #.#.#####',
  '     ...#   #...     ',
  '#####.#.#####.#.#####',
  '#####.#.......#.#####',
  '#.....#...#...#.....#',
  '#.###.###.#.###.###.#',
  '#o.................o#',
  '###.#.#.#####.#.#.###',
  '#.....#.......#.....#',
  '#.###.#.#####.#.###.#',
  '#.....#...#...#.....#',
  '#.###.###.#.###.###.#',
  '#...................#',
  '#####################',
];

const DIRS: Vec[] = [[0, -1], [-1, 0], [0, 1], [1, 0]];
const WALL_HUES = [210, 150, 280, 25, 335, 190];

interface DroneDef {
  name: string;
  col: string;
  corner: Vec;
  rel: number;
}

const DRONE_DEFS: DroneDef[] = [
  { name: 'dart', col: '#fb7185', corner: [19, -2], rel: 0 },
  { name: 'lurk', col: '#a78bfa', corner: [1, -2], rel: 160 },
  { name: 'flank', col: '#2dd4bf', corner: [19, 25], rel: 420 },
  { name: 'drift', col: '#fbbf24', corner: [1, 25], rel: 700 },
];

const GEM_TABLE = [
  { color: '#fb7185', points: 100 },
  { color: '#fbbf24', points: 300 },
  { color: '#34d399', points: 500 },
  { color: '#60a5fa', points: 700 },
  { color: '#c084fc', points: 1000 },
  { color: '#f8fafc', points: 2000 },
];

interface Entity {
  cx: number;
  cy: number;
  dx: number;
  dy: number;
  p: number;
}

interface Player extends Entity {
  want: Vec;
  face: number;
}

interface Drone extends Entity, DroneDef {
  state: DroneState;
  fr: boolean;
  rev: boolean;
  bob: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
}

const wrapX = (x: number) => (x < 0 ? COLS - 1 : x >= COLS ? 0 : x);
const makeGrid = () => MAP.map((row) => row.split(''));

const cellOf = (grid: string[][], x: number, y: number): string => {
  if (y < 0 || y >= ROWS) return '#';
  if (x < 0 || x >= COLS) return y === TUN ? ' ' : '#';
  return grid[y][x];
};

const isOpen = (grid: string[][], cx: number, cy: number, dx: number, dy: number, gate: boolean): boolean => {
  const cell = cellOf(grid, cx + dx, cy + dy);
  return cell !== '#' && (cell !== '-' || gate);
};

const clockText = (millis: number) => {
  const total = Math.max(0, Math.floor(millis / 1000));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

export const PacMazeEngine: React.FC<PacMazeEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  onRestart,
  isPaused,
  difficulty = 'normal',
  seed,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startRef = useRef<() => void>(() => {});
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [cores, setCores] = useState(4);
  const [gameState, setGameState] = useState<PlayState>('READY');

  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const callbacksRef = useRef({ onScoreUpdate, onGameOver, restart: onRestart });
  callbacksRef.current = { onScoreUpdate, onGameOver, restart: onRestart };
  const endedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let grid = makeGrid();
    let dots: number[][] = [];
    let totalSeeds = 0;
    let seedsLeft = 0;
    let eaten = 0;
    let coresLeft = 4;
    let runScore = 0;
    let runLives = 3;
    let runLevel = 1;
    let nextLife = 10000;
    let state: PlayState = 'READY';
    let phase: Phase = 'intro';
    let phaseT = 0;
    let flash = 0;
    let modeIdx = 0;
    let modeT = 0;
    let frightT = 0;
    let combo = 0;
    let gem: { color: string; points: number; life: number } | null = null;
    let clock = 0;
    let rngState = 1;
    let animId = 0;
    let lastTime = performance.now();
    let player: Player = { cx: 10, cy: 15, dx: 0, dy: 0, p: 0, want: [-1, 0], face: Math.PI };
    let drones: Drone[] = [];
    const particles: Particle[] = [];
    const popups: Popup[] = [];

    const stars = Array.from({ length: 64 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 0.6 + Math.random() * 1.4,
      phase: Math.random() * Math.PI * 2,
    }));

    const mazeCanvas = document.createElement('canvas');
    mazeCanvas.width = COLS * CELL;
    mazeCanvas.height = ROWS * CELL;

    const nextRandom = () => {
      rngState ^= rngState << 13;
      rngState ^= rngState >>> 17;
      rngState ^= rngState << 5;
      return rngState >>> 0;
    };

    const setPlayState = (next: PlayState) => {
      state = next;
      setGameState(next);
    };

    const burst = (x: number, y: number, speed: number, colors: string[], count: number, size: number) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const velocity = speed * (0.35 + Math.random() * 0.8);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life: 360 + Math.random() * 260,
          max: 620,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: size * (0.6 + Math.random() * 0.8),
        });
      }
    };

    const popup = (x: number, y: number, text: string, color: string) => {
      popups.push({ x, y, text, color, life: 900 });
    };

    const addScore = (amount: number) => {
      if (amount <= 0) return;
      runScore += amount;
      setScore(runScore);
      callbacksRef.current.onScoreUpdate(runScore);
      while (runScore >= nextLife) {
        nextLife += 10000;
        runLives++;
        setLives(runLives);
        audio.playScore();
        popup(OX + 10.5 * CELL, OY + 12 * CELL, '1UP!', '#a3e635');
      }
    };

    const buildMaze = () => {
      const c = mazeCanvas.getContext('2d');
      if (!c) return;
      c.clearRect(0, 0, mazeCanvas.width, mazeCanvas.height);
      const hue = WALL_HUES[(runLevel - 1) % WALL_HUES.length];
      const wall = (x: number, y: number) => cellOf(grid, x, y) === '#';

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (wall(x, y)) continue;
          if (wall(x, y - 1)) {
            const gradient = c.createLinearGradient(0, y * CELL, 0, y * CELL + 7);
            gradient.addColorStop(0, 'rgba(0,0,0,.55)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = gradient;
            c.fillRect(x * CELL, y * CELL, CELL, 7);
          }
          if (wall(x - 1, y)) {
            const gradient = c.createLinearGradient(x * CELL, 0, x * CELL + 6, 0);
            gradient.addColorStop(0, 'rgba(0,0,0,.4)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            c.fillStyle = gradient;
            c.fillRect(x * CELL, y * CELL, 6, CELL);
          }
        }
      }

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!wall(x, y)) continue;
          const gradient = c.createLinearGradient(0, y * CELL, 0, y * CELL + CELL);
          gradient.addColorStop(0, `hsl(${hue},55%,23%)`);
          gradient.addColorStop(1, `hsl(${hue},62%,10%)`);
          c.fillStyle = gradient;
          c.fillRect(x * CELL, y * CELL, CELL, CELL);
        }
      }

      c.save();
      c.strokeStyle = `hsl(${hue},95%,66%)`;
      c.lineWidth = 1.6;
      c.shadowColor = `hsl(${hue},100%,60%)`;
      c.shadowBlur = 5;
      c.lineCap = 'round';
      c.beginPath();
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (!wall(x, y)) continue;
          const px = x * CELL;
          const py = y * CELL;
          if (!wall(x, y - 1)) { c.moveTo(px + 1, py + 1.2); c.lineTo(px + CELL - 1, py + 1.2); }
          if (!wall(x, y + 1)) { c.moveTo(px + 1, py + CELL - 1.2); c.lineTo(px + CELL - 1, py + CELL - 1.2); }
          if (!wall(x - 1, y)) { c.moveTo(px + 1.2, py + 1); c.lineTo(px + 1.2, py + CELL - 1); }
          if (!wall(x + 1, y)) { c.moveTo(px + CELL - 1.2, py + 1); c.lineTo(px + CELL - 1.2, py + CELL - 1); }
        }
      }
      c.stroke();
      c.restore();

      c.save();
      c.fillStyle = '#f0abfc';
      c.shadowColor = '#e879f9';
      c.shadowBlur = 6;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          if (cellOf(grid, x, y) === '-') c.fillRect(x * CELL + 1, y * CELL + CELL / 2 - 1.5, CELL - 2, 3);
        }
      }
      c.restore();
    };

    const loadMaze = () => {
      grid = makeGrid();
      dots = grid.map((row) => row.map((cell) => (cell === '.' ? 1 : cell === 'o' ? 2 : 0)));
      totalSeeds = 0;
      coresLeft = 0;
      for (const row of dots) {
        for (const value of row) {
          if (value === 1) totalSeeds++;
          else if (value === 2) { totalSeeds++; coresLeft++; }
        }
      }
      seedsLeft = totalSeeds;
      eaten = 0;
      gem = null;
      buildMaze();
      setCores(coresLeft);
    };

    const resetActors = () => {
      player = { cx: 10, cy: 15, dx: 0, dy: 0, p: 0, want: [-1, 0], face: Math.PI };
      drones = DRONE_DEFS.map((def, index) => ({
        ...def,
        cx: index === 0 ? 10 : 9 + (index - 1),
        cy: index === 0 ? 7 : 10,
        dx: index === 0 ? -1 : 0,
        dy: 0,
        p: 0,
        state: index === 0 ? 'out' : 'house',
        fr: false,
        rev: false,
        bob: index * 1.7,
      }));
      modeIdx = 0;
      modeT = 0;
      frightT = 0;
      combo = 0;
      phase = 'run';
    };

    const frightDuration = () => Math.round(Math.max(2000, 7000 - runLevel * 700));
    const droneSpeed = () => Math.min(0.125, 0.092 + runLevel * 0.005) * (difficultyRef.current === 'easy' ? 0.8 : difficultyRef.current === 'hard' ? 1.35 : 1);
    const waveSchedule = () => [
      Math.max(2600, 7400 - runLevel * 440),
      19000,
      Math.max(2600, 7400 - runLevel * 440),
      19000,
      5000,
      19000,
      5000,
      Number.POSITIVE_INFINITY,
    ];

    const eatAt = (x: number, y: number) => {
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return;
      const kind = dots[y][x];
      if (!kind) return;
      dots[y][x] = 0;
      eaten++;
      seedsLeft--;
      const px = OX + (x + 0.5) * CELL;
      const py = OY + (y + 0.5) * CELL;
      if (kind === 1) {
        addScore(10);
        audio.playClick();
      } else {
        coresLeft--;
        setCores(coresLeft);
        addScore(50);
        audio.playScore();
        burst(px, py, 2.2, ['#67e8f9', '#cffafe', '#ffffff'], 14, 2.4);
        frightT = frightDuration();
        combo = 0;
        for (const drone of drones) {
          if (drone.state === 'eyes') continue;
          drone.fr = true;
          if (drone.state !== 'house') drone.rev = true;
        }
      }
      if (eaten === 60 || eaten === 150) {
        const reward = GEM_TABLE[Math.min(runLevel - 1, GEM_TABLE.length - 1)];
        gem = { ...reward, life: 11000 };
        popup(OX + 10.5 * CELL, OY + 10.5 * CELL, 'BONUS GEM', reward.color);
      }
      if (seedsLeft <= 0) {
        phase = 'clear';
        phaseT = 1800;
        flash = 0;
        addScore(500);
        audio.playScore();
      }
    };

    const reverseEntity = (entity: Entity) => {
      if (!entity.dx && !entity.dy) return;
      entity.cx = wrapX(entity.cx + entity.dx);
      entity.cy += entity.dy;
      entity.p = 1 - entity.p;
      entity.dx = -entity.dx;
      entity.dy = -entity.dy;
    };

    const stepEntity = (entity: Entity, speed: number, choose: (target: Entity) => void) => {
      let remaining = speed;
      let guard = 0;
      while (remaining > 1e-6 && guard++ < 6) {
        if (!entity.dx && !entity.dy) {
          choose(entity);
          if (!entity.dx && !entity.dy) return;
        }
        const need = 1 - entity.p;
        if (remaining >= need) {
          remaining -= need;
          entity.cx = wrapX(entity.cx + entity.dx);
          entity.cy += entity.dy;
          entity.p = 0;
          if (entity === (player as Entity)) eatAt(entity.cx, entity.cy);
          choose(entity);
          if (!entity.dx && !entity.dy) return;
        } else {
          entity.p += remaining;
          remaining = 0;
        }
      }
    };

    const choosePlayer = (entity: Entity) => {
      const actor = entity as Player;
      const want = actor.want;
      if (want && isOpen(grid, actor.cx, actor.cy, want[0], want[1], false)) {
        actor.dx = want[0];
        actor.dy = want[1];
      } else if (!(actor.dx || actor.dy) || !isOpen(grid, actor.cx, actor.cy, actor.dx, actor.dy, false)) {
        actor.dx = 0;
        actor.dy = 0;
      }
      if (actor.dx || actor.dy) actor.face = Math.atan2(actor.dy, actor.dx);
    };

    const targetFor = (drone: Drone): Vec => {
      if (drone.state === 'eyes') return [10, 9];
      if (drone.state === 'leave') return [10, 7];
      if (modeIdx % 2 === 0) return drone.corner;
      const px = player.cx;
      const py = player.cy;
      const ax = player.dx;
      const ay = player.dy;
      if (drone.name === 'dart') return [px, py];
      if (drone.name === 'lurk') return [px + ax * 4, py + ay * 4];
      if (drone.name === 'flank') {
        const lead = drones[0];
        const vx = px + ax * 2;
        const vy = py + ay * 2;
        return [lead.cx + (vx - lead.cx) * 2, lead.cy + (vy - lead.cy) * 2];
      }
      return Math.hypot(drone.cx - px, drone.cy - py) > 8 ? [px, py] : drone.corner;
    };

    const chooseDrone = (entity: Entity) => {
      const drone = entity as Drone;
      if (drone.state === 'eyes' && drone.cx === 10 && drone.cy === 9) {
        drone.state = 'leave';
      } else if (drone.state === 'leave' && drone.cx === 10 && drone.cy === 7) {
        drone.state = 'out';
        drone.dx = 0;
        drone.dy = 0;
        return;
      }
      const gate = drone.state === 'leave' || drone.state === 'eyes';
      const moving = drone.dx || drone.dy;
      if (drone.rev) {
        drone.rev = false;
        if (moving && isOpen(grid, drone.cx, drone.cy, -drone.dx, -drone.dy, gate)) {
          drone.dx = -drone.dx;
          drone.dy = -drone.dy;
          return;
        }
      }
      const options = DIRS.filter((dir) => !(moving && dir[0] === -drone.dx && dir[1] === -drone.dy) && isOpen(grid, drone.cx, drone.cy, dir[0], dir[1], gate));
      if (!options.length) {
        if (moving && isOpen(grid, drone.cx, drone.cy, -drone.dx, -drone.dy, gate)) {
          drone.dx = -drone.dx;
          drone.dy = -drone.dy;
        } else {
          drone.dx = 0;
          drone.dy = 0;
        }
        return;
      }
      let pick = options[0];
      if (drone.fr && drone.state === 'out') {
        pick = options[nextRandom() % options.length];
      } else {
        const target = targetFor(drone);
        let best = Number.POSITIVE_INFINITY;
        for (const dir of options) {
          const distance = (drone.cx + dir[0] - target[0]) ** 2 + (drone.cy + dir[1] - target[1]) ** 2;
          if (distance < best) {
            best = distance;
            pick = dir;
          }
        }
      }
      drone.dx = pick[0];
      drone.dy = pick[1];
    };

    const moveDrone = (drone: Drone, frames: number) => {
      if (drone.state === 'house') {
        drone.bob += 0.12 * frames;
        const wait = (drone.rel * FRAME) / (1 + (runLevel - 1) * 0.25);
        const gateNeed = drone.name === 'flank' ? 25 : drone.name === 'drift' ? 45 : 0;
        if (clock > wait && (eaten >= gateNeed || clock > 25000)) {
          drone.state = 'leave';
          drone.dx = 0;
          drone.dy = 0;
          drone.p = 0;
        }
        return;
      }
      let speed = droneSpeed();
      if (drone.state === 'eyes') speed = 0.23;
      else if (drone.fr) speed *= 0.55;
      else if (drone.state === 'leave') speed = 0.07;
      if (drone.cy === TUN && (drone.cx < 5 || drone.cx > 15) && drone.state !== 'eyes') speed *= 0.55;
      stepEntity(drone, speed * frames, chooseDrone);
    };

    const loseLife = () => {
      runLives--;
      setLives(runLives);
      audio.playHit();
      combo = 0;
      frightT = 0;
      phase = 'dying';
      phaseT = 1600;
      const px = OX + (player.cx + player.dx * player.p + 0.5) * CELL;
      const py = OY + (player.cy + player.dy * player.p + 0.5) * CELL;
      burst(px, py, 4.6, ['#d9f99d', '#ffffff', '#84cc16'], 22, 2.8);
    };

    const finish = (win: boolean) => {
      endedRef.current = true;
      setPlayState(win ? 'VICTORY' : 'GAMEOVER');
      if (win) audio.playScore();
      callbacksRef.current.onGameOver(runScore);
    };

    const advanceLevel = () => {
      if (runLevel >= MAX_LEVELS) {
        addScore(1000);
        finish(true);
        return;
      }
      runLevel++;
      setLevel(runLevel);
      loadMaze();
      resetActors();
      phase = 'intro';
      phaseT = 1400;
      audio.playDash();
    };

    const isClearPhase = () => phase === 'clear';

    const update = (delta: number) => {
      if (phase === 'intro') {
        phaseT -= delta;
        if (phaseT <= 0) phase = 'run';
        return;
      }
      if (phase === 'dying') {
        phaseT -= delta;
        if (phaseT <= 0) {
          if (runLives <= 0) {
            finish(false);
          } else {
            resetActors();
            phase = 'intro';
            phaseT = 1400;
          }
        }
        return;
      }
      if (phase === 'clear') {
        phaseT -= delta;
        flash += delta;
        if (phaseT <= 0) advanceLevel();
        return;
      }

      const frames = Math.min(3, delta / FRAME);
      if (frightT > 0) {
        frightT = Math.max(0, frightT - delta);
        if (frightT === 0) {
          for (const drone of drones) drone.fr = false;
          combo = 0;
        }
      } else {
        const schedule = waveSchedule();
        modeT += delta;
        if (modeT >= schedule[modeIdx]) {
          modeT = 0;
          modeIdx = Math.min(modeIdx + 1, schedule.length - 1);
          for (const drone of drones) if (drone.state === 'out') drone.rev = true;
        }
      }

      if (player.want && (player.dx || player.dy) && player.want[0] === -player.dx && player.want[1] === -player.dy) {
        reverseEntity(player);
        player.face = Math.atan2(player.dy, player.dx);
      }
      const playerSpeed = 0.112 * (difficultyRef.current === 'easy' ? 0.8 : 1) * (frightT > 0 ? 1.06 : 1);
      stepEntity(player, playerSpeed * frames, choosePlayer);
      if (isClearPhase()) return;
      for (const drone of drones) moveDrone(drone, frames);

      if (gem) {
        gem.life -= delta;
        if (gem.life <= 0) {
          gem = null;
        } else {
          const gx = player.cx + player.dx * player.p;
          const gy = player.cy + player.dy * player.p;
          if (Math.hypot(gx - 10, gy - 12) < 0.7) {
            addScore(gem.points);
            audio.playScore();
            popup(OX + 10.5 * CELL, OY + 10.5 * CELL, `+${gem.points}`, gem.color);
            burst(OX + 10.5 * CELL, OY + 12.5 * CELL, 3.4, [gem.color, '#ffffff'], 18, 2.6);
            gem = null;
          }
        }
      }

      const px = player.cx + player.dx * player.p;
      const py = player.cy + player.dy * player.p;
      for (const drone of drones) {
        if (drone.state === 'house' || drone.state === 'eyes' || drone.state === 'leave') continue;
        const gx = drone.cx + drone.dx * drone.p;
        const gy = drone.cy + drone.dy * drone.p;
        if (Math.abs(gx - px) < 0.6 && Math.abs(gy - py) < 0.6) {
          if (drone.fr) {
            combo++;
            const points = 100 * 2 ** combo;
            addScore(points);
            popup(OX + (gx + 0.5) * CELL, OY + (gy + 0.5) * CELL - 8, `+${points}`, '#67e8f9');
            burst(OX + (gx + 0.5) * CELL, OY + (gy + 0.5) * CELL, 3.6, ['#60a5fa', '#ffffff', drone.col], 16, 2.6);
            audio.playScore();
            drone.state = 'eyes';
            drone.fr = false;
            drone.dx = 0;
            drone.dy = 0;
            drone.p = 0;
          } else {
            loseLife();
            return;
          }
        }
      }
    };

    const updateEffects = (delta: number) => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        const step = delta / FRAME;
        particle.x += particle.vx * step;
        particle.y += particle.vy * step;
        particle.vy += 0.06 * step;
        particle.life -= delta;
        if (particle.life <= 0) particles.splice(i, 1);
      }
      for (let i = popups.length - 1; i >= 0; i--) {
        const entry = popups[i];
        entry.y -= 0.5 * (delta / FRAME);
        entry.life -= delta;
        if (entry.life <= 0) popups.splice(i, 1);
      }
    };

    const startGame = () => {
      if (endedRef.current) {
        endedRef.current = false;
        callbacksRef.current.restart?.();
      }
      runScore = 0;
      runLives = 3;
      runLevel = 1;
      nextLife = 10000;
      combo = 0;
      frightT = 0;
      flash = 0;
      particles.length = 0;
      popups.length = 0;
      rngState = seedRef.current && seedRef.current > 0 ? seedRef.current >>> 0 : ((Math.random() * 4294967296) >>> 0) || 1;
      loadMaze();
      resetActors();
      phase = 'intro';
      phaseT = 1600;
      setScore(0);
      setLives(3);
      setLevel(1);
      setCores(coresLeft);
      callbacksRef.current.onScoreUpdate(0);
      setPlayState('PLAYING');
      audio.playClick();
    };
    startRef.current = startGame;

    const drawBeetle = (px: number, py: number) => {
      ctx.save();
      ctx.translate(px, py);
      if (phase === 'dying') {
        const k = 1 - Math.max(0, phaseT) / 1600;
        ctx.rotate(k * 9);
        ctx.scale(1 - k * 0.9, 1 - k * 0.9);
        ctx.globalAlpha = 1 - k * 0.6;
      }
      ctx.rotate(player.face + Math.PI / 2);
      const running = (player.dx || player.dy) && phase === 'run' ? clock * 0.02 : 0;
      ctx.strokeStyle = '#3f2a14';
      ctx.lineWidth = 1.5;
      ctx.lineCap = 'round';
      for (let i = -1; i <= 1; i++) {
        for (const side of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(side * 4, i * 4);
          ctx.lineTo(side * (8 + Math.sin(running + i * 2 + side) * 1.2), i * 4 + Math.cos(running + i + side) * 2.2);
          ctx.stroke();
        }
      }
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-1.5, -7);
      ctx.quadraticCurveTo(-4.5, -11, -7, -10);
      ctx.moveTo(1.5, -7);
      ctx.quadraticCurveTo(4.5, -11, 7, -10);
      ctx.stroke();
      ctx.shadowColor = '#a3e635';
      ctx.shadowBlur = 10;
      const body = ctx.createRadialGradient(-2, -2, 1, 0, 0, 10);
      body.addColorStop(0, '#f7fee7');
      body.addColorStop(0.55, '#a3e635');
      body.addColorStop(1, '#3f6212');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.ellipse(0, 1, 7, 9, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#1a2e05';
      ctx.beginPath();
      ctx.arc(0, -7, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(20,40,5,.7)';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 9);
      ctx.stroke();
      ctx.fillStyle = '#facc15';
      ctx.globalAlpha *= 0.5 + 0.5 * Math.sin(clock * 0.012);
      ctx.beginPath();
      ctx.arc(0, 5, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawDrone = (drone: Drone) => {
      const px = OX + (drone.cx + drone.dx * drone.p + 0.5) * CELL;
      const bob = Math.sin(clock * 0.006 + drone.bob) * 1.4;
      const py = OY + (drone.cy + drone.dy * drone.p + 0.5) * CELL + bob + (drone.state === 'house' ? Math.sin(drone.bob) * 1.5 : 0);
      const eyesOnly = drone.state === 'eyes';
      const scared = drone.fr;
      if (!eyesOnly) {
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.ellipse(px + 1, OY + (drone.cy + drone.dy * drone.p + 0.5) * CELL + 10, 7.5, 2.6, 0, 0, Math.PI * 2);
        ctx.fill();
        let bodyColor = drone.col;
        if (scared) bodyColor = frightT < 2000 && Math.floor(clock / 180) % 2 === 0 ? '#f8fafc' : '#4466d8';
        ctx.save();
        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = 10;
        const gradient = ctx.createLinearGradient(0, py - 8, 0, py + 7);
        gradient.addColorStop(0, bodyColor);
        gradient.addColorStop(1, '#111827');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.roundRect(px - 8.5, py - 6, 17, 12.5, 5);
        ctx.fill();
        ctx.restore();
        const rotor = clock * 0.09;
        ctx.strokeStyle = 'rgba(230,240,255,.75)';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(px - 9 * Math.cos(rotor), py - 9);
        ctx.lineTo(px + 9 * Math.cos(rotor), py - 9);
        ctx.stroke();
        ctx.fillStyle = '#334155';
        ctx.fillRect(px - 1, py - 9, 2, 4);
        ctx.fillStyle = 'rgba(255,255,255,.5)';
        for (let i = -1; i <= 1; i++) ctx.fillRect(px + i * 4.5 - 1, py + 4, 2, 1.5);
        if (scared) {
          ctx.fillStyle = '#fde68a';
          ctx.fillRect(px - 4.5, py - 3, 2.2, 2.2);
          ctx.fillRect(px + 2.3, py - 3, 2.2, 2.2);
          ctx.strokeStyle = '#fde68a';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(px - 4.5, py + 2.2);
          ctx.lineTo(px - 2.2, py + 0.8);
          ctx.lineTo(px, py + 2.2);
          ctx.lineTo(px + 2.2, py + 0.8);
          ctx.lineTo(px + 4.5, py + 2.2);
          ctx.stroke();
          return;
        }
      }
      ctx.save();
      ctx.shadowColor = eyesOnly ? '#67e8f9' : '#fef08a';
      ctx.shadowBlur = eyesOnly ? 12 : 7;
      ctx.fillStyle = '#0b1020';
      ctx.beginPath();
      ctx.roundRect(px - 6, py - 4, 12, 7, 3.5);
      ctx.fill();
      ctx.fillStyle = eyesOnly ? '#67e8f9' : '#fef08a';
      ctx.beginPath();
      ctx.arc(px + drone.dx * 3, py - 1 + drone.dy * 1.2, 2.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    const drawGem = () => {
      if (!gem) return;
      const gx = OX + 10.5 * CELL;
      const gy = OY + 12.5 * CELL + Math.sin(clock * 0.006) * 2;
      ctx.save();
      ctx.translate(gx, gy);
      ctx.shadowColor = gem.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = gem.color;
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.lineTo(6, -1.5);
      ctx.lineTo(3.6, 6);
      ctx.lineTo(-3.6, 6);
      ctx.lineTo(-6, -1.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      ctx.beginPath();
      ctx.moveTo(0, -6.5);
      ctx.lineTo(-2.2, -0.8);
      ctx.lineTo(0, 6);
      ctx.lineTo(2.2, -0.8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#05060f');
      sky.addColorStop(0.55, '#0a0f2a');
      sky.addColorStop(1, '#070a1c');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);
      for (const star of stars) {
        const alpha = 0.14 + 0.34 * (0.5 + 0.5 * Math.sin(clock * 0.0014 + star.phase));
        ctx.fillStyle = `rgba(196,181,253,${alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      ctx.save();
      ctx.shadowColor = 'rgba(103,232,249,0.28)';
      ctx.shadowBlur = 18;
      ctx.fillStyle = '#060818';
      ctx.fillRect(OX - 3, OY - 3, COLS * CELL + 6, ROWS * CELL + 6);
      ctx.restore();
      ctx.drawImage(mazeCanvas, OX, OY);

      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const kind = dots[y][x];
          if (!kind) continue;
          const px = OX + (x + 0.5) * CELL;
          const py = OY + (y + 0.5) * CELL;
          if (kind === 1) {
            ctx.fillStyle = '#fde68a';
            ctx.beginPath();
            ctx.arc(px, py, 1.8, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.save();
            ctx.shadowColor = '#67e8f9';
            ctx.shadowBlur = 12;
            ctx.fillStyle = '#cffafe';
            ctx.beginPath();
            ctx.arc(px, py, 4.6 + Math.sin(clock * 0.009 + x) * 1.1, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }

      drawGem();

      const actors = [
        ...drones.map((drone) => ({ y: drone.cy + drone.dy * drone.p, draw: () => drawDrone(drone) })),
        { y: player.cy + player.dy * player.p, draw: () => drawBeetle(OX + (player.cx + player.dx * player.p + 0.5) * CELL, OY + (player.cy + player.dy * player.p + 0.5) * CELL) },
      ];
      actors.sort((a, b) => a.y - b.y).forEach((actor) => actor.draw());

      for (const particle of particles) {
        ctx.globalAlpha = Math.max(0, particle.life / particle.max);
        ctx.fillStyle = particle.color;
        ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
      }
      ctx.globalAlpha = 1;

      for (const entry of popups) {
        ctx.globalAlpha = Math.min(1, entry.life / 300);
        ctx.font = '800 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = entry.color;
        ctx.fillText(entry.text, entry.x, entry.y);
      }
      ctx.globalAlpha = 1;

      if (phase === 'clear' && Math.floor(flash / 120) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        ctx.fillRect(OX, OY, COLS * CELL, ROWS * CELL);
      }

      if (phase === 'intro' && state === 'PLAYING') {
        const text = runLevel > 1 ? `LEVEL ${runLevel}` : 'READY!';
        ctx.save();
        ctx.globalAlpha = 0.65 + 0.35 * Math.sin(clock * 0.008);
        ctx.font = '800 20px monospace';
        ctx.textAlign = 'center';
        ctx.fillStyle = '#a3e635';
        ctx.shadowColor = '#a3e635';
        ctx.shadowBlur = 14;
        ctx.fillText(text, OX + (COLS * CELL) / 2, OY + 12.4 * CELL);
        ctx.restore();
      }

      const footerY = OY + ROWS * CELL + 15;
      for (let i = 0; i < runLives; i++) {
        const px = OX + 7 + i * 18;
        ctx.fillStyle = '#84cc16';
        ctx.beginPath();
        ctx.ellipse(px, footerY, 5.5, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a2e05';
        ctx.beginPath();
        ctx.arc(px, footerY - 5.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.font = '700 10px monospace';
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(196,181,253,0.75)';
      ctx.fillText(`LV ${runLevel}/${MAX_LEVELS} · ${clockText(clock)}`, OX + COLS * CELL, footerY + 3);

      if (frightT > 0) {
        const ratio = Math.min(1, frightT / frightDuration());
        ctx.fillStyle = 'rgba(103,232,249,0.18)';
        ctx.fillRect(OX, OY + ROWS * CELL + 4, COLS * CELL, 3);
        ctx.fillStyle = '#67e8f9';
        ctx.fillRect(OX, OY + ROWS * CELL + 4, COLS * CELL * ratio, 3);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
      if (state !== 'PLAYING') {
        if (event.code === 'Space' || event.code === 'Enter') {
          event.preventDefault();
          startGame();
        }
        return;
      }
      let dir: Vec | null = null;
      if (event.code === 'ArrowUp' || event.code === 'KeyW') dir = [0, -1];
      else if (event.code === 'ArrowLeft' || event.code === 'KeyA') dir = [-1, 0];
      else if (event.code === 'ArrowDown' || event.code === 'KeyS') dir = [0, 1];
      else if (event.code === 'ArrowRight' || event.code === 'KeyD') dir = [1, 0];
      if (dir) {
        event.preventDefault();
        player.want = dir;
      }
    };

    const frame = (now: number) => {
      const delta = Math.min(48, now - lastTime);
      lastTime = now;
      if (!pausedRef.current) {
        clock += delta;
        if (state === 'PLAYING') update(delta);
        updateEffects(delta);
        draw();
      }
      animId = requestAnimationFrame(frame);
    };

    loadMaze();
    resetActors();
    phase = 'intro';

    window.addEventListener('keydown', handleKeyDown);
    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      startRef.current = () => {};
    };
  }, []);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />

      <div className="absolute top-4 left-6 right-6 flex items-start justify-between pointer-events-none">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-xs text-slate-400">Score</span>
            <span className="text-lg font-mono font-bold text-lime-300 tabular-nums">{score}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-xs text-slate-400">Level</span>
            <span className="text-sm font-mono font-bold text-cyan-300 tabular-nums">{level}/{MAX_LEVELS}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-xs text-slate-400">Cores</span>
            <span className="text-sm font-mono font-bold text-fuchsia-300 tabular-nums">{cores}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Lives</span>
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full ${
                  index < lives ? 'bg-lime-400 shadow-[0_0_8px_rgba(163,230,53,0.8)]' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Glow Beetle 3D</div>
          <p className="text-sm text-slate-300 mb-1">Arrow keys or WASD steer · turns queue at corners</p>
          <p className="text-sm text-slate-300 mb-1">Eat every seed · cores stun the drones · tunnels wrap</p>
          <p className="text-xs text-slate-400 mb-5">Ten mazes · four hunters · tag stunned drones for chains</p>
          <button
            onClick={() => startRef.current()}
            className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            START MAZE
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-rose-400 mb-1 tracking-tight">Caught in the Maze</div>
          <div className="text-sm text-slate-300 mb-4">
            Score: <span className="font-mono text-lime-300 font-bold">{score}</span> · Level <span className="font-mono text-cyan-300 font-bold">{level}</span>
          </div>
          <button
            onClick={() => startRef.current()}
            className="px-5 py-2.5 bg-lime-400 hover:bg-lime-300 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            RETRY MAZE
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-emerald-400 mb-1 tracking-tight">Maze Circuit Cleared</div>
          <div className="text-sm text-slate-300 mb-4">
            Ten mazes · Score: <span className="font-mono text-emerald-300 font-bold">{score}</span>
          </div>
          <button
            onClick={() => startRef.current()}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            RUN AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
