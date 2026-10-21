import React from 'react';
import { Gamepad2 } from 'lucide-react';
import { GAMES_DATA } from '../data/gamesData';

export const Footer: React.FC = () => {
  const count = GAMES_DATA.length;
  return (
    <footer className="w-full bg-[#06070D] border-t border-white/5 py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 text-center sm:text-left">
        <div className="flex items-center gap-2 text-slate-400">
          <Gamepad2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <span className="font-semibold text-white">Apex Arcade</span>
          <span>·</span>
          <span>{count} Retro &amp; Tabletop Anthology</span>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-slate-400 text-[11px] sm:text-xs">
          <span>{count} Masterpiece Games</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>HTML5 Canvas &amp; Web Audio</span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>Zero Server Latency</span>
        </div>
      </div>
    </footer>
  );
};
