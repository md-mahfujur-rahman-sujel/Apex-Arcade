import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface PrecisionPlatformerEngineProps {
  variant?: string; // 'celeste' | 'mario' | 'mario-world' | 'rayman' | 'ori'
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
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

export const PrecisionPlatformerEngine: React.FC<PrecisionPlatformerEngineProps> = ({
  variant = 'celeste',
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [collectibles, setCollectibles] = useState(0);
  const [deaths, setDeaths] = useState(0);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'VICTORY'>('READY');

  const themeConfig = {
    title:
      variant === 'mario'
        ? 'Super Mario Kingdom 2.5D'
        : variant === 'mario-world'
        ? 'Dinosaur Land Cape Flight 2.5D'
        : variant === 'rayman'
        ? 'Rayman Rhythm Glide 2.5D'
        : variant === 'ori'
        ? 'Nibel Spirit Restorer 2.5D'
        : 'Ascent 2.5D (Celeste Mountain)',
    collectibleName:
      variant === 'mario' || variant === 'mario-world'
        ? 'Gold Coins'
        : variant === 'rayman'
        ? 'Lums'
        : variant === 'ori'
        ? 'Light Orbs'
        : 'Strawberries',
    collectibleColor:
      variant === 'mario' || variant === 'mario-world' || variant === 'rayman'
        ? '#FACC15'
        : variant === 'ori'
        ? '#38BDF8'
        : '#F43F5E',
    heroColor:
      variant === 'mario' || variant === 'mario-world'
        ? '#EF4444'
        : variant === 'rayman'
        ? '#EC4899'
        : variant === 'ori'
        ? '#E0F2FE'
        : '#0284C7',
    dashLabel:
      variant === 'mario'
        ? 'Shift: Super Sprint'
        : variant === 'mario-world'
        ? 'Shift: Cape Spin'
        : variant === 'rayman'
        ? 'Shift: Hair Glide'
        : variant === 'ori'
        ? 'Shift: Spirit Dash'
        : 'Shift: Air Dash',
  };

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
  });

  const cameraXRef = useRef(0);
  const platformsRef = useRef<Platform[]>([]);
  const gemsRef = useRef<Gem[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const scoreRef = useRef(0);
  const deathsRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'VICTORY'>('READY');
  stateRef.current = gameState;

  const initLevel = () => {
    platformsRef.current = [
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
    ];

    gemsRef.current = [
      { x: 430, y: 330, collected: false },
      { x: 565, y: 270, collected: false },
      { x: 720, y: 230, collected: false },
      { x: 915, y: 180, collected: false },
      { x: 1070, y: 140, collected: false },
      { x: 1220, y: 100, collected: false },
      { x: 1440, y: 80, collected: false },
    ];
  };

  const respawn = () => {
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
  };

  const startGame = useCallback(() => {
    initLevel();
    playerRef.current = {
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
    };
    cameraXRef.current = 0;
    scoreRef.current = 0;
    deathsRef.current = 0;
    setCollectibles(0);
    setDeaths(0);
    stateRef.current = 'PLAYING';
    setGameState('PLAYING');
    audio.playClick();
  }, []);

  const jump = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    const p = playerRef.current;
    if (p.grounded) {
      p.vy = -8.8;
      p.grounded = false;
      audio.playJump();
    } else if (p.onWall !== 0) {
      p.vy = -8.2;
      p.vx = -p.onWall * 6.5;
      p.facing = -p.onWall;
      p.hasDash = true;
      audio.playJump();
    }
  }, []);

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
        dash();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };

    const interval = setInterval(() => {
      if (stateRef.current !== 'PLAYING') return;
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
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [dash, difficulty, jump, startGame]);

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
        const p = playerRef.current;

        if (p.dashTimer > 0) {
          p.dashTimer--;
          p.x += p.vx;
        } else {
          p.vy += 0.42;
          if (p.onWall !== 0 && p.vy > 1.8) {
            p.vy = 1.8;
          }
          p.x += p.vx;
          p.y += p.vy;
        }

        const targetCamX = p.x - width * 0.35;
        cameraXRef.current += (targetCamX - cameraXRef.current) * 0.1;
        cameraXRef.current = Math.max(0, Math.min(1000, cameraXRef.current));

        p.grounded = false;
        p.onWall = 0;

        for (const plat of platformsRef.current) {
          if (plat.isSpike) {
            if (
              p.x + p.w > plat.x &&
              p.x < plat.x + plat.w &&
              p.y + p.h > plat.y &&
              p.y < plat.y + plat.h
            ) {
              respawn();
              return;
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

        if (p.x >= 1400) {
          stateRef.current = 'VICTORY';
          setGameState('VICTORY');
          audio.playScore();
          onGameOver(scoreRef.current + 500);
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
      skyGrad.addColorStop(0, '#040714');
      skyGrad.addColorStop(0.6, '#0B1528');
      skyGrad.addColorStop(1, '#1A1832');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // Mountain / Hill Peaks Parallax
      ctx.fillStyle = 'rgba(15, 23, 42, 0.6)';
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

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, onGameOver, onScoreUpdate, themeConfig.collectibleColor, themeConfig.heroColor]);

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
              {collectibles} / 7 {themeConfig.collectibleName}
            </span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-xs text-slate-400">
            Deaths: <span className="font-mono text-amber-400">{deaths}</span>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
          A/D: Move · Space: Jump · {themeConfig.dashLabel}
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">{themeConfig.title}</div>
          <p className="text-sm text-slate-300 mb-5">Wall-jump, air dash, and scale the peak</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            START STAGE
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-emerald-400 mb-1 tracking-tight">Stage Complete!</div>
          <div className="text-sm text-slate-300 mb-4">
            Items Collected: <span className="font-mono text-cyan-300 font-bold">{collectibles}/7</span> · Deaths: <span className="font-mono text-amber-300">{deaths}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
