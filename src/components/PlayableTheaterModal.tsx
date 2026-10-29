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
import { saveSessionScore, recordApexScore, recordApexAchievement, recordApexLevelProgress } from '../services/storageService';
import { audio } from '../services/audioSynthesizer';
import { shareOrDownloadScoreCard } from '../services/scoreCard';
import { createApexEventRateLimiter, normalizeApexEvent } from '../services/apexEvent';
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
  Settings2,
  Accessibility,
  Share2,
} from 'lucide-react';

interface PlayableTheaterModalProps {
  game: GameInfo | null;
  highScore: number;
  startLevel?: number;
  startSeed?: number;
  onClose: () => void;
  onStatsUpdated: () => void;
}

export const PlayableTheaterModal: React.FC<PlayableTheaterModalProps> = ({
  game,
  highScore,
  startLevel = 1,
  startSeed,
  onClose,
  onStatsUpdated,
}) => {
  const [difficulty, setDifficulty] = useState<DifficultySetting>('normal');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(audio.isMuted());
  const [volume, setVolume] = useState(audio.getVolume());
  const [currentScore, setCurrentScore] = useState(0);
  const [hasLaunched, setHasLaunched] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [colourBlindMode, setColourBlindMode] = useState(false);
  const [performanceTier, setPerformanceTier] = useState<'auto' | 'ultra' | 'standard' | 'lite'>('auto');
  const [isSharingScore, setIsSharingScore] = useState(false);
  const [displayPreferences, setDisplayPreferences] = useState<{ gameId: string | null; crt: boolean; pixelPerfect: boolean; ambientGlow: boolean }>({ gameId: null, crt: false, pixelPerfect: false, ambientGlow: false });
  const sessionStartRef = useRef(Date.now());
  const sessionBestRef = useRef(highScore);
  const sessionNewBestRef = useRef(false);
  const sessionEndedRef = useRef(false);
  const apexRateRef = useRef(createApexEventRateLimiter());
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
    setHasLaunched(false);
    setShowSettings(false);
    sessionStartRef.current = Date.now();
    sessionBestRef.current = highScore;
    sessionNewBestRef.current = false;
    sessionEndedRef.current = false;
    apexRateRef.current = createApexEventRateLimiter();
    const stored = game ? localStorage.getItem(`apex:theater-display:${game.id}`) : null;
    let preferences: Record<string, unknown> = {};
    try { preferences = stored ? JSON.parse(stored) : {}; } catch { preferences = {}; }
    setDisplayPreferences({ gameId: game?.id || null, crt: preferences.crt === true, pixelPerfect: preferences.pixelPerfect === true, ambientGlow: preferences.ambientGlow === true });
  }, [game, highScore]);

  useEffect(() => {
    if (game && displayPreferences.gameId === game.id) localStorage.setItem(`apex:theater-display:${game.id}`, JSON.stringify({ crt: displayPreferences.crt, pixelPerfect: displayPreferences.pixelPerfect, ambientGlow: displayPreferences.ambientGlow }));
  }, [game, displayPreferences]);

  useEffect(() => {
    const sync = () => setGamepadConnected(Array.from(navigator.getGamepads?.() || []).some((pad) => Boolean(pad?.connected)));
    sync(); window.addEventListener('gamepadconnected', sync); window.addEventListener('gamepaddisconnected', sync);
    return () => { window.removeEventListener('gamepadconnected', sync); window.removeEventListener('gamepaddisconnected', sync); };
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', sync); return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    let frame = 0; let previous = new Set<number>(); let direction = 0;
    const poll = () => {
      const pad = Array.from(navigator.getGamepads?.() || []).find((candidate) => candidate?.connected);
      if (pad && containerRef.current) {
        const movePrevious = pad.buttons[12]?.pressed || pad.buttons[14]?.pressed || pad.axes[1] < -0.65 || pad.axes[0] < -0.65;
        const moveNext = pad.buttons[13]?.pressed || pad.buttons[15]?.pressed || pad.axes[1] > 0.65 || pad.axes[0] > 0.65;
        const nextDirection = movePrevious ? -1 : moveNext ? 1 : 0;
        if (nextDirection && nextDirection !== direction) {
          const items = Array.from(containerRef.current.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]'));
          const index = items.indexOf(document.activeElement as HTMLElement);
          if (items.length) items[(index + nextDirection + items.length) % items.length]?.focus();
        }
        direction = nextDirection;
        const pressed = new Set(pad.buttons.flatMap((button, index) => button.pressed ? [index] : []));
        if ((pressed.has(0) && !previous.has(0)) || (pressed.has(9) && !previous.has(9))) (document.activeElement as HTMLElement | null)?.click?.();
        previous = pressed;
      } else { previous = new Set(); direction = 0; }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll); return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow || e.origin !== window.location.origin) return;
      if (e.data?.type === 'CLOSE_THEATER') {
        onClose();
        return;
      }
      const message = normalizeApexEvent(e.data);
      if (!message || !apexRateRef.current(Date.now()) || !game) return;
      const targetGameId = game.id;
      const { eventType, score, achievementId, durationSec, level } = message;
      window.dispatchEvent(new CustomEvent('apex:game-event', { detail: { ...message, gameId: targetGameId } }));
      if (eventType === 'session_start') {
        sessionEndedRef.current = false; sessionStartRef.current = Date.now(); sessionBestRef.current = highScore; sessionNewBestRef.current = false;
      } else if (eventType === 'score' && typeof score === 'number') {
        setCurrentScore(score); if (score > sessionBestRef.current) sessionNewBestRef.current = true; recordApexScore(targetGameId, score); onStatsUpdated();
      } else if (eventType === 'level_complete' && typeof level === 'number') {
        if (typeof score === 'number') setCurrentScore(score); recordApexLevelProgress(targetGameId, level); onStatsUpdated();
      } else if (eventType === 'achievement' && achievementId) {
        recordApexAchievement(targetGameId, achievementId); window.Meta?.recordAchievement({ id: achievementId, gameId: targetGameId }); onStatsUpdated();
      } else if (eventType === 'session_end') {
        if (sessionEndedRef.current) return;
        sessionEndedRef.current = true;
        const finalScore = score ?? 0; const elapsed = durationSec ?? Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 1000));
        if (finalScore > sessionBestRef.current) sessionNewBestRef.current = true;
        saveSessionScore(targetGameId, game.title, finalScore, elapsed);
        window.Meta?.recordSession({ gameId: targetGameId, durationSec: elapsed, newBest: sessionNewBestRef.current, category: game.category }); onStatsUpdated();
      } else if (eventType === 'result') {
        const resultScore = message.result?.score ?? score;
        if (typeof resultScore === 'number') { setCurrentScore(resultScore); recordApexScore(targetGameId, resultScore); onStatsUpdated(); }
      } else if (eventType === 'cosmetic_equip' && message.cosmetic) {
        window.Meta?.equipCosmetic(targetGameId, message.cosmetic.id);
      }
    };
    window.addEventListener('message', handleMsg);
    return () => window.removeEventListener('message', handleMsg);
  }, [onClose, game, onStatsUpdated, highScore]);

  if (!game) return null;

  const handleScoreUpdate = (score: number) => {
    const finalVal = difficulty === 'hard' ? Math.floor(score * 1.25) : score;
    setCurrentScore(finalVal);
  };

  const handleGameOver = (finalScore: number) => {
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 1000));
    const scoredVal = difficulty === 'hard' ? Math.floor(finalScore * 1.25) : finalScore;
    saveSessionScore(game.id, game.title, scoredVal, elapsedSeconds);
    window.Meta?.recordSession({ gameId: game.id, durationSec: elapsedSeconds, newBest: scoredVal > highScore, category: game.category });
    onStatsUpdated();
  };

  const handleRestart = () => {
    setEngineKey((k) => k + 1);
    setCurrentScore(0);
    setIsPaused(false);
    sessionStartRef.current = Date.now();
    audio.playClick();
    if (viewMode === 'classic' && iframeRef.current) {
      iframeRef.current.src = `${import.meta.env.BASE_URL}${game.htmlPath.replace(/^\/+/, '')}?diff=${difficulty}&level=${Math.max(1, Math.floor(startLevel))}${startSeed === undefined ? '' : `&seed=${Math.floor(startSeed)}`}&r=${Date.now()}`;
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

  const handleVolumeChange = (nextVolume: number) => { setVolume(nextVolume); audio.setVolume(nextVolume); };

  const launchGame = () => { sessionStartRef.current = Date.now(); sessionBestRef.current = highScore; sessionNewBestRef.current = false; setHasLaunched(true); };

  const handleShareScore = async () => {
    if (!game || isSharingScore) return;
    setIsSharingScore(true);
    try { await shareOrDownloadScoreCard(game, currentScore); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Could not share score card.', error); }
    finally { setIsSharingScore(false); }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
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
      data-game-id={game.id}
      data-game-number={game.gameNumber}
      data-touch-mode={game.touchControls?.mode || 'native'}
      data-theme="dark"
      data-theater
      data-crt={displayPreferences.gameId === game.id && displayPreferences.crt ? 'true' : 'false'}
      data-pixel-perfect={displayPreferences.gameId === game.id && displayPreferences.pixelPerfect ? 'true' : 'false'}
      data-ambient-glow={displayPreferences.gameId === game.id && displayPreferences.ambientGlow ? 'true' : 'false'}
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
            {game.touchControls?.mode === 'virtual' && <button
              onClick={() => setShowVirtualControls(!showVirtualControls)}
              className={`p-1.5 sm:p-2 rounded-lg transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center ${
                showVirtualControls
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
              title="Toggle Virtual Touch Controls"
              aria-pressed={showVirtualControls}
            >
              <Gamepad2 className="w-4 h-4" />
            </button>}
            <button onClick={() => setShowSettings((open) => !open)} aria-expanded={showSettings} aria-controls="theater-settings" className="p-1.5 sm:p-2 rounded-lg bg-white/5 text-slate-300" aria-label="Theater settings"><Settings2 className="h-4 w-4" /></button>
            <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-slate-500" aria-label={gamepadConnected ? 'Gamepad connected' : 'No gamepad connected'}><Gamepad2 className="h-3 w-3" />{gamepadConnected ? 'Ready' : 'No pad'}</span>
            <button onClick={handleShareScore} disabled={!hasLaunched || isSharingScore} className="p-1.5 sm:p-2 rounded-lg bg-cyan-500/10 text-cyan-300 disabled:opacity-40" aria-label="Share score"><Share2 className="h-4 w-4" /></button>

            {game.htmlPath && (
              <a
                href={`${import.meta.env.BASE_URL}${game.htmlPath.replace(/^\/+/, '')}`}
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
              aria-pressed={isFullscreen}
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

            <>
                <button
                  onClick={() => setIsPaused(!isPaused)}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title={isPaused ? 'Resume' : 'Pause'}
                  aria-label={isPaused ? 'Resume game' : 'Pause game'}
                >
                  {isPaused ? <Play className="w-4 h-4 text-cyan-400" /> : <Pause className="w-4 h-4" />}
                </button>
                {viewMode === '2.5d' && (
              <>
                <button
                  onClick={toggleSound}
                  className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                  title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
                </button>
              </>
                )}
            </>

            <button
              onClick={onClose}
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Close Theater"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showSettings && <aside id="theater-settings" aria-label="Theater settings" className="absolute right-3 top-14 z-40 w-[min(22rem,calc(100%-1.5rem))] rounded-2xl border border-white/10 bg-[#101525] p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between text-sm font-bold text-white"><span className="flex items-center gap-2">Theater settings <Accessibility className="h-4 w-4 text-cyan-300" /></span><button type="button" aria-label="Close theater settings" onClick={() => setShowSettings(false)} className="rounded-lg px-2 py-1 text-slate-300 hover:bg-white/10">Close</button></div>
          <div className="space-y-3 text-xs text-slate-300">
            <label className="flex items-center justify-between gap-3"><span>Audio</span><button type="button" onClick={toggleSound} className={`rounded-lg px-3 py-1.5 font-semibold ${isMuted ? 'bg-white/10 text-slate-300' : 'bg-cyan-400 text-slate-950'}`}>{isMuted ? 'Muted' : 'On'}</button></label>
            <label className="block"><span className="mb-1 flex justify-between"><span>Volume</span><span className="font-mono text-cyan-300">{Math.round(volume * 100)}%</span></span><input aria-label="Theater volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => handleVolumeChange(Number(event.target.value))} className="w-full accent-cyan-400" /></label>
            <label className="flex items-center justify-between"><span>Reduced motion</span><input type="checkbox" checked={reducedMotion} onChange={(event) => { setReducedMotion(event.target.checked); iframeRef.current?.contentWindow?.postMessage({ type: 'SET_ACCESSIBILITY', reducedMotion: event.target.checked, colourBlindMode, performanceTier }, '*'); }} /></label>
            <label className="flex items-center justify-between"><span>Colour-blind palette</span><input type="checkbox" checked={colourBlindMode} onChange={(event) => { setColourBlindMode(event.target.checked); iframeRef.current?.contentWindow?.postMessage({ type: 'SET_ACCESSIBILITY', reducedMotion, colourBlindMode: event.target.checked, performanceTier }, '*'); }} /></label>
            <label className="flex items-center justify-between"><span>CRT filter</span><input aria-label="CRT filter" type="checkbox" checked={displayPreferences.gameId === game.id && displayPreferences.crt} onChange={(event) => setDisplayPreferences((current) => ({ ...current, gameId: game.id, crt: event.target.checked }))} /></label>
            <label className="flex items-center justify-between"><span>Pixel-perfect scaling</span><input aria-label="Pixel-perfect scaling" type="checkbox" checked={displayPreferences.gameId === game.id && displayPreferences.pixelPerfect} onChange={(event) => setDisplayPreferences((current) => ({ ...current, gameId: game.id, pixelPerfect: event.target.checked }))} /></label>
            <label className="flex items-center justify-between"><span>Ambient glow</span><input aria-label="Ambient glow" type="checkbox" checked={displayPreferences.gameId === game.id && displayPreferences.ambientGlow} onChange={(event) => setDisplayPreferences((current) => ({ ...current, gameId: game.id, ambientGlow: event.target.checked }))} /></label>
            <label className="flex items-center justify-between"><span>Performance tier</span><select value={performanceTier} onChange={(event) => { const tier = event.target.value as typeof performanceTier; setPerformanceTier(tier); iframeRef.current?.contentWindow?.postMessage({ type: 'SET_PERF_TIER', tier: tier === 'auto' ? null : tier }, window.location.origin); }} className="rounded bg-[#080b14] p-2"><option value="auto">Auto</option><option value="ultra">Ultra</option><option value="standard">Standard</option><option value="lite">Lite</option></select></label>
          </div>
        </aside>}

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
        <div id="playable-theater-stage" className="relative flex-1 p-0 sm:p-2 md:p-3 flex flex-col items-center justify-center bg-[#05060D] overflow-hidden">
          {!hasLaunched ? (
            <div className="flex h-full w-full max-w-3xl flex-col justify-end rounded-2xl border border-white/10 bg-[#0d1425] p-6 sm:p-10" style={{ background: `radial-gradient(circle at 75% 25%, ${game.accentColor}55, transparent 42%), #0d1425` }}>
              <span className="mb-3 text-xs font-mono uppercase tracking-widest text-cyan-300">Ready to launch - {game.players || '1P'} - {game.sessionMinutes || 10} min</span>
              <h3 className="text-3xl font-black text-white sm:text-5xl">{game.title}</h3>
              <p className="mt-3 max-w-xl text-sm text-slate-300">{game.storyBlurb || game.description}</p>
              <p className="mt-5 rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs text-slate-300">{game.controlsSummary}</p>
              <button data-ui-open onClick={launchGame} className="mt-6 inline-flex min-h-12 w-fit items-center gap-2 rounded-xl px-5 text-sm font-black text-slate-950" style={{ backgroundColor: game.accentColor }}><Play className="h-4 w-4 fill-current" /> Play {game.title}</button>
            </div>
          ) : viewMode === '2.5d' && game.playableEngineId ? (
            renderEngine()
          ) : game.htmlPath ? (
            <div className="w-full h-full flex-1 flex flex-col items-center justify-center">
              <iframe ref={iframeRef} src={`${import.meta.env.BASE_URL}${game.htmlPath.replace(/^\/+/, '')}?diff=${difficulty}&level=${Math.max(1, Math.floor(startLevel))}${startSeed === undefined ? '' : `&seed=${Math.floor(startSeed)}`}`} title={game.title} className={`w-full h-full min-h-[320px] rounded-none sm:rounded-xl border-0 sm:border border-white/10 bg-black shadow-2xl ${isPaused ? 'pointer-events-none' : ''}`} allow="gamepad; fullscreen; autoplay; clipboard-write; focus-without-user-activation" tabIndex={0} onLoad={() => {
                try {
                  const frame = iframeRef.current;
                  frame?.focus(); frame?.contentWindow?.focus();
                  frame?.contentWindow?.postMessage({ type: 'SET_DIFFICULTY', difficulty }, '*');
                  frame?.contentWindow?.postMessage({ type: 'SET_LEVEL', level: Math.max(1, Math.floor(startLevel)) }, window.location.origin);
                  frame?.contentWindow?.postMessage({ type: 'SET_ACCESSIBILITY', reducedMotion, colourBlindMode, performanceTier }, '*');
                  if (displayPreferences.pixelPerfect && frame?.contentDocument) frame.contentDocument.documentElement.style.imageRendering = 'pixelated';
                } catch {}
              }} />
            </div>
          ) : renderEngine()}
          {hasLaunched && showVirtualControls && game.touchControls?.mode === 'virtual' && <div aria-label={`${game.title} touch controls`} data-touch-layout={game.id} className="pointer-events-none absolute bottom-2 left-2 right-2 z-30 flex items-end justify-between gap-3 pb-[env(safe-area-inset-bottom)]">
            {game.touchControls.directions && <div className="pointer-events-auto grid grid-cols-3 gap-1 rounded-2xl border border-white/10 bg-[#070B18]/85 p-2 shadow-2xl backdrop-blur-md">
              <span />{(['up'] as const).map((direction) => game.touchControls?.directions?.[direction] && <button key={direction} type="button" aria-label={`${direction} (${game.touchControls.directions[direction]})`} onPointerDown={(event) => { event.preventDefault(); dispatchVirtualKey(game.touchControls!.directions![direction]!, 'down'); }} onPointerUp={() => dispatchVirtualKey(game.touchControls!.directions![direction]!, 'up')} onPointerCancel={() => dispatchVirtualKey(game.touchControls!.directions![direction]!, 'up')} onPointerLeave={() => dispatchVirtualKey(game.touchControls!.directions![direction]!, 'up')} className="h-11 w-11 rounded-xl bg-white/10 text-sm font-bold text-cyan-200">&#8593;</button>)}<span />
              {(['left','down','right'] as const).map((direction) => game.touchControls?.directions?.[direction] && <button key={direction} type="button" aria-label={`${direction} (${game.touchControls.directions[direction]})`} onPointerDown={(event) => { event.preventDefault(); dispatchVirtualKey(game.touchControls!.directions![direction]!, 'down'); }} onPointerUp={() => dispatchVirtualKey(game.touchControls!.directions![direction]!, 'up')} onPointerCancel={() => dispatchVirtualKey(game.touchControls!.directions![direction]!, 'up')} onPointerLeave={() => dispatchVirtualKey(game.touchControls!.directions![direction]!, 'up')} className="h-11 w-11 rounded-xl bg-white/10 text-sm font-bold text-cyan-200">{direction === 'left' ? '\u2190' : direction === 'right' ? '\u2192' : '\u2193'}</button>)}
            </div>}
            {game.touchControls.actions && <div className="pointer-events-auto flex max-w-[70%] flex-wrap justify-end gap-2 rounded-2xl border border-white/10 bg-[#070B18]/85 p-2 shadow-2xl backdrop-blur-md">{game.touchControls.actions.map((action) => <button key={`${action.label}-${action.key}`} type="button" aria-label={`${action.label} (${action.key === ' ' ? 'Space' : action.key})`} onPointerDown={(event) => { event.preventDefault(); dispatchVirtualKey(action.key, 'down'); }} onPointerUp={() => dispatchVirtualKey(action.key, 'up')} onPointerCancel={() => dispatchVirtualKey(action.key, 'up')} onPointerLeave={() => dispatchVirtualKey(action.key, 'up')} className="min-h-12 min-w-12 rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 px-3 text-xs font-extrabold text-slate-950">{action.label}</button>)}</div>}
          </div>}
            {isPaused && hasLaunched && <div role="dialog" aria-modal="true" aria-label="Game paused" className="absolute inset-0 z-40 grid place-items-center bg-[#05060D]/75 backdrop-blur-sm"><div className="rounded-2xl border border-white/15 bg-[#101525] p-6 text-center shadow-2xl"><h3 className="text-2xl font-black text-white">Paused</h3><p className="mt-1 text-sm text-slate-400">{game.title}</p><div className="mt-5 flex justify-center gap-3"><button onClick={() => setIsPaused(false)} className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950">Resume</button><button onClick={handleRestart} className="rounded-xl border border-white/15 px-5 py-3 font-bold text-white">Restart</button></div></div></div>}
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
