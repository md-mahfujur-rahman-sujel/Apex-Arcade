import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface StreetBrawlerEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  isPlayer: boolean;
}

export const StreetBrawlerEngine: React.FC<StreetBrawlerEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [aiHp, setAiHp] = useState(100);
  const [timer, setTimer] = useState(99);
  const [combo, setCombo] = useState(0);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');

  const playerRef = useRef({
    x: 180,
    y: 340,
    vx: 0,
    vy: 0,
    action: 'idle', // idle, punch, kick, hadoken, jump, block
    actionTimer: 0,
  });

  const aiRef = useRef({
    x: 460,
    y: 340,
    vx: 0,
    vy: 0,
    action: 'idle',
    actionTimer: 0,
  });

  const projectilesRef = useRef<Projectile[]>([]);
  const pHpRef = useRef(100);
  const aiHpRef = useRef(100);
  const timerRef = useRef(99);
  const comboRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');
  stateRef.current = gameState;

  const startGame = useCallback(() => {
    playerRef.current = { x: 180, y: 340, vx: 0, vy: 0, action: 'idle', actionTimer: 0 };
    aiRef.current = { x: 460, y: 340, vx: 0, vy: 0, action: 'idle', actionTimer: 0 };
    projectilesRef.current = [];
    pHpRef.current = 100;
    aiHpRef.current = 100;
    timerRef.current = 99;
    comboRef.current = 0;
    setPlayerHp(100);
    setAiHp(100);
    setTimer(99);
    setCombo(0);
    setGameState('PLAYING');
    stateRef.current = 'PLAYING';
    audio.playClick();
  }, []);

  const playerPunch = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    const p = playerRef.current;
    if (p.action === 'idle') {
      p.action = 'punch';
      p.actionTimer = 14;
      audio.playPongBeep(true);

      // Hit check against AI
      if (Math.abs(p.x - aiRef.current.x) < 70 && aiRef.current.action !== 'block') {
        audio.playHit();
        aiHpRef.current = Math.max(0, aiHpRef.current - 12);
        setAiHp(aiHpRef.current);
        comboRef.current++;
        setCombo(comboRef.current);
        onScoreUpdate((100 - aiHpRef.current) * 20);
        if (aiHpRef.current <= 0) {
          stateRef.current = 'VICTORY';
          setGameState('VICTORY');
          audio.playScore();
          onGameOver(2000 + pHpRef.current * 10);
        }
      }
    }
  }, [onGameOver, onScoreUpdate]);

  const playerKick = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    const p = playerRef.current;
    if (p.action === 'idle') {
      p.action = 'kick';
      p.actionTimer = 18;
      audio.playPongBeep(false);

      if (Math.abs(p.x - aiRef.current.x) < 85 && aiRef.current.action !== 'block') {
        audio.playHit();
        aiHpRef.current = Math.max(0, aiHpRef.current - 18);
        setAiHp(aiHpRef.current);
        comboRef.current++;
        setCombo(comboRef.current);
        onScoreUpdate((100 - aiHpRef.current) * 20);
        if (aiHpRef.current <= 0) {
          stateRef.current = 'VICTORY';
          setGameState('VICTORY');
          audio.playScore();
          onGameOver(2000 + pHpRef.current * 10);
        }
      }
    }
  }, [onGameOver, onScoreUpdate]);

  const playerHadoken = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    const p = playerRef.current;
    if (p.action === 'idle') {
      p.action = 'hadoken';
      p.actionTimer = 22;
      projectilesRef.current.push({
        x: p.x + 40,
        y: p.y - 30,
        vx: 8,
        isPlayer: true,
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
      if (stateRef.current !== 'PLAYING') {
        if (e.code === 'Space') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (e.code === 'KeyJ') {
        e.preventDefault();
        playerPunch();
      } else if (e.code === 'KeyK') {
        e.preventDefault();
        playerKick();
      } else if (e.code === 'KeyH' || (keys.has('KeyS') && e.code === 'KeyD')) {
        e.preventDefault();
        playerHadoken();
      } else if (e.code === 'Space') {
        e.preventDefault();
        if (playerRef.current.y >= 340) {
          playerRef.current.vy = -10;
          audio.playJump();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };

    const interval = setInterval(() => {
      if (isPaused || stateRef.current !== 'PLAYING') return;
      const p = playerRef.current;
      if (p.actionTimer > 0) return;

      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        p.x = Math.max(80, p.x - 4.5);
      }
      if (keys.has('KeyD') || keys.has('ArrowRight')) {
        p.x = Math.min(aiRef.current.x - 45, p.x + 4.5);
      }
      if (keys.has('KeyS') || keys.has('ArrowDown')) {
        p.action = 'block';
      } else if (p.action === 'block') {
        p.action = 'idle';
      }
    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused, playerHadoken, playerKick, playerPunch, startGame]);

  // Round Timer
  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (stateRef.current !== 'PLAYING' || isPaused) return;
      timerRef.current--;
      setTimer(timerRef.current);
      if (timerRef.current <= 0) {
        if (pHpRef.current >= aiHpRef.current) {
          stateRef.current = 'VICTORY';
          setGameState('VICTORY');
          onGameOver(1500);
        } else {
          stateRef.current = 'GAMEOVER';
          setGameState('GAMEOVER');
          onGameOver(500);
        }
      }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [isPaused, onGameOver]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const aiAggression = difficulty === 'hard' ? 0.045 : difficulty === 'easy' ? 0.015 : 0.025;

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
        const p = playerRef.current;
        const ai = aiRef.current;

        // Player timers
        if (p.actionTimer > 0) {
          p.actionTimer--;
          if (p.actionTimer <= 0) p.action = 'idle';
        }

        // Player Jump Gravity
        if (p.y < 340 || p.vy !== 0) {
          p.y += p.vy;
          p.vy += 0.6;
          if (p.y >= 340) {
            p.y = 340;
            p.vy = 0;
          }
        }

        // AI Logic
        if (ai.actionTimer > 0) {
          ai.actionTimer--;
          if (ai.actionTimer <= 0) ai.action = 'idle';
        }

        const dist = ai.x - p.x;
        if (dist > 100) {
          ai.x -= 2.2;
        } else if (dist < 50) {
          ai.x += 1.5;
        }

        // AI Attacks
        if (ai.action === 'idle' && Math.random() < aiAggression) {
          const choice = Math.random();
          if (choice < 0.45 && dist < 80) {
            ai.action = 'punch';
            ai.actionTimer = 16;
            if (p.action !== 'block') {
              audio.playHit();
              pHpRef.current = Math.max(0, pHpRef.current - (difficulty === 'hard' ? 16 : 10));
              setPlayerHp(pHpRef.current);
              comboRef.current = 0;
              setCombo(0);
              if (pHpRef.current <= 0) {
                stateRef.current = 'GAMEOVER';
                setGameState('GAMEOVER');
                audio.playExplosion();
                onGameOver(0);
              }
            }
          } else if (choice < 0.8 && dist < 95) {
            ai.action = 'kick';
            ai.actionTimer = 20;
            if (p.action !== 'block') {
              audio.playHit();
              pHpRef.current = Math.max(0, pHpRef.current - (difficulty === 'hard' ? 22 : 14));
              setPlayerHp(pHpRef.current);
              comboRef.current = 0;
              setCombo(0);
              if (pHpRef.current <= 0) {
                stateRef.current = 'GAMEOVER';
                setGameState('GAMEOVER');
                audio.playExplosion();
                onGameOver(0);
              }
            }
          } else {
            // AI Hadoken
            ai.action = 'hadoken';
            ai.actionTimer = 24;
            projectilesRef.current.push({
              x: ai.x - 40,
              y: ai.y - 30,
              vx: -7,
              isPlayer: false,
            });
            audio.playLaser();
          }
        }

        // Update Projectiles
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const proj = projectilesRef.current[i];
          proj.x += proj.vx;

          if (proj.isPlayer && Math.abs(proj.x - ai.x) < 30) {
            // Hit AI
            audio.playExplosion();
            aiHpRef.current = Math.max(0, aiHpRef.current - 25);
            setAiHp(aiHpRef.current);
            projectilesRef.current.splice(i, 1);
            if (aiHpRef.current <= 0) {
              stateRef.current = 'VICTORY';
              setGameState('VICTORY');
              audio.playScore();
              onGameOver(2500);
            }
            continue;
          } else if (!proj.isPlayer && Math.abs(proj.x - p.x) < 30) {
            // Hit Player
            audio.playHit();
            pHpRef.current = Math.max(0, pHpRef.current - (p.action === 'block' ? 6 : 20));
            setPlayerHp(pHpRef.current);
            projectilesRef.current.splice(i, 1);
            if (pHpRef.current <= 0) {
              stateRef.current = 'GAMEOVER';
              setGameState('GAMEOVER');
              audio.playExplosion();
              onGameOver(0);
            }
            continue;
          }

          if (proj.x < 0 || proj.x > width) {
            projectilesRef.current.splice(i, 1);
          }
        }
      }

      // RENDER 2.5D ARENA
      ctx.clearRect(0, 0, width, height);

      // Sunset dojo background
      const dojoGrad = ctx.createLinearGradient(0, 0, 0, height);
      dojoGrad.addColorStop(0, '#450A0A');
      dojoGrad.addColorStop(0.5, '#7F1D1D');
      dojoGrad.addColorStop(0.7, '#1E1B4B');
      dojoGrad.addColorStop(1, '#0F172A');
      ctx.fillStyle = dojoGrad;
      ctx.fillRect(0, 0, width, height);

      // 3D Perspective Dojo Wooden Floor
      const floorY = 340;
      ctx.fillStyle = '#78350F';
      ctx.fillRect(0, floorY, width, height - floorY);

      // Floor Perspective Planks
      ctx.strokeStyle = '#451A03';
      ctx.lineWidth = 1.5;
      for (let x = -width * 0.5; x <= width * 1.5; x += 45) {
        ctx.beginPath();
        ctx.moveTo(width / 2, floorY - 60);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Render Projectiles (Hadoken Fireballs with glowing aura)
      projectilesRef.current.forEach((proj) => {
        ctx.fillStyle = proj.isPlayer ? '#38BDF8' : '#F97316';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 14, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(proj.x - proj.vx * 0.5, proj.y, 8, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Render Player (Ryu Homage - White Gi, Red Headband)
      const p = playerRef.current;
      ctx.save();
      ctx.translate(p.x, p.y);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body Gi
      ctx.fillStyle = '#F8FAFC';
      ctx.fillRect(-14, -50, 28, 40);

      // Head & Red Headband
      ctx.fillStyle = '#FED7AA';
      ctx.beginPath();
      ctx.arc(0, -60, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#EF4444';
      ctx.fillRect(-12, -64, 24, 5);
      // Headband tails flowing back
      ctx.beginPath();
      ctx.moveTo(-12, -62);
      ctx.lineTo(-24 - Math.sin(t * 4) * 4, -58);
      ctx.lineTo(-12, -59);
      ctx.fill();

      // Black belt
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-15, -28, 30, 6);

      // Limbs (Action postures)
      ctx.fillStyle = '#F8FAFC';
      if (p.action === 'punch') {
        ctx.fillRect(8, -45, 34, 10);
      } else if (p.action === 'kick') {
        ctx.fillRect(4, -30, 42, 12);
      } else if (p.action === 'hadoken') {
        ctx.fillRect(10, -42, 28, 14);
      } else {
        ctx.fillRect(-12, -15, 10, 15);
        ctx.fillRect(2, -15, 10, 15);
      }
      ctx.restore();

      // Render AI Opponent (Ken Homage - Crimson Gi, Blond Hair)
      const ai = aiRef.current;
      ctx.save();
      ctx.translate(ai.x, ai.y);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 24, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Body Gi (Crimson)
      ctx.fillStyle = '#DC2626';
      ctx.fillRect(-14, -50, 28, 40);

      // Head & Blond Hair
      ctx.fillStyle = '#FED7AA';
      ctx.beginPath();
      ctx.arc(0, -60, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FACC15';
      ctx.beginPath();
      ctx.arc(0, -64, 12, Math.PI, 0);
      ctx.fill();

      // Black belt
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(-15, -28, 30, 6);

      // Limbs
      ctx.fillStyle = '#DC2626';
      if (ai.action === 'punch') {
        ctx.fillRect(-42, -45, 34, 10);
      } else if (ai.action === 'kick') {
        ctx.fillRect(-46, -30, 42, 12);
      } else if (ai.action === 'hadoken') {
        ctx.fillRect(-38, -42, 28, 14);
      } else {
        ctx.fillRect(-12, -15, 10, 15);
        ctx.fillRect(2, -15, 10, 15);
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, isPaused, onGameOver]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      {/* Street Fighter Health & Timer HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between gap-4 pointer-events-none">
        {/* Player Health Bar */}
        <div className="flex-1">
          <div className="flex justify-between text-[11px] font-bold text-white mb-1">
            <span>RYU (P1)</span>
            <span className="font-mono text-cyan-300">{playerHp}%</span>
          </div>
          <div className="w-full h-4 bg-slate-900 rounded-sm border border-white/20 overflow-hidden">
            <div
            className="h-full bg-gradient-to-r from-cyan-500 to-sky-300 transition-all duration-[var(--apex-motion-fast)]"
              style={{ width: `${playerHp}%` }}
            />
          </div>
        </div>

        {/* Center Round Timer */}
        <div className="w-12 h-12 rounded-lg bg-black/80 border border-amber-500/40 flex items-center justify-center shrink-0">
          <span className="text-xl font-mono font-extrabold text-amber-400 tabular-nums">{timer}</span>
        </div>

        {/* AI Health Bar */}
        <div className="flex-1">
          <div className="flex justify-between text-[11px] font-bold text-white mb-1">
            <span className="font-mono text-red-300">{aiHp}%</span>
            <span>KEN (CPU)</span>
          </div>
          <div className="w-full h-4 bg-slate-900 rounded-sm border border-white/20 overflow-hidden">
            <div
            className="h-full bg-gradient-to-l from-red-600 to-rose-400 transition-all duration-[var(--apex-motion-fast)] ml-auto"
              style={{ width: `${aiHp}%` }}
            />
          </div>
        </div>
      </div>

      {combo > 1 && (
        <div className="absolute top-20 left-10 text-lg font-extrabold font-mono text-amber-400 animate-bounce pointer-events-none">
          {combo} HIT COMBO!
        </div>
      )}

      {/* Control Guide */}
      <div className="absolute bottom-4 left-6 text-xs font-mono text-slate-400 bg-black/60 px-3 py-1.5 rounded-lg border border-white/10 pointer-events-none">
        A/D: Move · J: Punch · K: Kick · H: Hadoken · S: Block
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold text-white mb-2 tracking-tight">Street Fighter 2.5D</div>
          <p className="text-sm text-slate-300 mb-5">Unleash Hadokens, combo strikes, and defeat the grand master</p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            FIGHT! (ROUND 1)
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">K.O. — Defeat</div>
          <p className="text-sm text-slate-300 mb-4">You must defeat Sheng Long to stand a chance.</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Continue Match
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400 mb-1 tracking-tight">YOU WIN! PERFECT!</div>
          <p className="text-sm text-slate-300 mb-4">World Warrior Champion Crowned.</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Next Challenger
          </button>
        </div>
      )}
    </div>
  );
};
