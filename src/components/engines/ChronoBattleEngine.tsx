import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audio } from '../../services/audioSynthesizer';
import { DifficultySetting } from '../../types/game';

interface ChronoBattleEngineProps {
  onScoreUpdate: (score: number) => void;
  onGameOver: (finalScore: number) => void;
  isPaused: boolean;
  difficulty?: DifficultySetting;
}

export const ChronoBattleEngine: React.FC<ChronoBattleEngineProps> = ({
  onScoreUpdate,
  onGameOver,
  isPaused,
  difficulty = 'normal',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cronoHp, setCronoHp] = useState(250);
  const [bossHp, setBossHp] = useState(600);
  const [atb, setAtb] = useState(0);
  const [activeMessage, setActiveMessage] = useState('Wait for ATB gauge to charge...');
  const [gameState, setGameState] = useState<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');

  const cronoHpRef = useRef(250);
  const bossHpRef = useRef(600);
  const atbRef = useRef(0);
  const stateRef = useRef<'READY' | 'PLAYING' | 'GAMEOVER' | 'VICTORY'>('READY');
  stateRef.current = gameState;

  const slashAnimRef = useRef(0);
  const thunderAnimRef = useRef(0);
  const bossAttackTimerRef = useRef(120);

  const startGame = useCallback(() => {
    cronoHpRef.current = 250;
    bossHpRef.current = 600;
    atbRef.current = 0;
    slashAnimRef.current = 0;
    thunderAnimRef.current = 0;
    bossAttackTimerRef.current = 140;
    setCronoHp(250);
    setBossHp(600);
    setAtb(0);
    setActiveMessage('Battle Started! Prepare techniques.');
    setGameState('PLAYING');
    stateRef.current = 'PLAYING';
    audio.playClick();
  }, []);

  const executeAction = (action: 'attack' | 'cyclone' | 'lightning' | 'heal') => {
    if (stateRef.current !== 'PLAYING' || atbRef.current < 100) return;

    atbRef.current = 0;
    setAtb(0);

    if (action === 'attack') {
      audio.playPongBeep(true);
      slashAnimRef.current = 20;
      const dmg = 75 + Math.floor(Math.random() * 25);
      bossHpRef.current = Math.max(0, bossHpRef.current - dmg);
      setBossHp(bossHpRef.current);
      setActiveMessage(`Crono slashes Lavos Spawn for ${dmg} DMG!`);
    } else if (action === 'cyclone') {
      audio.playLaser();
      slashAnimRef.current = 35;
      const dmg = 135 + Math.floor(Math.random() * 35);
      bossHpRef.current = Math.max(0, bossHpRef.current - dmg);
      setBossHp(bossHpRef.current);
      setActiveMessage(`Cyclone Tech hits for devastating ${dmg} DMG!`);
    } else if (action === 'lightning') {
      audio.playExplosion();
      thunderAnimRef.current = 30;
      const dmg = 190 + Math.floor(Math.random() * 45);
      bossHpRef.current = Math.max(0, bossHpRef.current - dmg);
      setBossHp(bossHpRef.current);
      setActiveMessage(`Lightning Magic strikes for massive ${dmg} DMG!`);
    } else if (action === 'heal') {
      audio.playScore();
      cronoHpRef.current = Math.min(250, cronoHpRef.current + 110);
      setCronoHp(cronoHpRef.current);
      setActiveMessage('Aura restored 110 HP!');
    }

    onScoreUpdate((600 - bossHpRef.current) * 10);

    if (bossHpRef.current <= 0) {
      stateRef.current = 'VICTORY';
      setGameState('VICTORY');
      audio.playScore();
      onGameOver(3000 + cronoHpRef.current * 10);
    }
  };

  // Main Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let t = 0;

    const atbRate = difficulty === 'hard' ? 0.75 : difficulty === 'easy' ? 1.3 : 1.0;

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
        if (atbRef.current < 100) {
          atbRef.current = Math.min(100, atbRef.current + 0.8 * atbRate);
          setAtb(Math.floor(atbRef.current));
        }

        if (slashAnimRef.current > 0) slashAnimRef.current--;
        if (thunderAnimRef.current > 0) thunderAnimRef.current--;

        // Boss Attack Timer
        bossAttackTimerRef.current--;
        if (bossAttackTimerRef.current <= 0) {
          bossAttackTimerRef.current = difficulty === 'hard' ? 90 : 130;
          audio.playHit();
          const bossDmg = (difficulty === 'hard' ? 55 : 40) + Math.floor(Math.random() * 20);
          cronoHpRef.current = Math.max(0, cronoHpRef.current - bossDmg);
          setCronoHp(cronoHpRef.current);
          setActiveMessage(`Lavos Spawn erupts with Needle Burst for ${bossDmg} DMG!`);

          if (cronoHpRef.current <= 0) {
            stateRef.current = 'GAMEOVER';
            setGameState('GAMEOVER');
            audio.playExplosion();
            onGameOver(0);
          }
        }
      }

      // RENDER 2.5D ATB BATTLE ARENA
      ctx.clearRect(0, 0, width, height);

      // Time Gate Space-Time Distortion Backdrop
      const spaceGrad = ctx.createLinearGradient(0, 0, width, height);
      spaceGrad.addColorStop(0, '#1E1B4B');
      spaceGrad.addColorStop(0.5, '#0F172A');
      spaceGrad.addColorStop(1, '#090D16');
      ctx.fillStyle = spaceGrad;
      ctx.fillRect(0, 0, width, height);

      // 3D Isometric Floating Arena Platform
      const cx = width / 2;
      const cy = height * 0.58;
      const rx = 240;
      const ry = 95;

      // Platform Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 24, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Platform Rim 3D extrusion
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.ellipse(cx, cy + 12, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();

      // Platform Top Face
      ctx.fillStyle = '#0F172A';
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Render Crono (Left side of arena)
      const cronoX = cx - 120;
      const cronoY = cy - 20;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(cronoX, cronoY + 18, 16, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crono Body
      ctx.fillStyle = '#2563EB'; // Blue tunic
      ctx.fillRect(cronoX - 10, cronoY - 20, 20, 30);

      // Spiky Red Hair
      ctx.fillStyle = '#EF4444';
      ctx.beginPath();
      ctx.arc(cronoX, cronoY - 28, 12, 0, Math.PI * 2);
      ctx.fill();
      // Spikes
      ctx.beginPath();
      ctx.moveTo(cronoX - 10, cronoY - 32);
      ctx.lineTo(cronoX - 18, cronoY - 46);
      ctx.lineTo(cronoX - 4, cronoY - 36);
      ctx.lineTo(cronoX + 4, cronoY - 48);
      ctx.lineTo(cronoX + 12, cronoY - 34);
      ctx.fill();

      // Katana Sword
      ctx.strokeStyle = '#E2E8F0';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cronoX + 8, cronoY - 8);
      ctx.lineTo(cronoX + 28, cronoY - 32);
      ctx.stroke();

      // Render Lavos Spawn Boss (Right side of arena)
      const bossX = cx + 110;
      const bossY = cy - 40;

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.beginPath();
      ctx.ellipse(bossX, bossY + 45, 45, 14, 0, 0, Math.PI * 2);
      ctx.fill();

      // Giant Alien Spiky Shell
      ctx.fillStyle = '#7C2D12';
      ctx.beginPath();
      ctx.ellipse(bossX, bossY, 40, 50, 0, 0, Math.PI * 2);
      ctx.fill();

      // Shell spikes
      ctx.fillStyle = '#991B1B';
      for (let i = 0; i < 7; i++) {
        const ang = (i / 7) * Math.PI * 2;
        const sx = bossX + Math.cos(ang) * 44;
        const sy = bossY + Math.sin(ang) * 54;
        ctx.beginPath();
        ctx.moveTo(bossX, bossY);
        ctx.lineTo(sx + Math.cos(ang) * 16, sy + Math.sin(ang) * 16);
        ctx.lineTo(sx - 8, sy - 8);
        ctx.fill();
      }

      // Glowing Core Eye
      ctx.fillStyle = '#F59E0B';
      ctx.shadowColor = '#F59E0B';
      ctx.shadowBlur = 16;
      ctx.beginPath();
      ctx.arc(bossX - 10, bossY + 5, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Attack Visual Effects
      if (slashAnimRef.current > 0) {
        ctx.strokeStyle = '#38BDF8';
        ctx.shadowColor = '#38BDF8';
        ctx.shadowBlur = 20;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(bossX, bossY, 50, -0.5, 2.5);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (thunderAnimRef.current > 0) {
        ctx.strokeStyle = '#FACC15';
        ctx.shadowColor = '#FACC15';
        ctx.shadowBlur = 25;
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(bossX, 0);
        ctx.lineTo(bossX - 15, bossY - 80);
        ctx.lineTo(bossX + 15, bossY - 40);
        ctx.lineTo(bossX, bossY);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [difficulty, isPaused]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto aspect-[4/3] bg-black rounded-xl overflow-hidden border border-white/10 shadow-2xl select-none">
      <canvas ref={canvasRef} width={640} height={480} className="w-full h-full block" />

      {/* Top Health & Boss HUD */}
      <div className="absolute top-4 left-6 right-6 flex items-center justify-between gap-6 pointer-events-none">
        {/* Crono HP */}
        <div className="w-44 bg-black/60 backdrop-blur-md p-2.5 rounded-lg border border-white/10">
          <div className="flex justify-between text-xs font-bold text-white mb-1">
            <span>CRONO</span>
            <span className="font-mono text-cyan-300">{cronoHp} / 250 HP</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-sm overflow-hidden">
            <div
              className="h-full bg-cyan-400 transition-all duration-150"
              style={{ width: `${(cronoHp / 250) * 100}%` }}
            />
          </div>
        </div>

        {/* Boss HP */}
        <div className="w-48 bg-black/60 backdrop-blur-md p-2.5 rounded-lg border border-white/10">
          <div className="flex justify-between text-xs font-bold text-white mb-1">
            <span>LAVOS SPAWN</span>
            <span className="font-mono text-red-400">{bossHp} / 600 HP</span>
          </div>
          <div className="w-full h-2.5 bg-slate-800 rounded-sm overflow-hidden">
            <div
              className="h-full bg-red-600 transition-all duration-150"
              style={{ width: `${(bossHp / 600) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Battle Status Banner */}
      <div className="absolute top-18 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs font-mono text-slate-300 pointer-events-none">
        {activeMessage}
      </div>

      {/* ATB Command Menu Dock */}
      <div className="absolute bottom-4 left-6 right-6 bg-[#0B0E1A]/90 backdrop-blur-md p-3 rounded-xl border border-white/10 flex flex-col gap-2">
        {/* ATB Charge Bar */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
          <span>ATB READY GAUGE</span>
          <span className={atb >= 100 ? 'text-cyan-400 font-bold' : 'text-slate-400'}>
            {atb >= 100 ? 'COMMAND READY!' : `${atb}%`}
          </span>
        </div>
        <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden mb-2">
          <div
            className={`h-full transition-all duration-75 ${
              atb >= 100 ? 'bg-cyan-400 shadow-[0_0_10px_#38bdf8]' : 'bg-cyan-700'
            }`}
            style={{ width: `${atb}%` }}
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => executeAction('attack')}
            disabled={atb < 100}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              atb >= 100
                ? 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            Sword Strike
          </button>
          <button
            onClick={() => executeAction('cyclone')}
            disabled={atb < 100}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              atb >= 100
                ? 'bg-cyan-600 hover:bg-cyan-500 text-white cursor-pointer shadow-md'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            Cyclone Tech
          </button>
          <button
            onClick={() => executeAction('lightning')}
            disabled={atb < 100}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              atb >= 100
                ? 'bg-amber-600 hover:bg-amber-500 text-white cursor-pointer shadow-md'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            Lightning
          </button>
          <button
            onClick={() => executeAction('heal')}
            disabled={atb < 100}
            className={`py-2 text-xs font-semibold rounded-lg transition-all ${
              atb >= 100
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer shadow-md'
                : 'bg-white/5 text-slate-600 cursor-not-allowed'
            }`}
          >
            Aura Heal
          </button>
        </div>
      </div>

      {gameState === 'READY' && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center">
          <div className="text-3xl font-extrabold text-white mb-2 tracking-tight">Chrono Trigger 2.5D</div>
          <p className="text-sm text-slate-300 mb-5">Command Crono across the time gate and vanquish Lavos Spawn</p>
          <button
            onClick={startGame}
            className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            ENGAGE TIME WARP
          </button>
        </div>
      )}

      {gameState === 'GAMEOVER' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-red-400 mb-1 tracking-tight">The Future Refused to Change</div>
          <p className="text-sm text-slate-300 mb-4">Crono fell before Lavos Spawn.</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Rewind Time Stream
          </button>
        </div>
      )}

      {gameState === 'VICTORY' && (
        <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="text-2xl font-bold text-amber-400 mb-1 tracking-tight">Time Paradox Averted!</div>
          <p className="text-sm text-slate-300 mb-4">Lavos Spawn dissolved into the temporal ether.</p>
          <button
            onClick={startGame}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg transition-colors cursor-pointer"
          >
            Next Era Epoch
          </button>
        </div>
      )}
    </div>
  );
};
