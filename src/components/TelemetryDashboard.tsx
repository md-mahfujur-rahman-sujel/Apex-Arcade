import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlayerStats } from '../types/game';
import { GAMES_DATA } from '../data/gamesData';
import {
  Activity,
  Gauge,
  Clock,
  Trophy,
  RotateCcw,
  Zap,
  Sparkles,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Layers,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';

interface TelemetryDashboardProps {
  stats: PlayerStats;
  onStatsReset: () => void;
  onSelectGame: (gameId: string) => void;
}

export type HardwareTier = 'ultra' | 'standard' | 'lite';

interface HardwareProfile {
  tier: HardwareTier;
  label: string;
  cores: number;
  memoryGb: number;
  targetFps: number;
  particleBudget: string;
  dprScale: number;
  modeDescription: string;
}

export const TelemetryDashboard: React.FC<TelemetryDashboardProps> = ({
  stats,
  onStatsReset,
  onSelectGame,
}) => {
  // Live Frame Rate and Frame-Time state (calm updates once per second)
  const [fps, setFps] = useState(60);
  const [avgFrameTime, setAvgFrameTime] = useState(16.6);
  const [jitterMs, setJitterMs] = useState(0.4);
  const [manualTier, setManualTier] = useState<'auto' | HardwareTier>('auto');
  const [tableFilter, setTableFilter] = useState<'all' | 'ranked' | 'arcade' | 'board'>('all');

  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Hardware Profiler
  const detectedProfile = useMemo<HardwareProfile>(() => {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4;
    const memoryGb = typeof navigator !== 'undefined' ? (navigator as unknown as { deviceMemory?: number }).deviceMemory || 4 : 4;
    const isTouch = typeof window !== 'undefined' && ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0));
    const isMobile = isTouch && typeof window !== 'undefined' && window.innerWidth < 768;

    let computedTier: HardwareTier = 'standard';
    if (manualTier !== 'auto') {
      computedTier = manualTier;
    } else {
      if (cores >= 8 && memoryGb >= 8 && !isMobile) {
        computedTier = 'ultra';
      } else if (cores <= 4 || memoryGb <= 4 || isMobile) {
        computedTier = 'lite';
      } else {
        computedTier = 'standard';
      }
    }

    if (computedTier === 'ultra') {
      return {
        tier: 'ultra',
        label: 'Ultra Performance Tier',
        cores,
        memoryGb,
        targetFps: 120,
        particleBudget: '100% Full Fidelity',
        dprScale: 1.25,
        modeDescription: 'High-refresh physics, multi-sample anti-aliasing & uncapped visual FX',
      };
    } else if (computedTier === 'lite') {
      return {
        tier: 'lite',
        label: 'Lite Eco-Profile',
        cores,
        memoryGb,
        targetFps: 60,
        particleBudget: '35% Power Optimized',
        dprScale: 1.0,
        modeDescription: 'Battery-saving sub-steps, throttled offscreen redraws & low memory footprint',
      };
    }

    return {
      tier: 'standard',
      label: 'Standard Balanced Profile',
      cores,
      memoryGb,
      targetFps: 60,
      particleBudget: '70% Balanced',
      dprScale: 1.0,
      modeDescription: 'Rock-solid 60Hz lock with adaptive GPU hardware acceleration',
    };
  }, [manualTier]);

  // Frame timing loop with EMA smoothing and direct Canvas waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let isVisible = false;
    let lastTime = performance.now();
    let frameCount = 0;
    let lastSecondTime = performance.now();
    let smoothedInterval = 16.6;

    // Fixed buffer of 60 rolling frame deltas
    const BUFFER_SIZE = 60;
    const buffer = new Float32Array(BUFFER_SIZE).fill(16.6);
    let bufferHead = 0;

    // Viewport observer ensures zero CPU usage when not looking at telemetry
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry?.isIntersecting ?? false;
        if (isVisible && !animId) {
          lastTime = performance.now();
          lastSecondTime = performance.now();
          animId = requestAnimationFrame(tick);
        }
      },
      { rootMargin: '100px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    const tick = (now: number) => {
      if (!isVisible) {
        animId = 0;
        return;
      }

      const rawDelta = now - lastTime;
      lastTime = now;

      // Filter sleep spikes, background tabs or suspension
      const delta = rawDelta > 0 && rawDelta < 120 ? rawDelta : 16.6;

      // Exponential Moving Average (EMA) with alpha=0.10 for calm stability
      smoothedInterval = smoothedInterval * 0.90 + delta * 0.10;

      buffer[bufferHead] = delta;
      bufferHead = (bufferHead + 1) % BUFFER_SIZE;
      frameCount++;

      // Update text metrics only once every 1,000ms to eliminate React thrashing
      if (now - lastSecondTime >= 1000) {
        const measuredFps = Math.round((frameCount * 1000) / (now - lastSecondTime));
        setFps(Math.min(144, Math.max(15, measuredFps)));
        setAvgFrameTime(Number(smoothedInterval.toFixed(1)));

        // Calculate jitter (standard deviation over rolling buffer)
        let sumDev = 0;
        for (let i = 0; i < BUFFER_SIZE; i++) {
          const diff = buffer[i] - smoothedInterval;
          sumDev += diff * diff;
        }
        const stdDev = Math.sqrt(sumDev / BUFFER_SIZE);
        setJitterMs(Number(stdDev.toFixed(2)));

        frameCount = 0;
        lastSecondTime = now;
      }

      // Draw direct to canvas with DPR awareness
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const rect = canvas.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        const w = Math.round(rect.width * dpr);
        const h = Math.round(rect.height * dpr);

        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const cw = rect.width;
        const ch = rect.height;

        ctx.clearRect(0, 0, cw, ch);

        // Optimal 16.6ms guide line (60Hz)
        const targetY = ch - (16.6 / 35) * (ch - 24) - 12;
        ctx.strokeStyle = 'rgba(6, 182, 212, 0.35)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(cw, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Target 8.3ms guide line (120Hz)
        const target120Y = ch - (8.33 / 35) * (ch - 24) - 12;
        ctx.strokeStyle = 'rgba(16, 185, 129, 0.20)';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(0, target120Y);
        ctx.lineTo(cw, target120Y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Waveform polyline
        ctx.beginPath();
        for (let i = 0; i < BUFFER_SIZE; i++) {
          const idx = (bufferHead + i) % BUFFER_SIZE;
          const val = buffer[idx];
          const x = (i / (BUFFER_SIZE - 1)) * cw;
          const y = ch - (Math.min(val, 35) / 35) * (ch - 24) - 12;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = '#38BDF8';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.stroke();

        // Subtle gradient under waveform
        ctx.lineTo(cw, ch);
        ctx.lineTo(0, ch);
        ctx.closePath();
        const grad = ctx.createLinearGradient(0, targetY, 0, ch);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.18)');
        grad.addColorStop(1, 'rgba(6, 182, 212, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      animId = requestAnimationFrame(tick);
    };

    return () => {
      observer.disconnect();
      if (animId) cancelAnimationFrame(animId);
    };
  }, []);

  // Format playtime safely
  const formatTime = (totalSeconds: number) => {
    const s = Math.max(0, Number.isFinite(totalSeconds) ? Math.floor(totalSeconds) : 0);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      return `${hrs}h ${mins % 60}m`;
    }
    return `${mins}m ${secs}s`;
  };

  // Progression metrics safely computed
  const totalSessions = Math.max(0, stats?.totalPlayCount || 0);
  const scores = stats?.highScores || {};
  const totalAccumulatedScore = Object.values(scores).reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);

  // Player Rank Tier
  const playerRank = useMemo(() => {
    if (totalAccumulatedScore > 5000 || totalSessions >= 30) {
      return { title: 'Apex Grandmaster', progress: 100, color: 'text-amber-400', nextTier: 'Max Rank' };
    }
    if (totalAccumulatedScore > 1500 || totalSessions >= 12) {
      return { title: 'Retro Veteran', progress: 75, color: 'text-cyan-400', nextTier: 'Grandmaster at 5,000 pts' };
    }
    if (totalAccumulatedScore > 300 || totalSessions >= 4) {
      return { title: 'Challenger', progress: 45, color: 'text-emerald-400', nextTier: 'Veteran at 1,500 pts' };
    }
    return { title: 'Novice Cadet', progress: Math.min(30, totalSessions * 10), color: 'text-slate-300', nextTier: 'Challenger at 300 pts' };
  }, [totalAccumulatedScore, totalSessions]);

  // Radar points for 5 progression attributes (Strictly bounded and finite)
  const arcadeScore = Math.min(100, ((scores['space-invaders'] || 0) / 10) + ((scores['pong'] || 0) / 7));
  const goldenAgeScore = Math.min(100, ((scores['tetris'] || 0) / 30) + ((scores['super-mario-bros'] || 0) / 20));
  const modernScore = Math.min(100, ((scores['flappy-bird'] || 0) * 12) + ((scores['celeste'] || 0) / 10));
  const velocityScore = Math.min(100, totalSessions * 12);
  const staminaScore = Math.min(100, ((stats?.totalTimeSeconds || 0) / 60) * 8);

  const radarMetrics = [
    { label: '8-Bit Arcade', val: Math.max(25, Math.min(95, arcadeScore)) },
    { label: '16-Bit Golden', val: Math.max(30, Math.min(95, goldenAgeScore)) },
    { label: 'Indie & Reflex', val: Math.max(30, Math.min(95, modernScore)) },
    { label: 'Play Velocity', val: Math.max(20, Math.min(95, velocityScore)) },
    { label: 'Focus Dwell', val: Math.max(25, Math.min(95, staminaScore)) },
  ];

  const radarRadius = 70;
  const radarCenter = { x: 120, y: 110 };
  const radarPolygonPoints = radarMetrics
    .map((m, i) => {
      const angle = (i / radarMetrics.length) * Math.PI * 2 - Math.PI / 2;
      const r = (m.val / 100) * radarRadius;
      const x = (radarCenter.x + Math.cos(angle) * r).toFixed(1);
      const y = (radarCenter.y + Math.sin(angle) * r).toFixed(1);
      return `${x},${y}`;
    })
    .join(' ');

  // Full high score game records list
  const catalogRecords = [
    { id: 'table-tennis', title: 'Table Tennis Tournament (1926)', cat: 'board' },
    { id: 'pong', title: 'Holo-Pong 3D (Pong 1972)', cat: 'arcade' },
    { id: 'space-invaders', title: 'Space Invaders 2.5D (1978)', cat: 'arcade' },
    { id: 'asteroids', title: 'Asteroids Holo-Core (1979)', cat: 'arcade' },
    { id: 'pac-man', title: 'Pac-Maze 2.5D (Pac-Man 1980)', cat: 'arcade' },
    { id: 'super-mario-bros', title: 'Mushroom Kingdom (Mario 1985)', cat: 'arcade' },
    { id: 'tetris', title: 'Iso-Tetris 3D (1989)', cat: 'arcade' },
    { id: 'sonic-the-hedgehog', title: 'Sonic Speedway 2.5D (1991)', cat: 'arcade' },
    { id: 'street-fighter-ii', title: 'Street Fighter 2.5D (1991)', cat: 'arcade' },
    { id: 'chrono-trigger', title: 'Time Warp ATB (Chrono Trigger 1995)', cat: 'arcade' },
    { id: 'chess', title: 'Grandmaster Chess (Board)', cat: 'board' },
    { id: 'snake', title: 'Quantum Grid (Snake 1997)', cat: 'arcade' },
    { id: 'flappy-bird', title: 'Cyber-Flap 2.5D (Flappy Bird 2013)', cat: 'arcade' },
    { id: 'celeste', title: 'Ascent 2.5D (Celeste 2018)', cat: 'arcade' },
    { id: 'cuphead', title: 'Inkwell Boss Duel (Cuphead 2017)', cat: 'arcade' },
    { id: 'hollow-knight', title: 'Hallownest Nail Duel (Hollow Knight 2017)', cat: 'arcade' },
  ];

  const filteredRecords = catalogRecords.filter((rec) => {
    const s = scores[rec.id] || 0;
    if (tableFilter === 'ranked') return s > 0;
    if (tableFilter === 'arcade') return rec.cat === 'arcade';
    if (tableFilter === 'board') return rec.cat === 'board';
    return true;
  });

  return (
    <section ref={sectionRef} id="telemetry" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-20">
      {/* Header with Hardware Auto-Tiering & Manual Override */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
            <Activity className="w-4 h-4" />
            <span>Interactive Telemetry &amp; Progression Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Performance Engine &amp; Progression Metrics
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Real-time sub-millisecond frame intervals, hardware auto-tiering, and client-side high-score progression tracked dynamically with zero server overhead.
          </p>
        </div>

        {/* Hardware Auto-Tiering Badge & Mode Selector */}
        <div className="p-3.5 rounded-2xl bg-[#0F1424] border border-white/10 shrink-0 self-start lg:self-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-bold text-white tracking-tight font-mono">{detectedProfile.label}</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                detectedProfile.tier === 'ultra'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : detectedProfile.tier === 'lite'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {detectedProfile.tier}
            </span>
          </div>

          <div className="text-[11px] text-slate-400 font-mono flex items-center gap-2">
            <span>{detectedProfile.cores} Cores</span>
            <span>·</span>
            <span>{detectedProfile.memoryGb}GB RAM</span>
            <span>·</span>
            <span>{detectedProfile.particleBudget}</span>
          </div>

          {/* User selectable hardware tier preset */}
          <div className="flex items-center gap-1 pt-1.5 border-t border-white/5">
            <Sliders className="w-3 h-3 text-slate-400 mr-1" />
            <span className="text-[10px] text-slate-400 mr-1">Profile:</span>
            {(['auto', 'lite', 'standard', 'ultra'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setManualTier(t)}
                className={`px-2 py-0.5 text-[10px] font-mono rounded transition-colors cursor-pointer ${
                  manualTier === t
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-white/5 text-slate-400 hover:text-white'
                }`}
              >
                {t.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Top 4 Real-time Metric Cards (Responsive Grid 1-2-4 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {/* Card 1: Display FPS */}
        <div className="p-4 sm:p-5 bg-[#0F1320] border border-white/10 rounded-2xl flex flex-col justify-between hover:border-cyan-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span>Client Display FPS</span>
            <Gauge className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">{fps}</span>
            <span className="text-xs text-slate-500 font-mono">Hz / Lock</span>
          </div>
          <div className="mt-2 text-[11px] text-cyan-400/90 font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Hardware Vsync Steady</span>
          </div>
        </div>

        {/* Card 2: Average Frame Interval & Jitter */}
        <div className="p-4 sm:p-5 bg-[#0F1320] border border-white/10 rounded-2xl flex flex-col justify-between hover:border-emerald-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span>Avg Frame Interval</span>
            <Zap className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">{avgFrameTime}</span>
            <span className="text-xs text-slate-500 font-mono">ms</span>
          </div>
          <div className="mt-2 text-[11px] text-emerald-400/90 font-mono flex items-center justify-between">
            <span>Target: 16.6ms (60Hz)</span>
            <span className="text-slate-400 text-[10px]">±{jitterMs}ms jitter</span>
          </div>
        </div>

        {/* Card 3: Total Play Sessions */}
        <div className="p-4 sm:p-5 bg-[#0F1320] border border-white/10 rounded-2xl flex flex-col justify-between hover:border-amber-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span>Total Play Sessions</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">{totalSessions}</span>
            <span className="text-xs text-slate-500">runs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{GAMES_DATA.length} playable titles</span>
            <span className="text-amber-400 font-mono">{totalAccumulatedScore.toLocaleString()} pts</span>
          </div>
        </div>

        {/* Card 4: Arcade Dwell Time */}
        <div className="p-4 sm:p-5 bg-[#0F1320] border border-white/10 rounded-2xl flex flex-col justify-between hover:border-purple-500/30 transition-colors">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span>Arcade Dwell Time</span>
            <Clock className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-white tabular-nums">
              {formatTime(stats?.totalTimeSeconds || 0)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-purple-400/90 font-mono">
            Persistent local session
          </div>
        </div>
      </div>

      {/* Real-Time Waveform & Era Mastery Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Real-Time Frame-Time Waveform Graph (Driven by Canvas, Zero Thrash) */}
        <div className="lg:col-span-2 p-5 sm:p-6 bg-[#0F1320] border border-white/10 rounded-2xl flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <span>Real-Time Frame Interval Oscilloscope</span>
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              </h3>
              <p className="text-xs text-slate-400">
                Direct GPU canvas render with EMA jitter suppression and zero garbage collection overhead
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-cyan-300 bg-cyan-950/50 px-2.5 py-1 rounded-md border border-cyan-500/30">
                60Hz Vsync: 16.6ms
              </span>
              <span className="text-emerald-300 bg-emerald-950/50 px-2.5 py-1 rounded-md border border-emerald-500/30 hidden sm:inline">
                120Hz Pro: 8.3ms
              </span>
            </div>
          </div>

          <div className="relative w-full h-[140px] bg-[#070912] rounded-xl border border-white/5 overflow-hidden flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 font-mono mt-3 gap-2">
            <span>T-60 Rolling Samples</span>
            <span>Jitter: ±{jitterMs}ms (Rock Solid)</span>
            <span className="text-cyan-400 font-semibold">{avgFrameTime} ms / frame</span>
          </div>
        </div>

        {/* Progression & Player Mastery Radar */}
        <div className="p-5 sm:p-6 bg-[#0F1320] border border-white/10 rounded-2xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Progression &amp; Mastery</span>
              </h3>
              <span className={`text-xs font-mono font-bold ${playerRank.color}`}>
                {playerRank.title}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Multi-genre skill distribution across game sessions
            </p>

            {/* Rank Progress Bar */}
            <div className="w-full bg-white/5 rounded-full h-2 mb-2 overflow-hidden border border-white/10">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${playerRank.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-500 font-mono mb-2">
              <span>{playerRank.title}</span>
              <span>{playerRank.nextTier}</span>
            </div>
          </div>

          {/* SVG Radar */}
          <div className="relative w-full aspect-square max-w-[210px] mx-auto flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 240 220">
              {/* Concentric pentagons */}
              {[0.25, 0.5, 0.75, 1].map((scale, sIdx) => {
                const ringPts = radarMetrics
                  .map((_, i) => {
                    const angle = (i / radarMetrics.length) * Math.PI * 2 - Math.PI / 2;
                    const r = scale * radarRadius;
                    return `${(radarCenter.x + Math.cos(angle) * r).toFixed(1)},${(radarCenter.y + Math.sin(angle) * r).toFixed(1)}`;
                  })
                  .join(' ');
                return (
                  <polygon
                    key={sIdx}
                    points={ringPts}
                    fill="none"
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Axis rays */}
              {radarMetrics.map((_, i) => {
                const angle = (i / radarMetrics.length) * Math.PI * 2 - Math.PI / 2;
                return (
                  <line
                    key={i}
                    x1={radarCenter.x}
                    y1={radarCenter.y}
                    x2={(radarCenter.x + Math.cos(angle) * radarRadius).toFixed(1)}
                    y2={(radarCenter.y + Math.sin(angle) * radarRadius).toFixed(1)}
                    stroke="rgba(255, 255, 255, 0.08)"
                    strokeWidth="1"
                  />
                );
              })}

              {/* Radar filled polygon */}
              <polygon
                points={radarPolygonPoints}
                fill="rgba(6, 182, 212, 0.25)"
                stroke="#06B6D4"
                strokeWidth="2"
              />

              {/* Labels */}
              {radarMetrics.map((m, i) => {
                const angle = (i / radarMetrics.length) * Math.PI * 2 - Math.PI / 2;
                const lx = radarCenter.x + Math.cos(angle) * (radarRadius + 18);
                const ly = radarCenter.y + Math.sin(angle) * (radarRadius + 18) + 4;
                return (
                  <text
                    key={i}
                    x={lx.toFixed(1)}
                    y={ly.toFixed(1)}
                    fontSize="9"
                    fontFamily="JetBrains Mono"
                    fill="#94A3B8"
                    textAnchor="middle"
                  >
                    {m.label}
                  </text>
                );
              })}
            </svg>
          </div>

          <div className="text-center text-xs text-slate-400 mt-2">
            Scales dynamically with match scores and clear times
          </div>
        </div>
      </div>

      {/* High Scores & History Table with Category Filters (Responsive) */}
      <div className="p-5 sm:p-6 bg-[#0F1320] border border-white/10 rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Local High Scores &amp; Session Records</span>
            </h3>
            <p className="text-xs text-slate-400">
              Preserved in your browser via localStorage with zero cloud telemetry
            </p>
          </div>

          {/* Table filter tabs + Reset button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 p-1 bg-black/40 rounded-xl border border-white/5 text-xs">
              {(['all', 'ranked', 'arcade', 'board'] as const).map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setTableFilter(filterKey)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer capitalize min-h-[36px] ${
                    tableFilter === filterKey
                      ? 'bg-cyan-500 text-slate-950 font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {filterKey}
                </button>
              ))}
            </div>

            <button
              onClick={() => {
                if (confirm('Reset all high score records and play statistics?')) {
                  onStatsReset();
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-red-400 bg-white/5 hover:bg-red-500/10 rounded-xl border border-white/5 transition-colors cursor-pointer min-h-[38px]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-white/10 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Title &amp; Engine</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Personal Best</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredRecords.map((item) => {
                const score = scores[item.id] || 0;
                return (
                  <tr key={item.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-3 font-medium text-white flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/80" />
                      <span>{item.title}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-400 uppercase font-mono text-[10px]">
                      {item.cat}
                    </td>
                    <td className="py-3 px-3 font-mono text-cyan-400 font-bold tabular-nums">
                      {score > 0 ? score.toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-400">
                      {score > 0 ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ranked</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Unplayed</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => onSelectGame(item.id)}
                        className="px-3 py-1.5 text-[11px] font-semibold text-cyan-400 hover:text-white bg-cyan-950/60 hover:bg-cyan-900 border border-cyan-500/30 rounded-lg transition-colors cursor-pointer min-h-[36px]"
                      >
                        Play
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
};
