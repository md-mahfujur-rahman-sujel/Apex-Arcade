import React, { useEffect, useRef, useState } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface AsteroidsCoreEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  seed?: number;
  highScore?: number;
  onLevelComplete?: (level: number, score: number) => void;
  onRestart?: () => void;
}

type PlayState = 'READY' | 'PLAYING' | 'GAMEOVER';

interface Ship {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  inv: number;
  thrust: boolean;
}

interface Asteroid {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  tier: number;
  rot: number;
  spin: number;
  pts: number[];
  craters: [number, number, number][];
  hue: number;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

interface Saucer {
  x: number;
  y: number;
  vx: number;
  t: number;
  shoot: number;
}

type PickupKind = 'S' | 'R' | 'T';

interface Pickup {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: PickupKind;
  life: number;
  t: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
  glow: boolean;
  ring: boolean;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  max: number;
  size: number;
}

const W = 640;
const H = 480;
const TAU = Math.PI * 2;
const RADII = [0, 15, 28, 46];
const POINTS = [0, 100, 50, 20];

const makeRng = (seed?: number) => {
  if (seed === undefined || seed === null || !Number.isFinite(seed) || seed <= 0) return Math.random;
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const AsteroidsCoreEngine: React.FC<AsteroidsCoreEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
  seed,
  highScore = 0,
  onLevelComplete,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const startRef = useRef<() => void>(() => {});
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [gameState, setGameState] = useState<PlayState>('READY');
  const [runBest, setRunBest] = useState(Math.max(0, highScore));

  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const seedRef = useRef(seed);
  seedRef.current = seed;
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;
  const callbacksRef = useRef({ score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart });
  callbacksRef.current = { score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rng = makeRng(seedRef.current);
    let scoreVal = 0;
    let livesVal = 3;
    let waveVal = 1;
    let baseline = Math.max(0, highScoreRef.current);
    let state: PlayState = 'READY';
    let ended = false;
    let runStarted = false;
    let nextLife = 10000;
    let fireCd = 0;
    let hyperCd = 0;
    let respawnT = 0;
    let clearT = 0;
    let ufoT = 1200;
    let bannerT = 0;
    let shake = 0;
    let clock = 0;
    let shieldT = 0;
    let rapidT = 0;
    let tripleT = 0;
    let animId = 0;

    let ship: Ship = spawnShip();
    let rocks: Asteroid[] = [];
    let bullets: Bullet[] = [];
    let sBullets: Bullet[] = [];
    let saucer: Saucer | null = null;
    let pickups: Pickup[] = [];
    const particles: Particle[] = [];
    const popups: Popup[] = [];

    const stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      size: 0.5 + Math.random() * 1.5,
      phase: Math.random() * TAU,
      speed: 0.15 + Math.random() * 0.5,
    }));

    const difficultySpeed = () => (difficultyRef.current === 'hard' ? 1.25 : difficultyRef.current === 'easy' ? 0.8 : 1);

    function spawnShip(): Ship {
      return { x: W / 2, y: H / 2, vx: 0, vy: 0, rot: -Math.PI / 2, inv: 130, thrust: false };
    }

    const setPlayState = (next: PlayState) => {
      state = next;
      setGameState(next);
      if (next === 'GAMEOVER' && !ended) {
        ended = true;
        callbacksRef.current.over(scoreVal);
      }
    };

    const wrap = (entity: { x: number; y: number }, margin: number) => {
      if (entity.x < -margin) entity.x += W + margin * 2;
      else if (entity.x > W + margin) entity.x -= W + margin * 2;
      if (entity.y < -margin) entity.y += H + margin * 2;
      else if (entity.y > H + margin) entity.y -= H + margin * 2;
    };

    const burst = (x: number, y: number, count: number, colors: string[], speed: number, life: number, size: number, glow = false) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * TAU;
        const velocity = speed * (0.35 + Math.random() * 0.8);
        particles.push({
          x,
          y,
          vx: Math.cos(angle) * velocity,
          vy: Math.sin(angle) * velocity,
          life,
          max: life,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: size * (0.6 + Math.random() * 0.7),
          glow,
          ring: false,
        });
      }
    };

    const ring = (x: number, y: number, color: string, size: number, life = 24) => {
      particles.push({ x, y, vx: 0, vy: 0, life, max: life, color, size, glow: true, ring: true });
    };

    const popup = (x: number, y: number, text: string, color: string, size = 16) => {
      popups.push({ x, y, text, color, life: 55, max: 55, size });
    };

    const addScore = (points: number) => {
      scoreVal += points;
      setScore(scoreVal);
      callbacksRef.current.score(scoreVal);
      if (state === 'PLAYING' && scoreVal >= nextLife) {
        nextLife += 10000;
        livesVal++;
        setLives(livesVal);
        popup(W / 2, 86, 'EXTRA SHIP!', '#86efac', 20);
        audio.playScore();
      }
    };

    const createAsteroid = (x: number, y: number, tier: number, vx?: number, vy?: number): Asteroid => {
      const radius = RADII[tier];
      const points: number[] = [];
      for (let i = 0; i < 11; i++) points.push(radius * (0.78 + rng() * 0.37));
      const craters: [number, number, number][] = [];
      for (let i = 0; i < 3; i++) craters.push([rng() * TAU, (0.1 + rng() * 0.45) * radius, (0.12 + rng() * 0.12) * radius]);
      const speed = ((0.6 + rng() * 0.8) * (4 - tier) * 0.55 + 0.4) * difficultySpeed();
      const angle = rng() * TAU;
      return {
        x,
        y,
        vx: vx ?? Math.cos(angle) * speed,
        vy: vy ?? Math.sin(angle) * speed,
        radius,
        tier,
        rot: rng() * TAU,
        spin: (rng() - 0.5) * 0.06,
        pts: points,
        craters,
        hue: 190 + Math.floor(rng() * 46),
      };
    };

    const spawnWave = () => {
      const count = Math.min(10, 3 + waveVal);
      for (let i = 0; i < count; i++) {
        let x = rng() * W;
        let y = rng() * H;
        let guard = 0;
        while (guard++ < 30 && Math.hypot(x - ship.x, y - ship.y) < 150) {
          x = rng() * W;
          y = rng() * H;
        }
        rocks.push(createAsteroid(x, y, rng() < 0.16 ? 2 : 3));
      }
      bannerT = 110;
    };

    const spawnPickup = (x: number, y: number) => {
      const kinds: PickupKind[] = ['S', 'R', 'T'];
      pickups.push({
        x,
        y,
        vx: (rng() - 0.5) * 1.2,
        vy: (rng() - 0.5) * 1.2,
        kind: kinds[Math.floor(rng() * kinds.length)],
        life: 520,
        t: 0,
      });
    };

    const breakRock = (index: number) => {
      const rock = rocks[index];
      rocks.splice(index, 1);
      addScore(POINTS[rock.tier]);
      if (rock.tier === 3) audio.playExplosion(); else audio.playHit();
      shake = Math.max(shake, rock.tier * 1.6);
      burst(rock.x, rock.y, 8 + rock.tier * 6, ['#94a3b8', '#e2e8f0', '#64748b'], 3 + rock.tier, 34, 2.6);
      if (rock.tier > 1) {
        for (let i = 0; i < 2; i++) {
          rocks.push(createAsteroid(rock.x, rock.y, rock.tier - 1, rock.vx + (rng() - 0.5) * 2.4, rock.vy + (rng() - 0.5) * 2.4));
        }
      }
      if (rng() < 0.07) spawnPickup(rock.x, rock.y);
    };

    const destroySaucer = () => {
      if (!saucer) return;
      addScore(200);
      audio.playExplosion();
      shake = Math.max(shake, 6);
      burst(saucer.x, saucer.y, 26, ['#f472b6', '#fde68a', '#ffffff'], 5, 36, 3, true);
      ring(saucer.x, saucer.y, '#f472b6', 80, 26);
      popup(saucer.x, saucer.y - 24, '+200', '#f472b6', 15);
      spawnPickup(saucer.x, saucer.y);
      saucer = null;
    };

    const hitShip = () => {
      if (respawnT > 0 || ship.inv > 0 || state !== 'PLAYING') return;
      livesVal--;
      setLives(livesVal);
      respawnT = 100;
      audio.playHit();
      shake = Math.max(shake, 13);
      burst(ship.x, ship.y, 36, ['#60a5fa', '#ffffff', '#fbbf24'], 5, 44, 3, true);
      ring(ship.x, ship.y, '#60a5fa', 110, 30);
      ship.vx = 0;
      ship.vy = 0;
      shieldT = rapidT = tripleT = 0;
    };

    const shoot = () => {
      if (state !== 'PLAYING' || respawnT > 0) return;
      const cap = tripleT > 0 ? 10 : 5;
      if (bullets.length > cap) return;
      const offsets = tripleT > 0 ? [-0.17, 0, 0.17] : [0];
      for (const offset of offsets) {
        const angle = ship.rot + offset;
        bullets.push({
          x: ship.x + Math.cos(ship.rot) * 16,
          y: ship.y + Math.sin(ship.rot) * 16,
          vx: Math.cos(angle) * 8.5 + ship.vx * 0.4,
          vy: Math.sin(angle) * 8.5 + ship.vy * 0.4,
          life: 52,
        });
      }
      audio.playLaser();
      fireCd = rapidT > 0 ? 5 : 11;
    };

    const spawnSaucer = () => {
      const dir = rng() < 0.5 ? 1 : -1;
      saucer = {
        x: dir > 0 ? -30 : W + 30,
        y: 70 + rng() * (H - 140),
        vx: dir * (difficultyRef.current === 'hard' ? 2 : 1.6),
        t: 0,
        shoot: 70,
      };
      ring(saucer.x, saucer.y, '#f472b6', 46, 18);
    };

    const hyperJump = () => {
      let nx = ship.x;
      let ny = ship.y;
      for (let i = 0; i < 20; i++) {
        nx = 30 + Math.random() * (W - 60);
        ny = 30 + Math.random() * (H - 60);
        if (!rocks.some((rock) => Math.hypot(rock.x - nx, rock.y - ny) < rock.radius + 90)) break;
      }
      ring(ship.x, ship.y, '#67e8f9', 60, 20);
      ship.x = nx;
      ship.y = ny;
      ship.vx *= 0.3;
      ship.vy *= 0.3;
      ship.inv = 45;
      hyperCd = 180;
      audio.playDash();
      ring(nx, ny, '#67e8f9', 60, 20);
    };

    const finishRun = () => {
      setPlayState('GAMEOVER');
    };

    const startGame = () => {
      const restarting = runStarted && (state === 'GAMEOVER' || ended);
      baseline = Math.max(baseline, highScoreRef.current, scoreVal);
      rng = makeRng(seedRef.current);
      scoreVal = 0;
      livesVal = 3;
      waveVal = 1;
      ended = false;
      runStarted = true;
      nextLife = 10000;
      fireCd = 0;
      hyperCd = 0;
      respawnT = 0;
      clearT = 0;
      ufoT = 1200;
      bannerT = 0;
      shake = 0;
      clock = 0;
      shieldT = 0;
      rapidT = 0;
      tripleT = 0;
      ship = spawnShip();
      rocks = [];
      bullets = [];
      sBullets = [];
      saucer = null;
      pickups = [];
      particles.length = 0;
      popups.length = 0;
      setScore(0);
      setLives(3);
      setWave(1);
      setRunBest(baseline);
      setGameState('PLAYING');
      state = 'PLAYING';
      spawnWave();
      audio.playClick();
      if (restarting) callbacksRef.current.restart?.();
    };
    startRef.current = startGame;

    const keys = new Set<string>();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
      keys.add(event.code);
      if (event.code === 'Space') {
        event.preventDefault();
        if (state === 'PLAYING') {
          if (fireCd <= 0) shoot();
        } else if (state === 'READY' || state === 'GAMEOVER') {
          startGame();
        }
      }
      if ((event.code === 'ShiftLeft' || event.code === 'ShiftRight' || event.code === 'KeyX') && state === 'PLAYING' && hyperCd <= 0) {
        hyperJump();
      }
      if ((event.code === 'Enter' || event.code === 'KeyR') && state === 'GAMEOVER') {
        startGame();
      }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };
    const clearKeys = () => keys.clear();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);

    const update = () => {
      clock++;
      if (bannerT > 0) bannerT--;
      if (shieldT > 0) shieldT--;
      if (rapidT > 0) rapidT--;
      if (tripleT > 0) tripleT--;
      if (fireCd > 0) fireCd--;
      if (hyperCd > 0) hyperCd--;
      if (shake > 0) shake *= 0.9;

      if (respawnT > 0) {
        respawnT--;
        if (respawnT === 0) {
          if (livesVal <= 0) {
            finishRun();
            return;
          }
          ship = spawnShip();
        }
      }

      if (respawnT <= 0) {
        const turn = (keys.has('ArrowRight') || keys.has('KeyD') ? 1 : 0) - (keys.has('ArrowLeft') || keys.has('KeyA') ? 1 : 0);
        ship.rot += turn * 0.07;
        ship.thrust = keys.has('ArrowUp') || keys.has('KeyW');
        if (ship.thrust) {
          ship.vx += Math.cos(ship.rot) * 0.14;
          ship.vy += Math.sin(ship.rot) * 0.14;
          if (clock % 2 === 0) {
            burst(
              ship.x - Math.cos(ship.rot) * 14,
              ship.y - Math.sin(ship.rot) * 14,
              1,
              ['#fbbf24', '#fb923c', '#fde68a'],
              2.2,
              16,
              2.4,
              true
            );
          }
        }
        const speed = Math.hypot(ship.vx, ship.vy);
        if (speed > 7) {
          ship.vx *= 7 / speed;
          ship.vy *= 7 / speed;
        }
        ship.vx *= 0.993;
        ship.vy *= 0.993;
        ship.x += ship.vx;
        ship.y += ship.vy;
        wrap(ship, 10);
        if (ship.inv > 0) ship.inv--;
        if (keys.has('Space') && fireCd <= 0) shoot();
      }

      for (const rock of rocks) {
        rock.x += rock.vx;
        rock.y += rock.vy;
        rock.rot += rock.spin;
        wrap(rock, rock.radius);
      }

      for (let i = bullets.length - 1; i >= 0; i--) {
        const bullet = bullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        wrap(bullet, 0);
        if (--bullet.life <= 0) {
          bullets.splice(i, 1);
          continue;
        }
        let hit = false;
        for (let j = rocks.length - 1; j >= 0; j--) {
          if (Math.hypot(bullet.x - rocks[j].x, bullet.y - rocks[j].y) < rocks[j].radius * 0.9) {
            breakRock(j);
            hit = true;
            break;
          }
        }
        if (!hit && saucer && Math.hypot(bullet.x - saucer.x, bullet.y - saucer.y) < 18) {
          destroySaucer();
          hit = true;
        }
        if (hit) bullets.splice(i, 1);
      }

      if (!saucer && waveVal >= 2 && --ufoT <= 0) {
        spawnSaucer();
        ufoT = 900 + Math.floor(rng() * 700);
      }
      if (saucer) {
        saucer.t++;
        saucer.x += saucer.vx;
        saucer.y += Math.sin(saucer.t * 0.04) * 1.2;
        if (saucer.x < -45 || saucer.x > W + 45) {
          saucer = null;
        } else if (respawnT <= 0 && --saucer.shoot <= 0) {
          saucer.shoot = 60 + Math.floor(rng() * 40);
          const angle =
            Math.atan2(ship.y - saucer.y, ship.x - saucer.x) + (rng() - 0.5) * 2 * Math.max(0.12, 0.7 - waveVal * 0.06);
          sBullets.push({ x: saucer.x, y: saucer.y, vx: Math.cos(angle) * 3.6, vy: Math.sin(angle) * 3.6, life: 120 });
          audio.playLaser();
        }
      }

      for (let i = sBullets.length - 1; i >= 0; i--) {
        const bullet = sBullets[i];
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        wrap(bullet, 0);
        if (--bullet.life <= 0) {
          sBullets.splice(i, 1);
          continue;
        }
        if (respawnT <= 0 && ship.inv <= 0 && Math.hypot(bullet.x - ship.x, bullet.y - ship.y) < 12) {
          sBullets.splice(i, 1);
          if (shieldT > 0) {
            shieldT = Math.max(0, shieldT - 60);
            ring(ship.x, ship.y, '#67e8f9', 50, 14);
            audio.playClick();
          } else {
            hitShip();
          }
        }
      }

      if (respawnT <= 0 && ship.inv <= 0) {
        for (let i = rocks.length - 1; i >= 0; i--) {
          if (Math.hypot(rocks[i].x - ship.x, rocks[i].y - ship.y) < rocks[i].radius * 0.85 + 11) {
            if (shieldT > 0) {
              breakRock(i);
              shieldT = Math.max(0, shieldT - 45);
            } else {
              hitShip();
            }
            break;
          }
        }
        if (respawnT <= 0 && saucer && Math.hypot(saucer.x - ship.x, saucer.y - ship.y) < 28) {
          destroySaucer();
          if (shieldT <= 0) hitShip();
        }
      }

      for (let i = pickups.length - 1; i >= 0; i--) {
        const pickup = pickups[i];
        pickup.t++;
        pickup.x += pickup.vx;
        pickup.y += pickup.vy;
        wrap(pickup, 10);
        if (--pickup.life <= 0) {
          pickups.splice(i, 1);
          continue;
        }
        if (respawnT <= 0 && Math.hypot(pickup.x - ship.x, pickup.y - ship.y) < 24) {
          if (pickup.kind === 'S') shieldT = 600;
          else if (pickup.kind === 'R') rapidT = 600;
          else tripleT = 600;
          audio.playScore();
          ring(pickup.x, pickup.y, '#86efac', 50, 20);
          popup(pickup.x, pickup.y - 16, pickup.kind === 'S' ? 'SHIELD' : pickup.kind === 'R' ? 'RAPID FIRE' : 'TRIPLE SHOT', '#86efac', 14);
          pickups.splice(i, 1);
        }
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        if (!particle.ring) {
          particle.x += particle.vx;
          particle.y += particle.vy;
          particle.vx *= 0.98;
          particle.vy *= 0.98;
        }
        if (--particle.life <= 0) particles.splice(i, 1);
      }
      for (let i = popups.length - 1; i >= 0; i--) {
        popups[i].y -= 0.35;
        if (--popups[i].life <= 0) popups.splice(i, 1);
      }

      if (rocks.length === 0 && !saucer && respawnT <= 0) {
        if (clearT === 0) clearT = 100;
        else if (--clearT === 0) {
          const cleared = waveVal;
          const bonus = 200 + cleared * 50;
          addScore(bonus);
          popup(W / 2, 238, `WAVE ${cleared} CLEAR  +${bonus}`, '#67e8f9', 20);
          ring(W / 2, 238, '#67e8f9', 120, 26);
          callbacksRef.current.level?.(cleared, scoreVal);
          waveVal++;
          setWave(waveVal);
          spawnWave();
          audio.playScore();
        }
      }
    };

    const drawRock = (rock: Asteroid) => {
      const path = (ox: number, oy: number) => {
        ctx.beginPath();
        for (let i = 0; i < rock.pts.length; i++) {
          const angle = (i / rock.pts.length) * TAU + rock.rot;
          const x = rock.x + Math.cos(angle) * rock.pts[i] + ox;
          const y = rock.y + Math.sin(angle) * rock.pts[i] + oy;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.closePath();
      };
      path(4, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();
      path(0, 0);
      const gradient = ctx.createRadialGradient(rock.x - rock.radius * 0.35, rock.y - rock.radius * 0.4, rock.radius * 0.1, rock.x, rock.y, rock.radius * 1.1);
      gradient.addColorStop(0, `hsl(${rock.hue}, 18%, 64%)`);
      gradient.addColorStop(1, `hsl(${rock.hue}, 24%, 20%)`);
      ctx.fillStyle = gradient;
      ctx.fill();
      ctx.strokeStyle = 'rgba(203,213,225,0.55)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      for (const [angle, distance, size] of rock.craters) {
        ctx.beginPath();
        ctx.arc(rock.x + Math.cos(angle + rock.rot) * distance, rock.y + Math.sin(angle + rock.rot) * distance, size, 0, TAU);
        ctx.fill();
      }
    };

    const drawShip = () => {
      ctx.save();
      ctx.translate(ship.x, ship.y);
      ctx.rotate(ship.rot);
      if (ship.thrust) {
        ctx.fillStyle = '#fbbf24';
        ctx.beginPath();
        ctx.moveTo(-8, -4);
        ctx.lineTo(-18 - Math.random() * 8, 0);
        ctx.lineTo(-8, 4);
        ctx.closePath();
        ctx.fill();
      }
      ctx.shadowColor = '#60a5fa';
      ctx.shadowBlur = 12;
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-11, -11);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#2563eb';
      ctx.beginPath();
      ctx.moveTo(16, 0);
      ctx.lineTo(-11, 11);
      ctx.lineTo(-6, 0);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#e0f2fe';
      ctx.beginPath();
      ctx.ellipse(2, 0, 5, 2.6, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    };

    const render = () => {
      const shakeX = shake > 0.2 ? (Math.random() - 0.5) * shake : 0;
      const shakeY = shake > 0.2 ? (Math.random() - 0.5) * shake : 0;
      ctx.setTransform(1, 0, 0, 1, shakeX, shakeY);
      ctx.clearRect(-20, -20, W + 40, H + 40);

      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#05060f');
      sky.addColorStop(0.55, '#0b1030');
      sky.addColorStop(1, '#150f2e');
      ctx.fillStyle = sky;
      ctx.fillRect(-20, -20, W + 40, H + 40);

      for (const [x, y, r, color] of [[160, 130, 250, 'rgba(99,102,241,0.18)'], [520, 350, 290, 'rgba(236,72,153,0.12)']] as const) {
        const glow = ctx.createRadialGradient(x, y, 10, x, y, r);
        glow.addColorStop(0, color);
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }

      for (const star of stars) {
        const alpha = 0.35 + Math.sin(clock * 0.03 + star.phase) * 0.25;
        ctx.fillStyle = `rgba(219,234,254,${Math.max(0.12, alpha)})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }

      for (const rock of rocks) drawRock(rock);

      for (const pickup of pickups) {
        const color = pickup.kind === 'S' ? '#67e8f9' : pickup.kind === 'R' ? '#fbbf24' : '#f472b6';
        if (pickup.life < 120 && Math.floor(clock / 5) % 2) continue;
        ctx.save();
        ctx.translate(pickup.x, pickup.y);
        ctx.rotate(pickup.t * 0.03);
        ctx.shadowColor = color;
        ctx.shadowBlur = 14;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.strokeRect(-10, -10, 20, 20);
        ctx.shadowBlur = 0;
        ctx.fillStyle = color;
        ctx.font = '800 14px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(pickup.kind, 0, 1);
        ctx.restore();
      }

      if (saucer) {
        ctx.save();
        ctx.translate(saucer.x, saucer.y);
        ctx.shadowColor = '#f472b6';
        ctx.shadowBlur = 14;
        ctx.fillStyle = '#be185d';
        ctx.beginPath();
        ctx.ellipse(0, 3, 22, 8, 0, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.ellipse(0, -2, 10, 8, 0, Math.PI, 0);
        ctx.fill();
        for (let i = -2; i <= 2; i++) {
          ctx.fillStyle = (Math.floor(clock / 6) + i) % 2 ? '#fde68a' : '#ffffff';
          ctx.fillRect(i * 8 - 1.5, 2, 3, 3);
        }
        ctx.restore();
      }

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (const bullet of bullets) {
        ctx.fillStyle = '#fde68a';
        ctx.shadowColor = '#fde68a';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 2.6, 0, TAU);
        ctx.fill();
      }
      for (const bullet of sBullets) {
        ctx.fillStyle = '#f472b6';
        ctx.shadowColor = '#f472b6';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 3.6, 0, TAU);
        ctx.fill();
      }
      ctx.restore();

      if (respawnT <= 0 && !(ship.inv > 0 && Math.floor(clock / 5) % 2)) {
        drawShip();
        if (shieldT > 0) {
          ctx.save();
          ctx.strokeStyle = `rgba(103,232,249,${shieldT < 120 && Math.floor(clock / 6) % 2 ? 0.25 : 0.8})`;
          ctx.lineWidth = 2;
          ctx.shadowColor = '#67e8f9';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(ship.x, ship.y, 22, 0, TAU);
          ctx.stroke();
          ctx.restore();
        }
      }

      for (const particle of particles) {
        const alpha = Math.max(0, particle.life / particle.max);
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha * 1.4);
        if (particle.glow) ctx.globalCompositeOperation = 'lighter';
        if (particle.ring) {
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * (1 - alpha) + 6, 0, TAU);
          ctx.stroke();
        } else {
          ctx.fillStyle = particle.color;
          ctx.shadowColor = particle.glow ? particle.color : 'transparent';
          ctx.shadowBlur = particle.glow ? 8 : 0;
          ctx.beginPath();
          ctx.arc(particle.x, particle.y, particle.size * alpha, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }

      for (const item of popups) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, (item.life / item.max) * 1.8);
        ctx.fillStyle = item.color;
        ctx.font = `800 ${item.size}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.text, item.x, item.y);
        ctx.restore();
      }

      if (bannerT > 0 && state === 'PLAYING') {
        const alpha = Math.min(1, bannerT / 40);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#67e8f9';
        ctx.shadowColor = '#67e8f9';
        ctx.shadowBlur = 18;
        ctx.font = '800 40px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`WAVE ${waveVal}`, W / 2, 190);
        ctx.restore();
      }

      if (state === 'PLAYING') {
        for (let i = 0; i < livesVal; i++) {
          ctx.save();
          ctx.translate(24 + i * 22, H - 22);
          ctx.rotate(-Math.PI / 2);
          ctx.fillStyle = '#60a5fa';
          ctx.beginPath();
          ctx.moveTo(9, 0);
          ctx.lineTo(-6, -6);
          ctx.lineTo(-3, 0);
          ctx.lineTo(-6, 6);
          ctx.fill();
          ctx.restore();
        }
        const timers: [number, string, string][] = [
          [shieldT, '#67e8f9', 'SHIELD'],
          [rapidT, '#fbbf24', 'RAPID'],
          [tripleT, '#f472b6', 'TRIPLE'],
        ];
        timers.forEach(([value, color, label], index) => {
          if (value <= 0) return;
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fillRect(W / 2 - 110 + index * 78, H - 24, 70, 6);
          ctx.fillStyle = color;
          ctx.fillRect(W / 2 - 110 + index * 78, H - 24, (70 * value) / 600, 6);
          ctx.fillStyle = color;
          ctx.font = '800 10px system-ui, sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(label, W / 2 - 75 + index * 78, H - 32);
        });
        ctx.fillStyle = hyperCd > 0 ? '#8b93b3' : '#67e8f9';
        ctx.font = '700 11px ui-monospace, monospace';
        ctx.textAlign = 'right';
        ctx.fillText(hyperCd > 0 ? `HYPERSPACE ${Math.ceil(hyperCd / 60)}s` : 'HYPERSPACE READY', W - 14, H - 14);
      }

      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.75);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    };

    const loop = () => {
      animId = requestAnimationFrame(loop);
      if (pausedRef.current) return;
      if (state === 'PLAYING') update();
      render();
    };

    animId = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
    };
  }, [seed]);

  const best = Math.max(highScore, runBest, score);
  const newBest = score > 0 && score > runBest;

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />

      <div className="absolute top-3 left-4 right-4 flex items-start justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Score</span>
          <span className="text-lg font-mono font-bold text-amber-300 tabular-nums">{score}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-center">
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Wave</div>
            <div className="text-base font-mono font-bold text-cyan-300 tabular-nums">{wave}</div>
          </div>
          <div className="bg-black/55 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-center">
            <div className="text-[9px] uppercase tracking-wider text-slate-400">Best</div>
            <div className="text-base font-mono font-bold text-violet-300 tabular-nums">{best}</div>
          </div>
        </div>
      </div>

      <div className="absolute top-16 right-4 flex items-center gap-1.5 bg-black/45 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 pointer-events-none">
        <span className="text-[9px] uppercase tracking-wider text-slate-400">Vessels</span>
        <div className="flex gap-1">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={`h-2.5 w-2.5 rounded-xs ${
                index < lives ? 'bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-white mb-1 tracking-tight">Starfall Rift 3D</div>
          <p className="text-xs uppercase tracking-[0.22em] text-cyan-300/80 mb-4">Wrap-around asteroid field</p>
          <p className="text-sm text-slate-300 mb-1">Rotate with A/D · thrust with W · fire with Space</p>
          <p className="text-xs text-slate-400 mb-5">Shift/X hyperspace · grab S, R, or T upgrades</p>
          <button
            onClick={() => startRef.current()}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-lg transition-colors cursor-pointer"
          >
            LAUNCH STARFALL
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-rose-300 mb-1 tracking-tight">Vessel Fractured</div>
          <div className="text-xs uppercase tracking-[0.2em] text-slate-400 mb-4">Wave {wave} reached</div>
          <div className="text-sm text-slate-300 mb-1">
            Score: <span className="font-mono text-amber-300 font-bold">{score}</span>
          </div>
          {newBest && <div className="text-xs font-bold text-emerald-300 mb-1">New personal best</div>}
          <div className="text-xs text-slate-400 mb-5">
            Best: <span className="font-mono text-violet-300">{best}</span>
          </div>
          <button
            onClick={() => startRef.current()}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-lg transition-colors cursor-pointer"
          >
            LAUNCH REPLACEMENT
          </button>
        </div>
      )}
    </div>
  );
};
