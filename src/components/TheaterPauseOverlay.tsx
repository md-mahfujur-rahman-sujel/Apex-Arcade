import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, LogOut, Play, RotateCcw, Settings2 } from 'lucide-react';
import { DifficultySetting, GameInfo } from '../types/game';

interface TheaterPauseOverlayProps {
  game: GameInfo;
  score: number;
  difficulty: DifficultySetting;
  settingsContent: React.ReactNode;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
}

const FOCUSABLE = 'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const TheaterPauseOverlay: React.FC<TheaterPauseOverlayProps> = ({
  game,
  score,
  difficulty,
  settingsContent,
  onResume,
  onRestart,
  onExit,
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLButtonElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    const resume = overlayRef.current?.querySelector<HTMLElement>('[data-pause-primary]');
    resume?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    if (showSettings) backRef.current?.focus({ preventScroll: true });
  }, [showSettings]);

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab' || !overlayRef.current) return;
    const items = Array.from(overlayRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
    if (!items.length) {
      event.preventDefault();
      return;
    }
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !overlayRef.current.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && (active === last || !overlayRef.current.contains(active))) {
      event.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={overlayRef}
      data-pause-overlay
      role="dialog"
      aria-modal="true"
      aria-label="Game paused"
      className="absolute inset-0 z-[80] overflow-y-auto bg-[#05060D]/95 backdrop-blur-xl"
      onKeyDown={trapFocus}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: `radial-gradient(circle at 50% 18%, ${game.accentColor}2e, transparent 46%)` }}
      />
      <div className="relative z-10 flex min-h-full items-center justify-center p-3 sm:p-8">
        <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-white/15 bg-[#0d1322]/98 shadow-[0_32px_120px_rgba(0,0,0,0.7)]">
          <div className="h-1 w-full" style={{ backgroundColor: game.accentColor }} />
          <div className="p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  aria-hidden="true"
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-2xl"
                  style={{ boxShadow: `0 10px 36px ${game.accentColor}22` }}
                >
                  {game.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">
                    {showSettings ? 'Paused' : 'Session paused'}
                  </p>
                  <h2 id="theater-pause-title" className="truncate text-2xl font-black tracking-tight text-white sm:text-3xl">
                    {showSettings ? 'Theater settings' : 'Paused'}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-slate-400">{game.title}</p>
                </div>
              </div>
              <kbd className="hidden shrink-0 rounded-lg border border-white/15 bg-white/5 px-2 py-1 font-mono text-[10px] text-slate-300 sm:block">
                Esc
              </kbd>
            </div>

            {!showSettings && (
              <>
                <div className="mt-5 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-300">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 capitalize">{difficulty}</span>
                  {score > 0 && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 font-mono text-cyan-300">
                      Score {score.toLocaleString()}
                    </span>
                  )}
                  <span className="text-slate-500">Your progress is safe.</span>
                </div>

                <div className="mt-6 grid gap-2.5">
                  <button
                    type="button"
                    data-pause-primary
                    onClick={onResume}
                    className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-black text-slate-950 transition-transform hover:brightness-110 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-white"
                    style={{ backgroundColor: game.accentColor }}
                  >
                    <Play className="h-4 w-4 fill-current" />
                    Resume
                  </button>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={onRestart}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-cyan-300"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Restart
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSettings(true)}
                      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-cyan-300"
                    >
                      <Settings2 className="h-4 w-4" />
                      Settings
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={onExit}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-transparent px-3 text-xs font-bold text-slate-300 transition-colors hover:border-rose-400/40 hover:bg-rose-500/10 hover:text-rose-300 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-rose-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Exit to Arcade
                  </button>
                </div>

                <p className="mt-5 text-center text-[11px] text-slate-500">
                  Press <span className="font-mono text-slate-300">Esc</span> anytime to resume
                </p>
              </>
            )}

            {showSettings && (
              <div className="mt-5">
                <div className="max-h-[55vh] overflow-y-auto pr-1">{settingsContent}</div>
                <button
                  ref={backRef}
                  type="button"
                  onClick={() => setShowSettings(false)}
                  className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 text-xs font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-cyan-300"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back to pause
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
