import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface SpaceInvadersEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

interface Alien {
  x: number;
  y: number;
  row: number;
  col: number;
  alive: boolean;
  color: string;
}

interface Bullet {
  x: number;
  y: number;
  vy: number;
  isEnemy: boolean;
}

interface Bunker {
  x: number;
  y: number;
  health: number;
}

export const SpaceInvadersEngine: React.FC<SpaceInvadersEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');

  const playerRef = useRef({ x: 320, vx: 0 });
  const aliensRef = useRef<Alien[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const bunkersRef = useRef<Bunker[]>([]);
  const ufoRef = useRef<{ x: number; y: number; active: boolean; dir: number }>({
    x: -50,
    y: 40,
    active: false,
    dir: 1,
  });

  const alienMarchDirRef = useRef(1);
  const alienStepTimerRef = useRef(0);
  const alienSpeedRef = useRef(40);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');
  stateRef.current = gameState;

  const initAliens = () => {
    const list: Alien[] = [];
    const rows = 4;
    const cols = 8;
    const colors = ['#F43F5E', '#FB7185', '#06B6D4', '#10B981'];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        list.push({
          x: 100 + c * 52,
          y: 75 + r * 38,
          row: r,
          col: c,
          alive: true,
          color: colors[r],
        });
      }
    }
    aliensRef.current = list;
    alienMarchDirRef.current = 1;
    alienSpeedRef.current = difficulty === 'hard' ? 28 : difficulty === 'easy' ? 48 : 38;
  };

  const initBunkers = () => {
    bunkersRef.current = [
      { x: 120, y: 380, health: 6 },
      { x: 260, y: 380, health: 6 },
      { x: 400, y: 380, health: 6 },
      { x: 540, y: 380, health: 6 },
    ];
  };

  const startGame = useCallback(() => {
    initAliens();
    initBunkers();
    playerRef.current = { x: 320, vx: 0 };
    bulletsRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    setGameState('PLAYING');
    stateRef.current = 'PLAYING';
    audio.playClick();
  }, []);

  const shoot = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    // Limit player bullets
    const playerBullets = bulletsRef.current.filter((b) => !b.isEnemy);
    if (playerBullets.length < 2) {
      bulletsRef.current.push({
        x: playerRef.current.x,
        y: 440,
        vy: -7.5,
        isEnemy: false,
      });
      audio.playLaser();
    }
  }, []);

  // Controls
  useEffect(() => {
    const keys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isPaused) return;
      keys.add(e.code);
      if (e.code === 'Space') {
        e.preventDefault();
        if (stateRef.current === 'PLAYING') {
          shoot();
        } else {
          startGame();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };

    const interval = setInterval(() => {
      if (isPaused || stateRef.current !== 'PLAYING') return;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        playerRef.current.x = Math.max(25, playerRef.current.x - 5.5);
      }
      if (keys.has('KeyD') || keys.has('ArrowRight')) {
        playerRef.current.x = Math.min(615, playerRef.current.x + 5.5);
      }
    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused, shoot, startGame]);

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

      // UPDATE
      if (stateRef.current === 'PLAYING') {
        alienStepTimerRef.current++;

        // March aliens
        if (alienStepTimerRef.current >= alienSpeedRef.current) {
          alienStepTimerRef.current = 0;
          let shiftDown = false;

          const livingAliens = aliensRef.current.filter((a) => a.alive);
          if (livingAliens.length === 0) {
            stateRef.current = 'VICTORY';
            setGameState('VICTORY');
            audio.playScore();
            onGameOver(scoreRef.current + 500);
            return;
          }

          // Acceleration based on remaining aliens
          alienSpeedRef.current = Math.max(6, Math.floor(livingAliens.length * 1.1));

          // Check horizontal bounds
          for (const a of livingAliens) {
            if (
              (alienMarchDirRef.current === 1 && a.x > width - 40) ||
              (alienMarchDirRef.current === -1 && a.x < 40)
            ) {
              shiftDown = true;
              break;
            }
          }

          if (shiftDown) {
            alienMarchDirRef.current *= -1;
            for (const a of livingAliens) {
              a.y += 18;
              if (a.y >= 390) {
                // Aliens reached base
                stateRef.current = 'GAMEOVER';
                setGameState('GAMEOVER');
                audio.playExplosion();
                onGameOver(scoreRef.current);
                return;
              }
            }
          } else {
            for (const a of livingAliens) {
              a.x += alienMarchDirRef.current * 14;
            }
          }

          // Random enemy fire
          const fireChance = difficulty === 'hard' ? 0.65 : difficulty === 'easy' ? 0.28 : 0.45;
          if (Math.random() < fireChance && livingAliens.length > 0) {
            const shooter = livingAliens[Math.floor(Math.random() * livingAliens.length)];
            bulletsRef.current.push({
              x: shooter.x,
              y: shooter.y + 14,
              vy: difficulty === 'hard' ? 5.5 : 4.5,
              isEnemy: true,
            });
          }
        }

        // UFO flyby
        const ufo = ufoRef.current;
        if (!ufo.active && Math.random() < 0.002) {
          ufo.active = true;
          ufo.dir = Math.random() > 0.5 ? 1 : -1;
          ufo.x = ufo.dir === 1 ? -40 : width + 40;
        }
        if (ufo.active) {
          ufo.x += ufo.dir * 3;
          if (ufo.x < -60 || ufo.x > width + 60) {
            ufo.active = false;
          }
        }

        // Update Bullets
        for (let b = bulletsRef.current.length - 1; b >= 0; b--) {
          const bullet = bulletsRef.current[b];
          bullet.y += bullet.vy;

          // Check UFO hit
          if (!bullet.isEnemy && ufo.active) {
            if (Math.hypot(bullet.x - ufo.x, bullet.y - ufo.y) < 22) {
              ufo.active = false;
              bulletsRef.current.splice(b, 1);
              scoreRef.current += 200;
              setScore(scoreRef.current);
              onScoreUpdate(scoreRef.current);
              audio.playScore();
              continue;
            }
          }

          // Check Alien hit
          if (!bullet.isEnemy) {
            let hitAlien = false;
            for (const a of aliensRef.current) {
              if (a.alive && Math.abs(bullet.x - a.x) < 18 && Math.abs(bullet.y - a.y) < 14) {
                a.alive = false;
                hitAlien = true;
                scoreRef.current += (4 - a.row) * 15;
                setScore(scoreRef.current);
                onScoreUpdate(scoreRef.current);
                audio.playHit();
                break;
              }
            }
            if (hitAlien) {
              bulletsRef.current.splice(b, 1);
              continue;
            }
          }

          // Check Bunker hit
          let hitBunker = false;
          for (const bunk of bunkersRef.current) {
            if (bunk.health > 0 && Math.abs(bullet.x - bunk.x) < 26 && Math.abs(bullet.y - bunk.y) < 16) {
              bunk.health--;
              hitBunker = true;
              break;
            }
          }
          if (hitBunker) {
            bulletsRef.current.splice(b, 1);
            continue;
          }

          // Check Player hit by enemy bullet
          if (bullet.isEnemy) {
            if (Math.abs(bullet.x - playerRef.current.x) < 18 && bullet.y >= 435 && bullet.y <= 460) {
              bulletsRef.current.splice(b, 1);
              livesRef.current--;
              setLives(livesRef.current);
              audio.playExplosion();
              if (livesRef.current <= 0) {
                stateRef.current = 'GAMEOVER';
                setGameState('GAMEOVER');
                onGameOver(scoreRef.current);
              }
              continue;
            }
          }

          // Remove off-screen
          if (bullet.y < 10 || bullet.y > height) {
            bulletsRef.current.splice(b, 1);
          }
        }
      }

      // RENDER
      ctx.clearRect(0, 0, width, height);

      // 3D Perspective Horizon & Stars
      ctx.fillStyle = '#050711';
      ctx.fillRect(0, 0, width, height);

      // Starfield
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      for (let s = 0; s < 40; s++) {
        const sx = ((s * 73) % width);
        const sy = ((s * 41) % 360);
        ctx.fillRect(sx, sy, 1.5, 1.5);
      }

      // 3D Angled Base Floor
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.2)';
      ctx.lineWidth = 1;
      const floorY = 440;
      for (let fx = 0; fx <= width; fx += 40) {
        ctx.beginPath();
        ctx.moveTo(fx, floorY);
        ctx.lineTo(fx - 20, height);
        ctx.stroke();
      }

      // Render UFO if active
      const ufo = ufoRef.current;
      if (ufo.active) {
        ctx.fillStyle = '#E11D48';
        ctx.shadowColor = '#F43F5E';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.ellipse(ufo.x, ufo.y, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FDA4AF';
        ctx.beginPath();
        ctx.arc(ufo.x, ufo.y - 3, 7, Math.PI, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      // Render Aliens with 3D Depth Cast Shadow
      aliensRef.current.forEach((a) => {
        if (!a.alive) return;

        // Shadow
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.fillRect(a.x - 14, a.y + 6, 28, 16);

        // Alien body (3D extruded look)
        ctx.fillStyle = a.color;
        ctx.shadowColor = a.color;
        ctx.shadowBlur = 6;
        ctx.fillRect(a.x - 14, a.y - 8, 28, 16);
        ctx.shadowBlur = 0;

        // Alien eye slits
        ctx.fillStyle = '#060811';
        ctx.fillRect(a.x - 8, a.y - 4, 4, 5);
        ctx.fillRect(a.x + 4, a.y - 4, 4, 5);

        // Antennae
        ctx.fillStyle = a.color;
        ctx.fillRect(a.x - 10, a.y - 12, 3, 5);
        ctx.fillRect(a.x + 7, a.y - 12, 3, 5);
      });

      // Render Bunkers with health states
      bunkersRef.current.forEach((bunk) => {
        if (bunk.health <= 0) return;
        const alpha = bunk.health / 6;
        ctx.fillStyle = `rgba(34, 197, 94, ${alpha})`;
        ctx.shadowColor = '#22C55E';
        ctx.shadowBlur = 8;
        ctx.fillRect(bunk.x - 22, bunk.y - 14, 44, 28);
        ctx.shadowBlur = 0;

        // Bunk damage texture
        ctx.fillStyle = '#050711';
        if (bunk.health < 5) ctx.fillRect(bunk.x - 10, bunk.y - 6, 6, 6);
        if (bunk.health < 3) ctx.fillRect(bunk.x + 8, bunk.y + 2, 8, 8);
      });

      // Render Bullets
      bulletsRef.current.forEach((b) => {
        ctx.fillStyle = b.isEnemy ? '#F43F5E' : '#38BDF8';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 8;
        ctx.fillRect(b.x - 2, b.y - 6, 4, 12);
        ctx.shadowBlur = 0;
      });

      // Render 3D Laser Cannon (Player)
      const px = playerRef.current.x;
      // Cannon Base
      const tankGrad = ctx.createLinearGradient(px - 18, 0, px + 18, 0);
      tankGrad.addColorStop(0, '#0284C7');
      tankGrad.addColorStop(0.5, '#38BDF8');
      tankGrad.addColorStop(1, '#0369A1');
      ctx.fillStyle = tankGrad;
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 10;
      ctx.fillRect(px - 18, 442, 36, 14);

      // Cannon Turret Barrel
      ctx.fillStyle = '#E0F2FE';
      ctx.fillRect(px - 3, 432, 6, 12);
      ctx.shadowBlur = 0;

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, isPaused, onGameOver, onScoreUpdate]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      {/* In-game HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Score</span>
          <span className="text-lg font-mono font-bold text-cyan-400 tabular-nums">{score}</span>
        </div>
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Shields</span>
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-xs ${
                  i < lives ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Space Invaders 2.5D</div>
          <p className="text-sm text-slate-300 mb-5">A/D or Arrows to steer · Space to discharge laser</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            ENGAGE DEFENSE CANNON
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Defense Perimeter Lost</div>
          <div className="text-sm text-slate-300 mb-4">
            Total Score: <span className="font-mono text-cyan-300 font-bold">{score}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Deploy New Vessel
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-emerald-400 mb-1 tracking-tight">Invasion Repelled!</div>
          <div className="text-sm text-slate-300 mb-4">
            Wave Cleared! Score: <span className="font-mono text-emerald-300 font-bold">{score}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Next Sector
          </button>
        </div>
      )}
    </div>
  );
};
