import React, { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface HoloPongEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  seed?: number;
  highScore?: number;
  onLevelComplete?: (level: number, score: number) => void;
  onRestart?: () => void;
}

type Phase = 'READY' | 'PLAYING' | 'GAMEOVER';
type Hitter = 'player' | 'ai' | null;

interface Spark {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: string;
  size: number;
}

const W = 640;
const H = 480;
const TOP = 26;
const BOT = 454;
const PADDLE_H = 70;
const BOOST_H = 18;
const PADDLE_W = 10;
const BALL_R = 7;
const PLAYER_X = 28;
const AI_X = W - 38;
const STEP = 1000 / 60;
const WIN_POINTS = 7;
const POD_R = 15;
const POD_COOLDOWN = 420;
const BOOST_FRAMES = 480;

const PILOTS = [
  { name: 'SPARK', color: '#38bdf8' },
  { name: 'VECTOR', color: '#a78bfa' },
  { name: 'HALO', color: '#fbbf24' },
  { name: 'NULL', color: '#34d399' },
  { name: 'OVERDRIVE', color: '#fb7185' },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const makeRng = (seed?: number) => mulberry32((seed ?? Math.floor(Math.random() * 0xffffffff)) >>> 0);

function tuneFor(difficulty: DifficultySetting) {
  if (difficulty === 'easy') return { ball: 4.6, aiSpeed: 3.1, reaction: 20, error: 54 };
  if (difficulty === 'hard') return { ball: 5.6, aiSpeed: 4.7, reaction: 10, error: 20 };
  return { ball: 5.0, aiSpeed: 3.9, reaction: 14, error: 34 };
}

const pilotTune = (difficulty: DifficultySetting, pilot: number) => {
  const base = tuneFor(difficulty);
  return {
    ball: base.ball + pilot * 0.16,
    aiSpeed: base.aiSpeed + pilot * 0.22,
    reaction: Math.max(5, Math.round(base.reaction - pilot * 1.4)),
    error: base.error * Math.max(0.55, 1 - pilot * 0.1),
  };
};

const paddleHeight = (boost: number) => PADDLE_H + (boost > 0 ? BOOST_H : 0);

interface HudState {
  player: number;
  ai: number;
  score: number;
  rally: number;
  bestRally: number;
  pilot: number;
  playerBoost: boolean;
  aiBoost: boolean;
}

export const HoloPongEngine: React.FC<HoloPongEngineProps> = ({
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
  const stateRef = useRef<Phase>('READY');
  const pausedRef = useRef(isPaused);
  const keysRef = useRef(new Set<string>());
  const rngRef = useRef<() => number>(makeRng(seed));
  const difficultyRef = useRef(difficulty);
  const callbacksRef = useRef({ score: onScoreUpdate, gameOver: onGameOver, level: onLevelComplete, restart: onRestart });

  pausedRef.current = isPaused;
  difficultyRef.current = difficulty;
  callbacksRef.current = { score: onScoreUpdate, gameOver: onGameOver, level: onLevelComplete, restart: onRestart };

  const [gameState, setGameState] = useState<Phase>('READY');
  const [hud, setHud] = useState<HudState>({ player: 0, ai: 0, score: 0, rally: 0, bestRally: 0, pilot: 0, playerBoost: false, aiBoost: false });

  const playerRef = useRef({ y: (TOP + BOT) / 2 - PADDLE_H / 2, targetY: (TOP + BOT) / 2 - PADDLE_H / 2, boost: 0 });
  const aiRef = useRef({ y: (TOP + BOT) / 2 - PADDLE_H / 2, targetY: (TOP + BOT) / 2 - PADDLE_H / 2, boost: 0, err: 0, wait: 0 });
  const ballRef = useRef({ x: W / 2, y: (TOP + BOT) / 2, vx: 0, vy: 0, trail: [] as { x: number; y: number }[] });
  const podRef = useRef({ x: W / 2, y: (TOP + BOT) / 2, active: true, respawn: 0 });
  const sparksRef = useRef<Spark[]>([]);
  const matchRef = useRef({
    playerScore: 0,
    aiScore: 0,
    rally: 0,
    bestRally: 0,
    score: 0,
    pilot: 0,
    serveT: 0,
    serveDir: 1,
    lastHitter: null as Hitter,
    frame: 0,
    banner: null as { text: string; color: string; t: number } | null,
  });

  const syncHud = useCallback(() => {
    const m = matchRef.current;
    setHud({
      player: m.playerScore,
      ai: m.aiScore,
      score: m.score,
      rally: m.rally,
      bestRally: m.bestRally,
      pilot: m.pilot,
      playerBoost: playerRef.current.boost > 0,
      aiBoost: aiRef.current.boost > 0,
    });
  }, []);

  const spawnPod = useCallback(() => {
    const rng = rngRef.current;
    podRef.current = {
      x: W * 0.3 + rng() * W * 0.4,
      y: TOP + 70 + rng() * (BOT - TOP - 140),
      active: true,
      respawn: 0,
    };
  }, []);

  const resetFull = useCallback(() => {
    rngRef.current = makeRng(seed);
    const m = matchRef.current;
    m.playerScore = 0;
    m.aiScore = 0;
    m.rally = 0;
    m.bestRally = 0;
    m.score = 0;
    m.pilot = 0;
    m.serveT = 45;
    m.serveDir = rngRef.current() < 0.5 ? -1 : 1;
    m.lastHitter = null;
    m.frame = 0;
    m.banner = null;
    playerRef.current = { y: (TOP + BOT) / 2 - PADDLE_H / 2, targetY: (TOP + BOT) / 2 - PADDLE_H / 2, boost: 0 };
    aiRef.current = { y: (TOP + BOT) / 2 - PADDLE_H / 2, targetY: (TOP + BOT) / 2 - PADDLE_H / 2, boost: 0, err: 0, wait: 0 };
    ballRef.current = { x: W / 2, y: (TOP + BOT) / 2, vx: 0, vy: 0, trail: [] };
    sparksRef.current = [];
    spawnPod();
    stateRef.current = 'READY';
    setGameState('READY');
    callbacksRef.current.score(0);
    syncHud();
  }, [seed, spawnPod, syncHud]);

  const startMatch = useCallback(() => {
    const wasOver = stateRef.current === 'GAMEOVER';
    resetFull();
    stateRef.current = 'PLAYING';
    setGameState('PLAYING');
    if (wasOver) callbacksRef.current.restart?.();
    audio.playPongBeep(true);
  }, [resetFull]);

  useEffect(() => {
    resetFull();
  }, [resetFull]);

  useEffect(() => {
    const handleDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|SELECT|TEXTAREA)$/.test(target.tagName)) return;
      if (event.code === 'Space' || event.code === 'Enter') {
        if (!event.repeat && stateRef.current !== 'PLAYING') {
          event.preventDefault();
          startMatch();
        }
        return;
      }
      if (event.code === 'ArrowUp' || event.code === 'ArrowDown' || event.code === 'KeyW' || event.code === 'KeyS') {
        event.preventDefault();
        if (!pausedRef.current) keysRef.current.add(event.code);
      }
    };
    const handleUp = (event: KeyboardEvent) => keysRef.current.delete(event.code);
    window.addEventListener('keydown', handleDown);
    window.addEventListener('keyup', handleUp);
    return () => {
      window.removeEventListener('keydown', handleDown);
      window.removeEventListener('keyup', handleUp);
    };
  }, [startMatch]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = W * dpr;
    canvas.height = H * dpr;

    const addSparks = (x: number, y: number, count: number, colors: string[]) => {
      const rng = rngRef.current;
      for (let i = 0; i < count; i++) {
        const angle = rng() * Math.PI * 2;
        const speed = 1.2 + rng() * 3.4;
        const life = 22 + rng() * 16;
        sparksRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life,
          max: life,
          color: colors[Math.floor(rng() * colors.length)],
          size: 1.4 + rng() * 2.2,
        });
      }
      if (sparksRef.current.length > 140) sparksRef.current.splice(0, sparksRef.current.length - 140);
    };

    const serveBall = () => {
      const b = ballRef.current;
      b.x = W / 2;
      b.y = (TOP + BOT) / 2;
      b.vx = 0;
      b.vy = 0;
      b.trail = [];
    };

    const predictY = () => {
      const b = ballRef.current;
      const field = BOT - TOP - 2 * BALL_R;
      const t = (AI_X - BALL_R - b.x) / Math.max(0.1, b.vx);
      let y = b.y - TOP - BALL_R + b.vy * t;
      y = ((y % (2 * field)) + 2 * field) % (2 * field);
      if (y > field) y = 2 * field - y;
      return y + TOP + BALL_R;
    };

    const launch = () => {
      const m = matchRef.current;
      const tune = pilotTune(difficultyRef.current, m.pilot);
      const angle = (rngRef.current() * 2 - 1) * 0.42;
      ballRef.current.vx = Math.cos(angle) * tune.ball * m.serveDir;
      ballRef.current.vy = Math.sin(angle) * tune.ball;
    };

    const finish = (victory: boolean) => {
      if (stateRef.current !== 'PLAYING') return;
      stateRef.current = 'GAMEOVER';
      setGameState('GAMEOVER');
      if (victory) audio.playScore(); else audio.playHit();
      callbacksRef.current.gameOver(matchRef.current.score);
      syncHud();
    };

    const advancePilot = () => {
      const m = matchRef.current;
      m.score += 500;
      callbacksRef.current.score(m.score);
      if (m.pilot >= PILOTS.length - 1) {
        callbacksRef.current.level?.(PILOTS.length, m.score);
        finish(true);
        return;
      }
      m.pilot++;
      callbacksRef.current.level?.(m.pilot + 1, m.score);
      m.playerScore = 0;
      m.aiScore = 0;
      m.rally = 0;
      m.lastHitter = null;
      m.serveT = 60;
      m.serveDir = rngRef.current() < 0.5 ? -1 : 1;
      m.banner = { text: `PILOT ${m.pilot + 1} · ${PILOTS[m.pilot].name}`, color: PILOTS[m.pilot].color, t: 0 };
      playerRef.current.boost = 0;
      aiRef.current.boost = 0;
      serveBall();
      spawnPod();
      addSparks(W / 2, (TOP + BOT) / 2, 26, ['#fde68a', PILOTS[m.pilot].color]);
      syncHud();
    };

    const scorePoint = (who: 'player' | 'ai') => {
      const m = matchRef.current;
      if (who === 'player') {
        m.playerScore++;
        m.score += 100 + m.rally * 10;
        callbacksRef.current.score(m.score);
        audio.playScore();
        addSparks(W - 12, ballRef.current.y, 18, ['#38bdf8', '#a5f3fc']);
        if (m.playerScore >= WIN_POINTS) {
          m.rally = 0;
          advancePilot();
          return;
        }
        m.serveDir = -1;
      } else {
        m.aiScore++;
        audio.playHit();
        addSparks(12, ballRef.current.y, 16, ['#f87171', '#fecaca']);
        if (m.aiScore >= WIN_POINTS) {
          m.rally = 0;
          finish(false);
          return;
        }
        m.serveDir = 1;
      }
      m.rally = 0;
      m.lastHitter = null;
      m.serveT = 45;
      serveBall();
      syncHud();
    };

    const collectPod = (who: 'player' | 'ai') => {
      const pod = podRef.current;
      const m = matchRef.current;
      pod.active = false;
      pod.respawn = POD_COOLDOWN;
      if (who === 'player') {
        playerRef.current.boost = BOOST_FRAMES;
        m.score += 75;
        callbacksRef.current.score(m.score);
        audio.playScore();
        m.banner = { text: 'ION POD · OVERCHARGE', color: '#fde68a', t: 0 };
      } else {
        aiRef.current.boost = BOOST_FRAMES;
        audio.playPongBeep(false);
        m.banner = { text: 'AI OVERCHARGE', color: '#fde68a', t: 0 };
      }
      addSparks(pod.x, pod.y, 24, ['#fde68a', '#fff', '#fbbf24']);
      syncHud();
    };

    const paddleHit = (who: 'player' | 'ai', paddle: { y: number; boost: number }, dir: 1 | -1) => {
      const m = matchRef.current;
      const b = ballRef.current;
      const h = paddleHeight(paddle.boost);
      const off = clamp((b.y - (paddle.y + h / 2)) / (h / 2), -1, 1);
      const speed = Math.min(11.5, Math.hypot(b.vx, b.vy) * 1.045);
      const angle = off * 0.98;
      b.vx = Math.cos(angle) * speed * dir;
      b.vy = Math.sin(angle) * speed;
      m.rally++;
      m.bestRally = Math.max(m.bestRally, m.rally);
      m.lastHitter = who;
      audio.playPongBeep(who === 'player');
      addSparks(b.x, b.y, 7, who === 'player' ? ['#38bdf8', '#fff'] : ['#f87171', '#fecaca']);
      syncHud();
    };

    const step = () => {
      const m = matchRef.current;
      const p = playerRef.current;
      const a = aiRef.current;
      const b = ballRef.current;
      const keys = keysRef.current;
      m.frame++;

      if (keys.has('KeyW') || keys.has('ArrowUp')) p.targetY -= 7;
      if (keys.has('KeyS') || keys.has('ArrowDown')) p.targetY += 7;
      p.targetY = clamp(p.targetY, TOP, BOT - paddleHeight(p.boost));
      p.y += clamp(p.targetY - p.y, -8, 8);
      p.y = clamp(p.y, TOP, BOT - paddleHeight(p.boost));

      if (p.boost > 0) {
        p.boost--;
        if (p.boost === 0) syncHud();
      }
      if (a.boost > 0) {
        a.boost--;
        if (a.boost === 0) syncHud();
      }
      p.y = clamp(p.y, TOP, BOT - paddleHeight(p.boost));
      p.targetY = clamp(p.targetY, TOP, BOT - paddleHeight(p.boost));
      a.y = clamp(a.y, TOP, BOT - paddleHeight(a.boost));

      if (!podRef.current.active && --podRef.current.respawn <= 0) spawnPod();
      if (m.banner && ++m.banner.t > 90) m.banner = null;

      const tune = pilotTune(difficultyRef.current, m.pilot);
      if (b.vx > 0) {
        if (--a.wait <= 0) {
          a.wait = tune.reaction;
          a.targetY = predictY() - paddleHeight(a.boost) / 2 + (rngRef.current() * 2 - 1) * tune.error;
        }
      } else {
        a.targetY = (TOP + BOT) / 2 - paddleHeight(a.boost) / 2;
      }
      a.y += clamp(a.targetY - a.y, -tune.aiSpeed, tune.aiSpeed);
      a.y = clamp(a.y, TOP, BOT - paddleHeight(a.boost));

      if (m.serveT > 0) {
        m.serveT--;
        if (m.serveT === 0) launch();
        return;
      }

      for (let sub = 0; sub < 2; sub++) {
        b.x += b.vx / 2;
        b.y += b.vy / 2;

        if (b.y - BALL_R < TOP) {
          b.y = TOP + BALL_R;
          b.vy = Math.abs(b.vy);
          audio.playPongBeep(false);
        } else if (b.y + BALL_R > BOT) {
          b.y = BOT - BALL_R;
          b.vy = -Math.abs(b.vy);
          audio.playPongBeep(false);
        }

        if (
          b.vx < 0 &&
          b.x - BALL_R <= PLAYER_X + PADDLE_W &&
          b.x >= PLAYER_X - 2 &&
          b.y > p.y - BALL_R * 0.6 &&
          b.y < p.y + paddleHeight(p.boost) + BALL_R * 0.6
        ) {
          b.x = PLAYER_X + PADDLE_W + BALL_R;
          paddleHit('player', p, 1);
        }

        if (
          b.vx > 0 &&
          b.x + BALL_R >= AI_X &&
          b.x <= AI_X + PADDLE_W + 2 &&
          b.y > a.y - BALL_R * 0.6 &&
          b.y < a.y + paddleHeight(a.boost) + BALL_R * 0.6
        ) {
          b.x = AI_X - BALL_R;
          paddleHit('ai', a, -1);
        }

        const pod = podRef.current;
        if (pod.active && m.lastHitter) {
          const dx = b.x - pod.x;
          const dy = b.y - pod.y;
          if (dx * dx + dy * dy < (BALL_R + POD_R) * (BALL_R + POD_R)) collectPod(m.lastHitter);
        }

        if (b.x < -10) {
          scorePoint('ai');
          return;
        }
        if (b.x > W + 10) {
          scorePoint('player');
          return;
        }
      }

      b.trail.push({ x: b.x, y: b.y });
      if (b.trail.length > 16) b.trail.shift();

      for (let i = sparksRef.current.length - 1; i >= 0; i--) {
        const spark = sparksRef.current[i];
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vx *= 0.96;
        spark.vy *= 0.96;
        if (--spark.life <= 0) sparksRef.current.splice(i, 1);
      }
    };

    const drawPaddle = (x: number, y: number, boost: number, color: string, glow: string) => {
      const h = paddleHeight(boost);
      ctx.save();
      ctx.shadowColor = boost > 0 ? '#fde68a' : glow;
      ctx.shadowBlur = boost > 0 ? 22 : 14;
      const gradient = ctx.createLinearGradient(x, 0, x + PADDLE_W, 0);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, '#e0f2fe');
      gradient.addColorStop(1, color);
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, PADDLE_W, h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,.65)';
      ctx.fillRect(x + PADDLE_W / 2 - 1, y + 5, 2, h - 10);
      if (boost > 0) {
        ctx.strokeStyle = 'rgba(253,230,138,.9)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - 2, PADDLE_W + 4, h + 4);
      }
      ctx.restore();
    };

    const drawPod = () => {
      const pod = podRef.current;
      if (!pod.active) return;
      const frame = matchRef.current.frame;
      const pulse = 1 + Math.sin(frame * 0.12) * 0.1;
      ctx.save();
      ctx.translate(pod.x, pod.y);
      ctx.shadowColor = '#fde68a';
      ctx.shadowBlur = 18;
      ctx.rotate(frame * 0.015);
      ctx.strokeStyle = 'rgba(253,230,138,.85)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3;
        const px = Math.cos(angle) * POD_R * pulse;
        const py = Math.sin(angle) * POD_R * pulse;
        if (i) ctx.lineTo(px, py); else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(253,230,138,.16)';
      ctx.fill();
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.rotate(-frame * 0.05);
      ctx.strokeStyle = 'rgba(255,255,255,.55)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, 0, POD_R + 8 + Math.sin(frame * 0.08) * 3, 0.35, 2.8);
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = 'rgba(253,230,138,.85)';
      ctx.font = '700 9px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('ION POD', pod.x, pod.y - POD_R - 14);
      ctx.textAlign = 'left';
    };

    const draw = () => {
      const m = matchRef.current;
      const p = playerRef.current;
      const a = aiRef.current;
      const b = ballRef.current;
      const frame = m.frame;
      const dpr = canvas.width / W;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const arena = ctx.createLinearGradient(0, 0, W, H);
      arena.addColorStop(0, '#040711');
      arena.addColorStop(0.5, '#0b132b');
      arena.addColorStop(1, '#050814');
      ctx.fillStyle = arena;
      ctx.fillRect(0, 0, W, H);

      ctx.strokeStyle = 'rgba(56,189,248,.07)';
      ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, TOP);
        ctx.lineTo(x, BOT);
        ctx.stroke();
      }
      for (let y = TOP; y <= BOT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }

      ctx.fillStyle = 'rgba(56,189,248,.04)';
      ctx.fillRect(0, TOP, W, BOT - TOP);
      ctx.strokeStyle = 'rgba(56,189,248,.4)';
      ctx.lineWidth = 2;
      ctx.strokeRect(10, TOP - 4, W - 20, BOT - TOP + 8);

      const near = b.vx < 0 ? clamp(1 - b.x / 190, 0, 1) : 0;
      const far = b.vx > 0 ? clamp(1 - (W - b.x) / 190, 0, 1) : 0;
      const leftGlow = ctx.createLinearGradient(0, 0, 150, 0);
      leftGlow.addColorStop(0, `rgba(56,189,248,${(near * 0.32).toFixed(2)})`);
      leftGlow.addColorStop(1, 'rgba(56,189,248,0)');
      ctx.fillStyle = leftGlow;
      ctx.fillRect(10, TOP, 140, BOT - TOP);
      const rightGlow = ctx.createLinearGradient(W, 0, W - 150, 0);
      rightGlow.addColorStop(0, `rgba(248,113,113,${(far * 0.32).toFixed(2)})`);
      rightGlow.addColorStop(1, 'rgba(248,113,113,0)');
      ctx.fillStyle = rightGlow;
      ctx.fillRect(W - 150, TOP, 140, BOT - TOP);

      ctx.setLineDash([8, 8]);
      ctx.strokeStyle = 'rgba(56,189,248,.25)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(W / 2, TOP);
      ctx.lineTo(W / 2, BOT);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(56,189,248,.2)';
      ctx.beginPath();
      ctx.arc(W / 2, (TOP + BOT) / 2, 52, 0, Math.PI * 2);
      ctx.stroke();

      drawPod();

      for (const spark of sparksRef.current) {
        const alpha = spark.life / spark.max;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size * alpha, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      for (let i = 1; i < b.trail.length; i++) {
        const k = i / b.trail.length;
        ctx.strokeStyle = `rgba(56,189,248,${(k * 0.32).toFixed(2)})`;
        ctx.lineWidth = BALL_R * 2 * k * 0.8;
        ctx.beginPath();
        ctx.moveTo(b.trail[i - 1].x, b.trail[i - 1].y);
        ctx.lineTo(b.trail[i].x, b.trail[i].y);
        ctx.stroke();
      }

      drawPaddle(PLAYER_X, p.y, p.boost, '#0284c7', '#38bdf8');
      drawPaddle(AI_X, a.y, a.boost, '#991b1b', '#ef4444');

      ctx.save();
      ctx.shadowColor = '#38bdf8';
      ctx.shadowBlur = 14;
      const ballGradient = ctx.createRadialGradient(b.x - 2, b.y - 2, 1, b.x, b.y, BALL_R);
      ballGradient.addColorStop(0, '#fff');
      ballGradient.addColorStop(0.5, '#bae6fd');
      ballGradient.addColorStop(1, '#0284c7');
      ctx.fillStyle = ballGradient;
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      if (m.serveT > 0 && stateRef.current === 'PLAYING') {
        const phase = (m.serveT % 30) / 30;
        ctx.strokeStyle = `rgba(253,230,138,${(phase * 0.8).toFixed(2)})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(W / 2, (TOP + BOT) / 2, 26 + (1 - phase) * 44, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#fde68a';
        ctx.font = '900 54px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(String(Math.ceil(m.serveT / 30)), W / 2, (TOP + BOT) / 2 - 34);
        ctx.textAlign = 'left';
      }

      if (m.banner) {
        const k = m.banner.t / 90;
        const alpha = k < 0.15 ? k / 0.15 : 1 - Math.max(0, (k - 0.6) / 0.4);
        ctx.globalAlpha = clamp(alpha, 0, 1);
        ctx.fillStyle = m.banner.color;
        ctx.font = '900 22px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = m.banner.color;
        ctx.shadowBlur = 16;
        ctx.fillText(m.banner.text, W / 2, TOP + 66 - k * 12);
        ctx.shadowBlur = 0;
        ctx.textAlign = 'left';
        ctx.globalAlpha = 1;
      }

      if (stateRef.current === 'PLAYING' && m.rally >= 4) {
        ctx.fillStyle = 'rgba(253,230,138,.85)';
        ctx.font = '800 11px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`RALLY ${m.rally}`, W / 2, BOT - 12);
        ctx.textAlign = 'left';
      }

      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
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
      if (pausedRef.current) {
        lastTime = now;
        accumulator = 0;
        return;
      }
      const delta = Math.min(100, now - lastTime);
      lastTime = now;
      accumulator += delta;
      let steps = 0;
      while (accumulator >= STEP && steps < 6) {
        if (stateRef.current === 'PLAYING') step();
        accumulator -= STEP;
        steps++;
      }
      if (steps >= 6) accumulator = 0;
      draw();
    };

    animationId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationId);
  }, [spawnPod, syncHud]);

  const setPointerY = (clientY: number, rect: DOMRect) => {
    if (pausedRef.current) return;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * H;
    playerRef.current.targetY = clamp(y - paddleHeight(playerRef.current.boost) / 2, TOP, BOT - paddleHeight(playerRef.current.boost));
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    setPointerY(event.clientY, event.currentTarget.getBoundingClientRect());
  };

  const pilot = PILOTS[Math.min(hud.pilot, PILOTS.length - 1)];

  return (
    <div
      className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none touch-none"
      onPointerMove={handlePointerMove}
    >
      <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block cursor-ns-resize" aria-label="Ion Rally circuit court" />

      <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-2 p-3 sm:p-4 pointer-events-none">
        <div className="rounded-xl border border-white/10 bg-[#070913]/75 px-3 py-2 backdrop-blur-md">
          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-cyan-300">Pilot {hud.pilot + 1} / {PILOTS.length}</div>
          <div className="text-sm font-semibold text-white leading-tight">{pilot.name}</div>
          <div className="text-[10px] font-mono text-slate-400">Best {Math.max(highScore, hud.score)}</div>
        </div>

        <div className="mt-1 text-center">
          <div className="font-mono text-3xl font-bold text-white tabular-nums">{hud.score}</div>
          <div className="text-[9px] font-mono uppercase tracking-[0.2em] text-cyan-200/70">Circuit Score</div>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] font-mono text-amber-300">
            <span>Rally {hud.rally}</span>
            {hud.playerBoost && <span className="rounded bg-amber-300/15 px-1.5 py-0.5 text-amber-200">OVERCHARGE</span>}
          </div>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#070913]/75 px-3 py-2 text-right backdrop-blur-md">
          <div className="text-[9px] font-mono uppercase tracking-[0.18em] text-rose-300">AI Core</div>
          <div className="text-sm font-semibold text-white leading-tight tabular-nums">{hud.ai}</div>
          <div className="text-[10px] font-mono text-slate-400">You {hud.player} · first to {WIN_POINTS}</div>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-white mb-1 tracking-tight">Ion Rally · Holo Circuit</div>
          <p className="text-sm text-slate-300 mb-1">Five pilots. First to 7. Move with the mouse, W/S or arrows.</p>
          <p className="text-xs text-amber-200/90 mb-5">Steer a return into the Ion Pod to overcharge your paddle.</p>
          <button
            onClick={startMatch}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            START CIRCUIT
          </button>
          <span className="mt-3 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400">Space or Enter also starts</span>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-white mb-1 tracking-tight">
            {hud.pilot >= PILOTS.length - 1 && hud.player >= WIN_POINTS ? 'Circuit Cleared' : 'AI Core Wins'}
          </div>
          <div className="text-sm text-slate-300 mb-1">
            Final Circuit Score: <span className="font-mono text-cyan-300">{hud.score}</span>
          </div>
          <div className="text-xs text-slate-400 mb-4">
            Pilots cleared {Math.min(PILOTS.length, hud.pilot + (hud.player >= WIN_POINTS && hud.pilot >= PILOTS.length - 1 ? 1 : 0))} / {PILOTS.length} · Best rally {hud.bestRally}
          </div>
          <button
            onClick={startMatch}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Rematch
          </button>
          <span className="mt-3 text-[10px] font-mono uppercase tracking-[0.16em] text-slate-400">Space also retries</span>
        </div>
      )}
    </div>
  );
};
