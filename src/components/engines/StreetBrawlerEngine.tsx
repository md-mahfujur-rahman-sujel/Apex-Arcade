import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface StreetBrawlerEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  highScore?: number;
  onLevelComplete?: (level: number, score: number) => void;
  onRestart?: () => void;
}

type MoveKey = 'punch' | 'kick' | 'spec';
type Phase = 'intro' | 'fight' | 'ko' | 'result';
type AiMode = 'wait' | 'approach' | 'retreat' | 'block' | 'jump' | MoveKey;

interface RivalDef {
  name: string;
  title: string;
  look: string;
  skin: string;
  cloth: string;
  trim: string;
  speed: number;
  dmgMul: number;
  aggr: number;
  blockChance: number;
  react: number;
}

interface Fighter {
  def: RivalDef;
  isP: boolean;
  x: number;
  y: number;
  vy: number;
  face: 1 | -1;
  hp: number;
  ghost: number;
  meter: number;
  st: 'idle' | 'atk' | 'hurt' | 'ko';
  t: number;
  mvKey: MoveKey | '';
  hitDone: boolean;
  stun: number;
  down: boolean;
  blocking: boolean;
  combo: number;
  comboT: number;
  buf: Record<'jump' | MoveKey, number>;
  flash: number;
  bflash: number;
  aid: number;
  walkT: number;
  ai: { t: number; mode: AiMode; fired: boolean; seen: number };
}

interface Sim {
  p: Fighter;
  e: Fighter;
  rivalIndex: number;
  round: number;
  pw: number;
  ow: number;
  lives: number;
  phase: Phase;
  pt: number;
  timer: number;
  ft: number;
  winner: 'p' | 'e' | null;
  why: string;
  score: number;
  frame: number;
}

interface Move {
  su: number;
  ac: number;
  rc: number;
  dmg: number;
  reach: number;
  stun: number;
  kb: number;
  meter: number;
  lunge: number;
}

const W = 640;
const H = 480;
const FLOOR = 390;
const TAU = Math.PI * 2;

const ROSTER: RivalDef[] = [
  { name: 'Brakk', title: 'Dockyard Bruiser', look: 'brakk', skin: '#d9a273', cloth: '#b4452f', trim: '#f4c04b', speed: 2.3, dmgMul: 0.95, aggr: 0.45, blockChance: 0.22, react: 24 },
  { name: 'Sable', title: 'Rooftop Phantom', look: 'sable', skin: '#e7c3a0', cloth: '#6d3bd1', trim: '#22d3ee', speed: 3.0, dmgMul: 1.05, aggr: 0.62, blockChance: 0.42, react: 15 },
  { name: 'Warden Orlo', title: 'Ember Champion', look: 'orlo', skin: '#8a5a3b', cloth: '#27303f', trim: '#fb923c', speed: 3.2, dmgMul: 1.2, aggr: 0.8, blockChance: 0.58, react: 9 },
  { name: 'Vex', title: 'Signal Duelist', look: 'vex', skin: '#f3c6a5', cloth: '#0f766e', trim: '#5eead4', speed: 3.5, dmgMul: 0.9, aggr: 0.68, blockChance: 0.34, react: 12 },
  { name: 'Mira', title: 'Gale Dancer', look: 'mira', skin: '#f0c9a0', cloth: '#be185d', trim: '#fda4af', speed: 3.4, dmgMul: 1, aggr: 0.58, blockChance: 0.46, react: 13 },
  { name: 'Ash', title: 'Furnace Warden', look: 'ash', skin: '#a97c5a', cloth: '#1f2937', trim: '#f97316', speed: 2.6, dmgMul: 1.35, aggr: 0.86, blockChance: 0.5, react: 11 },
];

const PLAYER_DEF: RivalDef = {
  name: 'Kestrel',
  title: 'Circuit Rookie',
  look: 'kestrel',
  skin: '#f0c9a0',
  cloth: '#0ea5e9',
  trim: '#fde047',
  speed: 3.1,
  dmgMul: 1,
  aggr: 0.5,
  blockChance: 0,
  react: 12,
};

const MOVES: Record<MoveKey, Move> = {
  punch: { su: 4, ac: 4, rc: 9, dmg: 7, reach: 64, stun: 15, kb: 2.4, meter: 7, lunge: 0 },
  kick: { su: 8, ac: 5, rc: 14, dmg: 12, reach: 82, stun: 19, kb: 4.6, meter: 10, lunge: 0 },
  spec: { su: 13, ac: 14, rc: 19, dmg: 24, reach: 90, stun: 32, kb: 8, meter: 0, lunge: 5.5 },
};

const shade = (hex: string, amount: number) => {
  const value = hex.replace('#', '');
  const num = parseInt(value.length === 3 ? value.split('').map((c) => c + c).join('') : value, 16);
  const channels = [(num >> 16) & 255, (num >> 8) & 255, num & 255].map((channel) =>
    Math.max(0, Math.min(255, Math.round(channel + channel * amount))),
  );
  return `rgb(${channels[0]}, ${channels[1]}, ${channels[2]})`;
};

let audioUnlocked = false;
const sound = (name: 'click' | 'hit' | 'jump' | 'laser' | 'score' | 'explosion') => {
  try {
    if (!audioUnlocked) {
      audioUnlocked = true;
      audio.playClick();
      return;
    }
    if (name === 'click') audio.playClick();
    else if (name === 'hit') audio.playHit();
    else if (name === 'jump') audio.playJump();
    else if (name === 'laser') audio.playLaser();
    else if (name === 'score') audio.playScore();
    else audio.playExplosion();
  } catch {
    // Browsers can drop audio frames while tabbed away; gameplay continues.
  }
};

const makeFighter = (def: RivalDef, x: number, face: 1 | -1, isP: boolean): Fighter => ({
  def: { ...def },
  isP,
  x,
  y: FLOOR,
  vy: 0,
  face,
  hp: 100,
  ghost: 100,
  meter: 0,
  st: 'idle',
  t: 0,
  mvKey: '',
  hitDone: false,
  stun: 0,
  down: false,
  blocking: false,
  combo: 0,
  comboT: 0,
  buf: { jump: 0, punch: 0, kick: 0, spec: 0 },
  flash: 0,
  bflash: 0,
  aid: 0,
  walkT: 0,
  ai: { t: 20, mode: 'wait', fired: false, seen: 0 },
});

const scaledRival = (index: number): RivalDef => {
  const base = ROSTER[index % ROSTER.length];
  const tier = Math.floor(index / ROSTER.length);
  const suffix = ['II', 'III', 'IV', 'V'][Math.min(3, tier - 1)];
  return {
    ...base,
    name: tier ? `${base.name} ${suffix}` : base.name,
    title: tier ? 'Circuit Elite' : base.title,
    cloth: shade(base.cloth, -Math.min(0.3, 0.12 * tier)),
    speed: Math.min(3.9, base.speed + 0.12 * tier),
    dmgMul: base.dmgMul + 0.05 * tier,
    aggr: Math.min(0.98, base.aggr + 0.04 * tier),
    blockChance: Math.min(0.85, base.blockChance + 0.03 * tier),
    react: Math.max(6, base.react - tier),
  };
};

const difficultyScale = (difficulty: DifficultySetting) =>
  difficulty === 'easy'
    ? { aggr: 0.72, block: 0.7, react: 1.35, dmg: 0.82 }
    : difficulty === 'hard'
      ? { aggr: 1.18, block: 1.15, react: 0.8, dmg: 1.18 }
      : { aggr: 1, block: 1, react: 1, dmg: 1 };

export const StreetBrawlerEngine: React.FC<StreetBrawlerEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
  highScore = 0,
  onLevelComplete,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER' | 'WON'>('READY');
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER' | 'WON'>('READY');
  stateRef.current = gameState;

  const simRef = useRef<Sim | null>(null);
  const heldRef = useRef<Set<string>>(new Set());
  const callbacksRef = useRef({ score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart });
  callbacksRef.current = { score: onScoreUpdate, over: onGameOver, level: onLevelComplete, restart: onRestart };
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;

  const beginRound = useCallback((sim: Sim, freshRival: boolean) => {
    const rival = scaledRival(sim.rivalIndex);
    const tune = difficultyScale(difficultyRef.current);
    rival.aggr = Math.min(0.98, rival.aggr * tune.aggr);
    rival.blockChance = Math.min(0.85, rival.blockChance * tune.block);
    rival.react = rival.react * tune.react;
    rival.dmgMul *= tune.dmg;
    if (freshRival) {
      sim.pw = 0;
      sim.ow = 0;
      sim.round = 1;
    }
    sim.p = makeFighter(PLAYER_DEF, 220, 1, true);
    sim.e = makeFighter(rival, 420, -1, false);
    sim.phase = 'intro';
    sim.pt = 0;
    sim.timer = 60;
    sim.ft = 0;
    sim.winner = null;
    sim.why = '';
  }, []);

  const startGame = useCallback(() => {
    simRef.current = {
      p: makeFighter(PLAYER_DEF, 220, 1, true),
      e: makeFighter(scaledRival(0), 420, -1, false),
      rivalIndex: 0,
      round: 1,
      pw: 0,
      ow: 0,
      lives: 3,
      phase: 'intro',
      pt: 0,
      timer: 60,
      ft: 0,
      winner: null,
      why: '',
      score: 0,
      frame: 0,
    };
    heldRef.current.clear();
    callbacksRef.current.score(0);
    callbacksRef.current.restart?.();
    setGameState('PLAYING');
    stateRef.current = 'PLAYING';
    sound('click');
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (isPaused) return;
      const code = event.code;
      if (stateRef.current !== 'PLAYING') {
        if (code === 'Space' || code === 'Enter') {
          event.preventDefault();
          startGame();
        }
        return;
      }
      const sim = simRef.current;
      if (!sim || sim.phase !== 'fight') return;
      if (['KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight', 'KeyW', 'ArrowUp', 'Space', 'KeyS', 'ArrowDown', 'KeyF', 'KeyG', 'KeyH'].includes(code)) {
        event.preventDefault();
      }
      heldRef.current.add(code);
      if (code === 'KeyF') sim.p.buf.punch = 6;
      else if (code === 'KeyG') sim.p.buf.kick = 6;
      else if (code === 'KeyH') sim.p.buf.spec = 6;
      else if (code === 'KeyW' || code === 'ArrowUp' || code === 'Space') sim.p.buf.jump = 6;
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      heldRef.current.delete(event.code);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPaused, startGame]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;
    let lastHud = 0;

    const startAtk = (f: Fighter, key: MoveKey) => {
      f.st = 'atk';
      f.mvKey = key;
      f.t = 0;
      f.hitDone = false;
      f.buf[key] = 0;
      f.aid++;
      sound(key === 'spec' ? 'laser' : key === 'kick' ? 'click' : 'hit');
    };

    const endRound = (sim: Sim, winner: 'p' | 'e' | null, why: string) => {
      if (sim.phase !== 'fight') return;
      sim.phase = 'ko';
      sim.pt = 0;
      sim.winner = winner;
      sim.why = why;
      if (winner === 'p') {
        sim.pw++;
        sim.score += 300 + Math.round(sim.p.hp) * 6 + Math.max(0, sim.timer) * 8;
        callbacksRef.current.score(sim.score);
        sound('score');
      } else if (winner === 'e') {
        sim.ow++;
      }
      sound('explosion');
    };

    const tryHit = (sim: Sim, f: Fighter, o: Fighter, mv: Move) => {
      if (o.st === 'ko') return;
      const distance = Math.abs(o.x - f.x);
      const vertical = Math.abs(o.y - f.y);
      if (distance > mv.reach + 26 || vertical > 120) return;
      f.hitDone = true;
      if (o.blocking) {
        const chip = Math.max(1, Math.round(mv.dmg * (f.mvKey === 'spec' ? 0.3 : 0.1) * f.def.dmgMul));
        o.hp = Math.max(1, o.hp - chip);
        o.stun = 9;
        o.st = 'hurt';
        o.down = false;
        o.bflash = 8;
        sound('click');
        return;
      }
      const scale = Math.max(0.45, 1 - f.combo * 0.12);
      const dmg = Math.max(1, Math.round(mv.dmg * f.def.dmgMul * scale));
      o.hp -= dmg;
      o.st = 'hurt';
      o.stun = mv.stun;
      o.flash = 8;
      o.t = 0;
      o.down = f.mvKey === 'spec' || o.hp <= 0;
      o.x += f.face * mv.kb * 0.35;
      f.meter = Math.min(100, f.meter + mv.meter);
      o.meter = Math.min(100, o.meter + mv.meter * 0.6);
      f.combo++;
      f.comboT = 70;
      if (f.isP) {
        sim.score += dmg * 10 + f.combo * 5;
        callbacksRef.current.score(sim.score);
      }
      sound(f.mvKey === 'spec' ? 'explosion' : 'hit');
      if (o.hp <= 0) {
        o.hp = 0;
        o.st = 'ko';
        o.stun = 999;
        o.vy = -9;
        endRound(sim, f.isP ? 'p' : 'e', 'K.O.');
      }
    };

    const stepFighter = (sim: Sim, f: Fighter, o: Fighter, input: { dir: number; block: boolean }) => {
      if (f.flash > 0) f.flash--;
      if (f.bflash > 0) f.bflash--;
      if (f.comboT > 0 && --f.comboT === 0) f.combo = 0;
      const grounded = f.y >= FLOOR;
      f.blocking = false;
      if (f.st === 'hurt' || f.st === 'ko') {
        f.stun--;
        if (f.st === 'hurt' && f.stun <= 0 && grounded) {
          f.st = 'idle';
          f.down = false;
        }
      } else if (f.st === 'atk') {
        const mv = MOVES[f.mvKey as MoveKey];
        f.t++;
        const active = f.t > mv.su && f.t <= mv.su + mv.ac;
        if (mv.lunge && active) f.x += f.face * mv.lunge;
        if (active && !f.hitDone) tryHit(sim, f, o, mv);
        if (f.st === 'atk' && f.hitDone && f.t > mv.su) {
          if (f.buf.spec && f.meter >= 50 && f.mvKey !== 'spec') {
            f.meter -= 50;
            startAtk(f, 'spec');
          } else if (f.buf.kick && f.mvKey === 'punch') startAtk(f, 'kick');
        }
        if (f.st === 'atk' && f.t >= mv.su + mv.ac + mv.rc) {
          f.st = 'idle';
          f.mvKey = '';
        }
      } else {
        if (grounded) {
          const facing = Math.sign(o.x - f.x);
          if (facing) f.face = facing as 1 | -1;
          const back = input.dir !== 0 && input.dir === -f.face;
          f.blocking = !!(input.block || back);
          const vx = input.block ? 0 : input.dir * f.def.speed * (back ? 0.7 : 1);
          f.x += vx;
          if (vx !== 0) f.walkT += Math.abs(vx) * 0.12;
          if (f.buf.jump) {
            f.buf.jump = 0;
            f.vy = -13;
            f.blocking = false;
            sound('jump');
          }
        }
        if (f.buf.spec) {
          if (grounded && f.meter >= 50) {
            f.meter -= 50;
            startAtk(f, 'spec');
          }
          f.buf.spec = 0;
        } else if (f.buf.kick) {
          f.buf.kick = 0;
          startAtk(f, 'kick');
        } else if (f.buf.punch) {
          f.buf.punch = 0;
          startAtk(f, 'punch');
        }
      }
      for (const key of ['jump', 'punch', 'kick', 'spec'] as const) {
        if (f.buf[key] > 0) f.buf[key]--;
      }
      if (f.y < FLOOR || f.vy < 0) {
        f.vy += 0.7;
        f.y += f.vy;
        if (f.y >= FLOOR) {
          f.y = FLOOR;
          f.vy = 0;
        }
      }
      if (f.x < 34) f.x = 34;
      if (f.x > W - 34) f.x = W - 34;
      f.ghost += (f.hp - f.ghost) * 0.06;
      if (f.ghost < f.hp) f.ghost = f.hp;
    };

    const aiInput = (f: Fighter, o: Fighter): { dir: number; block: boolean } => {
      const a = f.ai;
      const input = { dir: 0, block: false };
      const dx = o.x - f.x;
      const distance = Math.abs(dx);
      const toward = (Math.sign(dx) || f.face) as 1 | -1;
      if (o.st === 'atk' && o.aid !== a.seen) {
        const attack = MOVES[o.mvKey as MoveKey];
        a.seen = o.aid;
        if (attack && distance < attack.reach + 40 && Math.random() < f.def.blockChance) {
          a.mode = 'block';
          a.t = attack.su + attack.ac + 8;
        }
      }
      if (--a.t <= 0) {
        a.fired = false;
        const roll = Math.random();
        if (distance > 150) a.mode = roll < 0.55 ? 'approach' : roll < 0.7 ? 'wait' : roll < 0.8 ? 'jump' : f.meter >= 50 && roll < 0.95 ? 'spec' : 'approach';
        else if (distance > 82) a.mode = roll < f.def.aggr * 0.6 ? 'kick' : roll < 0.6 ? 'approach' : roll < 0.72 ? 'retreat' : roll < 0.88 ? 'punch' : 'wait';
        else a.mode = roll < f.def.aggr * 0.55 ? 'punch' : roll < f.def.aggr * 0.9 ? 'kick' : roll < 0.82 ? 'block' : 'retreat';
        if (a.mode === 'retreat' && (f.x < 60 || f.x > W - 60)) a.mode = 'punch';
        a.t = Math.round(f.def.react * (0.6 + Math.random() * 0.8)) + 4;
      }
      if (a.mode === 'approach') input.dir = toward;
      else if (a.mode === 'retreat') input.dir = -toward;
      else if (a.mode === 'block') input.block = true;
      else if (a.mode === 'jump') {
        if (!a.fired) {
          f.buf.jump = 3;
          a.fired = true;
        }
        input.dir = toward;
      } else if (a.mode === 'punch' || a.mode === 'kick' || a.mode === 'spec') {
        if (distance > MOVES[a.mode].reach - 12) input.dir = toward;
        else if (!a.fired) {
          f.buf[a.mode] = 3;
          a.fired = true;
          a.t = Math.min(a.t, 10);
        }
      }
      return input;
    };

    const playerInput = (): { dir: number; block: boolean } => {
      const held = heldRef.current;
      const left = held.has('KeyA') || held.has('ArrowLeft');
      const right = held.has('KeyD') || held.has('ArrowRight');
      return { dir: (right ? 1 : 0) - (left ? 1 : 0), block: held.has('KeyS') || held.has('ArrowDown') };
    };

    const startRound = (sim: Sim) => beginRound(sim, false);

    const defeatRival = (sim: Sim) => {
      sim.score += 1200;
      sim.rivalIndex++;
      callbacksRef.current.score(sim.score);
      callbacksRef.current.level?.(sim.rivalIndex, sim.score);
      sound('score');
      if (sim.rivalIndex >= ROSTER.length) {
        stateRef.current = 'WON';
        setGameState('WON');
        callbacksRef.current.over(sim.score);
        return;
      }
      beginRound(sim, true);
    };

    const loseLife = (sim: Sim) => {
      sim.lives--;
      if (sim.lives <= 0) {
        stateRef.current = 'GAMEOVER';
        setGameState('GAMEOVER');
        callbacksRef.current.over(sim.score);
        return;
      }
      beginRound(sim, true);
    };

    const advance = (sim: Sim) => {
      if (sim.phase !== 'result') return;
      if (sim.winner === 'p') {
        if (sim.pw >= 2) defeatRival(sim);
        else {
          sim.round++;
          startRound(sim);
        }
      } else if (sim.winner === 'e') {
        if (sim.ow >= 2) loseLife(sim);
        else {
          sim.round++;
          startRound(sim);
        }
      } else {
        startRound(sim);
      }
    };

    const drawFighter = (fighter: Fighter) => {
      const def = fighter.def;
      const bob = fighter.st === 'idle' ? Math.sin(fighter.walkT * 1.2) * 2 : 0;
      const attack = fighter.st === 'atk' ? MOVES[fighter.mvKey as MoveKey] : null;
      const progress = attack
        ? fighter.t <= attack.su
          ? fighter.t / attack.su
          : fighter.t <= attack.su + attack.ac
            ? 1
            : Math.max(0, 1 - (fighter.t - attack.su - attack.ac) / attack.rc)
        : 0;
      ctx.save();
      ctx.translate(fighter.x, fighter.y + bob);
      ctx.scale(fighter.face, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.42)';
      ctx.beginPath();
      ctx.ellipse(0, 6, 30, 7, 0, 0, TAU);
      ctx.fill();
      if (fighter.st === 'ko' || fighter.down) {
        ctx.translate(0, -16);
        ctx.rotate(-Math.PI / 2);
      } else if (fighter.st === 'hurt') {
        ctx.rotate(-0.2);
      }
      const flash = fighter.flash > 0 && fighter.flash % 4 < 2;
      const cloth = flash ? '#ffffff' : def.cloth;
      const dark = flash ? '#ffffff' : shade(def.cloth, -0.4);
      const skin = flash ? '#ffffff' : def.skin;
      const trim = flash ? '#ffffff' : def.trim;
      const lean = fighter.st === 'atk' && fighter.mvKey === 'punch' ? 4 * progress : 0;
      ctx.translate(lean, 0);
      const hipY = -56;
      const shoulderY = -100;
      const stride = fighter.st === 'idle' && fighter.walkT > 0 ? Math.sin(fighter.walkT) * 9 : 0;
      ctx.strokeStyle = dark;
      ctx.lineWidth = 13;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-4, hipY);
      ctx.lineTo(-10 - stride, -28);
      ctx.lineTo(-12 - stride, 0);
      ctx.moveTo(4, hipY);
      ctx.lineTo(10 + stride, -28);
      ctx.lineTo(12 + stride, 0);
      ctx.stroke();
      ctx.strokeStyle = cloth;
      ctx.lineWidth = 24;
      ctx.beginPath();
      ctx.moveTo(0, hipY);
      ctx.lineTo(2, shoulderY);
      ctx.stroke();
      ctx.strokeStyle = trim;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(-11, -64);
      ctx.lineTo(12, -64);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(5, -116, 13, 0, TAU);
      ctx.fill();
      ctx.fillStyle = def.look === 'kestrel' ? trim : dark;
      if (def.look === 'kestrel') {
        ctx.beginPath();
        ctx.moveTo(-6, -125);
        ctx.lineTo(-21, -140);
        ctx.lineTo(-4, -130);
        ctx.fill();
        ctx.fillStyle = '#0e7490';
        ctx.fillRect(2, -122, 15, 6);
      } else if (def.look === 'sable' || def.look === 'mira') {
        ctx.beginPath();
        ctx.arc(5, -121, 14, Math.PI * 0.9, Math.PI * 2.1);
        ctx.lineTo(16, -107);
        ctx.lineTo(-6, -107);
        ctx.fill();
        ctx.fillStyle = trim;
        ctx.fillRect(7, -113, 8, 3);
      } else if (def.look === 'orlo' || def.look === 'ash') {
        ctx.beginPath();
        ctx.moveTo(-6, -126);
        ctx.lineTo(-12, -142);
        ctx.lineTo(1, -129);
        ctx.lineTo(8, -143);
        ctx.lineTo(15, -126);
        ctx.fill();
        ctx.fillStyle = trim;
        ctx.fillRect(4, -115, 14, 4);
      } else if (def.look === 'vex') {
        ctx.fillRect(-8, -121, 26, 6);
        ctx.fillStyle = '#e0f2fe';
        ctx.fillRect(9, -120, 7, 3);
      } else {
        ctx.beginPath();
        ctx.arc(5, -122, 14, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = trim;
        ctx.fillRect(2, -115, 16, 4);
      }
      let frontHand: [number, number] = [20, -92];
      let backHand: [number, number] = [2, -88];
      let frontElbow: [number, number] = [12, -92];
      let backElbow: [number, number] = [4, -94];
      let frontFoot: [number, number] = [12 + stride, 0];
      if (fighter.blocking) {
        frontHand = [22, -110];
        backHand = [16, -100];
        frontElbow = [14, -98];
        backElbow = [8, -94];
      }
      if (attack && fighter.mvKey === 'punch') {
        frontHand = [24 + attack.reach * 0.8 * progress, -98];
        frontElbow = [(8 + frontHand[0]) / 2, -96];
      } else if (attack && fighter.mvKey === 'kick') {
        frontFoot = [14 + attack.reach * 0.8 * progress, -58 * progress];
        frontHand = [4, -94];
        backHand = [-10, -102];
      } else if (attack && fighter.mvKey === 'spec') {
        frontHand = [26 + attack.reach * 0.85 * progress, -94];
        backHand = [18 + attack.reach * 0.5 * progress, -104];
        frontElbow = [(8 + frontHand[0]) / 2, -94];
      }
      if (fighter.st === 'hurt' || fighter.st === 'ko') {
        frontHand = [-4, -82];
        backHand = [-14, -90];
      }
      ctx.strokeStyle = dark;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(-4, shoulderY + 2);
      ctx.lineTo(backElbow[0], backElbow[1]);
      ctx.lineTo(backHand[0], backHand[1]);
      ctx.stroke();
      ctx.strokeStyle = skin;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(6, shoulderY + 2);
      ctx.lineTo(frontElbow[0], frontElbow[1]);
      ctx.lineTo(frontHand[0], frontHand[1]);
      ctx.stroke();
      if (fighter.st === 'atk' && fighter.mvKey === 'kick') {
        ctx.strokeStyle = dark;
        ctx.lineWidth = 12;
        ctx.beginPath();
        ctx.moveTo(4, hipY);
        ctx.lineTo(frontFoot[0], frontFoot[1]);
        ctx.stroke();
      }
      ctx.fillStyle = trim;
      ctx.beginPath();
      ctx.arc(frontHand[0], frontHand[1], 7, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(backHand[0], backHand[1], 6, 0, TAU);
      ctx.fill();
      if (attack && fighter.t > attack.su && fighter.t <= attack.su + attack.ac + 3) {
        ctx.strokeStyle = `rgba(253, 224, 71, ${0.25 + progress * 0.45})`;
        ctx.lineWidth = fighter.mvKey === 'spec' ? 12 : 5;
        ctx.beginPath();
        if (fighter.mvKey === 'kick') ctx.arc(0, -58, attack.reach * 0.7, -0.9, 0.5);
        else ctx.arc(0, -92, attack.reach * 0.75, -0.35, 0.3);
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawBar = (x: number, y: number, width: number, fighter: Fighter, anchorRight: boolean) => {
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(x - 3, y - 3, width + 6, 17);
      const hp = (width * Math.max(0, fighter.hp)) / 100;
      const ghost = (width * Math.max(0, fighter.ghost)) / 100;
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(anchorRight ? x + width - ghost : x, y, ghost, 11);
      ctx.fillStyle = fighter.hp > 30 ? '#22c55e' : '#f59e0b';
      ctx.fillRect(anchorRight ? x + width - hp : x, y, hp, 11);
      ctx.fillStyle = fighter.meter >= 50 ? '#fbbf24' : '#38bdf8';
      ctx.fillRect(x, y + 13, (width * fighter.meter) / 100, 4);
    };

    const draw = (sim: Sim) => {
      ctx.clearRect(0, 0, W, H);
      const sky = ctx.createLinearGradient(0, 0, 0, FLOOR);
      sky.addColorStop(0, '#1b1035');
      sky.addColorStop(0.55, '#7c2d12');
      sky.addColorStop(1, '#f59e0b');
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, FLOOR);
      ctx.fillStyle = '#fff3c4';
      ctx.beginPath();
      ctx.arc(470, 250, 54, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(120, 53, 15, 0.85)';
      for (const bar of [{ x: 40, w: 60, h: 90 }, { x: 130, w: 44, h: 126 }, { x: 196, w: 74, h: 70 }, { x: 300, w: 52, h: 108 }, { x: 380, w: 40, h: 82 }, { x: 540, w: 66, h: 96 }]) {
        ctx.fillRect(bar.x, FLOOR - 120 - bar.h, bar.w, bar.h + 120);
      }
      ctx.fillStyle = 'rgba(15, 23, 42, 0.55)';
      for (let i = 0; i < 9; i++) ctx.fillRect(12 + i * 74, FLOOR - 160 - (i % 3) * 26, 38, 160 + (i % 3) * 26);
      const floor = ctx.createLinearGradient(0, FLOOR, 0, H);
      floor.addColorStop(0, '#92400e');
      floor.addColorStop(1, '#451a03');
      ctx.fillStyle = floor;
      ctx.fillRect(0, FLOOR, W, H - FLOOR);
      ctx.strokeStyle = 'rgba(253, 230, 138, 0.2)';
      ctx.lineWidth = 1;
      for (let i = -8; i <= 8; i++) {
        ctx.beginPath();
        ctx.moveTo(W / 2 + i * 30, FLOOR);
        ctx.lineTo(W / 2 + i * 90, H);
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(0, FLOOR);
      ctx.lineTo(W, FLOOR);
      ctx.stroke();
      drawFighter(sim.e);
      drawFighter(sim.p);

      drawBar(18, 20, 280, sim.p, true);
      drawBar(342, 20, 280, sim.e, false);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 13px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(sim.p.def.name.toUpperCase(), 18, 54);
      ctx.textAlign = 'right';
      ctx.fillText(sim.e.def.name.toUpperCase(), 622, 54);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = '10px ui-monospace, monospace';
      ctx.textAlign = 'left';
      ctx.fillText(sim.p.def.title, 18, 68);
      ctx.textAlign = 'right';
      ctx.fillText(sim.e.def.title, 622, 68);
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.beginPath();
      ctx.roundRect(294, 16, 52, 28, 6);
      ctx.fill();
      ctx.fillStyle = sim.timer <= 10 ? '#fb7185' : '#ffffff';
      ctx.font = 'bold 22px ui-monospace, monospace';
      ctx.fillText(String(Math.max(0, sim.timer)), 320, 38);
      ctx.fillStyle = '#cbd5e1';
      ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.fillText(`MATCH ${Math.min(sim.rivalIndex + 1, ROSTER.length)}/${ROSTER.length} · ROUND ${sim.round}`, W / 2, 76);
      ctx.fillStyle = '#fbbf24';
      ctx.fillText(`SCORE ${sim.score}   BEST ${Math.max(highScoreRef.current, sim.score)}`, W / 2, 90);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#e2e8f0';
      ctx.font = 'bold 10px ui-monospace, monospace';
      ctx.fillText(`CAMPAIGN  ${'●'.repeat(Math.max(0, sim.lives))}`, 18, 100);
      for (let i = 0; i < 2; i++) {
        ctx.fillStyle = i < sim.pw ? '#fde047' : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(304 - i * 14, 54, 4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = i < sim.ow ? '#fb7185' : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(336 + i * 14, 54, 4, 0, TAU);
        ctx.fill();
      }
      if (sim.p.combo >= 2) {
        ctx.fillStyle = '#fde047';
        ctx.textAlign = 'left';
        ctx.font = 'bold 18px ui-monospace, monospace';
        ctx.fillText(`${sim.p.combo} HITS`, 24, 130);
      }
      ctx.textAlign = 'center';
      if (sim.phase === 'intro') {
        const showFight = sim.pt >= 45;
        ctx.globalAlpha = Math.min(1, (showFight ? sim.pt - 45 : sim.pt) / 12);
        ctx.font = 'bold 38px ui-monospace, monospace';
        ctx.fillStyle = showFight ? '#fb7185' : '#fde047';
        ctx.fillText(showFight ? 'FIGHT!' : `ROUND ${sim.round}`, W / 2, 210);
        ctx.globalAlpha = 1;
      } else if (sim.phase === 'ko') {
        ctx.font = 'bold 40px ui-monospace, monospace';
        ctx.fillStyle = '#fb7185';
        ctx.fillText(sim.why === 'TIME' ? 'TIME!' : 'K.O.!', W / 2, 210);
      } else if (sim.phase === 'result') {
        ctx.font = 'bold 32px ui-monospace, monospace';
        ctx.fillStyle = sim.winner === 'p' ? '#34d399' : '#fb7185';
        ctx.fillText(sim.winner === 'p' ? 'YOU WIN' : sim.winner === 'e' ? 'YOU LOSE' : 'DRAW', W / 2, 210);
      }
    };

    const update = (sim: Sim) => {
      sim.frame++;
      if (sim.phase === 'intro') {
        sim.pt++;
        if (sim.pt >= 90) {
          sim.phase = 'fight';
          sim.pt = 0;
          sound('click');
        }
        stepFighter(sim, sim.p, sim.e, { dir: 0, block: false });
        stepFighter(sim, sim.e, sim.p, { dir: 0, block: false });
      } else if (sim.phase === 'fight') {
        stepFighter(sim, sim.p, sim.e, playerInput());
        if (sim.phase === 'fight') stepFighter(sim, sim.e, sim.p, aiInput(sim.e, sim.p));
        if (sim.phase === 'fight' && ++sim.ft >= 60) {
          sim.ft = 0;
          sim.timer--;
          if (sim.timer <= 0) endRound(sim, sim.p.hp === sim.e.hp ? null : sim.p.hp > sim.e.hp ? 'p' : 'e', 'TIME');
        }
      } else if (sim.phase === 'ko') {
        if (sim.frame % 3 === 0) {
          stepFighter(sim, sim.p, sim.e, { dir: 0, block: false });
          stepFighter(sim, sim.e, sim.p, { dir: 0, block: false });
        }
        sim.pt++;
        if (sim.pt > 70) {
          sim.phase = 'result';
          sim.pt = 0;
        }
      } else if (sim.phase === 'result') {
        sim.pt++;
        if (sim.pt > 80) advance(sim);
      }
      const dx = sim.e.x - sim.p.x;
      if (Math.abs(dx) < 40 && sim.p.y >= FLOOR && sim.e.y >= FLOOR) {
        const push = (40 - Math.abs(dx)) / 2;
        const side = Math.sign(dx) || 1;
        sim.p.x = Math.max(40, sim.p.x - side * push);
        sim.e.x = Math.min(W - 40, sim.e.x + side * push);
      }
    };

    const loop = () => {
      if (isPaused) {
        animId = requestAnimationFrame(loop);
        return;
      }
      if (simRef.current) {
        const sim = simRef.current;
        if (stateRef.current === 'PLAYING') update(sim);
        draw(sim);
        if (sim.frame - lastHud >= 20) {
          lastHud = sim.frame;
          callbacksRef.current.score(sim.score);
        }
      }
      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [beginRound, isPaused]);

  const best = Math.max(highScore, simRef.current?.score ?? 0);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={W} height={H} className="w-full h-full block" aria-label="Iron Circuit arena" />

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-white mb-1 tracking-tight">Iron Circuit</div>
          <p className="text-sm text-slate-300 mb-2">Six rivals · best-of rounds · Rift Rush</p>
          <p className="text-[11px] font-mono text-amber-300 mb-5">A/D move · W jump · S block · F punch · G kick · H Rift Rush</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            START RUSH
          </button>
          <div className="mt-4 text-[10px] font-mono text-slate-400">BEST {best}</div>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-rose-400 mb-1 tracking-tight">K.O. — Defeat</div>
          <p className="text-sm text-slate-300 mb-4">The circuit keeps its crown. Read the rival, then return.</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            TRY AGAIN
          </button>
        </div>
      )}

      {gameState === 'WON' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center px-6 text-center">
          <div className="text-2xl font-bold text-amber-400 mb-1 tracking-tight">CIRCUIT CHAMPION!</div>
          <p className="text-sm text-slate-300 mb-4">All six rivals down. The Neon Speedway answers to you now.</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            RUN IT BACK
          </button>
        </div>
      )}
    </div>
  );
};
