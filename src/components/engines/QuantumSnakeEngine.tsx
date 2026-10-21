import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface QuantumSnakeEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

interface Point {
  x: number;
  y: number;
}

export const QuantumSnakeEngine: React.FC<QuantumSnakeEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');

  const GRID_SIZE = 16;
  const snakeRef = useRef<Point[]>([
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 },
  ]);
  const dirRef = useRef<Point>({ x: 1, y: 0 });
  const nextDirRef = useRef<Point>({ x: 1, y: 0 });
  const foodRef = useRef<Point>({ x: 12, y: 8 });
  const scoreRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');
  stateRef.current = gameState;

  const spawnFood = () => {
    let valid = false;
    let fx = 0;
    let fy = 0;
    while (!valid) {
      fx = Math.floor(Math.random() * GRID_SIZE);
      fy = Math.floor(Math.random() * GRID_SIZE);
      valid = !snakeRef.current.some((seg) => seg.x === fx && seg.y === fy);
    }
    foodRef.current = { x: fx, y: fy };
  };

  const startGame = useCallback(() => {
    snakeRef.current = [
      { x: 8, y: 8 },
      { x: 7, y: 8 },
      { x: 6, y: 8 },
    ];
    dirRef.current = { x: 1, y: 0 };
    nextDirRef.current = { x: 1, y: 0 };
    scoreRef.current = 0;
    setScore(0);
    spawnFood();
    stateRef.current = 'PLAYING';
    setGameState('PLAYING');
    audio.playClick();
  }, []);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const cur = dirRef.current;
      if ((e.code === 'ArrowUp' || e.code === 'KeyW') && cur.y === 0) {
        e.preventDefault();
        nextDirRef.current = { x: 0, y: -1 };
      } else if ((e.code === 'ArrowDown' || e.code === 'KeyS') && cur.y === 0) {
        e.preventDefault();
        nextDirRef.current = { x: 0, y: 1 };
      } else if ((e.code === 'ArrowLeft' || e.code === 'KeyA') && cur.x === 0) {
        e.preventDefault();
        nextDirRef.current = { x: -1, y: 0 };
      } else if ((e.code === 'ArrowRight' || e.code === 'KeyD') && cur.x === 0) {
        e.preventDefault();
        nextDirRef.current = { x: 1, y: 0 };
      } else if (e.code === 'Space' && stateRef.current !== 'PLAYING') {
        e.preventDefault();
        startGame();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [startGame]);

  // Game tick interval
  useEffect(() => {
    let tickCount = 0;
    const interval = setInterval(() => {
      if (isPaused || stateRef.current !== 'PLAYING') return;

      tickCount++;
      dirRef.current = nextDirRef.current;
      const head = snakeRef.current[0];
      const newHead: Point = {
        x: head.x + dirRef.current.x,
        y: head.y + dirRef.current.y,
      };

      // Wall collision
      if (
        newHead.x < 0 ||
        newHead.x >= GRID_SIZE ||
        newHead.y < 0 ||
        newHead.y >= GRID_SIZE
      ) {
        audio.playHit();
        stateRef.current = 'GAMEOVER';
        setGameState('GAMEOVER');
        onGameOver(scoreRef.current);
        return;
      }

      // Self collision
      if (snakeRef.current.some((seg) => seg.x === newHead.x && seg.y === newHead.y)) {
        audio.playHit();
        stateRef.current = 'GAMEOVER';
        setGameState('GAMEOVER');
        onGameOver(scoreRef.current);
        return;
      }

      snakeRef.current.unshift(newHead);

      // Check food
      if (newHead.x === foodRef.current.x && newHead.y === foodRef.current.y) {
        scoreRef.current += 10;
        setScore(scoreRef.current);
        onScoreUpdate(scoreRef.current);
        audio.playScore();
        spawnFood();
      } else {
        snakeRef.current.pop();
      }
    }, difficulty === 'easy' ? 145 : difficulty === 'hard' ? 75 : 110);

    return () => clearInterval(interval);
  }, [difficulty, isPaused, onGameOver, onScoreUpdate]);

  // Isometric Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    // Isometric projection math
    // Transforms (gridX, gridY) -> screen (x, y)
    const originX = 320;
    const originY = 130;
    const tileW = 28;
    const tileH = 14;

    const toScreen = (gx: number, gy: number, z: number = 0) => {
      const sx = originX + (gx - gy) * (tileW / 2);
      const sy = originY + (gx + gy) * (tileH / 2) - z;
      return { sx, sy };
    };

    const drawIsoCube = (
      gx: number,
      gy: number,
      heightZ: number,
      topColor: string,
      leftColor: string,
      rightColor: string
    ) => {
      const { sx, sy } = toScreen(gx, gy, heightZ);
      const hw = tileW / 2;
      const hh = tileH / 2;

      // Top face
      ctx.fillStyle = topColor;
      ctx.beginPath();
      ctx.moveTo(sx, sy - hh);
      ctx.lineTo(sx + hw, sy);
      ctx.lineTo(sx, sy + hh);
      ctx.lineTo(sx - hw, sy);
      ctx.closePath();
      ctx.fill();

      // Left face
      ctx.fillStyle = leftColor;
      ctx.beginPath();
      ctx.moveTo(sx - hw, sy);
      ctx.lineTo(sx, sy + hh);
      ctx.lineTo(sx, sy + hh + heightZ);
      ctx.lineTo(sx - hw, sy + heightZ);
      ctx.closePath();
      ctx.fill();

      // Right face
      ctx.fillStyle = rightColor;
      ctx.beginPath();
      ctx.moveTo(sx, sy + hh);
      ctx.lineTo(sx + hw, sy);
      ctx.lineTo(sx + hw, sy + heightZ);
      ctx.lineTo(sx, sy + hh + heightZ);
      ctx.closePath();
      ctx.fill();
    };

    const loop = () => {
      t += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Deep space background
      const bgGrad = ctx.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, '#060811');
      bgGrad.addColorStop(1, '#0C111F');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // Draw elevated isometric floor grid
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const { sx, sy } = toScreen(x, y, 0);
          const hw = tileW / 2;
          const hh = tileH / 2;

          ctx.fillStyle = (x + y) % 2 === 0 ? '#111827' : '#0F172A';
          ctx.beginPath();
          ctx.moveTo(sx, sy - hh);
          ctx.lineTo(sx + hw, sy);
          ctx.lineTo(sx, sy + hh);
          ctx.lineTo(sx - hw, sy);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }

      // Draw Grid perimeter elevation edge
      const p1 = toScreen(0, GRID_SIZE, 0);
      const p2 = toScreen(GRID_SIZE, GRID_SIZE, 0);
      ctx.fillStyle = '#090D16';
      ctx.beginPath();
      ctx.moveTo(p1.sx - tileW / 2, p1.sy);
      ctx.lineTo(p2.sx, p2.sy + tileH / 2);
      ctx.lineTo(p2.sx, p2.sy + tileH / 2 + 18);
      ctx.lineTo(p1.sx - tileW / 2, p1.sy + 18);
      ctx.closePath();
      ctx.fill();

      // Render 3D Energy Food Crystal
      const fx = foodRef.current.x;
      const fy = foodRef.current.y;
      const bobZ = 12 + Math.sin(t * 3) * 4;
      drawIsoCube(fx, fy, bobZ, '#F87171', '#DC2626', '#991B1B');

      // Food glow beacon
      const { sx: foodSx, sy: foodSy } = toScreen(fx, fy, bobZ);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)';
      ctx.beginPath();
      ctx.arc(foodSx, foodSy, 18, 0, Math.PI * 2);
      ctx.fill();

      // Render 3D Snake Cubes (from tail to head)
      const snake = snakeRef.current;
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const isHead = i === 0;
        const cubeHeight = isHead ? 16 : 12;

        if (isHead) {
          drawIsoCube(seg.x, seg.y, cubeHeight, '#38BDF8', '#0284C7', '#0369A1');
        } else {
          drawIsoCube(seg.x, seg.y, cubeHeight, '#34D399', '#059669', '#047857');
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [GRID_SIZE]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full h-full block"
      />

      {/* HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Score</span>
          <span className="text-lg font-mono font-bold text-emerald-400 tabular-nums">{score}</span>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
          WASD or Arrow Keys
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Quantum Grid: Snake 2.5D</div>
          <p className="text-sm text-slate-300 mb-5">Navigate the isometric grid and absorb energy crystals</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            INITIALIZE GRID
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Quantum Boundary Breach</div>
          <div className="text-sm text-slate-300 mb-4">
            Final Crystals Harvested: <span className="font-mono text-emerald-300 font-bold">{score}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Replay Session
          </button>
        </div>
      )}
    </div>
  );
};
