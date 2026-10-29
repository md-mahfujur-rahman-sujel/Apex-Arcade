import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface ActionCombatEngineProps {
  variant?: string; // 'hollow' | 'deadcells' | 'castlevania' | 'metroid' | 'cuphead'
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

interface Enemy {
  x: number;
  y: number;
  vx: number;
  hp: number;
  maxHp: number;
  type: string;
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  isParryable?: boolean;
}

export const ActionCombatEngine: React.FC<ActionCombatEngineProps> = ({
  variant = 'hollow',
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(300);
  const [specialGauge, setSpecialGauge] = useState(0); // Soul / Cells / Missiles / Super
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');

  const playerRef = useRef({
    x: 100,
    y: 350,
    vx: 0,
    vy: 0,
    facing: 1, // 1 right, -1 left
    isGrounded: true,
    isSlashing: 0,
    isDashing: 0,
    isMorphBall: false,
  });

  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const pHpRef = useRef(100);
  const bossHpRef = useRef(300);
  const specialRef = useRef(0);
  const scoreRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');
  stateRef.current = gameState;

  // Thematic configuration
  const theme = {
    title:
      variant === 'hollow'
        ? 'Hallownest Nail Duel'
        : variant === 'deadcells'
        ? 'Prisoner Quarters Slasher'
        : variant === 'castlevania'
        ? 'Dracula Crypt Infiltration'
        : variant === 'metroid'
        ? 'Zebes Incursion: Sector 1'
        : 'Inkwell Isle Boss Showdown',
    accent:
      variant === 'hollow'
        ? '#E2E8F0'
        : variant === 'deadcells'
        ? '#8B5CF6'
        : variant === 'castlevania'
        ? '#DC2626'
        : variant === 'metroid'
        ? '#06B6D4'
        : '#F87171',
    bossName:
      variant === 'hollow'
        ? 'False Knight'
        : variant === 'deadcells'
        ? 'Concierge'
        : variant === 'castlevania'
        ? 'Gaibon & Slogra'
        : variant === 'metroid'
        ? 'Torizo Sentinel'
        : 'The Root Pack',
    attackName:
      variant === 'hollow'
        ? 'Nail Strike (J)'
        : variant === 'deadcells'
        ? 'Broadsword Slash (J)'
        : variant === 'castlevania'
        ? 'Vampire Killer Whip (J)'
        : variant === 'metroid'
        ? 'Plasma Beam (J)'
        : 'Pea Shooter (J)',
    specialName:
      variant === 'hollow'
        ? 'Soul Focus (K)'
        : variant === 'deadcells'
        ? 'Roll Dodge (K)'
        : variant === 'castlevania'
        ? 'Backdash (K)'
        : variant === 'metroid'
        ? 'Morph Ball (S)'
        : 'Pink Parry (K)',
  };

  const spawnEnemies = () => {
    enemiesRef.current = [
      {
        x: 480,
        y: 350,
        vx: -1.2,
        hp: 300,
        maxHp: 300,
        type: 'boss',
      },
    ];
  };

  const startGame = useCallback(() => {
    playerRef.current = {
      x: 100,
      y: 350,
      vx: 0,
      vy: 0,
      facing: 1,
      isGrounded: true,
      isSlashing: 0,
      isDashing: 0,
      isMorphBall: false,
    };
    projectilesRef.current = [];
    pHpRef.current = 100;
    bossHpRef.current = 300;
    specialRef.current = 0;
    scoreRef.current = 0;
    setPlayerHp(100);
    setEnemyHp(300);
    setSpecialGauge(0);
    spawnEnemies();
    setGameState('PLAYING');
    stateRef.current = 'PLAYING';
    audio.playClick();
  }, []);

  const attack = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    const p = playerRef.current;
    if (p.isSlashing <= 0) {
      p.isSlashing = 14;
      audio.playPongBeep(true);

      // Metroid or Cuphead shoot projectile
      if (variant === 'metroid' || variant === 'cuphead') {
        audio.playLaser();
        projectilesRef.current.push({
          x: p.x + p.facing * 20,
          y: p.y - 18,
          vx: p.facing * 9,
        });
      } else {
        // Melee check
        enemiesRef.current.forEach((en) => {
          if (Math.abs(p.x - en.x) < 85 && Math.abs(p.y - en.y) < 40) {
            audio.playHit();
            en.hp -= 25;
            bossHpRef.current = en.hp;
            setEnemyHp(en.hp);
            scoreRef.current += 100;
            onScoreUpdate(scoreRef.current);
            specialRef.current = Math.min(100, specialRef.current + 18);
            setSpecialGauge(specialRef.current);

            // Pogo bounce if attacking downwards in air (Hollow Knight)
            if (!p.isGrounded && variant === 'hollow') {
              p.vy = -7.5;
              audio.playJump();
            }

            if (en.hp <= 0) {
              stateRef.current = 'VICTORY';
              setGameState('VICTORY');
              audio.playScore();
              onGameOver(scoreRef.current + 1000);
            }
          }
        });
      }
    }
  }, [onGameOver, onScoreUpdate, variant]);

  const useSpecial = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    const p = playerRef.current;

    if (variant === 'hollow') {
      // Soul Heal
      if (specialRef.current >= 33) {
        specialRef.current -= 33;
        setSpecialGauge(specialRef.current);
        pHpRef.current = Math.min(100, pHpRef.current + 33);
        setPlayerHp(pHpRef.current);
        audio.playScore();
      }
    } else if (variant === 'deadcells' || variant === 'castlevania' || variant === 'cuphead') {
      // Dash / Roll with I-frames
      if (p.isDashing <= 0) {
        p.isDashing = 16;
        p.vx = p.facing * (variant === 'castlevania' ? -9 : 10);
        audio.playDash();
      }
    }
  }, [variant]);

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
        attack();
      } else if (e.code === 'KeyK') {
        e.preventDefault();
        useSpecial();
      } else if (e.code === 'Space' || e.code === 'KeyW' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (playerRef.current.isGrounded) {
          playerRef.current.vy = -9.2;
          playerRef.current.isGrounded = false;
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
      if (p.isDashing > 0) return;

      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        p.vx = -4.5;
        p.facing = -1;
      } else if (keys.has('KeyD') || keys.has('ArrowRight')) {
        p.vx = 4.5;
        p.facing = 1;
      } else {
        p.vx = 0;
      }

      if (variant === 'metroid' && (keys.has('KeyS') || keys.has('ArrowDown'))) {
        p.isMorphBall = true;
      } else {
        p.isMorphBall = false;
      }
    }, 16);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      clearInterval(interval);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [attack, isPaused, startGame, useSpecial, variant]);

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const speedMult = difficulty === 'easy' ? 0.8 : difficulty === 'hard' ? 1.35 : 1.0;

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

        if (p.isSlashing > 0) p.isSlashing--;
        if (p.isDashing > 0) p.isDashing--;

        // Gravity & Movement
        p.x = Math.max(30, Math.min(width - 30, p.x + p.vx));
        p.vy += 0.45;
        p.y += p.vy;
        if (p.y >= 350) {
          p.y = 350;
          p.vy = 0;
          p.isGrounded = true;
        }

        // Projectiles Update
        for (let i = projectilesRef.current.length - 1; i >= 0; i--) {
          const pr = projectilesRef.current[i];
          pr.x += pr.vx;

          // Check hit against boss
          for (const en of enemiesRef.current) {
            if (Math.hypot(pr.x - en.x, pr.y - (en.y - 25)) < 40) {
              audio.playHit();
              en.hp -= 20;
              bossHpRef.current = en.hp;
              setEnemyHp(en.hp);
              scoreRef.current += 50;
              onScoreUpdate(scoreRef.current);
              projectilesRef.current.splice(i, 1);
              if (en.hp <= 0) {
                stateRef.current = 'VICTORY';
                setGameState('VICTORY');
                audio.playScore();
                onGameOver(scoreRef.current + 1000);
              }
              break;
            }
          }

          if (pr.x < 0 || pr.x > width) {
            projectilesRef.current.splice(i, 1);
          }
        }

        // Boss AI
        enemiesRef.current.forEach((en) => {
          en.x += en.vx * speedMult;
          if (en.x < 240) en.vx = Math.abs(en.vx);
          if (en.x > width - 80) en.vx = -Math.abs(en.vx);

          // Contact damage (unless player is dashing)
          if (p.isDashing <= 0 && Math.hypot(p.x - en.x, p.y - en.y) < 45) {
            audio.playHit();
            pHpRef.current = Math.max(0, pHpRef.current - (difficulty === 'hard' ? 20 : 12));
            setPlayerHp(pHpRef.current);
            // Knockback
            p.vx = -p.facing * 8;
            p.vy = -4;

            if (pHpRef.current <= 0) {
              stateRef.current = 'GAMEOVER';
              setGameState('GAMEOVER');
              audio.playExplosion();
              onGameOver(scoreRef.current);
            }
          }
        });
      }

      // RENDER
      ctx.clearRect(0, 0, width, height);

      // Dynamic 2.5D Atmospheric Backdrop
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
      if (variant === 'hollow') {
        bgGrad.addColorStop(0, '#020617');
        bgGrad.addColorStop(1, '#0F172A');
      } else if (variant === 'deadcells') {
        bgGrad.addColorStop(0, '#2E1065');
        bgGrad.addColorStop(1, '#090D16');
      } else if (variant === 'castlevania') {
        bgGrad.addColorStop(0, '#450A0A');
        bgGrad.addColorStop(1, '#0A0A0A');
      } else if (variant === 'metroid') {
        bgGrad.addColorStop(0, '#042F2E');
        bgGrad.addColorStop(1, '#020617');
      } else {
        // Cuphead 1930s sepia / parchment
        bgGrad.addColorStop(0, '#451A03');
        bgGrad.addColorStop(1, '#1C1917');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 3D Perspective Ground
      const floorY = 350;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, floorY, width, height - floorY);
      ctx.strokeStyle = theme.accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, floorY);
      ctx.lineTo(width, floorY);
      ctx.stroke();

      // Render Projectiles
      projectilesRef.current.forEach((pr) => {
        ctx.fillStyle = theme.accent;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(pr.x, pr.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Render Enemies (Boss)
      enemiesRef.current.forEach((en) => {
        ctx.save();
        ctx.translate(en.x, en.y);

        // Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.beginPath();
        ctx.ellipse(0, 0, 32, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Boss Mesh
        ctx.fillStyle = theme.accent;
        ctx.shadowColor = theme.accent;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(0, -32, 28, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Boss Eyes
        ctx.fillStyle = '#0F172A';
        ctx.fillRect(-14, -38, 8, 6);
        ctx.fillRect(6, -38, 8, 6);

        ctx.restore();
      });

      // Render Player
      const p = playerRef.current;
      ctx.save();
      ctx.translate(p.x, p.y);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      if (p.isMorphBall) {
        // Samus Morph Ball
        ctx.fillStyle = '#06B6D4';
        ctx.beginPath();
        ctx.arc(0, -10, 10, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Player Knight / Hero Body
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-8, -32, 16, 30);

        // Head / Mask
        ctx.fillStyle = '#CBD5E1';
        ctx.beginPath();
        ctx.arc(0, -38, 10, 0, Math.PI * 2);
        ctx.fill();

        // Weapon Slash Arc
        if (p.isSlashing > 0) {
          ctx.strokeStyle = theme.accent;
          ctx.shadowColor = theme.accent;
          ctx.shadowBlur = 14;
          ctx.lineWidth = 3.5;
          ctx.beginPath();
          ctx.arc(p.facing * 18, -25, 26, -0.6, 1.6);
          ctx.stroke();
          ctx.shadowBlur = 0;
        }
      }

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, isPaused, theme.accent, variant]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      {/* Top Combat HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between gap-6 pointer-events-none">
        {/* Player Health */}
        <div className="w-48 bg-black/60 backdrop-blur-md p-2.5 rounded-lg border border-white/10">
          <div className="flex justify-between text-xs font-bold text-white mb-1">
            <span>HEALTH</span>
            <span className="font-mono text-cyan-300">{playerHp}%</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-sm overflow-hidden">
            <div
            className="h-full bg-cyan-400 transition-all duration-[var(--apex-motion-fast)]"
              style={{ width: `${playerHp}%` }}
            />
          </div>
        </div>

        {/* Boss Health */}
        <div className="w-48 bg-black/60 backdrop-blur-md p-2.5 rounded-lg border border-white/10">
          <div className="flex justify-between text-xs font-bold text-white mb-1">
            <span>{theme.bossName}</span>
            <span className="font-mono text-red-400">{enemyHp} HP</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-sm overflow-hidden">
            <div
            className="h-full bg-red-600 transition-all duration-[var(--apex-motion-fast)]"
              style={{ width: `${(enemyHp / 300) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Control Help Bar */}
      <div className="absolute bottom-4 left-6 text-xs font-mono text-slate-300 bg-black/70 px-3 py-1.5 rounded-lg border border-white/10 pointer-events-none">
        A/D: Move · Space: Leap · {theme.attackName} · {theme.specialName}
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold text-white mb-2 tracking-tight">{theme.title}</div>
          <p className="text-sm text-slate-300 mb-5">Master responsive combat, evade attacks, and defeat the boss</p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            ENGAGE COMBAT
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Vanquished</div>
          <p className="text-sm text-slate-300 mb-4">Rise again to reclaim honor.</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Respawn at Checkpoint
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-emerald-400 mb-1 tracking-tight">Boss Slain!</div>
          <p className="text-sm text-slate-300 mb-4">You triumphed in the arena.</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Replay Encounter
          </button>
        </div>
      )}
    </div>
  );
};
