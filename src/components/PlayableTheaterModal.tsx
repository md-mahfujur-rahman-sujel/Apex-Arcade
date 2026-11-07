import React, { useState, useEffect, useRef, useCallback } from 'react';
import { GameInfo, DifficultySetting } from '../types/game';
import { TheaterPauseOverlay } from './TheaterPauseOverlay';
import { TouchGamepad } from './TouchGamepad';
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
import { AppPreferences } from '../services/preferencesService';

const reducedMotionPreferenceKey = (gameId: string) => `apex:reduced-motion:${gameId}`;

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function readReducedMotionPreference(gameId: string, fallback: boolean): boolean {
  try {
    const stored = window.localStorage.getItem(reducedMotionPreferenceKey(gameId));
    if (stored === 'true') return true;
    if (stored === 'false') return false;
  } catch { /* Keep the system preference for this session when storage is unavailable. */ }
  return fallback;
}
import {
  X,
  Play,
  Volume2,
  VolumeX,
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
  Accessibility,
  ChevronLeft,
  Share2,
  RotateCcw,
  Trophy,
} from 'lucide-react';

function loadingStage(stage: 'booting' | 'loaded' | 'menu', assets: number): string {
  if (stage === 'menu') return 'Cabinet ready';
  if (stage === 'loaded') return 'Booting game';
  return `Loading assets - ${assets}`;
}

interface PlayableTheaterModalProps {
  game: GameInfo | null;
  highScore: number;
  startLevel?: number;
  startSeed?: number;
  defaultPreferences: AppPreferences;
  onClose: () => void;
  onStatsUpdated: () => void;
}

export const PlayableTheaterModal: React.FC<PlayableTheaterModalProps> = ({
  game,
  highScore,
  startLevel = 1,
  startSeed,
  defaultPreferences,
  onClose,
  onStatsUpdated,
}) => {
  const [difficulty, setDifficulty] = useState<DifficultySetting>('normal');
  const [isPaused, setIsPaused] = useState(false);
  const [isMuted, setIsMuted] = useState(audio.isMuted());
  const [volume, setVolume] = useState(defaultPreferences.sfxVolume);
  const [currentScore, setCurrentScore] = useState(0);
  const [gameResult, setGameResult] = useState<{ score: number; best: number; newBest: boolean } | null>(null);
  const [hasLaunched, setHasLaunched] = useState(false);
  const [iframeStarted, setIframeStarted] = useState(false);
  const [frameStage, setFrameStage] = useState<'booting' | 'loaded' | 'menu'>('booting');
  const [bootProgress, setBootProgress] = useState(0);
  const [assetCount, setAssetCount] = useState(0);
  const [launchRequested, setLaunchRequested] = useState(false);
  const [showFrameMenu, setShowFrameMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [gamepadConnected, setGamepadConnected] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => readReducedMotionPreference(game?.id || '', defaultPreferences.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches));
  const [colourBlindMode, setColourBlindMode] = useState(defaultPreferences.colourBlindPalette !== 'off');
  const [performanceTier, setPerformanceTier] = useState<'auto' | 'ultra' | 'standard' | 'lite'>(() => defaultPreferences.particleLevel === 'ultra' ? 'ultra' : defaultPreferences.particleLevel === 'lite' ? 'lite' : 'standard');
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
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [showVirtualControls, setShowVirtualControls] = useState(false);
  const [dismissRotateTip, setDismissRotateTip] = useState(false);
  const [touchCursor, setTouchCursor] = useState({ x: 0.5, y: 0.5 });
  const touchCursorRef = useRef({ x: 0.5, y: 0.5 });

  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const resultPlayAgainRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const activeMenuGameIdRef = useRef<string | null>(null);
  const pendingPlayRef = useRef(false);
  const playFallbackRef = useRef(0);
  const hasLaunchedRef = useRef(false);
  hasLaunchedRef.current = hasLaunched;
  const frameStageRef = useRef(frameStage);
  frameStageRef.current = frameStage;
  const highScoreRef = useRef(highScore);
  highScoreRef.current = highScore;
  const defaultPreferencesRef = useRef(defaultPreferences);
  defaultPreferencesRef.current = defaultPreferences;

  const showingEngine = Boolean(game?.playableEngineId && (viewMode === '2.5d' || !game.htmlPath));
  const usesFrame = Boolean(game?.htmlPath) && !showingEngine;
  const STAGE_RANK = { booting: 0, loaded: 1, menu: 2 };
  // A game page can announce its menu before the frame finishes loading, so the
  // lobby only ever moves forward through its stages.
  const advanceStage = useCallback((next: 'booting' | 'loaded' | 'menu') => {
    setFrameStage((current) => (STAGE_RANK[current] >= STAGE_RANK[next] ? current : next));
  }, []);

  const revealRun = useCallback(() => {
    if (hasLaunchedRef.current) return;
    hasLaunchedRef.current = true;
    sessionStartRef.current = Date.now();
    sessionBestRef.current = highScoreRef.current;
    sessionNewBestRef.current = false;
    sessionEndedRef.current = false;
    setHasLaunched(true);
  }, []);

  const postFramePlay = () => {
    const frame = iframeRef.current;
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({ type: 'THEATER_PLAY' }, window.location.origin);
  };

  // The game page draws its own menu and pause panel. The frame only stays hidden
  // until one of the lobby's two doors is used, and the React pause overlay is
  // the fallback for the engines that have no frame to draw it.
  const frameVisible = hasLaunched || showFrameMenu;
  const hostPauseOverlay = isPaused && showingEngine;

  // Keyboard input — including the beginning animation's skip key — only reaches
  // the game once the frame itself holds focus.
  useEffect(() => {
    if (!frameVisible || !usesFrame || isPaused) return;
    const frame = iframeRef.current;
    if (!frame) return;
    const id = window.requestAnimationFrame(() => { frame.focus(); frame.contentWindow?.focus(); });
    return () => window.cancelAnimationFrame(id);
  }, [frameVisible, isPaused, usesFrame]);
  const canPause = Boolean(game && hasLaunched && (showingEngine || iframeStarted));
  // Keep the touch pad off the game menu; it only belongs during a live run.
  const showTouchPad = Boolean(
    game &&
    hasLaunched &&
    showVirtualControls &&
    game.touchControls?.mode === 'virtual' &&
    !isPaused &&
    !showSettings &&
    (showingEngine || iframeStarted)
  );

  // Auto-detect touch device to enable virtual controls by default
  useEffect(() => {
    const isTouch =
      typeof window !== 'undefined' &&
      ((navigator && navigator.maxTouchPoints > 0) || window.matchMedia('(pointer: coarse)').matches);
    setIsTouchDevice(isTouch);
    setShowVirtualControls(isTouch);
  }, []);

  useEffect(() => {
    // Reset state on game open
    activeMenuGameIdRef.current = null;
    window.clearTimeout(playFallbackRef.current);
    pendingPlayRef.current = false;
    setLaunchRequested(false);
    setIsPaused(false);
    setCurrentScore(0);
    setGameResult(null);
    setEngineKey((k) => k + 1);
    setViewMode('classic');
    setHasLaunched(false);
    setShowFrameMenu(false);
    setIframeStarted(false);
    setFrameStage('booting');
    setBootProgress(0);
    setAssetCount(0);
    setTouchCursor({ x: 0.5, y: 0.5 });
    touchCursorRef.current = { x: 0.5, y: 0.5 };
    setShowSettings(false);
    setReducedMotion(game ? readReducedMotionPreference(game.id, defaultPreferencesRef.current.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) : false);
    setVolume(defaultPreferencesRef.current.sfxVolume);
    audio.setVolume(defaultPreferencesRef.current.sfxVolume);
    sessionStartRef.current = Date.now();
    sessionBestRef.current = highScoreRef.current;
    sessionNewBestRef.current = false;
    sessionEndedRef.current = false;
    apexRateRef.current = createApexEventRateLimiter();
    let stored: string | null = null;
    try { stored = game ? localStorage.getItem(`apex:theater-display:${game.id}`) : null; } catch { /* Use global display defaults when storage is blocked. */ }
    let preferences: Record<string, unknown> = {};
    try { preferences = stored ? JSON.parse(stored) : {}; } catch { preferences = {}; }
    setDisplayPreferences({
      gameId: game?.id || null,
      crt: typeof preferences.crt === 'boolean' ? preferences.crt : defaultPreferencesRef.current.displayModes.crt,
      pixelPerfect: typeof preferences.pixelPerfect === 'boolean' ? preferences.pixelPerfect : defaultPreferencesRef.current.displayModes.pixelPerfect,
      ambientGlow: typeof preferences.ambientGlow === 'boolean' ? preferences.ambientGlow : defaultPreferencesRef.current.displayModes.ambientGlow,
    });
    setColourBlindMode(defaultPreferencesRef.current.colourBlindPalette !== 'off');
    setPerformanceTier(defaultPreferencesRef.current.particleLevel === 'ultra' ? 'ultra' : defaultPreferencesRef.current.particleLevel === 'lite' ? 'lite' : 'standard');
  }, [game]);

  useEffect(() => {
    // The lobby card is a real loading screen: the bar tracks what the game page
    // has actually fetched and settles only when its own menu reports in.
    if (!game || hasLaunched || !usesFrame) return;
    let raf = 0;
    const tick = () => {
      let loaded = 0;
      let complete = false;
      try {
        const doc = iframeRef.current?.contentDocument;
        const win = iframeRef.current?.contentWindow;
        loaded = doc && win ? win.performance.getEntriesByType('resource').length : 0;
        complete = doc?.readyState === 'complete';
      } catch { /* A blocked frame can only report its own milestones. */ }
      const target = frameStage === 'menu'
        ? 1
        : Math.min(0.94, (complete ? 0.78 : 0.12) + loaded * 0.012);
      setAssetCount((current) => (current === loaded ? current : loaded));
      setBootProgress((current) => (target <= current ? current : Math.min(target, current + Math.max(0.003, (target - current) * 0.07))));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [game, hasLaunched, usesFrame, frameStage]);

  useEffect(() => {
    audio.setPaused(isPaused);
    return () => audio.setPaused(false);
  }, [isPaused]);

  useEffect(() => {
    const onFrameMotionChange = (event: MessageEvent) => {
      if (!game || event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      if (event.data?.type !== 'APEX_REDUCED_MOTION_CHANGED' || typeof event.data.reducedMotion !== 'boolean') return;
      setReducedMotion(event.data.reducedMotion);
      try { window.localStorage.setItem(reducedMotionPreferenceKey(game.id), String(event.data.reducedMotion)); } catch { /* The in-game preference still applies until this theater closes. */ }
    };
    window.addEventListener('message', onFrameMotionChange);
    return () => window.removeEventListener('message', onFrameMotionChange);
  }, [game]);

  const updateDisplayPreference = (key: 'crt' | 'pixelPerfect' | 'ambientGlow', value: boolean) => {
    if (!game) return;
    setDisplayPreferences((current) => {
      const next = { ...current, gameId: game.id, [key]: value };
      try { localStorage.setItem(`apex:theater-display:${game.id}`, JSON.stringify({ crt: next.crt, pixelPerfect: next.pixelPerfect, ambientGlow: next.ambientGlow })); } catch { /* Apply for this session if storage is blocked. */ }
      return next;
    });
  };

  useEffect(() => {
    const sync = () => setGamepadConnected(Array.from(navigator.getGamepads?.() || []).some((pad) => Boolean(pad?.connected)));
    sync(); window.addEventListener('gamepadconnected', sync); window.addEventListener('gamepaddisconnected', sync);
    return () => { window.removeEventListener('gamepadconnected', sync); window.removeEventListener('gamepaddisconnected', sync); };
  }, []);

  useEffect(() => {
    const sync = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener('fullscreenchange', sync); return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const postFramePause = useCallback((paused: boolean, silent = false) => {
    if (!game) return;
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'SET_PAUSED', paused, silent, gameId: game.id }, window.location.origin);
    } catch { /* The next iframe load resynchronises pause state. */ }
  }, [game]);

  const pauseGame = useCallback(() => {
    if (!canPause) return;
    setShowSettings(false);
    setIsPaused(true);
    postFramePause(true);
    audio.playClick();
  }, [canPause, postFramePause]);

  const resumeGame = useCallback(() => {
    setIsPaused(false);
    setShowSettings(false);
    postFramePause(false);
    audio.playClick();
    window.requestAnimationFrame(() => {
      const frame = iframeRef.current;
      if (!frame) return;
      frame.focus();
      frame.contentWindow?.focus();
    });
  }, [postFramePause]);

  // The page already paused itself and drew its own panel, so the host mirrors
  // state for audio, the touch pad and the timer without echoing SET_PAUSED back.
  const mirrorFramePause = useCallback((paused: boolean) => {
    setShowSettings(false);
    setIsPaused(paused);
    if (paused) {
      audio.playClick();
      return;
    }
    window.requestAnimationFrame(() => {
      const frame = iframeRef.current;
      if (!frame) return;
      frame.focus();
      frame.contentWindow?.focus();
    });
  }, []);

  const closeSettings = useCallback(() => {
    setShowSettings(false);
    // The frame's pause panel gave way to this sheet; hand its place back.
    try { iframeRef.current?.contentWindow?.postMessage({ type: 'MENU_SETTINGS_CLOSED', gameId: game?.id }, window.location.origin); } catch (e) {}
    if (pauseStateRef.current.canPause && !pauseStateRef.current.isPaused) postFramePause(false);
    else window.requestAnimationFrame(() => {
      const frame = iframeRef.current;
      if (!frame) return;
      frame.focus();
      frame.contentWindow?.focus();
    });
  }, [postFramePause, game]);

  const toggleSettings = useCallback(() => {
    if (showSettings) {
      closeSettings();
    } else {
      setShowSettings(true);
      // The settings sheet is its own dialog; a silent pause keeps the game's
      // pause panel from appearing behind it.
      if (pauseStateRef.current.canPause && !pauseStateRef.current.isPaused) postFramePause(true, true);
    }
    audio.playClick();
  }, [showSettings, closeSettings, postFramePause]);

  const pauseStateRef = useRef({ isPaused, canPause });
  pauseStateRef.current = { isPaused, canPause };
  const pauseActionsRef = useRef({ pauseGame, resumeGame });
  pauseActionsRef.current = { pauseGame, resumeGame };

  useEffect(() => {
    if (!showSettings) return;
    // The sheet can now open from inside the frame, which turns inert behind it;
    // pull focus out of the frame so keyboard and gamepad land on the sheet.
    const id = window.requestAnimationFrame(() => {
      containerRef.current?.querySelector<HTMLElement>('#theater-settings button, #theater-settings input, #theater-settings select')?.focus();
    });
    return () => window.cancelAnimationFrame(id);
  }, [showSettings]);

  useEffect(() => {
    if (!gameResult) return;
    const id = window.requestAnimationFrame(() => resultPlayAgainRef.current?.focus({ preventScroll: true }));
    return () => window.cancelAnimationFrame(id);
  }, [gameResult]);

  useEffect(() => {
    previouslyFocusedRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = requestAnimationFrame(() => {
      const container = containerRef.current;
      const target = container?.querySelector<HTMLElement>('[data-theater-initial-focus]')
        || container?.querySelector<HTMLElement>('[aria-label="Close theater"]');
      target?.focus({ preventScroll: true });
    });
    return () => {
      cancelAnimationFrame(frame);
      previouslyFocusedRef.current?.focus?.({ preventScroll: true });
    };
  }, []);

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !containerRef.current) return;
    const scope = gameResult ? containerRef.current.querySelector<HTMLElement>('[data-game-result]') : containerRef.current;
    if (!scope) return;
    const items = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE))
      .filter((element) => !element.closest('[inert]') && element.offsetParent !== null);
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !scope.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !scope.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  const frameSrc = useCallback((cacheBust = false) => {
    if (!game?.htmlPath) return '';
    // Difficulty travels by SET_DIFFICULTY postMessage, not the URL: putting it
    // in the query string would reload the frame and drop the live run.
    const params = new URLSearchParams({
      level: String(Math.max(1, Math.floor(startLevel))),
      embed: 'theater',
    });
    if (startSeed !== undefined) params.set('seed', String(Math.floor(startSeed)));
    if (cacheBust) params.set('r', String(Date.now()));
    const gameUrl = `${import.meta.env.BASE_URL}${game.htmlPath.replace(/^\/+/, '')}`;
    return `${gameUrl}?${params.toString()}`;
  }, [game, startLevel, startSeed]);

  useEffect(() => {
    let frame = 0; let previous = new Set<number>(); let direction = 0;
    const poll = () => {
      const pad = Array.from(navigator.getGamepads?.() || []).find((candidate) => candidate?.connected);
      if (pad && containerRef.current) {
        const paused = pauseStateRef.current.isPaused;
        const scope = paused ? containerRef.current.querySelector<HTMLElement>('[data-pause-overlay]') : containerRef.current;
        const movePrevious = pad.buttons[12]?.pressed || pad.buttons[14]?.pressed || pad.axes[1] < -0.65 || pad.axes[0] < -0.65;
        const moveNext = pad.buttons[13]?.pressed || pad.buttons[15]?.pressed || pad.axes[1] > 0.65 || pad.axes[0] > 0.65;
        const nextDirection = movePrevious ? -1 : moveNext ? 1 : 0;
        if (nextDirection && nextDirection !== direction && scope) {
          const items = Array.from(scope.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),[tabindex="0"]'));
          const index = items.indexOf(document.activeElement as HTMLElement);
          if (items.length) {
            const next = index < 0 ? (nextDirection > 0 ? 0 : items.length - 1) : (index + nextDirection + items.length) % items.length;
            items[next]?.focus();
          }
        }
        direction = nextDirection;
        const pressed = new Set(pad.buttons.flatMap((button, index) => button.pressed ? [index] : []));
        if (pressed.has(9) && !previous.has(9)) {
          if (pauseStateRef.current.isPaused) pauseActionsRef.current.resumeGame();
          else if (pauseStateRef.current.canPause) pauseActionsRef.current.pauseGame();
        } else if (pressed.has(0) && !previous.has(0)) {
          (document.activeElement as HTMLElement | null)?.click?.();
        }
        previous = pressed;
      } else { previous = new Set(); direction = 0; }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll); return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => () => window.clearTimeout(playFallbackRef.current), []);

  useEffect(() => {
    const handleMsg = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow || e.origin !== window.location.origin) return;
      if (e.data?.type === 'MENU_OPEN') {
        setIframeStarted(false);
        advanceStage('menu');
        activeMenuGameIdRef.current = typeof e.data.gameId === 'string' && e.data.gameId ? e.data.gameId : null;
        if (pendingPlayRef.current) {
          pendingPlayRef.current = false;
          window.clearTimeout(playFallbackRef.current);
          postFramePlay();
        }
        return;
      }
      if (e.data?.type === 'MENU_INTRO_START') {
        if (!activeMenuGameIdRef.current || e.data.gameId !== activeMenuGameIdRef.current) return;
        revealRun();
        return;
      }
      if (e.data?.type === 'MENU_PLAY') {
        if (!activeMenuGameIdRef.current || e.data.gameId !== activeMenuGameIdRef.current) return;
        revealRun();
        setIframeStarted(true);
        return;
      }
      if (e.data?.type === 'MENU_MAIN') {
        if (!activeMenuGameIdRef.current || e.data.gameId !== activeMenuGameIdRef.current) return;
        setGameResult(null);
        setIsPaused(false);
        setIframeStarted(false);
        setShowFrameMenu(false);
        return;
      }
      if (e.data?.type === 'MENU_EXIT') {
        if (!activeMenuGameIdRef.current || e.data.gameId !== activeMenuGameIdRef.current) return;
        activeMenuGameIdRef.current = null;
        onClose();
        return;
      }
      if (e.data?.type === 'MENU_PAUSE' || e.data?.type === 'MENU_RESUME') {
        if (!activeMenuGameIdRef.current || e.data.gameId !== activeMenuGameIdRef.current) return;
        mirrorFramePause(e.data.type === 'MENU_PAUSE');
        return;
      }
      if (e.data?.type === 'MENU_SETTINGS') {
        if (!activeMenuGameIdRef.current || e.data.gameId !== activeMenuGameIdRef.current) return;
        // The pause panel is the only door to the theater sheet now that the
        // header gear is gone; the run is already paused behind it.
        setShowSettings(true);
        if (pauseStateRef.current.canPause && !pauseStateRef.current.isPaused) postFramePause(true, true);
        return;
      }
      if (e.data?.type === 'MENU_DIFFICULTY') {
        if (!activeMenuGameIdRef.current || e.data.gameId !== activeMenuGameIdRef.current) return;
        if (e.data.difficulty === 'easy' || e.data.difficulty === 'normal' || e.data.difficulty === 'hard') setDifficulty(e.data.difficulty);
        return;
      }
      if (e.data?.type === 'APEX_GAME_FRAME') {
        const avgMs = e.data.detail?.avgMs;
        if (typeof avgMs === 'number' && Number.isFinite(avgMs) && avgMs > 0 && avgMs <= 200) {
          window.dispatchEvent(new CustomEvent('apex:game-frame', { detail: { avgMs, gameId: game?.id, source: e.data.detail?.source } }));
        }
        return;
      }
      if (e.data?.type === 'APEX_PERF') {
        const tier = e.data.detail?.tier;
        if (tier === 'ultra' || tier === 'standard' || tier === 'lite') {
          window.dispatchEvent(new CustomEvent('apex:perf', { detail: { tier } }));
        }
        return;
      }
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
        setGameResult(null);
        setIframeStarted(true);
        sessionEndedRef.current = false; sessionStartRef.current = Date.now(); sessionBestRef.current = highScore; sessionNewBestRef.current = false;
      } else if (eventType === 'score' && typeof score === 'number') {
        setCurrentScore(score); if (score > sessionBestRef.current) sessionNewBestRef.current = true; recordApexScore(targetGameId, score); onStatsUpdated();
      } else if (eventType === 'level_complete' && typeof level === 'number') {
        if (typeof score === 'number') setCurrentScore(score); recordApexLevelProgress(targetGameId, level); onStatsUpdated();
      } else if (eventType === 'achievement' && achievementId) {
        recordApexAchievement(targetGameId, achievementId); window.Meta?.recordAchievement({ id: achievementId, gameId: targetGameId }); onStatsUpdated();
      } else if (eventType === 'session_end') {
        if (pendingPlayRef.current) return;
        if (sessionEndedRef.current) return;
        sessionEndedRef.current = true;
        const finalScore = score ?? 0; const elapsed = durationSec ?? Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 1000));
        if (finalScore > sessionBestRef.current) sessionNewBestRef.current = true;
        setCurrentScore(finalScore);
        setGameResult({ score: finalScore, best: Math.max(sessionBestRef.current, finalScore), newBest: sessionNewBestRef.current });
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
  }, [onClose, game, onStatsUpdated, highScore, mirrorFramePause, revealRun, postFramePause]);

  useEffect(() => () => { window.dispatchEvent(new Event('apex:perf-clear')); }, []);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.repeat || event.altKey || event.ctrlKey || event.metaKey) return;
      if (showSettings) {
        event.preventDefault();
        closeSettings();
        return;
      }
      if (gameResult) {
        event.preventDefault();
        return;
      }
      if (isPaused) {
        event.preventDefault();
        resumeGame();
        return;
      }
      if (canPause) {
        event.preventDefault();
        pauseGame();
      }
    };
    window.addEventListener('keydown', handleEscape, true);
    return () => window.removeEventListener('keydown', handleEscape, true);
  }, [isPaused, showSettings, gameResult, canPause, pauseGame, resumeGame, closeSettings]);

  useEffect(() => {
    const handleVisibility = () => {
      if (!document.hidden) return;
      const paused = pauseStateRef.current;
      if (paused.canPause && !paused.isPaused) pauseActionsRef.current.pauseGame();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  if (!game) return null;

  const handleScoreUpdate = useCallback((score: number) => {
    const finalVal = difficulty === 'hard' ? Math.floor(score * 1.25) : score;
    setCurrentScore(finalVal);
  }, [difficulty]);

  const handleGameOver = useCallback((finalScore: number) => {
    if (sessionEndedRef.current) return;
    sessionEndedRef.current = true;
    const elapsedSeconds = Math.max(1, Math.floor((Date.now() - sessionStartRef.current) / 1000));
    const scoredVal = difficulty === 'hard' ? Math.floor(finalScore * 1.25) : finalScore;
    const newBest = scoredVal > sessionBestRef.current;
    if (newBest) {
      sessionBestRef.current = scoredVal;
      sessionNewBestRef.current = true;
    }
    setCurrentScore(scoredVal);
    setGameResult({ score: scoredVal, best: Math.max(sessionBestRef.current, scoredVal), newBest });
    saveSessionScore(game.id, game.title, scoredVal, elapsedSeconds);
    window.Meta?.recordSession({ gameId: game.id, durationSec: elapsedSeconds, newBest, category: game.category });
    onStatsUpdated();
  }, [difficulty, game?.id, game?.title, game?.category, onStatsUpdated]);

  const handleRestart = () => {
    setEngineKey((k) => k + 1);
    setCurrentScore(0);
    setGameResult(null);
    setIsPaused(false);
    setIframeStarted(false);
    setShowSettings(false);
    setShowFrameMenu(false);
    sessionStartRef.current = Date.now();
    sessionEndedRef.current = false;
    sessionBestRef.current = highScore;
    sessionNewBestRef.current = false;
    audio.playClick();
    if (viewMode === 'classic' && iframeRef.current) {
      // The reload boots into the page's own menu; the host presses Play so a
      // restart opens with its beginning animation instead of a second click.
      pendingPlayRef.current = true;
      const frame = iframeRef.current;
      const nextSrc = frameSrc(true);
      try {
        const frameWindow = frame.contentWindow;
        if (frameWindow) frameWindow.location.replace(nextSrc);
        else frame.src = nextSrc;
      } catch {
        frame.src = nextSrc;
      }
    }
  };

  const handleDifficultyChange = (newDiff: DifficultySetting) => {
    setDifficulty(newDiff);
    setEngineKey((k) => k + 1);
    setCurrentScore(0);
    sessionStartRef.current = Date.now();
    audio.playClick();
    try {
      iframeRef.current?.contentWindow?.postMessage({ type: 'SET_DIFFICULTY', difficulty: newDiff }, window.location.origin);
    } catch (e) {}
  };

  const toggleSound = () => {
    const next = audio.toggleMute();
    setIsMuted(next);
  };

  const handleVolumeChange = (nextVolume: number) => { setVolume(nextVolume); audio.setVolume(nextVolume); };

  // The lobby's Play is a real front door: it asks the waiting game to press its
  // own Play, so the game's beginning animation gates the run just as it does
  // from the in-game menu. Until a door is used the frame stays hidden, so the
  // menu never shows through the loading screen.
  const requestRun = () => {
    if (!usesFrame) { revealRun(); return; }
    if (launchRequested) return;
    setLaunchRequested(true);
    if (frameStage === 'menu') { postFramePlay(); return; }
    pendingPlayRef.current = true;
    const arm = () => {
      window.clearTimeout(playFallbackRef.current);
      playFallbackRef.current = window.setTimeout(() => {
        if (!pendingPlayRef.current) return;
        // A page that still has not announced a menu is not going to: reveal it
        // plainly rather than hold the player on the loading screen.
        if (frameStageRef.current === 'booting') { arm(); return; }
        pendingPlayRef.current = false;
        revealRun();
      }, 3000);
    };
    arm();
  };

  // The second door reveals the waiting page's own menu, so modes and skins come
  // from the renderer the game already ships — the theater never draws a copy.
  const requestFrameMenu = () => {
    if (!usesFrame || frameStage !== 'menu' || launchRequested) return;
    setShowFrameMenu(true);
    audio.playClick();
  };

  const handleShareScore = async () => {
    if (!game || isSharingScore) return;
    setIsSharingScore(true);
    try { await shareOrDownloadScoreCard(game, currentScore); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) console.error('Could not share score card.', error); }
    finally { setIsSharingScore(false); }
  };

  const handleResultPlayAgain = () => {
    setGameResult(null);
    handleRestart();
  };

  const handleResultBackToMenu = () => {
    setGameResult(null);
    if (showingEngine) {
      onClose();
      return;
    }
    sessionEndedRef.current = false;
    setCurrentScore(0);
    setIsPaused(false);
    setIframeStarted(false);
    try { iframeRef.current?.contentWindow?.postMessage({ type: 'THEATER_BACK_TO_MENU', gameId: game?.id }, window.location.origin); } catch { onClose(); }
  };

  const handleToggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Dispatch through the game's own browsing context so its keyboard handlers
  // receive the same key/code values as a physical keyboard.
  const dispatchVirtualKey = (key: string, action: 'down' | 'up') => {
    const keyCode = key === ' ' ? 'Space'
      : key === 'Shift' ? 'ShiftLeft'
        : /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}`
          : /^[0-9]$/.test(key) ? `Digit${key}`
            : key;
    const type = action === 'down' ? 'keydown' : 'keyup';

    if (showingEngine) {
      window.dispatchEvent(new KeyboardEvent(type, { key, code: keyCode, bubbles: true, cancelable: true }));
      return;
    }

    try {
      const frameWindow = iframeRef.current?.contentWindow;
      const frameDocument = iframeRef.current?.contentDocument;
      if (frameWindow && frameDocument) {
        const FrameKeyboardEvent = frameDocument.defaultView?.KeyboardEvent;
        if (!FrameKeyboardEvent) return;
        frameDocument.dispatchEvent(new FrameKeyboardEvent(type, {
          key,
          code: keyCode,
          bubbles: true,
          cancelable: true,
          composed: true,
          repeat: false,
        }));
      }
    } catch {
      // Same-origin game frames normally allow direct keyboard events. If a
      // browser blocks frame access, keep the host responsive as a fallback.
      window.dispatchEvent(new KeyboardEvent(type, { key, code: keyCode, bubbles: true, cancelable: true }));
    }
  };

  const moveTouchCursor = (dx: number, dy: number) => {
    const next = {
      x: Math.max(0.015, Math.min(0.985, touchCursorRef.current.x + dx / Math.max(180, window.innerWidth * 0.38))),
      y: Math.max(0.015, Math.min(0.985, touchCursorRef.current.y + dy / Math.max(180, window.innerHeight * 0.38))),
    };
    touchCursorRef.current = next;
    setTouchCursor(next);
    dispatchVirtualPointer('move');
  };

  const virtualPointerRef = useRef<{ target: Element | null; startX: number; startY: number; moved: boolean }>({ target: null, startX: 0, startY: 0, moved: false });
  const dispatchVirtualPointer = (action: 'move' | 'down' | 'up') => {
    let target: Element | null = null;
    let clientX = 0;
    let clientY = 0;
    let view: Window | null = null;
    const frame = iframeRef.current;
    if (frame?.contentDocument && iframeStarted) {
      const doc = frame.contentDocument;
      clientX = touchCursorRef.current.x * Math.max(1, frame.clientWidth);
      clientY = touchCursorRef.current.y * Math.max(1, frame.clientHeight);
      target = doc.elementFromPoint(clientX, clientY) || doc.body;
      view = doc.defaultView;
    } else {
      const stage = document.getElementById('playable-theater-stage');
      if (!stage) return;
      const surface = stage.querySelector('canvas') || stage;
      const rect = surface.getBoundingClientRect();
      clientX = rect.left + touchCursorRef.current.x * rect.width;
      clientY = rect.top + touchCursorRef.current.y * rect.height;
      target = document.elementFromPoint(clientX, clientY);
      view = window;
    }

    if (action === 'down') {
      virtualPointerRef.current = { target, startX: clientX, startY: clientY, moved: false };
    } else if (action === 'move' && virtualPointerRef.current.target) {
      const drag = virtualPointerRef.current;
      if (Math.hypot(clientX - drag.startX, clientY - drag.startY) > 7) drag.moved = true;
    }
    if (action === 'up') target = virtualPointerRef.current.target || target;
    if (!target || !view) return;
    const targetWindow = view as Window & typeof globalThis;
    const eventType = action === 'move' ? 'pointermove' : action === 'down' ? 'pointerdown' : 'pointerup';
    const pointerInit: PointerEventInit = {
      bubbles: true,
      cancelable: true,
      pointerId: 83,
      pointerType: 'touch',
      isPrimary: true,
      button: 0,
      buttons: action === 'up' ? 0 : virtualPointerRef.current.target ? 1 : 0,
      clientX,
      clientY,
    };
    const mouseInit: MouseEventInit = {
      bubbles: true,
      cancelable: true,
      button: 0,
      buttons: action === 'up' ? 0 : virtualPointerRef.current.target ? 1 : 0,
      clientX,
      clientY,
    };
    if (typeof targetWindow.PointerEvent !== 'undefined') {
      target.dispatchEvent(new targetWindow.PointerEvent(eventType, pointerInit));
    }
    const mouseType = action === 'move' ? 'mousemove' : action === 'down' ? 'mousedown' : 'mouseup';
    target.dispatchEvent(new targetWindow.MouseEvent(mouseType, mouseInit));
    if (action === 'up') {
      if (!virtualPointerRef.current.moved) {
        target.dispatchEvent(new targetWindow.MouseEvent('click', { bubbles: true, cancelable: true, button: 0, clientX, clientY }));
      }
      virtualPointerRef.current = { target: null, startX: 0, startY: 0, moved: false };
    }
  };

  const touchCursorStyle = () => {
    const stage = document.getElementById('playable-theater-stage');
    const surface = iframeRef.current || stage?.querySelector('canvas');
    if (!stage || !surface) return { left: '50%', top: '50%' };
    const stageRect = stage.getBoundingClientRect();
    const surfaceRect = surface.getBoundingClientRect();
    return {
      left: `${surfaceRect.left - stageRect.left + touchCursorRef.current.x * surfaceRect.width}px`,
      top: `${surfaceRect.top - stageRect.top + touchCursorRef.current.y * surfaceRect.height}px`,
    };
  };

  const dispatchReachDelta = (delta: number) => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'REACH_DELTA',
          delta,
        },
        window.location.origin
      );
    } catch (e) {}
  };

  const renderEngine = () => {
    const commonProps = {
      key: `${game.id}-${engineKey}`,
      isPaused: isPaused || showSettings,
      onScoreUpdate: handleScoreUpdate,
      onGameOver: handleGameOver,
      difficulty,
    };

    switch (game.playableEngineId) {
      case 'cyber-flap':
        return (
          <CyberFlapEngine
            {...commonProps}
            seed={startSeed}
            highScore={highScore}
            onLevelComplete={(level) => {
              recordApexLevelProgress(game.id, level);
              onStatsUpdated();
            }}
            onRestart={() => {
              sessionEndedRef.current = false;
              sessionStartRef.current = Date.now();
              sessionBestRef.current = highScoreRef.current;
              sessionNewBestRef.current = false;
              setCurrentScore(0);
            }}
          />
        );
      case 'holo-pong':
        return (
          <HoloPongEngine
            {...commonProps}
            seed={startSeed}
            highScore={highScore}
            onLevelComplete={(level) => {
              recordApexLevelProgress(game.id, level);
              onStatsUpdated();
            }}
            onRestart={() => {
              sessionEndedRef.current = false;
              sessionStartRef.current = Date.now();
              sessionBestRef.current = highScoreRef.current;
              sessionNewBestRef.current = false;
              setCurrentScore(0);
            }}
          />
        );
      case 'quantum-snake':
        return (
          <QuantumSnakeEngine
            {...commonProps}
            seed={startSeed}
            highScore={highScore}
            onLevelComplete={(level) => {
              recordApexLevelProgress(game.id, level);
              onStatsUpdated();
            }}
            onRestart={() => {
              sessionEndedRef.current = false;
              sessionStartRef.current = Date.now();
              sessionBestRef.current = highScoreRef.current;
              sessionNewBestRef.current = false;
              setCurrentScore(0);
            }}
          />
        );
      case 'space-invaders':
        return <SpaceInvadersEngine {...commonProps} />;
      case 'asteroids-core':
        return (
          <AsteroidsCoreEngine
            {...commonProps}
            seed={startSeed}
            highScore={highScore}
            onLevelComplete={(level) => {
              recordApexLevelProgress(game.id, level);
              onStatsUpdated();
            }}
            onRestart={() => {
              sessionEndedRef.current = false;
              sessionStartRef.current = Date.now();
              sessionBestRef.current = highScoreRef.current;
              sessionNewBestRef.current = false;
              setCurrentScore(0);
            }}
          />
        );
      case 'iso-tetris':
        return <IsoTetrisEngine {...commonProps} />;
      case 'pac-maze':
        return <PacMazeEngine {...commonProps} seed={startSeed} />;
      case 'sonic-speedway':
        return (
          <SonicSpeedwayEngine
            {...commonProps}
            highScore={highScore}
            onLevelComplete={(level) => {
              recordApexLevelProgress(game.id, level);
              onStatsUpdated();
            }}
            onRestart={() => {
              sessionEndedRef.current = false;
              sessionStartRef.current = Date.now();
              sessionBestRef.current = highScoreRef.current;
              sessionNewBestRef.current = false;
              setCurrentScore(0);
            }}
          />
        );
      case 'street-brawler':
        return (
          <StreetBrawlerEngine
            {...commonProps}
            highScore={highScore}
            onLevelComplete={(level) => {
              recordApexLevelProgress(game.id, level);
              onStatsUpdated();
            }}
            onRestart={() => {
              sessionEndedRef.current = false;
              sessionStartRef.current = Date.now();
              sessionBestRef.current = highScoreRef.current;
              sessionNewBestRef.current = false;
              setCurrentScore(0);
            }}
          />
        );
      case 'chrono-battle':
        return (
          <ChronoBattleEngine
            {...commonProps}
            highScore={highScore}
            onLevelComplete={(level) => {
              recordApexLevelProgress(game.id, level);
              onStatsUpdated();
            }}
            onRestart={() => {
              sessionEndedRef.current = false;
              sessionStartRef.current = Date.now();
              sessionBestRef.current = highScoreRef.current;
              sessionNewBestRef.current = false;
              setCurrentScore(0);
            }}
          />
        );
      case 'precision-platformer':
        return (
          <PrecisionPlatformerEngine
            {...commonProps}
            variant={game.variant || 'celeste'}
            highScore={highScore}
            onLevelComplete={(level) => {
              recordApexLevelProgress(game.id, level);
              onStatsUpdated();
            }}
            onRestart={() => {
              sessionEndedRef.current = false;
              sessionStartRef.current = Date.now();
              sessionBestRef.current = highScoreRef.current;
              sessionNewBestRef.current = false;
              setCurrentScore(0);
            }}
          />
        );
      case 'action-combat':
        return (
          <ActionCombatEngine
            {...commonProps}
            variant={game.variant || 'hollow'}
            highScore={highScore}
            onLevelComplete={(level) => {
              recordApexLevelProgress(game.id, level);
              onStatsUpdated();
            }}
            onRestart={() => {
              sessionEndedRef.current = false;
              sessionStartRef.current = Date.now();
              sessionBestRef.current = highScoreRef.current;
              sessionNewBestRef.current = false;
              setCurrentScore(0);
            }}
          />
        );
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

  const settingsControls = (
    <div className="divide-y divide-emerald-100/10 text-sm text-slate-100">
      {showingEngine && (
        <label className="flex min-h-12 items-center justify-between gap-3 py-2.5 font-semibold"><span>Difficulty</span><select aria-label="Difficulty" value={difficulty} onChange={(event) => handleDifficultyChange(event.target.value as DifficultySetting)} className="min-h-10 rounded-lg border border-emerald-200/20 bg-[#102124] px-3 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-300"><option value="easy">Easy</option><option value="normal">Normal</option><option value="hard">Hard</option></select></label>
      )}
      <label className="flex min-h-12 items-center justify-between gap-3 py-2.5 font-semibold"><span>Audio</span><button type="button" onClick={toggleSound} className={`min-h-10 min-w-14 rounded-lg px-3 font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${isMuted ? 'border border-white/15 bg-white/5 text-slate-200' : 'bg-emerald-300 text-[#102124] hover:bg-emerald-200'}`}>{isMuted ? 'Muted' : 'On'}</button></label>
      <label className="block py-2.5 font-semibold"><span className="mb-1.5 flex justify-between"><span>Volume</span><span className="font-mono text-emerald-300">{Math.round(volume * 100)}%</span></span><input aria-label="Theater volume" type="range" min="0" max="1" step="0.05" value={volume} onChange={(event) => handleVolumeChange(Number(event.target.value))} className="w-full accent-emerald-300" /></label>
      <label className="flex min-h-12 items-center justify-between gap-3 py-2.5 font-semibold"><span>Reduced motion</span><input className="h-4 w-4 accent-emerald-300" type="checkbox" checked={reducedMotion} onChange={(event) => { const next = event.target.checked; setReducedMotion(next); try { window.localStorage.setItem(reducedMotionPreferenceKey(game.id), String(next)); } catch { /* The preference still applies for this session. */ } iframeRef.current?.contentWindow?.postMessage({ type: 'SET_ACCESSIBILITY', reducedMotion: next, gameId: game.id, colourBlindMode, performanceTier }, window.location.origin); }} /></label>
      <label className="flex min-h-12 items-center justify-between gap-3 py-2.5 font-semibold"><span>Colour-blind palette</span><input className="h-4 w-4 accent-emerald-300" type="checkbox" checked={colourBlindMode} onChange={(event) => { setColourBlindMode(event.target.checked); iframeRef.current?.contentWindow?.postMessage({ type: 'SET_ACCESSIBILITY', reducedMotion, colourBlindMode: event.target.checked, performanceTier }, window.location.origin); }} /></label>
      <label className="flex min-h-12 items-center justify-between gap-3 py-2.5 font-semibold"><span>CRT filter</span><input className="h-4 w-4 accent-emerald-300" aria-label="CRT filter" type="checkbox" checked={displayPreferences.gameId === game.id && displayPreferences.crt} onChange={(event) => updateDisplayPreference('crt', event.target.checked)} /></label>
      <label className="flex min-h-12 items-center justify-between gap-3 py-2.5 font-semibold"><span>Pixel-perfect scaling</span><input className="h-4 w-4 accent-emerald-300" aria-label="Pixel-perfect scaling" type="checkbox" checked={displayPreferences.gameId === game.id && displayPreferences.pixelPerfect} onChange={(event) => updateDisplayPreference('pixelPerfect', event.target.checked)} /></label>
      <label className="flex min-h-12 items-center justify-between gap-3 py-2.5 font-semibold"><span>Ambient glow</span><input className="h-4 w-4 accent-emerald-300" aria-label="Ambient glow" type="checkbox" checked={displayPreferences.gameId === game.id && displayPreferences.ambientGlow} onChange={(event) => updateDisplayPreference('ambientGlow', event.target.checked)} /></label>
      <label className="flex min-h-12 items-center justify-between gap-3 py-2.5 font-semibold"><span>Performance tier</span><select value={performanceTier} onChange={(event) => { const tier = event.target.value as typeof performanceTier; setPerformanceTier(tier); iframeRef.current?.contentWindow?.postMessage({ type: 'SET_PERF_TIER', tier: tier === 'auto' ? null : tier }, window.location.origin); }} className="min-h-10 rounded-lg border border-emerald-200/20 bg-[#102124] px-3 text-sm text-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-300"><option value="auto">Auto</option><option value="ultra">Ultra</option><option value="standard">Standard</option><option value="lite">Lite</option></select></label>
    </div>
  );

  return (
    <div
      id="playable-theater-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${game.title} game theater`}
      onKeyDown={trapFocus}
      data-game-id={game.id}
      data-game-number={game.gameNumber}
      data-touch-mode={game.touchControls?.mode || 'native'}
      data-theme="dark"
      data-theater
      data-apex-reduced-motion={reducedMotion ? 'true' : undefined}
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
        <div inert={hostPauseOverlay || showSettings} data-theater-bar className="flex flex-wrap items-center justify-between gap-2 px-3 sm:px-6 py-2 sm:py-3 bg-[#070913] border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div>
              <div data-theater-kicker className="flex items-center gap-1.5">
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
                  setIframeStarted(false);
                  setIsPaused(false);
                  setShowSettings(false);
                  setShowFrameMenu(false);
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
                  setIsPaused(false);
                  setShowSettings(false);
                  setShowFrameMenu(false);
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

          {/* Action Toolbar */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* Toggle Virtual Touch Controls button */}
            {isTouchDevice && game.touchControls?.mode === 'virtual' && <button
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

            {viewMode === '2.5d' && (
              <button
                onClick={toggleSound}
                className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
                title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
              </button>
            )}

            <button
              onClick={onClose}
              data-ui-close
              aria-label="Close theater"
              className="p-1.5 sm:p-2 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-300 hover:text-red-400 transition-colors cursor-pointer min-h-[36px] min-w-[36px] flex items-center justify-center"
              title="Close Theater"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {showSettings && (
          <div className="absolute inset-0 z-40 grid place-items-center bg-[#020907]/80 p-4 backdrop-blur-sm" onClick={(event) => { if (event.target === event.currentTarget) closeSettings(); }}>
            <aside id="theater-settings" aria-label="Theater settings" className="max-h-[85vh] w-[min(22rem,calc(100%-1.5rem))] overflow-y-auto rounded-2xl border border-[#91b88c]/75 bg-[#14292c] p-4 text-slate-100 shadow-[0_24px_80px_rgba(0,0,0,0.55)]" onClick={(event) => event.stopPropagation()}>
              <div className="mb-3 flex items-center justify-between text-sm font-bold text-white"><span className="flex items-center gap-2">Theater settings <Accessibility className="h-4 w-4 text-emerald-300" /></span></div>
              {settingsControls}
              <button type="button" onClick={closeSettings} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#91b88c]/40 bg-white/[0.04] px-3 text-xs font-bold text-white transition-colors hover:border-emerald-300/60 hover:bg-emerald-300/10 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-300">
                <ChevronLeft className="h-4 w-4" />
                Back to pause
              </button>
            </aside>
          </div>
        )}

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
        <div id="playable-theater-stage" inert={showSettings || hostPauseOverlay} className="relative flex-1 p-0 sm:p-2 md:p-3 flex flex-col items-center justify-center bg-[#05060D] overflow-hidden">
          <div inert={Boolean(gameResult)} className="relative z-0 flex min-h-0 w-full flex-1 flex-col items-center justify-center">
          {showingEngine || !game.htmlPath ? (
            hasLaunched ? renderEngine() : null
          ) : (
            <div className="w-full min-h-0 flex-1 flex flex-col items-center justify-center">
              <iframe ref={iframeRef} src={frameSrc()} title={game.title} className={`w-full min-h-0 flex-1 rounded-none sm:rounded-xl border-0 sm:border border-white/10 bg-black shadow-2xl ${frameVisible ? '' : 'opacity-0'} ${showSettings ? 'pointer-events-none' : ''}`} inert={showSettings || !frameVisible} allow="gamepad; fullscreen; autoplay; clipboard-write; focus-without-user-activation" tabIndex={0} onLoad={() => {
                advanceStage('loaded');
                try {
                  const frame = iframeRef.current;
                  if (frameVisible && !isPaused) { frame?.focus(); frame?.contentWindow?.focus(); }
                  frame?.contentWindow?.postMessage({ type: 'SET_DIFFICULTY', difficulty }, window.location.origin);
                  frame?.contentWindow?.postMessage({ type: 'SET_LEVEL', level: Math.max(1, Math.floor(startLevel)) }, window.location.origin);
                  frame?.contentWindow?.postMessage({ type: 'APEX_AUDIO_DEFAULTS', musicVolume: defaultPreferences.musicVolume, sfxVolume: defaultPreferences.sfxVolume }, window.location.origin);
                  const storedMotionPreference = window.localStorage.getItem(reducedMotionPreferenceKey(game.id));
                  const frameReducedMotion = storedMotionPreference === null ? (defaultPreferences.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches) : storedMotionPreference === 'true';
                  frame?.contentWindow?.postMessage({ type: 'SET_ACCESSIBILITY', reducedMotion: frameReducedMotion, gameId: game.id, colourBlindMode, performanceTier }, window.location.origin);
                  frame?.contentWindow?.postMessage({ type: 'SET_PERF_TIER', tier: performanceTier === 'auto' ? null : performanceTier }, window.location.origin);
                  if (isPaused) frame?.contentWindow?.postMessage({ type: 'SET_PAUSED', paused: true, gameId: game.id }, window.location.origin);
                  if (displayPreferences.pixelPerfect && frame?.contentDocument) frame.contentDocument.documentElement.style.imageRendering = 'pixelated';
                } catch {}
              }} />
            </div>
          )}
          {!hasLaunched && !showFrameMenu && (
            <div className="absolute inset-0 z-10 flex min-h-0 w-full flex-col items-center justify-end overflow-hidden rounded-none sm:rounded-2xl p-6 sm:p-10" style={{ background: `radial-gradient(circle at 75% 22%, ${game.accentColor}44, transparent 46%), rgba(5,6,13,.94)` }}>
              <div aria-hidden="true" className="pointer-events-none absolute right-6 top-6 grid h-20 w-20 place-items-center rounded-3xl border border-white/10 bg-white/5 text-5xl shadow-xl backdrop-blur-sm sm:right-8 sm:top-8 sm:h-24 sm:w-24 sm:text-6xl" style={{ boxShadow: `0 12px 48px ${game.accentColor}25` }}>{game.icon}</div>
              <span className="mb-3 font-mono text-xs uppercase tracking-widest text-cyan-300">{game.genre} - {game.players || '1P'} - {game.sessionMinutes || 10} min</span>
              <h3 className="text-3xl font-black text-white sm:text-5xl">{game.title}</h3>
              <p className="mt-3 max-w-xl text-sm text-slate-300">{game.storyBlurb || game.description}</p>
              <p className="mt-5 max-w-2xl rounded-xl border border-white/10 bg-black/20 p-3 font-mono text-xs text-slate-300">{game.controlsSummary}</p>
              <div className="mt-6 w-full max-w-xl" data-theater-loading>
                <div className="flex items-center justify-between gap-3 font-mono text-[10px] uppercase tracking-widest text-slate-400 sm:text-[11px]">
                  <span>{usesFrame ? loadingStage(frameStage, assetCount) : 'Engine ready'}</span>
                  <span>{Math.round(bootProgress * 100)}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label={`Loading ${game.title}`}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(bootProgress * 100)}
                  className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
                >
                  <div className="h-full rounded-full" style={{ width: `${Math.max(4, bootProgress * 100)}%`, backgroundColor: game.accentColor, boxShadow: `0 0 14px ${game.accentColor}` }} />
                </div>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <button data-ui-open data-theater-initial-focus onClick={requestRun} disabled={launchRequested} className="inline-flex min-h-12 w-fit items-center gap-2 rounded-xl px-5 text-sm font-black text-slate-950 disabled:opacity-70" style={{ backgroundColor: game.accentColor }}><Play className="h-4 w-4 fill-current" /> {launchRequested ? `Starting ${game.title}…` : `Play ${game.title}`}</button>
                {usesFrame && (
                  <button type="button" data-theater-menu onClick={requestFrameMenu} disabled={frameStage !== 'menu' || launchRequested} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 text-sm font-bold text-slate-200 transition-colors hover:bg-white/10 disabled:opacity-40">
                    <Sparkles className="h-4 w-4" /> {frameStage === 'menu' ? 'Modes & skins' : 'Preparing menu…'}
                  </button>
                )}
              </div>
            </div>
          )}
          </div>
          {!gameResult && showTouchPad && game.touchControls && <>
            {game.touchControls.pointerCursor && <div aria-hidden="true" data-virtual-cursor className="pointer-events-none absolute z-20 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-cyan-400/25 shadow-[0_0_14px_#67e8f9]" style={touchCursorStyle()} />}
            <TouchGamepad gameId={game.id} gameTitle={game.title} controls={game.touchControls} onKey={dispatchVirtualKey} onPointer={dispatchVirtualPointer} onCursorMove={moveTouchCursor} onPause={pauseGame} />
          </>}
          {gameResult && (
            <div data-game-result className="absolute inset-0 z-40 grid place-items-center overflow-y-auto bg-[#06100f]/70 p-4 backdrop-blur-md sm:p-8" role="dialog" aria-modal="true" aria-label={`${game.title} result`}>
              <section className="relative w-full max-w-md overflow-hidden rounded-[26px] border border-emerald-200/35 bg-[#102426]/[0.97] p-6 text-center shadow-[0_28px_100px_rgba(0,0,0,.6)] sm:p-8" style={{ boxShadow: `0 28px 100px rgba(0,0,0,.6), 0 0 44px ${game.accentColor}20`, borderColor: `${game.accentColor}88` }}>
                <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-32 opacity-70" style={{ background: `radial-gradient(ellipse at 50% 0%, ${game.accentColor}30, transparent 72%)` }} />
                <div className="relative">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-emerald-200/20 bg-emerald-300/10 text-emerald-200" style={{ color: gameResult.newBest ? '#6ee7b7' : game.accentColor }}>
                    <Trophy className="h-5 w-5" />
                  </div>
                  <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.24em] text-emerald-200/80">{game.title}</p>
                  <h2 className="mt-1 text-3xl font-black tracking-tight text-white sm:text-4xl">Game complete</h2>
                  <p className="mt-2 text-sm text-slate-300">{gameResult.newBest ? 'A new personal best. Nicely played.' : 'Final score saved. Ready for another round?'}</p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Final score</p>
                      <p className="mt-1 font-mono text-3xl font-black tabular-nums text-amber-300">{gameResult.score.toLocaleString()}</p>
                    </div>
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                      <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Best score</p>
                      <p className="mt-1 font-mono text-3xl font-black tabular-nums text-emerald-200">{gameResult.best.toLocaleString()}</p>
                    </div>
                  </div>
                  {gameResult.newBest && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-emerald-200/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-bold text-emerald-200"><Trophy className="h-3.5 w-3.5" /> Personal best</p>}
                  <div className="mt-6 grid gap-2 sm:grid-cols-2">
                    <button ref={resultPlayAgainRef} type="button" data-result-play-again onClick={handleResultPlayAgain} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-[#07130f] transition hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-200" style={{ backgroundColor: game.accentColor }}>
                      <RotateCcw className="h-4 w-4" /> Play again
                    </button>
                    <button type="button" data-result-save onClick={handleShareScore} disabled={isSharingScore} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/[0.06] px-4 text-sm font-bold text-white transition hover:border-emerald-200/40 hover:bg-emerald-200/10 disabled:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-200">
                      <Share2 className="h-4 w-4" /> {isSharingScore ? 'Preparing card…' : 'Save result card'}
                    </button>
                    <button type="button" data-result-back onClick={handleResultBackToMenu} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-4 text-xs font-bold text-slate-300 transition hover:border-white/25 hover:bg-white/5 hover:text-white focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-emerald-200 sm:col-span-2">
                      Back to menu
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}
        </div>

        {/* Bottom Helper Bar (Responsive layout) */}
        <div inert={isPaused} data-theater-helper className="px-3 sm:px-6 py-2 sm:py-2.5 bg-[#070913] border-t border-white/5 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-medium text-slate-300 truncate text-[11px] sm:text-xs">
              {game.controlsSummary}
            </span>
          </div>
          <div className="flex items-center gap-2 text-slate-400 font-mono text-[10px] sm:text-[11px] shrink-0">
            <button
              type="button"
              data-touch-pause
              onClick={pauseGame}
              disabled={!canPause}
              className="hidden [@media(pointer:coarse)]:inline-flex min-h-9 items-center rounded-lg border border-white/10 bg-white/5 px-3 font-sans text-[11px] font-bold text-slate-200 disabled:opacity-40"
              aria-label="Pause game"
            >
              Pause
            </button>
            <span className="hidden [@media(pointer:fine)]:inline-flex items-center gap-1.5 text-slate-500" aria-hidden="true">
              <kbd className="rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-slate-300">Esc</kbd>
              pause
            </span>
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

        {hostPauseOverlay && hasLaunched && (
          <TheaterPauseOverlay
            game={game}
            score={currentScore}
            difficulty={difficulty}
            settingsContent={settingsControls}
            onResume={resumeGame}
            onRestart={handleRestart}
            onExit={onClose}
          />
        )}
      </div>
    </div>
  );
};
