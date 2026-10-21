import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface PacMazeEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

interface Point {
  x: number;
  y: number;
}

interface Pellet {
  x: number;
  y: number;
  isPower: boolean;
  eaten: boolean;
}

export const PacMazeEngine: React.FC<PacMazeEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');

  const COLS = 15;
  const ROWS = 13;
  const CELL_SIZE = 36;
  const ORIGIN_X = 50;
  const ORIGIN_Y = 10;

  // 1 = wall, 0 = path
  const MAZE = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1],
    [1, 0, 1, 1, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 1],
    [1, 0, 1, 0, 0, 1, 1, 1, 1, 1, 0, 0, 1, 0, 1],
    [1, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  ];

  const pacmanRef = useRef({
    gridX: 7,
    gridY: 9,
    x: 7 * CELL_SIZE + CELL_SIZE / 2,
    y: 9 * CELL_SIZE + CELL_SIZE / 2,
    dir: { x: 0, y: 0 },
    nextDir: { x: 0, y: 0 },
    mouthAngle: 0.2,
  });

  const ghostRef = useRef({
    gridX: 7,
    gridY: 5,
    x: 7 * CELL_SIZE + CELL_SIZE / 2,
    y: 5 * CELL_SIZE + CELL_SIZE / 2,
    scared: 0,
  });

  const pelletsRef = useRef<Pellet[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');
  stateRef.current = gameState;

  // Initialize Pellets
  const initPellets = () => {
    const list: Pellet[] = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (MAZE[r][c] === 0) {
          const isPower =
            (r === 1 && c === 1) ||
            (r === 1 && c === COLS - 2) ||
            (r === ROWS - 2 && c === 1) ||
            (r === ROWS - 2 && c === COLS - 2);
          list.push({
            x: c,
            y: r,
            isPower,
            eaten: false,
          });
        }
      }
    }
    pelletsRef.current = list;
  };

  const startGame = useCallback(() => {
    initPellets();
    pacmanRef.current = {
      gridX: 7,
      gridY: 9,
      x: 7 * CELL_SIZE + CELL_SIZE / 2,
      y: 9 * CELL_SIZE + CELL_SIZE / 2,
      dir: { x: 0, y: 0 },
      nextDir: { x: 1, y: 0 },
      mouthAngle: 0.2,
    };
    ghostRef.current = {
      gridX: 7,
      gridY: 5,
      x: 7 * CELL_SIZE + CELL_SIZE / 2,
      y: 5 * CELL_SIZE + CELL_SIZE / 2,
      scared: 0,
    };
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setGameState('PLAYING');
    stateRef.current = 'PLAYING';
    audio.playClick();
  }, []);

  // Controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (stateRef.current !== 'PLAYING') {
        if (e.code === 'Space') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        pacmanRef.current.nextDir = { x: 0, y: -1 };
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        pacmanRef.current.nextDir = { x: 0, y: 1 };
      } else if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        pacmanRef.current.nextDir = { x: -1, y: 0 };
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        pacmanRef.current.nextDir = { x: 1, y: 0 };
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [startGame]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    // Difficulty Speed Modifiers
    const speedMult = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.3 : 1.0;
    const pacSpeed = 2.4 * speedMult;
    const ghostSpeed = (1.8 + (difficulty === 'hard' ? 0.5 : 0)) * speedMult;

    const loop = () => {
      if (isPaused) {
        animId = requestAnimationFrame(loop);
        return;
      }

      t += 0.05;
      const width = canvas.width;
      const height = canvas.height;

      // UPDATE
      if (stateRef.current === 'PLAYING') {
        const pac = pacmanRef.current;
        const ghost = ghostRef.current;

        // Try apply nextDir if aligned with cell
        const curCellX = Math.floor(pac.x / CELL_SIZE);
        const curCellY = Math.floor(pac.y / CELL_SIZE);
        const cellCenterX = curCellX * CELL_SIZE + CELL_SIZE / 2;
        const cellCenterY = curCellY * CELL_SIZE + CELL_SIZE / 2;

        if (Math.hypot(pac.x - cellCenterX, pac.y - cellCenterY) < 3.5) {
          const nextTargetX = curCellX + pac.nextDir.x;
          const nextTargetY = curCellY + pac.nextDir.y;
          if (
            nextTargetX >= 0 &&
            nextTargetX < COLS &&
            nextTargetY >= 0 &&
            nextTargetY < ROWS &&
            MAZE[nextTargetY][nextTargetX] === 0
          ) {
            pac.dir = pac.nextDir;
            pac.x = cellCenterX;
            pac.y = cellCenterY;
          }
        }

        // Move Pac-Man if no wall ahead
        const targetX = curCellX + pac.dir.x;
        const targetY = curCellY + pac.dir.y;
        const canMove =
          targetX >= 0 && targetX < COLS && targetY >= 0 && targetY < ROWS
            ? MAZE[targetY][targetX] === 0 || Math.hypot(pac.x - cellCenterX, pac.y - cellCenterY) > 2
            : false;

        if (canMove || Math.hypot(pac.x - cellCenterX, pac.y - cellCenterY) > 2) {
          pac.x += pac.dir.x * pacSpeed;
          pac.y += pac.dir.y * pacSpeed;
        }

        // Chomp animation
        pac.mouthAngle = 0.2 + Math.abs(Math.sin(t * 8)) * 0.45;

        // Eat pellets
        pelletsRef.current.forEach((pellet) => {
          if (!pellet.eaten) {
            const px = pellet.x * CELL_SIZE + CELL_SIZE / 2;
            const py = pellet.y * CELL_SIZE + CELL_SIZE / 2;
            if (Math.hypot(pac.x - px, pac.y - py) < 14) {
              pellet.eaten = true;
              scoreRef.current += pellet.isPower ? 50 : 10;
              setScore(scoreRef.current);
              onScoreUpdate(scoreRef.current);
              audio.playClick();
              if (pellet.isPower) {
                ghost.scared = 280; // 5 seconds
                audio.playScore();
              }
            }
          }
        });

        // Check victory
        if (pelletsRef.current.every((p) => p.eaten)) {
          stateRef.current = 'VICTORY';
          setGameState('VICTORY');
          audio.playScore();
          onGameOver(scoreRef.current + 500);
        }

        // Ghost AI
        if (ghost.scared > 0) ghost.scared--;
        const ghostTargetX = ghost.scared > 0 ? (pac.x > width / 2 ? 0 : width) : pac.x;
        const ghostTargetY = ghost.scared > 0 ? (pac.y > height / 2 ? 0 : height) : pac.y;

        const gAngle = Math.atan2(ghostTargetY - ghost.y, ghostTargetX - ghost.x);
        ghost.x += Math.cos(gAngle) * (ghost.scared > 0 ? ghostSpeed * 0.6 : ghostSpeed);
        ghost.y += Math.sin(gAngle) * (ghost.scared > 0 ? ghostSpeed * 0.6 : ghostSpeed);

        // Collision with Ghost
        if (Math.hypot(pac.x - ghost.x, pac.y - ghost.y) < 18) {
          if (ghost.scared > 0) {
            // Eat ghost
            audio.playScore();
            scoreRef.current += 200;
            setScore(scoreRef.current);
            onScoreUpdate(scoreRef.current);
            ghost.x = 7 * CELL_SIZE + CELL_SIZE / 2;
            ghost.y = 5 * CELL_SIZE + CELL_SIZE / 2;
            ghost.scared = 0;
          } else {
            // Player loses life
            audio.playHit();
            livesRef.current--;
            setLives(livesRef.current);
            pac.x = 7 * CELL_SIZE + CELL_SIZE / 2;
            pac.y = 9 * CELL_SIZE + CELL_SIZE / 2;
            pac.dir = { x: 0, y: 0 };
            ghost.x = 7 * CELL_SIZE + CELL_SIZE / 2;
            ghost.y = 5 * CELL_SIZE + CELL_SIZE / 2;
            if (livesRef.current <= 0) {
              stateRef.current = 'GAMEOVER';
              setGameState('GAMEOVER');
              onGameOver(scoreRef.current);
            }
          }
        }
      }

      // RENDER 2.5D MAZE
      ctx.clearRect(0, 0, width, height);

      // Deep obsidian backdrop
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.translate(ORIGIN_X, ORIGIN_Y);

      // Render 3D Walls with beveled depth
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          if (MAZE[r][c] === 1) {
            const wx = c * CELL_SIZE;
            const wy = r * CELL_SIZE;

            // Wall Shadow
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
            ctx.fillRect(wx + 3, wy + 5, CELL_SIZE, CELL_SIZE);

            // Wall Top
            ctx.fillStyle = '#1E3A8A';
            ctx.fillRect(wx, wy, CELL_SIZE - 2, CELL_SIZE - 2);

            // 3D Neon Lip
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(wx, wy, CELL_SIZE - 2, CELL_SIZE - 2);
          }
        }
      }

      // Render Pellets
      pelletsRef.current.forEach((pellet) => {
        if (!pellet.eaten) {
          const px = pellet.x * CELL_SIZE + CELL_SIZE / 2;
          const py = pellet.y * CELL_SIZE + CELL_SIZE / 2;

          if (pellet.isPower) {
            ctx.fillStyle = '#FACC15';
            ctx.shadowColor = '#FACC15';
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(px, py, 6 + Math.sin(t * 5) * 1.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
          } else {
            ctx.fillStyle = '#FED7AA';
            ctx.beginPath();
            ctx.arc(px, py, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      // Render 3D Ghost (Blinky / Scared)
      const ghost = ghostRef.current;
      const isScared = ghost.scared > 0;
      ctx.fillStyle = isScared ? '#38BDF8' : '#EF4444';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y - 3, 11, Math.PI, 0);
      ctx.lineTo(ghost.x + 11, ghost.y + 10);
      // Ghost skirt
      ctx.lineTo(ghost.x + 5, ghost.y + 6);
      ctx.lineTo(ghost.x, ghost.y + 10);
      ctx.lineTo(ghost.x - 5, ghost.y + 6);
      ctx.lineTo(ghost.x - 11, ghost.y + 10);
      ctx.closePath();
      ctx.fill();

      // Ghost eyes
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ghost.x - 4, ghost.y - 3, 3, 0, Math.PI * 2);
      ctx.arc(ghost.x + 4, ghost.y - 3, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.arc(ghost.x - 4, ghost.y - 3, 1.5, 0, Math.PI * 2);
      ctx.arc(ghost.x + 4, ghost.y - 3, 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Render 3D Spherical Pac-Man
      const pac = pacmanRef.current;
      let rot = 0;
      if (pac.dir.x === 1) rot = 0;
      else if (pac.dir.x === -1) rot = Math.PI;
      else if (pac.dir.y === 1) rot = Math.PI / 2;
      else if (pac.dir.y === -1) rot = -Math.PI / 2;

      ctx.save();
      ctx.translate(pac.x, pac.y);
      ctx.rotate(rot);

      // Pac-Man 3D radial sphere
      const pacGrad = ctx.createRadialGradient(-3, -3, 2, 0, 0, 12);
      pacGrad.addColorStop(0, '#FEF08A');
      pacGrad.addColorStop(0.7, '#FACC15');
      pacGrad.addColorStop(1, '#CA8A04');
      ctx.fillStyle = pacGrad;
      ctx.shadowColor = '#FACC15';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.arc(0, 0, 12, pac.mouthAngle, Math.PI * 2 - pac.mouthAngle);
      ctx.lineTo(0, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.restore();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, isPaused, onGameOver, onScoreUpdate]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      {/* In-Game HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Score</span>
          <span className="text-lg font-mono font-bold text-yellow-400 tabular-nums">{score}</span>
        </div>
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Lives</span>
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full ${
                  i < lives ? 'bg-yellow-400 shadow-[0_0_8px_#facc15]' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Pac-Maze 2.5D</div>
          <p className="text-sm text-slate-300 mb-5">WASD or Arrow Keys to maneuver maze and chomp pellets</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            START PAC-MAZE
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Ghost Caught You</div>
          <div className="text-sm text-slate-300 mb-4">
            Dots Score: <span className="font-mono text-yellow-300 font-bold">{score}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Try Again
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-emerald-400 mb-1 tracking-tight">Maze Cleared!</div>
          <div className="text-sm text-slate-300 mb-4">
            Perfect Run Score: <span className="font-mono text-emerald-300 font-bold">{score}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Play Next Sector
          </button>
        </div>
      )}
    </div>
  );
};
