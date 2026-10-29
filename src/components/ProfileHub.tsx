import React, { useMemo, useRef, useState } from 'react';
import { Download, Upload, UserRound, Trophy, Flame, Zap, RotateCcw, Search, ChevronDown, Award, Layers3, Flag, Sparkles } from 'lucide-react';
import { GameCategory, GameInfo, PlayerStats } from '../types/game';
import { MetaState } from '../services/metaService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Chip } from './ui/Chip';

interface ProfileHubProps {
  stats: PlayerStats;
  meta: MetaState;
  games: GameInfo[];
  onSaveName: (name: string) => void;
  onExport: () => void;
  onImport: (raw: string) => boolean;
  onSelectGame: (gameId: string) => void;
  onStatsReset: () => void;
}

const AchievementTypeIcon: React.FC<{ id: string }> = ({ id }) => {
  const normalizedId = id.toLowerCase();
  const className = 'h-2.5 w-2.5';

  if (normalizedId.includes('medal')) return <Award className={className} />;
  if (normalizedId.includes('chain') || normalizedId.includes('reaction')) return <Zap className={className} />;
  if (normalizedId.includes('comeback')) return <RotateCcw className={className} />;
  if (normalizedId.includes('line') || normalizedId.includes('first')) return <Flag className={className} />;
  if (normalizedId.includes('merge') || normalizedId.includes('core') || normalizedId.includes('eightfold')) return <Layers3 className={className} />;
  return <Sparkles className={className} />;
};

export const ProfileHub: React.FC<ProfileHubProps> = ({ stats, meta, games, onSaveName, onExport, onImport, onSelectGame, onStatsReset }) => {
  const [name, setName] = useState(stats.profile?.name || 'Player One');
  const [message, setMessage] = useState('');
  const [recordFilter, setRecordFilter] = useState<'all' | 'scored' | GameCategory>('scored');
  const [recordSearch, setRecordSearch] = useState('');
  const [confirmingReset, setConfirmingReset] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const gameById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);
  const completed = Object.values(stats.levelProgress || {}).reduce((sum, value) => sum + Math.max(0, value), 0);
  const unlocked = Object.entries(stats.achievements || {}).flatMap(([gameId, ids]) =>
    ids.map((id) => ({ gameId, id, game: gameById.get(gameId) }))
  ).filter((entry) => entry.game);
  const stars = Math.min(games.reduce((sum, game) => sum + (game.levelCount || 0), 0), completed);
  const xp = meta.xp;
  const rank = meta.level >= 25 ? 'Grandmaster' : meta.level >= 10 ? 'Veteran' : meta.level >= 4 ? 'Challenger' : 'Cadet';
  const sessionSummaryByGame = useMemo(() => {
    const sessions = new Map<string, { latest: PlayerStats['recentSessions'][number]; count: number }>();
    stats.recentSessions.forEach((session) => {
      const current = sessions.get(session.gameId);
      sessions.set(session.gameId, current ? { latest: current.latest, count: current.count + 1 } : { latest: session, count: 1 });
    });
    return sessions;
  }, [stats.recentSessions]);
  const scoredGameCount = games.filter((game) => (stats.highScores[game.id] || 0) > 0).length;
  const recordGames = games.filter((game) => {
    const score = stats.highScores[game.id] || 0;
    if (recordFilter === 'scored' && score <= 0) return false;
    if (recordFilter !== 'all' && recordFilter !== 'scored' && game.category !== recordFilter) return false;
    const query = recordSearch.trim().toLowerCase();
    return !query || game.title.toLowerCase().includes(query) || game.category.toLowerCase().includes(query);
  }).sort((a, b) => (stats.highScores[b.id] || 0) - (stats.highScores[a.id] || 0) || a.gameNumber - b.gameNumber);

  return <section id="profile" className="scroll-mt-24 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-label="Player profile">
    <Card className="rounded-3xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-4">
        <div data-profile-avatar className="grid h-16 w-16 place-items-center rounded-2xl border border-line text-3xl" style={{ background: `hsl(${(stats.profile?.avatarSeed || 17) * 19 % 360} 65% 35%)` }}><UserRound /></div>
        <div className="min-w-[180px] flex-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Player profile</div>
          <Input aria-label="Player name" value={name} maxLength={24} onChange={(event) => setName(event.target.value)} onBlur={() => onSaveName(name.trim() || 'Player One')} className="mt-1 h-11 max-w-xs border-transparent bg-transparent !px-0 text-xl font-black focus-visible:border-line" />
          <div data-profile-meta className="text-xs text-fg-muted">{rank} · Level {meta.level} · {xp.toLocaleString()} XP · {stats.totalPlayCount} sessions</div>
        </div>
        <Button variant="secondary" onClick={onExport} className="text-xs"><Download className="h-4 w-4" /> Export save</Button>
        <Button onClick={() => fileRef.current?.click()} className="text-xs"><Upload className="h-4 w-4" /> Import save</Button>
        <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={(event) => { const file = event.currentTarget.files?.[0]; if (!file) return; const reader = new FileReader(); reader.onload = () => setMessage(onImport(String(reader.result)) ? 'Save imported.' : 'That file is not a valid Apex save.'); reader.readAsText(file); event.currentTarget.value = ''; }} />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 text-center text-xs sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl bg-surface-2 p-3"><b className="block text-lg text-warning">{stars}</b>Stars earned</div>
        <div className="rounded-xl bg-surface-2 p-3"><b className="block text-lg text-success">{unlocked.length}</b>Achievements</div>
        <div className="rounded-xl bg-surface-2 p-3"><b className="block text-lg text-accent">{completed}</b>Levels complete</div>
        <div data-profile-sparks className="rounded-xl bg-surface-2 p-3"><b className="flex items-center justify-center gap-1 text-lg text-warning"><Zap className="h-4 w-4" />{meta.sparks.toLocaleString()}</b>Sparks</div>
        <div className="rounded-xl bg-surface-2 p-3"><b className="flex items-center justify-center gap-1 text-lg text-danger"><Flame className="h-4 w-4" />{meta.streak.count}</b>Day streak · {meta.streak.freezes} freezes</div>
      </div>

      <div className="mt-6">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-bold text-fg"><Trophy className="h-4 w-4 text-warning" /> Cross-game achievement wall</h2>
        {unlocked.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{unlocked.map(({ gameId, id, game }) => <div key={`${gameId}-${id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-accent-soft p-3"><span aria-hidden="true" className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-surface text-lg">{game?.icon}<span className="absolute -bottom-1 -right-1 grid h-4 w-4 place-items-center rounded-full border border-surface bg-warning text-surface"><AchievementTypeIcon id={id} /></span></span><span className="min-w-0"><b className="block truncate text-xs text-fg">{id.replaceAll(/[-_]/g, ' ')}</b><span className="block truncate text-[10px] text-fg-muted">{game?.title}</span></span></div>)}</div> : <p className="rounded-xl border border-dashed border-line p-4 text-xs text-fg-muted">Achievements unlocked in games will appear here.</p>}
      </div>

      <details className="group mt-6 overflow-hidden rounded-xl border border-line bg-surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
          <span className="flex min-w-0 items-center gap-2 text-sm font-bold text-fg"><Trophy className="h-4 w-4 shrink-0 text-warning" /><span className="truncate">High Scores &amp; Session Records</span></span>
          <span className="flex shrink-0 items-center gap-2"><span className="rounded-full border border-line bg-surface-2 px-2.5 py-1 text-[10px] font-semibold text-fg-muted">{scoredGameCount} scored</span><ChevronDown aria-hidden="true" className="h-4 w-4 text-fg-muted transition-transform group-open:rotate-180" /></span>
        </summary>
        <div className="border-t border-line p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-fg">Your arcade records</p>
              <p className="mt-0.5 text-xs text-fg-muted">Scores and recent play dates saved in this browser.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[180px] flex-1 lg:flex-none">
                <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle" />
                <input value={recordSearch} onChange={(event) => setRecordSearch(event.target.value)} placeholder="Find a game" aria-label="Search profile game records" className="min-h-10 w-full rounded-xl border border-line bg-surface-2 pl-9 pr-3 text-xs text-fg placeholder:text-fg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent" />
              </label>
              {confirmingReset ? <div role="group" aria-label="Confirm save reset" className="flex items-center gap-2 rounded-xl border border-danger/30 bg-danger/10 px-2 py-1">
                <span className="text-[10px] text-danger">Erase saved stats?</span>
                <button type="button" onClick={() => { onStatsReset(); setConfirmingReset(false); }} className="min-h-10 rounded-lg bg-danger px-2.5 py-1 text-[11px] font-bold text-accent-fg hover:brightness-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger">Confirm</button>
                <Button variant="ghost" onClick={() => setConfirmingReset(false)} className="min-h-10 rounded-lg px-2 py-1 text-[11px]">Cancel</Button>
              </div> : <button type="button" onClick={() => setConfirmingReset(true)} className="flex min-h-10 items-center gap-1.5 rounded-xl border border-line bg-surface-2 px-3 text-xs text-fg-muted transition-colors hover:border-danger/40 hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger"><RotateCcw className="h-3.5 w-3.5" />Reset stats</button>}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Filter profile records">
            {(['scored', 'all', 'arcade', 'board', 'sports', 'puzzle', 'cards'] as const).map((filter) => (
              <Chip key={filter} selected={recordFilter === filter} onClick={() => setRecordFilter(filter)} className="rounded-lg px-3 py-1.5 text-xs capitalize">{filter === 'scored' ? 'Scored' : filter === 'all' ? 'All games' : filter}</Chip>
            ))}
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-line">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-surface-2 text-[10px] uppercase tracking-wider text-fg-muted">
                <tr><th className="px-3 py-2.5">Game</th><th className="px-3 py-2.5">Category</th><th className="px-3 py-2.5">Personal best</th><th className="px-3 py-2.5">Recent sessions</th><th className="px-3 py-2.5">Last played</th><th className="px-3 py-2.5 text-right">Action</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {recordGames.map((game) => {
                  const score = stats.highScores[game.id] || 0;
                  const sessionSummary = sessionSummaryByGame.get(game.id);
                  return <tr key={game.id} className="transition-colors hover:bg-surface-2">
                    <td className="px-3 py-2.5 font-semibold text-fg">{game.title}</td>
                    <td className="px-3 py-2.5 capitalize text-fg-muted">{game.category}</td>
                    <td className="px-3 py-2.5 font-mono font-bold tabular-nums text-accent">{score > 0 ? score.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2.5 text-fg-muted">{sessionSummary?.count ?? 0}</td>
                    <td className="px-3 py-2.5 text-fg-muted">{sessionSummary?.latest.date || '—'}</td>
                    <td className="px-3 py-2.5 text-right"><button type="button" data-ui-open onClick={() => onSelectGame(game.id)} className="min-h-9 rounded-lg border border-accent/30 bg-accent-soft px-3 text-[11px] font-semibold text-accent transition-colors hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">Play</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
            {recordGames.length === 0 && <div className="px-4 py-8 text-center text-xs text-fg-muted">{recordFilter === 'scored' && scoredGameCount === 0 ? 'No scores saved yet. Play a game and your best will appear here.' : 'No games match these filters.'}</div>}
          </div>
          <p className="mt-2 text-[10px] text-fg-subtle">Recent play dates show up to the last 20 saved sessions. Your records stay on this device.</p>
        </div>
      </details>
      {message && <p role="status" className="mt-3 text-xs text-accent">{message}</p>}
    </Card>
  </section>;
};
