import React, { useEffect, useMemo, useState } from 'react';
import { GameInfo, PlayerStats } from '../types/game';
import { GameCard3D } from './GameCard3D';
import { Search, Sparkles, Star, Layers, Dices, ChevronDown, Check } from 'lucide-react';
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

interface FacetOption {
  value: string;
  count: number;
}

const formatFacetLabel = (value: string) => value
  .replace(/[-_]+/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase());

const buildFacetOptions = (games: GameInfo[], getValues: (game: GameInfo) => string[]): FacetOption[] => {
  const counts = new Map<string, number>();
  games.forEach((game) => new Set(getValues(game)).forEach((value) => counts.set(value, (counts.get(value) || 0) + 1)));
  return [...counts].map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
};

const CompactFacetPicker: React.FC<{
  id: string;
  label: string;
  value: string;
  emptyValue: string;
  emptyLabel: string;
  options: FacetOption[];
  onChange: (value: string) => void;
}> = ({ id, label, value, emptyValue, emptyLabel, options, onChange }) => {
  const detailsRef = React.useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState('');
  const selectedOption = options.find((option) => option.value === value);
  const popularOptions = [
    ...(selectedOption ? [selectedOption] : []),
    ...options.filter((option) => option.value !== value),
  ].slice(0, 6);
  const matchingOptions = query.trim()
    ? options.filter((option) => formatFacetLabel(option.value).toLowerCase().includes(query.trim().toLowerCase()))
    : popularOptions;

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !detailsRef.current?.contains(event.target)) {
        if (detailsRef.current) detailsRef.current.open = false;
        setQuery('');
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, []);

  const choose = (nextValue: string) => {
    onChange(nextValue);
    setQuery('');
    if (detailsRef.current) detailsRef.current.open = false;
  };

  return <details id={id} ref={detailsRef} className="group relative min-w-0">
    <summary aria-label={`${label} filter: ${selectedOption?.value || emptyLabel}`} onKeyDown={(event) => { if (event.key === 'Escape' && detailsRef.current) detailsRef.current.open = false; }} className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg border border-line bg-sunken px-2.5 text-xs text-fg transition-colors hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-details-marker]:hidden">
      <span className={`truncate ${value !== emptyValue ? 'text-fg' : 'text-fg-muted'}`}>{selectedOption ? formatFacetLabel(selectedOption.value) : emptyLabel}</span>
      <ChevronDown aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-fg-subtle transition-transform group-open:rotate-180" />
    </summary>
    <div className="absolute left-0 top-full z-50 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-xl border border-line bg-card p-2 shadow-xl">
      <label className="relative block">
        <Search aria-hidden="true" className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()}…`} aria-label={`Search ${label.toLowerCase()}`} className="min-h-9 w-full rounded-lg border border-line bg-surface-2 pl-8 pr-2 text-xs text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
      </label>
      <div className="mt-1.5 flex items-center justify-between px-1.5 py-1 text-[10px] text-fg-subtle">
        <span>{query.trim() ? 'Matching options' : 'Popular choices'}</span>
        <span>{options.length} total</span>
      </div>
      <div className="max-h-52 space-y-0.5 overflow-y-auto">
        <button type="button" aria-pressed={value === emptyValue} onClick={() => choose(emptyValue)} className="flex min-h-9 w-full items-center justify-between rounded-lg px-2 text-left text-xs text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg">
          <span>{emptyLabel}</span>{value === emptyValue && <Check aria-hidden="true" className="h-3.5 w-3.5 text-accent" />}
        </button>
        {matchingOptions.map((option) => (
          <button key={option.value} type="button" aria-pressed={value === option.value} onClick={() => choose(option.value)} className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2 text-left text-xs transition-colors hover:bg-surface-2 ${value === option.value ? 'bg-accent-soft text-accent' : 'text-fg'}`}>
            <span className="min-w-0 flex-1 truncate">{formatFacetLabel(option.value)}</span>
            <span className="rounded-full bg-surface-2 px-1.5 py-0.5 font-mono text-[10px] text-fg-muted">{option.count}</span>
            {value === option.value && <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-accent" />}
          </button>
        ))}
        {matchingOptions.length === 0 && <p className="px-2 py-4 text-center text-xs text-fg-muted">No matching options.</p>}
      </div>
      {!query.trim() && options.length > matchingOptions.length && <p className="px-1.5 pt-1.5 text-[10px] text-fg-subtle">Search to find {options.length - matchingOptions.length} more.</p>}
    </div>
  </details>;
};

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
  const [includedGameIds, setIncludedGameIds] = useState(() => new Set(initialQuery?.get('ids')?.split(',').filter(Boolean) || []));
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

  const modeOptions = useMemo(() => buildFacetOptions(games, (game) => game.modes || []), [games]);
  const tagOptions = useMemo(() => buildFacetOptions(games, (game) => game.tags || []), [games]);
  const inputOptions = useMemo(() => buildFacetOptions(games, (game) => game.inputs || []), [games]);
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
    if (includedGameIds.size) params.set('ids', [...includedGameIds].join(','));
    if (moodFilter) params.set('mood', moodFilter);
    if (searchQuery.trim()) params.set('q', searchQuery.trim());
    const nextHash = `#/browse${params.size ? `?${params.toString()}` : ''}`;
    if (window.location.hash !== nextHash) {
      window.history.replaceState({ ...(window.history.state || {}), apexRoute: nextHash }, '', nextHash);
    }
  }, [modeFilter, sessionFilter, playersFilter, inputFilter, tagFilter, selectedCategory, includedGameIds, moodFilter, searchQuery]);

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
      if (includedGameIds.size && !includedGameIds.has(game.id)) return false;

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
  }, [games, includedGameIds, searchQuery, selectedCategory, tagFilter, activeFilter, favorites, playersFilter, eraFilter, modeFilter, sessionFilter, sortBy, stats.recentSessions, inputFilter, moodFilter]);

  const handleSurpriseMe = () => {
    const pool = filteredGames.length > 0 ? filteredGames : games;
    const randomGame = pool[Math.floor(Math.random() * pool.length)];
    if (randomGame) {
      onLaunchGame(randomGame);
    }
  };

  return (
    <section id="catalog" className="w-full max-w-7xl scroll-mt-20 mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
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
              onClick={() => { setSelectedCategory(cat.id); setIncludedGameIds(new Set()); }}
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
        <div className="min-w-0 text-[10px] font-mono uppercase tracking-wider text-fg-muted">Mode
          <div className="mt-1 normal-case tracking-normal"><CompactFacetPicker id="mode-facet" label="Mode" value={modeFilter} emptyValue="all" emptyLabel="Any mode" options={modeOptions} onChange={setModeFilter} /></div>
        </div>
        <div className="min-w-0 text-[10px] font-mono uppercase tracking-wider text-fg-muted">Input
          <div className="mt-1 normal-case tracking-normal"><CompactFacetPicker id="input-facet" label="Input" value={inputFilter} emptyValue="" emptyLabel="Any input" options={inputOptions} onChange={setInputFilter} /></div>
        </div>
        <div className="min-w-0 text-[10px] font-mono uppercase tracking-wider text-fg-muted">Tag
          <div className="mt-1 normal-case tracking-normal"><CompactFacetPicker id="tag-facet" label="Tag" value={tagFilter} emptyValue="all" emptyLabel="Any tag" options={tagOptions} onChange={setTagFilter} /></div>
        </div>
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
