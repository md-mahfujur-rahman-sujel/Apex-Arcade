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

const formatDuration = (seconds: number) => `${Math.max(1, Math.round(seconds / 60))} min`;
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const dateSeed = (value: string) => Array.from(value).reduce((seed, char) => ((seed * 31) + char.charCodeAt(0)) >>> 0, 7);
// A deliberately curated flagship set. Every title has a dedicated playable canvas engine.
const FEATURED_GAME_IDS = ['flappy-bird', 'pac-man', 'sonic-the-hedgehog', 'celeste', 'street-fighter-ii', 'tetris'];

export const LauncherHome: React.FC<LauncherHomeProps> = ({ games, stats, onLaunchGame, onExplore }) => {
  const [heroIndex, setHeroIndex] = useState(0);
  const heroCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const heroGames = useMemo(() => FEATURED_GAME_IDS.map((id) => games.find((game) => game.id === id)).filter((game): game is GameInfo => Boolean(game && game.playableEngineId)), [games]);
  const activeHero = heroGames[heroIndex % Math.max(1, heroGames.length)];
  const dailyDate = dateKey(new Date());
  const dailySeed = dateSeed(dailyDate);
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
  const dailyGauntletGames = useMemo(() => {
    const eligible = games.filter((game) => game.supportsDailySeed && game.tier !== 'B').sort((a, b) => a.gameNumber - b.gameNumber);
    if (eligible.length < 3) return [];
    const offset = dailySeed % eligible.length;
    return [...eligible.slice(offset), ...eligible.slice(0, offset)].slice(0, 3);
  }, [games, dailySeed]);
  const sharedRecentTags = useMemo(() => {
    const counts = new Map<string, number>();
    recentSessions.forEach(({ gameId }) => (gameById.get(gameId)?.tags || []).forEach((tag) => counts.set(tag, (counts.get(tag) || 0) + 1)));
    return [...counts.entries()].filter(([, count]) => count >= Math.min(2, recentSessions.length)).map(([tag]) => tag);
  }, [recentSessions, gameById]);
  const recommendedGames = useMemo(() => games
    .filter((game) => !recentGameIds.has(game.id) && (game.tags || []).some((tag) => sharedRecentTags.includes(tag)))
    .sort((a, b) => (b.tags || []).filter((tag) => sharedRecentTags.includes(tag)).length - (a.tags || []).filter((tag) => sharedRecentTags.includes(tag)).length || a.gameNumber - b.gameNumber)
    .slice(0, 6), [games, recentGameIds, sharedRecentTags]);
  const newAndUpdatedGames = useMemo(() => games.filter((game) => game.status === 'enhanced'), [games]);
  const quickGames = useMemo(() => games.filter((game) => (game.sessionMinutes || Infinity) <= 5), [games]);
  const twoPlayerGames = useMemo(() => games.filter((game) => game.twoPlayer !== 'none'), [games]);
  const bossRushGames = useMemo(() => games.filter((game) => game.modes?.some((mode) => /boss rush/i.test(mode))), [games]);
  const moods = useMemo(() => [...new Set(games.flatMap((game) => game.moods || []))], [games]);
  const collections = useMemo(() => [...new Set(games.flatMap((game) => game.collections || []))], [games]);
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
  const renderGameCards = (items: GameInfo[], launch: (game: GameInfo) => void = onLaunchGame) => (
    <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3">
      {items.map((game) => (
        <Card key={game.id} interactive data-recommendation-card className="group w-full min-w-0" style={{ '--game-accent': game.accentColor } as React.CSSProperties}>
          <button type="button" data-ui-open aria-label={`Play ${game.title}`} onClick={() => launch(game)} className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" />
          <div aria-hidden="true" data-recommendation-preview className="pointer-events-none relative flex h-24 items-center justify-between overflow-hidden px-4">
            <span className="text-4xl drop-shadow-lg">{game.icon}</span>
            <span className="font-mono text-4xl font-black opacity-20" style={{ color: game.accentColor }}>{String(game.gameNumber).padStart(2, '0')}</span>
          </div>
          <div aria-hidden="true" data-recommendation-body className="pointer-events-none p-3.5">
            <div data-recommendation-title className="truncate text-sm font-bold text-fg group-hover:text-accent-hover">{game.title}</div>
            <div data-recommendation-meta className="mt-1 truncate text-[11px] text-fg-muted">{game.category} · {game.year}</div>
          </div>
        </Card>
      ))}
    </div>
  );
  const renderRail = (title: string, items: GameInfo[], caption?: string, launch?: (game: GameInfo) => void) => items.length > 0 ? (
    <section aria-label={title}>
      {sectionHeading(title, caption)}
      {renderGameCards(items, launch)}
    </section>
  ) : null;

  return (
    <section aria-label="Arcade home" className="mx-auto w-full max-w-7xl space-y-10 px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
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
            <div className="flex items-center gap-2">
              {heroGames.map((game, index) => <button key={game.id} onClick={() => setHeroIndex(index)} aria-label={`Show ${game.title}`} aria-pressed={index === heroIndex} className="group grid min-h-11 min-w-11 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"><span aria-hidden="true" className={`h-1.5 rounded-full transition-all ${index === heroIndex ? 'w-8 bg-accent' : 'w-3 bg-line-strong group-hover:bg-fg-muted'}`} /></button>)}
            </div>
            <div className="ml-auto flex gap-2">
              <button onClick={() => shiftHero(-1)} aria-label="Previous featured game" className="min-h-11 min-w-11 rounded-full border border-line bg-surface-2 p-2 text-fg-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => shiftHero(1)} aria-label="Next featured game" className="min-h-11 min-w-11 rounded-full border border-line bg-surface-2 p-2 text-fg-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </div>
        <ScreenBezel data-hero-stage className="min-w-0 min-h-[210px] border-t border-white/5 lg:min-h-[350px] lg:border-l lg:border-t-0">
          <canvas ref={heroCanvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full object-cover" />
          {/* The dark stage is painted on the canvas itself, so no theme-dependent overlay is needed. */}
          <div data-hero-badge className="absolute bottom-4 left-4 rounded-full border border-line bg-card/90 px-3 py-1.5 text-xs text-fg backdrop-blur">{activeHero.icon} {activeHero.of}</div>
        </ScreenBezel>
      </Card>}

      {recentSessions.length > 0 && <section aria-label="Recently played">
        {sectionHeading('Recently played', 'Your five most recent games')}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {recentSessions.map((session, index) => {
            const game = gameById.get(session.gameId);
            if (!game) return null;
            return <Card key={`${session.gameId}-${session.date}-${index}`} interactive data-recommendation-card className="group min-h-[104px] bg-card p-4 hover:bg-surface-2">
              <button type="button" data-ui-open aria-label={`Play ${game.title} again`} onClick={() => onLaunchGame(game)} className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" />
              <div aria-hidden="true" className="pointer-events-none relative flex items-center gap-3">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${game.accentColor}22` }}>{game.icon}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-fg">{game.title}</span><span className="mt-1 block text-[11px] text-fg-muted">Score {session.score} · {formatDuration(session.durationSeconds)}</span><span className="mt-1 block truncate text-[10px] text-fg-subtle">{session.date}</span></span>
                <Play className="h-4 w-4 shrink-0 text-accent" />
              </div>
            </Card>;
          })}
        </div>
      </section>}

      {continueGames.length > 0 && <section aria-label="Continue playing">
        {sectionHeading('Continue playing', 'Pick up at your next unlocked level')}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {continueGames.map(({ game, startLevel }) => <Card key={game.id} interactive data-recommendation-card className="group min-h-[104px] bg-card p-4 hover:bg-surface-2">
            <button type="button" data-ui-open aria-label={`Continue ${game.title} at level ${startLevel}`} onClick={() => onLaunchGame(game, startLevel)} className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" />
            <div aria-hidden="true" className="pointer-events-none relative flex items-center gap-3"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-2xl" style={{ backgroundColor: `${game.accentColor}22` }}>{game.icon}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-fg">{game.title}</span><span className="mt-1 block text-[11px] text-fg-muted">Continue at level {startLevel}</span></span><Play className="h-4 w-4 shrink-0 text-accent" /></div>
          </Card>)}
        </div>
      </section>}
      {dailyGauntletGames.length === 3 && renderRail('Daily Gauntlet', dailyGauntletGames, `Three Tier S/A games · ${dailyDate} seed`, (game) => onLaunchGame(game, 1, dailySeed))}
      {renderRail('New and updated', newAndUpdatedGames)}
      {renderRail('Quick 5-minute games', quickGames)}
      {renderRail('Local two-player', twoPlayerGames)}
      {renderRail('Because you played', recommendedGames, sharedRecentTags.length ? `Shares tags from your recent games: ${sharedRecentTags.join(', ')}` : undefined)}
      {renderRail('Boss Rush playlists', bossRushGames)}
      {moods.map((mood) => renderRail(mood, games.filter((game) => game.moods?.includes(mood))))}
      {collections.map((collection) => renderRail(collection, games.filter((game) => game.collections?.includes(collection))))}

    </section>
  );
};
