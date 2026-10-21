import React, { useState, useEffect, useRef } from 'react';
import { GameInfo, DifficultySetting } from '../types/game';
import { CyberFlapEngine } from './engines/CyberFlapEngine';
import { HoloPongEngine } from './engines/HoloPongEngine';
import { QuantumSnakeEngine } from './engines/QuantumSnakeEngine';
import { SpaceInvadersEngine } from './engines/SpaceInvadersEngine';
import { AsteroidsCoreEngine } from './engines/AsteroidsCoreEngine';
import { IsoTetrisEngine } from './engines/IsoTetrisEngine';
import { PrecisionPlatformerEngine } from './engines/PrecisionPlatformerEngine';
import { PacMazeEngine } from './engines/PacMazeEngine';
import { SonicSpeedwayEngine } from './engines/SonicSpeedwayEngine';
import { StreetBrawlerEngine } from './engines/StreetBrawlerEngine';
import { ChronoBattleEngine } from './engines/ChronoBattleEngine';
import { ActionCombatEngine } from './engines/ActionCombatEngine';
import { saveSessionScore } from '../services/storageService';
import { audio } from '../services/audioSynthesizer';
import {
  X,
  Pause,
  Play,
  Volume2,
  VolumeX,
  RotateCcw,
  Flame,
  Sparkles,
  ExternalLink,
  Maximize2,
  Gamepad2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  RotateCw,
} from 'lucide-react';

interface PlayableTheaterModalProps {
  game: GameInfo | null;
  highScore: number;
  onClose: () => void;
  onStatsUpdated: () => void;
}

export const PlayableTheaterModal: React.FC<PlayableTheaterModalProps> = ({
  game,
  onClose,
  onStatsUpdated,
}) => {
  const [difficulty, setDifficulty] = useState<DifficultySetting>('normal');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(audio.isMuted());
  const [, setCurrentScore] = useState(0);
  const sessionStartRef = useRef(Date.now());
  const [engineKey, setEngineKey] = useState(0);
  const [viewMode, setViewMode] = useState<'2.5d' | 'classic'>('classic');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showVirtualControls, setShowVirtualControls] = useState(false);
  const [dismissRotateTip, setDismissRotateTip] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Auto-detect touch device to enable virtual controls by default
  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' &&
      ('ontouchstart' in window || (navigator && navigator.maxTouchPoints > 0) || window.innerWidth < 800);
    setShowVirtualControls(isTouch);
  }, []);

  useEffect(() => {
    // Reset state on game open
    setIsPaused(false);
    setCurrentScore(0);
    setEngineKey((k) => k + 1);
    setViewMode('classic');
    sessionStartRef.current = Date.now();
  }, [game]);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.data?.type === 'CLOSE_THEATER') {
        onClose();
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [onClose]);

  if (!game) return null;

  const handleScoreUpdate = (score: number) => {
    const finalVal = difficulty === 'hard' ? Math.floor(score * 1.25) : score;
    setCurrentScore(finalVal);
  };

  const handleGameOver = (finalScore: number) => {
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 1000));
    const scoredVal = difficulty === 'hard' ? Math.floor(finalScore * 1.25) : finalScore;
    saveSessionScore(game.id, game.title, scoredVal, elapsedSeconds);
    onStatsUpdated();
  };

  const handleRestart = () => {
    setEngineKey((k) => k + 1);
    setCurrentScore(0);
    setIsPaused(false);
    sessionStartRef.current = Date.now();
    audio.playClick();
    if (viewMode === 'classic' && iframeRef.current) {
      iframeRef.current.src = `${game.htmlPath}?diff=${difficulty}&r=${Date.now()}`;
    }
  };

  const handleDifficultyChange = (newDiff: DifficultySetting) => {
    setDifficulty(newDiff);
    setEngineKey((k) => k + 1);
    setCurrentScore(0);
    audio.playClick();
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'SET_DIFFICULTY', difficulty: newDiff }, '*');
    } catch (e) {}
  };

  const toggleSound = () => {
    const next = audio.toggleMute();
    setIsMuted(next);
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Virtual Key Dispatcher for mobile touch controls
  const dispatchVirtualKey = (key: string, action: 'down' | 'up') => {
    // 1. Post to iframe
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'KEY_EVENT',
          key,
          action,
        },
        '*'
      );
    } catch (e) {}

    // 2. Dispatch synthetic key event to iframe contentDocument if accessible
    try {
      const doc = iframeRef.current?.contentDocument;
      if (doc) {
        doc.dispatchEvent(
          new KeyboardEvent(action === 'down' ? 'keydown' : 'keyup', {
            key,
            code: key === ' ' ? 'Space' : key === 'Enter' ? 'Enter' : key,
            bubbles: true,
            cancelable: true,
          })
        );
      }
    } catch (e) {}

    // 3. Dispatch to window for 2.5D engines
    window.dispatchEvent(
      new KeyboardEvent(action === 'down' ? 'keydown' : 'keyup', {
        key,
        code: key === ' ' ? 'Space' : key === 'Enter' ? 'Enter' : key,
        bubbles: true,
      })
    );
  };

  const dispatchReachDelta = (delta: number) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'REACH_DELTA',
          delta,
        },
        '*'
      );
    } catch (e) {}
  };

  const renderEngine = () => {
    const commonProps = {
      key: `${game.id}-${engineKey}`,
      isPaused,
      onScoreUpdate: handleScoreUpdate,
      onGameOver: handleGameOver,
      difficulty,
    };

    switch (game.playableEngineId) {
      case 'cyber-flap':
        return <CyberFlapEngine {...commonProps} />;
      case 'holo-pong':
        return <HoloPongEngine {...commonProps} />;
      case 'quantum-snake':
        return <QuantumSnakeEngine {...commonProps} />;
      case 'space-invaders':
        return <SpaceInvadersEngine {...commonProps} />;
      case 'asteroids-core':
        return <AsteroidsCoreEngine {...commonProps} />;
      case 'iso-tetris':
        return <IsoTetrisEngine {...commonProps} />;
      case 'pac-maze':
        return <PacMazeEngine {...commonProps} />;
      case 'sonic-speedway':
        return <SonicSpeedwayEngine {...commonProps} />;
      case 'street-brawler':
        return <StreetBrawlerEngine {...commonProps} />;
      case 'chrono-battle':
        return <ChronoBattleEngine {...commonProps} />;
      case 'precision-platformer':
        return <PrecisionPlatformerEngine {...commonProps} variant={game.variant || 'celeste'} />;
      case 'action-combat':
        return <ActionCombatEngine {...commonProps} variant={game.variant || 'hollow'} />;
      default:
        return (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <Sparkles className="w-8 h-8 text-cyan-400 mb-2 animate-bounce" />
            <p className="text-sm font-semibold text-white">Full Tribute Edition Ready</p>
            <p className="text-xs text-slate-400 mt-1 max-w-md">
              Switching to the dedicated authentic game shell for {game.title}.
            </p>
          </div>
        );
    }
  };

  return (
    <div
      id="playable-theater-modal"
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-2 md:p-4 bg-black/95 backdrop-blur-2xl overflow-hidden"
    >
      <div
        ref={containerRef}
        className={`relative w-full ${
          isFullscreen ? 'h-full max-w-none' : 'max-w-6xl h-full sm:h-[94vh] max-h-[100dvh]'
        } bg-[#0A0D18] border-0 sm:border border-white/10 rounded-none sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all`}
      >
        {/* Top Control Bar (Responsive Flexbox) */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-[#070913] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-semibold">
                  {viewMode === '2.5d' ? '3D Isometric Engine' : 'Full Tribute Edition'}
                </span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-slate-300 font-mono">
                  {game.year}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight truncate max-w-[160px] xs:max-w-[220px] sm:max-w-xs md:max-w-sm">
                {game.title}
              </h2>
            </div>
          </div>

          {/* Engine Mode Toggle (if both exist) */}
          {game.playableEngineId && game.htmlPath && (
            <div className="hidden xs:flex items-center p-0.5 bg-black/40 rounded-xl border border-white/10 text-xs shrink-0">
              <button
                onClick={() => {
                  setViewMode('classic');
                  audio.playClick();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer min-h-[32px] ${
                  viewMode === 'classic'
                    ? 'bg-emerald-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>Tribute</span>
              </button>
              <button
                onClick={() => {
                  setViewMode('2.5d');
                  audio.playClick();
                }}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer min-h-[32px] ${
                  viewMode === '2.5d'
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3 h-3" />
                <span>3D</span>
              </button>
            </div>
          )}

          {/* Difficulty Level Selector */}
          <div className="flex items-center gap-1 p-0.5 bg-[#131826] rounded-xl border border-white/10 shrink-0">
            {(['easy', 'normal', 'hard'] as DifficultySetting[]).map((d) => (
              <button
                key={d}
                onClick={() => handleDifficultyChange(d)}
                className={`px-2 py-0.5 sm:py-1 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors capitalize cursor-pointer min-h-[30px] ${
                  difficulty === d
                    ? d === 'easy'
                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                      : d === 'normal'
                      ? 'bg-cyan-500 text-slate-950 shadow-sm'
                      : 'bg-rose-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {d}
              </button>
            ))}
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Toggle Virtual Touch Controls button */}
            <button
              onClick={() => setShowVirtualControls(!showVirtualControls)}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                showVirtualControls
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
              title="Toggle Virtual Touch Controls"
            >
              <Gamepad2 className="w-4 h-4" />
            </button>

            {game.htmlPath && (
              <a
                href={game.htmlPath}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                title="Open in new window"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}

            <button
              onClick={handleToggleFullscreen}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Toggle Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={handleRestart}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Restart Game"
            >
              <RotateCcw className="w-4 h-4" />
            </button>

            {viewMode === '2.5d' && (
              <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? <Play className="w-4 h-4 text-cyan-400" /> : <Pause className="w-4 h-4" />}
                </button>
                <button
                  onClick={toggleSound}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Close Theater"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Orientation Tip for Portrait Mobile */}
        {!dismissRotateTip && (
          <div className="xs:hidden bg-cyan-950/40 border-b border-cyan-500/20 px-3 py-1 flex items-center justify-between text-[11px] text-cyan-300">
            <span className="flex items-center gap-1.5">
              <RotateCw className="w-3 h-3 text-cyan-400 animate-spin" />
              <span>Rotate device to landscape for full arcade theater</span>
            </span>
            <button
              onClick={() => setDismissRotateTip(true)}
              className="text-slate-400 hover:text-white p-1 text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stage Container (Responsive height on mobile/tablet/desktop) */}
        <div className="relative flex-1 p-0 sm:p-2 md:p-3 flex flex-col items-center justify-center bg-[#05060D] overflow-hidden">
          {viewMode === '2.5d' && game.playableEngineId ? (
            renderEngine()
          ) : game.htmlPath ? (
            <div className="w-full h-full flex-1 flex flex-col items-center justify-center">
              <iframe
                ref={iframeRef}
                src={`${game.htmlPath}?diff=${difficulty}`}
                title={game.title}
                className="w-full h-full min-h-[320px] rounded-none sm:rounded-xl border-0 sm:border border-white/10 bg-black shadow-2xl"
                allow="gamepad; fullscreen; autoplay; clipboard-write; focus-without-user-activation"
                tabIndex={0}
                onLoad={() => {
                  try {
                    iframeRef.current?.focus();
                    iframeRef.current?.contentWindow?.focus();
                    iframeRef.current?.contentWindow?.postMessage({ type: 'SET_DIFFICULTY', difficulty }, '*');
                  } catch (e) {}
                }}
              />
            </div>
          ) : (
            renderEngine()
          )}

          {/* Virtual Touch Controls Overlay for Mobile & Tablets */}
          {showVirtualControls && (
            <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between pointer-events-none z-30 select-none pb-[env(safe-area-inset-bottom)]">
              {/* Left Side: 4-Way Virtual D-Pad */}
              <div className="pointer-events-auto bg-[#070B18]/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl grid grid-cols-3 gap-1">
                <div />
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('arrowup', 'down');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('arrowup', 'up');
                  }}
                  onPointerLeave={() => dispatchVirtualKey('arrowup', 'up')}
                  aria-label="Up"
                  className="w-11 h-11 bg-white/10 active:bg-cyan-500/40 rounded-xl flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
                >
                  <ArrowUp className="w-5 h-5 text-cyan-300" />
                </button>
                <div />

                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('arrowleft', 'down');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('arrowleft', 'up');
                  }}
                  onPointerLeave={() => dispatchVirtualKey('arrowleft', 'up')}
                  aria-label="Left"
                  className="w-11 h-11 bg-white/10 active:bg-cyan-500/40 rounded-xl flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5 text-cyan-300" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('arrowdown', 'down');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('arrowdown', 'up');
                  }}
                  onPointerLeave={() => dispatchVirtualKey('arrowdown', 'up')}
                  aria-label="Down"
                  className="w-11 h-11 bg-white/10 active:bg-cyan-500/40 rounded-xl flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
                >
                  <ArrowDown className="w-5 h-5 text-cyan-300" />
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('arrowright', 'down');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('arrowright', 'up');
                  }}
                  onPointerLeave={() => dispatchVirtualKey('arrowright', 'up')}
                  aria-label="Right"
                  className="w-11 h-11 bg-white/10 active:bg-cyan-500/40 rounded-xl flex items-center justify-center text-white active:scale-90 transition-transform cursor-pointer"
                >
                  <ArrowRight className="w-5 h-5 text-cyan-300" />
                </button>
              </div>

              {/* Right Side: Virtual Action Buttons */}
              <div className="pointer-events-auto bg-[#070B18]/80 backdrop-blur-md p-2 rounded-2xl border border-white/10 shadow-2xl flex items-center gap-2">
                {/* For 3D / Table tennis: Reach adjustments */}
                <div className="flex flex-col gap-1 mr-1">
                  <button
                    type="button"
                    onClick={() => dispatchReachDelta(0.1)}
                    className="w-9 h-9 bg-white/5 active:bg-cyan-500/30 rounded-lg flex items-center justify-center text-slate-300 active:scale-90 transition-transform cursor-pointer"
                    title="Reach Forward (+)"
                  >
                    <Plus className="w-4 h-4 text-cyan-400" />
                  </button>
                  <button
                    type="button"
                    onClick={() => dispatchReachDelta(-0.1)}
                    className="w-9 h-9 bg-white/5 active:bg-cyan-500/30 rounded-lg flex items-center justify-center text-slate-300 active:scale-90 transition-transform cursor-pointer"
                    title="Reach Back (-)"
                  >
                    <Minus className="w-4 h-4 text-cyan-400" />
                  </button>
                </div>

                {/* Primary Action Button (Space / Hit / Jump) */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey(' ', 'down');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey(' ', 'up');
                  }}
                  onPointerLeave={() => dispatchVirtualKey(' ', 'up')}
                  className="w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-br from-cyan-400 to-blue-600 active:from-cyan-300 active:to-blue-500 text-slate-950 font-bold rounded-2xl shadow-lg flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer"
                >
                  <span className="text-sm font-extrabold font-mono">ACT</span>
                  <span className="text-[9px] opacity-80">Space</span>
                </button>

                {/* Secondary Action Button (Enter / Serve / Swing) */}
                <button
                  type="button"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('enter', 'down');
                  }}
                  onPointerUp={(e) => {
                    e.preventDefault();
                    dispatchVirtualKey('enter', 'up');
                  }}
                  onPointerLeave={() => dispatchVirtualKey('enter', 'up')}
                  className="w-13 h-13 sm:w-14 sm:h-14 bg-gradient-to-br from-emerald-400 to-teal-600 active:from-emerald-300 active:to-teal-500 text-slate-950 font-bold rounded-2xl shadow-lg flex flex-col items-center justify-center active:scale-90 transition-transform cursor-pointer"
                >
                  <span className="text-sm font-extrabold font-mono">SEC</span>
                  <span className="text-[9px] opacity-80">Enter</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Helper Bar (Responsive layout) */}
        <div className="px-3 sm:px-6 py-2 sm:py-2.5 bg-[#070913] border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium text-slate-300 truncate text-[11px] sm:text-xs">
              {game.controlsSummary}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] sm:text-[11px] shrink-0">
            <Flame className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>
              {difficulty === 'easy'
                ? 'Easy: 0.8x Speed'
                : difficulty === 'normal'
                ? 'Normal: 1.0x Speed'
                : 'Hard: 1.35x Speed · 1.25x Score!'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
