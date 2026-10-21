import React, { useState, useEffect, useCallback } from 'react';
import { GAMES_DATA } from './data/gamesData';
import { GameInfo, PlayerStats } from './types/game';
import { getStoredStats, toggleFavoriteGame, resetAllStats } from './services/storageService';
import { audio } from './services/audioSynthesizer';
import { Navbar } from './components/Navbar';
import { HeroAnthology } from './components/HeroAnthology';
import { GameCatalog } from './components/GameCatalog';
import { TelemetryDashboard } from './components/TelemetryDashboard';
import { AboutAnthology } from './components/AboutAnthology';
import { Footer } from './components/Footer';
import { GameDossierModal } from './components/GameDossierModal';
import { PlayableTheaterModal } from './components/PlayableTheaterModal';

export default function App() {
  const [stats, setStats] = useState<PlayerStats>(getStoredStats());
  const [selectedGameForDossier, setSelectedGameForDossier] = useState<GameInfo | null>(null);
  const [activePlayableGame, setActivePlayableGame] = useState<GameInfo | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  const [isMuted, setIsMuted] = useState<boolean>(audio.isMuted());

  // Reload stats from localStorage
  const refreshStats = useCallback(() => {
    setStats(getStoredStats());
  }, []);

  const handleToggleFavorite = (gameId: string) => {
    const updated = toggleFavoriteGame(gameId);
    setStats(updated);
    audio.playClick();
  };

  const handleStatsReset = () => {
    const updated = resetAllStats();
    setStats(updated);
    audio.playClick();
  };

  const handleLaunchGame = (game: GameInfo) => {
    setActivePlayableGame(game);
    audio.playClick();
  };

  const handleQuickPlayRandom = () => {
    if (GAMES_DATA.length > 0) {
      const randomGame = GAMES_DATA[Math.floor(Math.random() * GAMES_DATA.length)];
      setActivePlayableGame(randomGame);
      audio.playClick();
    }
  };

  const handleSelectGameById = (gameId: string) => {
    const found = GAMES_DATA.find((g) => g.id === gameId);
    if (found) {
      setActivePlayableGame(found);
      audio.playClick();
    }
  };

  const handleToggleMute = () => {
    const next = audio.toggleMute();
    setIsMuted(next);
  };

  return (
    <div className="min-h-screen bg-[#08090E] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-black">
      {/* Top Bar (adheres strictly to 3-zone contract) */}
      <Navbar
        onQuickPlay={handleQuickPlayRandom}
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
      />

      <main className="flex-1">
        {/* Editorial Hero */}
        <HeroAnthology
          onExplore={() => {
            const el = document.getElementById('catalog');
            el?.scrollIntoView({ behavior: 'smooth' });
          }}
          onPlayFeatured={() => {
            const flappy = GAMES_DATA.find((g) => g.id === 'flappy-bird');
            if (flappy) handleLaunchGame(flappy);
          }}
        />

        {/* Games Catalog */}
        <GameCatalog
          games={GAMES_DATA}
          favorites={stats.favorites}
          onToggleFavorite={handleToggleFavorite}
          onLaunchGame={handleLaunchGame}
          onOpenDossier={(game) => setSelectedGameForDossier(game)}
          activeFilter={activeFilter}
          onFilterChange={setActiveFilter}
        />

        {/* Interactive Telemetry & Chart Visualizations */}
        <TelemetryDashboard
          stats={stats}
          onStatsReset={handleStatsReset}
          onSelectGame={handleSelectGameById}
        />

        {/* Technical Architecture & Client-Side Philosophy */}
        <AboutAnthology />
      </main>

      {/* Clean Footer */}
      <Footer />

      {/* Game Dossier Deep-Dive Modal */}
      <GameDossierModal
        game={selectedGameForDossier}
        onClose={() => setSelectedGameForDossier(null)}
        onLaunchGame={handleLaunchGame}
      />

      {/* Playable 2.5D Game Theater Modal */}
      <PlayableTheaterModal
        game={activePlayableGame}
        highScore={activePlayableGame ? stats.highScores[activePlayableGame.id] || 0 : 0}
        onClose={() => setActivePlayableGame(null)}
        onStatsUpdated={refreshStats}
      />
    </div>
  );
}
