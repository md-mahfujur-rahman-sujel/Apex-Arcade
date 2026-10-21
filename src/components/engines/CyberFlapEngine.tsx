import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface CyberFlapEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

interface Pipe {
  x: number;
  gapY: number;
  passed: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export const CyberFlapEngine: React.FC<CyberFlapEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');
  const [currentScore, setCurrentScore] = useState(0);

  // Mutable game physics refs
  const birdRef = useRef({
    x: 100,
    y: 200,
    vy: 0,
    radius: 14,
    rotation: 0,
  });

  const pipesRef = useRef<Pipe[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef(0);
  const scoreRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');
  stateRef.current = gameState;

  const flap = useCallback(() => {
    if (stateRef.current === 'READY') {
      stateRef.current = 'PLAYING';
      setGameState('PLAYING');
      birdRef.current.vy = -6.5;
      audio.playJump();
      return;
    }

    if (stateRef.current === 'PLAYING') {
      birdRef.current.vy = -6.5;
      audio.playJump();

      // Emit wing thrust particle
      for (let i = 0; i < 6; i++) {
        particlesRef.current.push({
          x: birdRef.current.x - 8,
          y: birdRef.current.y + 4,
          vx: -2 - Math.random() * 2,
          vy: (Math.random() - 0.5) * 3,
          life: 1,
          maxLife: 15,
          color: '#38BDF8',
        });
      }
    } else if (stateRef.current === 'GAMEOVER') {
      // Reset
      resetGame();
    }
  }, []);

  const resetGame = () => {
    birdRef.current = {
      x: 100,
      y: 200,
      vy: 0,
      radius: 14,
      rotation: 0,
    };
    pipesRef.current = [];
    particlesRef.current = [];
    frameCountRef.current = 0;
    scoreRef.current = 0;
    setCurrentScore(0);
    onScoreUpdate(0);
    stateRef.current = 'READY';
    setGameState('READY');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        flap();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flap]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    const GAP_SIZE = difficulty === 'easy' ? 145 : difficulty === 'hard' ? 105 : 125;
    const PIPE_SPEED = difficulty === 'easy' ? 2.0 : difficulty === 'hard' ? 3.0 : 2.4;
    const PIPE_WIDTH = 54;

    const loop = () => {
      if (isPaused) {
        animId = requestAnimationFrame(loop);
        return;
      }

      const width = canvas.width;
      const height = canvas.height;
      frameCountRef.current++;

      // UPDATE
      if (stateRef.current === 'PLAYING') {
        const bird = birdRef.current;
        bird.vy += 0.28; // Gravity
        bird.y += bird.vy;
        bird.rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.vy * 0.08));

        // Spawn Pipes
        if (frameCountRef.current % 110 === 0) {
          const minGapY = 80;
          const maxGapY = height - 120;
          const gapY = minGapY + Math.random() * (maxGapY - minGapY);
          pipesRef.current.push({
            x: width + 20,
            gapY,
            passed: false,
          });
        }

        // Move Pipes & Check Collision
        for (let i = pipesRef.current.length - 1; i >= 0; i--) {
          const pipe = pipesRef.current[i];
          pipe.x -= PIPE_SPEED;

          // Score check
          if (!pipe.passed && pipe.x + PIPE_WIDTH < bird.x) {
            pipe.passed = true;
            scoreRef.current += 1;
            setCurrentScore(scoreRef.current);
            onScoreUpdate(scoreRef.current);
            audio.playScore();

            // Fireworks particle burst on score
            for (let p = 0; p < 12; p++) {
              const a = Math.random() * Math.PI * 2;
              const spd = 2 + Math.random() * 3;
              particlesRef.current.push({
                x: bird.x,
                y: bird.y,
                vx: Math.cos(a) * spd,
                vy: Math.sin(a) * spd,
                life: 1,
                maxLife: 25,
                color: '#FACC15',
              });
            }
          }

          // Collision detection with 3D pipe bounds
          const hitTop =
            bird.x + bird.radius > pipe.x &&
            bird.x - bird.radius < pipe.x + PIPE_WIDTH &&
            bird.y - bird.radius < pipe.gapY - GAP_SIZE / 2;

          const hitBottom =
            bird.x + bird.radius > pipe.x &&
            bird.x - bird.radius < pipe.x + PIPE_WIDTH &&
            bird.y + bird.radius > pipe.gapY + GAP_SIZE / 2;

          if (hitTop || hitBottom) {
            audio.playHit();
            stateRef.current = 'GAMEOVER';
            setGameState('GAMEOVER');
            onGameOver(scoreRef.current);
          }

          // Remove off-screen pipes
          if (pipe.x < -PIPE_WIDTH - 20) {
            pipesRef.current.splice(i, 1);
          }
        }

        // Floor / Ceiling collision
        if (bird.y + bird.radius >= height - 32 || bird.y - bird.radius <= 0) {
          audio.playHit();
          stateRef.current = 'GAMEOVER';
          setGameState('GAMEOVER');
          onGameOver(scoreRef.current);
        }
      }

      // Update particles
      for (let p = particlesRef.current.length - 1; p >= 0; p--) {
        const pt = particlesRef.current[p];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.life++;
        if (pt.life >= pt.maxLife) {
          particlesRef.current.splice(p, 1);
        }
      }

      // RENDER 2.5D CANVAS
      ctx.clearRect(0, 0, width, height);

      // Deep cyber backdrop
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
      skyGrad.addColorStop(0, '#060811');
      skyGrad.addColorStop(0.65, '#0E172A');
      skyGrad.addColorStop(1, '#020617');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height);

      // 3D Parallax distant cityscape & neon grid
      ctx.fillStyle = 'rgba(15, 23, 42, 0.7)';
      for (let b = 0; b < 10; b++) {
        const bx = ((b * 80 - frameCountRef.current * 0.4) % (width + 80)) - 40;
        const bh = 90 + Math.sin(b * 3) * 40;
        ctx.fillRect(bx, height - 32 - bh, 60, bh);
      }

      // 3D Perspective Ground Grid
      const groundY = height - 32;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, groundY, width, 32);

      ctx.strokeStyle = '#06B6D4';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, groundY);
      ctx.lineTo(width, groundY);
      ctx.stroke();

      // Moving ground grid markers
      const offset = (frameCountRef.current * PIPE_SPEED) % 30;
      ctx.strokeStyle = 'rgba(6, 182, 212, 0.3)';
      for (let gx = -offset; gx < width; gx += 30) {
        ctx.beginPath();
        ctx.moveTo(gx, groundY);
        ctx.lineTo(gx - 15, height);
        ctx.stroke();
      }

      // Render 3D Cylindrical Pipes
      pipesRef.current.forEach((pipe) => {
        const topH = pipe.gapY - GAP_SIZE / 2;
        const botY = pipe.gapY + GAP_SIZE / 2;
        const botH = groundY - botY;

        // TOP PIPE with 3D cylindrical lighting
        const topGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
        topGrad.addColorStop(0, '#065F46');
        topGrad.addColorStop(0.3, '#10B981');
        topGrad.addColorStop(0.7, '#34D399');
        topGrad.addColorStop(1, '#064E3B');
        ctx.fillStyle = topGrad;
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, topH);

        // Top pipe rim flange
        ctx.fillStyle = '#059669';
        ctx.fillRect(pipe.x - 4, topH - 18, PIPE_WIDTH + 8, 18);
        ctx.strokeStyle = '#6EE7B7';
        ctx.lineWidth = 1;
        ctx.strokeRect(pipe.x - 4, topH - 18, PIPE_WIDTH + 8, 18);

        // BOTTOM PIPE with 3D cylindrical lighting
        const botGrad = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_WIDTH, 0);
        botGrad.addColorStop(0, '#065F46');
        botGrad.addColorStop(0.3, '#10B981');
        botGrad.addColorStop(0.7, '#34D399');
        botGrad.addColorStop(1, '#064E3B');
        ctx.fillStyle = botGrad;
        ctx.fillRect(pipe.x, botY, PIPE_WIDTH, botH);

        // Bottom pipe rim flange
        ctx.fillStyle = '#059669';
        ctx.fillRect(pipe.x - 4, botY, PIPE_WIDTH + 8, 18);
        ctx.strokeStyle = '#6EE7B7';
        ctx.lineWidth = 1;
        ctx.strokeRect(pipe.x - 4, botY, PIPE_WIDTH + 8, 18);
      });

      // Render particles
      particlesRef.current.forEach((pt) => {
        const alpha = 1 - pt.life / pt.maxLife;
        ctx.fillStyle = pt.color;
        ctx.globalAlpha = alpha;
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      });

      // Render 2.5D Spherical Flappy Bird with dynamic rotation
      const bird = birdRef.current;
      ctx.save();
      ctx.translate(bird.x, bird.y);
      ctx.rotate(bird.rotation);

      // Drop shadow underneath
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(0, 16, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // 3D Sphere Body with Radial Light Gradient
      const birdGrad = ctx.createRadialGradient(-4, -4, 2, 0, 0, bird.radius);
      birdGrad.addColorStop(0, '#FEF08A');
      birdGrad.addColorStop(0.6, '#FACC15');
      birdGrad.addColorStop(1, '#B45309');
      ctx.fillStyle = birdGrad;
      ctx.beginPath();
      ctx.arc(0, 0, bird.radius, 0, Math.PI * 2);
      ctx.fill();

      // Wing (animates with velocity)
      const wingY = Math.sin(frameCountRef.current * 0.4) * 4;
      ctx.fillStyle = '#EAB308';
      ctx.beginPath();
      ctx.ellipse(-5, wingY, 7, 5, 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Eye
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(5, -4, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(6.5, -4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Beak (3D Cone)
      ctx.fillStyle = '#F97316';
      ctx.beginPath();
      ctx.moveTo(9, -2);
      ctx.lineTo(19, 1);
      ctx.lineTo(9, 5);
      ctx.closePath();
      ctx.fill();

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, isPaused, onGameOver, onScoreUpdate]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none" onClick={flap}>
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="w-full h-full block cursor-pointer"
      />

      {/* In-Game HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Score</span>
          <span className="text-lg font-mono font-bold text-cyan-400 tabular-nums">{currentScore}</span>
        </div>
        <div className="text-xs font-mono text-slate-400 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
          Click or Space to Flap
        </div>
      </div>

      {/* Start / Game Over Overlay */}
      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center pointer-events-none">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Cyber-Flap 2.5D</div>
          <p className="text-sm text-slate-300 mb-4">Click anywhere or press Space to initiate flight</p>
          <div className="px-4 py-2 bg-cyan-500 text-black font-semibold text-xs rounded-lg shadow-lg">
            TAP TO LAUNCH
          </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Collision Detected</div>
          <div className="text-sm text-slate-300 mb-4">Final Score: <span className="font-mono font-bold text-cyan-300">{currentScore}</span></div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              resetGame();
            }}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
};
