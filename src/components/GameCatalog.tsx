import React, { useState, useMemo } from 'react';
import { GameInfo, GameCategory } from '../types/game';
import { GameCard3D } from './GameCard3D';
import { Search, Sparkles, Star, Layers, Dices } from 'lucide-react';

interface GameCatalogProps {
  games: GameInfo[];
  favorites: string[];
  onToggleFavorite: (gameId: string) => void;
  onLaunchGame: (game: GameInfo) => void;
  onOpenDossier: (game: GameInfo) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
}

export const GameCatalog: React.FC<GameCatalogProps> = ({
  games,
  favorites,
  onToggleFavorite,
  onLaunchGame,
  onOpenDossier,
  activeFilter,
  onFilterChange,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Category counts
  const categories = useMemo(() => {
    const list: { id: string; label: string; count: number }[] = [
      { id: 'all', label: `All ${games.length} Titles`, count: games.length },
      { id: 'arcade', label: 'Arcade', count: games.filter((g) => g.category === 'arcade').length },
      { id: 'board', label: 'Board Games', count: games.filter((g) => g.category === 'board').length },
      { id: 'cards', label: 'Card Games', count: games.filter((g) => g.category === 'cards').length },
      { id: 'sports', label: 'Sports', count: games.filter((g) => g.category === 'sports').length },
      { id: 'puzzle', label: 'Puzzles', count: games.filter((g) => g.category === 'puzzle').length },
    ];
    return list;
  }, [games]);

  // Filtered games logic
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = game.title.toLowerCase().includes(q);
        const matchesOf = game.of.toLowerCase().includes(q);
        const matchesCategory = game.category.toLowerCase().includes(q);
        const matchesDesc = game.description.toLowerCase().includes(q);
        if (!matchesTitle && !matchesOf && !matchesCategory && !matchesDesc) {
          return false;
        }
      }

      // Category tab
      if (selectedCategory !== 'all' && game.category !== selectedCategory) {
        return false;
      }

      // Starred favorites filter
      if (activeFilter === 'favorites' && !favorites.includes(game.id)) {
        return false;
      }

      // Playable engines filter (supports 'playable' from nav and '3d-engines' from chip)
      if ((activeFilter === 'playable' || activeFilter === '3d-engines') && !game.playableEngineId) {
        return false;
      }

      return true;
    });
  }, [games, searchQuery, selectedCategory, activeFilter, favorites]);

  const handleSurpriseMe = () => {
    const pool = filteredGames.length > 0 ? filteredGames : games;
    const randomGame = pool[Math.floor(Math.random() * pool.length)];
    if (randomGame) {
      onLaunchGame(randomGame);
    }
  };

  return (
    <section id="catalog" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
      {/* Header & Controls Strip */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 sm:mb-8 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Complete Collection</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span>{games.length} Masterpiece Games</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Original Arcade Tributes, Board Games &amp; Tabletop
          </h2>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Every game runs smoothly in your browser with no download. Hover over any card for procedural animated live previews or click to jump into the theater.
          </p>
        </div>

        {/* Action Row: Search & Surprise Me */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, genre, rules…"
              className="w-full pl-10 pr-4 py-2.5 bg-[#0F1322] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors min-h-[44px]"
            />
          </div>

          <button
            onClick={handleSurpriseMe}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 text-amber-300 hover:text-white hover:border-amber-400 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shadow-sm min-h-[44px]"
            title="Pick and launch a random game"
          >
            <Dices className="w-4 h-4 text-amber-400" />
            <span>Surprise Me</span>
          </button>
        </div>
      </div>

      {/* Category Tabs Strip (Responsive Horizontal Scroll on mobile) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-1.5 p-1 bg-[#0F1322] rounded-xl border border-white/5 text-xs overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-1">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer shrink-0 min-h-[38px] ${
                selectedCategory === cat.id
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>{cat.label}</span>
              <span
                className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat.id
                    ? 'bg-slate-900/40 text-slate-950 font-bold'
                    : 'bg-white/10 text-slate-400'
                }`}
              >
                {cat.count}
              </span>
            </button>
          ))}
        </div>

        {/* Quick Filters: Starred Favorites & 3D Engines */}
        <div className="flex items-center gap-2 text-xs shrink-0 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <button
            onClick={() => onFilterChange(activeFilter === 'playable' || activeFilter === '3d-engines' ? 'all' : 'playable')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
              activeFilter === 'playable' || activeFilter === '3d-engines'
                ? 'bg-cyan-950 border-cyan-500/50 text-cyan-300 font-semibold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Playable Engines ({games.filter((g) => g.playableEngineId).length})</span>
          </button>

          <button
            onClick={() => onFilterChange(activeFilter === 'favorites' ? 'all' : 'favorites')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border transition-colors cursor-pointer whitespace-nowrap min-h-[38px] ${
              activeFilter === 'favorites'
                ? 'bg-amber-950/60 border-amber-500/50 text-amber-300 font-semibold'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Starred ({favorites.length})</span>
          </button>
        </div>
      </div>

      {/* Responsive Grid of All Games */}
      {filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
          {filteredGames.map((game) => (
            <GameCard3D
              key={game.id}
              game={game}
              isFavorite={favorites.includes(game.id)}
              onToggleFavorite={onToggleFavorite}
              onLaunchGame={onLaunchGame}
              onOpenDossier={onOpenDossier}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-[#0F1322] border border-white/5 rounded-2xl">
          <p className="text-slate-400 text-sm">No games matched your current search or category filter.</p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              onFilterChange('all');
            }}
            className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/15 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer min-h-[40px]"
          >
            Reset Filters
          </button>
        </div>
      )}
    </section>
  );
};
