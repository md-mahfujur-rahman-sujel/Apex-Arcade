import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, Sparkles, Menu, X, Gamepad2, Activity, BookOpen, Layers, UserRound, Sun, Moon } from 'lucide-react';
import { GAMES_DATA } from '../data/gamesData';

interface NavbarProps {
  onQuickPlay: () => void;
  onOpenProfile: () => void;
  onSectionNavigate: (sectionId: string, filter?: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
  isLightTheme: boolean;
  themePreference: 'system' | 'light' | 'dark';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onQuickPlay,
  onOpenProfile,
  onSectionNavigate,
  onTabChange,
  isMuted,
  onToggleMute,
  isLightTheme,
  themePreference,
  onToggleTheme,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const nextThemePreference = themePreference === 'system' ? 'light' : themePreference === 'light' ? 'dark' : 'system';
  const themeLabel = (preference: 'system' | 'light' | 'dark') =>
    preference[0].toUpperCase() + preference.slice(1);

  useEffect(() => {
    const updateScrollState = () => setIsScrolled(window.scrollY > 8);
    updateScrollState();
    window.addEventListener('scroll', updateScrollState, { passive: true });
    return () => window.removeEventListener('scroll', updateScrollState);
  }, []);

  const handleNavClick = (sectionId: string, filter?: string) => {
    setMobileMenuOpen(false);
    if (filter) onTabChange(filter);
    onSectionNavigate(sectionId, filter);
  };

  return (
    <header className={`sticky top-0 z-40 w-full border-b border-line bg-bg/90 backdrop-blur-md transition-shadow ${isScrolled ? 'shadow-md shadow-black/10' : ''}`}>
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-6 lg:px-8 py-3.5">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            handleNavClick('catalog', 'all');
          }}
          aria-label="Apex Arcade home"
          className="flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap text-lg font-extrabold tracking-tight text-fg transition-colors hover:text-accent active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
        >
          <Gamepad2 className="h-5 w-5 text-accent" />
          <span className="hidden sm:inline">Apex Arcade</span>
        </a>

        {/* Zone 2: Desktop clean single-line navigation links */}
        <nav className="hidden items-center gap-8 text-sm font-medium text-fg-muted xl:flex">
          <button
            onClick={() => handleNavClick('catalog', 'all')}
            className="relative min-h-11 shrink-0 cursor-pointer whitespace-nowrap transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:text-fg hover:after:scale-x-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:after:scale-x-100"
          >
            All {GAMES_DATA.length} Games
          </button>
          <button
            onClick={() => handleNavClick('catalog', 'playable')}
            className="relative min-h-11 shrink-0 cursor-pointer whitespace-nowrap transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:text-fg hover:after:scale-x-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:after:scale-x-100"
          >
            Playable Engines
          </button>
          <button
            onClick={() => handleNavClick('telemetry')}
            className="relative min-h-11 shrink-0 cursor-pointer whitespace-nowrap transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:text-fg hover:after:scale-x-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:after:scale-x-100"
          >
            Telemetry &amp; Stats
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className="relative min-h-11 shrink-0 cursor-pointer whitespace-nowrap transition-colors after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:text-fg hover:after:scale-x-100 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:after:scale-x-100"
          >
            Anthology Lore
          </button>
        </nav>

        {/* Zone 3: Actions + Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <button
            onClick={onToggleMute}
            aria-label={isMuted ? 'Unmute Sound' : 'Mute Sound'}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2 p-2 text-fg-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:p-2.5"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <button
            onClick={onToggleTheme}
            aria-label={`Current theme: ${themeLabel(themePreference)}. Switch to ${themeLabel(nextThemePreference)} theme`}
            aria-pressed={isLightTheme}
            title={`Theme: ${themeLabel(themePreference)} (currently ${isLightTheme ? 'light' : 'dark'}). Switch to ${themeLabel(nextThemePreference)}`}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2 p-2 text-fg-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:p-2.5"
          >
            {isLightTheme ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-300" />}
          </button>

          <button
            onClick={onQuickPlay}
            data-ui-open
            className="flex min-h-11 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl bg-accent px-3 py-2 text-xs font-semibold text-accent-fg shadow-md transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:px-4"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Launch Random</span>
            <span className="xs:hidden">Random</span>
          </button>

          <button
            onClick={onOpenProfile}
            aria-label="Open player profile"
            title="Player profile"
            className="hidden min-h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 px-2.5 text-fg-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg sm:inline-flex sm:px-3"
          >
            <UserRound className="h-4 w-4" />
            <span className="hidden xl:inline text-xs font-medium">Profile</span>
          </button>

          {/* Mobile Drawer Trigger (min 44px touch target) */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Navigation Menu'}
            className="flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-xl border border-line bg-surface-2 p-2.5 text-fg-muted transition-colors hover:border-line-strong hover:bg-surface hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg xl:hidden"
          >
            {mobileMenuOpen ? <X className="h-5 w-5 text-accent" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Responsive Navigation Drawer */}
      {mobileMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close navigation menu"
            onClick={() => setMobileMenuOpen(false)}
            className={`fixed inset-0 z-40 backdrop-blur-[2px] xl:hidden ${isLightTheme ? 'bg-slate-900/45' : 'bg-black/60'}`}
          />
          <nav
            aria-label="Mobile navigation"
            className="fixed inset-y-0 right-0 z-50 flex w-[min(22rem,86vw)] flex-col border-l border-line bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))] shadow-pop xl:hidden"
          >
            <div className="mb-5 flex items-center justify-between px-3">
              <span className="text-sm font-bold text-fg">Navigation</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation menu"
                className="min-h-11 min-w-11 rounded-xl border border-line bg-surface-2 text-fg-muted transition-colors hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
              >
                <X className="mx-auto h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2">
              <button
            onClick={() => handleNavClick('catalog', 'all')}
            className="relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-fg-muted transition-colors after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:bg-surface-2 hover:text-fg hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:after:scale-x-100"
          >
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>All {GAMES_DATA.length} Masterpiece Games</span>
          </button>
          <button
            onClick={() => handleNavClick('catalog', 'playable')}
            className="relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-fg-muted transition-colors after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:bg-surface-2 hover:text-fg hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:after:scale-x-100"
          >
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>Playable Engines &amp; Modes</span>
          </button>
          <button
            onClick={() => handleNavClick('telemetry')}
            className="relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-fg-muted transition-colors after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:bg-surface-2 hover:text-fg hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:after:scale-x-100"
          >
            <Activity className="w-4 h-4 text-amber-400" />
            <span>Telemetry &amp; Hardware Auto-Tiering</span>
          </button>
          <button
            onClick={() => handleNavClick('about')}
            className="relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-fg-muted transition-colors after:absolute after:bottom-1 after:left-3 after:right-3 after:h-px after:origin-left after:scale-x-0 after:bg-accent after:transition-transform hover:bg-surface-2 hover:text-fg hover:after:scale-x-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg focus-visible:after:scale-x-100"
          >
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span>Anthology Lore &amp; Timeline</span>
          </button>
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenProfile();
            }}
            className="relative flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-fg-muted transition-colors hover:bg-surface-2 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg"
          >
            <UserRound className="h-4 w-4" />
            <span>Player profile</span>
          </button>
            </div>
          </nav>
        </>
      )}
    </header>
  );
};
