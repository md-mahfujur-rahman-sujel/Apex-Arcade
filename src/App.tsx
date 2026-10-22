import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { GAMES_DATA } from './data/gamesData';
import { GameInfo, PlayerStats } from './types/game';
import { getStoredStats, toggleFavoriteGame, resetAllStats, saveProfile, exportStats, importStats } from './services/storageService';
import { audio } from './services/audioSynthesizer';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { GameDossierModal } from './components/GameDossierModal';
import { PlayableTheaterModal } from './components/PlayableTheaterModal';
import { AppRoute, closePlayRoute, navigate, readRoute, subscribeToRoute } from './router';
import { BrowsePage, GamePage, HomePage, NotFoundPage, ProfilePage, UtilityPage } from './pages/AppPages';
import { getMetaState, subscribeToMeta } from './services/metaService';

type ThemePreference = 'system' | 'light' | 'dark';

const readThemePreference = (): ThemePreference => {
  try {
    const stored = window.localStorage.getItem('apex-arcade-theme');
    if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  } catch { /* Fall back to the system preference when storage is unavailable. */ }
  return 'system';
};

export default function App() {
  const reduceMotion = useReducedMotion();
  const [stats, setStats] = useState<PlayerStats>(getStoredStats());
  const [metaState, setMetaState] = useState(getMetaState);
  const [selectedGameForDossier, setSelectedGameForDossier] = useState<GameInfo | null>(null);
  const [route, setRoute] = useState<AppRoute>(() => readRoute());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isMuted, setIsMuted] = useState<boolean>(audio.isMuted());
  const [themePreference, setThemePreference] = useState<ThemePreference>(readThemePreference);
  const [systemPrefersLight, setSystemPrefersLight] = useState<boolean>(() =>
    window.matchMedia('(prefers-color-scheme: light)').matches,
  );
  const isLightTheme = themePreference === 'light' || (themePreference === 'system' && systemPrefersLight);

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: light)');
    const syncSystemPreference = (event: MediaQueryListEvent) => setSystemPrefersLight(event.matches);
    setSystemPrefersLight(media.matches);
    media.addEventListener('change', syncSystemPreference);
    return () => media.removeEventListener('change', syncSystemPreference);
  }, []);

  useEffect(() => {
    const theme = isLightTheme ? 'light' : 'dark';
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (themeColor) themeColor.content = isLightTheme ? '#f2f1ed' : '#08090e';
    try { window.localStorage.setItem('apex-arcade-theme', themePreference); } catch { /* Theme still works for this session. */ }
  }, [isLightTheme, themePreference]);

  const handleCycleTheme = () => {
    setThemePreference((preference) =>
      preference === 'system' ? 'light' : preference === 'light' ? 'dark' : 'system',
    );
  };

  // Reload stats from localStorage
  const refreshStats = useCallback(() => {
    setStats(getStoredStats());
    setMetaState(getMetaState());
  }, []);

  useEffect(() => subscribeToMeta(setMetaState), []);

  const handleToggleFavorite = (gameId: string) => {
    const updated = toggleFavoriteGame(gameId);
    setStats(updated);
  };

  const handleStatsReset = () => {
    const updated = resetAllStats();
    setStats(updated);
  };

  const handleLaunchGame = (game: GameInfo, startLevel = 1, seed?: number) => {
    const query = new URLSearchParams(startLevel > 1 ? { level: String(startLevel) } : {});
    if (seed !== undefined) query.set('seed', String(seed));
    navigate({ type: 'play', id: game.id, query });
    audio.playOpen();
  };

  const handleQuickPlayRandom = () => {
    if (GAMES_DATA.length > 0) {
      const randomGame = GAMES_DATA[Math.floor(Math.random() * GAMES_DATA.length)];
      handleLaunchGame(randomGame);
    }
  };

  const handleSelectGameById = (gameId: string) => {
    const found = GAMES_DATA.find((g) => g.id === gameId);
    if (found) handleLaunchGame(found);
  };

  const handleToggleMute = () => {
    const next = audio.toggleMute();
    setIsMuted(next);
  };

  const handleOpenDossier = (game: GameInfo) => {
    setSelectedGameForDossier(game);
    audio.playOpen();
  };

  const handleCloseDossier = () => {
    setSelectedGameForDossier(null);
    audio.playClose();
  };

  const handleCloseTheater = () => {
    closePlayRoute();
    audio.playClose();
  };

  useEffect(() => {
    return subscribeToRoute(setRoute);
  }, []);

  const activePlayableGame = route.type === 'play' ? GAMES_DATA.find((game) => game.id === route.id) || null : null;
  const activeStartLevel = route.type === 'play' ? Math.max(1, Number(route.query.get('level')) || 1) : 1;
  const activeStartSeed = route.type === 'play' && route.query.has('seed') ? Number(route.query.get('seed')) : undefined;
  const catalogProps = { games: GAMES_DATA, stats, favorites: stats.favorites, onToggleFavorite: handleToggleFavorite, onLaunchGame: handleLaunchGame, onOpenDossier: handleOpenDossier, activeFilter, onFilterChange: setActiveFilter };
  const telemetryProps = { stats, onStatsReset: handleStatsReset, onSelectGame: handleSelectGameById };
  const profileProps = {
    stats, meta: metaState, games: GAMES_DATA,
    onSaveName: (name: string) => setStats(saveProfile({ name, avatarSeed: stats.profile?.avatarSeed || 17 })),
    onExport: () => { const blob = new Blob([exportStats()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'apex-arcade-save.json'; link.click(); URL.revokeObjectURL(url); },
    onImport: (raw: string) => { const imported = importStats(raw); if (imported) setStats(imported); return Boolean(imported); },
  };
  const showHome = () => navigate({ type: 'home' });
  const openBrowse = () => navigate({ type: 'browse', query: new URLSearchParams() });
  const handleSectionNavigation = (sectionId: string, filter?: string) => {
    if (filter) { setActiveTab(filter); setActiveFilter(filter === 'playable' ? 'playable' : 'all'); }
    if (route.type !== 'home') {
      navigate({ type: 'home' });
      window.setTimeout(() => document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' }), 0);
    } else document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const onPointerOver = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Element) || target.closest('[data-sound-silent]')) return;
      if (target.closest('button, a, [role="button"]')) audio.playHover();
    };
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const control = target.closest('button, a, [role="button"]');
      if (!control || control.hasAttribute('disabled') || control.closest('[data-sound-silent], [data-game-audio]') || control.hasAttribute('data-ui-open') || control.hasAttribute('data-ui-close')) return;
      audio.playClick();
    };
    document.addEventListener('pointerover', onPointerOver);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('pointerover', onPointerOver);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return (
    <LazyMotion features={domAnimation}>
    <div className="min-h-screen bg-apex-ink text-apex-text flex flex-col font-sans">
      {/* Top Bar (adheres strictly to 3-zone contract) */}
      <Navbar
        onQuickPlay={handleQuickPlayRandom}
        onOpenProfile={() => navigate({ type: 'profile' })}
        onSectionNavigate={handleSectionNavigation}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'playable') {
            setActiveFilter('playable');
          } else {
            setActiveFilter('all');
          }
        }}
        isMuted={isMuted}
        onToggleMute={handleToggleMute}
        isLightTheme={isLightTheme}
        themePreference={themePreference}
        onToggleTheme={handleCycleTheme}
      />

      <main className="flex-1">
        {route.type === 'home' && <HomePage games={GAMES_DATA} stats={stats} onLaunchGame={handleLaunchGame} onExplore={openBrowse} catalog={catalogProps} telemetry={telemetryProps} about profile={profileProps} />}
        {route.type === 'browse' && <BrowsePage catalog={{ ...catalogProps, initialQuery: route.query }} />}
        {route.type === 'game' && <GamePage game={GAMES_DATA.find((game) => game.id === route.id)} games={GAMES_DATA} stats={stats} onPlay={handleLaunchGame} onBrowse={openBrowse} />}
        {route.type === 'profile' && <ProfilePage profile={profileProps} />}
        {(route.type === 'quests' || route.type === 'collections' || route.type === 'settings') && <UtilityPage kind={route.type} onHome={showHome} />}
        {route.type === 'not-found' && <NotFoundPage onHome={showHome} />}
      </main>

      {/* Clean Footer */}
      <Footer />

      {/* Game Dossier Deep-Dive Modal */}
      <AnimatePresence>
        {selectedGameForDossier && <m.div key="dossier" className="fixed inset-0 z-[60]" initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
          <GameDossierModal game={selectedGameForDossier} onClose={handleCloseDossier} onLaunchGame={handleLaunchGame} levelProgress={stats.levelProgress?.[selectedGameForDossier.id] || 0} />
        </m.div>}
      </AnimatePresence>

      {/* Playable 2.5D Game Theater Modal */}
      <AnimatePresence>
      {activePlayableGame && <m.div key="theater" className="fixed inset-0 z-[70]" initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }} transition={{ duration: reduceMotion ? 0 : 0.24 }}>
      <PlayableTheaterModal
        game={activePlayableGame}
        startLevel={activeStartLevel}
        startSeed={activeStartSeed}
        highScore={activePlayableGame ? stats.highScores[activePlayableGame.id] || 0 : 0}
        onClose={handleCloseTheater}
        onStatsUpdated={refreshStats}
      />
      </m.div>}
      </AnimatePresence>
    </div>
    </LazyMotion>
  );
}
