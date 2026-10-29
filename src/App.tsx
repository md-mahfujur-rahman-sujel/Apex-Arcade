import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from 'motion/react';
import { GAMES_DATA } from './data/gamesData';
import { GameInfo, PlayerStats } from './types/game';
import { getStoredStats, toggleFavoriteGame, resetAllStats, resetAllProfileData, saveProfile, exportStats, importStats } from './services/storageService';
import { audio } from './services/audioSynthesizer';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { GameDossierModal } from './components/GameDossierModal';
import { PlayableTheaterModal } from './components/PlayableTheaterModal';
import { AppRoute, closePlayRoute, navigate, readRoute, subscribeToRoute } from './router';
import { BrowsePage, CollectionsPage, GamePage, HomePage, NotFoundPage, ProfilePage, QuestsPage, UtilityPage } from './pages/AppPages';
import { SettingsPage } from './pages/SettingsPage';
import { getMetaState, initializeMetaQuests, subscribeToMeta } from './services/metaService';
import { getMotionDurationSeconds, motionEase } from './services/motion';
import { AppPreferences, getAppPreferences, saveAppPreferences } from './services/preferencesService';

export default function App() {
  const [preferences, setPreferences] = useState<AppPreferences>(getAppPreferences);
  const reduceMotion = useReducedMotion() || preferences.reducedMotion;
  const [stats, setStats] = useState<PlayerStats>(getStoredStats());
  const [metaState, setMetaState] = useState(getMetaState);
  const [selectedGameForDossier, setSelectedGameForDossier] = useState<GameInfo | null>(null);
  const [route, setRoute] = useState<AppRoute>(() => readRoute());
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isMuted, setIsMuted] = useState<boolean>(audio.isMuted());
  const [waitingServiceWorker, setWaitingServiceWorker] = useState<ServiceWorker | null>(null);
  const [systemPrefersLight, setSystemPrefersLight] = useState<boolean>(() =>
    window.matchMedia('(prefers-color-scheme: light)').matches,
  );
  const isLightTheme = preferences.theme === 'light' || (preferences.theme === 'system' && systemPrefersLight);

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
  }, [isLightTheme]);

  useEffect(() => {
    audio.setVolume(preferences.sfxVolume);
    document.documentElement.dataset.colourBlind = preferences.colourBlindPalette;
    document.documentElement.dataset.particleLevel = preferences.particleLevel;
  }, [preferences]);

  const handleCycleTheme = () => {
    const theme = preferences.theme === 'system' ? 'light' : preferences.theme === 'light' ? 'dark' : 'system';
    setPreferences(saveAppPreferences({ ...preferences, theme }));
  };

  // Reload stats from localStorage
  const refreshStats = useCallback(() => {
    setStats(getStoredStats());
    setMetaState(getMetaState());
  }, []);

  useEffect(() => subscribeToMeta(setMetaState), []);

  useEffect(() => {
    initializeMetaQuests();
    setMetaState(getMetaState());
  }, []);

  useEffect(() => {
    const syncPreferences = () => setPreferences(getAppPreferences());
    window.addEventListener('apex:preferences-changed', syncPreferences);
    return () => window.removeEventListener('apex:preferences-changed', syncPreferences);
  }, []);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return;
    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    const hadController = Boolean(navigator.serviceWorker.controller);
    const exposeWaitingWorker = () => {
      if (!disposed && registration?.waiting && navigator.serviceWorker.controller) {
        setWaitingServiceWorker(registration.waiting);
      }
    };
    const register = async () => {
      try {
        registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
        exposeWaitingWorker();
        registration.addEventListener('updatefound', () => {
          const installing = registration?.installing;
          installing?.addEventListener('statechange', exposeWaitingWorker);
        });
        if (hadController) {
          await registration.update();
          exposeWaitingWorker();
        }
      } catch (error) {
        console.warn('Apex Arcade offline support could not be enabled.', error);
      }
    };
    if (document.readyState === 'complete') void register();
    else window.addEventListener('load', register, { once: true });
    return () => {
      disposed = true;
      window.removeEventListener('load', register);
    };
  }, []);

  const applyServiceWorkerUpdate = () => {
    if (!waitingServiceWorker) return;
    const reloadAfterActivation = () => window.location.reload();
    navigator.serviceWorker.addEventListener('controllerchange', reloadAfterActivation, { once: true });
    waitingServiceWorker.postMessage({ type: 'APEX_SKIP_WAITING' });
  };

  const handleToggleFavorite = (gameId: string) => {
    const updated = toggleFavoriteGame(gameId);
    setStats(updated);
  };

  const handleStatsReset = () => {
    const updated = resetAllStats();
    setStats(updated);
  };

  const handleProfileReset = () => {
    const updated = resetAllProfileData();
    setStats(updated);
    setMetaState(getMetaState());
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
  const pageKey = route.type === 'game' || route.type === 'play' ? `${route.type}:${route.id}` : route.type;
  const activeStartLevel = route.type === 'play' ? Math.max(1, Number(route.query.get('level')) || 1) : 1;
  const activeStartSeed = route.type === 'play' && route.query.has('seed') ? Number(route.query.get('seed')) : undefined;
  const catalogProps = { games: GAMES_DATA, stats, favorites: stats.favorites, onToggleFavorite: handleToggleFavorite, onLaunchGame: handleLaunchGame, onOpenDossier: handleOpenDossier, activeFilter, onFilterChange: setActiveFilter };
  const telemetryProps = {
    stats,
    preferredTier: preferences.particleLevel,
    onPreferredTierChange: (tier: AppPreferences['particleLevel']) => setPreferences(saveAppPreferences({ ...preferences, particleLevel: tier })),
  };
  const profileProps = {
    stats, meta: metaState, games: GAMES_DATA,
    onSelectGame: handleSelectGameById,
    onStatsReset: handleStatsReset,
    onSaveName: (name: string) => setStats(saveProfile({ name, avatarSeed: stats.profile?.avatarSeed || 17 })),
    onExport: () => { const blob = new Blob([exportStats()], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'apex-arcade-save.json'; link.click(); URL.revokeObjectURL(url); },
    onImport: (raw: string) => { const imported = importStats(raw); if (imported) setStats(imported); return Boolean(imported); },
  };
  const showHome = () => navigate({ type: 'home' });
  const openBrowse = () => {
    if (route.type === 'home') {
      document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    navigate({ type: 'browse', query: new URLSearchParams() });
  };
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
        themePreference={preferences.theme}
        onToggleTheme={handleCycleTheme}
      />

      <main className="flex-1">
        <AnimatePresence mode="wait" initial={false}>
          <m.div
            key={pageKey}
            data-app-page={route.type}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 1 } : { opacity: 0, y: -4 }}
            transition={{ duration: reduceMotion ? 0 : getMotionDurationSeconds('base'), ease: motionEase }}
          >
            {route.type === 'home' && <HomePage games={GAMES_DATA} stats={stats} onLaunchGame={handleLaunchGame} onExplore={openBrowse} catalog={catalogProps} telemetry={telemetryProps} about />}
            {route.type === 'browse' && <BrowsePage catalog={{ ...catalogProps, initialQuery: route.query }} />}
            {route.type === 'game' && <GamePage game={GAMES_DATA.find((game) => game.id === route.id)} games={GAMES_DATA} stats={stats} onPlay={handleLaunchGame} onBrowse={openBrowse} />}
            {route.type === 'profile' && <ProfilePage profile={profileProps} />}
            {route.type === 'quests' && <QuestsPage meta={metaState} />}
            {route.type === 'collections' && <CollectionsPage games={GAMES_DATA} slug={route.slug} onPlay={handleLaunchGame} />}
            {route.type === 'settings' && <SettingsPage preferences={preferences} onPreferencesChange={(next) => setPreferences(saveAppPreferences(next))} onExport={profileProps.onExport} onImport={profileProps.onImport} onResetProgress={handleProfileReset} />}
            {route.type === 'not-found' && <NotFoundPage onHome={showHome} />}
          </m.div>
        </AnimatePresence>
      </main>

      {/* Clean Footer */}
      <Footer />

      {waitingServiceWorker && <aside role="status" aria-live="polite" className="fixed bottom-4 right-4 z-[90] flex max-w-sm items-center gap-4 rounded-2xl border border-line bg-surface p-4 text-fg shadow-card">
        <p className="text-sm">An Apex Arcade update is ready.</p>
        <button type="button" onClick={applyServiceWorkerUpdate} className="min-h-10 shrink-0 rounded-xl bg-accent px-4 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Refresh</button>
      </aside>}

      {/* Game Dossier Deep-Dive Modal */}
      <AnimatePresence>
        {selectedGameForDossier && <m.div key="dossier" className="fixed inset-0 z-[60]" initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.985 }} animate={{ opacity: 1, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.985 }} transition={{ duration: reduceMotion ? 0 : getMotionDurationSeconds('base'), ease: motionEase }}>
          <GameDossierModal game={selectedGameForDossier} onClose={handleCloseDossier} onLaunchGame={handleLaunchGame} levelProgress={stats.levelProgress?.[selectedGameForDossier.id] || 0} />
        </m.div>}
      </AnimatePresence>

      {/* Playable 2.5D Game Theater Modal */}
      <AnimatePresence>
      {activePlayableGame && <m.div key="theater" className="fixed inset-0 z-[70]" initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.99 }} animate={{ opacity: 1, scale: 1 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.99 }} transition={{ duration: reduceMotion ? 0 : getMotionDurationSeconds('base'), ease: motionEase }}>
      <PlayableTheaterModal
        game={activePlayableGame}
        defaultPreferences={preferences}
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
