import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface SpaceInvadersEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  onRestart?: () => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

type GameState = 'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY';
type BulletShape = 'straight' | 'zigzag' | 'fast';
type PodType = 'rapid' | 'repair' | 'charge' | 'life';

interface Alien {
  x: number;
  y: number;
  row: number;
  alive: boolean;
  color: string;
}

interface Bullet {
  x: number;
  y: number;
  vx: number;
  vy: number;
  kind: 'player' | 'enemy';
  shape?: BulletShape;
  t: number;
  x0: number;
}

interface Bunker {
  x: number;
  y: number;
  cells: boolean[];
}

interface Pod {
  x: number;
  y: number;
  type: PodType;
  t: number;
}

const W = 640;
const H = 480;
const ROWS = 4;
const COLS = 8;
const PLAYER_Y = 442;
const BUNKER_COLS = 12;
const BUNKER_ROWS = 8;
const CELL = 4;
const MAX_WAVE = 10;
const FIRE_LINE = 360;

const POD_META: Record<PodType, { color: string; label: string }> = {
  rapid: { color: '#38BDF8', label: 'R' },
  repair: { color: '#34D399', label: 'H' },
  charge: { color: '#FBBF24', label: 'C' },
  life: { color: '#F472B6', label: '+' },
};

const ROW_COLORS = ['#F43F5E', '#FB7185', '#06B6D4', '#10B981'];

function makeBunker(x: number, y: number): Bunker {
  const cells: boolean[] = [];
  for (let r = 0; r < BUNKER_ROWS; r++) {
    for (let c = 0; c < BUNKER_COLS; c++) {
      let on = true;
      if (r === 0 && (c < 2 || c > BUNKER_COLS - 3)) on = false;
      if (r === 1 && (c < 1 || c > BUNKER_COLS - 2)) on = false;
      if (r >= BUNKER_ROWS - 2 && c >= 4 && c <= 7) on = false;
      cells.push(on);
    }
  }
  return { x, y, cells };
}

function damageBunker(bunkers: Bunker[], x: number, y: number, radius: number): boolean {
  for (const bunker of bunkers) {
    if (x < bunker.x || x >= bunker.x + BUNKER_COLS * CELL || y < bunker.y || y >= bunker.y + BUNKER_ROWS * CELL) continue;
    const cx = Math.floor((x - bunker.x) / CELL);
    const cy = Math.floor((y - bunker.y) / CELL);
    let hit = false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const bx = cx + dx;
        const by = cy + dy;
        if (bx < 0 || by < 0 || bx >= BUNKER_COLS || by >= BUNKER_ROWS || dx * dx + dy * dy > radius * radius + 1) continue;
        const index = by * BUNKER_COLS + bx;
        if (bunker.cells[index]) {
          bunker.cells[index] = false;
          hit = true;
        }
      }
    }
    if (hit) return true;
  }
  return false;
}

export const SpaceInvadersEngine: React.FC<SpaceInvadersEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  onRestart,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [combo, setCombo] = useState(0);
  const [charge, setCharge] = useState(0);
  const [overdriveActive, setOverdriveActive] = useState(false);
  const [gameState, setGameState] = useState<GameState>('READY');

  const playerRef = useRef({ x: W / 2 });
  const aliensRef = useRef<Alien[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const bunkersRef = useRef<Bunker[]>([]);
  const podsRef = useRef<Pod[]>([]);
  const ufoRef = useRef({ x: -50, y: 46, active: false, dir: 1 });
  const ufoTimerRef = useRef(800);
  const stepTimerRef = useRef(0);
  const marchDirRef = useRef(1);
  const waveRef = useRef(1);
  const scoreRef = useRef(0);
  const livesRef = useRef(3);
  const comboRef = useRef(0);
  const comboTRef = useRef(0);
  const chargeRef = useRef(0);
  const overdriveRef = useRef(0);
  const rapidRef = useRef(0);
  const invulnRef = useRef(0);
  const fireCdRef = useRef(0);
  const waveBannerRef = useRef(0);
  const clockRef = useRef(0);
  const stateRef = useRef<GameState>('READY');
  const keysRef = useRef<Set<string>>(new Set());
  const difficultyRef = useRef<DifficultySetting>(difficulty);
  difficultyRef.current = difficulty;
  const restartRef = useRef(onRestart);
  restartRef.current = onRestart;
  const endedRef = useRef(false);

  const initAliens = (waveNumber: number) => {
    const list: Alien[] = [];
    const startY = 68 + Math.min(5, waveNumber - 1) * 6;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        list.push({ x: 100 + c * 52, y: startY + r * 36, row: r, alive: true, color: ROW_COLORS[r] });
      }
    }
    aliensRef.current = list;
    marchDirRef.current = 1;
    stepTimerRef.current = 0;
  };

  const initBunkers = () => {
    bunkersRef.current = [0, 1, 2, 3].map((index) => makeBunker(92 + index * 136, 364));
  };

  const startGame = useCallback(() => {
    if (endedRef.current) {
      endedRef.current = false;
      restartRef.current?.();
    }
    playerRef.current = { x: W / 2 };
    scoreRef.current = 0;
    livesRef.current = 3;
    waveRef.current = 1;
    comboRef.current = 0;
    comboTRef.current = 0;
    chargeRef.current = 0;
    overdriveRef.current = 0;
    rapidRef.current = 0;
    invulnRef.current = 0;
    fireCdRef.current = 0;
    waveBannerRef.current = 70;
    bulletsRef.current = [];
    podsRef.current = [];
    ufoRef.current = { x: -50, y: 46, active: false, dir: 1 };
    ufoTimerRef.current = 800;
    keysRef.current.clear();
    initAliens(1);
    initBunkers();
    setScore(0);
    setLives(3);
    setWave(1);
    setCombo(0);
    setCharge(0);
    setOverdriveActive(false);
    stateRef.current = 'PLAYING';
    setGameState('PLAYING');
    audio.playClick();
  }, []);

  const activateOverdrive = useCallback(() => {
    if (stateRef.current !== 'PLAYING' || overdriveRef.current > 0 || chargeRef.current < 100) return;
    overdriveRef.current = 360;
    chargeRef.current = 0;
    setCharge(0);
    setOverdriveActive(true);
    audio.playDash();
  }, []);

  useEffect(() => {
    const keys = keysRef.current;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPaused) return;
      keys.add(event.code);
      if (event.code === 'Space') {
        event.preventDefault();
        if (stateRef.current !== 'PLAYING') startGame();
      }
      if (event.code === 'KeyK') activateOverdrive();
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      keys.delete(event.code);
    };
    const clearKeys = () => keys.clear();
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearKeys);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearKeys);
      keys.clear();
    };
  }, [isPaused, startGame, activateOverdrive]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const addScore = (amount: number) => {
      scoreRef.current += amount;
      setScore(scoreRef.current);
      onScoreUpdate(scoreRef.current);
    };

    const spawnPod = (x: number, y: number) => {
      const types: PodType[] = ['rapid', 'repair', 'charge', 'life'];
      podsRef.current.push({ x, y, type: types[Math.floor(Math.random() * types.length)], t: 0 });
    };

    const collectPod = (pod: Pod) => {
      if (pod.type === 'rapid') rapidRef.current = 480;
      else if (pod.type === 'repair') initBunkers();
      else if (pod.type === 'charge') {
        if (overdriveRef.current <= 0) {
          chargeRef.current = Math.min(100, chargeRef.current + 50);
          setCharge(chargeRef.current);
        }
      } else {
        livesRef.current = Math.min(6, livesRef.current + 1);
        setLives(livesRef.current);
      }
      audio.playScore();
    };

    const endRun = (victory: boolean) => {
      if (stateRef.current !== 'PLAYING') return;
      endedRef.current = true;
      if (victory) {
        addScore(1000);
        stateRef.current = 'VICTORY';
        setGameState('VICTORY');
      } else {
        stateRef.current = 'GAMEOVER';
        setGameState('GAMEOVER');
      }
      setOverdriveActive(false);
      onGameOver(scoreRef.current);
    };

    const clearWave = () => {
      addScore(100 * waveRef.current);
      if (waveRef.current >= MAX_WAVE) {
        endRun(true);
        return;
      }
      waveRef.current += 1;
      setWave(waveRef.current);
      initAliens(waveRef.current);
      initBunkers();
      bulletsRef.current = [];
      podsRef.current = [];
      ufoRef.current.active = false;
      ufoTimerRef.current = 700 + Math.floor(Math.random() * 700);
      waveBannerRef.current = 70;
      audio.playScore();
    };

    const killAlien = (alien: Alien) => {
      alien.alive = false;
      comboRef.current += 1;
      comboTRef.current = 150;
      const multiplier = 1 + Math.min(4, Math.floor(comboRef.current / 5));
      addScore((4 - alien.row) * 15 * multiplier);
      setCombo(comboRef.current);
      if (overdriveRef.current <= 0) {
        chargeRef.current = Math.min(100, chargeRef.current + 7);
        setCharge(chargeRef.current);
      }
      audio.playHit();
    };

    const update = () => {
      const keys = keysRef.current;
      const diff = difficultyRef.current;
      const player = playerRef.current;

      if (invulnRef.current > 0) invulnRef.current -= 1;
      if (waveBannerRef.current > 0) waveBannerRef.current -= 1;
      if (comboTRef.current > 0 && --comboTRef.current === 0) {
        comboRef.current = 0;
        setCombo(0);
      }
      if (overdriveRef.current > 0) {
        overdriveRef.current -= 1;
        if (overdriveRef.current === 0) setOverdriveActive(false);
      }
      if (rapidRef.current > 0) rapidRef.current -= 1;
      if (fireCdRef.current > 0) fireCdRef.current -= 1;

      const moveSpeed = diff === 'hard' ? 6.2 : diff === 'easy' ? 4.6 : 5.4;
      if (keys.has('ArrowLeft') || keys.has('KeyA')) player.x = Math.max(24, player.x - moveSpeed);
      if (keys.has('ArrowRight') || keys.has('KeyD')) player.x = Math.min(W - 24, player.x + moveSpeed);

      const playerBulletCount = bulletsRef.current.filter((bullet) => bullet.kind === 'player').length;
      if (keys.has('Space') && fireCdRef.current === 0 && waveBannerRef.current < 20) {
        const cap = overdriveRef.current > 0 ? 9 : rapidRef.current > 0 ? 5 : 3;
        if (playerBulletCount < cap) {
          if (overdriveRef.current > 0) {
            for (const vx of [-2.2, 0, 2.2]) {
              bulletsRef.current.push({ x: player.x, y: PLAYER_Y - 18, vx, vy: -9.5, kind: 'player', t: 0, x0: player.x });
            }
            fireCdRef.current = 9;
          } else {
            bulletsRef.current.push({ x: player.x, y: PLAYER_Y - 18, vx: 0, vy: rapidRef.current > 0 ? -10 : -8.5, kind: 'player', t: 0, x0: player.x });
            fireCdRef.current = rapidRef.current > 0 ? 7 : 14;
          }
          audio.playLaser();
        }
      }

      for (let i = bulletsRef.current.length - 1; i >= 0; i--) {
        const bullet = bulletsRef.current[i];
        bullet.t += 1;
        bullet.x += bullet.vx;
        bullet.y += bullet.vy;
        if (bullet.shape === 'zigzag') bullet.x = bullet.x0 + Math.sin(bullet.t * 0.18) * 16;

        let gone = bullet.y < 8 || bullet.y > H + 20 || bullet.x < -20 || bullet.x > W + 20;
        if (!gone && damageBunker(bunkersRef.current, bullet.x, bullet.y, bullet.shape === 'fast' ? 2 : 1)) gone = true;

        if (!gone && bullet.kind === 'player') {
          const ufo = ufoRef.current;
          if (ufo.active && Math.hypot(bullet.x - ufo.x, bullet.y - ufo.y) < 24) {
            ufo.active = false;
            ufoTimerRef.current = 700 + Math.floor(Math.random() * 700);
            spawnPod(ufo.x, ufo.y);
            addScore(200);
            audio.playScore();
            gone = true;
          }
          if (!gone) {
            for (const alien of aliensRef.current) {
              if (alien.alive && Math.abs(bullet.x - alien.x) < 18 && Math.abs(bullet.y - alien.y) < 14) {
                killAlien(alien);
                gone = true;
                break;
              }
            }
          }
        }

        if (!gone && bullet.kind === 'enemy' && invulnRef.current === 0) {
          if (Math.abs(bullet.x - player.x) < 18 && bullet.y > PLAYER_Y - 14 && bullet.y < PLAYER_Y + 14) {
            livesRef.current -= 1;
            setLives(livesRef.current);
            invulnRef.current = 120;
            bulletsRef.current = bulletsRef.current.filter((entry) => entry.kind === 'player');
            audio.playExplosion();
            if (livesRef.current <= 0) endRun(false);
            return;
          }
        }

        if (gone) bulletsRef.current.splice(i, 1);
      }

      if (stateRef.current !== 'PLAYING') return;
      if (waveBannerRef.current > 0) return;

      const living = aliensRef.current.filter((alien) => alien.alive);
      if (living.length === 0) {
        clearWave();
        return;
      }

      const interval = Math.max(6, Math.round(((diff === 'hard' ? 26 : diff === 'easy' ? 46 : 36) * living.length) / 32 + 6));
      stepTimerRef.current += 1;
      if (stepTimerRef.current >= interval) {
        stepTimerRef.current = 0;
        let shiftDown = false;
        for (const alien of living) {
          if ((marchDirRef.current === 1 && alien.x > W - 40) || (marchDirRef.current === -1 && alien.x < 40)) {
            shiftDown = true;
            break;
          }
        }
        if (shiftDown) {
          marchDirRef.current *= -1;
          for (const alien of living) alien.y += 16;
          if (living.some((alien) => alien.y >= FIRE_LINE)) {
            audio.playExplosion();
            endRun(false);
            return;
          }
        } else {
          for (const alien of living) alien.x += marchDirRef.current * 10;
        }

        const enemyCount = bulletsRef.current.filter((bullet) => bullet.kind === 'enemy').length;
        const fireChance = diff === 'hard' ? 0.72 : diff === 'easy' ? 0.32 : 0.5;
        if (enemyCount < 6 && Math.random() < fireChance) {
          const shooter = living[Math.floor(Math.random() * living.length)];
          const shape: BulletShape = waveRef.current >= 4 && Math.random() < 0.2 ? 'fast' : Math.random() < 0.4 ? 'zigzag' : 'straight';
          const speed = (shape === 'fast' ? 6.2 : shape === 'zigzag' ? 2.8 : 3.4) * (diff === 'hard' ? 1.15 : diff === 'easy' ? 0.85 : 1);
          bulletsRef.current.push({ x: shooter.x, y: shooter.y + 16, vx: 0, vy: speed, kind: 'enemy', shape, t: 0, x0: shooter.x });
        }
      }

      const ufo = ufoRef.current;
      if (!ufo.active) {
        ufoTimerRef.current -= 1;
        if (ufoTimerRef.current <= 0) {
          ufo.active = true;
          ufo.dir = Math.random() > 0.5 ? 1 : -1;
          ufo.x = ufo.dir === 1 ? -40 : W + 40;
          ufo.y = 46;
        }
      } else {
        ufo.x += ufo.dir * 2.6;
        if (ufo.x < -60 || ufo.x > W + 60) {
          ufo.active = false;
          ufoTimerRef.current = 700 + Math.floor(Math.random() * 700);
        }
      }

      for (let i = podsRef.current.length - 1; i >= 0; i--) {
        const pod = podsRef.current[i];
        pod.t += 1;
        pod.y += 1.7;
        pod.x += Math.sin(pod.t * 0.08) * 0.5;
        if (pod.y > PLAYER_Y + 24) {
          podsRef.current.splice(i, 1);
          continue;
        }
        if (Math.abs(pod.x - player.x) < 28 && pod.y > PLAYER_Y - 28) {
          collectPod(pod);
          podsRef.current.splice(i, 1);
        }
      }
    };

    const drawBunkers = () => {
      for (const bunker of bunkersRef.current) {
        for (let r = 0; r < BUNKER_ROWS; r++) {
          for (let c = 0; c < BUNKER_COLS; c++) {
            if (!bunker.cells[r * BUNKER_COLS + c]) continue;
            const top = r === 0 || !bunker.cells[(r - 1) * BUNKER_COLS + c];
            ctx.fillStyle = top ? '#86EFAC' : `rgba(34,197,94,${0.35 + (1 - r / BUNKER_ROWS) * 0.55})`;
            ctx.fillRect(bunker.x + c * CELL, bunker.y + r * CELL, CELL, CELL);
          }
        }
      }
    };

    const draw = () => {
      const clock = clockRef.current;
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, '#05030F');
      sky.addColorStop(0.58, '#0B1030');
      sky.addColorStop(1, '#1A1347');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      for (let s = 0; s < 68; s++) {
        const sx = (s * 97 + 13) % W;
        const sy = (s * 53) % 350;
        const twinkle = 0.2 + 0.5 * Math.abs(Math.sin(clock * 0.02 + s * 0.7));
        ctx.fillStyle = `rgba(199,210,254,${twinkle.toFixed(2)})`;
        ctx.fillRect(sx, sy, 1.6, 1.6);
      }

      const glow = ctx.createRadialGradient(W / 2, 440, 20, W / 2, 440, 360);
      glow.addColorStop(0, 'rgba(99,102,241,0.22)');
      glow.addColorStop(1, 'rgba(99,102,241,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 300, W, H - 300);

      ctx.strokeStyle = 'rgba(6,182,212,0.18)';
      ctx.lineWidth = 1;
      for (let x = 0; x <= W; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 408);
        ctx.lineTo(x - 34, H);
        ctx.stroke();
      }
      for (let y = 414; y < H; y += 16) {
        ctx.globalAlpha = (y - 400) / (H - 400) * 0.6;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      drawBunkers();

      for (const alien of aliensRef.current) {
        if (!alien.alive) continue;
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(alien.x - 14, alien.y + 7, 28, 15);
        ctx.fillStyle = alien.color;
        ctx.shadowColor = alien.color;
        ctx.shadowBlur = 7;
        ctx.fillRect(alien.x - 14, alien.y - 8, 28, 16);
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#060811';
        ctx.fillRect(alien.x - 8, alien.y - 4, 4, 5);
        ctx.fillRect(alien.x + 4, alien.y - 4, 4, 5);
        ctx.fillStyle = alien.color;
        ctx.fillRect(alien.x - 10, alien.y - 12, 3, 5);
        ctx.fillRect(alien.x + 7, alien.y - 12, 3, 5);
      }

      const ufo = ufoRef.current;
      if (ufo.active) {
        ctx.fillStyle = '#E11D48';
        ctx.shadowColor = '#F43F5E';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.ellipse(ufo.x, ufo.y, 22, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#FDA4AF';
        ctx.beginPath();
        ctx.arc(ufo.x, ufo.y - 3, 7, Math.PI, 0);
        ctx.fill();
        ctx.shadowBlur = 0;
      }

      for (const pod of podsRef.current) {
        const meta = POD_META[pod.type];
        const pulse = 1 + Math.sin(clock * 0.18 + pod.t * 0.2) * 0.14;
        ctx.save();
        ctx.translate(pod.x, pod.y);
        ctx.rotate(clock * 0.02);
        ctx.strokeStyle = meta.color;
        ctx.fillStyle = `${meta.color}33`;
        ctx.shadowColor = meta.color;
        ctx.shadowBlur = 12;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI) / 2;
          const px = Math.cos(angle) * 13 * pulse;
          const py = Math.sin(angle) * 13 * pulse;
          if (i) ctx.lineTo(px, py);
          else ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '800 11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(meta.label, pod.x, pod.y + 4);
      }

      for (const bullet of bulletsRef.current) {
        if (bullet.kind === 'player') {
          const bulletColor = overdriveRef.current > 0 ? '#FDE68A' : '#38BDF8';
          ctx.fillStyle = bulletColor;
          ctx.shadowColor = bulletColor;
          ctx.shadowBlur = 9;
          ctx.fillRect(bullet.x - 2, bullet.y - 7, 4, 14);
        } else {
          const color = bullet.shape === 'fast' ? '#F87171' : bullet.shape === 'zigzag' ? '#C084FC' : '#4ADE80';
          ctx.fillStyle = color;
          ctx.shadowColor = color;
          ctx.shadowBlur = 9;
          if (bullet.shape === 'zigzag') {
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
            ctx.fill();
          } else {
            ctx.fillRect(bullet.x - 2, bullet.y - 7, 4, bullet.shape === 'fast' ? 18 : 14);
          }
        }
        ctx.shadowBlur = 0;
      }

      const player = playerRef.current;
      if (!(invulnRef.current > 0 && Math.floor(clock / 5) % 2 === 0)) {
        if (overdriveRef.current > 0) {
          ctx.strokeStyle = `rgba(251,191,36,${0.35 + 0.25 * Math.sin(clock * 0.3)})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(player.x, PLAYER_Y, 31 + Math.sin(clock * 0.2) * 3, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(0,0,0,0.4)';
        ctx.fillRect(player.x - 20, PLAYER_Y + 10, 40, 8);
        const body = ctx.createLinearGradient(player.x - 20, 0, player.x + 20, 0);
        body.addColorStop(0, '#0284C7');
        body.addColorStop(0.5, '#38BDF8');
        body.addColorStop(1, '#0369A1');
        ctx.fillStyle = body;
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(player.x, PLAYER_Y - 18);
        ctx.lineTo(player.x - 20, PLAYER_Y + 12);
        ctx.lineTo(player.x, PLAYER_Y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(player.x, PLAYER_Y - 18);
        ctx.lineTo(player.x + 20, PLAYER_Y + 12);
        ctx.lineTo(player.x, PLAYER_Y + 6);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#E0F2FE';
        ctx.fillRect(player.x - 3, PLAYER_Y - 16, 6, 14);
        ctx.fillStyle = `rgba(251,191,36,${0.55 + Math.sin(clock * 0.4) * 0.25})`;
        ctx.beginPath();
        ctx.moveTo(player.x - 4, PLAYER_Y + 8);
        ctx.lineTo(player.x, PLAYER_Y + 18 + Math.sin(clock * 0.5) * 3);
        ctx.lineTo(player.x + 4, PLAYER_Y + 8);
        ctx.fill();
      }

      if (waveBannerRef.current > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, waveBannerRef.current / 24);
        ctx.fillStyle = 'rgba(5,7,15,0.4)';
        ctx.fillRect(0, 190, W, 74);
        ctx.fillStyle = '#67E8F9';
        ctx.font = '800 38px monospace';
        ctx.textAlign = 'center';
        ctx.shadowColor = '#67E8F9';
        ctx.shadowBlur = 18;
        ctx.fillText(`WAVE ${waveRef.current}`, W / 2, 240);
        ctx.restore();
      }

      const vignette = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.78);
      vignette.addColorStop(0, 'rgba(0,0,0,0)');
      vignette.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
    };

    const loop = () => {
      if (!isPaused) {
        clockRef.current += 1;
        if (stateRef.current === 'PLAYING') update();
        draw();
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isPaused, onGameOver, onScoreUpdate]);

  const multiplier = 1 + Math.min(4, Math.floor(combo / 5));
  const overdriveRatio = overdriveActive ? 1 : charge / 100;

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" />

      <div className="absolute top-4 left-6 right-6 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-xs text-slate-400">Score</span>
            <span className="text-lg font-mono font-bold text-cyan-400 tabular-nums">{score}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
            <span className="text-xs text-slate-400">Wave</span>
            <span className="text-lg font-mono font-bold text-indigo-300 tabular-nums">{wave}/{MAX_WAVE}</span>
          </div>
          {combo > 1 && (
            <div className="flex items-center gap-2 bg-amber-400/10 backdrop-blur-md px-3 py-1.5 rounded-lg border border-amber-300/30">
              <span className="text-xs text-amber-200/70">Combo</span>
              <span className="text-lg font-mono font-bold text-amber-300 tabular-nums">{combo} ×{multiplier}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
          <span className="text-xs text-slate-400">Shields</span>
          <div className="flex gap-1.5">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-xs ${
                  i < lives ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]' : 'bg-slate-800'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {gameState === 'PLAYING' && (
        <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between pointer-events-none">
          <div className="w-44">
            <div className="flex justify-between text-[10px] font-mono font-bold tracking-wider mb-1">
              <span className={overdriveActive || charge >= 100 ? 'text-amber-300' : 'text-slate-400'}>OVERDRIVE</span>
              <span className={overdriveActive || charge >= 100 ? 'text-amber-300' : 'text-slate-500'}>
                {overdriveActive ? 'ACTIVE' : charge >= 100 ? 'K READY' : `${charge}%`}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className={`h-full rounded-full transition-[width] duration-150 ${overdriveActive ? 'bg-amber-300' : 'bg-indigo-400'}`}
                style={{ width: `${overdriveRatio * 100}%` }}
              />
            </div>
          </div>
          <span className="text-[10px] font-mono text-slate-500 tracking-wide">HOLD SPACE · K OVERDRIVE</span>
        </div>
      )}

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-white mb-2 tracking-tight">Hivefall Defense</div>
          <p className="text-sm text-slate-300 mb-1">A/D or Arrows to steer · hold Space to fire</p>
          <p className="text-xs text-slate-400 mb-5">Chain kills · catch saucer pods · K unleashes overdrive</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            START DEFENSE
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">Defense Perimeter Lost</div>
          <div className="text-sm text-slate-300 mb-4">
            Wave {wave} · Total Score: <span className="font-mono text-cyan-300 font-bold">{score}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            DEPLOY NEW VESSEL
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-emerald-400 mb-1 tracking-tight">Hive Destroyed!</div>
          <div className="text-sm text-slate-300 mb-4">
            All {MAX_WAVE} waves cleared · Score: <span className="font-mono text-emerald-300 font-bold">{score}</span>
          </div>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            RUN IT AGAIN
          </button>
        </div>
      )}
    </div>
  );
};
