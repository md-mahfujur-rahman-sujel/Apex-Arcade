import React, { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface QuantumSnakeEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  seed?: number;
  highScore?: number;
  onLevelComplete?: (level: number, score: number) => void;
  onRestart?: () => void;
}

type GameState = 'READY' | 'PLAYING' | 'GAMEOVER' | 'WON';

interface Point {
  x: number;
  y: number;
}

interface Rock extends Point {
  v: number;
}

interface Bonus extends Point {
  ms: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  grav: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

const W = 640;
const H = 480;
const GRID = 16;
const TILE_W = 30;
const TILE_H = 15;
const ORIGIN_X = W / 2;
const ORIGIN_Y = 96;
const FRUITS_PER_LEVEL = 6;
const MAX_LEVEL = 10;
const STEP = 1000 / 60;
const COMBO_WINDOW = 2800;
const BONUS_WINDOW = 9000;
const DIRS: Record<string, Point> = {
  ArrowUp: { x: 0, y: -1 },
  KeyW: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  KeyS: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  KeyA: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  KeyD: { x: 1, y: 0 },
};

const makeRng = (seed?: number) => {
  if (!seed) return Math.random;
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const hash = (x: number, y: number) => {
  let value = Math.imul(x + 374761393, 668265263) ^ Math.imul(y + 1274126177, 2246822519);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967296;
};

const mix = (a: string, b: string, t: number) => {
  const parse = (hex: string) => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
  const [ar, ag, ab] = parse(a);
  const [br, bg, bb] = parse(b);
  const channel = (x: number, y: number) => Math.round(x + (y - x) * Math.max(0, Math.min(1, t)));
  return `rgb(${channel(ar, br)},${channel(ag, bg)},${channel(ab, bb)})`;
};

const initialSnake = (): Point[] => [
  { x: 8, y: 8 },
  { x: 7, y: 8 },
  { x: 6, y: 8 },
];

const projectPoint = (gx: number, gy: number, z: number = 0) => ({
  sx: ORIGIN_X + (gx - gy) * (TILE_W / 2),
  sy: ORIGIN_Y + (gx + gy) * (TILE_H / 2) - z,
});

export const QuantumSnakeEngine: React.FC<QuantumSnakeEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
  seed,
  highScore = 0,
  onLevelComplete,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>('READY');
  const [hud, setHud] = useState({ score: 0, best: Math.max(0, highScore), level: 1, eaten: 0, combo: 0 });

  const callbacksRef = useRef({ onScoreUpdate, onGameOver, onLevelComplete, onRestart });
  callbacksRef.current = { onScoreUpdate, onGameOver, onLevelComplete, onRestart };
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  const bestRef = useRef(Math.max(0, highScore));

  const seedRef = useRef(seed);
  const rngRef = useRef(makeRng(seed));
  const snakeRef = useRef<Point[]>(initialSnake());
  const prevSnakeRef = useRef<Point[]>(initialSnake());
  const dirRef = useRef<Point>({ x: 1, y: 0 });
  const queueRef = useRef<Point[]>([]);
  const growRef = useRef(0);
  const foodRef = useRef<Point>({ x: 12, y: 8 });
  const bonusRef = useRef<Bonus | null>(null);
  const rocksRef = useRef<Rock[]>([]);
  const levelRef = useRef(1);
  const eatenRef = useRef(0);
  const scoreRef = useRef(0);
  const comboRef = useRef(0);
  const comboTRef = useRef(0);
  const wrapRef = useRef(false);
  const stateRef = useRef<GameState>('READY');
  const endedRef = useRef(false);
  const tickAccRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const floatersRef = useRef<Floater[]>([]);

  const syncHud = useCallback(() => {
    setHud({
      score: scoreRef.current,
      best: Math.max(bestRef.current, scoreRef.current),
      level: levelRef.current,
      eaten: eatenRef.current,
      combo: comboRef.current,
    });
  }, []);

  const comboMult = () => 1 + Math.min(9, comboRef.current) * 0.15;

  const occupied = useCallback((x: number, y: number) => {
    if (snakeRef.current.some((seg) => seg.x === x && seg.y === y)) return true;
    if (rocksRef.current.some((rock) => rock.x === x && rock.y === y)) return true;
    if (foodRef.current.x === x && foodRef.current.y === y) return true;
    const bonus = bonusRef.current;
    return !!bonus && bonus.x === x && bonus.y === y;
  }, []);

  const freeCell = useCallback((): Point | null => {
    const rng = rngRef.current;
    for (let i = 0; i < 400; i++) {
      const x = Math.floor(rng() * GRID);
      const y = Math.floor(rng() * GRID);
      if (!occupied(x, y) && !(x === snakeRef.current[0].x && y === snakeRef.current[0].y)) return { x, y };
    }
    for (let y = 0; y < GRID; y++) {
      for (let x = 0; x < GRID; x++) {
        if (!occupied(x, y) && !(x === snakeRef.current[0].x && y === snakeRef.current[0].y)) return { x, y };
      }
    }
    return null;
  }, [occupied]);

  const spawnFood = useCallback((): Point | null => {
    const cell = freeCell();
    if (cell) foodRef.current = cell;
    return cell;
  }, [freeCell]);

  const spawnRocks = useCallback(() => {
    const level = levelRef.current;
    const count = Math.min(40, Math.max(0, (level - 1) * 3));
    const rocks: Rock[] = [];
    const head = snakeRef.current[0];
    const dir = dirRef.current;
    const rng = rngRef.current;
    for (let i = 0; i < count; i++) {
      for (let attempt = 0; attempt < 80; attempt++) {
        const x = Math.floor(rng() * GRID);
        const y = Math.floor(rng() * GRID);
        let ok = !snakeRef.current.some((seg) => seg.x === x && seg.y === y) && !(foodRef.current.x === x && foodRef.current.y === y);
        ok = ok && !rocks.some((rock) => rock.x === x && rock.y === y) && Math.abs(x - head.x) + Math.abs(y - head.y) > 5;
        for (let step = 1; step <= 6 && ok; step++) {
          if (x === head.x + dir.x * step && y === head.y + dir.y * step) ok = false;
        }
        if (ok) {
          rocks.push({ x, y, v: Math.floor(rng() * 3) });
          break;
        }
      }
    }
    rocksRef.current = rocks;
  }, []);

  const resetFull = useCallback(() => {
    rngRef.current = makeRng(seedRef.current);
    const snake = initialSnake();
    snakeRef.current = snake;
    prevSnakeRef.current = snake.map((segment) => ({ ...segment }));
    dirRef.current = { x: 1, y: 0 };
    queueRef.current = [];
    growRef.current = 0;
    foodRef.current = { x: 12, y: 8 };
    bonusRef.current = null;
    rocksRef.current = [];
    levelRef.current = 1;
    eatenRef.current = 0;
    scoreRef.current = 0;
    comboRef.current = 0;
    comboTRef.current = 0;
    wrapRef.current = false;
    tickAccRef.current = 0;
    particlesRef.current = [];
    floatersRef.current = [];
    endedRef.current = false;
    spawnFood();
    stateRef.current = 'READY';
    setGameState('READY');
    syncHud();
  }, [spawnFood, syncHud]);

  const startMatch = useCallback(() => {
    const wasEnded = stateRef.current === 'GAMEOVER' || stateRef.current === 'WON';
    resetFull();
    stateRef.current = 'PLAYING';
    setGameState('PLAYING');
    if (wasEnded) callbacksRef.current.onRestart?.();
    audio.playClick();
  }, [resetFull]);

  useEffect(() => {
    resetFull();
  }, [resetFull]);

  useEffect(() => {
    if ((highScore || 0) > bestRef.current) {
      bestRef.current = highScore || 0;
      syncHud();
    }
  }, [highScore, syncHud]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
      if (event.code === 'Space' || event.code === 'Enter') {
        if (stateRef.current !== 'PLAYING') {
          event.preventDefault();
          startMatch();
        }
        return;
      }
      if (stateRef.current !== 'PLAYING') return;
      const dir = DIRS[event.code];
      if (dir) {
        event.preventDefault();
        const queue = queueRef.current;
        const last = queue.length ? queue[queue.length - 1] : dirRef.current;
        if (queue.length < 3 && !(dir.x === -last.x && dir.y === -last.y) && !(dir.x === last.x && dir.y === last.y)) {
          queue.push(dir);
          audio.playClick();
        }
        return;
      }
      if (event.code === 'KeyT') {
        event.preventDefault();
        wrapRef.current = !wrapRef.current;
        audio.playClick();
        const head = snakeRef.current[0];
        const { sx, sy } = projectPoint(head.x, head.y, 26);
        floatersRef.current.push({
          x: sx,
          y: sy,
          text: wrapRef.current ? 'WRAP ON' : 'SOLID WALLS +50%',
          color: wrapRef.current ? '#67E8F9' : '#FB923C',
          life: 55,
          maxLife: 55,
        });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [startMatch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const project = projectPoint;

    const intervalMs = () => {
      const level = levelRef.current;
      const baseFrames = Math.max(4, 10 - Math.floor((level - 1) * 0.7));
      const scale = difficultyRef.current === 'easy' ? 0.85 : difficultyRef.current === 'hard' ? 1.25 : 1;
      return Math.max(3, Math.round(baseFrames / scale)) * STEP;
    };

    const addBurst = (x: number, y: number, count: number, colors: string[], speed = 3) => {
      const rng = rngRef.current;
      for (let i = 0; i < count; i++) {
        const angle = rng() * Math.PI * 2;
        const velocity = speed * (0.45 + rng() * 0.75);
        const life = 26 + rng() * 24;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity - 0.6,
          life,
          maxLife: life,
          size: 1.4 + rng() * 2.6,
          color: colors[Math.floor(rng() * colors.length)],
          grav: 0.06,
        });
      }
      if (particlesRef.current.length > 220) particlesRef.current.splice(0, particlesRef.current.length - 220);
    };

    const finishSession = () => {
      if (endedRef.current) return;
      endedRef.current = true;
      callbacksRef.current.onGameOver?.(scoreRef.current);
    };

    const addScore = (points: number) => {
      scoreRef.current += points;
      if (scoreRef.current > bestRef.current) bestRef.current = scoreRef.current;
      callbacksRef.current.onScoreUpdate?.(scoreRef.current);
    };

    const die = () => {
      if (stateRef.current !== 'PLAYING') return;
      stateRef.current = 'GAMEOVER';
      setGameState('GAMEOVER');
      for (const segment of snakeRef.current) {
        const { sx, sy } = project(segment.x, segment.y, 14);
        addBurst(sx, sy, 5, ['#FB923C', '#FDE047', '#EF4444'], 3.4);
      }
      audio.playHit();
      audio.playExplosion();
      syncHud();
      finishSession();
    };

    const winRun = () => {
      if (stateRef.current !== 'PLAYING') return;
      addScore(500);
      stateRef.current = 'WON';
      setGameState('WON');
      bestRef.current = Math.max(bestRef.current, scoreRef.current);
      callbacksRef.current.onLevelComplete?.(levelRef.current, scoreRef.current);
      audio.playScore();
      syncHud();
      finishSession();
    };

    const advanceLevel = () => {
      if (levelRef.current >= MAX_LEVEL) {
        winRun();
        return;
      }
      levelRef.current += 1;
      eatenRef.current = 0;
      spawnRocks();
      spawnFood();
      callbacksRef.current.onLevelComplete?.(levelRef.current, scoreRef.current);
      const head = snakeRef.current[0];
      const { sx, sy } = project(head.x, head.y, 20);
      addBurst(sx, sy, 20, ['#FDE047', '#FB923C', '#FFF7ED'], 2.6);
      floatersRef.current.push({ x: sx, y: sy - 18, text: `LEVEL ${levelRef.current}`, color: '#FDE047', life: 64, maxLife: 64 });
      audio.playScore();
      syncHud();
    };

    const logicTick = () => {
      const queue = queueRef.current;
      if (queue.length) dirRef.current = queue.shift() as Point;
      const dir = dirRef.current;
      const head = snakeRef.current[0];
      let nx = head.x + dir.x;
      let ny = head.y + dir.y;
      if (wrapRef.current) {
        nx = (nx + GRID) % GRID;
        ny = (ny + GRID) % GRID;
      } else if (nx < 0 || ny < 0 || nx >= GRID || ny >= GRID) {
        die();
        return;
      }
      const body = growRef.current > 0 ? snakeRef.current : snakeRef.current.slice(0, -1);
      if (body.some((segment) => segment.x === nx && segment.y === ny) || rocksRef.current.some((rock) => rock.x === nx && rock.y === ny)) {
        die();
        return;
      }

      const old = snakeRef.current;
      snakeRef.current = [{ x: nx, y: ny }, ...old];
      if (growRef.current > 0) growRef.current -= 1;
      else snakeRef.current.pop();
      prevSnakeRef.current = snakeRef.current.map((segment, index) => (old[index] ? { ...old[index] } : { ...segment }));

      const bonus = bonusRef.current;
      if (foodRef.current.x === nx && foodRef.current.y === ny) {
        const mult = comboMult();
        const points = Math.round(10 * levelRef.current * (wrapRef.current ? 1 : 1.5) * mult);
        addScore(points);
        growRef.current += 1;
        eatenRef.current += 1;
        comboRef.current = Math.min(9, comboRef.current + 1);
        comboTRef.current = COMBO_WINDOW;
        audio.playScore();
        const { sx, sy } = project(nx, ny, 18);
        addBurst(sx, sy, 16, ['#34D399', '#A7F3D0', '#FFFFFF'], 3.2);
        floatersRef.current.push({
          x: sx,
          y: sy - 10,
          text: `+${points}${comboRef.current > 1 ? ` ×${mult.toFixed(1)}` : ''}`,
          color: '#BBF7D0',
          life: 48,
          maxLife: 48,
        });
        if (!spawnFood()) {
          winRun();
          return;
        }
        if (eatenRef.current % 5 === 0 && !bonusRef.current) {
          const gem = freeCell();
          if (gem) bonusRef.current = { ...gem, ms: BONUS_WINDOW };
        }
        if (eatenRef.current >= FRUITS_PER_LEVEL) advanceLevel();
        else syncHud();
      } else if (bonus && bonus.x === nx && bonus.y === ny) {
        const mult = comboMult();
        const points = Math.round(50 * levelRef.current * mult);
        addScore(points);
        growRef.current += 2;
        comboRef.current = Math.min(9, comboRef.current + 1);
        comboTRef.current = COMBO_WINDOW;
        bonusRef.current = null;
        audio.playScore();
        const { sx, sy } = project(nx, ny, 18);
        addBurst(sx, sy, 26, ['#FDE047', '#FBBF24', '#FFFFFF'], 4);
        floatersRef.current.push({ x: sx, y: sy - 10, text: `GEM +${points}`, color: '#FDE047', life: 56, maxLife: 56 });
        syncHud();
      }
    };

    /* ---------- drawing helpers ---------- */
    const drawCube = (sx: number, sy: number, height: number, top: string, left: string, right: string) => {
      const hw = TILE_W / 2;
      const hh = TILE_H / 2;
      ctx.fillStyle = top;
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh);
      ctx.lineTo(sx + hw, sy);
      ctx.lineTo(sx, sy + hh);
      ctx.lineTo(sx - hw, sy);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = left;
      ctx.beginPath();
      ctx.moveTo(sx - hw, sy);
      ctx.lineTo(sx, sy + hh);
      ctx.lineTo(sx, sy + hh + height);
      ctx.lineTo(sx - hw, sy + height);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = right;
      ctx.beginPath();
      ctx.moveTo(sx, sy + hh);
      ctx.lineTo(sx + hw, sy);
      ctx.lineTo(sx + hw, sy + height);
      ctx.lineTo(sx, sy + hh + height);
      ctx.closePath();
      ctx.fill();
    };

    const drawGem = (sx: number, sy: number, size: number) => {
      ctx.beginPath();
      ctx.moveTo(sx, sy - size);
      ctx.lineTo(sx + size * 0.72, sy);
      ctx.lineTo(sx, sy + size);
      ctx.lineTo(sx - size * 0.72, sy);
      ctx.closePath();
      ctx.fill();
    };

    const render = (now: number) => {
      const time = now * 0.001;
      const frac = stateRef.current === 'PLAYING' ? Math.min(1, tickAccRef.current / intervalMs()) : 1;
      const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const bg = ctx.createLinearGradient(0, 0, W, H);
      bg.addColorStop(0, '#0A0D16');
      bg.addColorStop(0.55, '#140F18');
      bg.addColorStop(1, '#1C0E0B');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      /* drifting embers */
      for (let i = 0; i < 34; i++) {
        const speed = 0.01 + hash(i, 3) * 0.035;
        const y = ((hash(i, 2) * (H + 40) - time * 60 * speed * 60) % (H + 40) + (H + 40)) % (H + 40) - 20;
        const x = hash(i, 1) * W + Math.sin(time * 0.5 + i) * 9;
        const size = 1 + hash(i, 4) * 2;
        ctx.fillStyle = `rgba(${i % 3 ? '251,146,60' : '253,224,71'},${(0.12 + 0.22 * Math.abs(Math.sin(time * 0.8 + i))).toFixed(2)})`;
        ctx.fillRect(x, y, size, size);
      }

      /* floor tiles */
      for (let y = 0; y < GRID; y++) {
        for (let x = 0; x < GRID; x++) {
          const { sx, sy } = project(x, y, 0);
          const hw = TILE_W / 2;
          const hh = TILE_H / 2;
          const checker = (x + y) % 2 === 0;
          ctx.fillStyle = checker ? '#171322' : '#121019';
          ctx.beginPath();
          ctx.moveTo(sx, sy - hh);
          ctx.lineTo(sx + hw, sy);
          ctx.lineTo(sx, sy + hh);
          ctx.lineTo(sx - hw, sy);
          ctx.closePath();
          ctx.fill();
          ctx.strokeStyle = 'rgba(148,163,184,0.06)';
          ctx.lineWidth = 0.6;
          ctx.stroke();
          const crack = hash(x, y);
          if (crack > 0.82) {
            ctx.strokeStyle = `rgba(251,146,60,${(0.08 + crack * 0.16).toFixed(2)})`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sx - hw * 0.4, sy + hh * 0.2);
            ctx.lineTo(sx, sy - hh * 0.2);
            ctx.lineTo(sx + hw * 0.35, sy + hh * 0.15);
            ctx.stroke();
          }
        }
      }

      /* board rim */
      const corners = [project(0, 0, 0), project(GRID, 0, 0), project(GRID, GRID, 0), project(0, GRID, 0)];
      ctx.save();
      ctx.shadowColor = wrapRef.current ? '#38BDF8' : '#FB923C';
      ctx.shadowBlur = 14;
      ctx.strokeStyle = wrapRef.current ? 'rgba(56,189,248,0.85)' : 'rgba(251,146,60,0.8)';
      ctx.lineWidth = 2;
      if (wrapRef.current) ctx.setLineDash([9, 7]);
      ctx.beginPath();
      corners.forEach((corner, index) => (index ? ctx.lineTo(corner.sx, corner.sy) : ctx.moveTo(corner.sx, corner.sy)));
      ctx.closePath();
      ctx.stroke();
      ctx.restore();

      /* rocks */
      for (const rock of rocksRef.current) {
        const { sx, sy } = project(rock.x, rock.y, 7);
        drawCube(sx, sy, 7, ['#3B3448', '#453743', '#2A3040'][rock.v], ['#211C2C', '#281F28', '#1B202C'][rock.v], ['#171320', '#1D161C', '#141822'][rock.v]);
        ctx.strokeStyle = 'rgba(251,146,60,0.5)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(sx - 4, sy + 1);
        ctx.lineTo(sx, sy + 4);
        ctx.lineTo(sx + 4, sy + 2);
        ctx.stroke();
      }

      /* fruit */
      if (foodRef.current) {
        const bob = still ? 0 : Math.sin(time * 4) * 2.4;
        const { sx, sy } = project(foodRef.current.x, foodRef.current.y, 11 + bob);
        const glow = ctx.createRadialGradient(sx, sy, 1, sx, sy, 24);
        glow.addColorStop(0, 'rgba(52,211,153,0.4)');
        glow.addColorStop(1, 'rgba(52,211,153,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 26, sy - 26, 52, 52);
        drawCube(sx, sy, 11, '#A7F3D0', '#059669', '#047857');
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(sx - 2, sy - 3, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      /* golden gem */
      if (bonusRef.current) {
        const bonus = bonusRef.current;
        const bob = still ? 0 : Math.sin(time * 5 + 1) * 3;
        const { sx, sy } = project(bonus.x, bonus.y, 22 + bob);
        const glow = ctx.createRadialGradient(sx, sy, 1, sx, sy, 28);
        glow.addColorStop(0, 'rgba(251,191,36,0.45)');
        glow.addColorStop(1, 'rgba(251,191,36,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 30, sy - 30, 60, 60);
        ctx.fillStyle = '#FBBF24';
        drawGem(sx, sy, 9);
        ctx.fillStyle = '#FFF7C2';
        drawGem(sx, sy, 4.5);
        const k = Math.max(0, bonus.ms / BONUS_WINDOW);
        ctx.strokeStyle = k < 0.25 && Math.floor(time * 8) % 2 === 0 ? '#F87171' : '#FDE68A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 15, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * k);
        ctx.stroke();
      }

      /* snake */
      const snake = snakeRef.current;
      const previous = prevSnakeRef.current;
      const head = snake[0];
      const headGlow = ctx.createRadialGradient(
        project(head.x, head.y, 18).sx,
        project(head.x, head.y, 18).sy,
        2,
        project(head.x, head.y, 18).sx,
        project(head.x, head.y, 18).sy,
        42
      );
      headGlow.addColorStop(0, 'rgba(251,146,60,0.28)');
      headGlow.addColorStop(1, 'rgba(251,146,60,0)');
      ctx.fillStyle = headGlow;
      ctx.fillRect(0, 0, W, H);

      for (let i = snake.length - 1; i >= 0; i--) {
        const segment = snake[i];
        const from = previous[i] || segment;
        const wrapping = Math.abs(segment.x - from.x) > 1.5 || Math.abs(segment.y - from.y) > 1.5;
        const gx = wrapping ? segment.x : from.x + (segment.x - from.x) * frac;
        const gy = wrapping ? segment.y : from.y + (segment.y - from.y) * frac;
        const { sx, sy } = project(gx, gy, i === 0 ? 16 : 13);
        const depth = i / Math.max(1, snake.length - 1);
        if (i === 0) drawCube(sx, sy, 16, '#FED7AA', '#EA580C', '#9A3412');
        else drawCube(sx, sy, 13, mix('#FDBA74', '#B45309', depth), mix('#EA580C', '#7C2D12', depth), mix('#9A3412', '#431407', depth));
        if (i > 0 && i % 3 === 0) {
          ctx.fillStyle = `rgba(253,224,71,${(0.14 + 0.2 * Math.abs(Math.sin(time * 3 - i * 0.6))).toFixed(2)})`;
          ctx.beginPath();
          ctx.arc(sx, sy, 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* head eyes */
      {
        const headFrom = previous[0] || head;
        const wrapping = Math.abs(head.x - headFrom.x) > 1.5 || Math.abs(head.y - headFrom.y) > 1.5;
        const gx = wrapping ? head.x : headFrom.x + (head.x - headFrom.x) * frac;
        const gy = wrapping ? head.y : headFrom.y + (head.y - headFrom.y) * frac;
        const { sx, sy } = project(gx, gy, 16);
        const dir = dirRef.current;
        const forwardX = (dir.x - dir.y) * (TILE_W / 2);
        const forwardY = (dir.x + dir.y) * (TILE_H / 2);
        const length = Math.hypot(forwardX, forwardY) || 1;
        const fx = (forwardX / length) * 4;
        const fy = (forwardY / length) * 4;
        const px = -fy * 0.9;
        const py = fx * 0.9;
        for (const side of [-1, 1]) {
          const ex = sx + fx + px * side;
          const ey = sy - 2 + fy + py * side;
          ctx.fillStyle = '#FDE047';
          ctx.beginPath();
          ctx.arc(ex, ey, 2.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#1C0A05';
          ctx.beginPath();
          ctx.arc(ex + fx * 0.25, ey + fy * 0.25, 1.1, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      /* particles */
      for (const particle of particlesRef.current) {
        const k = Math.max(0, particle.life / particle.maxLife);
        ctx.globalAlpha = k;
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * (0.35 + 0.65 * k), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      /* floaters */
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = '700 13px ui-monospace, SFMono-Regular, Menlo, monospace';
      for (const floater of floatersRef.current) {
        ctx.globalAlpha = Math.min(1, (floater.life / floater.maxLife) * 2);
        ctx.fillStyle = floater.color;
        ctx.fillText(floater.text, floater.x, floater.y);
      }
      ctx.globalAlpha = 1;

      /* footer status */
      ctx.textAlign = 'center';
      ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillStyle = '#8B93B3';
      const mode = wrapRef.current ? 'WRAP-AROUND' : 'SOLID WALLS · FRUIT +50%';
      ctx.fillText(`${mode}   ·   T TOGGLE   ·   SPACE START`, W / 2, H - 12);

      if (stateRef.current === 'GAMEOVER') {
        ctx.fillStyle = `rgba(127,29,29,${Math.min(0.28, 0.28)})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    let raf = 0;
    let last = performance.now();

    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (pausedRef.current) {
        last = now;
        return;
      }
      const dt = Math.min(100, now - last);
      last = now;

      if (stateRef.current === 'PLAYING') {
        if (comboRef.current > 0 && comboTRef.current > 0) {
          comboTRef.current -= dt;
          if (comboTRef.current <= 0) {
            comboTRef.current = 0;
            comboRef.current = 0;
            syncHud();
          }
        }
        const bonus = bonusRef.current;
        if (bonus) {
          bonus.ms -= dt;
          if (bonus.ms <= 0) bonusRef.current = null;
        }
        tickAccRef.current += dt;
        const interval = intervalMs();
        let guard = 0;
        while (tickAccRef.current >= interval && guard < 4 && stateRef.current === 'PLAYING') {
          tickAccRef.current -= interval;
          logicTick();
          guard += 1;
        }
      }

      const scale = dt / STEP;
      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const particle = particlesRef.current[i];
        particle.x += particle.vx * scale;
        particle.y += particle.vy * scale;
        particle.vy += particle.grav * scale;
        particle.vx *= 0.98;
        particle.vy *= 0.98;
        particle.life -= scale;
        if (particle.life <= 0) particlesRef.current.splice(i, 1);
      }
      for (let i = floatersRef.current.length - 1; i >= 0; i--) {
        const floater = floatersRef.current[i];
        floater.y -= 0.55 * scale;
        floater.life -= scale;
        if (floater.life <= 0) floatersRef.current.splice(i, 1);
      }

      render(now);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [freeCell, spawnFood, spawnRocks, syncHud]);

  const comboLabel = (1 + Math.min(9, hud.combo) * 0.15).toFixed(1);
  const levelLabel = `${hud.level}/${MAX_LEVEL}`;
  const fruitLabel = `${hud.eaten}/${FRUITS_PER_LEVEL}`;

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" style={{ width: '100%', height: '100%' }} />

      <div className="absolute top-4 left-6 right-6 flex items-start justify-between pointer-events-none gap-3">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-[10px] font-bold tracking-widest text-slate-400">SCORE</span>
          <span className="text-lg leading-none font-mono font-bold text-emerald-400 tabular-nums">{hud.score}</span>
          <span className="text-[10px] font-bold tracking-widest text-amber-300/80">BEST {hud.best}</span>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] font-mono font-bold text-slate-300 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 tracking-wider">
            LV {levelLabel} · FRUIT {fruitLabel} · ×{comboLabel}
          </div>
          <div className="text-[10px] font-mono text-slate-500 bg-black/40 px-2 py-1 rounded-md border border-white/5">
            WASD / ARROWS · T WALLS
          </div>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-[11px] font-bold tracking-[0.3em] text-orange-300/80 mb-3">QUANTUM GRID</div>
          <div className="text-2xl font-black text-white tracking-tight">Ember Serpent</div>
          <p className="mt-2 max-w-sm text-xs leading-relaxed text-slate-300">
            Ten cavern levels. Chain fruit for a combo, catch timed gems, and steer around the rocks that rise with every level.
          </p>
          <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-slate-400">
            <span>BEST {hud.best}</span>
            <span>·</span>
            <span>6 FRUIT PER LEVEL</span>
          </div>
          <button
            type="button"
            onClick={startMatch}
            className="mt-5 px-6 py-2.5 bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            START RUN
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-black text-red-400 tracking-tight">BOUNDARY BREACH</div>
          <div className="mt-2 text-xs text-slate-300">
            Score <span className="font-mono font-bold text-emerald-300">{hud.score}</span> · Best{' '}
            <span className="font-mono font-bold text-amber-300">{hud.best}</span> · Level {levelLabel}
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">FRUIT {hud.eaten} · COMBO ×{comboLabel}</div>
          <button
            type="button"
            onClick={startMatch}
            className="mt-5 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            Rematch
          </button>
        </div>
      )}

      {gameState === 'WON' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-black text-amber-300 tracking-tight">CAVERN CONQUERED</div>
          <div className="mt-2 text-xs text-slate-300">
            Ten levels cleared · Score <span className="font-mono font-bold text-emerald-300">{hud.score}</span>
          </div>
          <div className="mt-1 text-[10px] font-mono text-slate-500">BEST {hud.best} · FINAL COMBO ×{comboLabel}</div>
          <button
            type="button"
            onClick={startMatch}
            className="mt-5 px-6 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs tracking-wider rounded-lg transition-colors cursor-pointer"
          >
            Rematch
          </button>
        </div>
      )}
    </div>
  );
};
