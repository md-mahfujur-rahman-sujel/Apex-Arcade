import React, { useMemo, useRef, useState } from 'react';
import { Download, Upload, UserRound, Trophy, Star, Flame, Zap } from 'lucide-react';
import { GameInfo, PlayerStats } from '../types/game';
import { MetaState } from '../services/metaService';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

interface ProfileHubProps {
  stats: PlayerStats;
  meta: MetaState;
  games: GameInfo[];
  onSaveName: (name: string) => void;
  onExport: () => void;
  onImport: (raw: string) => boolean;
}

export const ProfileHub: React.FC<ProfileHubProps> = ({ stats, meta, games, onSaveName, onExport, onImport }) => {
  const [name, setName] = useState(stats.profile?.name || 'Player One');
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const gameById = useMemo(() => new Map(games.map((game) => [game.id, game])), [games]);
  const completed = Object.values(stats.levelProgress || {}).reduce((sum, value) => sum + Math.max(0, value), 0);
  const unlocked = Object.entries(stats.achievements || {}).flatMap(([gameId, ids]) =>
    ids.map((id) => ({ gameId, id, game: gameById.get(gameId) }))
  ).filter((entry) => entry.game);
  const stars = Math.min(games.reduce((sum, game) => sum + (game.levelCount || 0), 0), completed);
  const xp = meta.xp;
  const rank = meta.level >= 25 ? 'Grandmaster' : meta.level >= 10 ? 'Veteran' : meta.level >= 4 ? 'Challenger' : 'Cadet';

  return <section id="profile" className="scroll-mt-24 mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8" aria-label="Player profile">
    <Card className="rounded-3xl p-5 sm:p-7">
      <div className="flex flex-wrap items-center gap-4">
        <div data-profile-avatar className="grid h-16 w-16 place-items-center rounded-2xl border border-line text-3xl" style={{ background: `hsl(${(stats.profile?.avatarSeed || 17) * 19 % 360} 65% 35%)` }}><UserRound /></div>
        <div className="min-w-[180px] flex-1">
          <div className="text-[10px] font-mono uppercase tracking-widest text-accent">Local player profile</div>
          <Input aria-label="Player name" value={name} maxLength={24} onChange={(event) => setName(event.target.value)} onBlur={() => onSaveName(name.trim() || 'Player One')} className="mt-1 h-11 max-w-xs border-transparent bg-transparent px-0 text-xl font-black focus-visible:border-line" />
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
        {unlocked.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{unlocked.map(({ gameId, id, game }) => <div key={`${gameId}-${id}`} className="flex min-w-0 items-center gap-3 rounded-xl border border-line bg-accent-soft p-3"><Star className="h-4 w-4 shrink-0 text-warning" /><span className="min-w-0"><b className="block truncate text-xs text-fg">{id.replaceAll(/[-_]/g, ' ')}</b><span className="block truncate text-[10px] text-fg-muted">{game?.title}</span></span></div>)}</div> : <p className="rounded-xl border border-dashed border-line p-4 text-xs text-fg-muted">Achievements unlocked in games will appear here.</p>}
      </div>

      <details className="mt-6 rounded-xl border border-line bg-surface">
        <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-fg">Per-game stats</summary>
        <div className="overflow-x-auto border-t border-line"><table className="w-full min-w-[520px] text-left text-xs"><thead className="text-[10px] uppercase tracking-wider text-fg-muted"><tr><th className="px-4 py-2">Game</th><th className="px-4 py-2">Best score</th><th className="px-4 py-2">Levels</th><th className="px-4 py-2">Achievements</th><th className="px-4 py-2">Recent sessions</th></tr></thead><tbody>{games.map((game) => { const levels = stats.levelProgress?.[game.id] || 0; const achievementCount = stats.achievements?.[game.id]?.length || 0; const sessions = stats.recentSessions.filter((session) => session.gameId === game.id).length; return <tr key={game.id} className="border-t border-line hover:bg-surface-2"><td className="px-4 py-2 font-semibold text-fg">{game.title}</td><td className="px-4 py-2 font-mono text-accent">{stats.highScores[game.id] || 0}</td><td className="px-4 py-2 text-fg-muted">{levels}/{game.levelCount || '—'}</td><td className="px-4 py-2 text-warning">{achievementCount}</td><td className="px-4 py-2 text-fg-muted">{sessions}</td></tr>; })}</tbody></table></div>
      </details>
      {message && <p role="status" className="mt-3 text-xs text-accent">{message}</p>}
    </Card>
  </section>;
};
