import React from 'react';
import { Gamepad2 } from 'lucide-react';
import { GAMES_DATA } from '../data/gamesData';

export const Footer: React.FC = () => {
  const count = GAMES_DATA.length;
  return (
    <footer className="w-full bg-surface border-t border-line py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-fg-muted text-center sm:text-left">
        <div className="flex items-center gap-2 text-fg-muted">
          <Gamepad2 className="w-4 h-4 text-accent shrink-0" />
          <span className="font-semibold text-fg">Apex Arcade</span>
          <span>·</span>
          <span>{count} Retro &amp; Tabletop Anthology</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 md:gap-0 text-fg-muted text-[11px] sm:text-xs">
          <span>{count} Masterpiece Games</span>
          <span aria-hidden="true" className="text-fg-subtle">·</span>
          <span>HTML5 Canvas &amp; Web Audio</span>
          <span aria-hidden="true" className="text-fg-subtle">·</span>
          <span>Zero Server Latency</span>
        </div>
      </div>
    </footer>
  );
};
