import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface SonicSpeedwayEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  highScore?: number;
  onLevelComplete?: (level: number, score: number) => void;
  onRestart?: () => void;
}

interface TrackItem {
  kind: 'ring' | 'spike' | 'badnik' | 'boost';
  z: number;
  track: number; // -1 left, 0 center, 1 right
  collected?: boolean;
}

const ZONE_LENGTH = 300;
const ZONE_NAMES = ['Sunny Shore', 'Crystal Mines', 'Neon Highway'];
const ZONES = [
  { sky: ['#0EA5E9', '#7DD3FC'] as const, hill: '#FBBF24', hillFar: '#FDE68A', road: ['#1E293B', '#0F172A'], rail: '#2563EB', stripe: 'rgba(255,255,255,0.16)' },
  { sky: ['#1E1B4B', '#3B0764'] as const, hill: '#6D28D9', hillFar: '#A78BFA', road: ['#1F2937', '#111827'], rail: '#8B5CF6', stripe: 'rgba(196,181,253,0.22)' },
  { sky: ['#0B0716', '#4C1D95'] as const, hill: '#312E81', hillFar: '#1E1B4B', road: ['#111827', '#020617'], rail: '#22D3EE', stripe: 'rgba(34,211,238,0.28)' },
];

export const SonicSpeedwayEngine: React.FC<SonicSpeedwayEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
  highScore = 0,
  onLevelComplete,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [rings, setRings] = useState(0);
  const [distance, setDistance] = useState(0);
  const [zone, setZone] = useState(0);
  const [hearts, setHearts] = useState(3);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER' | 'WON'>('READY');

  const sonicRef = useRef({
    track: 0,
    targetTrack: 0,
    y: 0,
    vy: 0,
    isJumping: false,
  });

  const itemsRef = useRef<TrackItem[]>([]);
  const distanceRef = useRef(0);
  const ringCountRef = useRef(0);
  const bonusRef = useRef(0);
  const zoneRef = useRef(0);
  const heartsRef = useRef(3);
  const boostRef = useRef(0);
  const invulnRef = useRef(0);
  const flashRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER' | 'WON'>('READY');
  stateRef.current = gameState;

  const callbacksRef = useRef({ score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart });
  callbacksRef.current = { score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart };
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;

  const scoreNow = useCallback(
    () => Math.floor(distanceRef.current) + ringCountRef.current * 50 + bonusRef.current,
    [],
  );

  const startGame = useCallback(() => {
    sonicRef.current = { track: 0, targetTrack: 0, y: 0, vy: 0, isJumping: false };
    itemsRef.current = [];
    distanceRef.current = 0;
    ringCountRef.current = 0;
    bonusRef.current = 0;
    zoneRef.current = 0;
    heartsRef.current = 3;
    boostRef.current = 0;
    invulnRef.current = 0;
    flashRef.current = 0;
    setRings(0);
    setDistance(0);
    setZone(0);
    setHearts(3);
    callbacksRef.current.restart?.();
    setGameState('PLAYING');
    stateRef.current = 'PLAYING';
    audio.playClick();
  }, []);

  // Controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (isPaused) return;
      if (stateRef.current === 'GAMEOVER' || stateRef.current === 'WON') {
        if (e.code === 'Space' || e.code === 'Enter') {
          e.preventDefault();
          startGame();
        }
        return;
      }
      if (stateRef.current !== 'PLAYING') {
        if (e.code === 'Space' || e.code === 'Enter') {
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
      } else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.code === 'KeyK') {
        e.preventDefault();
        if (boostRef.current < 30) boostRef.current += 40;
        audio.playDash();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isPaused, startGame]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let frame = 0;
    const speedMultiplier = difficulty === 'easy' ? 0.85 : difficulty === 'hard' ? 1.15 : 1.0;
    const scoreMultiplier = difficulty === 'hard' ? 1.25 : 1.0;

    const loop = () => {
      if (isPaused) {
        animId = requestAnimationFrame(loop);
        return;
      }

      frame++;
      const width = canvas.width;
      const height = canvas.height;
      const zoneIndex = Math.min(2, zoneRef.current);
      const palette = ZONES[zoneIndex];

      if (stateRef.current === 'PLAYING') {
        const sonic = sonicRef.current;
        if (invulnRef.current > 0) invulnRef.current--;
        if (flashRef.current > 0) flashRef.current--;

        sonic.track += (sonic.targetTrack - sonic.track) * 0.2;

        if (sonic.isJumping) {
          sonic.y += sonic.vy;
          sonic.vy += 0.45;
          if (sonic.y >= 0) {
            sonic.y = 0;
            sonic.isJumping = false;
          }
        }

        const baseSpeed = (4.4 + zoneIndex * 0.7) * speedMultiplier + Math.min(2.4, distanceRef.current * 0.002);
        const speed = baseSpeed * (boostRef.current > 0 ? 1.55 : 1);
        if (boostRef.current > 0) boostRef.current--;

        distanceRef.current += speed * 0.12;
        setDistance(Math.floor(distanceRef.current));
        const score = scoreNow();
        callbacksRef.current.score(score);

        // Zone progression: three 300m legs.
        if (zoneRef.current < 2 && distanceRef.current >= (zoneRef.current + 1) * ZONE_LENGTH) {
          zoneRef.current += 1;
          setZone(zoneRef.current);
          bonusRef.current += Math.round(600 * scoreMultiplier);
          flashRef.current = 90;
          audio.playScore();
          callbacksRef.current.level?.(zoneRef.current, scoreNow());
        } else if (zoneRef.current === 2 && distanceRef.current >= ZONE_LENGTH * 3) {
          stateRef.current = 'WON';
          setGameState('WON');
          callbacksRef.current.level?.(3, scoreNow());
          callbacksRef.current.over(scoreNow());
          return;
        }

        // Spawns
        if (frame % (difficulty === 'hard' ? 48 : 36) === 0) {
          itemsRef.current.push({ kind: 'ring', z: 1000, track: [-1, 0, 1][Math.floor(Math.random() * 3)] });
        }
        if (frame % (difficulty === 'hard' ? 62 : difficulty === 'easy' ? 110 : 84) === 0) {
          itemsRef.current.push({
            kind: Math.random() > 0.45 ? 'spike' : 'badnik',
            z: 1000,
            track: [-1, 0, 1][Math.floor(Math.random() * 3)],
          });
        }
        if (frame % 300 === 120) {
          itemsRef.current.push({ kind: 'boost', z: 1000, track: [-1, 0, 1][Math.floor(Math.random() * 3)] });
        }

        for (let i = itemsRef.current.length - 1; i >= 0; i--) {
          const item = itemsRef.current[i];
          item.z -= speed * 8;
          if (item.z < 0 || item.collected) {
            if (item.z < 0) itemsRef.current.splice(i, 1);
            continue;
          }
          if (item.z > 105 || item.z < 18) continue;
          const laneHit = Math.abs(sonic.track - item.track) < 0.45;

          if (item.kind === 'ring') {
            if (laneHit) {
              item.collected = true;
              ringCountRef.current += 1;
              setRings(ringCountRef.current);
              audio.playScore();
              itemsRef.current.splice(i, 1);
            }
          } else if (item.kind === 'boost') {
            if (laneHit) {
              item.collected = true;
              boostRef.current = 110;
              bonusRef.current += Math.round(50 * scoreMultiplier);
              audio.playDash();
              itemsRef.current.splice(i, 1);
            }
          } else if (laneHit && invulnRef.current <= 0) {
            if (sonic.isJumping && item.kind === 'badnik') {
              item.collected = true;
              ringCountRef.current += 3;
              bonusRef.current += Math.round(100 * scoreMultiplier);
              setRings(ringCountRef.current);
              audio.playExplosion();
              itemsRef.current.splice(i, 1);
              continue;
            }
            if (sonic.y > -20) {
              item.collected = true;
              itemsRef.current.splice(i, 1);
              heartsRef.current -= 1;
              invulnRef.current = 100;
              ringCountRef.current = Math.floor(ringCountRef.current / 2);
              setHearts(heartsRef.current);
              setRings(ringCountRef.current);
              audio.playHit();
              if (heartsRef.current <= 0) {
                stateRef.current = 'GAMEOVER';
                setGameState('GAMEOVER');
                callbacksRef.current.over(scoreNow());
                return;
              }
            }
          }
        }
      }

      // RENDER 2.5D PSEUDO-3D SPEEDWAY
      ctx.clearRect(0, 0, width, height);

      const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.45);
      skyGrad.addColorStop(0, palette.sky[0]);
      skyGrad.addColorStop(1, palette.sky[1]);
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, height * 0.45);

      if (zoneIndex === 2) {
        for (let i = 0; i < 16; i++) {
          const bx = ((i * 62 - frame * 0.9) % 992 + 992) % 992 - 60;
          const bh = 54 + ((i * 47) % 110);
          const bw = 46;
          ctx.fillStyle = i % 2 ? '#0F172A' : '#1E1B4B';
          ctx.fillRect(bx, height * 0.45 - bh, bw, bh);
          ctx.fillStyle = i % 3 ? '#22D3EE' : '#F0ABFC';
          ctx.fillRect(bx, height * 0.45 - bh, bw, 2);
          ctx.globalAlpha = 0.75;
          for (let wy = height * 0.45 - bh + 10; wy < height * 0.45 - 8; wy += 14) {
            for (let wx = bx + 6; wx < bx + bw - 6; wx += 12) {
              if ((wx + wy + i) % 5 !== 0) ctx.fillRect(wx, wy, 5, 7);
            }
          }
          ctx.globalAlpha = 1;
        }
      } else {
        ctx.fillStyle = palette.hillFar;
        ctx.beginPath();
        ctx.arc(width * 0.22, height * 0.45, 110, Math.PI, 0);
        ctx.arc(width * 0.62, height * 0.45, 150, Math.PI, 0);
        ctx.arc(width * 0.9, height * 0.45, 96, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = palette.hill;
        ctx.beginPath();
        ctx.arc(width * 0.4, height * 0.46, 92, Math.PI, 0);
        ctx.arc(width * 0.85, height * 0.46, 120, Math.PI, 0);
        ctx.fill();
        if (zoneIndex === 0) {
          const sun = ctx.createRadialGradient(width * 0.78, height * 0.18, 6, width * 0.78, height * 0.18, 64);
          sun.addColorStop(0, 'rgba(254,243,199,0.95)');
          sun.addColorStop(1, 'rgba(254,243,199,0)');
          ctx.fillStyle = sun;
          ctx.fillRect(width * 0.78 - 64, height * 0.18 - 64, 128, 128);
          ctx.fillStyle = '#FEF3C7';
          ctx.beginPath();
          ctx.arc(width * 0.78, height * 0.18, 30, 0, Math.PI * 2);
          ctx.fill();
        } else {
          for (let i = 0; i < 8; i++) {
            const cx = ((i * 96 - frame * 1.4) % 864 + 864) % 864 - 40;
            const ch = 26 + ((i * 31) % 44);
            ctx.fillStyle = i % 2 ? '#A78BFA' : '#67E8F9';
            ctx.globalAlpha = 0.7;
            ctx.beginPath();
            ctx.moveTo(cx, height * 0.45);
            ctx.lineTo(cx + 9, height * 0.45 - ch);
            ctx.lineTo(cx + 18, height * 0.45);
            ctx.closePath();
            ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }

      ctx.strokeStyle = palette.rail;
      ctx.globalAlpha = 0.55;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, height * 0.45);
      ctx.lineTo(width, height * 0.45);
      ctx.stroke();
      ctx.globalAlpha = 1;

      const horizonY = height * 0.45;
      const roadBottomY = height;
      const roadTopW = 40;
      const roadBotW = 440;

      const roadGrad = ctx.createLinearGradient(0, horizonY, 0, roadBottomY);
      roadGrad.addColorStop(0, palette.road[0]);
      roadGrad.addColorStop(1, palette.road[1]);
      ctx.fillStyle = roadGrad;
      ctx.beginPath();
      ctx.moveTo(width / 2 - roadTopW / 2, horizonY);
      ctx.lineTo(width / 2 + roadTopW / 2, horizonY);
      ctx.lineTo(width / 2 + roadBotW / 2, roadBottomY);
      ctx.lineTo(width / 2 - roadBotW / 2, roadBottomY);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = palette.rail;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(width / 2 - roadTopW / 2, horizonY);
      ctx.lineTo(width / 2 - roadBotW / 2, roadBottomY);
      ctx.moveTo(width / 2 + roadTopW / 2, horizonY);
      ctx.lineTo(width / 2 + roadBotW / 2, roadBottomY);
      ctx.stroke();

      const stripeOffset = (frame * 12) % 40;
      ctx.strokeStyle = palette.stripe;
      ctx.lineWidth = 1;
      for (let s = horizonY + stripeOffset; s < roadBottomY; s += 25) {
        const factor = (s - horizonY) / (roadBottomY - horizonY);
        const w = roadTopW + (roadBotW - roadTopW) * factor;
        ctx.beginPath();
        ctx.moveTo(width / 2 - w / 2, s);
        ctx.lineTo(width / 2 + w / 2, s);
        ctx.stroke();
      }

      const project = (track: number, z: number) => {
        const factor = 1 - z / 1000;
        const y = horizonY + (roadBottomY - horizonY) * factor;
        const curRoadW = roadTopW + (roadBotW - roadTopW) * factor;
        const x = width / 2 + curRoadW * 0.35 * track;
        const scale = 0.2 + factor * 0.8;
        return { x, y, scale };
      };

      itemsRef.current.forEach((item) => {
        if (item.collected) return;
        const { x, y, scale } = project(item.track, item.z);
        if (item.kind === 'ring') {
          const spin = Math.abs(Math.sin(frame * 0.1 + item.z * 0.01));
          const rad = 14 * scale;
          ctx.strokeStyle = '#FACC15';
          ctx.shadowColor = '#FACC15';
          ctx.shadowBlur = 8;
          ctx.lineWidth = 3 * scale;
          ctx.beginPath();
          ctx.ellipse(x, y - rad, rad * Math.max(0.18, spin), rad, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.shadowBlur = 0;
        } else if (item.kind === 'boost') {
          const pulse = 0.6 + 0.4 * Math.sin(frame * 0.15);
          ctx.save();
          ctx.globalAlpha = pulse;
          ctx.fillStyle = '#22D3EE';
          ctx.shadowColor = '#22D3EE';
          ctx.shadowBlur = 12;
          for (let k = 0; k < 2; k++) {
            const yy = y - 16 * scale - k * 12 * scale;
            ctx.beginPath();
            ctx.moveTo(x - 12 * scale, yy);
            ctx.lineTo(x, yy - 8 * scale);
            ctx.lineTo(x + 12 * scale, yy);
            ctx.lineTo(x, yy - 3 * scale);
            ctx.fill();
          }
          ctx.restore();
        } else {
          const sz = 24 * scale;
          if (item.kind === 'spike') {
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
            ctx.fillStyle = '#7C3AED';
            ctx.beginPath();
            ctx.arc(x, y - sz / 2, sz / 2, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#EF4444';
            ctx.fillRect(x - sz * 0.3, y - sz * 0.7, sz * 0.6, sz * 0.25);
          }
        }
      });

      const sonic = sonicRef.current;
      const { x: sonicX, y: sonicBaseY } = project(sonic.track, 60);
      const sonicY = sonicBaseY + sonic.y;
      const blinking = invulnRef.current > 0 && Math.floor(invulnRef.current / 5) % 2 === 0;

      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.beginPath();
      ctx.ellipse(sonicX, sonicBaseY, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!blinking) {
        ctx.save();
        ctx.translate(sonicX, sonicY - 20);

        if (sonic.isJumping) {
          ctx.fillStyle = '#0F766E';
          ctx.shadowColor = '#5EEAD4';
          ctx.shadowBlur = 14;
          ctx.beginPath();
          ctx.arc(0, 0, 16, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#5EEAD4';
          ctx.lineWidth = 2.5;
          for (let i = -1; i <= 1; i++) {
            ctx.beginPath();
            ctx.arc(0, 0, 16, i * 0.9 + 0.5, i * 0.9 + 1.6);
            ctx.stroke();
          }
          ctx.shadowBlur = 0;
        } else {
          const bob = Math.sin(frame * 0.6) * 2;
          ctx.fillStyle = '#14B8A6';
          ctx.shadowColor = '#2DD4BF';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.ellipse(0, -6 + bob, 13, 12, -0.2, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FDE68A';
          ctx.beginPath();
          ctx.arc(9, -9 + bob, 7, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(14, -11 + bob);
          ctx.lineTo(22, -7 + bob);
          ctx.lineTo(14, -4 + bob);
          ctx.fill();
          ctx.fillStyle = '#111';
          ctx.beginPath();
          ctx.arc(11, -11 + bob, 1.7, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#EF4444';
          const legBob = Math.sin(frame * 0.7) * 5;
          ctx.fillRect(-8, 6 + legBob, 8, 6);
          ctx.fillRect(2, 6 - legBob, 8, 6);
          ctx.shadowBlur = 0;
        }
        ctx.restore();
      }

      if (boostRef.current > 0) {
        ctx.strokeStyle = 'rgba(34,211,238,0.55)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          ctx.beginPath();
          ctx.moveTo(width / 2 - 120 - i * 18, sonicBaseY - 10 - i * 12);
          ctx.lineTo(width / 2 - 40 - i * 18, sonicBaseY - 10 - i * 12);
          ctx.stroke();
        }
      }

      if (flashRef.current > 0) {
        ctx.fillStyle = `rgba(250,204,21,${Math.min(0.3, flashRef.current / 300)})`;
        ctx.fillRect(0, 0, width, height);
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, isPaused, scoreNow]);

  const best = Math.max(highScore, scoreNow());

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      <div className="absolute top-4 left-4 right-4 flex items-start justify-between pointer-events-none gap-2">
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
            <span className="text-sm font-mono font-bold text-yellow-300 tabular-nums">{rings} Rings</span>
          </div>
          <span className="text-slate-600">|</span>
          <div className="text-xs text-slate-400">
            Dist: <span className="font-mono text-cyan-300 font-bold">{distance}m</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs font-mono text-emerald-300">{'\u2665'.repeat(Math.max(0, hearts))}</span>
          <span className="text-[10px] font-mono text-slate-400">ZONE {Math.min(3, zone + 1)}/3 · {ZONE_NAMES[Math.min(2, zone)]}</span>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Rollo Rush: Neon Speedway</div>
          <p className="text-sm text-slate-300 mb-5">Build speed, hit boost pads, smash badniks, and clear three zones</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            START RUSH
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Rollo Wiped Out</div>
          <div className="text-sm text-slate-300 mb-4">
            Rings: <span className="font-mono text-yellow-300 font-bold">{rings}</span> · Distance:{' '}
            <span className="font-mono text-cyan-300">{distance}m</span> · Best: <span className="font-mono text-teal-300">{best}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Spin Dash Again
          </button>
        </div>
      )}

      {gameState === 'WON' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-teal-300 mb-1 tracking-tight">Run Complete!</div>
          <div className="text-sm text-slate-300 mb-4">
            Three zones · <span className="font-mono text-yellow-300 font-bold">{rings} rings</span> · Score{' '}
            <span className="font-mono text-cyan-300">{scoreNow()}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Run Again
          </button>
        </div>
      )}
    </div>
  );
};
