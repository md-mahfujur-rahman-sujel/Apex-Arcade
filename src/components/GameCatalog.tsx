import React, { useEffect, useMemo, useState } from 'react';
import { GameInfo, PlayerStats } from '../types/game';
import { GameCard3D } from './GameCard3D';
import { Search, Sparkles, Star, Layers, Dices } from 'lucide-react';
import { Button } from './ui/Button';
import { Chip } from './ui/Chip';
import { Input, Select } from './ui/Input';

interface GameCatalogProps {
  games: GameInfo[];
  stats: PlayerStats;
  favorites: string[];
  onToggleFavorite: (gameId: string) => void;
  onLaunchGame: (game: GameInfo) => void;
  onOpenDossier: (game: GameInfo) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  initialQuery?: URLSearchParams;
}

export const GameCatalog: React.FC<GameCatalogProps> = ({
  games,
  stats,
  favorites,
  onToggleFavorite,
  onLaunchGame,
  onOpenDossier,
  activeFilter,
  onFilterChange,
  initialQuery,
}) => {
  const [searchQuery, setSearchQuery] = useState(() => initialQuery?.get('q') || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(() => initialQuery?.get('category') || 'all');
  const [tagFilter, setTagFilter] = useState<string>(() => initialQuery?.get('tag') || 'all');
  const [sortBy, setSortBy] = useState<'az' | 'number' | 'enhanced' | 'played' | 'difficulty'>('az');
  const [playersFilter, setPlayersFilter] = useState<'all' | '1P' | '1-2P' | '1-4P'>(() => ['1P', '1-2P', '1-4P'].includes(initialQuery?.get('players') || '') ? initialQuery!.get('players') as '1P' | '1-2P' | '1-4P' : 'all');
  const [sessionFilter, setSessionFilter] = useState<'all' | 'quick' | 'short' | 'standard' | 'long'>(() => ['quick', 'short', 'standard', 'long'].includes(initialQuery?.get('len') || '') ? initialQuery!.get('len') as 'quick' | 'short' | 'standard' | 'long' : 'all');
  const [modeFilter, setModeFilter] = useState(() => initialQuery?.get('mode') || 'all');
  const [inputFilter, setInputFilter] = useState(() => initialQuery?.get('input') || '');
  const [moodFilter, setMoodFilter] = useState(() => initialQuery?.get('mood') || '');
  const [eraFilter, setEraFilter] = useState('all');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setIsReady(true));
    return () => cancelAnimationFrame(frame);
  }, []);

  const availableModes = useMemo(() => [...new Set(games.flatMap((game) => game.modes || []))].sort(), [games]);
  const availableTags = useMemo(() => [...new Set(games.flatMap((game) => game.tags || []))].sort((a, b) => a.localeCompare(b)), [games]);
  const availableInputs = useMemo(() => [...new Set(games.flatMap((game) => game.inputs || []))].sort(), [games]);
  const searchSuggestions = useMemo(() => {
    const values = games.flatMap((game) => [game.title, game.genre, ...(game.tags || []), ...(game.modes || [])]);
    const query = searchQuery.trim().toLowerCase();
    return [...new Set(values)].filter((value) => !query || value.toLowerCase().includes(query)).slice(0, 8);
  }, [games, searchQuery]);

  useEffect(() => {
    if (!window.location.hash.startsWith('#/browse')) return;
    const params = new URLSearchParams();
    if (modeFilter !== 'all') params.set('mode', modeFilter);
    if (sessionFilter !== 'all') params.set('len', sessionFilter);
    if (playersFilter !== 'all') params.set('players', playersFilter);
    if (inputFilter) params.set('input', inputFilter);
    if (tagFilter !== 'all') params.set('tag', tagFilter);
    if (selectedCategory !== 'all') params.set('category', selectedCategory);
    if (moodFilter) params.set('mood', moodFilter);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    const nextHash = `#/browse${params.size ? `?${params.toString()}` : ''}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState({ ...(window.history.state || {}), apexRoute: nextHash }, '', nextHash);
    }
  }, [modeFilter, sessionFilter, playersFilter, inputFilter, tagFilter, selectedCategory, moodFilter, searchQuery]);

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
    const difficultyRank: Record<GameInfo['difficulty'], number> = { Easy: 1, Medium: 2, Hard: 3, Brutal: 4 };
    return games.filter((game) => {
      // Search term
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = game.title.toLowerCase().includes(q);
        const matchesOf = game.of.toLowerCase().includes(q);
        const matchesCategory = game.category.toLowerCase().includes(q);
        const matchesDesc = game.description.toLowerCase().includes(q);
        const matchesMetadata = [game.genre, game.era, ...(game.tags || []), ...(game.modes || [])].some((value) => value.toLowerCase().includes(q));
        if (!matchesTitle && !matchesOf && !matchesCategory && !matchesDesc && !matchesMetadata) {
          return false;
        }
      }

      // Category tab
      if (selectedCategory !== 'all' && game.category !== selectedCategory) {
        return false;
      }
      if (tagFilter !== 'all' && !game.tags?.some((tag) => tag.toLowerCase() === tagFilter.toLowerCase())) return false;

      // Starred favorites filter
      if (activeFilter === 'favorites' && !favorites.includes(game.id)) {
        return false;
      }

      // Playable engines filter (supports 'playable' from nav and '3d-engines' from chip)
      if ((activeFilter === 'playable' || activeFilter === '3d-engines') && !game.playableEngineId) {
        return false;
      }

      if (playersFilter !== 'all' && game.players !== playersFilter) return false;
      if (eraFilter !== 'all' && game.era !== eraFilter) return false;
      if (modeFilter !== 'all' && !game.modes?.includes(modeFilter)) return false;
      if (sessionFilter === 'quick' && (game.sessionMinutes || 0) > 5) return false;
      if (sessionFilter === 'short' && ((game.sessionMinutes || 0) <= 5 || (game.sessionMinutes || 0) > 10)) return false;
      if (sessionFilter === 'standard' && ((game.sessionMinutes || 0) <= 10 || (game.sessionMinutes || 0) > 20)) return false;
      if (sessionFilter === 'long' && (game.sessionMinutes || 0) <= 20) return false;
      if (inputFilter && !game.inputs?.some((input) => input.toLowerCase() === inputFilter.toLowerCase())) return false;
      if (moodFilter) {
        const moodText = `${game.tagline} ${game.description} ${(game.tags || []).join(' ')}`.toLowerCase();
        if (!moodText.includes(moodFilter.toLowerCase())) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'number') return a.gameNumber - b.gameNumber;
      if (sortBy === 'enhanced') return Number(b.status === 'enhanced') - Number(a.status === 'enhanced') || a.title.localeCompare(b.title);
      if (sortBy === 'played') return (stats.recentSessions.filter((session) => session.gameId === b.id).length - stats.recentSessions.filter((session) => session.gameId === a.id).length) || a.title.localeCompare(b.title);
      if (sortBy === 'difficulty') return difficultyRank[a.difficulty] - difficultyRank[b.difficulty] || a.title.localeCompare(b.title);
      return a.title.localeCompare(b.title);
    });
  }, [games, searchQuery, selectedCategory, tagFilter, activeFilter, favorites, playersFilter, eraFilter, modeFilter, sessionFilter, sortBy, stats.recentSessions, inputFilter, moodFilter]);

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
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-6 sm:mb-8 pb-6 border-b border-line">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-accent uppercase tracking-wider mb-2">
            <Layers className="w-3.5 h-3.5" />
            <span>Complete Collection</span>
            <span aria-hidden="true" className="text-fg-muted">·</span>
            <span>{games.length} Masterpiece Games</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-fg tracking-tight">
            Original Arcade Tributes, Board Games &amp; Tabletop
          </h2>
          <p className="text-sm text-fg-muted mt-1 max-w-2xl">
            Every game runs smoothly in your browser with no download. Hover over any card for procedural animated live previews or click to jump into the theater.
          </p>
        </div>

        {/* Action Row: Search & Surprise Me */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 w-full lg:w-auto">
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-muted pointer-events-none" />
            <Input
              list="game-search-suggestions"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, genre, rules…"
              className="pl-10 pr-4 py-2.5 text-xs"
            />
            <datalist id="game-search-suggestions" data-search-suggestions>
              {searchSuggestions.map((suggestion) => <option key={suggestion} value={suggestion} />)}
            </datalist>
          </div>

          <Button
            variant="secondary"
            onClick={handleSurpriseMe}
            className="whitespace-nowrap text-xs"
            title="Pick and launch a random game"
          >
            <Dices className="w-4 h-4 text-accent" />
            <span>Surprise Me</span>
          </Button>
        </div>
      </div>

      {/* Category Tabs Strip (Responsive Horizontal Scroll on mobile) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="relative min-w-0">
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-gradient-to-r from-bg to-transparent sm:hidden" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-7 bg-gradient-to-l from-bg to-transparent sm:hidden" />
          <div className="flex items-center gap-1.5 p-1 bg-surface rounded-xl border border-line text-xs overflow-x-auto no-scrollbar scroll-smooth -mx-4 px-4 sm:mx-0 sm:px-1">
            {categories.map((cat) => (
            <Chip
              key={cat.id}
              selected={selectedCategory === cat.id}
              onClick={() => setSelectedCategory(cat.id)}
            >
              <span>{cat.label}</span>
              <span
                className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${selectedCategory === cat.id ? 'bg-accent/20 text-accent font-bold' : 'bg-surface-2 text-fg-muted'}`}
              >
                {cat.count}
              </span>
            </Chip>
            ))}
          </div>
        </div>

        {/* Quick Filters: Starred Favorites & 3D Engines */}
        <div className="flex items-center gap-2 text-xs shrink-0 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
          <Chip
            selected={activeFilter === 'playable' || activeFilter === '3d-engines'}
            onClick={() => onFilterChange(activeFilter === 'playable' || activeFilter === '3d-engines' ? 'all' : 'playable')}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Playable Engines ({games.filter((g) => g.playableEngineId).length})</span>
          </Chip>

          <Chip
            selected={activeFilter === 'favorites'}
            onClick={() => onFilterChange(activeFilter === 'favorites' ? 'all' : 'favorites')}
          >
            <Star className="w-3.5 h-3.5" />
            <span>Starred ({favorites.length})</span>
          </Chip>
        </div>
      </div>

      <div className="mb-4 grid gap-3 rounded-2xl border border-line bg-surface/70 p-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
        <label className="text-[10px] font-mono uppercase tracking-wider text-fg-muted">Sort
          <Select value={sortBy} onChange={(event) => setSortBy(event.target.value as typeof sortBy)} className="mt-1 min-h-11 rounded-lg px-2 text-xs normal-case tracking-normal">
            <option value="az">A to Z</option><option value="number">Game number</option><option value="enhanced">Newest enhanced</option><option value="played">Most played</option><option value="difficulty">Difficulty</option>
          </Select>
        </label>
        <label className="text-[10px] font-mono uppercase tracking-wider text-fg-muted">Players
          <Select aria-label="Players facet" value={playersFilter} onChange={(event) => setPlayersFilter(event.target.value as typeof playersFilter)} className="mt-1 min-h-11 rounded-lg px-2 text-xs normal-case tracking-normal"><option value="all">Any players</option><option value="1P">1 player</option><option value="1-2P">1–2 players</option><option value="1-4P">1–4 players</option></Select>
        </label>
        <label className="text-[10px] font-mono uppercase tracking-wider text-fg-muted">Session
          <Select aria-label="Session length facet" value={sessionFilter} onChange={(event) => setSessionFilter(event.target.value as typeof sessionFilter)} className="mt-1 min-h-11 rounded-lg px-2 text-xs normal-case tracking-normal"><option value="all">Any length</option><option value="quick">Quick · ≤5 min</option><option value="short">Short · 6–10 min</option><option value="standard">Standard · 11–20 min</option><option value="long">Long · over 20 min</option></Select>
        </label>
        <label className="text-[10px] font-mono uppercase tracking-wider text-fg-muted">Mode
          <Select aria-label="Mode facet" value={modeFilter} onChange={(event) => setModeFilter(event.target.value)} className="mt-1 min-h-11 rounded-lg px-2 text-xs normal-case tracking-normal"><option value="all">Any mode</option>{availableModes.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</Select>
        </label>
        <label className="text-[10px] font-mono uppercase tracking-wider text-fg-muted">Input
          <Select aria-label="Input facet" value={inputFilter} onChange={(event) => setInputFilter(event.target.value)} className="mt-1 min-h-11 rounded-lg px-2 text-xs normal-case tracking-normal"><option value="">Any input</option>{availableInputs.map((input) => <option key={input} value={input}>{input[0].toUpperCase() + input.slice(1)}</option>)}</Select>
        </label>
        <label className="text-[10px] font-mono uppercase tracking-wider text-fg-muted">Tag
          <Select aria-label="Tag facet" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)} className="mt-1 min-h-11 rounded-lg px-2 text-xs normal-case tracking-normal"><option value="all">Any tag</option>{availableTags.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</Select>
        </label>
        <label className="text-[10px] font-mono uppercase tracking-wider text-fg-muted">Era
          <Select value={eraFilter} onChange={(event) => setEraFilter(event.target.value as typeof eraFilter)} className="mt-1 min-h-11 rounded-lg px-2 text-xs normal-case tracking-normal"><option value="all">Any era</option>{[...new Set(games.map((game) => game.era))].map((era) => <option key={era} value={era}>{era}</option>)}</Select>
        </label>
      </div>
      <p role="status" aria-live="polite" data-result-count className="mb-4 text-xs text-fg-muted">Showing {filteredGames.length} of {games.length} games</p>

      {/* Responsive Grid of All Games */}
      {!isReady ? (
        <div role="status" aria-label="Loading game catalog">
          <span className="sr-only">Loading games…</span>
          <div aria-hidden="true" className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
            {Array.from({ length: 10 }, (_, index) => <div key={index} className="h-[350px] overflow-hidden rounded-2xl border border-line bg-card shadow-card"><div className="h-40 animate-pulse bg-surface-2" /><div className="space-y-3 p-5"><div className="h-3 w-2/3 animate-pulse rounded bg-surface-2" /><div className="h-5 w-4/5 animate-pulse rounded bg-surface-2" /><div className="h-3 w-full animate-pulse rounded bg-surface-2" /><div className="mt-8 h-10 w-full animate-pulse rounded-xl bg-surface-2" /></div></div>)}
          </div>
        </div>
      ) : filteredGames.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 gap-4 sm:gap-6">
          {filteredGames.map((game) => (
            <GameCard3D
              key={game.id}
              game={game}
              isFavorite={favorites.includes(game.id)}
              onToggleFavorite={onToggleFavorite}
              onLaunchGame={onLaunchGame}
              onOpenDossier={onOpenDossier}
              searchQuery={searchQuery}
              progress={{ completed: Math.min(game.levelCount || 0, stats.levelProgress?.[game.id] || 0), total: game.levelCount || 0 }}
            />
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-surface border border-line rounded-2xl">
          <p className="text-fg-muted text-sm">No games matched your current search or category filter.</p>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
              setTagFilter('all');
              setSortBy('az');
              setPlayersFilter('all');
              setSessionFilter('all');
              setModeFilter('all');
              setInputFilter('');
              setMoodFilter('');
              setEraFilter('all');
              onFilterChange('all');
            }}
            className="mt-4 text-xs"
          >
            Reset Filters
          </Button>
        </div>
      )}
    </section>
  );
};
