import React, { useState, useEffect, useRef, useMemo } from 'react';
import { GameCategory, PlayerStats } from '../types/game';
import { GAMES_DATA } from '../data/gamesData';
import {
  Activity,
  Gauge,
  Clock,
  Trophy,
  RotateCcw,
  Zap,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { Card } from './ui/Card';
import { ScreenBezel } from './ui/ScreenBezel';
import { Chip } from './ui/Chip';
import { Button } from './ui/Button';

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
  const [fps, setFps] = useState<number | null>(null);
  const [avgFrameTime, setAvgFrameTime] = useState<number | null>(null);
  const [jitterMs, setJitterMs] = useState<number | null>(null);
  const [manualTier, setManualTier] = useState<'auto' | HardwareTier>('auto');
  const [tableFilter, setTableFilter] = useState<'all' | 'ranked' | GameCategory>('all');
  const [confirmingReset, setConfirmingReset] = useState(false);
  // Live tier reported by window.Perf (perf-kit.js) running inside game iframes
  const [livePerfTier, setLivePerfTier] = useState<HardwareTier | null>(null);
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartColorsRef = useRef({ accent: '', success: '', muted: '' });
  const gameFrameSamplesRef = useRef<Float32Array>(new Float32Array(60));
  const gameFrameHeadRef = useRef(0);
  const gameFrameCountRef = useRef(0);
  const lastGameFrameAtRef = useRef(0);

  useEffect(() => {
    const onGameFrame = (event: Event) => {
      const detail = (event as CustomEvent<{ avgMs: number }>).detail;
      if (!detail || !Number.isFinite(detail.avgMs) || detail.avgMs <= 0 || detail.avgMs > 200) return;
      const samples = gameFrameSamplesRef.current;
      samples[gameFrameHeadRef.current] = detail.avgMs;
      gameFrameHeadRef.current = (gameFrameHeadRef.current + 1) % samples.length;
      gameFrameCountRef.current = Math.min(samples.length, gameFrameCountRef.current + 1);
      lastGameFrameAtRef.current = Date.now();
      const count = gameFrameCountRef.current;
      const values = Array.from({ length: count }, (_, index) => samples[(gameFrameHeadRef.current - count + index + samples.length) % samples.length]);
      const average = values.reduce((sum, value) => sum + value, 0) / count;
      const jitter = Math.sqrt(values.reduce((sum, value) => sum + (value - average) ** 2, 0) / count);
      setAvgFrameTime(Number(average.toFixed(1)));
      setFps(Math.min(240, Math.round(1000 / average)));
      setJitterMs(Number(jitter.toFixed(2)));
    };
    window.addEventListener('apex:game-frame', onGameFrame);
    const staleTimer = window.setInterval(() => {
      if (lastGameFrameAtRef.current && Date.now() - lastGameFrameAtRef.current > 2500) {
        lastGameFrameAtRef.current = 0;
        gameFrameCountRef.current = 0;
        gameFrameHeadRef.current = 0;
        gameFrameSamplesRef.current.fill(0);
        setFps(null);
        setAvgFrameTime(null);
        setJitterMs(null);
      }
    }, 1000);
    return () => {
      window.removeEventListener('apex:game-frame', onGameFrame);
      window.clearInterval(staleTimer);
    };
  }, []);

  // Hardware Profiler
  const detectedProfile = useMemo<HardwareProfile>(() => {
    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 2 : 2;
    const memoryGb = typeof navigator !== 'undefined' ? (navigator as unknown as { deviceMemory?: number }).deviceMemory || 0 : 0;
    const coarse = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    const isMobile = typeof window !== 'undefined' && (coarse || navigator.maxTouchPoints > 1 && window.innerWidth < 900);

    // Priority: livePerfTier from perf-kit.js > manualTier > auto-detect
    let computedTier: HardwareTier = 'standard';
    if (livePerfTier && manualTier === 'auto') {
      computedTier = livePerfTier;
    } else if (manualTier !== 'auto') {
      computedTier = manualTier;
    } else {
      if (isMobile || cores <= 2 || (memoryGb > 0 && memoryGb <= 2)) {
        computedTier = 'lite';
      } else if (cores >= 8 && (memoryGb === 0 || memoryGb >= 8)) {
        computedTier = 'ultra';
      } else if (cores >= 4 && (memoryGb === 0 || memoryGb >= 4)) {
        computedTier = 'standard';
      } else {
        computedTier = 'lite';
      }
    }

    if (computedTier === 'ultra') {
      return {
        tier: 'ultra',
        label: 'Ultra Performance Tier',
        cores,
        memoryGb,
        targetFps: 60,
        particleBudget: '1,200 particles — 100% Full Fidelity',
        dprScale: Math.min(window.devicePixelRatio || 1, 2),
        modeDescription: 'Highest available DPR, particle and shadow budgets from Perf Kit',
      };
    } else if (computedTier === 'lite') {
      return {
        tier: 'lite',
        label: 'Lite Eco-Profile',
        cores,
        memoryGb,
        targetFps: 30,
        particleBudget: '200 particles — Power Optimized',
        dprScale: 1.0,
        modeDescription: 'Battery-aware DPR, particle cap and disabled shadow blur',
      };
    }

    return {
      tier: 'standard',
      label: 'Standard Balanced Profile',
      cores,
      memoryGb,
      targetFps: 60,
      particleBudget: '600 particles — Balanced',
      dprScale: Math.min(window.devicePixelRatio || 1, 1.5),
      modeDescription: 'Rock-solid 60Hz lock with adaptive GPU hardware acceleration',
    };
  }, [manualTier, livePerfTier]);

  // Listen for perf-kit tier changes from game windows
  useEffect(() => {
    const handlePerfEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.tier) {
        setLivePerfTier(detail.tier as HardwareTier);
      }
    };
    // Read current Perf.tier if perf-kit.js is loaded in this window
    if (typeof window !== 'undefined' && (window as unknown as { Perf?: { tier?: string } }).Perf?.tier) {
      const wPerf = (window as unknown as { Perf: { tier: string } }).Perf;
      if (['ultra', 'standard', 'lite'].includes(wPerf.tier)) {
        setLivePerfTier(wPerf.tier as HardwareTier);
      }
    }
    window.addEventListener('apex:perf', handlePerfEvent);
    return () => window.removeEventListener('apex:perf', handlePerfEvent);
  }, []);

  // Propagate manual tier selection to window.Perf if available
  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('apex:perf-tier-request', { detail: { tier: manualTier === 'auto' ? null : manualTier } }));
    const wPerf = (window as unknown as { Perf?: { setTier?: (t: string | null) => void } }).Perf;
    if (!wPerf || typeof wPerf.setTier !== 'function') return;
    if (manualTier === 'auto') {
      wPerf.setTier(null);
    } else {
      wPerf.setTier(manualTier);
    }
  }, [manualTier]);

  // Frame timing loop with EMA smoothing and direct Canvas waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let isVisible = false;
    const BUFFER_SIZE = 60;

    // Viewport observer ensures zero CPU usage when not looking at telemetry
    const syncThemeColors = () => {
      const styles = getComputedStyle(document.documentElement);
      chartColorsRef.current = {
        accent: styles.getPropertyValue('--accent').trim(),
        success: styles.getPropertyValue('--success').trim(),
        muted: styles.getPropertyValue('--fg-muted').trim(),
      };
    };
    syncThemeColors();

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        isVisible = entry?.isIntersecting ?? false;
        if (isVisible && !animId) {
          animId = requestAnimationFrame(tick);
        }
      },
      { rootMargin: '100px' }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    const themeObserver = new MutationObserver(() => {
      syncThemeColors();
      if (isVisible && !animId) animId = requestAnimationFrame(tick);
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    const tick = (now: number) => {
      if (!isVisible) {
        animId = 0;
        return;
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
        ctx.strokeStyle = chartColorsRef.current.accent;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, targetY);
        ctx.lineTo(cw, targetY);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // Target 8.3ms guide line (120Hz)
        const target120Y = ch - (8.33 / 35) * (ch - 24) - 12;
        ctx.strokeStyle = chartColorsRef.current.success;
        ctx.globalAlpha = 0.2;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(0, target120Y);
        ctx.lineTo(cw, target120Y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        // The animation loop only paints the dashboard. Plot values come from
        // Perf.tick reports forwarded from the currently mounted game iframe.
        const sampleCount = gameFrameCountRef.current;
        if (sampleCount > 0) {
          const samples = gameFrameSamplesRef.current;
          const sampleHead = gameFrameHeadRef.current;
          ctx.beginPath();
          for (let i = 0; i < sampleCount; i++) {
            const idx = (sampleHead - sampleCount + i + BUFFER_SIZE) % BUFFER_SIZE;
            const val = samples[idx];
            const x = (i / Math.max(1, sampleCount - 1)) * cw;
            const y = ch - (Math.min(val, 35) / 35) * (ch - 24) - 12;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.strokeStyle = chartColorsRef.current.accent;
          ctx.lineWidth = 2;
          ctx.lineJoin = 'round';
          ctx.stroke();
        } else {
          ctx.fillStyle = chartColorsRef.current.muted;
          ctx.font = '11px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('Waiting for game frame telemetry', cw / 2, ch / 2);
        }
      }

      animId = requestAnimationFrame(tick);
    };

    return () => {
      observer.disconnect();
      themeObserver.disconnect();
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
      return { title: 'Apex Grandmaster', progress: 100, color: 'text-warning', nextTier: 'Max Rank' };
    }
    if (totalAccumulatedScore > 1500 || totalSessions >= 12) {
      return { title: 'Retro Veteran', progress: 75, color: 'text-accent', nextTier: 'Grandmaster at 5,000 pts' };
    }
    if (totalAccumulatedScore > 300 || totalSessions >= 4) {
      return { title: 'Challenger', progress: 45, color: 'text-success', nextTier: 'Veteran at 1,500 pts' };
    }
    return { title: 'Novice Cadet', progress: Math.min(30, totalSessions * 10), color: 'text-fg', nextTier: 'Challenger at 300 pts' };
  }, [totalAccumulatedScore, totalSessions]);

  const playedGameIds = new Set([
    ...Object.keys(scores).filter((id) => (scores[id] || 0) > 0),
    ...(stats?.recentSessions || []).map((session) => session.gameId),
  ]);
  const achievementCount = Object.values(stats?.achievements || {}).reduce((total, ids) => total + ids.length, 0);
  const completedLevels = Object.values(stats?.levelProgress || {}).reduce((total, level) => total + Math.max(0, level || 0), 0);
  const realProgress = [
    { label: 'Games played', value: playedGameIds.size, detail: `of ${GAMES_DATA.length}` },
    { label: 'Best scores', value: Object.keys(scores).filter((id) => (scores[id] || 0) > 0).length, detail: 'recorded games' },
    { label: 'Achievements', value: achievementCount, detail: 'unlocked' },
    { label: 'Levels cleared', value: completedLevels, detail: 'recorded progress' },
  ];

  const catalogRecords = GAMES_DATA.map((game) => ({ id: game.id, title: game.title, cat: game.category }));

  const filteredRecords = catalogRecords.filter((rec) => {
    const s = scores[rec.id] || 0;
    if (tableFilter === 'ranked') return s > 0;
    if (tableFilter !== 'all') return rec.cat === tableFilter;
    return true;
  });

  return (
    <section ref={sectionRef} id="telemetry" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 scroll-mt-20">
      {/* Header with Hardware Auto-Tiering & Manual Override */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-accent uppercase tracking-wider mb-2">
            <Activity className="w-4 h-4" />
            <span>Interactive Telemetry &amp; Progression Engine</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
            Performance Engine &amp; Progression Metrics
          </h2>
          <p className="text-sm text-fg-muted mt-1 max-w-2xl">
            Real-time sub-millisecond frame intervals, hardware auto-tiering, and client-side high-score progression tracked dynamically with zero server overhead.
          </p>
        </div>

        {/* Hardware Auto-Tiering Badge & Mode Selector */}
        <Card className="p-3.5 shrink-0 self-start lg:self-auto flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-accent" />
              <span className="text-xs font-bold text-fg tracking-tight font-mono">{detectedProfile.label}</span>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase ${
                detectedProfile.tier === 'ultra'
                  ? 'bg-accent-soft text-accent border border-accent/30'
                  : detectedProfile.tier === 'lite'
                  ? 'bg-warning/10 text-warning border border-warning/30'
                  : 'bg-success/10 text-success border border-success/30'
              }`}
            >
              {detectedProfile.tier}
            </span>
          </div>

          <div className="text-[11px] text-fg-muted font-mono flex items-center gap-2">
            <span>{detectedProfile.cores} Cores</span>
            <span>·</span>
            <span>{detectedProfile.memoryGb}GB RAM</span>
            <span>·</span>
            <span>{detectedProfile.particleBudget}</span>
          </div>

          {/* User selectable hardware tier preset */}
          <div className="flex items-center gap-1 pt-1.5 border-t border-line">
            <Sliders className="w-3 h-3 text-fg-muted mr-1" />
            <span className="text-[10px] text-fg-muted mr-1">Profile:</span>
            {(['auto', 'lite', 'standard', 'ultra'] as const).map((t) => (
              <Chip
                key={t}
                selected={manualTier === t}
                onClick={() => setManualTier(t)}
                className="rounded-lg px-2 py-1 text-[10px] font-mono uppercase"
              >
                {t.toUpperCase()}
              </Chip>
            ))}
          </div>
        </Card>
      </div>

      {/* Top 4 Real-time Metric Cards (Responsive Grid 1-2-4 cols) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {/* Card 1: Display FPS */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-line-strong transition-colors">
          <div className="flex items-center justify-between text-fg-muted text-xs mb-3">
            <span>Client Display FPS</span>
            <Gauge className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-fg tabular-nums">{fps ?? '—'}</span>
            <span className="text-xs text-fg-muted font-mono">game FPS</span>
          </div>
          <div className="mt-2 text-[11px] text-accent font-mono flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{fps === null ? 'Open a game with performance reporting' : 'Reported by the active game loop'}</span>
          </div>
        </Card>

        {/* Card 2: Average Frame Interval & Jitter */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-line-strong transition-colors">
          <div className="flex items-center justify-between text-fg-muted text-xs mb-3">
            <span>Avg Frame Interval</span>
            <Zap className="w-4 h-4 text-success" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-fg tabular-nums">{avgFrameTime ?? '—'}</span>
            <span className="text-xs text-fg-muted font-mono">ms</span>
          </div>
          <div className="mt-2 text-[11px] text-success font-mono flex items-center justify-between">
            <span>Game loop interval</span>
            <span className="text-fg-muted text-[10px]">{jitterMs === null ? '— jitter' : `±${jitterMs}ms jitter`}</span>
          </div>
        </Card>

        {/* Card 3: Total Play Sessions */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-line-strong transition-colors">
          <div className="flex items-center justify-between text-fg-muted text-xs mb-3">
            <span>Total Play Sessions</span>
            <Trophy className="w-4 h-4 text-warning" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-fg tabular-nums">{totalSessions}</span>
            <span className="text-xs text-fg-muted">runs</span>
          </div>
          <div className="mt-2 text-[11px] text-fg-muted flex items-center justify-between">
            <span>{GAMES_DATA.length} playable titles</span>
            <span className="text-warning font-mono">{totalAccumulatedScore.toLocaleString()} pts</span>
          </div>
        </Card>

        {/* Card 4: Arcade Dwell Time */}
        <Card className="p-4 sm:p-5 flex flex-col justify-between hover:border-line-strong transition-colors">
          <div className="flex items-center justify-between text-fg-muted text-xs mb-3">
            <span>Arcade Dwell Time</span>
            <Clock className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-mono font-bold text-fg tabular-nums">
              {formatTime(stats?.totalTimeSeconds || 0)}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-fg-muted font-mono">
            Persistent local session
          </div>
        </Card>
      </div>

      {/* Real-time frame timing and recorded progression only */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Real-Time Frame-Time Waveform Graph (Driven by Canvas, Zero Thrash) */}
        <Card className="lg:col-span-2 p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-sm font-bold text-fg tracking-tight flex items-center gap-2">
                <span>Game Frame Interval</span>
                <span className={`h-2 w-2 rounded-full ${fps === null ? 'bg-fg-subtle' : 'animate-pulse bg-accent'}`} />
              </h3>
              <p className="text-xs text-fg-muted">
                Rolling frame time samples reported by the active game loop
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono">
              <span className="text-accent bg-accent-soft px-2.5 py-1 rounded-md border border-accent/30">
                60Hz Vsync: 16.6ms
              </span>
              <span className="text-success bg-success/10 px-2.5 py-1 rounded-md border border-success/30 hidden sm:inline">
                120Hz Pro: 8.3ms
              </span>
            </div>
          </div>

          <ScreenBezel framed={false} className="relative w-full h-[140px] rounded-xl border border-line overflow-hidden flex items-center justify-center p-2">
            <canvas
              ref={canvasRef}
              className="w-full h-full block"
            />
          </ScreenBezel>

          <div className="flex flex-wrap items-center justify-between text-[11px] text-fg-muted font-mono mt-3 gap-2">
            <span>T-60 Rolling Samples</span>
          <span>{jitterMs === null ? 'Jitter: —' : `Jitter: ±${jitterMs}ms`}</span>
          <span className="text-accent font-semibold">{avgFrameTime === null ? 'No game sample' : `${avgFrameTime} ms / frame`}</span>
          </div>
        </Card>

        {/* Progression summary — no inferred score floors or synthetic radar values */}
        <Card className="p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-fg tracking-tight flex items-center gap-2">
                <Trophy className="w-4 h-4 text-accent" />
                <span>Recorded Progression</span>
              </h3>
              <span className={`text-xs font-mono font-bold ${playerRank.color}`}>
                {playerRank.title}
              </span>
            </div>
            <p className="text-xs text-fg-muted mb-3">
              Only locally saved plays, scores, achievements, and level progress appear here.
            </p>

            {/* Rank Progress Bar */}
            <div className="w-full bg-surface-2 rounded-full h-2 mb-2 overflow-hidden border border-line">
              <div
                className="bg-accent h-full rounded-full transition-all duration-500"
                style={{ width: `${playerRank.progress}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-fg-muted font-mono mb-2">
              <span>{playerRank.title}</span>
              <span>{playerRank.nextTier}</span>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            {realProgress.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-line bg-surface-2 p-3">
                <div className="font-mono text-xl font-bold tabular-nums text-fg">{metric.value}</div>
                <div className="mt-1 text-[11px] font-medium text-fg">{metric.label}</div>
                <div className="text-[10px] text-fg-muted">{metric.detail}</div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* High Scores & History Table with Category Filters (Responsive) */}
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-bold text-fg tracking-tight flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              <span>Local High Scores &amp; Session Records</span>
            </h3>
            <p className="text-xs text-fg-muted">
              Preserved in your browser via localStorage with zero cloud telemetry
            </p>
          </div>

          {/* Table filter tabs + Reset button */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex flex-wrap items-center gap-1 p-1 bg-surface-2 rounded-xl border border-line text-xs">
              {(['all', 'ranked', 'arcade', 'board', 'sports', 'puzzle', 'cards'] as const).map((filterKey) => (
                <Chip
                  key={filterKey}
                  selected={tableFilter === filterKey}
                  onClick={() => setTableFilter(filterKey)}
                  className="rounded-lg px-3 py-1.5 text-xs capitalize"
                >
                  {filterKey}
                </Chip>
              ))}
            </div>

            {confirmingReset ? <div role="group" aria-label="Confirm save reset" className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-2 py-1">
              <span className="text-[10px] text-danger">Erase local stats?</span>
              <button onClick={() => { onStatsReset(); setConfirmingReset(false); }} className="min-h-11 rounded-lg bg-danger px-2.5 py-1 text-[11px] font-bold text-accent-fg hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-bg">Confirm</button>
              <Button variant="ghost" onClick={() => setConfirmingReset(false)} className="min-h-11 rounded-lg px-2 py-1 text-[11px]">Cancel</Button>
            </div> : <button
              onClick={() => setConfirmingReset(true)}
              className="flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 py-1.5 text-xs text-fg-muted transition-colors hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>}
          </div>
        </div>

        <div className="overflow-x-auto -mx-5 px-5 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-line text-fg-muted font-mono">
                <th className="py-2.5 px-3">Title &amp; Engine</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Personal Best</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {filteredRecords.map((item) => {
                const score = scores[item.id] || 0;
                return (
                  <tr key={item.id} className="transition-colors hover:bg-surface-2">
                    <td className="py-3 px-3 font-medium text-fg flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span>{item.title}</span>
                    </td>
                    <td className="py-3 px-3 text-fg-muted uppercase font-mono text-[10px]">
                      {item.cat}
                    </td>
                    <td className="py-3 px-3 font-mono text-accent font-bold tabular-nums">
                      {score > 0 ? score.toLocaleString() : '—'}
                    </td>
                    <td className="py-3 px-3 text-fg-muted">
                      {score > 0 ? (
                        <span className="text-success font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Ranked</span>
                        </span>
                      ) : (
                        <span className="text-fg-muted">Unplayed</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        data-ui-open
                        onClick={() => onSelectGame(item.id)}
                        className="px-3 py-1.5 text-[11px] font-semibold text-accent hover:text-fg bg-accent-soft hover:bg-surface border border-accent/30 rounded-lg transition-colors cursor-pointer min-h-11 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
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
      </Card>
    </section>
  );
};
