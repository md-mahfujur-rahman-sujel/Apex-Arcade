import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface ChronoBattleEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
  highScore?: number;
  onLevelComplete?: (level: number, score: number) => void;
  onRestart?: () => void;
}

type Phase = 'READY' | 'MENU' | 'SKILL' | 'ITEM' | 'TARGET' | 'BUSY' | 'ENEMY' | 'WIN' | 'LOSE' | 'VICTORY';
type FoeKind = 'moss' | 'wisp' | 'bat' | 'gear' | 'knight' | 'boss';
type ItemKey = 'potion' | 'ether';
type TargetSide = 'foe' | 'ally';

interface Skill {
  name: string;
  cost: number;
  pow?: number;
  heal?: number;
  all?: boolean;
  magic?: boolean;
  target: TargetSide;
  minLevel: number;
}

interface Member {
  id: 'kai' | 'mira';
  name: string;
  hp: number;
  mhp: number;
  mp: number;
  mmp: number;
  atk: number;
  def: number;
  mag: number;
  lvl: number;
  xp: number;
  col: string;
  trim: string;
  skills: Skill[];
  lunge: number;
  flash: number;
}

interface Foe {
  kind: FoeKind;
  name: string;
  hp: number;
  mhp: number;
  atk: number;
  def: number;
  xp: number;
  gold: number;
  col: string;
  x: number;
  y: number;
  lunge: number;
  flash: number;
  boss: boolean;
  seed: number;
}

interface Popup {
  x: number;
  y: number;
  text: string;
  col: string;
  life: number;
}

type Pending = { type: 'attack' } | { type: 'skill'; skill: Skill } | { type: 'item'; item: ItemKey };

interface Sim {
  phase: Phase;
  wave: number;
  actor: number;
  sel: number;
  sel2: number;
  tgt: number;
  pending: Pending | null;
  busy: number;
  enemyIdx: number;
  enemyWait: number;
  turn: number;
  party: Member[];
  foes: Foe[];
  inventory: Record<ItemKey, number>;
  score: number;
  gold: number;
  log: string[];
  popups: Popup[];
  flash: number;
  shake: number;
  time: number;
  rewards: string[];
  bossMode: boolean;
  portal: number;
  ended: boolean;
  levelReported: boolean;
  dirty: number;
}

const WAVES = [
  { zone: 0, label: 'The Hearthwilds', kinds: ['moss', 'wisp', 'bat'] as FoeKind[] },
  { zone: 1, label: 'The Gear Gate', kinds: ['gear', 'knight'] as FoeKind[] },
  { zone: 2, label: 'The Dawn Engine', kinds: ['boss'] as FoeKind[] },
];

const FOE_DEFS: Record<FoeKind, { name: string; hp: number; atk: number; def: number; xp: number; gold: number; col: string; boss?: boolean }> = {
  moss: { name: 'Mossling', hp: 18, atk: 8, def: 1, xp: 10, gold: 6, col: '#65a30d' },
  wisp: { name: 'Gloomwisp', hp: 15, atk: 10, def: 0, xp: 12, gold: 7, col: '#a78bfa' },
  bat: { name: 'Burrbat', hp: 13, atk: 9, def: 0, xp: 9, gold: 5, col: '#78716c' },
  gear: { name: 'Gearling', hp: 32, atk: 13, def: 3, xp: 22, gold: 13, col: '#f59e0b' },
  knight: { name: 'Rustknight', hp: 44, atk: 15, def: 5, xp: 30, gold: 18, col: '#b45309' },
  boss: { name: 'Clockwork Warden', hp: 210, atk: 17, def: 4, xp: 200, gold: 150, col: '#fbbf24', boss: true },
};

const KAI_SKILLS: Skill[] = [
  { name: 'Slash Wave', cost: 3, pow: 1.9, target: 'foe', minLevel: 1 },
  { name: 'Gale Cut', cost: 7, pow: 1.1, all: true, target: 'foe', minLevel: 3 },
];
const MIRA_SKILLS: Skill[] = [
  { name: 'Spark', cost: 3, pow: 1.3, magic: true, target: 'foe', minLevel: 1 },
  { name: 'Mend', cost: 4, heal: 28, target: 'ally', minLevel: 1 },
  { name: 'Nova', cost: 9, pow: 1.1, magic: true, all: true, target: 'foe', minLevel: 4 },
];

const needXp = (member: Member) => member.lvl * 28;
const random = () => Math.random();

function createParty(): Member[] {
  return [
    { id: 'kai', name: 'Kai', hp: 44, mhp: 44, mp: 12, mmp: 12, atk: 10, def: 3, mag: 3, lvl: 1, xp: 0, col: '#38bdf8', trim: '#0c4a6e', skills: KAI_SKILLS.map((skill) => ({ ...skill })), lunge: 0, flash: 0 },
    { id: 'mira', name: 'Mira', hp: 34, mhp: 34, mp: 22, mmp: 22, atk: 6, def: 2, mag: 10, lvl: 1, xp: 0, col: '#f472b6', trim: '#831843', skills: MIRA_SKILLS.map((skill) => ({ ...skill })), lunge: 0, flash: 0 },
  ];
}

function createSim(): Sim {
  return {
    phase: 'READY', wave: 0, actor: 0, sel: 0, sel2: 0, tgt: 0, pending: null,
    busy: 0, enemyIdx: 0, enemyWait: 0, turn: 0,
    party: createParty(), foes: [], inventory: { potion: 3, ether: 1 },
    score: 0, gold: 0, log: ['Carry the party beyond the last dark hour.'], popups: [],
    flash: 0, shake: 0, time: 0, rewards: [], bossMode: false, portal: 0, ended: false, levelReported: false, dirty: 0,
  };
}

function spawnFoes(sim: Sim) {
  const wave = WAVES[sim.wave];
  const count = wave.kinds.length;
  sim.foes = wave.kinds.map((kind, index) => {
    const def = FOE_DEFS[kind];
    const boss = !!def.boss;
    return {
      kind, name: def.name, hp: def.hp, mhp: def.hp, atk: def.atk, def: def.def,
      xp: def.xp, gold: def.gold, col: def.col, boss: !!boss,
      x: boss ? 470 : 400 + index * 92 - (count - 1) * 22,
      y: boss ? 206 : 196 + (index % 2) * 34,
      lunge: 0, flash: 0, seed: index * 1.7,
    };
  });
  sim.bossMode = !!wave.kinds.includes('boss');
  sim.actor = 0;
  sim.turn = 0;
  sim.enemyIdx = 0;
  sim.enemyWait = 0;
  sim.pending = null;
  sim.sel = 0;
  sim.levelReported = false;
  sim.log = [sim.bossMode ? 'The Clockwork Warden blocks the way!' : `${wave.label} — monsters appear!`];
  sim.phase = 'MENU';
  sim.dirty += 1;
}

function aliveFoes(sim: Sim) {
  return sim.foes.filter((foe) => foe.hp > 0);
}
function aliveParty(sim: Sim) {
  return sim.party.filter((member) => member.hp > 0);
}
function activeMember(sim: Sim) {
  return sim.party[Math.max(0, sim.actor)];
}
function skillList(sim: Sim) {
  const member = activeMember(sim);
  return member.skills.filter((skill) => skill.minLevel <= member.lvl);
}
function itemList(): ItemKey[] {
  return ['potion', 'ether'];
}
function targetIsAlly(sim: Sim) {
  const pending = sim.pending;
  if (!pending) return false;
  if (pending.type === 'item') return true;
  return pending.type === 'skill' && pending.skill.target === 'ally';
}
function targetPool(sim: Sim): Array<Member | Foe> {
  return targetIsAlly(sim) ? sim.party : sim.foes;
}
function firstTarget(sim: Sim) {
  const pool = targetPool(sim);
  const living = pool.findIndex((entry) => entry.hp > 0);
  return living < 0 ? Math.max(0, sim.actor) : living;
}

function difficultyMods(difficulty: DifficultySetting) {
  if (difficulty === 'hard') return { enemy: 1.2, player: 1.1 };
  if (difficulty === 'easy') return { enemy: 0.8, player: 1.05 };
  return { enemy: 1, player: 1 };
}

function addPopup(sim: Sim, x: number, y: number, text: string, col: string) {
  sim.popups.push({ x, y, text, col, life: 42 });
}

function damageFoe(sim: Sim, foe: Foe, amount: number, magic: boolean) {
  const dealt = Math.max(1, Math.round(amount - (magic ? 0 : foe.def * 0.5)));
  foe.hp = Math.max(0, foe.hp - dealt);
  foe.flash = 12;
  sim.flash = Math.min(6, sim.flash + 2);
  sim.shake = Math.max(sim.shake, 4);
  sim.score += dealt * 10;
  addPopup(sim, foe.x, foe.y - (foe.boss ? 110 : 54), `${dealt}`, magic ? '#c4b5fd' : '#fde68a');
  if (foe.hp <= 0) audio.playExplosion();
  else audio.playHit();
  return dealt;
}

function damageMember(sim: Sim, member: Member, amount: number) {
  const dealt = Math.max(1, Math.round(amount - member.def * 0.5));
  member.hp = Math.max(0, member.hp - dealt);
  member.flash = 12;
  sim.shake = Math.max(sim.shake, member.hp <= 0 ? 10 : 5);
  addPopup(sim, 150 + sim.party.indexOf(member) * 86, 292, `${dealt}`, '#fca5a5');
  audio.playHit();
  return dealt;
}

function finishWave(sim: Sim, escaped = false) {
  if (escaped) {
    sim.rewards = ['Got away safely!', 'The party slips back into the wilds.'];
    sim.phase = 'WIN';
    sim.dirty += 1;
    return;
  }
  const xp = sim.foes.reduce((total, foe) => total + foe.xp, 0);
  const gold = sim.foes.reduce((total, foe) => total + foe.gold, 0);
  sim.gold += gold;
  const ups: string[] = [];
  for (const member of sim.party) {
    if (member.hp <= 0) continue;
    member.xp += xp;
    while (member.xp >= needXp(member)) {
      member.xp -= needXp(member);
      member.lvl += 1;
      member.mhp += 8;
      member.mmp += 3;
      member.atk += 2;
      member.def += 1;
      member.mag += 2;
      member.hp = Math.min(member.mhp, member.hp + 10);
      member.mp = Math.min(member.mmp, member.mp + 5);
      ups.push(`${member.name} → Lv ${member.lvl}`);
    }
  }
  sim.score += xp * 10;
  sim.rewards = [`Victory!  +${xp} XP  +${gold} gold`].concat(ups);
  audio.playScore();
  if (sim.bossMode) {
    const bonus = 1000 + sim.gold * 5;
    sim.score += bonus;
    sim.rewards.push(`Dawn portal restored!  +${bonus} score`);
    sim.phase = 'VICTORY';
    sim.portal = 1;
  } else {
    sim.phase = 'WIN';
  }
  sim.dirty += 1;
}

function nextWave(sim: Sim) {
  if (sim.phase !== 'WIN') return;
  sim.wave += 1;
  if (sim.wave >= WAVES.length) {
    sim.wave = WAVES.length - 1;
    sim.phase = 'VICTORY';
    return;
  }
  spawnFoes(sim);
}

function advanceActor(sim: Sim) {
  for (let index = sim.actor + 1; index < sim.party.length; index += 1) {
    if (sim.party[index].hp > 0) {
      sim.actor = index;
      sim.sel = 0;
      sim.sel2 = 0;
      sim.phase = 'MENU';
      sim.dirty += 1;
      return;
    }
  }
  sim.actor = -1;
  sim.enemyIdx = 0;
  sim.enemyWait = 24;
  sim.phase = 'ENEMY';
  sim.dirty += 1;
}

function pickAliveFoe(sim: Sim, preferred: number) {
  if (sim.foes[preferred] && sim.foes[preferred].hp > 0) return sim.foes[preferred];
  return aliveFoes(sim)[0];
}

function executePending(sim: Sim, difficulty: DifficultySetting) {
  const pending = sim.pending;
  if (!pending) return;
  const member = activeMember(sim);
  const mods = difficultyMods(difficulty);
  if (pending.type === 'attack') {
    const foe = pickAliveFoe(sim, sim.tgt);
    if (!foe) return;
    member.lunge = 14;
    const dealt = damageFoe(sim, foe, member.atk * mods.player * (0.9 + random() * 0.22), false);
    sim.log.push(`${member.name} attacks ${foe.name} for ${dealt}.`);
    audio.playPongBeep(true);
  } else if (pending.type === 'skill') {
    const skill = pending.skill;
    if (member.mp < skill.cost) {
      sim.log.push(`${member.name} needs ${skill.cost} MP.`);
      audio.playClick();
      return;
    }
    member.mp -= skill.cost;
    member.lunge = 14;
    if (skill.heal) {
      const target = sim.party[sim.tgt] || member;
      target.hp = Math.min(target.mhp, target.hp + skill.heal);
      addPopup(sim, 150 + sim.party.indexOf(target) * 86, 292, `+${skill.heal}`, '#86efac');
      sim.log.push(`${member.name} casts ${skill.name}: ${target.name} +${skill.heal} HP.`);
      audio.playScore();
    } else {
      const targets = skill.all ? aliveFoes(sim) : [pickAliveFoe(sim, sim.tgt)].filter(Boolean) as Foe[];
      const base = (skill.magic ? member.mag : member.atk) * (skill.pow || 1) * mods.player * (0.92 + random() * 0.2);
      let total = 0;
      for (const foe of targets) total += damageFoe(sim, foe, base, !!skill.magic);
      sim.log.push(`${member.name} uses ${skill.name}! ${total} damage.`);
      audio.playLaser();
    }
  } else {
    const key = pending.item;
    if (sim.inventory[key] <= 0) return;
    sim.inventory[key] -= 1;
    const target = sim.party[sim.tgt] || member;
    if (key === 'potion') {
      target.hp = Math.min(target.mhp, target.hp + 30);
      addPopup(sim, 150 + sim.party.indexOf(target) * 86, 292, '+30', '#86efac');
      sim.log.push(`${member.name} uses a Potion on ${target.name}.`);
    } else {
      target.mp = Math.min(target.mmp, target.mp + 12);
      addPopup(sim, 150 + sim.party.indexOf(target) * 86, 292, '+12 MP', '#93c5fd');
      sim.log.push(`${member.name} uses an Ether on ${target.name}.`);
    }
    audio.playScore();
  }
  sim.pending = null;
  if (!aliveFoes(sim).length) {
    finishWave(sim);
    return;
  }
  sim.phase = 'BUSY';
  sim.busy = 34;
  sim.dirty += 1;
}

function enemyAction(sim: Sim, difficulty: DifficultySetting) {
  const foe = sim.foes[sim.enemyIdx];
  if (!foe || foe.hp <= 0) return;
  const party = aliveParty(sim);
  if (!party.length) return;
  const mods = difficultyMods(difficulty);
  foe.lunge = 14;
  sim.shake = 6;
  if (foe.boss) {
    const pattern = sim.turn % 3;
    if (pattern === 1) {
      sim.log.push('Gear Storm hits everyone!');
      for (const member of party) damageMember(sim, member, foe.atk * mods.enemy * 0.6 * (0.9 + random() * 0.2));
    } else {
      const target = party[Math.floor(random() * party.length)];
      if (pattern === 2) {
        damageMember(sim, target, foe.atk * 1.5 * mods.enemy * (0.9 + random() * 0.2));
        sim.log.push(`Piston Slam crushes ${target.name}!`);
      } else {
        damageMember(sim, target, foe.atk * mods.enemy * (0.9 + random() * 0.25));
        sim.log.push(`Warden strikes ${target.name}!`);
      }
    }
    audio.playExplosion();
  } else {
    const target = party[Math.floor(random() * party.length)];
    const dealt = damageMember(sim, target, foe.atk * mods.enemy * (0.85 + random() * 0.3));
    sim.log.push(`${foe.name} attacks ${target.name} for ${dealt}.`);
  }
  sim.dirty += 1;
}

/* ------------------------------------------------------------------ */
/* Canvas art                                                          */
/* ------------------------------------------------------------------ */

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawGear(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, teeth: number, rotation: number, color: string, glow: number) {
  ctx.save();
  ctx.translate(x, y);
  if (glow > 0) {
    ctx.shadowColor = color;
    ctx.shadowBlur = glow;
  }
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, radius * 0.13);
  ctx.beginPath();
  for (let index = 0; index < teeth * 2; index += 1) {
    const angle = rotation + (index * Math.PI) / teeth;
    const distance = radius * (index % 2 ? 0.86 : 1.08);
    if (index === 0) ctx.moveTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
    else ctx.lineTo(Math.cos(angle) * distance, Math.sin(angle) * distance);
  }
  ctx.closePath();
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.62, 0, Math.PI * 2);
  ctx.stroke();
  for (let index = 0; index < 6; index += 1) {
    const angle = rotation + (index * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * radius * 0.1, Math.sin(angle) * radius * 0.1);
    ctx.lineTo(Math.cos(angle) * radius * 0.6, Math.sin(angle) * radius * 0.6);
    ctx.stroke();
  }
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.14, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawBackground(ctx: CanvasRenderingContext2D, sim: Sim) {
  const zone = WAVES[sim.wave].zone;
  const width = 640;
  const height = 480;
  const sky = ctx.createLinearGradient(0, 0, 0, height);
  if (zone === 2) {
    sky.addColorStop(0, '#26070d');
    sky.addColorStop(0.55, '#57160f');
    sky.addColorStop(1, '#8a3b12');
  } else if (zone === 1) {
    sky.addColorStop(0, '#141033');
    sky.addColorStop(0.55, '#332a5c');
    sky.addColorStop(1, '#5b4a99');
  } else {
    sky.addColorStop(0, '#0f2038');
    sky.addColorStop(0.5, '#2d5b62');
    sky.addColorStop(1, '#7bbf6a');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);

  const sunX = 520;
  const sunY = 118;
  const sun = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, 190);
  sun.addColorStop(0, zone === 2 ? 'rgba(251,191,36,.5)' : 'rgba(253,224,71,.45)');
  sun.addColorStop(0.5, 'rgba(251,191,36,.12)');
  sun.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = 'rgba(12,14,26,.72)';
  for (let index = 0; index < 8; index += 1) {
    const x = 24 + index * 74;
    const base = 300;
    const wall = 26 + ((index * 17) % 34);
    ctx.fillRect(x, base - wall, 44, wall);
    ctx.beginPath();
    ctx.moveTo(x - 4, base - wall);
    ctx.lineTo(x + 22, base - wall - 16);
    ctx.lineTo(x + 48, base - wall);
    ctx.fill();
    ctx.fillStyle = 'rgba(251,191,36,.5)';
    ctx.fillRect(x + 18, base - wall + 10, 5, 8);
    ctx.fillStyle = 'rgba(12,14,26,.72)';
  }

  drawGear(ctx, 84, 96, 38, 10, sim.time * 0.12, 'rgba(251,191,36,.35)', 10);
  drawGear(ctx, 150, 152, 22, 8, -sim.time * 0.2, 'rgba(253,224,71,.3)', 6);

  if (zone === 2) {
    drawGear(ctx, 470, 300, 132, 14, sim.time * 0.08, 'rgba(251,191,36,.32)', 18);
    drawGear(ctx, 470, 300, 86, 10, -sim.time * 0.14, 'rgba(253,230,138,.22)', 10);
  }

  ctx.fillStyle = zone === 2 ? '#2a1a14' : zone === 1 ? '#2a2347' : '#3d6b3a';
  ctx.fillRect(0, 330, width, 150);

  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  ctx.lineWidth = 1;
  for (let index = 0; index < 9; index += 1) {
    const y = 336 + index * index * 2.4;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  for (let index = -6; index <= 6; index += 1) {
    ctx.beginPath();
    ctx.moveTo(320 + index * 22, 330);
    ctx.lineTo(320 + index * 92, 480);
    ctx.stroke();
  }

  ctx.fillStyle = 'rgba(8,10,20,.55)';
  ctx.fillRect(0, 0, width, 62);

  ctx.fillStyle = 'rgba(253,224,71,.9)';
  ctx.font = '700 12px ui-monospace, monospace';
  ctx.textAlign = 'center';
  ctx.fillText(WAVES[sim.wave].label.toUpperCase(), width / 2, 24);
  ctx.fillStyle = '#e5e7eb';
  ctx.font = '700 11px ui-monospace, monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`WAVE ${sim.wave + 1} / ${WAVES.length}`, 18, 24);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#fde68a';
  ctx.fillText(`SCORE ${sim.score}`, width - 18, 24);
  ctx.textAlign = 'center';
  ctx.fillStyle = 'rgba(165,180,252,.8)';
  ctx.font = '600 10px ui-monospace, monospace';
  ctx.fillText(sim.bossMode ? 'DAWN ENGINE · FINAL' : 'TURN MENU BELOW · 1-4 SELECT', width / 2, 44);
}

function drawFoe(ctx: CanvasRenderingContext2D, foe: Foe, time: number) {
  if (foe.hp <= 0) return;
  const bob = Math.sin(time * 2.2 + foe.seed) * 4;
  const lunge = foe.lunge > 0 ? -Math.sin((foe.lunge / 14) * Math.PI) * 30 : 0;
  const x = foe.x + lunge;
  const y = foe.y + bob;
  const flash = foe.flash > 0 && foe.flash % 2 === 0;
  ctx.save();
  if (flash) ctx.globalAlpha = 0.55;

  if (foe.kind === 'moss') {
    ctx.fillStyle = 'rgba(0,0,0,.3)';
    ctx.beginPath();
    ctx.ellipse(x, y + 38, 34, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#fff' : foe.col;
    ctx.beginPath();
    ctx.ellipse(x, y + 8, 30, 26 + Math.sin(time * 2.4) * 2, 0, Math.PI, 0);
    ctx.fill();
    ctx.fillRect(x - 30, y + 8, 60, 14);
    ctx.fillStyle = '#fff';
    ctx.fillRect(x - 14, y - 2, 9, 10);
    ctx.fillRect(x + 5, y - 2, 9, 10);
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 11, y + 1, 4, 5);
    ctx.fillRect(x + 8, y + 1, 4, 5);
  } else if (foe.kind === 'wisp') {
    ctx.shadowColor = foe.col;
    ctx.shadowBlur = 22;
    ctx.fillStyle = flash ? '#fff' : foe.col;
    ctx.beginPath();
    ctx.moveTo(x, y - 34);
    ctx.quadraticCurveTo(x + 26, y - 2, x + 13, y + 20);
    ctx.quadraticCurveTo(x, y + 28, x - 13, y + 20);
    ctx.quadraticCurveTo(x - 26, y - 2, x, y - 34);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1e1b4b';
    ctx.fillRect(x - 10, y - 4, 6, 9);
    ctx.fillRect(x + 4, y - 4, 6, 9);
  } else if (foe.kind === 'bat') {
    const flap = Math.sin(time * 8 + foe.seed) * 12;
    ctx.fillStyle = flash ? '#fff' : foe.col;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - 40, y - 18 - flap);
    ctx.lineTo(x - 20, y + 10);
    ctx.closePath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 40, y - 18 - flap);
    ctx.lineTo(x + 20, y + 10);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(x - 8, y - 4, 5, 5);
    ctx.fillRect(x + 3, y - 4, 5, 5);
  } else if (foe.kind === 'gear') {
    drawGear(ctx, x, y, 30, 10, time * 1.3, flash ? '#fff' : foe.col, 6);
    ctx.fillStyle = '#78350f';
    ctx.beginPath();
    ctx.arc(x, y, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fde047';
    ctx.fillRect(x - 9, y - 4, 6, 8);
    ctx.fillRect(x + 3, y - 4, 6, 8);
  } else if (foe.kind === 'knight') {
    ctx.fillStyle = 'rgba(0,0,0,.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 40, 28, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = flash ? '#fff' : foe.col;
    rr(ctx, x - 22, y - 20, 44, 54, 8);
    ctx.fill();
    ctx.fillStyle = '#92400e';
    rr(ctx, x - 18, y - 48, 36, 32, 8);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.fillRect(x - 12, y - 36, 24, 5);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(x + 3, y - 35, 5, 3);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(x + 24, y - 32, 5, 58);
  } else {
    ctx.fillStyle = 'rgba(0,0,0,.5)';
    ctx.beginPath();
    ctx.ellipse(x, y + 92, 86, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    drawGear(ctx, x, y, 74, 12, time * 0.7, 'rgba(251,191,36,.85)', 18);
    drawGear(ctx, x - 78, y + 22, 26, 9, -time * 1.1, 'rgba(251,191,36,.6)', 8);
    drawGear(ctx, x + 78, y + 22, 26, 9, time * 1.1, 'rgba(251,191,36,.6)', 8);
    ctx.fillStyle = flash ? '#fff' : '#92400e';
    rr(ctx, x - 48, y - 24, 96, 88, 18);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(x, y + 4, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(x, y + 4, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7f1d1d';
    ctx.beginPath();
    ctx.arc(x, y + 4, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 3;
    for (let index = 0; index < 12; index += 1) {
      const angle = (index * Math.PI) / 6;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(angle) * 27, y + 4 + Math.sin(angle) * 27);
      ctx.lineTo(x + Math.cos(angle) * 32, y + 4 + Math.sin(angle) * 32);
      ctx.stroke();
    }
  }
  ctx.restore();

  const barWidth = foe.boss ? 110 : 56;
  const barY = foe.boss ? y - 124 : y - 56;
  ctx.fillStyle = 'rgba(0,0,0,.55)';
  ctx.fillRect(x - barWidth / 2, barY, barWidth, 7);
  ctx.fillStyle = '#ef4444';
  ctx.fillRect(x - barWidth / 2 + 1, barY + 1, (barWidth - 2) * (foe.hp / foe.mhp), 5);
}

function drawMember(ctx: CanvasRenderingContext2D, member: Member, index: number, sim: Sim) {
  const x = 150 + index * 86 + (member.lunge > 0 ? Math.sin((member.lunge / 14) * Math.PI) * 42 : 0);
  const y = 288 + Math.sin(sim.time * 2 + index) * 2;
  const flash = member.flash > 0 && member.flash % 2 === 0;
  ctx.save();
  if (member.hp <= 0) {
    ctx.globalAlpha = 0.4;
    ctx.translate(x, y + 20);
    ctx.rotate(1.25);
    ctx.translate(-x, -y - 20);
  }
  ctx.fillStyle = 'rgba(0,0,0,.32)';
  ctx.beginPath();
  ctx.ellipse(x, y + 46, 24, 6, 0, 0, Math.PI * 2);
  ctx.fill();
  if (sim.phase === 'MENU' && sim.actor === index) {
    const glow = ctx.createRadialGradient(x, y + 8, 0, x, y + 8, 54);
    glow.addColorStop(0, 'rgba(253,224,71,.28)');
    glow.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 60, y - 50, 120, 120);
  }
  ctx.fillStyle = flash ? '#fff' : member.col;
  rr(ctx, x - 16, y - 18, 32, 52, 7);
  ctx.fill();
  ctx.fillStyle = flash ? '#fff' : member.trim;
  rr(ctx, x - 12, y + 18, 24, 14, 4);
  ctx.fill();
  ctx.fillStyle = '#f5d0a9';
  ctx.beginPath();
  ctx.arc(x, y - 30, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = member.id === 'kai' ? '#1e293b' : '#9d174d';
  ctx.beginPath();
  ctx.arc(x, y - 36, 13, Math.PI, 0);
  ctx.fill();
  if (member.id === 'kai') {
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x + 14, y - 8);
    ctx.lineTo(x + 34, y - 34);
    ctx.stroke();
  } else {
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 16, y - 40);
    ctx.lineTo(x + 24, y + 30);
    ctx.stroke();
    ctx.fillStyle = '#c4b5fd';
    ctx.beginPath();
    ctx.arc(x + 16, y - 44, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  if (sim.phase === 'MENU' && sim.actor === index) {
    ctx.fillStyle = '#fde047';
    ctx.beginPath();
    ctx.moveTo(x, y - 58 + Math.sin(sim.time * 5) * 3);
    ctx.lineTo(x - 8, y - 72);
    ctx.lineTo(x + 8, y - 72);
    ctx.fill();
  }
  if (sim.phase === 'TARGET' && targetIsAlly(sim) && sim.tgt === index) {
    ctx.fillStyle = '#86efac';
    ctx.beginPath();
    ctx.moveTo(x, y - 58 + Math.sin(sim.time * 5) * 3);
    ctx.lineTo(x - 8, y - 74);
    ctx.lineTo(x + 8, y - 74);
    ctx.fill();
  }
}

function drawPopups(ctx: CanvasRenderingContext2D, sim: Sim) {
  ctx.textAlign = 'center';
  ctx.font = '800 18px ui-monospace, monospace';
  for (const popup of sim.popups) {
    ctx.globalAlpha = Math.max(0, popup.life / 42);
    ctx.fillStyle = popup.col;
    ctx.fillText(popup.text, popup.x, popup.y - (42 - popup.life) * 0.9);
  }
  ctx.globalAlpha = 1;
}

function drawScene(ctx: CanvasRenderingContext2D, sim: Sim) {
  ctx.clearRect(0, 0, 640, 480);
  ctx.save();
  if (sim.shake > 0) {
    ctx.translate((random() - 0.5) * sim.shake, (random() - 0.5) * sim.shake);
  }
  drawBackground(ctx, sim);
  for (const foe of sim.foes) drawFoe(ctx, foe, sim.time);
  if (sim.phase === 'TARGET' && !targetIsAlly(sim)) {
    const foe = sim.foes[sim.tgt];
    if (foe && foe.hp > 0) {
      ctx.fillStyle = '#fde047';
      const bob = Math.sin(sim.time * 5) * 3;
      ctx.beginPath();
      ctx.moveTo(foe.x, foe.y - 74 + bob);
      ctx.lineTo(foe.x - 9, foe.y - 90 + bob);
      ctx.lineTo(foe.x + 9, foe.y - 90 + bob);
      ctx.fill();
    }
  }
  sim.party.forEach((member, index) => drawMember(ctx, member, index, sim));
  drawPopups(ctx, sim);
  if (sim.flash > 0) {
    ctx.fillStyle = `rgba(255,244,214,${(sim.flash / 14) * 0.22})`;
    ctx.fillRect(0, 0, 640, 480);
  }
  if (sim.portal > 0) {
    const glow = ctx.createRadialGradient(320, 190, 0, 320, 190, 220);
    glow.addColorStop(0, `rgba(251,191,36,${0.34 * sim.portal})`);
    glow.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 640, 480);
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ */

export const ChronoBattleEngine: React.FC<ChronoBattleEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
  highScore = 0,
  onLevelComplete,
  onRestart,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const simRef = useRef<Sim>(createSim());
  const [, forceRender] = useState(0);
  const pausedRef = useRef(isPaused);
  pausedRef.current = isPaused;
  const difficultyRef = useRef(difficulty);
  difficultyRef.current = difficulty;
  const callbacksRef = useRef({ onScoreUpdate, onGameOver, onLevelComplete, onRestart });
  callbacksRef.current = { onScoreUpdate, onGameOver, onLevelComplete, onRestart };

  const startRun = useCallback(() => {
    simRef.current = createSim();
    spawnFoes(simRef.current);
    callbacksRef.current.onScoreUpdate(0);
    callbacksRef.current.onRestart?.();
    audio.playClick();
    forceRender((value) => value + 1);
  }, []);

  const finishWaveAndReport = useCallback((sim: Sim, escaped = false) => {
    finishWave(sim, escaped);
    callbacksRef.current.onScoreUpdate(sim.score);
    if (!escaped) {
      if (!sim.levelReported) {
        sim.levelReported = true;
        callbacksRef.current.onLevelComplete?.(sim.wave + 1, sim.score);
      }
      if (sim.phase === 'VICTORY' && !sim.ended) {
        sim.ended = true;
        callbacksRef.current.onGameOver(sim.score);
      }
    }
    forceRender((value) => value + 1);
  }, []);

  const reportAction = useCallback((sim: Sim) => {
    callbacksRef.current.onScoreUpdate(sim.score);
    if (!sim.levelReported && (sim.phase === 'WIN' || sim.phase === 'VICTORY')) {
      sim.levelReported = true;
      callbacksRef.current.onLevelComplete?.(sim.wave + 1, sim.score);
    }
    if (sim.phase === 'VICTORY' && !sim.ended) {
      sim.ended = true;
      callbacksRef.current.onGameOver(sim.score);
    }
    forceRender((value) => value + 1);
  }, []);

  const advanceAfterPlayer = useCallback((sim: Sim) => {
    if (!aliveFoes(sim).length) {
      finishWaveAndReport(sim);
      return;
    }
    sim.phase = 'BUSY';
    sim.busy = 30;
    sim.dirty += 1;
  }, [finishWaveAndReport]);

  const loseRun = useCallback((sim: Sim) => {
    sim.phase = 'LOSE';
    sim.ended = true;
    sim.dirty += 1;
    audio.playExplosion();
    callbacksRef.current.onGameOver(sim.score);
    forceRender((value) => value + 1);
  }, []);

  const actRef = useRef<(action: string) => void>(() => {});
  actRef.current = (action: string) => {
    const sim = simRef.current;
    if (action === 'start') {
      if (sim.phase === 'READY') startRun();
      return;
    }
    if (action === 'restart') {
      if (sim.phase === 'LOSE' || sim.phase === 'VICTORY') startRun();
      return;
    }
    if (action === 'next') {
      if (sim.phase === 'WIN') {
        nextWave(sim);
        callbacksRef.current.onScoreUpdate(sim.score);
        forceRender((value) => value + 1);
      }
      return;
    }
    if (sim.phase === 'MENU') {
      if (action === 'up') {
        sim.sel = (sim.sel + 3) % 4;
        audio.playClick();
        sim.dirty += 1;
      } else if (action === 'down') {
        sim.sel = (sim.sel + 1) % 4;
        audio.playClick();
        sim.dirty += 1;
      } else if (action.startsWith('quick:')) {
        sim.sel = Number(action.split(':')[1]);
        actRef.current('confirm');
      } else if (action === 'confirm') {
        audio.playClick();
        if (sim.sel === 0) {
          sim.pending = { type: 'attack' };
          sim.tgt = firstTarget(sim);
          sim.phase = 'TARGET';
          sim.dirty += 1;
        } else if (sim.sel === 1) {
          sim.sel2 = 0;
          sim.phase = 'SKILL';
          sim.dirty += 1;
        } else if (sim.sel === 2) {
          sim.sel2 = 0;
          sim.phase = 'ITEM';
          sim.dirty += 1;
        } else if (sim.bossMode) {
          sim.log.push('The Warden will not let you flee.');
          sim.dirty += 1;
        } else if (random() < 0.65) {
          finishWaveAndReport(sim, true);
        } else {
          sim.log.push('Could not escape!');
          advanceAfterPlayer(sim);
        }
      }
      return;
    }
    if (sim.phase === 'SKILL') {
      const list = skillList(sim);
      if (action === 'up') {
        sim.sel2 = (sim.sel2 + list.length - 1) % list.length;
        audio.playClick();
        sim.dirty += 1;
      } else if (action === 'down') {
        sim.sel2 = (sim.sel2 + 1) % list.length;
        audio.playClick();
        sim.dirty += 1;
      } else if (action === 'back') {
        sim.phase = 'MENU';
        sim.dirty += 1;
        audio.playClick();
      } else if (action.startsWith('quick:')) {
        sim.sel2 = Number(action.split(':')[1]);
        actRef.current('confirm');
      } else if (action === 'confirm') {
        const skill = list[sim.sel2];
        if (!skill || activeMember(sim).mp < skill.cost) {
          audio.playClick();
          return;
        }
        audio.playClick();
        sim.pending = { type: 'skill', skill };
        if (skill.target === 'ally') {
          sim.tgt = Math.max(0, sim.actor);
          sim.phase = 'TARGET';
          sim.dirty += 1;
        } else if (skill.all) {
          sim.tgt = firstTarget(sim);
          executePending(sim, difficultyRef.current);
          reportAction(sim);
        } else {
          sim.tgt = firstTarget(sim);
          sim.phase = 'TARGET';
          sim.dirty += 1;
        }
      }
      return;
    }
    if (sim.phase === 'ITEM') {
      const items = itemList();
      if (action === 'up' || action === 'down') {
        sim.sel2 = 1 - sim.sel2;
        audio.playClick();
        sim.dirty += 1;
      } else if (action === 'back') {
        sim.phase = 'MENU';
        sim.dirty += 1;
        audio.playClick();
      } else if (action.startsWith('quick:')) {
        sim.sel2 = Number(action.split(':')[1]);
        actRef.current('confirm');
      } else if (action === 'confirm') {
        const item = items[sim.sel2];
        if (!item || sim.inventory[item] <= 0) {
          audio.playClick();
          return;
        }
        sim.pending = { type: 'item', item };
        sim.tgt = Math.max(0, sim.actor);
        sim.phase = 'TARGET';
        sim.dirty += 1;
        audio.playClick();
      }
      return;
    }
    if (sim.phase === 'TARGET') {
      const pool = targetPool(sim);
      const usable = (entry: Member | Foe) => entry.hp > 0 || sim.pending?.type === 'item';
      if (action === 'back') {
        sim.phase = sim.pending?.type === 'skill' ? 'SKILL' : sim.pending?.type === 'item' ? 'ITEM' : 'MENU';
        sim.pending = null;
        sim.dirty += 1;
        audio.playClick();
        return;
      }
      if (action === 'left' || action === 'right' || action === 'up' || action === 'down') {
        const direction = action === 'left' || action === 'up' ? -1 : 1;
        let index = sim.tgt;
        for (let guard = 0; guard < pool.length; guard += 1) {
          index = (index + direction + pool.length) % pool.length;
          if (usable(pool[index])) {
            sim.tgt = index;
            break;
          }
        }
        audio.playClick();
        sim.dirty += 1;
        return;
      }
      if (action === 'confirm') {
        if (!pool[sim.tgt]) return;
        executePending(sim, difficultyRef.current);
        reportAction(sim);
      }
    }
  };

  useEffect(() => {
    const keyMap: Record<string, string> = {
      ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
      KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
      Space: 'confirm', Enter: 'confirm', KeyZ: 'confirm',
      KeyX: 'back', Backspace: 'back',
      Digit1: 'quick:0', Digit2: 'quick:1', Digit3: 'quick:2', Digit4: 'quick:3',
      KeyR: 'restart',
    };
    const handleKey = (event: KeyboardEvent) => {
      if (pausedRef.current) return;
      const sim = simRef.current;
      if (sim.phase === 'READY' && (event.code === 'Space' || event.code === 'Enter')) {
        event.preventDefault();
        actRef.current('start');
        return;
      }
      if (sim.phase === 'WIN' && (event.code === 'Space' || event.code === 'Enter')) {
        event.preventDefault();
        actRef.current('next');
        return;
      }
      if ((sim.phase === 'LOSE' || sim.phase === 'VICTORY') && (event.code === 'Space' || event.code === 'Enter')) {
        event.preventDefault();
        actRef.current('restart');
        return;
      }
      const action = keyMap[event.code];
      if (!action) return;
      const active = sim.phase === 'MENU' || sim.phase === 'SKILL' || sim.phase === 'ITEM' || sim.phase === 'TARGET';
      if (!active) return;
      event.preventDefault();
      actRef.current(action);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    (window as unknown as { ChronoBattleTest?: unknown }).ChronoBattleTest = {
      state: () => {
        const sim = simRef.current;
        return {
          phase: sim.phase, wave: sim.wave, actor: sim.actor, score: sim.score,
          boss: sim.bossMode, portal: sim.portal, rewards: sim.rewards.slice(),
          party: sim.party.map((member) => ({ name: member.name, hp: member.hp, mhp: member.mhp, mp: member.mp, mmp: member.mmp, lvl: member.lvl })),
          foes: sim.foes.map((foe) => ({ name: foe.name, hp: foe.hp, mhp: foe.mhp, boss: foe.boss })),
        };
      },
      select: (action: string) => actRef.current(action),
      start: () => startRun(),
      winWave: () => finishWaveAndReport(simRef.current),
      damage: (amount: number) => {
        const sim = simRef.current;
        const foe = sim.foes.find((entry) => entry.hp > 0);
        if (!foe) return;
        damageFoe(sim, foe, amount, false);
        sim.dirty += 1;
        forceRender((value) => value + 1);
      },
    };
    return () => {
      delete (window as unknown as { ChronoBattleTest?: unknown }).ChronoBattleTest;
    };
  }, [finishWaveAndReport, startRun]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let lastDirty = -1;
    let animId = 0;

    const tick = () => {
      if (pausedRef.current) {
        animId = requestAnimationFrame(tick);
        return;
      }
      const sim = simRef.current;
      sim.time += 1 / 60;
      if (sim.flash > 0) sim.flash -= 1;
      if (sim.shake > 0) sim.shake = Math.max(0, sim.shake - 0.4);
      for (const popup of sim.popups) popup.life -= 1;
      sim.popups = sim.popups.filter((popup) => popup.life > 0);
      for (const member of sim.party) {
        if (member.lunge > 0) member.lunge -= 1;
        if (member.flash > 0) member.flash -= 1;
      }
      for (const foe of sim.foes) {
        if (foe.lunge > 0) foe.lunge -= 1;
        if (foe.flash > 0) foe.flash -= 1;
      }

      if (sim.phase === 'BUSY') {
        sim.busy -= 1;
        if (sim.busy <= 0) advanceActor(sim);
      } else if (sim.phase === 'ENEMY') {
        if (sim.enemyWait > 0) {
          sim.enemyWait -= 1;
        } else {
          const foe = sim.foes[sim.enemyIdx];
          if (!foe || foe.hp <= 0) {
            sim.enemyIdx += 1;
            sim.enemyWait = 12;
          } else {
            enemyAction(sim, difficultyRef.current);
            sim.enemyIdx += 1;
            sim.enemyWait = 40;
            callbacksRef.current.onScoreUpdate(sim.score);
          }
          if (sim.enemyIdx >= sim.foes.length) {
            if (!aliveParty(sim).length) {
              loseRun(sim);
            } else {
              sim.turn += 1;
              sim.actor = -1;
              sim.sel = 0;
              sim.sel2 = 0;
              advanceActor(sim);
            }
          }
        }
      }

      drawScene(ctx, sim);
      if (sim.dirty !== lastDirty) {
        lastDirty = sim.dirty;
        forceRender((value) => value + 1);
      }
      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, [advanceActor, loseRun]);

  const sim = simRef.current;
  const member = sim.party[Math.max(0, sim.actor)];
  const skills = member ? member.skills.filter((skill) => skill.minLevel <= member.lvl) : [];
  const canAct = sim.phase === 'MENU' || sim.phase === 'SKILL' || sim.phase === 'ITEM' || sim.phase === 'TARGET';
  const waveLabel = WAVES[sim.wave].label;
  const best = Math.max(highScore, sim.score);

  return (
    <div className="relative w-full max-w-[720px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      <div className="absolute top-16 left-4 right-4 flex items-start justify-between gap-4 pointer-events-none">
        <div className="flex flex-col gap-1.5">
          {sim.party.map((entry) => (
            <div key={entry.id} className={`w-40 rounded-lg border px-2 py-1.5 backdrop-blur-md ${sim.actor >= 0 && sim.party[sim.actor]?.id === entry.id ? 'border-amber-300/60 bg-black/70' : 'border-white/10 bg-black/55'}`}>
              <div className="flex items-center justify-between text-[10px] font-bold text-white">
                <span>{entry.name} <span className="text-amber-300">Lv {entry.lvl}</span></span>
                <span className="font-mono text-rose-200">{entry.hp}/{entry.mhp}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-slate-900">
                <div className={entry.hp > entry.mhp * 0.3 ? 'h-full bg-emerald-400' : 'h-full bg-rose-500'} style={{ width: `${(entry.hp / entry.mhp) * 100}%` }} />
              </div>
              <div className="mt-1 flex items-center justify-between text-[9px] font-mono text-cyan-200">
                <span>MP {entry.mp}/{entry.mmp}</span>
                <span className="text-slate-400">XP {entry.xp}/{needXp(entry)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {sim.foes.map((foe, index) => (
            <div key={`${foe.kind}-${index}`} className={`rounded-lg border px-2 py-1.5 backdrop-blur-md ${sim.phase === 'TARGET' && !targetIsAlly(sim) && sim.tgt === index ? 'border-amber-300/70 bg-black/75' : 'border-white/10 bg-black/55'}`}>
              <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-white">
                <span>{foe.name}</span>
                <span className="font-mono text-rose-200">{Math.max(0, foe.hp)}/{foe.mhp}</span>
              </div>
              <div className="mt-1 h-1.5 w-36 overflow-hidden rounded bg-slate-900">
                <div className="h-full bg-rose-500" style={{ width: `${(Math.max(0, foe.hp) / foe.mhp) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="absolute top-8 left-1/2 -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-4 py-1 text-[10px] font-mono text-amber-200 pointer-events-none">
        {sim.phase === 'READY' && 'The last dark hour waits.'}
        {sim.phase === 'MENU' && `${member?.name || 'Party'}'s turn · ${waveLabel}`}
        {sim.phase === 'SKILL' && 'Choose a skill · X to back'}
        {sim.phase === 'ITEM' && 'Choose an item · X to back'}
        {sim.phase === 'TARGET' && (targetIsAlly(sim) ? 'Choose an ally · arrows + Space' : 'Choose a foe · arrows + Space')}
        {sim.phase === 'BUSY' && 'The party moves...'}
        {sim.phase === 'ENEMY' && 'The monsters strike!'}
        {sim.phase === 'WIN' && 'Victory! · Space to continue'}
        {sim.phase === 'LOSE' && 'The party fell.'}
        {sim.phase === 'VICTORY' && 'The dawn returns.'}
      </div>

      <div className="absolute bottom-3 left-3 right-3 rounded-xl border border-white/10 bg-[#0B0E1A]/92 p-2.5 backdrop-blur-md">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-mono">
          <span className="truncate text-slate-300">{sim.log[sim.log.length - 1] || ''}</span>
          <span className="ml-3 shrink-0 text-amber-300">SCORE {sim.score} · BEST {best}</span>
        </div>
        {sim.phase === 'MENU' && (
          <div className="grid grid-cols-4 gap-2">
            {['Attack', 'Skill', 'Item', 'Flee'].map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => actRef.current(`quick:${index}`)}
                onMouseEnter={() => { sim.sel = index; forceRender((value) => value + 1); }}
                className={`rounded-lg py-2 text-xs font-semibold transition-colors ${sim.sel === index ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {sim.phase === 'SKILL' && (
          <div className="grid grid-cols-2 gap-2">
            {skills.map((skill, index) => (
              <button
                key={skill.name}
                type="button"
                onClick={() => actRef.current(`quick:${index}`)}
                disabled={!member || member.mp < skill.cost}
                className={`rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${sim.sel2 === index ? 'bg-cyan-500/90 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'} disabled:cursor-not-allowed disabled:text-slate-600`}
              >
                {skill.name} <span className="font-mono text-[10px]">{skill.cost} MP</span>
              </button>
            ))}
            <button type="button" onClick={() => actRef.current('back')} className="rounded-lg bg-white/5 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-300 hover:bg-white/10">Back</button>
          </div>
        )}
        {sim.phase === 'ITEM' && (
          <div className="grid grid-cols-3 gap-2">
            {itemList().map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => actRef.current(`quick:${index}`)}
                disabled={sim.inventory[item] <= 0}
                className={`rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold transition-colors ${sim.sel2 === index ? 'bg-emerald-500/90 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'} disabled:cursor-not-allowed disabled:text-slate-600`}
              >
                {item === 'potion' ? 'Potion +30 HP' : 'Ether +12 MP'} <span className="font-mono text-[10px]">x{sim.inventory[item]}</span>
              </button>
            ))}
            <button type="button" onClick={() => actRef.current('back')} className="rounded-lg bg-white/5 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-300 hover:bg-white/10">Back</button>
          </div>
        )}
        {sim.phase === 'TARGET' && (
          <div className="grid grid-cols-2 gap-2">
            {targetPool(sim).map((entry, index) => (
              <button
                key={`${'id' in entry ? entry.id : entry.kind}-${index}`}
                type="button"
                onClick={() => { sim.tgt = index; actRef.current('confirm'); }}
                className={`rounded-lg px-2 py-1.5 text-left text-[11px] font-semibold ${sim.tgt === index ? 'bg-amber-400 text-slate-950' : 'bg-white/5 text-slate-200 hover:bg-white/10'}`}
              >
                {entry.name}
              </button>
            ))}
            <button type="button" onClick={() => actRef.current('back')} className="rounded-lg bg-white/5 px-2 py-1.5 text-left text-[11px] font-semibold text-slate-300 hover:bg-white/10">Back</button>
          </div>
        )}
        {sim.phase === 'WIN' && (
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 text-[11px] font-semibold text-amber-200">
              {sim.rewards.slice(0, 2).join(' · ') || 'Victory!'}
            </div>
            <button type="button" onClick={() => actRef.current('next')} className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 text-[11px] font-bold text-slate-950 hover:bg-amber-300">
              {sim.wave + 1 >= WAVES.length ? 'Face the Warden' : 'Next Encounter'}
            </button>
          </div>
        )}
        {!canAct && sim.phase !== 'WIN' && (
          <div className="flex h-8 items-center justify-center text-[11px] font-mono text-slate-400">
            {sim.phase === 'READY' ? 'Press Start to enter the wilds.' : sim.phase === 'LOSE' ? 'The dawn machine grinds on.' : sim.phase === 'VICTORY' ? 'The sunwheel turns again.' : '...'}
          </div>
        )}
      </div>

      {sim.phase === 'READY' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-xs">
          <div className="text-3xl font-extrabold tracking-tight text-amber-300">Clockwork Dawn</div>
          <p className="mb-5 mt-1 max-w-sm text-center text-sm text-slate-200">Kai and Mira cross the Hearthwilds and break the Clockwork Warden before the sun can rise.</p>
          <button type="button" onClick={() => actRef.current('start')} className="rounded-lg bg-amber-400 px-6 py-3 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-300">
            ENTER THE WILDS
          </button>
        </div>
      )}

      {sim.phase === 'LOSE' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="text-2xl font-bold tracking-tight text-rose-400">The Party Fell</div>
          <p className="mt-1 text-sm text-slate-300">The Warden's dawn machine grinds on. Final score {sim.score}.</p>
          <button type="button" onClick={() => actRef.current('restart')} className="mt-4 rounded-lg bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300">
            TRY AGAIN
          </button>
        </div>
      )}

      {sim.phase === 'VICTORY' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm">
          <div className="text-2xl font-bold tracking-tight text-amber-300">The Dawn Returns</div>
          <p className="mt-1 text-sm text-slate-300">The Warden crumbles. Final score {sim.score} · Best {Math.max(highScore, sim.score)}.</p>
          <button type="button" onClick={() => actRef.current('restart')} className="mt-4 rounded-lg bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300">
            RUN IT BACK
          </button>
        </div>
      )}
    </div>
  );
};

export default ChronoBattleEngine;
