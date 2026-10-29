import React, { useState, useRef } from 'react';
import { GameInfo } from '../types/game';
import { CardScenePreview } from './CardScenePreview';
import { Play, BookOpen, Star, Sparkles } from 'lucide-react';
import { audio } from '../services/audioSynthesizer';
import { prefetchGameDocument } from '../services/performanceHints';
import { Card } from './ui/Card';
import { ScreenBezel } from './ui/ScreenBezel';

interface GameCard3DProps {
  game: GameInfo;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onLaunchGame: (game: GameInfo) => void;
  onOpenDossier: (game: GameInfo) => void;
  searchQuery?: string;
  progress?: { completed: number; total: number };
}

const HighlightedText: React.FC<{ text: string; query?: string }> = ({ text, query }) => {
  const normalizedQuery = query?.trim();
  if (!normalizedQuery) return <>{text}</>;
  const fragments = text.split(new RegExp(`(${normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'ig'));
  return <>{fragments.map((fragment, index) => fragment.toLowerCase() === normalizedQuery.toLowerCase()
    ? <mark key={index} className="rounded bg-amber-300/25 px-0.5 text-inherit">{fragment}</mark>
    : <React.Fragment key={index}>{fragment}</React.Fragment>)}</>;
};

export const GameCard3D: React.FC<GameCard3DProps> = ({
  game,
  isFavorite,
  onToggleFavorite,
  onLaunchGame,
  onOpenDossier,
  searchQuery,
  progress,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || 'ontouchstart' in window || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = Math.max(-6, Math.min(6, -((y - centerY) / centerY) * 6));
    const rotY = Math.max(-6, Math.min(6, ((x - centerX) / centerX) * 6));

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseEnter = () => {
    setIsHovered(!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    audio.playHover();
    prefetchGameDocument(game.htmlPath);
  };

  const handleFocus = () => prefetchGameDocument(game.htmlPath);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <Card
      interactive
      data-game-id={game.id}
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onFocus={handleFocus}
      onMouseLeave={handleMouseLeave}
      style={{
        '--game-accent': game.accentColor,
        transform: isHovered
          ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
        transition: isHovered
          ? 'transform var(--apex-motion-fast) var(--apex-ease-standard)'
          : 'transform var(--apex-motion-base) var(--apex-ease-standard)',
        borderColor: isHovered ? game.accentColor : 'var(--line)',
        boxShadow: isHovered
          ? `0 20px 40px -15px ${game.accentColor}35, 0 0 0 1px ${game.accentColor}50`
          : '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      } as React.CSSProperties}
      className="group flex flex-col bg-card text-left transition-all cursor-pointer focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
      onClick={() => onLaunchGame(game)}
      tabIndex={0}
      role="group"
      aria-label={`${game.title}, press Enter to play`}
      data-ui-open
      data-catalog-card
      onKeyDown={(event) => {
        if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault();
          onLaunchGame(game);
        }
      }}
    >
      {/* Visual Live Preview Viewport powered by card-scenes.js */}
      <ScreenBezel data-card-preview className="w-full border-b border-line">
        <CardScenePreview game={game} isHovered={isHovered} />

        {/* Favorite toggle button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(game.id);
          }}
          aria-label="Toggle Favorite"
          data-card-favorite
          className="absolute bottom-2.5 right-2.5 z-20 grid min-h-11 min-w-11 place-items-center rounded-lg border border-white/15 bg-black/60 text-white/75 backdrop-blur-md transition-colors cursor-pointer hover:bg-black/90 hover:text-amber-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <Star
            className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-300 text-amber-300' : 'text-current'}`}
          />
        </button>

      </ScreenBezel>

      {/* Card Body Area */}
      <div data-card-body className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Header line with inspiration */}
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-mono font-semibold text-fg-muted truncate">
            {game.of ? (
              <>
                <span className="text-fg-muted">inspired by</span>{' '}
                <span className="text-fg font-medium"><HighlightedText text={game.of} query={searchQuery} /></span>
              </>
            ) : (
              game.genre
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1.5">
            {game.status === 'enhanced' && <span className="rounded border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-accent">Enhanced</span>}
            <span
              data-card-difficulty
              className="rounded border border-accent/30 bg-accent-soft px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-wider"
              style={{ color: game.accentColor }}
            >
              {game.difficulty}
            </span>
          </span>
        </div>

        {/* Title */}
        <div className="mb-2 flex items-start justify-between gap-2">
          <h3 data-card-title className="min-w-0 flex-1 text-lg font-bold text-fg tracking-tight group-hover:text-accent transition-colors">
            <HighlightedText text={game.title} query={searchQuery} />
          </h3>
          {game.playableEngineId && <span data-engine-badge className="mt-1 flex shrink-0 items-center gap-1 rounded border border-accent/30 bg-accent-soft px-1.5 py-0.5 text-[9px] font-bold text-accent"><Sparkles className="h-2.5 w-2.5" />3D</span>}
        </div>

        {/* Blurb Description */}
        <p data-card-description className="text-xs text-fg-muted line-clamp-2 leading-relaxed mb-4 flex-1">
          <HighlightedText text={game.description || game.tagline} query={searchQuery} />
        </p>

        {progress && progress.total > 0 && <div data-card-progress className="mb-3 flex items-center gap-2.5 text-[10px] text-fg-muted" aria-label={`${progress.completed} of ${progress.total} levels complete`}>
          <span className="grid h-8 w-8 place-items-center rounded-full" style={{ background: `conic-gradient(${game.accentColor} ${Math.round((progress.completed / progress.total) * 360)}deg, var(--line) 0deg)` }}>
            <span className="grid h-6 w-6 place-items-center rounded-full bg-card text-[8px] font-bold text-fg">{progress.completed}</span>
          </span>
          <span><span className="block font-mono text-fg">{progress.completed}/{progress.total} levels</span><span>{Math.ceil((progress.completed / progress.total) * 3)} / 3 stars</span></span>
        </div>}

        {/* Interactive Action Zone */}
        <div className="flex items-stretch gap-2 pt-2 border-t border-line">
          <button
            data-game-action
            onClick={(e) => {
              e.stopPropagation();
              onLaunchGame(game);
            }}
            style={{
              backgroundColor: game.accentColor,
              color: '#07111a',
            }}
            className="flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-bold shadow transition-transform cursor-pointer hover:brightness-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Game</span>
          </button>

          <button
            data-card-dossier
            onClick={(e) => {
              e.stopPropagation();
              onOpenDossier(game);
            }}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-line bg-surface-2 text-fg-muted transition-colors cursor-pointer hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
            title="View History & Lore"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Card>
  );
};
