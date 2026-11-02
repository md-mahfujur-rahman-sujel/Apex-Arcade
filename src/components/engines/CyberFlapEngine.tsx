import React, { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface CyberFlapEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  seed?: number;
  highScore?: number;
  onLevelComplete?: (level: number, score: number) => void;
  onRestart?: () => void;
}

type GameState = 'READY' | 'PLAYING' | 'GAMEOVER';

interface Pipe {
  x: number;
  gap: number;
  baseY: number;
  gapY: number;
  amp: number;
  phase: number;
  passed: boolean;
  hue: number;
  mote: { got: boolean; phase: number } | null;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  grav: number;
}

interface Floater {
  x: number;
  y: number;
  text: string;
  color: string;
  life: number;
  maxLife: number;
}

interface Chapter {
  name: string;
  at: number;
  sky: string[];
  hues: number[];
}

interface Star {
  x: number;
  y: number;
  z: number;
  phase: number;
}

const W = 640;
const H = 480;
const GROUND = 436;
const BIRD_R = 13;
const PIPE_W = 62;
const LIP = 8;
const STEP = 1000 / 60;
const MOTE_GOAL = 3;

const CHAPTERS: Chapter[] = [
  { name: 'Crystal Hollow', at: 0, sky: ['#0b1030', '#241552', '#4b1d6b', '#7a2d73'], hues: [0, 1, 2] },
  { name: 'Amethyst Reach', at: 10, sky: ['#0a0f2c', '#2a1558', '#5b2170', '#9a3b7a'], hues: [0, 2, 1] },
  { name: 'Ember Vein', at: 20, sky: ['#170a24', '#3a143c', '#6b2347', '#a33d49'], hues: [2, 2, 0] },
  { name: 'Frost Shard', at: 30, sky: ['#061323', '#0f2d4a', '#155e75', '#3b82f6'], hues: [1, 1, 0] },
  { name: 'Dawn Gate', at: 40, sky: ['#1b1030', '#4c1d95', '#b8336a', '#fbbf24'], hues: [0, 2, 1] },
];

const CRYSTALS = [
  ['#c4b5fd', '#7c3aed', '#3b0f7a'],
  ['#7dd3fc', '#0ea5e9', '#075985'],
  ['#f9a8d4', '#db2777', '#831843'],
];

const MEDALS = [
  { at: 40, name: 'Platinum', color: '#e2e8f0' },
  { at: 30, name: 'Gold', color: '#fbbf24' },
  { at: 20, name: 'Silver', color: '#cbd5e1' },
  { at: 10, name: 'Bronze', color: '#d97706' },
];

const STARS: Star[] = Array.from({ length: 90 }, () => ({
  x: Math.random() * W,
  y: Math.random() * (GROUND - 70),
  z: 0.25 + Math.random() * 0.75,
  phase: Math.random() * Math.PI * 2,
}));

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const makeRng = (seed?: number) =>
  seed === undefined || seed === null || !Number.isFinite(seed) ? Math.random : mulberry32(Math.floor(seed));

const chapterFor = (score: number) => {
  let index = 0;
  while (index + 1 < CHAPTERS.length && score >= CHAPTERS[index + 1].at) index++;
  return index;
};

const medalFor = (score: number) => MEDALS.find((medal) => score >= medal.at);

function tuneFor(difficulty: DifficultySetting) {
  if (difficulty === 'easy') return { gap: 158, speed: 2.2, spacing: 272 };
  if (difficulty === 'hard') return { gap: 116, speed: 3.0, spacing: 228 };
  return { gap: 136, speed: 2.6, spacing: 250 };
}

function drawSky(ctx: CanvasRenderingContext2D, colors: string[]) {
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, colors[0]);
  sky.addColorStop(0.55, colors[1]);
  sky.addColorStop(0.82, colors[2]);
  sky.addColorStop(1, colors[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
}

function drawStarfield(ctx: CanvasRenderingContext2D, frame: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const star of STARS) {
    const alpha = 0.24 + 0.5 * Math.abs(Math.sin(frame * 0.03 + star.phase));
    ctx.fillStyle = `rgba(244,240,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(star.x, star.y, 0.6 + star.z * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawRidges(ctx: CanvasRenderingContext2D, distance: number) {
  const layers: Array<[number, string, number, number]> = [
    [0.15, '#2a1a58', 330, 90],
    [0.35, '#1c1243', 372, 70],
    [0.6, '#120c30', 410, 55],
  ];
  for (const [parallax, color, base, amp] of layers) {
    cPath(ctx, base, amp, distance * parallax, color);
  }
}

function cPath(ctx: CanvasRenderingContext2D, base: number, amp: number, offset: number, color: string) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, GROUND);
  for (let x = 0; x <= W + 20; x += 20) {
    const wx = x + offset;
    ctx.lineTo(x, base - (Math.sin(wx * 0.011) + Math.sin(wx * 0.027 + 2) * 0.6) * amp * 0.5 - amp * 0.4);
  }
  ctx.lineTo(W, GROUND);
  ctx.closePath();
  ctx.fill();
}

function drawGround(ctx: CanvasRenderingContext2D, distance: number) {
  ctx.fillStyle = '#1a1033';
  ctx.fillRect(-12, GROUND, W + 24, H - GROUND + 20);
  const offset = distance % 40;
  for (let x = -40; x < W + 40; x += 40) {
    ctx.fillStyle = '#3b2a6b';
    ctx.fillRect(x - offset, GROUND + 3, 38, 11);
    ctx.fillStyle = 'rgba(255,255,255,.08)';
    ctx.fillRect(x - offset, GROUND + 3, 38, 2);
  }
  ctx.fillStyle = 'rgba(103,232,249,.55)';
  ctx.fillRect(0, GROUND, W, 1);
  ctx.fillStyle = 'rgba(0,0,0,.28)';
  ctx.fillRect(-12, GROUND + 17, W + 24, H - GROUND - 17 + 20);
}

function drawCrystal(
  ctx: CanvasRenderingContext2D,
  x: number,
  yTop: number,
  height: number,
  hue: number,
  capAtBottom: boolean
) {
  if (height <= 0) return;
  const [light, base, dark] = CRYSTALS[hue];
  const shaft = ctx.createLinearGradient(x, 0, x + PIPE_W, 0);
  shaft.addColorStop(0, light);
  shaft.addColorStop(0.42, base);
  shaft.addColorStop(1, dark);
  ctx.fillStyle = shaft;
  ctx.fillRect(x, yTop, PIPE_W, height);

  ctx.fillStyle = 'rgba(255,255,255,.16)';
  for (let i = 0; i < 3; i++) ctx.fillRect(x + 10 + i * 16, yTop, 2, height);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  ctx.fillRect(x + PIPE_W - 8, yTop, 8, height);

  const capY = capAtBottom ? yTop + height - 24 : yTop;
  const cap = ctx.createLinearGradient(x - LIP, 0, x + PIPE_W + LIP, 0);
  cap.addColorStop(0, light);
  cap.addColorStop(0.45, base);
  cap.addColorStop(1, dark);
  ctx.fillStyle = cap;
  ctx.fillRect(x - LIP, capY, PIPE_W + LIP * 2, 24);
  ctx.fillStyle = 'rgba(255,255,255,.24)';
  ctx.fillRect(x - LIP, capY, PIPE_W + LIP * 2, 3);
  ctx.fillStyle = 'rgba(0,0,0,.24)';
  ctx.fillRect(x - LIP, capY + 20, PIPE_W + LIP * 2, 4);
}

function drawMoth(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  rotation: number,
  wing: number,
  hasShield: boolean,
  invulnerable: boolean,
  frame: number
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);

  ctx.shadowColor = '#fde68a';
  ctx.shadowBlur = 18;
  for (const dir of [-1, 1]) {
    ctx.fillStyle = dir < 0 ? 'rgba(249,168,212,.82)' : 'rgba(196,181,253,.92)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(dir * 27, -34 * wing - 10, dir * 31, 4 + wing * 6);
    ctx.quadraticCurveTo(dir * 17, 15, 0, 6);
    ctx.fill();
  }

  const body = ctx.createRadialGradient(-4, -4, 2, 0, 0, 15);
  body.addColorStop(0, '#fff8d9');
  body.addColorStop(0.6, '#fde68a');
  body.addColorStop(1, '#f59e0b');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 14, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#1e1b4b';
  ctx.beginPath();
  ctx.arc(7, -3, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(8, -4.5, 1.6, 1.6);

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fde68a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(8, -9);
  ctx.quadraticCurveTo(14, -17, 20, -12 + Math.sin(frame * 0.25) * 2);
  ctx.stroke();

  if (hasShield || invulnerable) {
    ctx.strokeStyle = hasShield ? 'rgba(103,232,249,.9)' : 'rgba(255,255,255,.55)';
    ctx.lineWidth = hasShield ? 2 : 1;
    if (invulnerable) ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(0, 0, 24 + Math.sin(frame * 0.2) * 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

export const CyberFlapEngine: React.FC<CyberFlapEngineProps> = ({
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
  const [gameState, setGameState] = useState<GameState>('READY');
  const [hud, setHud] = useState({ score: 0, motes: 0, shield: 0, chapter: 0 });

  const birdRef = useRef({ x: 148, y: 224, vy: 0, rot: 0, flapT: 0 });
  const pipesRef = useRef<Pipe[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatersRef = useRef<Floater[]>([]);
  const scoreRef = useRef(0);
  const motesRef = useRef(0);
  const shieldRef = useRef(0);
  const invulnRef = useRef(0);
  const chapterRef = useRef(0);
  const bannerRef = useRef({ text: '', t: 0 });
  const frameRef = useRef(0);
  const timeRef = useRef(0);
  const distanceRef = useRef(0);
  const lastGapRef = useRef(250);
  const shakeRef = useRef({ t: 0, mag: 0 });
  const stateRef = useRef<GameState>('READY');
  const rngRef = useRef<() => number>(makeRng(seed));
  const pausedRef = useRef(isPaused);
  const callbacksRef = useRef({ score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart });

  pausedRef.current = isPaused;
  callbacksRef.current = { score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart };

  const burst = useCallback(
    (x: number, y: number, count: number, colors: string[], speed: number, life: number, angle?: number, spread = Math.PI * 2) => {
      for (let i = 0; i < count; i++) {
        const dir = angle === undefined ? Math.random() * Math.PI * 2 : angle + (Math.random() - 0.5) * spread;
        const velocity = speed * (0.45 + Math.random() * 0.75);
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(dir) * velocity,
          vy: Math.sin(dir) * velocity,
          life: 0,
          maxLife: life * (0.7 + Math.random() * 0.6),
          color: colors[Math.floor(Math.random() * colors.length)],
          size: 2 + Math.random() * 2.4,
          grav: 0.04,
        });
      }
    },
    []
  );

  const spawnPipe = useCallback(
    (x: number) => {
      const random = rngRef.current;
      const tune = tuneFor(difficulty);
      const gap = Math.max(106, tune.gap - Math.min(30, scoreRef.current * 1.1) + (random() - 0.5) * 14);
      const minY = 92 + gap / 2;
      const maxY = GROUND - 64 - gap / 2;
      const baseY = clamp(lastGapRef.current + (random() - 0.5) * 280, minY, maxY);
      lastGapRef.current = baseY;
      const hues = CHAPTERS[chapterRef.current].hues;
      pipesRef.current.push({
        x,
        gap,
        baseY,
        gapY: baseY,
        amp: scoreRef.current >= 8 && random() < 0.35 ? 14 + random() * 20 : 0,
        phase: random() * Math.PI * 2,
        passed: false,
        hue: hues[Math.floor(random() * hues.length)],
        mote: random() < 0.62 ? { got: false, phase: random() * Math.PI * 2 } : null,
      });
    },
    [difficulty]
  );

  const resetGame = useCallback(() => {
    const wasOver = stateRef.current === 'GAMEOVER';
    birdRef.current = { x: 148, y: 224, vy: 0, rot: 0, flapT: 0 };
    pipesRef.current = [];
    particlesRef.current = [];
    floatersRef.current = [];
    scoreRef.current = 0;
    motesRef.current = 0;
    shieldRef.current = 0;
    invulnRef.current = 0;
    chapterRef.current = 0;
    bannerRef.current = { text: '', t: 0 };
    frameRef.current = 0;
    timeRef.current = 0;
    distanceRef.current = 0;
    lastGapRef.current = 250;
    shakeRef.current = { t: 0, mag: 0 };
    rngRef.current = makeRng(seed);
    stateRef.current = 'READY';
    setGameState('READY');
    setHud({ score: 0, motes: 0, shield: 0, chapter: 0 });
    callbacksRef.current.score(0);
    if (wasOver) callbacksRef.current.restart?.();
  }, [seed]);

  const flap = useCallback(() => {
    if (stateRef.current === 'GAMEOVER') {
      resetGame();
      return;
    }
    const bird = birdRef.current;
    if (stateRef.current === 'READY') {
      stateRef.current = 'PLAYING';
      setGameState('PLAYING');
      const spacing = tuneFor(difficulty).spacing;
      spawnPipe(W + 80);
      spawnPipe(W + 80 + spacing);
    }
    bird.vy = -6.4;
    bird.flapT = 12;
    audio.playJump();
    burst(bird.x - 8, bird.y + 8, 5, ['#fde68a', '#f9a8d4'], 1.6, 20, Math.PI * 0.75, 0.6);
  }, [burst, difficulty, resetGame, spawnPipe]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPaused || event.repeat) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.code === 'Space' || event.code === 'ArrowUp' || event.code === 'KeyW') {
        event.preventDefault();
        flap();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flap, isPaused]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const addFloater = (x: number, y: number, text: string, color: string) => {
      floatersRef.current.push({ x, y, text, color, life: 0, maxLife: 46 });
    };

    const die = () => {
      if (stateRef.current !== 'PLAYING') return;
      stateRef.current = 'GAMEOVER';
      setGameState('GAMEOVER');
      audio.playHit();
      shakeRef.current = { t: 16, mag: 9 };
      const bird = birdRef.current;
      burst(bird.x, bird.y, 28, ['#fde68a', '#f0abfc', '#67e8f9'], 5, 40);
      callbacksRef.current.over(scoreRef.current);
    };

    const spendShield = () => {
      shieldRef.current = 0;
      invulnRef.current = 70;
      setHud((prev) => ({ ...prev, shield: 0 }));
      audio.playHit();
      shakeRef.current = { t: 12, mag: 6 };
      const bird = birdRef.current;
      burst(bird.x, bird.y, 18, ['#67e8f9', '#a5f3fc', '#ffffff'], 3.6, 30);
      addFloater(bird.x + 24, bird.y - 18, 'Shield spent', '#a5f3fc');
    };

    const collectMote = (x: number, y: number) => {
      motesRef.current += 1;
      audio.playScore();
      burst(x, y, 10, ['#fde68a', '#67e8f9'], 2.6, 26);
      if (motesRef.current >= MOTE_GOAL) {
        motesRef.current = 0;
        shieldRef.current = 1;
        setHud((prev) => ({ ...prev, motes: 0, shield: 1 }));
        addFloater(W / 2, 186, 'DAWN SHIELD READY', '#a5f3fc');
      } else {
        setHud((prev) => ({ ...prev, motes: motesRef.current }));
        addFloater(x, y - 14, '+1', '#fde68a');
      }
    };

    const step = () => {
      frameRef.current++;
      timeRef.current++;
      if (bannerRef.current.t > 0) bannerRef.current.t--;
      if (invulnRef.current > 0) invulnRef.current--;
      if (shakeRef.current.t > 0) shakeRef.current.t--;

      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const particle = particles[i];
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy += particle.grav;
        particle.life++;
        if (particle.life >= particle.maxLife) particles.splice(i, 1);
      }
      const floaters = floatersRef.current;
      for (let i = floaters.length - 1; i >= 0; i--) {
        const floater = floaters[i];
        floater.y -= 0.65;
        floater.life++;
        if (floater.life >= floater.maxLife) floaters.splice(i, 1);
      }

      if (stateRef.current !== 'PLAYING') return;

      const bird = birdRef.current;
      bird.vy = Math.min(9.5, bird.vy + 0.4);
      bird.y += bird.vy;
      bird.rot = clamp(bird.vy * 0.075, -0.5, 1.15);
      if (bird.flapT > 0) bird.flapT--;
      if (bird.y - BIRD_R < 0) {
        bird.y = BIRD_R;
        bird.vy = Math.max(bird.vy, 0);
      }

      const tune = tuneFor(difficulty);
      const speed = tune.speed + Math.min(2.2, scoreRef.current * 0.055);
      distanceRef.current += speed;

      const pipes = pipesRef.current;
      for (const pipe of pipes) {
        pipe.x -= speed;
        if (pipe.amp) pipe.gapY = pipe.baseY + Math.sin(timeRef.current * 0.028 + pipe.phase) * pipe.amp;
      }
      if (pipes.length && pipes[0].x < -PIPE_W - LIP - 24) pipes.shift();
      const lastPipe = pipes[pipes.length - 1];
      if (!lastPipe || lastPipe.x < W + 80 - tune.spacing) spawnPipe(W + 80);

      for (const pipe of pipes) {
        if (!pipe.passed && pipe.x + PIPE_W < bird.x) {
          pipe.passed = true;
          scoreRef.current += 1;
          const score = scoreRef.current;
          setHud((prev) => ({ ...prev, score }));
          callbacksRef.current.score(score);
          audio.playScore();
          burst(bird.x, bird.y, 8, ['#facc15', '#fef08a'], 2.4, 22);
          addFloater(bird.x + 26, bird.y - 18, '+1', '#fde68a');

          const nextChapter = chapterFor(score);
          if (nextChapter > chapterRef.current) {
            chapterRef.current = nextChapter;
            bannerRef.current = { text: `CHAPTER ${nextChapter + 1} · ${CHAPTERS[nextChapter].name}`, t: 130 };
            setHud((prev) => ({ ...prev, chapter: nextChapter }));
            callbacksRef.current.level?.(nextChapter + 1, score);
            audio.playScore();
            addFloater(W / 2, 150, CHAPTERS[nextChapter].name.toUpperCase(), '#fde68a');
          }
        }

        if (pipe.mote && !pipe.mote.got) {
          const mx = pipe.x + PIPE_W / 2;
          const my = pipe.gapY + Math.sin(timeRef.current * 0.05 + pipe.mote.phase) * 8;
          if (Math.hypot(bird.x - mx, bird.y - my) < BIRD_R + 11) {
            pipe.mote.got = true;
            collectMote(mx, my);
          }
        }

        const x0 = pipe.x - LIP;
        const x1 = pipe.x + PIPE_W + LIP;
        if (bird.x + BIRD_R > x0 && bird.x - BIRD_R < x1) {
          const top = pipe.gapY - pipe.gap / 2;
          const bottom = pipe.gapY + pipe.gap / 2;
          if (bird.y - BIRD_R + 3 < top || bird.y + BIRD_R - 3 > bottom) {
            if (invulnRef.current > 0) continue;
            if (shieldRef.current > 0) {
              spendShield();
              bird.y = clamp(pipe.gapY, 50, GROUND - 50);
              bird.vy = 0;
              return;
            }
            die();
            return;
          }
        }
      }

      if (bird.y + BIRD_R >= GROUND) {
        if (invulnRef.current > 0) {
          bird.y = GROUND - BIRD_R - 1;
          bird.vy = -6.5;
        } else if (shieldRef.current > 0) {
          bird.y = GROUND - BIRD_R - 2;
          bird.vy = -7;
          spendShield();
        } else {
          bird.y = GROUND - BIRD_R;
          die();
        }
      }
    };

    const draw = () => {
      const frame = frameRef.current;
      const chapter = CHAPTERS[chapterRef.current];
      const bird = birdRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      drawSky(ctx, chapter.sky);
      drawStarfield(ctx, frame);

      let shakeX = 0;
      let shakeY = 0;
      if (shakeRef.current.t > 0) {
        const strength = shakeRef.current.mag * (shakeRef.current.t / 16);
        shakeX = (Math.random() - 0.5) * strength;
        shakeY = (Math.random() - 0.5) * strength;
      }
      ctx.save();
      ctx.translate(shakeX, shakeY);

      drawRidges(ctx, distanceRef.current);

      for (const pipe of pipesRef.current) {
        const top = pipe.gapY - pipe.gap / 2;
        const bottom = pipe.gapY + pipe.gap / 2;
        drawCrystal(ctx, pipe.x, -20, top + 20, pipe.hue, true);
        drawCrystal(ctx, pipe.x, bottom, GROUND - bottom, pipe.hue, false);
        if (pipe.amp) {
          ctx.fillStyle = 'rgba(253,230,138,.6)';
          ctx.fillRect(pipe.x + PIPE_W / 2 - 2, top + 4, 4, 4);
          ctx.fillRect(pipe.x + PIPE_W / 2 - 2, bottom - 8, 4, 4);
        }
        if (pipe.mote && !pipe.mote.got) {
          const mx = pipe.x + PIPE_W / 2;
          const my = pipe.gapY + Math.sin(timeRef.current * 0.05 + pipe.mote.phase) * 8;
          ctx.save();
          ctx.globalCompositeOperation = 'lighter';
          ctx.shadowColor = '#fde68a';
          ctx.shadowBlur = 14;
          ctx.fillStyle = '#fff7cc';
          ctx.beginPath();
          ctx.arc(mx, my, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = 'rgba(103,232,249,.9)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(mx, my, 8 + Math.sin(timeRef.current * 0.08 + pipe.mote.phase) * 2, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();
        }
      }

      drawGround(ctx, distanceRef.current);

      for (const particle of particlesRef.current) {
        ctx.globalAlpha = Math.max(0, 1 - particle.life / particle.maxLife);
        ctx.fillStyle = particle.color;
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      const bob = stateRef.current === 'READY' ? Math.sin(frame * 0.08) * 8 : 0;
      const wing =
        stateRef.current === 'READY'
          ? 0.55 + Math.sin(frame * 0.18) * 0.45
          : bird.flapT > 0
            ? 1
            : 0.3;
      const rotation = stateRef.current === 'READY' ? 0 : stateRef.current === 'GAMEOVER' ? 0.9 : bird.rot;
      drawMoth(ctx, bird.x, bird.y + bob, rotation, wing, shieldRef.current > 0, invulnRef.current > 0, frame);

      for (const floater of floatersRef.current) {
        ctx.globalAlpha = Math.max(0, 1 - floater.life / floater.maxLife);
        ctx.fillStyle = floater.color;
        ctx.font = '700 16px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(floater.text, floater.x, floater.y);
      }
      ctx.globalAlpha = 1;

      if (bannerRef.current.t > 0) {
        const alpha = Math.min(1, bannerRef.current.t / 34);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = 'rgba(7,12,25,.78)';
        ctx.fillRect(0, H * 0.26, W, 66);
        ctx.strokeStyle = 'rgba(103,232,249,.45)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0.5, H * 0.26 + 0.5, W - 1, 65);
        ctx.fillStyle = '#fde68a';
        ctx.font = '700 17px ui-monospace, Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(bannerRef.current.text, W / 2, H * 0.26 + 29);
        ctx.fillStyle = '#a5f3fc';
        ctx.font = '600 10px ui-monospace, Consolas, monospace';
        ctx.fillText(`CHAPTER ${chapterRef.current + 1} OF ${CHAPTERS.length}`, W / 2, H * 0.26 + 49);
        ctx.restore();
      }

      ctx.restore();

      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.78);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,.42)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    };

    let animationId = 0;
    let lastTime = performance.now();
    let accumulator = 0;

    const loop = (now: number) => {
      animationId = requestAnimationFrame(loop);
      const delta = Math.min(100, now - lastTime);
      lastTime = now;
      if (pausedRef.current) return;
      accumulator += delta;
      let steps = 0;
      while (accumulator >= STEP && steps < 6) {
        step();
        accumulator -= STEP;
        steps++;
      }
      if (steps >= 6) accumulator = 0;
      draw();
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [burst, difficulty, seed, spawnPipe]);

  const medal = medalFor(hud.score);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isPaused) return;
    if ((event.target as HTMLElement).closest('button')) return;
    flap();
  };

  return (
    <div
      className="relative w-full max-w-[720px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none touch-none"
      onPointerDown={handlePointerDown}
    >
      <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block cursor-pointer" aria-label="Glowmoth Gauntlet flight area" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4 pointer-events-none">
        <div className="rounded-xl border border-white/10 bg-[#070913]/75 px-3 py-2 backdrop-blur-md">
          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-violet-300">Chapter {hud.chapter + 1}</div>
          <div className="text-sm font-semibold text-white leading-tight">{CHAPTERS[hud.chapter].name}</div>
          <div className="text-[10px] font-mono text-slate-400">Best {Math.max(highScore, hud.score)}</div>
        </div>

        <div className="mt-1 text-center">
          <div className="font-mono text-4xl font-bold text-white tabular-nums drop-shadow-[0_2px_10px_rgba(253,230,138,.45)]">{hud.score}</div>
          <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-200/70">Dawn Spark</div>
        </div>

        <div className="flex flex-col items-end gap-1.5 rounded-xl border border-white/10 bg-[#070913]/75 px-3 py-2 backdrop-blur-md">
          <div className="flex items-center gap-1.5" aria-label={`${hud.motes} of ${MOTE_GOAL} motes`}>
            {Array.from({ length: MOTE_GOAL }, (_, index) => (
              <span
                key={index}
                className={`h-2.5 w-2.5 rounded-full ${index < hud.motes ? 'bg-cyan-300 shadow-[0_0_8px_rgba(103,232,249,.9)]' : 'bg-white/20'}`}
              />
            ))}
          </div>
          <div className={`text-[9px] font-mono uppercase tracking-[0.16em] ${hud.shield ? 'text-cyan-200' : 'text-slate-500'}`}>
            {hud.shield ? 'Shield ready' : 'Dawn shield'}
          </div>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/20 to-black/55 flex flex-col items-center justify-center pointer-events-none px-6 text-center">
          <div className="text-2xl sm:text-3xl font-bold text-white tracking-tight">Glowmoth Gauntlet</div>
          <p className="mt-2 text-sm text-violet-200/80">Glide the crystal caverns. Gather motes. Carry the Dawn Spark.</p>
          <div className="mt-5 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-2 text-xs font-mono uppercase tracking-[0.18em] text-cyan-200">
            Tap · Space · ↑ to launch
          </div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/72 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-rose-300 tracking-tight">Lost in the Dark</div>
          <div className="mt-2 text-sm text-slate-300">
            Final score <span className="font-mono font-bold text-cyan-300">{hud.score}</span>
            <span className="mx-2 text-slate-600">·</span>
            Chapter {hud.chapter + 1}
          </div>
          {medal && <div className="mt-2 text-xs font-mono uppercase tracking-[0.18em]" style={{ color: medal.color }}>{medal.name} medal earned</div>}
          {!medal && <div className="mt-2 text-xs text-slate-400">Reach 10 for a Bronze medal</div>}
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              resetGame();
            }}
            className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 text-xs font-bold text-slate-950 transition-colors hover:bg-cyan-300 cursor-pointer"
          >
            Play again
          </button>
          <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">Space also retries</div>
        </div>
      )}
    </div>
  );
};
