import React, { useState, useRef } from 'react';
import { GameInfo } from '../types/game';
import { CardScenePreview } from './CardScenePreview';
import { Play, BookOpen, Star, Sparkles, Terminal } from 'lucide-react';

interface GameCard3DProps {
  game: GameInfo;
  isFavorite: boolean;
  onToggleFavorite: (id: string) => void;
  onLaunchGame: (game: GameInfo) => void;
  onOpenDossier: (game: GameInfo) => void;
}

export const GameCard3D: React.FC<GameCard3DProps> = ({
  game,
  isFavorite,
  onToggleFavorite,
  onLaunchGame,
  onOpenDossier,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [rotateX, setRotateX] = useState(0);
  const [rotateY, setRotateY] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || 'ontouchstart' in window) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotX = -((y - centerY) / centerY) * 7;
    const rotY = ((x - centerX) / centerX) * 7;

    setRotateX(rotX);
    setRotateY(rotY);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotateX(0);
    setRotateY(0);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isHovered
          ? `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-5px)`
          : 'perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0px)',
        transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        borderColor: isHovered ? game.accentColor : 'rgba(255, 255, 255, 0.08)',
        boxShadow: isHovered
          ? `0 20px 40px -15px ${game.accentColor}35, 0 0 0 1px ${game.accentColor}50`
          : '0 4px 20px -2px rgba(0, 0, 0, 0.5)',
      }}
      className="group relative flex flex-col bg-[#0F1322] border rounded-2xl overflow-hidden text-left transition-all cursor-pointer"
      onClick={() => onLaunchGame(game)}
    >
      {/* Visual Live Preview Viewport powered by card-scenes.js */}
      <div className="relative w-full overflow-hidden bg-[#070912] border-b border-white/5">
        <CardScenePreview game={game} isHovered={isHovered} />

        {/* Favorite toggle button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(game.id);
          }}
          aria-label="Toggle Favorite"
          className="absolute top-2.5 right-2.5 z-20 p-1.5 rounded-lg bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/10 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <Star
            className={`w-3.5 h-3.5 ${isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400'}`}
          />
        </button>

        {/* 2.5D Badge indicator if custom 3D canvas engine exists */}
        {game.playableEngineId && (
          <div className="absolute bottom-2.5 right-2.5 z-20 flex items-center gap-1 px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-cyan-500/40 text-cyan-300 text-[10px] font-mono font-bold tracking-tight">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" />
            <span>3D Engine</span>
          </div>
        )}
      </div>

      {/* Card Body Area */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Header line with inspiration */}
        <div className="flex items-baseline justify-between gap-2 mb-1.5">
          <span className="text-[11px] font-mono font-semibold text-slate-400 truncate">
            {game.of ? (
              <>
                <span className="text-slate-500">inspired by</span>{' '}
                <span className="text-slate-200 font-medium">{game.of}</span>
              </>
            ) : (
              game.genre
            )}
          </span>
          <span
            className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border border-white/10"
            style={{ color: game.accentColor }}
          >
            {game.difficulty}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-white tracking-tight group-hover:text-cyan-300 transition-colors mb-2">
          {game.title}
        </h3>

        {/* Blurb Description */}
        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4 flex-1">
          {game.description || game.tagline}
        </p>

        {/* Keybindings Shortcut Bar */}
        <div className="pt-2.5 pb-3 border-t border-white/5 flex items-center gap-2 text-[11px] font-mono text-slate-400 truncate">
          <Terminal className="w-3 h-3 text-cyan-400 shrink-0" />
          <span className="truncate text-slate-300/80">{game.keys}</span>
        </div>

        {/* Interactive Action Zone */}
        <div className="flex items-center gap-2 pt-2 border-t border-white/5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onLaunchGame(game);
            }}
            style={{
              backgroundColor: game.accentColor,
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 text-slate-950 font-bold text-xs rounded-xl shadow transition-transform active:scale-95 cursor-pointer hover:brightness-110"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Game</span>
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenDossier(game);
            }}
            className="p-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors cursor-pointer"
            title="View History & Lore"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
