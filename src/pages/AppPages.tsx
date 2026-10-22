import React from 'react';
import { ArrowLeft, ArrowRight, Award, BookOpen, Clock3, Gamepad2, Link2, Settings, Sparkles, Trophy, Users } from 'lucide-react';
import { GameInfo, PlayerStats } from '../types/game';
import { LauncherHome } from '../components/LauncherHome';
import { GameCatalog } from '../components/GameCatalog';
import { TelemetryDashboard } from '../components/TelemetryDashboard';
import { AboutAnthology } from '../components/AboutAnthology';
import { ProfileHub } from '../components/ProfileHub';
import { Button } from '../components/ui/Button';
import { CardScenePreview } from '../components/CardScenePreview';
import { Card } from '../components/ui/Card';
import { useState } from 'react';

type CatalogProps = React.ComponentProps<typeof GameCatalog>;
type ProfileProps = React.ComponentProps<typeof ProfileHub>;

export function HomePage({ games, stats, onLaunchGame, onExplore, catalog, telemetry, about, profile }: {
  games: GameInfo[]; stats: PlayerStats; onLaunchGame: (game: GameInfo, startLevel?: number, seed?: number) => void; onExplore: () => void;
  catalog: CatalogProps; telemetry: React.ComponentProps<typeof TelemetryDashboard>; about: boolean; profile: ProfileProps;
}) {
  return <>
    <LauncherHome games={games} stats={stats} onLaunchGame={onLaunchGame} onExplore={onExplore} />
    <GameCatalog {...catalog} />
    <TelemetryDashboard {...telemetry} />
    {about && <AboutAnthology />}
    <ProfileHub {...profile} />
  </>;
}

export function BrowsePage({ catalog }: { catalog: CatalogProps }) {
  return <div className="min-h-[70vh] pt-5"><GameCatalog {...catalog} /></div>;
}

export function ProfilePage({ profile }: { profile: ProfileProps }) {
  return <div className="min-h-[70vh] pt-8"><ProfileHub {...profile} /></div>;
}

export function GamePage({ game, games, stats, onPlay, onBrowse }: { game?: GameInfo; games: GameInfo[]; stats: PlayerStats; onPlay: (game: GameInfo) => void; onBrowse: () => void }) {
  const [shareLabel, setShareLabel] = useState('Share game');
  const [shareError, setShareError] = useState('');
  if (!game) return <NotFoundPage title="Game not found" detail="That game ID does not match a title in this collection." onHome={onBrowse} />;
  const playCount = stats.recentSessions.filter((session) => session.gameId === game.id).length;
  const bestScore = stats.highScores[game.id] || 0;
  const unlockedAchievements = stats.achievements?.[game.id] || [];
  const related = games.filter((candidate) => candidate.id !== game.id)
    .map((candidate) => ({ game: candidate, shared: (candidate.tags || []).filter((tag) => game.tags?.includes(tag)).length }))
    .sort((a, b) => b.shared - a.shared || Number(b.game.category === game.category) - Number(a.game.category === game.category) || a.game.gameNumber - b.game.gameNumber)
    .slice(0, 4).map(({ game: candidate }) => candidate);
  const inputLabels: Record<string, string> = { keyboard: 'Keyboard', touch: 'Touch', gamepad: 'Gamepad', mouse: 'Mouse' };
  const handleShare = async () => {
    setShareError('');
    const url = new URL(window.location.href);
    url.hash = `#/game/${encodeURIComponent(game.id)}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${game.title} · Apex Arcade`, text: game.tagline, url: url.toString() });
        setShareLabel('Shared');
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url.toString());
        setShareLabel('Link copied');
      } else {
        throw new Error('Sharing is unavailable in this browser.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareError(error instanceof Error ? error.message : 'Could not share this game.');
    }
  };
  const heading = (title: string, icon: React.ReactNode) => <h2 className="mb-4 flex items-center gap-2 text-lg font-bold text-fg"><span className="text-accent">{icon}</span>{title}</h2>;
  return <main className="mx-auto min-h-[70vh] w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8" data-game-page={game.id}>
    <button onClick={onBrowse} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-fg-muted hover:text-fg"><ArrowLeft className="h-4 w-4" /> Browse all games</button>
    <section className="grid overflow-hidden rounded-3xl border border-line bg-surface shadow-card lg:grid-cols-[1.1fr_.9fr]" aria-label={`${game.title} overview`}>
      <div className="flex flex-col justify-center p-6 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">Game {String(game.gameNumber).padStart(2, '0')} · {game.category} · {game.era}</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight text-fg sm:text-6xl">{game.title}</h1>
        <p className="mt-3 text-lg text-fg-muted">{game.tagline}</p>
        <p className="mt-6 max-w-3xl leading-7 text-fg-muted">{game.description}</p>
        <div className="mt-6 flex flex-wrap gap-3"><Button data-ui-open onClick={() => onPlay(game)}><Sparkles className="mr-2 h-4 w-4" /> Play now</Button><Button variant="secondary" onClick={handleShare}><Link2 className="mr-2 h-4 w-4" />{shareLabel}</Button></div>
        {shareError && <p role="status" className="mt-2 text-xs text-danger">{shareError}</p>}
      </div>
      <div className="min-h-[210px] border-t border-line lg:min-h-[340px] lg:border-l lg:border-t-0"><CardScenePreview game={game} isHovered containerClassName="!h-full min-h-[210px] lg:min-h-[340px]" /></div>
    </section>

    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(280px,.8fr)]">
      <div className="space-y-8">
        <section aria-label="Available modes">{heading('Modes', <Gamepad2 className="h-5 w-5" />)}<div className="grid gap-3 sm:grid-cols-2">{(game.modes?.length ? game.modes : ['Classic']).map((mode) => <Card key={mode} className="flex items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-xl bg-accent-soft text-accent">{game.icon}</span><span className="text-sm font-semibold text-fg">{mode}</span></Card>)}</div></section>
        <section aria-label="Controls diagram">{heading('How to play', <Gamepad2 className="h-5 w-5" />)}<div className="grid gap-3 sm:grid-cols-2">{(game.inputs?.length ? game.inputs : ['keyboard']).map((input) => <Card key={input} className="p-4"><div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent"><span className="grid h-8 w-8 place-items-center rounded-lg bg-accent-soft">{input === 'touch' ? '↔' : input === 'mouse' ? '⌖' : input === 'gamepad' ? '◉' : '⌨'}</span>{inputLabels[input] || input}</div><p className="text-xs leading-relaxed text-fg-muted">{game.controlsSummary}</p><p className="mt-2 border-t border-line pt-2 font-mono text-[11px] text-fg">{game.keys}</p></Card>)}</div></section>
        <section aria-label="Achievement preview">{heading('Achievement preview', <Award className="h-5 w-5" />)}<Card className="p-5"><div className="flex items-center gap-3"><Trophy className="h-8 w-8 text-warning" /><div><p className="text-sm font-bold text-fg">{unlockedAchievements.length ? `${unlockedAchievements.length} unlocked` : 'Ready to earn'}</p><p className="text-xs text-fg-muted">{unlockedAchievements.length ? 'Recorded on this device' : 'Achievements from this game will appear here when earned.'}</p></div></div>{unlockedAchievements.length > 0 && <ul className="mt-4 flex flex-wrap gap-2">{unlockedAchievements.map((id) => <li key={id} className="rounded-full border border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-fg">{id.replaceAll(/[-_]/g, ' ')}</li>)}</ul>}</Card></section>
      </div>
      <aside className="space-y-8">
        <section aria-label="Your stats">{heading('Your stats', <Sparkles className="h-5 w-5" />)}<div className="grid grid-cols-2 gap-3"><Card className="p-4"><span className="text-[10px] uppercase tracking-wider text-fg-muted">Best score</span><strong className="mt-1 block text-2xl font-black text-fg">{bestScore.toLocaleString()}</strong></Card><Card className="p-4"><span className="text-[10px] uppercase tracking-wider text-fg-muted">Recent plays</span><strong className="mt-1 block text-2xl font-black text-fg">{playCount}</strong></Card><Card className="p-4"><span className="text-[10px] uppercase tracking-wider text-fg-muted">Levels cleared</span><strong className="mt-1 block text-2xl font-black text-fg">{stats.levelProgress?.[game.id] || 0} / {game.levelCount || 1}</strong></Card><Card className="p-4"><span className="text-[10px] uppercase tracking-wider text-fg-muted">Session length</span><strong className="mt-1 flex items-center gap-1 text-2xl font-black text-fg"><Clock3 className="h-4 w-4 text-accent" />{game.sessionMinutes || 10}m</strong></Card></div></section>
        <section aria-label="Game facts">{heading('At a glance', <Users className="h-5 w-5" />)}<Card className="space-y-3 p-4 text-sm"><p className="flex justify-between gap-3"><span className="text-fg-muted">Players</span><span className="font-semibold text-fg">{game.players || '1P'}</span></p><p className="flex justify-between gap-3"><span className="text-fg-muted">Developer</span><span className="text-right font-semibold text-fg">{game.developer}</span></p><p className="flex justify-between gap-3"><span className="text-fg-muted">Year</span><span className="font-semibold text-fg">{game.year}</span></p><p className="flex justify-between gap-3"><span className="text-fg-muted">Difficulty</span><span className="font-semibold text-fg">{game.difficulty}</span></p></Card></section>
      </aside>
    </div>
    {related.length > 0 && <section aria-label="Related games">{heading('Related games', <ArrowRight className="h-5 w-5" />)}<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{related.map((candidate) => <Card key={candidate.id} interactive className="p-4"><button type="button" data-related-game={candidate.id} onClick={() => { window.location.hash = `#/game/${encodeURIComponent(candidate.id)}`; window.scrollTo({ top: 0, behavior: 'instant' }); }} className="absolute inset-0 z-10 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" aria-label={`View ${candidate.title}`} /><span aria-hidden="true" className="relative flex items-center gap-3"><span className="text-3xl">{candidate.icon}</span><span className="min-w-0"><strong className="block truncate text-sm text-fg">{candidate.title}</strong><span className="text-xs text-fg-muted">{candidate.genre}</span></span></span></Card>)}</div></section>}
  </main>;
}

export function UtilityPage({ kind, onHome }: { kind: 'quests' | 'collections' | 'settings'; onHome: () => void }) {
  const heading = kind === 'quests' ? 'Quests' : kind === 'collections' ? 'Collections' : 'Settings';
  const Icon = kind === 'settings' ? Settings : BookOpen;
  return <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col items-start justify-center px-4 py-16 sm:px-6 lg:px-8">
    <Icon className="h-8 w-8 text-accent" /><h1 className="mt-5 text-4xl font-black text-fg">{heading}</h1>
    <p className="mt-3 max-w-xl text-fg-muted">This destination is ready for its next feature pass. Your profile, games, and theme remain available.</p>
    <Button variant="secondary" className="mt-7" onClick={onHome}>Return home <ArrowRight className="ml-2 h-4 w-4" /></Button>
  </main>;
}

export function NotFoundPage({ title = 'Page not found', detail = 'That route is not part of Apex Arcade.', onHome }: { title?: string; detail?: string; onHome: () => void }) {
  return <main className="mx-auto flex min-h-[70vh] w-full max-w-4xl flex-col items-start justify-center px-4 py-16 sm:px-6 lg:px-8"><p className="text-sm font-bold uppercase tracking-[0.2em] text-accent">404</p><h1 className="mt-3 text-4xl font-black text-fg">{title}</h1><p className="mt-3 text-fg-muted">{detail}</p><Button variant="secondary" className="mt-7" onClick={onHome}>Go home <ArrowRight className="ml-2 h-4 w-4" /></Button></main>;
}
