import React, { useCallback, useEffect, useState } from 'react';
import { GameInfo } from '../types/game';
import { CardScenePreview } from './CardScenePreview';
import { X, Play, Award, Zap, Gamepad2, Calendar, User, Monitor, Images } from 'lucide-react';
import { Card } from './ui/Card';
import { ScreenBezel } from './ui/ScreenBezel';
import { Button } from './ui/Button';
import { Select } from './ui/Input';

interface GameDossierModalProps {
  game: GameInfo | null;
  onClose: () => void;
  onLaunchGame: (game: GameInfo, startLevel?: number) => void;
  levelProgress?: number;
}

export const GameDossierModal: React.FC<GameDossierModalProps> = ({
  game,
  onClose,
  onLaunchGame,
  levelProgress = 0,
}) => {
  const [capturedStills, setCapturedStills] = useState<string[]>([]);
  const [startLevel, setStartLevel] = useState(1);
  const captureStill = useCallback((still: string) => {
    setCapturedStills((current) => current.length >= 3 ? current : [...current, still]);
  }, []);
  useEffect(() => {
    setCapturedStills([]);
    setStartLevel(1);
  }, [game?.id]);
  if (!game) return null;

  const maxStartLevel = Math.max(1, Math.min(game.levelCount || 1, Math.floor(levelProgress) + 1));

  return (
    <div
      data-dossier-backdrop
      className="fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-md overflow-y-auto"
      style={{ backgroundColor: 'rgb(0 0 0 / 80%)' }}
      onClick={onClose}
    >
      <Card
        className="my-8 w-full max-w-2xl overflow-hidden rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Strip */}
        <ScreenBezel className="relative aspect-[16/7] w-full border-b border-line">
          <CardScenePreview game={game} isHovered captureFrames onCapture={captureStill} containerClassName="!h-full" />
          <button
            data-ui-close
            onClick={onClose}
            aria-label="Close Modal"
            className="absolute right-4 top-4 grid min-h-11 min-w-11 place-items-center rounded-full border border-line bg-surface-2 text-fg-muted shadow-pop transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-stage"
          >
            <X className="w-4 h-4" />
          </button>

        </ScreenBezel>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-card px-6 py-4 md:px-8">
          <div>
            <div className="mb-1 flex items-center gap-2 font-mono text-xs text-fg-muted">
              <span>{game.era}</span><span aria-hidden="true">·</span><span>{game.year}</span>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-fg md:text-3xl">{game.title}</h2>
          </div>
          {(game.playableEngineId || game.htmlPath) && <Button onClick={() => { onClose(); onLaunchGame(game, startLevel); }} className="text-xs"><Play className="h-4 w-4 fill-current" />Play Game</Button>}
        </div>

        {/* Modal Body */}
        <div className="max-h-[60vh] space-y-6 overflow-y-auto bg-card p-6 md:p-8">
          {/* Quick Fact Grid */}
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-line bg-surface-2 p-4 text-xs sm:grid-cols-3">
            <div className="flex items-center gap-2 text-fg-muted">
              <Calendar className="w-4 h-4 text-fg-muted shrink-0" />
              <div>
                <span className="block text-[10px] text-fg-muted uppercase">Released</span>
                <span className="font-medium text-fg">{game.year}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-fg-muted">
              <User className="w-4 h-4 text-fg-muted shrink-0" />
              <div>
                <span className="block text-[10px] text-fg-muted uppercase">Creator / Studio</span>
                <span className="block truncate font-medium text-fg">{game.developer}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-fg-muted">
              <Monitor className="w-4 h-4 text-fg-muted shrink-0" />
              <div>
                <span className="block text-[10px] text-fg-muted uppercase">Original Hardware</span>
                <span className="font-medium text-fg">{game.originalPlatform}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-line bg-surface-2 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-fg"><Images className="h-4 w-4 text-accent" />Captured scene stills</div>
            {capturedStills.length ? <div className="grid grid-cols-3 gap-2">{capturedStills.map((still, index) => <img key={`${game.id}-still-${index}`} src={still} alt={`${game.title} preview still ${index + 1}`} className="aspect-video w-full rounded-lg border border-line object-cover" />)}</div> : <p className="text-xs text-fg-muted">Capturing preview moments…</p>}
          </div>

          {/* Overview */}
          <div>
            <h3 className="text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
              Historical Overview
            </h3>
            <p className="text-sm text-fg-muted leading-relaxed">
              {game.description}
            </p>
          </div>

          {game.legacy?.trim() && (
            <div className="p-4 bg-accent-soft border border-accent/20 rounded-xl">
              <div className="flex items-center gap-2 text-xs font-semibold text-accent uppercase tracking-wider mb-2">
                <Award className="w-4 h-4" />
                <span>Cultural Legacy &amp; Breakthrough</span>
              </div>
              <p className="text-sm text-fg-muted leading-relaxed">
                {game.legacy}
              </p>
            </div>
          )}

          {game.keyMechanics && game.keyMechanics.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-fg-muted uppercase tracking-wider mb-3">
                <Zap className="w-4 h-4 text-warning" />
                <span>Signature Mechanics</span>
              </div>
              <ul className="space-y-2">
                {game.keyMechanics.map((mech, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-xs text-fg-muted">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                    <span>{mech}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Controls Summary */}
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-fg-muted uppercase tracking-wider mb-2">
              <Gamepad2 className="w-4 h-4 text-success" />
              <span>Control Configuration</span>
            </div>
            <p className="text-xs font-mono text-fg bg-sunken p-3 rounded-lg border border-line">
              {game.controlsSummary}
            </p>
          </div>

          <div className="rounded-xl border border-accent/20 bg-accent-soft p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-accent">Difficulty explained</h3>
            <p className="text-sm leading-relaxed text-fg-muted">Catalog challenge: <strong className="text-fg">{game.difficulty}</strong>. Theater difficulty changes the game’s challenge where supported; arcade titles generally adjust pace or hazards, while board titles adjust opponent strength or response. Individual games may interpret this setting differently.</p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface-2 p-4">
            <div><h3 className="text-xs font-semibold uppercase tracking-wider text-fg">Start from level</h3><p className="mt-1 text-[11px] text-fg-muted">Unlocked through level {maxStartLevel}{levelProgress > 0 ? ` · ${levelProgress} cleared` : ' · Level 1 available'}</p></div>
            <div className="flex items-center gap-2"><Select aria-label="Start level" value={startLevel} onChange={(event) => setStartLevel(Number(event.target.value))} className="min-h-11 rounded-lg px-3 text-sm">{Array.from({ length: maxStartLevel }, (_, index) => index + 1).map((level) => <option key={level} value={level}>Level {level}</option>)}</Select><Button data-ui-open onClick={() => { onClose(); onLaunchGame(game, startLevel); }} className="text-xs"><Play className="h-3.5 w-3.5 fill-current" />Play</Button></div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-line bg-surface p-4 px-6 md:px-8">
          <div className="text-xs text-fg-muted">
            Genre: <span className="font-medium text-fg">{game.genre}</span>
          </div>
          <button
            data-ui-close
            onClick={onClose}
            className="min-h-11 rounded-xl border border-line bg-surface-2 px-4 py-2 text-xs font-medium text-fg-muted transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            Close Dossier
          </button>
        </div>
      </Card>
    </div>
  );
};
