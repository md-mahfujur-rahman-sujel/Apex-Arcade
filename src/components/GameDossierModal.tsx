import React from 'react';
import { GameInfo } from '../types/game';
import { InteractiveLivePreview } from './InteractiveLivePreview';
import { X, Play, Award, Zap, Gamepad2, Calendar, User, Monitor } from 'lucide-react';

interface GameDossierModalProps {
  game: GameInfo | null;
  onClose: () => void;
  onLaunchGame: (game: GameInfo) => void;
}

export const GameDossierModal: React.FC<GameDossierModalProps> = ({
  game,
  onClose,
  onLaunchGame,
}) => {
  if (!game) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0D111D] border border-white/10 rounded-2xl shadow-2xl overflow-hidden my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Strip */}
        <div className="relative aspect-[16/7] w-full bg-[#06080F] border-b border-white/10">
          <InteractiveLivePreview game={game} isHovered={true} className="h-full" />
          <button
            onClick={onClose}
            aria-label="Close Modal"
            className="absolute top-4 right-4 p-2 rounded-full bg-black/60 hover:bg-black/90 backdrop-blur-md border border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono mb-1">
                <span>{game.era}</span>
                <span aria-hidden="true" className="text-slate-500">·</span>
                <span>{game.year}</span>
              </div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                {game.title}
              </h2>
            </div>
            {(game.playableEngineId || game.htmlPath) && (
              <button
                onClick={() => {
                  onClose();
                  onLaunchGame(game);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-colors cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Play Game</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 md:p-8 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Quick Fact Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-white/5 rounded-xl border border-white/5 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Released</span>
                <span className="font-medium text-slate-200">{game.year}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <User className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Creator / Studio</span>
                <span className="font-medium text-slate-200 truncate block">{game.developer}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-slate-300">
              <Monitor className="w-4 h-4 text-slate-400 shrink-0" />
              <div>
                <span className="block text-[10px] text-slate-500 uppercase">Original Hardware</span>
                <span className="font-medium text-slate-200">{game.originalPlatform}</span>
              </div>
            </div>
          </div>

          {/* Overview */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Historical Overview
            </h3>
            <p className="text-sm text-slate-300 leading-relaxed">
              {game.description}
            </p>
          </div>

          {/* Cultural Legacy & Innovations */}
          <div className="p-4 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
            <div className="flex items-center gap-2 text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-2">
              <Award className="w-4 h-4" />
              <span>Cultural Legacy &amp; Breakthrough</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {game.legacy}
            </p>
          </div>

          {game.keyMechanics && game.keyMechanics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Signature Mechanics</span>
              </div>
              <ul className="space-y-2">
                {game.keyMechanics.map((mech, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-slate-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 mt-1.5 shrink-0" />
                    <span>{mech}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Controls Summary */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Gamepad2 className="w-4 h-4 text-emerald-400" />
              <span>Control Configuration</span>
            </div>
            <p className="text-xs font-mono text-slate-300 bg-black/40 p-3 rounded-lg border border-white/5">
              {game.controlsSummary}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 px-6 md:px-8 border-t border-white/5 bg-[#090C16] flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Genre: <span className="text-slate-300 font-medium">{game.genre}</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            Close Dossier
          </button>
        </div>
      </div>
    </div>
  );
};
