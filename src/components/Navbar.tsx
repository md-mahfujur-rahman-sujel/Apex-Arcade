import React, { useState } from 'react';
import { Volume2, VolumeX, Sparkles, Menu, X, Gamepad2, Activity, BookOpen, Layers } from 'lucide-react';
import { GAMES_DATA } from '../data/gamesData';

interface NavbarProps {
  onQuickPlay: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onQuickPlay,
  onTabChange,
  isMuted,
  onToggleMute,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string, filter?: string) => {
    setMobileMenuOpen(false);
    if (filter) onTabChange(filter);
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#08090E]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('catalog', 'all');
          }}
          className="text-lg font-extrabold tracking-tight text-white hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <Gamepad2 className="w-5 h-5 text-cyan-400" />
          <span>Apex Arcade</span>
        </a>

        {/* Zone 2: Desktop clean single-line navigation links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <button
            onClick={() => handleNavClick('catalog', 'all')}
            className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            All {GAMES_DATA.length} Games
          </button>
          <button
            onClick={() => handleNavClick('catalog', 'playable')}
            className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Playable Engines
          </button>
          <button
            onClick={() => handleNavClick('telemetry')}
            className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Telemetry &amp; Stats
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className="hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Anthology Lore
          </button>
        </nav>

        {/* Zone 3: Actions + Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="p-2 sm:p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={onQuickPlay}
            className="px-3 sm:px-4 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 min-h-[40px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Launch Random</span>
            <span className="xs:hidden">Random</span>
          </button>

          {/* Mobile Drawer Trigger (min 44px touch target) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Navigation Menu'}
            className="md:hidden p-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-cyan-400" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0B0E1B] px-4 py-4 space-y-2 shadow-2xl animate-in slide-in-from-top-2 duration-200">
          <button
            onClick={() => handleNavClick('catalog', 'all')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 hover:text-cyan-400 transition-colors text-left"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>All {GAMES_DATA.length} Masterpiece Games</span>
          </button>
          <button
            onClick={() => handleNavClick('catalog', 'playable')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 hover:text-cyan-400 transition-colors text-left"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Playable Engines &amp; Modes</span>
          </button>
          <button
            onClick={() => handleNavClick('telemetry')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 hover:text-cyan-400 transition-colors text-left"
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Telemetry &amp; Hardware Auto-Tiering</span>
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-200 hover:bg-white/5 hover:text-cyan-400 transition-colors text-left"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Anthology Lore &amp; Timeline</span>
          </button>
        </div>
      )}
    </header>
  );
};
