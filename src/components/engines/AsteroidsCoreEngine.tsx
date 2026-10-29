import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface AsteroidsCoreEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  tier: number; // 3 = large, 2 = medium, 1 = small
  rot: number;
  rotSpeed: number;
  vertices: number[];
}

interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

export const AsteroidsCoreEngine: React.FC<AsteroidsCoreEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');

  const shipRef = useRef({
    x: 320,
    y: 240,
    vx: 0,
    vy: 0,
    rot: -Math.PI / 2,
    thrust: false,
  });

  const asteroidsRef = useRef<Asteroid[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER'>('READY');
  stateRef.current = gameState;

  const createAsteroid = (x: number, y: number, tier: number): Asteroid => {
    const radius = tier === 3 ? 36 : tier === 2 ? 22 : 12;
    const speedMult = difficulty === 'hard' ? 1.3 : difficulty === 'easy' ? 0.75 : 1.0;
    const speed = (4 - tier) * 0.9 * speedMult;
    const angle = Math.random() * Math.PI * 2;
    const vertexCount = 8;
    const vertices: number[] = [];
    for (let i = 0; i < vertexCount; i++) {
      vertices.push(0.8 + Math.random() * 0.4);
    }

    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius,
      tier,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.04,
      vertices,
    };
  };

  const spawnInitialAsteroids = () => {
    const list: Asteroid[] = [];
    const count = difficulty === 'hard' ? 6 : difficulty === 'easy' ? 3 : 4;
    for (let i = 0; i < count; i++) {
      let x = Math.random() * 640;
      let y = Math.random() * 480;
      // Avoid spawning on top of the ship
      if (Math.hypot(x - 320, y - 240) < 100) {
        x = (x + 200) % 640;
      }
      list.push(createAsteroid(x, y, 3));
    }
    asteroidsRef.current = list;
  };

  const startGame = useCallback(() => {
    shipRef.current = {
      x: 320,
      y: 240,
      vx: 0,
      vy: 0,
      rot: -Math.PI / 2,
      thrust: false,
    };
    projectilesRef.current = [];
    scoreRef.current = 0;
    livesRef.current = 3;
    setScore(0);
    setLives(3);
    spawnInitialAsteroids();
    stateRef.current = 'PLAYING';
    setGameState('PLAYING');
    audio.playClick();
  }, []);

  const shoot = useCallback(() => {
    if (stateRef.current !== 'PLAYING') return;
    const ship = shipRef.current;
    if (projectilesRef.current.length < 5) {
      projectilesRef.current.push({
        x: ship.x + Math.cos(ship.rot) * 16,
        y: ship.y + Math.sin(ship.rot) * 16,
        vx: ship.vx + Math.cos(ship.rot) * 8,
        vy: ship.vy + Math.sin(ship.rot) * 8,
        life: 50,
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
      const ship = shipRef.current;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) {
        ship.rot -= 0.08;
      }
      if (keys.has('KeyD') || keys.has('ArrowRight')) {
        ship.rot += 0.08;
      }
      if (keys.has('KeyW') || keys.has('ArrowUp')) {
        ship.thrust = true;
        ship.vx += Math.cos(ship.rot) * 0.15;
        ship.vy += Math.sin(ship.rot) * 0.15;
      } else {
        ship.thrust = false;
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
        const ship = shipRef.current;

        // Friction damping
        ship.vx *= 0.985;
        ship.vy *= 0.985;
        ship.x += ship.vx;
        ship.y += ship.vy;

        // Wrap-around screen
        if (ship.x < 0) ship.x = width;
        else if (ship.x > width) ship.x = 0;
        if (ship.y < 0) ship.y = height;
        else if (ship.y > height) ship.y = 0;

        // Update Projectiles
        for (let p = projectilesRef.current.length - 1; p >= 0; p--) {
          const proj = projectilesRef.current[p];
          proj.x += proj.vx;
          proj.y += proj.vy;
          proj.life--;

          // Screen wrap
          if (proj.x < 0) proj.x = width;
          else if (proj.x > width) proj.x = 0;
          if (proj.y < 0) proj.y = height;
          else if (proj.y > height) proj.y = 0;

          if (proj.life <= 0) {
            projectilesRef.current.splice(p, 1);
            continue;
          }

          // Check hit against asteroids
          let hit = false;
          for (let a = asteroidsRef.current.length - 1; a >= 0; a--) {
            const ast = asteroidsRef.current[a];
            if (Math.hypot(proj.x - ast.x, proj.y - ast.y) < ast.radius) {
              audio.playExplosion();
              hit = true;
              scoreRef.current += (4 - ast.tier) * 25;
              setScore(scoreRef.current);
              onScoreUpdate(scoreRef.current);

              // Split asteroid
              if (ast.tier > 1) {
                asteroidsRef.current.push(createAsteroid(ast.x, ast.y, ast.tier - 1));
                asteroidsRef.current.push(createAsteroid(ast.x, ast.y, ast.tier - 1));
              }
              asteroidsRef.current.splice(a, 1);
              break;
            }
          }

          if (hit) {
            projectilesRef.current.splice(p, 1);
          }
        }

        // Update Asteroids
        for (let a = 0; a < asteroidsRef.current.length; a++) {
          const ast = asteroidsRef.current[a];
          ast.x += ast.vx;
          ast.y += ast.vy;
          ast.rot += ast.rotSpeed;

          // Wrap
          if (ast.x < -ast.radius) ast.x = width + ast.radius;
          else if (ast.x > width + ast.radius) ast.x = -ast.radius;
          if (ast.y < -ast.radius) ast.y = height + ast.radius;
          else if (ast.y > height + ast.radius) ast.y = -ast.radius;

          // Check ship collision
          if (Math.hypot(ship.x - ast.x, ship.y - ast.y) < ast.radius + 10) {
            audio.playHit();
            livesRef.current--;
            setLives(livesRef.current);
            ship.x = 320;
            ship.y = 240;
            ship.vx = 0;
            ship.vy = 0;
            if (livesRef.current <= 0) {
              stateRef.current = 'GAMEOVER';
              setGameState('GAMEOVER');
              onGameOver(scoreRef.current);
              return;
            }
          }
        }

        // Respawn wave if all asteroids cleared
        if (asteroidsRef.current.length === 0) {
          spawnInitialAsteroids();
        }
      }

      // RENDER 3D VECTOR FIELD
      ctx.clearRect(0, 0, width, height);

      // Vector grid backdrop
      ctx.fillStyle = '#060810';
      ctx.fillRect(0, 0, width, height);

      // Rotating subtle wireframe celestial mesh
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Render Asteroids (3D Polyhedron wireframe with internal depth struts)
      asteroidsRef.current.forEach((ast) => {
        ctx.save();
        ctx.translate(ast.x, ast.y);
        ctx.rotate(ast.rot);

        // Outer poly wireframe
        ctx.strokeStyle = ast.tier === 3 ? '#F43F5E' : ast.tier === 2 ? '#FB7185' : '#FDA4AF';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 8;
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        const vLen = ast.vertices.length;
        for (let i = 0; i < vLen; i++) {
          const a = (i / vLen) * Math.PI * 2;
          const r = ast.radius * ast.vertices[i];
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();

        // Internal 3D depth facets
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        for (let i = 0; i < vLen; i += 2) {
          const a = (i / vLen) * Math.PI * 2;
          const r = ast.radius * ast.vertices[i];
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
          ctx.stroke();
        }

        ctx.shadowBlur = 0;
        ctx.restore();
      });

      // Render Projectiles (Glowing energy bolts)
      projectilesRef.current.forEach((proj) => {
        ctx.fillStyle = '#38BDF8';
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      // Render 3D Vector Ship
      const ship = shipRef.current;
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.rot);

      // Ship hull (sharp geometric triangle with metallic bevel)
      ctx.strokeStyle = '#38BDF8';
      ctx.shadowColor = '#38BDF8';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(-12, -10);
      ctx.lineTo(-6, 0);
      ctx.lineTo(-12, 10);
      ctx.closePath();
      ctx.stroke();

      // Cockpit core
      ctx.fillStyle = '#E0F2FE';
      ctx.beginPath();
      ctx.arc(0, 0, 3, 0, Math.PI * 2);
      ctx.fill();

      // Thrust flame
      if (ship.thrust) {
        ctx.strokeStyle = '#F97316';
        ctx.shadowColor = '#F97316';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(-7, -4);
        ctx.lineTo(-18 - Math.random() * 8, 0);
        ctx.lineTo(-7, 4);
        ctx.stroke();
      }

      ctx.shadowBlur = 0;
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
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Score</span>
          <span className="text-lg font-mono font-bold text-rose-400 tabular-nums">{score}</span>
        </div>
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Vessels</span>
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-xs ${
                  i < lives ? 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Asteroids Holo-Core 3D</div>
          <p className="text-sm text-slate-300 mb-5">A/D to Rotate · W/Up to Thrust · Space to Fire</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            ENGAGE INERTIAL THRUST
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Vessel Fractured</div>
          <div className="text-sm text-slate-300 mb-4">
            Cosmic Score: <span className="font-mono text-rose-300 font-bold">{score}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-rose-500 hover:bg-rose-400 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Launch Replacement
          </button>
        </div>
      )}
    </div>
  );
};
