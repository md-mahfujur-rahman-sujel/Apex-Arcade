import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Play, Sparkles } from 'lucide-react';
import { GameInfo, PlayerStats } from '../types/game';
import { Button } from './ui/Button';
import { Card } from './ui/Card';
import { ScreenBezel } from './ui/ScreenBezel';
import { loadCardScenes } from './CardScenePreview';

interface LauncherHomeProps {
  games: GameInfo[];
  stats: PlayerStats;
  onLaunchGame: (game: GameInfo, startLevel?: number, seed?: number) => void;
  onExplore: () => void;
}

// A deliberately curated flagship set. Every title has a dedicated playable canvas engine.
const FEATURED_GAME_IDS = ['flappy-bird', 'pac-man', 'sonic-the-hedgehog', 'celeste', 'street-fighter-ii', 'tetris'];

const HOME_CATEGORIES: Array<{ id: GameInfo['category']; label: string; icon: string; accent: string }> = [
  { id: 'arcade', label: 'Arcade', icon: '🕹️', accent: '#8b5cf6' },
  { id: 'board', label: 'Board games', icon: '🎲', accent: '#10b981' },
  { id: 'sports', label: 'Sports', icon: '🏆', accent: '#f97316' },
  { id: 'puzzle', label: 'Puzzles', icon: '🧩', accent: '#0ea5e9' },
  { id: 'cards', label: 'Card games', icon: '🃏', accent: '#ec4899' },
];

export const LauncherHome: React.FC<LauncherHomeProps> = ({ games, stats, onLaunchGame, onExplore }) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroGames = useMemo(() => FEATURED_GAME_IDS.map((id) => games.find((game) => game.id === id)).filter((game): game is GameInfo => Boolean(game && game.playableEngineId)), [games]);
  const activeHero = heroGames[heroIndex % Math.max(1, heroGames.length)];
  const gameById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);
  const recentSessions = useMemo(() => {
    const seen = new Set<string>();
    return (stats.recentSessions || []).filter((session) => {
      if (!gameById.has(session.gameId) || seen.has(session.gameId)) return false;
      seen.add(session.gameId);
      return true;
    }).slice(0, 5);
  }, [stats.recentSessions, gameById]);
  const recentGameIds = useMemo(() => new Set(recentSessions.map(({ gameId }) => gameId)), [recentSessions]);
  const continueGames = useMemo(() => games.flatMap((game) => {
    const clearedLevels = Math.floor(stats.levelProgress?.[game.id] || 0);
    const maxLevel = game.levelCount || 1;
    return clearedLevels > 0 && clearedLevels < maxLevel ? [{ game, startLevel: clearedLevels + 1 }] : [];
  }), [games, stats.levelProgress]);
  const sharedRecentTags = useMemo(() => {
    const counts = new Map<string, number>();
    recentSessions.forEach(({ gameId }) => (gameById.get(gameId)?.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([tag]) => tag);
  }, [recentSessions, gameById]);
  const recommendedGames = useMemo(() => games
    .filter((game) => !recentGameIds.has(game.id) && !FEATURED_GAME_IDS.includes(game.id))
    .sort((a, b) => {
      const aMatches = (a.tags || []).filter((tag) => sharedRecentTags.includes(tag)).length;
      const bMatches = (b.tags || []).filter((tag) => sharedRecentTags.includes(tag)).length;
      return bMatches - aMatches || Number(b.status === 'enhanced') - Number(a.status === 'enhanced') || Number(b.tier === 'S') - Number(a.tier === 'S') || a.gameNumber - b.gameNumber;
    })
    .slice(0, 6), [games, recentGameIds, sharedRecentTags]);
  const categoryCards = useMemo(() => [
    ...HOME_CATEGORIES.map((category) => ({
      ...category,
      games: games.filter((game) => game.category === category.id),
    })),
    { id: 'recommended', label: 'Recommended games', icon: '✨', accent: '#22d3ee', games: recommendedGames },
  ], [games, recommendedGames]);
  useEffect(() => {
    if (heroGames.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setHeroIndex((index) => (index + 1) % heroGames.length), 7000);
    return () => window.clearInterval(timer);
  }, [heroGames.length]);

  useEffect(() => {
    const canvas = heroCanvasRef.current;
    if (!canvas || !activeHero) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const sceneWidth = 300;
    const sceneHeight = 128;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    let cssWidth = 0;
    let cssHeight = 0;
    const resize = () => {
      const bounds = canvas.getBoundingClientRect();
      const dpr = Math.min(isCoarsePointer ? 1 : 2, window.devicePixelRatio || 1);
      cssWidth = bounds.width;
      cssHeight = bounds.height;
      canvas.width = Math.max(1, Math.round(cssWidth * dpr));
      canvas.height = Math.max(1, Math.round(cssHeight * dpr));
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(canvas);
    let visible = true;
    let active = true;
    let frame = 0;
    let lastRender = 0;
    const startedAt = performance.now();
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible && !frame) frame = requestAnimationFrame(draw);
    }, { rootMargin: '100px' });
    observer.observe(canvas);

    const draw = (now: number) => {
      frame = 0;
      if (!visible || document.hidden) {
        return;
      }
      if (now - lastRender >= 33) {
        lastRender = now;
        (ctx as CanvasRenderingContext2D & { reset?: () => void }).reset?.();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        // Self-contained dark stage: scenes are authored for a dark backdrop, so the hero looks the same in every page theme.
        ctx.fillStyle = '#0b1020';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = 'rgba(148,163,184,.07)';
        ctx.lineWidth = 1;
        const gridStep = Math.max(18, Math.round(canvas.width / 24));
        ctx.beginPath();
        for (let gx = 0; gx <= canvas.width; gx += gridStep) { ctx.moveTo(gx + 0.5, 0); ctx.lineTo(gx + 0.5, canvas.height); }
        for (let gy = 0; gy <= canvas.height; gy += gridStep) { ctx.moveTo(0, gy + 0.5); ctx.lineTo(canvas.width, gy + 0.5); }
        ctx.stroke();
        // Keep each hand-authored scene's proportions intact. The hero panel is
        // taller than the scene's native ratio, so center it with breathing room
        // instead of stretching the animation to fill the panel.
        const scale = Math.min(canvas.width / sceneWidth, canvas.height / sceneHeight);
        const offsetX = (canvas.width - sceneWidth * scale) / 2;
        const offsetY = (canvas.height - sceneHeight * scale) / 2;
        ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
        ctx.imageSmoothingEnabled = true;
        const scene = window.Scenes?.S?.[activeHero.gameNumber];
        if (scene) {
          try {
            // Clip to the scene's own frame so nothing bleeds into the stage, then fade the top/bottom edges into it.
            ctx.save();
            ctx.beginPath();
            ctx.rect(0, 0, sceneWidth, sceneHeight);
            ctx.clip();
            try {
              scene(ctx, (now - startedAt) / 1000 + activeHero.gameNumber * 1.7, activeHero.accentColor);
            } finally {
              ctx.restore();
            }
            const fadeH = 22;
            const fadeTop = ctx.createLinearGradient(0, 0, 0, fadeH);
            fadeTop.addColorStop(0, '#0b1020');
            fadeTop.addColorStop(1, 'rgba(11,16,32,0)');
            const fadeBottom = ctx.createLinearGradient(0, sceneHeight - fadeH, 0, sceneHeight);
            fadeBottom.addColorStop(0, 'rgba(11,16,32,0)');
            fadeBottom.addColorStop(1, '#0b1020');
            ctx.fillStyle = fadeTop;
            ctx.fillRect(0, 0, sceneWidth, fadeH);
            ctx.fillStyle = fadeBottom;
            ctx.fillRect(0, sceneHeight - fadeH, sceneWidth, fadeH);
          } catch {
            // A missing or broken scene should not interrupt the launcher.
          }
        } else {
          const glow = ctx.createRadialGradient(sceneWidth / 2, sceneHeight / 2, 8, sceneWidth / 2, sceneHeight / 2, 120);
          glow.addColorStop(0, `${activeHero.accentColor}66`);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.fillRect(0, 0, sceneWidth, sceneHeight);
        }
      }
      if (!prefersReducedMotion) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    loadCardScenes().then(() => {
      // Reduced-motion users get a single frame; redraw it once scenes finish loading.
      if (active && !frame) frame = requestAnimationFrame(draw);
    }).catch(() => {
      // Keep the static stage if the optional preview scene script is unavailable.
    });
    return () => {
      active = false;
      observer.disconnect();
      resizeObserver.disconnect();
      if (frame) cancelAnimationFrame(frame);
    };
  }, [activeHero]);

  const shiftHero = (direction: number) => setHeroIndex((index) => (index + direction + heroGames.length) % heroGames.length);
  const sectionHeading = (title: string, caption?: string) => (
    <div className="mb-4">
      <h2 className="text-lg font-bold text-fg sm:text-xl">{title}</h2>
      {caption && <p className="mt-1 text-xs text-fg-muted">{caption}</p>}
    </div>
  );
  return (
    <section aria-label="Arcade home" className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <section aria-labelledby="home-categories-title" className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 id="home-categories-title" className="text-lg font-bold text-fg sm:text-xl">Browse categories</h2>
          </div>
          <button type="button" onClick={onExplore} className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-2 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
            All games <ArrowRight className="h-4 w-4" />
          </button>
        </div>
        <div className="-mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-6">
          {categoryCards.map((category) => (
            <button
              key={category.id}
              type="button"
              aria-label={`Browse ${category.label}, ${category.games.length} games`}
              onClick={() => {
                if (category.id === 'recommended') {
                  const params = new URLSearchParams({ ids: category.games.map((game) => game.id).join(',') });
                  window.location.hash = `#/browse?${params.toString()}`;
                } else {
                  window.location.hash = `#/browse?category=${encodeURIComponent(category.id)}`;
                }
              }}
              className="group relative h-[112px] w-[158px] shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 p-3.5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:h-[118px] sm:w-auto"
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-90" style={{ background: `linear-gradient(115deg, ${category.accent}55, ${category.accent}20 62%, #111827)` }} />
              <span aria-hidden="true" className="pointer-events-none absolute -right-3 -top-5 text-[76px] leading-none opacity-20 grayscale transition-all duration-200 group-hover:scale-110 group-hover:rotate-6 group-hover:opacity-35">{category.icon}</span>
              <span className="pointer-events-none absolute inset-x-3.5 bottom-3.5 flex items-end justify-between gap-2">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-extrabold text-white drop-shadow">{category.label}</span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-white/70">{category.games.length} games</span>
                </span>
                <ArrowRight aria-hidden="true" className="mb-0.5 h-4 w-4 shrink-0 text-white/75 transition-all group-hover:translate-x-1 group-hover:text-white" />
              </span>
            </button>
          ))}
        </div>
      </section>

      {activeHero && <Card className="grid grid-cols-1 rounded-3xl border border-white/10 bg-surface shadow-card lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="pointer-events-none absolute inset-0 opacity-30" style={{ background: `radial-gradient(ellipse at 80% 30%, ${activeHero.accentColor}30, transparent 50%)` }} />
        <div className="relative z-10 flex min-w-0 flex-col justify-center p-6 sm:p-9 lg:p-12">
          <div className="mb-4 flex items-center gap-2 text-[10px] font-mono uppercase tracking-[.2em] text-accent"><Sparkles className="h-3.5 w-3.5" /> Apex Arcade · {games.length} games</div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-fg-muted">Featured game {String(heroIndex + 1).padStart(2, '0')} / {String(heroGames.length).padStart(2, '0')}</div>
          <h1 className="text-3xl font-black leading-tight text-fg sm:text-5xl">{activeHero.title}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-fg-muted sm:text-base">{activeHero.tagline}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button data-ui-open onClick={() => onLaunchGame(activeHero)} className="px-5"><Play className="h-4 w-4 fill-current" /> Play now</Button>
            <Button variant="secondary" onClick={onExplore} className="px-5">Explore games <ArrowRight className="h-4 w-4" /></Button>
          </div>
          <div className="mt-7 flex flex-wrap items-center gap-2" role="group" aria-label="Featured games">
            <div className="flex items-center gap-1">
              {heroGames.map((game, index) => <button key={game.id} onClick={() => setHeroIndex(index)} aria-label={`Show ${game.title}`} aria-pressed={index === heroIndex} className="group grid h-11 w-11 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"><span aria-hidden="true" className={`h-1.5 rounded-full transition-all ${index === heroIndex ? 'w-8 bg-accent' : 'w-3 bg-line-strong group-hover:bg-fg-muted'}`} /></button>)}
            </div>
            <div className="ml-auto flex shrink-0 items-center gap-2">
              <button onClick={() => shiftHero(-1)} aria-label="Previous featured game" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-fg-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => shiftHero(1)} aria-label="Next featured game" className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-fg-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <ScreenBezel data-hero-stage className="min-w-0 min-h-[210px] border-t border-white/5 lg:min-h-[350px] lg:border-l lg:border-t-0">
          <canvas ref={heroCanvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          {/* The dark stage is painted on the canvas itself, so no theme-dependent overlay is needed. */}
          <div data-hero-badge className="absolute bottom-4 left-4 rounded-full border border-line bg-card/90 px-3 py-1.5 text-xs text-fg backdrop-blur">{activeHero.icon} {activeHero.of}</div>
        </ScreenBezel>
      </Card>}

      {continueGames.length > 0 && <section aria-label="Continue playing">
        {sectionHeading('Continue playing', 'Pick up at your next unlocked level')}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {continueGames.map(({ game, startLevel }) => <Card key={game.id} interactive data-recommendation-card className="group min-h-[104px] bg-card p-4 hover:bg-surface-2">
            <button type="button" data-ui-open aria-label={`Continue ${game.title} at level ${startLevel}`} onClick={() => onLaunchGame(game, startLevel)} className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" />
            <div aria-hidden="true" className="pointer-events-none relative flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${game.accentColor}22` }}>{game.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-fg">{game.title}</span><span className="mt-1 block text-[11px] text-fg-muted">Continue at level {startLevel}</span></span><Play className="h-4 w-4 shrink-0 text-accent" /></div>
          </Card>)}
        </div>
      </section>}
    </section>
  );
};
