import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface IsoTetrisEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

const COLS = 10;
const ROWS = 20;

// Standard Tetromino shapes
const SHAPES: Record<string, { matrix: number[][]; color: string; sideColor: string }> = {
  I: {
    matrix: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
    color: '#06B6D4',
    sideColor: '#0891B2',
  },
  J: {
    matrix: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#3B82F6',
    sideColor: '#2563EB',
  },
  L: {
    matrix: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#F97316',
    sideColor: '#EA580C',
  },
  O: {
    matrix: [
      [1, 1],
      [1, 1],
    ],
    color: '#FACC15',
    sideColor: '#CA8A04',
  },
  S: {
    matrix: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0],
    ],
    color: '#10B981',
    sideColor: '#059669',
  },
  T: {
    matrix: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0],
    ],
    color: '#A855F7',
    sideColor: '#9333EA',
  },
  Z: {
    matrix: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0],
    ],
    color: '#EF4444',
    sideColor: '#DC2626',
  },
};

export const IsoTetrisEngine: React.FC<IsoTetrisEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');

  const boardRef = useRef<(string | null)[][]>(
    Array.from({ length: ROWS }, () => Array(COLS).fill(null))
  );

  const currentPieceRef = useRef<{
    shapeKey: string;
    matrix: number[][];
    x: number;
    y: number;
  }>({
    shapeKey: 'T',
    matrix: SHAPES.T.matrix,
    x: 3,
    y: 0,
  });

  const scoreRef = useRef(0);
  const linesRef = useRef(0);
  const levelRef = useRef(1);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');
  stateRef.current = gameState;

  const getRandomPiece = () => {
    const keys = Object.keys(SHAPES);
    const shapeKey = keys[Math.floor(Math.random() * keys.length)];
    return {
      shapeKey,
      matrix: SHAPES[shapeKey].matrix.map((row) => [...row]),
      x: Math.floor((COLS - SHAPES[shapeKey].matrix[0].length) / 2),
      y: 0,
    };
  };

  const collides = (matrix: number[][], offset: { x: number; y: number }): boolean => {
    const board = boardRef.current;
    for (let r = 0; r < matrix.length; r++) {
      for (let c = 0; c < matrix[r].length; c++) {
        if (matrix[r][c] !== 0) {
          const newX = offset.x + c;
          const newY = offset.y + r;
          if (newX < 0 || newX >= COLS || newY >= ROWS) return true;
          if (newY >= 0 && board[newY][newX] !== null) return true;
        }
      }
    }
    return false;
  };

  const rotate = (matrix: number[][]): number[][] => {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result: number[][] = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        result[c][rows - 1 - r] = matrix[r][c];
      }
    }
    return result;
  };

  const lockPiece = () => {
    const piece = currentPieceRef.current;
    const board = boardRef.current;
    for (let r = 0; r < piece.matrix.length; r++) {
      for (let c = 0; c < piece.matrix[r].length; c++) {
        if (piece.matrix[r][c] !== 0) {
          const boardY = piece.y + r;
          const boardX = piece.x + c;
          if (boardY < 0) {
            // Game Over
            stateRef.current = 'GAMEOVER';
            setGameState('GAMEOVER');
            audio.playHit();
            onGameOver(scoreRef.current);
            return;
          }
          board[boardY][boardX] = piece.shapeKey;
        }
      }
    }

    // Check line clears
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every((cell) => cell !== null)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // Re-check row index
      }
    }

    if (cleared > 0) {
      audio.playScore();
      const points = [0, 100, 300, 500, 800][cleared] * levelRef.current;
      scoreRef.current += points;
      linesRef.current += cleared;
      levelRef.current = Math.floor(linesRef.current / 10) + 1;
      setScore(scoreRef.current);
      setLines(linesRef.current);
      setLevel(levelRef.current);
      onScoreUpdate(scoreRef.current);
    } else {
      audio.playClick();
    }

    // Spawn next piece
    currentPieceRef.current = getRandomPiece();
    if (collides(currentPieceRef.current.matrix, { x: currentPieceRef.current.x, y: currentPieceRef.current.y })) {
      stateRef.current = 'GAMEOVER';
      setGameState('GAMEOVER');
      audio.playHit();
      onGameOver(scoreRef.current);
    }
  };

  const moveLeft = () => {
    const piece = currentPieceRef.current;
    if (!collides(piece.matrix, { x: piece.x - 1, y: piece.y })) {
      piece.x -= 1;
      audio.playClick();
    }
  };

  const moveRight = () => {
    const piece = currentPieceRef.current;
    if (!collides(piece.matrix, { x: piece.x + 1, y: piece.y })) {
      piece.x += 1;
      audio.playClick();
    }
  };

  const drop = () => {
    const piece = currentPieceRef.current;
    if (!collides(piece.matrix, { x: piece.x, y: piece.y + 1 })) {
      piece.y += 1;
    } else {
      lockPiece();
    }
  };

  const hardDrop = () => {
    const piece = currentPieceRef.current;
    while (!collides(piece.matrix, { x: piece.x, y: piece.y + 1 })) {
      piece.y += 1;
      scoreRef.current += 2;
    }
    setScore(scoreRef.current);
    lockPiece();
  };

  const tryRotate = () => {
    const piece = currentPieceRef.current;
    const rotated = rotate(piece.matrix);
    if (!collides(rotated, { x: piece.x, y: piece.y })) {
      piece.matrix = rotated;
      audio.playClick();
    } else if (!collides(rotated, { x: piece.x - 1, y: piece.y })) {
      // Wall kick left
      piece.matrix = rotated;
      piece.x -= 1;
      audio.playClick();
    } else if (!collides(rotated, { x: piece.x + 1, y: piece.y })) {
      // Wall kick right
      piece.matrix = rotated;
      piece.x += 1;
      audio.playClick();
    }
  };

  const startGame = useCallback(() => {
    boardRef.current = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    currentPieceRef.current = getRandomPiece();
    scoreRef.current = 0;
    linesRef.current = 0;
    levelRef.current = 1;
    setScore(0);
    setLines(0);
    setLevel(1);
    stateRef.current = 'PLAYING';
    setGameState('PLAYING');
    audio.playClick();
  }, []);

  // Controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (stateRef.current !== 'PLAYING') {
        if (e.code === 'Space') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        moveLeft();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        moveRight();
      } else if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        drop();
      } else if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        tryRotate();
      } else if (e.code === 'Space') {
        e.preventDefault();
        hardDrop();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startGame]);

  // Gravity Drop Interval
  useEffect(() => {
    const baseDrop = difficulty === 'hard' ? 440 : difficulty === 'easy' ? 760 : 600;
    const speed = Math.max(80, baseDrop - (level - 1) * 45);
    const interval = setInterval(() => {
      if (isPaused || stateRef.current !== 'PLAYING') return;
      drop();
    }, speed);

    return () => clearInterval(interval);
  }, [difficulty, isPaused, level]);

  // Isometric Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const blockSize = 20;
    const startX = 220;
    const startY = 35;

    const drawIsoBlock = (bx: number, by: number, color: string, sideColor: string) => {
      const px = startX + bx * blockSize;
      const py = startY + by * blockSize;

      // Front face
      ctx.fillStyle = color;
      ctx.fillRect(px, py, blockSize - 1, blockSize - 1);

      // 3D Top bevel
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px + blockSize - 1, py);
      ctx.lineTo(px + blockSize - 4, py + 3);
      ctx.lineTo(px + 3, py + 3);
      ctx.closePath();
      ctx.fill();

      // 3D Right bevel
      ctx.fillStyle = sideColor;
      ctx.beginPath();
      ctx.moveTo(px + blockSize - 1, py);
      ctx.lineTo(px + blockSize - 1, py + blockSize - 1);
      ctx.lineTo(px + blockSize - 4, py + blockSize - 4);
      ctx.lineTo(px + blockSize - 4, py + 3);
      ctx.closePath();
      ctx.fill();
    };

    const loop = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Deep cyber background
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, width, height);

      // Playfield Border Frame
      ctx.strokeStyle = 'rgba(168, 85, 247, 0.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(startX - 2, startY - 2, COLS * blockSize + 4, ROWS * blockSize + 4);

      // Subtle Grid
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      for (let c = 0; c <= COLS; c++) {
        ctx.beginPath();
        ctx.moveTo(startX + c * blockSize, startY);
        ctx.lineTo(startX + c * blockSize, startY + ROWS * blockSize);
        ctx.stroke();
      }
      for (let r = 0; r <= ROWS; r++) {
        ctx.beginPath();
        ctx.moveTo(startX, startY + r * blockSize);
        ctx.lineTo(startX + COLS * blockSize, startY + r * blockSize);
        ctx.stroke();
      }

      // Render Locked Board Blocks
      const board = boardRef.current;
      for (let r = 0; r < ROWS; r++) {
        for (let c = 0; c < COLS; c++) {
          const key = board[r][c];
          if (key && SHAPES[key]) {
            drawIsoBlock(c, r, SHAPES[key].color, SHAPES[key].sideColor);
          }
        }
      }

      // Render Active Piece
      if (stateRef.current === 'PLAYING') {
        const piece = currentPieceRef.current;
        const info = SHAPES[piece.shapeKey];
        if (info) {
          for (let r = 0; r < piece.matrix.length; r++) {
            for (let c = 0; c < piece.matrix[r].length; c++) {
              if (piece.matrix[r][c] !== 0) {
                drawIsoBlock(piece.x + c, piece.y + r, info.color, info.sideColor);
              }
            }
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      {/* Side Stats HUD */}
      <div className="absolute top-8 left-8 flex flex-col gap-4 pointer-events-none">
        <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10">
          <div className="text-[10px] text-slate-400 uppercase">Score</div>
          <div className="text-xl font-mono font-bold text-purple-400 tabular-nums">{score}</div>
        </div>
        <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10">
          <div className="text-[10px] text-slate-400 uppercase">Lines</div>
          <div className="text-lg font-mono font-bold text-white tabular-nums">{lines}</div>
        </div>
        <div className="bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10">
          <div className="text-[10px] text-slate-400 uppercase">Level</div>
          <div className="text-lg font-mono font-bold text-cyan-400 tabular-nums">{level}</div>
        </div>
      </div>

      <div className="absolute top-8 right-8 bg-black/60 backdrop-blur-md px-3 py-2 rounded-lg border border-white/10 text-xs text-slate-400 space-y-1 pointer-events-none">
        <div>A/D : Move</div>
        <div>W : Rotate</div>
        <div>S : Soft Drop</div>
        <div>Space : Hard Drop</div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Iso-Tetris 3D</div>
          <p className="text-sm text-slate-300 mb-5">Arrange falling tetromino blocks and vaporize lines</p>
          <button
            onClick={startGame}
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
            Lines Vaporized: <span className="font-mono text-purple-300 font-bold">{lines}</span> (Score: {score})
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-purple-500 hover:bg-purple-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Clear Matrix &amp; Retry
          </button>
        </div>
      )}
    </div>
  );
};
