import React from 'react';
import { Play, Layers } from 'lucide-react';
import { GAMES_DATA } from '../data/gamesData';

interface HeroAnthologyProps {
  onExplore: () => void;
  onPlayFeatured: () => void;
}

export const HeroAnthology: React.FC<HeroAnthologyProps> = ({
  onExplore,
  onPlayFeatured,
}) => {
  const totalCount = GAMES_DATA.length;
  const arcadeCount = GAMES_DATA.filter((g) => g.category === 'arcade').length;
  const boardCount = GAMES_DATA.filter((g) => g.category === 'board').length;
  const cardsCount = GAMES_DATA.filter((g) => g.category === 'cards').length;
  const sportsCount = GAMES_DATA.filter((g) => g.category === 'sports').length;
  const puzzleCount = GAMES_DATA.filter((g) => g.category === 'puzzle').length;
  const otherCount = cardsCount + sportsCount + puzzleCount;

  return (
    <section className="relative w-full overflow-hidden pt-12 pb-16 md:pt-20 md:pb-24 border-b border-white/5 bg-radial-[at_top_center] from-[#12182B]/60 via-[#08090E] to-[#08090E]">
      {/* Background 3D Perspective Lines */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div className="w-full h-full [background-image:linear-gradient(to_right,#06b6d4_1px,transparent_1px),linear-gradient(to_bottom,#06b6d4_1px,transparent_1px)] [background-size:60px_60px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        {/* Unboxed Metadata Tagline */}
        <div className="flex flex-wrap justify-center items-center gap-2 text-xs font-mono text-cyan-400 mb-4 tracking-wide">
          <span>Zero Server Latency</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>100% Client-Side Web Ready</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Hardware Accelerated 60 FPS</span>
        </div>

        {/* Display Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight max-w-4xl text-balance leading-[1.1] mb-6">
          From Arcade Classics to <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-emerald-400 to-amber-400">Board Game Night</span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-slate-300 max-w-2xl text-balance leading-relaxed mb-8">
          An interactive web arcade celebrating {totalCount} legendary video game tributes, tabletop classics, sports, and physics puzzles — all running natively with animated live previews and instant theater mode.
        </p>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mb-12 sm:mb-14 w-full sm:w-auto">
          <button
            onClick={onPlayFeatured}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-cyan-950/50 transition-all cursor-pointer hover:scale-[1.02] min-h-[44px] w-full sm:w-auto"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Quick Play: Glowmoth Gauntlet</span>
          </button>
          <button
            onClick={onExplore}
            className="flex items-center justify-center gap-2 px-5 sm:px-6 py-3 bg-white/5 hover:bg-white/10 text-white font-semibold text-sm rounded-xl border border-white/10 transition-colors cursor-pointer min-h-[44px] w-full sm:w-auto"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Browse All {totalCount} Games</span>
          </button>
        </div>

        {/* Quantitative Proof Strip (computed dynamically from data) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full max-w-4xl p-6 bg-[#0E121F]/80 backdrop-blur-md rounded-2xl border border-white/10">
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-mono font-bold text-white tabular-nums">{totalCount}</div>
            <div className="text-xs text-slate-400 mt-1">Playable Masterpieces</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-mono font-bold text-cyan-400 tabular-nums">{arcadeCount}</div>
            <div className="text-xs text-slate-400 mt-1">Arcade &amp; Indie Tributes</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-mono font-bold text-emerald-400 tabular-nums">{boardCount}</div>
            <div className="text-xs text-slate-400 mt-1">Board &amp; Tabletop Games</div>
          </div>
          <div className="text-center">
            <div className="text-2xl md:text-3xl font-mono font-bold text-amber-400 tabular-nums">{otherCount}</div>
            <div className="text-xs text-slate-400 mt-1">Sports, Cards &amp; Puzzles</div>
          </div>
        </div>
      </div>
    </section>
  );
};
