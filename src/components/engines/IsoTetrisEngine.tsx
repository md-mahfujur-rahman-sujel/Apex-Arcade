import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface IsoTetrisEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onRestart?: () => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

type PieceKey = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
type PlayState = 'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';
type Cell = PieceKey | null;

interface ActivePiece {
  key: PieceKey;
  rot: number;
  x: number;
  y: number;
}

const COLS = 10;
const ROWS = 20;
const CELL = 20;
const BOARD_X = 220;
const BOARD_Y = 34;
const MAX_LINES = 150;
const LOCK_DELAY = 500;
const DAS_DELAY = 160;
const ARR_INTERVAL = 45;

const SHAPES: Record<PieceKey, { matrix: number[][]; color: string; sideColor: string }> = {
  I: { matrix: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]], color: '#06B6D4', sideColor: '#0891B2' },
  J: { matrix: [[1, 0, 0], [1, 1, 1], [0, 0, 0]], color: '#3B82F6', sideColor: '#2563EB' },
  L: { matrix: [[0, 0, 1], [1, 1, 1], [0, 0, 0]], color: '#F97316', sideColor: '#EA580C' },
  O: { matrix: [[1, 1], [1, 1]], color: '#FACC15', sideColor: '#CA8A04' },
  S: { matrix: [[0, 1, 1], [1, 1, 0], [0, 0, 0]], color: '#10B981', sideColor: '#059669' },
  T: { matrix: [[0, 1, 0], [1, 1, 1], [0, 0, 0]], color: '#A855F7', sideColor: '#9333EA' },
  Z: { matrix: [[1, 1, 0], [0, 1, 1], [0, 0, 0]], color: '#EF4444', sideColor: '#DC2626' },
};
const KEYS: PieceKey[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];

function rotateCW(matrix: number[][]): number[][] {
  const size = matrix.length;
  return matrix.map((_, row) => matrix.map((__, col) => matrix[size - 1 - col][row]));
}

const ROTATIONS = KEYS.reduce((all, key) => {
  const states: number[][][] = [SHAPES[key].matrix.map((row) => [...row])];
  for (let i = 1; i < 4; i++) states.push(key === 'O' ? SHAPES.O.matrix.map((row) => [...row]) : rotateCW(states[i - 1]));
  all[key] = states;
  return all;
}, {} as Record<PieceKey, number[][][]>);

// SRS wall kicks converted to screen coordinates (y pointing down).
const KICKS_JLSTZ: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '1>0': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '1>2': [[0, 0], [1, 0], [1, 1], [0, -2], [1, -2]],
  '2>1': [[0, 0], [-1, 0], [-1, -1], [0, 2], [-1, 2]],
  '2>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
  '3>2': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '3>0': [[0, 0], [-1, 0], [-1, 1], [0, -2], [-1, -2]],
  '0>3': [[0, 0], [1, 0], [1, -1], [0, 2], [1, 2]],
};
const KICKS_I: Record<string, [number, number][]> = {
  '0>1': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '1>0': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '1>2': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
  '2>1': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '2>3': [[0, 0], [2, 0], [-1, 0], [2, -1], [-1, 2]],
  '3>2': [[0, 0], [-2, 0], [1, 0], [-2, 1], [1, -2]],
  '3>0': [[0, 0], [1, 0], [-2, 0], [1, 2], [-2, -1]],
  '0>3': [[0, 0], [-1, 0], [2, 0], [-1, -2], [2, 1]],
};

function makeBoard(): Cell[][] {
  return Array.from({ length: ROWS }, () => Array<Cell>(COLS).fill(null));
}

function clockText(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export const IsoTetrisEngine: React.FC<IsoTetrisEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  onRestart,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startRef = useRef<() => void>(() => {});
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<PlayState>('READY');

  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const callbacksRef = useRef({ onScoreUpdate, onGameOver, restart: onRestart });
  callbacksRef.current = { onScoreUpdate, onGameOver, restart: onRestart };
  const endedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const board: Cell[][] = makeBoard();
    let current: ActivePiece = { key: 'T', rot: 0, x: 3, y: 0 };
    let queue: PieceKey[] = [];
    let bag: PieceKey[] = [];
    let hold: PieceKey | null = null;
    let canHold = true;
    let score = 0;
    let lines = 0;
    let level = 1;
    let combo = -1;
    let b2b = false;
    let clearRows: number[] = [];
    let clearTimer = 0;
    let dropAcc = 0;
    let lockAcc = 0;
    let lockResets = 0;
    let spinFlag = false;
    let state: PlayState = 'READY';
    let clock = 0;
    let banner = { text: '', color: '#fff', life: 0 };
    let lastTime = performance.now();
    let animId = 0;
    let dasDir = 0;
    let dasTimer = 0;
    let arrTimer = 0;
    const keys = new Set<string>();
    const stars = Array.from({ length: 74 }, () => ({
      x: Math.random() * 640,
      y: Math.random() * 480,
      size: 0.6 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
    }));

    const setPlayState = (next: PlayState) => {
      state = next;
      setGameState(next);
    };
    const syncHud = () => {
      setScore(score);
      setLines(lines);
      setLevel(level);
      setCombo(combo > 0 ? combo : 0);
    };
    const addScore = (amount: number) => {
      if (amount <= 0) return;
      score += amount;
      setScore(score);
      callbacksRef.current.onScoreUpdate(score);
    };
    const showBanner = (text: string, color: string) => {
      banner = { text, color, life: 1100 };
    };

    const matrixOf = (piece: ActivePiece) => ROTATIONS[piece.key][piece.rot];
    const pieceCells = (piece: ActivePiece): [number, number][] => {
      const matrix = matrixOf(piece);
      const cells: [number, number][] = [];
      for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
          if (matrix[row][col]) cells.push([piece.x + col, piece.y + row]);
        }
      }
      return cells;
    };
    const collides = (piece: ActivePiece): boolean =>
      pieceCells(piece).some(([x, y]) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x] !== null));
    const grounded = () => collides({ ...current, y: current.y + 1 });
    const resetLock = () => {
      if (grounded() && lockResets < 15) {
        lockAcc = 0;
        lockResets++;
      }
    };

    const fillQueue = () => {
      if (!bag.length) {
        bag = [...KEYS];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
      }
      queue.push(bag.shift() as PieceKey);
    };

    const spawn = (key?: PieceKey) => {
      while (queue.length < 5) fillQueue();
      const nextKey = key ?? (queue.shift() as PieceKey);
      const matrix = ROTATIONS[nextKey][0];
      current = {
        key: nextKey,
        rot: 0,
        x: Math.floor((COLS - matrix[0].length) / 2),
        y: nextKey === 'I' ? -1 : 0,
      };
      dropAcc = 0;
      lockAcc = 0;
      lockResets = 0;
      spinFlag = false;
      if (collides(current)) {
        endedRef.current = true;
        setPlayState('GAMEOVER');
        audio.playHit();
        callbacksRef.current.onGameOver(score);
      }
    };

    const isTSpin = () => {
      if (current.key !== 'T' || !spinFlag) return false;
      const corners: [number, number][] = [
        [current.x, current.y],
        [current.x + 2, current.y],
        [current.x, current.y + 2],
        [current.x + 2, current.y + 2],
      ];
      const filled = corners.filter(([x, y]) => x < 0 || x >= COLS || y >= ROWS || (y >= 0 && board[y][x] !== null)).length;
      return filled >= 3;
    };

    const lockPiece = () => {
      if (state !== 'PLAYING') return;
      const spin = isTSpin();
      spinFlag = false;
      let aboveTop = false;
      for (const [x, y] of pieceCells(current)) {
        if (y < 0) aboveTop = true;
        else board[y][x] = current.key;
      }
      if (aboveTop) {
        endedRef.current = true;
        setPlayState('GAMEOVER');
        audio.playHit();
        callbacksRef.current.onGameOver(score);
        return;
      }

      const full: number[] = [];
      for (let row = 0; row < ROWS; row++) if (board[row].every((cell) => cell !== null)) full.push(row);
      canHold = true;
      if (!full.length) {
        if (spin) {
          addScore(100 * level);
          showBanner('T-SPIN', '#C084FC');
          audio.playScore();
        }
        combo = -1;
        setCombo(0);
        spawn();
        return;
      }

      combo++;
      clearRows = full;
      clearTimer = 320;
      const baseTable = spin ? [0, 800, 1200, 1600, 1600] : [0, 100, 300, 500, 800];
      const base = baseTable[full.length] * level;
      const difficult = spin || full.length === 4;
      const b2bBonus = difficult && b2b ? Math.floor(base / 2) : 0;
      const comboPoints = combo > 0 ? 50 * combo * level : 0;
      addScore(base + b2bBonus + comboPoints);
      b2b = difficult;
      if (spin) showBanner('T-SPIN', '#C084FC');
      else if (full.length === 4) showBanner('PRISM!', '#FDE68A');
      setCombo(combo);
      audio.playScore();
    };

    const clearLines = () => {
      const removed = clearRows.length;
      for (const row of [...clearRows].sort((a, b) => b - a)) board.splice(row, 1);
      while (board.length < ROWS) board.unshift(Array<Cell>(COLS).fill(null));
      clearRows = [];
      clearTimer = 0;
      lines += removed;
      const nextLevel = Math.floor(lines / 10) + 1;
      if (nextLevel > level) {
        level = nextLevel;
        audio.playDash();
        showBanner(`LEVEL ${level}`, '#FDE68A');
      }
      const perfect = board.every((row) => row.every((cell) => cell === null));
      if (perfect) {
        addScore(1000 * level);
        showBanner('PERFECT CLEAR', '#67E8F9');
        audio.playScore();
      }
      setLines(lines);
      setLevel(level);
      setCombo(0);
      if (lines >= MAX_LINES) {
        endedRef.current = true;
        setPlayState('VICTORY');
        audio.playScore();
        callbacksRef.current.onGameOver(score);
        return;
      }
      spawn();
    };

    const startGame = () => {
      if (endedRef.current) {
        endedRef.current = false;
        callbacksRef.current.restart?.();
      }
      for (let row = 0; row < ROWS; row++) board[row].fill(null);
      queue = [];
      bag = [];
      hold = null;
      canHold = true;
      score = 0;
      lines = 0;
      level = 1;
      combo = -1;
      b2b = false;
      clearRows = [];
      clearTimer = 0;
      dropAcc = 0;
      lockAcc = 0;
      lockResets = 0;
      spinFlag = false;
      clock = 0;
      banner = { text: '', color: '#fff', life: 0 };
      dasDir = 0;
      dasTimer = 0;
      arrTimer = 0;
      keys.clear();
      syncHud();
      callbacksRef.current.onScoreUpdate(0);
      setPlayState('PLAYING');
      spawn();
      audio.playClick();
    };
    startRef.current = startGame;

    const move = (dx: number) => {
      if (state !== 'PLAYING' || clearTimer > 0) return;
      const moved = { ...current, x: current.x + dx };
      if (!collides(moved)) {
        current = moved;
        spinFlag = false;
        resetLock();
      } else {
        dasDir = 0;
      }
    };

    const rotatePiece = (dir: 1 | -1) => {
      if (state !== 'PLAYING' || clearTimer > 0) return;
      if (current.key === 'O') return;
      const to = (current.rot + dir + 4) % 4;
      const kicks = (current.key === 'I' ? KICKS_I : KICKS_JLSTZ)[`${current.rot}>${to}`] || [[0, 0]];
      for (const [dx, dy] of kicks) {
        const trial: ActivePiece = { ...current, rot: to, x: current.x + dx, y: current.y + dy };
        if (!collides(trial)) {
          current = trial;
          spinFlag = true;
          resetLock();
          audio.playClick();
          return;
        }
      }
    };

    const softDrop = () => {
      const moved = { ...current, y: current.y + 1 };
      if (!collides(moved)) {
        current = moved;
        addScore(1);
        dropAcc = 0;
      }
    };

    const hardDrop = () => {
      let distance = 0;
      while (!collides({ ...current, y: current.y + 1 })) {
        current = { ...current, y: current.y + 1 };
        distance++;
      }
      addScore(distance * 2);
      audio.playJump();
      lockPiece();
    };

    const holdPiece = () => {
      if (state !== 'PLAYING' || clearTimer > 0 || !canHold) return;
      const outgoing = current.key;
      canHold = false;
      if (hold === null) {
        hold = outgoing;
        spawn();
      } else {
        const incoming = hold;
        hold = outgoing;
        spawn(incoming);
      }
      audio.playClick();
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
      keys.add(event.code);
      switch (event.code) {
        case 'ArrowLeft':
        case 'KeyA':
          event.preventDefault();
          if (!event.repeat) {
            dasDir = -1;
            dasTimer = 0;
            arrTimer = 0;
            move(-1);
          }
          break;
        case 'ArrowRight':
        case 'KeyD':
          event.preventDefault();
          if (!event.repeat) {
            dasDir = 1;
            dasTimer = 0;
            arrTimer = 0;
            move(1);
          }
          break;
        case 'ArrowDown':
        case 'KeyS':
          event.preventDefault();
          break;
        case 'ArrowUp':
        case 'KeyW':
        case 'KeyX':
          event.preventDefault();
          if (!event.repeat) rotatePiece(1);
          break;
        case 'KeyZ':
          event.preventDefault();
          if (!event.repeat) rotatePiece(-1);
          break;
        case 'Space':
          event.preventDefault();
          if (!event.repeat) hardDrop();
          break;
        case 'KeyC':
        case 'ShiftLeft':
        case 'ShiftRight':
          event.preventDefault();
          if (!event.repeat) holdPiece();
          break;
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
      if ((event.code === 'ArrowLeft' || event.code === 'KeyA') && dasDir === -1) dasDir = keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0;
      if ((event.code === 'ArrowRight' || event.code === 'KeyD') && dasDir === 1) dasDir = keys.has('ArrowLeft') || keys.has('KeyA') ? -1 : 0;
    };
    const clearKeys = () => {
      keys.clear();
      dasDir = 0;
    };

    const drawBlock = (px: number, py: number, color: string, sideColor: string, alpha = 1, size = CELL) => {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = color;
      ctx.fillRect(px + 1, py + 1, size - 2, size - 2);
      ctx.fillStyle = 'rgba(255,255,255,0.28)';
      ctx.beginPath();
      ctx.moveTo(px + 1, py + 1);
      ctx.lineTo(px + size - 1, py + 1);
      ctx.lineTo(px + size - 4, py + 4);
      ctx.lineTo(px + 4, py + 4);
      ctx.lineTo(px + 4, py + size - 4);
      ctx.lineTo(px + 1, py + size - 1);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = sideColor;
      ctx.beginPath();
      ctx.moveTo(px + size - 1, py + 1);
      ctx.lineTo(px + size - 1, py + size - 1);
      ctx.lineTo(px + 1, py + size - 1);
      ctx.lineTo(px + 4, py + size - 4);
      ctx.lineTo(px + size - 4, py + size - 4);
      ctx.lineTo(px + size - 4, py + 4);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 1.5, py + 1.5, size - 3, size - 3);
      ctx.restore();
    };

    const drawMini = (key: PieceKey, cx: number, cy: number, size: number) => {
      const matrix = ROTATIONS[key][0];
      let minRow = 4, maxRow = -1, minCol = 4, maxCol = -1;
      matrix.forEach((row, r) => row.forEach((value, c) => {
        if (value) {
          minRow = Math.min(minRow, r);
          maxRow = Math.max(maxRow, r);
          minCol = Math.min(minCol, c);
          maxCol = Math.max(maxCol, c);
        }
      }));
      const width = (maxCol - minCol + 1) * size;
      const height = (maxRow - minRow + 1) * size;
      matrix.forEach((row, r) => row.forEach((value, c) => {
        if (value) {
          drawBlock(cx - width / 2 + (c - minCol) * size, cy - height / 2 + (r - minRow) * size, SHAPES[key].color, SHAPES[key].sideColor, 1, size);
        }
      }));
    };

    const drawPanel = (x: number, y: number, width: number, height: number, title: string) => {
      ctx.fillStyle = 'rgba(16,20,36,0.82)';
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 10);
      ctx.fill();
      ctx.strokeStyle = 'rgba(168,85,247,0.24)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, width, height, 10);
      ctx.stroke();
      ctx.fillStyle = 'rgba(148,163,184,0.9)';
      ctx.font = '800 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(title, x + width / 2, y + 16);
    };

    const draw = () => {
      ctx.clearRect(0, 0, 640, 480);
      const sky = ctx.createLinearGradient(0, 0, 0, 480);
      sky.addColorStop(0, '#070512');
      sky.addColorStop(0.55, '#0c0a24');
      sky.addColorStop(1, '#05040d');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, 640, 480);
      for (const star of stars) {
        const alpha = 0.18 + 0.4 * (0.5 + 0.5 * Math.sin(clock * 0.0016 + star.phase));
        ctx.fillStyle = `rgba(196,181,253,${alpha})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      ctx.save();
      ctx.shadowColor = 'rgba(168,85,247,0.55)';
      ctx.shadowBlur = 22;
      ctx.fillStyle = '#0a0718';
      ctx.fillRect(BOARD_X - 4, BOARD_Y - 4, COLS * CELL + 8, ROWS * CELL + 8);
      ctx.restore();
      ctx.fillStyle = '#06040f';
      ctx.fillRect(BOARD_X, BOARD_Y, COLS * CELL, ROWS * CELL);
      ctx.strokeStyle = 'rgba(168,85,247,0.42)';
      ctx.lineWidth = 2;
      ctx.strokeRect(BOARD_X - 1, BOARD_Y - 1, COLS * CELL + 2, ROWS * CELL + 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.035)';
      ctx.lineWidth = 1;
      for (let c = 1; c < COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(BOARD_X + c * CELL, BOARD_Y);
        ctx.lineTo(BOARD_X + c * CELL, BOARD_Y + ROWS * CELL);
        ctx.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(BOARD_X, BOARD_Y + r * CELL);
        ctx.lineTo(BOARD_X + COLS * CELL, BOARD_Y + r * CELL);
        ctx.stroke();
      }

      const flash = clearTimer > 0 && Math.floor(clearTimer / 55) % 2 === 0;
      board.forEach((row, y) => row.forEach((key, x) => {
        if (!key) return;
        const flashing = clearRows.includes(y);
        if (flashing) {
          ctx.fillStyle = flash ? '#ffffff' : SHAPES[key].color;
          ctx.fillRect(BOARD_X + x * CELL, BOARD_Y + y * CELL, CELL, CELL);
        } else {
          drawBlock(BOARD_X + x * CELL, BOARD_Y + y * CELL, SHAPES[key].color, SHAPES[key].sideColor);
        }
      }));

      if (state === 'PLAYING' && clearTimer <= 0) {
        let ghostY = current.y;
        while (!collides({ ...current, y: ghostY + 1 })) ghostY++;
        ctx.save();
        ctx.globalAlpha = 0.55;
        for (const [x, y] of pieceCells({ ...current, y: ghostY })) {
          if (y < 0) continue;
          ctx.strokeStyle = SHAPES[current.key].color;
          ctx.lineWidth = 1.5;
          ctx.strokeRect(BOARD_X + x * CELL + 2, BOARD_Y + y * CELL + 2, CELL - 4, CELL - 4);
          ctx.fillStyle = SHAPES[current.key].color;
          ctx.globalAlpha = 0.12;
          ctx.fillRect(BOARD_X + x * CELL + 2, BOARD_Y + y * CELL + 2, CELL - 4, CELL - 4);
          ctx.globalAlpha = 0.55;
        }
        ctx.restore();
        const lockPulse = grounded() ? 0.18 + 0.22 * Math.sin(clock * 0.02) : 0;
        for (const [x, y] of pieceCells(current)) {
          if (y < 0) continue;
          drawBlock(BOARD_X + x * CELL, BOARD_Y + y * CELL, SHAPES[current.key].color, SHAPES[current.key].sideColor);
          if (lockPulse > 0) {
            ctx.fillStyle = `rgba(255,255,255,${lockPulse})`;
            ctx.fillRect(BOARD_X + x * CELL, BOARD_Y + y * CELL, CELL, CELL);
          }
        }
      }

      drawPanel(454, 34, 156, 90, 'HOLD');
      if (hold && SHAPES[hold]) drawMini(hold, 532, 84, 18);
      else {
        ctx.fillStyle = 'rgba(148,163,184,0.35)';
        ctx.font = '700 10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('C / SHIFT', 532, 84);
      }
      if (!canHold && hold) {
        ctx.fillStyle = 'rgba(5,4,13,0.45)';
        ctx.fillRect(456, 36, 152, 86);
      }

      drawPanel(454, 138, 156, 214, 'NEXT');
      queue.slice(0, 3).forEach((key, index) => {
        if (SHAPES[key]) drawMini(key, 532, 184 + index * 60, index === 0 ? 18 : 15);
      });

      drawPanel(454, 366, 156, 96, 'RUN');
      ctx.fillStyle = '#c4b5fd';
      ctx.font = '700 10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText('TIME', 466, 394);
      ctx.fillText('COMBO', 466, 414);
      ctx.fillText('B2B', 466, 434);
      ctx.fillStyle = '#f8fafc';
      ctx.textAlign = 'right';
      ctx.fillText(clockText(clock / 1000), 598, 394);
      ctx.fillStyle = combo > 0 ? '#67e8f9' : 'rgba(148,163,184,0.45)';
      ctx.fillText(combo > 0 ? `x${combo}` : '-', 598, 414);
      ctx.fillStyle = b2b ? '#fde68a' : 'rgba(148,163,184,0.45)';
      ctx.fillText(b2b ? 'ON' : '-', 598, 434);

      ctx.fillStyle = 'rgba(255,255,255,0.1)';
      ctx.fillRect(BOARD_X, BOARD_Y + ROWS * CELL + 10, COLS * CELL, 6);
      const progress = Math.min(1, lines / MAX_LINES);
      const bar = ctx.createLinearGradient(BOARD_X, 0, BOARD_X + COLS * CELL, 0);
      bar.addColorStop(0, '#22d3ee');
      bar.addColorStop(1, '#c084fc');
      ctx.fillStyle = bar;
      ctx.fillRect(BOARD_X, BOARD_Y + ROWS * CELL + 10, COLS * CELL * progress, 6);
      ctx.fillStyle = 'rgba(196,181,253,0.7)';
      ctx.font = '700 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${lines} / ${MAX_LINES} LINES`, BOARD_X + COLS * CELL / 2, BOARD_Y + ROWS * CELL + 28);

      if (banner.life > 0) {
        ctx.save();
        const alpha = Math.min(1, banner.life / 320);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = banner.color;
        ctx.font = '800 24px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = banner.color;
        ctx.shadowBlur = 16;
        ctx.fillText(banner.text, BOARD_X + COLS * CELL / 2, BOARD_Y + ROWS * CELL / 2);
        ctx.restore();
      }
    };

    const update = (delta: number) => {
      if (clearTimer > 0) {
        clearTimer -= delta;
        if (clearTimer <= 0) clearLines();
        return;
      }

      const soft = keys.has('ArrowDown') || keys.has('KeyS');
      const baseGravity = difficultyRef.current === 'hard' ? 620 : difficultyRef.current === 'easy' ? 1000 : 800;
      const gravityMs = Math.max(60, baseGravity * Math.pow(0.85, level - 1));
      dropAcc += delta;
      const gravityInterval = soft ? Math.min(45, gravityMs) : gravityMs;
      if (dropAcc >= gravityInterval) {
        dropAcc = 0;
        if (!collides({ ...current, y: current.y + 1 })) {
          current = { ...current, y: current.y + 1 };
          if (soft) addScore(1);
        }
      }

      if (dasDir !== 0) {
        dasTimer += delta;
        if (dasTimer >= DAS_DELAY) {
          arrTimer += delta;
          while (arrTimer >= ARR_INTERVAL) {
            arrTimer -= ARR_INTERVAL;
            move(dasDir);
            if (clearTimer > 0 || state !== 'PLAYING') break;
          }
        }
      }

      if (grounded()) {
        lockAcc += delta;
        if (lockAcc >= LOCK_DELAY) lockPiece();
      } else {
        lockAcc = 0;
      }
    };

    const frame = (now: number) => {
      const delta = Math.min(48, now - lastTime);
      lastTime = now;
      if (!pausedRef.current) {
        clock += delta;
        if (state === 'PLAYING') update(delta);
        if (banner.life > 0) banner.life -= delta;
        draw();
      }
      animId = requestAnimationFrame(frame);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);
    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      startRef.current = () => {};
    };
  }, []);

  const multiplier = 1 + Math.min(4, Math.floor(combo / 5));

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      <div className="absolute top-4 left-6 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Score</span>
          <span className="text-lg font-mono font-bold text-purple-400 tabular-nums">{score}</span>
        </div>
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Lines</span>
          <span className="text-sm font-mono font-bold text-white tabular-nums">{lines}/{MAX_LINES}</span>
        </div>
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Level</span>
          <span className="text-sm font-mono font-bold text-cyan-400 tabular-nums">{level}</span>
        </div>
        {combo > 0 && (
          <div className="flex items-center gap-2 bg-cyan-400/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-cyan-300/30">
            <span className="text-xs text-cyan-200/70">Combo</span>
            <span className="text-sm font-mono font-bold text-cyan-300 tabular-nums">{combo} ×{multiplier}</span>
          </div>
        )}
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Prism Stack 3D</div>
          <p className="text-sm text-slate-300 mb-1">A/D or arrows move · W/Up or X rotate · Z rotate back</p>
          <p className="text-sm text-slate-300 mb-1">S/Down soft drop · Space hard drop · C or Shift hold</p>
          <p className="text-xs text-slate-400 mb-5">Clear 150 lines · T-spins and perfect clears score big</p>
          <button
            onClick={() => startRef.current()}
            className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            START MATRIX
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Matrix Topped Out</div>
          <div className="text-sm text-slate-300 mb-4">
            Lines: <span className="font-mono text-purple-300 font-bold">{lines}</span> · Score: <span className="font-mono text-cyan-300 font-bold">{score}</span>
          </div>
          <button
            onClick={() => startRef.current()}
            className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            CLEAR MATRIX &amp; RETRY
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-emerald-400 mb-1 tracking-tight">Prism Matrix Complete</div>
          <div className="text-sm text-slate-300 mb-4">
            {MAX_LINES} lines · Score: <span className="font-mono text-emerald-300 font-bold">{score}</span>
          </div>
          <button
            onClick={() => startRef.current()}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            STACK AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
