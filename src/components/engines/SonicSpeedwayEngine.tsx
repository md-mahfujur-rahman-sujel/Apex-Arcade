import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface SonicSpeedwayEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

interface Ring {
  z: number;
  track: number; // -1 left, 0 center, 1 right
  collected: boolean;
}

interface Hazard {
  z: number;
  track: number;
  type: 'spike' | 'badnik';
}

export const SonicSpeedwayEngine: React.FC<SonicSpeedwayEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rings, setRings] = useState(0);
  const [distance, setDistance] = useState(0);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');

  const sonicRef = useRef({
    track: 0, // -1, 0, 1
    targetTrack: 0,
    y: 0,
    vy: 0,
    isJumping: false,
    speed: 4.5,
  });

  const ringsRef = useRef<Ring[]>([]);
  const hazardsRef = useRef<Hazard[]>([]);
  const distanceRef = useRef(0);
  const ringCountRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');
  stateRef.current = gameState;

  const startGame = useCallback(() => {
    sonicRef.current = {
      track: 0,
      targetTrack: 0,
      y: 0,
      vy: 0,
      isJumping: false,
      speed: 4.5,
    };
    ringsRef.current = [];
    hazardsRef.current = [];
    distanceRef.current = 0;
    ringCountRef.current = 0;
    setRings(0);
    setDistance(0);
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

      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        sonicRef.current.targetTrack = Math.max(-1, sonicRef.current.targetTrack - 1);
        audio.playClick();
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        sonicRef.current.targetTrack = Math.min(1, sonicRef.current.targetTrack + 1);
        audio.playClick();
      } else if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        if (!sonicRef.current.isJumping) {
          sonicRef.current.isJumping = true;
          sonicRef.current.vy = -7.5;
          audio.playJump();
        }
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
    let frame = 0;

    const speedMultiplier = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.35 : 1.0;

    const loop = () => {
      if (isPaused) {
        animId = requestAnimationFrame(loop);
        return;
      }

      frame++;
      const width = canvas.width;
      const height = canvas.height;

      // UPDATE
      if (stateRef.current === 'PLAYING') {
        const sonic = sonicRef.current;

        // Smooth track interpolation
        sonic.track += (sonic.targetTrack - sonic.track) * 0.2;

        // Jump physics
        if (sonic.isJumping) {
          sonic.y += sonic.vy;
          sonic.vy += 0.45;
          if (sonic.y >= 0) {
            sonic.y = 0;
            sonic.isJumping = false;
          }
        }

        // Distance advance
        sonic.speed = Math.min(9, 4.5 * speedMultiplier + distanceRef.current * 0.002);
        distanceRef.current += Math.floor(sonic.speed);
        setDistance(distanceRef.current);
        onScoreUpdate(distanceRef.current + ringCountRef.current * 50);

        // Spawn Rings
        if (frame % (difficulty === 'hard' ? 50 : 35) === 0) {
          const track = [-1, 0, 1][Math.floor(Math.random() * 3)];
          ringsRef.current.push({ z: 1000, track, collected: false });
        }

        // Spawn Hazards
        if (frame % (difficulty === 'hard' ? 65 : difficulty === 'easy' ? 110 : 85) === 0) {
          const track = [-1, 0, 1][Math.floor(Math.random() * 3)];
          hazardsRef.current.push({
            z: 1000,
            track,
            type: Math.random() > 0.5 ? 'spike' : 'badnik',
          });
        }

        // Advance Rings & Collision
        for (let i = ringsRef.current.length - 1; i >= 0; i--) {
          const r = ringsRef.current[i];
          r.z -= sonic.speed * 8;

          // Check pickup
          if (!r.collected && r.z < 100 && r.z > 20) {
            if (Math.abs(sonic.track - r.track) < 0.45) {
              r.collected = true;
              ringCountRef.current += 1;
              setRings(ringCountRef.current);
              audio.playScore();
            }
          }

          if (r.z < 0) {
            ringsRef.current.splice(i, 1);
          }
        }

        // Advance Hazards & Collision
        for (let i = hazardsRef.current.length - 1; i >= 0; i--) {
          const h = hazardsRef.current[i];
          h.z -= sonic.speed * 8;

          // Check hit
          if (h.z < 90 && h.z > 30) {
            if (Math.abs(sonic.track - h.track) < 0.4) {
              // If jumping, sonic smashes badniks!
              if (sonic.isJumping && h.type === 'badnik') {
                audio.playExplosion();
                hazardsRef.current.splice(i, 1);
                ringCountRef.current += 3;
                setRings(ringCountRef.current);
                continue;
              } else if (sonic.y > -20) {
                // Takes hit
                audio.playHit();
                stateRef.current = 'GAMEOVER';
                setGameState('GAMEOVER');
                onGameOver(distanceRef.current + ringCountRef.current * 50);
                return;
              }
            }
          }

          if (h.z < 0) {
            hazardsRef.current.splice(i, 1);
          }
        }
      }

      // RENDER 2.5D PSEUDO-3D SPEEDWAY
      ctx.clearRect(0, 0, width, height);

      // Gradient Sky (Green Hill sunset to twilight)
      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.45);
      skyGrad.addColorStop(0, '#0284C7');
      skyGrad.addColorStop(1, '#0C4A6E');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.45);

      // Distant Checkerboard Hills
      ctx.fillStyle = '#065F46';
      ctx.beginPath();
      ctx.arc(width * 0.25, height * 0.45, 120, Math.PI, 0);
      ctx.arc(width * 0.75, height * 0.45, 150, Math.PI, 0);
      ctx.fill();

      // Horizon line
      const horizonY = height * 0.45;
      const roadBottomY = height;
      const roadTopW = 40;
      const roadBotW = 440;

      // 3D Checkerboard Track Surface
      const roadGrad = ctx.createLinearGradient(0, horizonY, 0, roadBottomY);
      roadGrad.addColorStop(0, '#1E293B');
      roadGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = roadGrad;

      ctx.beginPath();
      ctx.moveTo(width / 2 - roadTopW / 2, horizonY);
      ctx.lineTo(width / 2 + roadTopW / 2, horizonY);
      ctx.lineTo(width / 2 + roadBotW / 2, roadBottomY);
      ctx.lineTo(width / 2 - roadBotW / 2, roadBottomY);
      ctx.closePath();
      ctx.fill();

      // Neon Track Guard Rails (Cyber sonic style)
      ctx.strokeStyle = '#2563EB';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - roadTopW / 2, horizonY);
      ctx.lineTo(width / 2 - roadBotW / 2, roadBottomY);
      ctx.moveTo(width / 2 + roadTopW / 2, horizonY);
      ctx.lineTo(width / 2 + roadBotW / 2, roadBottomY);
      ctx.stroke();

      // Track Lanes & Strips
      const stripeOffset = (frame * 12) % 40;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      for (let s = horizonY + stripeOffset; s < roadBottomY; s += 25) {
        const factor = (s - horizonY) / (roadBottomY - horizonY);
        const w = roadTopW + (roadBotW - roadTopW) * factor;
        ctx.beginPath();
        ctx.moveTo(width / 2 - w / 2, s);
        ctx.lineTo(width / 2 + w / 2, s);
        ctx.stroke();
      }

      // Projection Helper (track, z) -> screen (x, y, scale)
      const project = (track: number, z: number) => {
        const factor = 1 - z / 1000;
        const y = horizonY + (roadBottomY - horizonY) * factor;
        const curRoadW = roadTopW + (roadBotW - roadTopW) * factor;
        const trackSpacing = (curRoadW * 0.35) * track;
        const x = width / 2 + trackSpacing;
        const scale = 0.2 + factor * 0.8;
        return { x, y, scale };
      };

      // Render 3D Rotating Golden Rings
      ringsRef.current.forEach((r) => {
        if (r.collected) return;
        const { x, y, scale } = project(r.track, r.z);
        const spin = Math.sin(frame * 0.1 + r.z * 0.01);
        const rad = 14 * scale;

        ctx.strokeStyle = '#FACC15';
        ctx.shadowColor = '#FACC15';
        ctx.shadowBlur = 8;
        ctx.lineWidth = 3 * scale;
        ctx.beginPath();
        ctx.ellipse(x, y - rad, rad * Math.abs(spin), rad, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Render 3D Hazards (Spikes & Badnik Crabs)
      hazardsRef.current.forEach((h) => {
        const { x, y, scale } = project(h.track, h.z);
        const sz = 24 * scale;

        if (h.type === 'spike') {
          ctx.fillStyle = '#EF4444';
          ctx.shadowColor = '#EF4444';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.moveTo(x - sz / 2, y);
          ctx.lineTo(x, y - sz);
          ctx.lineTo(x + sz / 2, y);
          ctx.closePath();
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          // Badnik Robotnik Crab
          ctx.fillStyle = '#7C3AED';
          ctx.beginPath();
          ctx.arc(x, y - sz / 2, sz / 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          ctx.fillRect(x - sz * 0.3, y - sz * 0.7, sz * 0.6, sz * 0.25);
        }
      });

      // Render 2.5D Sonic Character
      const sonic = sonicRef.current;
      const { x: sonicX, y: sonicBaseY } = project(sonic.track, 60);
      const sonicY = sonicBaseY + sonic.y;

      // Drop shadow
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(sonicX, sonicBaseY, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sonic Body (Spin ball or running silhouette)
      ctx.save();
      ctx.translate(sonicX, sonicY - 20);

      if (sonic.isJumping) {
        // Spin Ball
        ctx.fillStyle = '#2563EB';
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, 0, 16, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      } else {
        // Sonic Running
        ctx.fillStyle = '#2563EB';
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(0, -6, 12, 0, Math.PI * 2);
        ctx.fill();

        // Spikes back
        ctx.beginPath();
        ctx.moveTo(-10, -6);
        ctx.lineTo(-20, -10);
        ctx.lineTo(-12, 0);
        ctx.lineTo(-20, 4);
        ctx.lineTo(-6, 4);
        ctx.fill();

        // Red shoes with white stripe
        ctx.fillStyle = '#EF4444';
        const legBob = Math.sin(frame * 0.6) * 6;
        ctx.fillRect(-8, 6 + legBob, 8, 6);
        ctx.fillRect(2, 6 - legBob, 8, 6);
        ctx.shadowBlur = 0;
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, isPaused, onGameOver, onScoreUpdate]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      {/* HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
            <span className="text-sm font-mono font-bold text-yellow-300 tabular-nums">{rings} Rings</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-xs text-slate-400">
            Dist: <span className="font-mono text-cyan-300 font-bold">{distance}m</span>
          </div>
        </div>

        <div className="text-xs font-mono text-slate-400 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10">
          A/D: Steer · Space: Jump
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Sonic Speedway 2.5D</div>
          <p className="text-sm text-slate-300 mb-5">Sprint supersonic speedway, harvest rings, and smash badniks</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            BLAST PROCESSING LAUNCH
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Sonic Stumbled!</div>
          <div className="text-sm text-slate-300 mb-4">
            Rings: <span className="font-mono text-yellow-300 font-bold">{rings}</span> · Distance: <span className="font-mono text-cyan-300">{distance}m</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-blue-500 hover:bg-blue-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Spin Dash Again
          </button>
        </div>
      )}
    </div>
  );
};
