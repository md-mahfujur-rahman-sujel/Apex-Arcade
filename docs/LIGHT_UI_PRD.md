# Apex Arcade: Light UI Enhancement PRD (for ChatGPT Codex)

Version 1.0 | 22 Oct 2026 | Scope: website shell in `src/` only (not the games)

This PRD comes from a read of the source code and one screenshot of the home page. Nothing was run in a browser. Items marked **CHECK** must be confirmed in the running app before you rely on them.

---

## 0. Rules of engagement (read before every session)

1. Do ONE numbered task (T1, T2, ...) per session. Do not start the next task.
2. Open and read a file before editing it. Do not edit from memory.
3. The dark theme must look the same after every task. Treat any visible dark-theme change as a bug unless the task says otherwise.
4. Every task ends with `npm run lint` and `npm run build` passing. Report the output.
5. Do not touch: `public/assets/aistudio/**` (the games), `src/components/engines/**`, `.aistudio/`, `.env*`, `tsconfig.json`, the `server` block of `vite.config.ts`.
6. No new runtime dependency. A dev-only dependency (for example Playwright for screenshots) needs the owner's approval, so list it in your plan first.
7. Keep every existing `data-*` attribute, `id`, `aria-*` and prop. Other code and tests rely on them.
8. If blocked, ask at most 3 short questions. Otherwise state one assumption and continue.
9. Final reply format: (1) task id and goal, (2) files changed, (3) what changed, (4) **Verified** (and how), **Not verified**, **Known issues**, (5) suggested next task.

---

## 1. Project snapshot (verified from source)

- Stack: Vite, React 19, TypeScript, Tailwind CSS 4 (`@import "tailwindcss"` plus `@theme` in `src/index.css`), `motion`, `lucide-react`. Scripts: `npm run dev` (port 3000), `npm run lint` (`tsc --noEmit`), `npm run build`.
- Page order in `src/App.tsx`: `Navbar` → `LauncherHome` (hero carousel, Continue playing, Recommended, Daily challenge) → `GameCatalog` (search, tabs, five filters, card grid) → `TelemetryDashboard` → `AboutAnthology` → `ProfileHub` → `Footer`. Modals: `GameDossierModal`, `PlayableTheaterModal`.
- `HeroAnthology.tsx` still exists but `App.tsx` does not import it. It is dead code with dark-only classes.
- Theme state: `isLightTheme` in `App.tsx`, saved in `localStorage` key `apex-arcade-theme` (`'light'` or `'dark'`). It is applied in a `useEffect` by setting `document.documentElement.dataset.theme`. The root `<div>` also gets a `data-theme` attribute (harmless duplicate).
- Design tokens exist in `src/index.css` (`--color-apex-ink/panel/elevated/accent/text/muted/line`, with light values under `html[data-theme='light']`), but almost no component uses them. Components hard-code hex colors such as `bg-[#0F1322]`, `bg-[#0F1320]`, `bg-[#101525]`, `bg-[#0D111D]`, `bg-[#070912]`, `bg-[#080b14]`, `bg-[#06070D]`, `bg-[#0B0E1B]`.
- Light mode is built as about 60 override rules in `index.css` that target Tailwind class names with `!important`, for example `[class*='bg-[#']`, `[class*='bg-white/']`, `[class*='bg-black/']`, `[class~='text-white']`.
- The card previews and the hero preview are `<canvas>` scenes drawn for a dark backdrop. Light mode keeps a dark "screen" behind them (`[data-card-scene]`, and the new `[data-hero-stage]`). Keep that idea: light page, dark game screens.
- Fonts: Plus Jakarta Sans (UI) and JetBrains Mono (labels, numbers). Keep both.

---

## 2. Audit: what is wrong with the light UI today

Severity: **H** = visibly broken or unreadable, **M** = inconsistent or low contrast, **L** = polish.

| ID | Sev | Finding | Where |
|---|---|---|---|
| L1 | H | **Override architecture is fragile.** Light mode only works where a class name happens to match an override. Every new `bg-[#...]` becomes cream, including surfaces that must stay dark (the Telemetry chart well `bg-[#070912]`, the theater stage `bg-[#05060D]`, the hero stage fixed earlier). | `index.css` |
| L2 | H | **Modal backdrops disappear.** `[class*='bg-black/']` sets every `bg-black/NN` to a 4% tint. That removes the dimming behind the Dossier (`bg-black/80`), the Theater (`bg-black/95`) and the mobile nav scrim (`bg-black/60`). Page content shows straight through. | `index.css`, `GameDossierModal`, `PlayableTheaterModal`, `Navbar` |
| L3 | H | **Hover states are dead on white-alpha buttons.** `[class*='bg-white/']` is a substring match, so `bg-white/5 hover:bg-white/10` is forced to a constant 5% tint with `!important`, including while hovered. The same substring problem affects `border-white/`. | `index.css`; Navbar, Catalog, Telemetry, Profile |
| L4 | H | **Hover text colors are not remapped.** `hover:text-cyan-400`, `hover:text-white`, `group-hover:text-cyan-200/300` are not matched by the `text-*` overrides. Nav links turn neon cyan on cream (about 1.7:1). "Surprise Me" turns white on a cream gradient and becomes invisible. | `Navbar`, `GameCatalog`, `TelemetryDashboard` |
| L5 | M | **Unmapped dark palette classes.** Not in the override list: `bg-cyan-950` (selected "Playable Engines" chip), `bg-amber-950/60` (selected "Starred" chip), `bg-rose-950/30` (reset confirm), `text-slate-600`, `border-rose-400/30`, others. **CHECK** with `grep -rnE "(-950|-900)" src`. These stay near-black on the cream page. | `GameCatalog`, `TelemetryDashboard` |
| L6 | M | **Dark fade strips on mobile.** The category tab strip uses `from-[#08090E]` gradient edges, which are not remapped, so they show as dark smudges on cream. | `GameCatalog` |
| L7 | M | **Dark focus-ring offset.** `focus-visible:ring-offset-[#08090E]` leaves a dark gap around the focus ring on light surfaces. | `GameCard3D` |
| L8 | M | **Telemetry canvas is not theme-aware.** The guide lines, "Waiting for game frame telemetry" text (`rgba(148,163,184,.8)`) and the `#38BDF8` waveform are drawn for a dark well. The well itself is turned cream by L1, so the chart is low-contrast. | `TelemetryDashboard` |
| L9 | M | **Flash of the wrong theme.** The theme is applied in `useEffect`, after first paint. `index.html` hard-codes dark body classes and `<meta name="theme-color" content="#08090e">`. A light-theme user sees a dark flash on every load, and the theme never follows `prefers-color-scheme`. | `index.html`, `App.tsx` |
| L10 | M | **Theater is half-converted.** The chrome (`bg-[#0A0D18]`, `#070913`, `#05060D`) turns cream, `text-white` turns dark ink, and the touch pad (`bg-[#070B18]/80`) and pre-launch panel mix dark inline gradients with ink text. Result: unpredictable contrast around a game that is itself dark. | `PlayableTheaterModal` |
| L11 | M | **Card hover accent is lost.** `GameCard3D` sets a per-game accent border on hover via inline style, but `[data-catalog-card]:hover { border-color: ... !important }` overrides it, so all hovers look identical. Inline dark `boxShadow` is also overridden only by `!important`. | `GameCard3D`, `index.css` |
| L12 | M | **Flat hierarchy.** Light mode is cream on cream. Sections have no visible separation, little elevation, no clear primary versus secondary surface, and buttons differ by page area (gradient teal on cards, flat teal elsewhere, amber gradient for "Surprise Me"). | all sections |
| L13 | M | **Many accent colors at full neon strength** (`text-amber-300`, `text-rose-300`, `text-emerald-400`, `text-purple-400`) are individually remapped to darker values with no shared rule, so the same meaning (success, warning, danger) uses different colors in different components. | Telemetry, Profile |
| L14 | L | **Dead code.** `HeroAnthology.tsx` (unused) still contains the old dark hero. | `src/components` |
| L15 | L | **Duplicate `data-theme`** on `<html>` and the root `<div>`. | `App.tsx` |
| L16 | L | **No `color-scheme` / form-control theming** beyond `color-scheme: light` in CSS. Native `<select>` option lists and the scrollbar may not match. **CHECK** in Chrome and Firefox. | `index.css` |
| L17 | L | **Text selection** uses `selection:bg-cyan-500 selection:text-black` in both themes. | `App.tsx`, `index.html` |

---

## 3. Goals, non-goals, success metrics

**Goals**
1. A light theme that looks designed, not converted: clear hierarchy, depth, consistent buttons, chips, cards and charts.
2. Replace the class-name override hacks with semantic tokens, so any new component is correct in both themes by default.
3. Fix L1 to L17.
4. Respect the user's system preference on first visit and never flash the wrong theme.

**Non-goals**
- No change to games, engines, game logic, scoring, routing or data.
- No new fonts, no redesign of the dark theme, no new pages.
- No light version of the theater (see Decision D2).

**Success metrics** (all must be true at the end)
- Every text/background pair meets WCAG AA: 4.5:1 for body text, 3:1 for large text and UI borders or icons. Verified with the script from T0.
- Zero uses of the legacy override selectors in `index.css`. The file contains tokens, the theme blocks and a few documented component rules only.
- `grep -rnE "bg-\[#|text-\[#|border-\[#" src/components` returns nothing except the explicit allow-list in section 7.
- Dark theme screenshots match the T0 baseline (small anti-aliasing differences are fine).
- `npm run lint` and `npm run build` pass. Bundle size does not grow by more than 5 KB gzip.

---

## 4. Design direction: "paper arcade"

A warm paper page with dark "game screens" set into it like handheld consoles. Color comes from the games' accent colors and from one brand teal, never from tinted page backgrounds.

### 4.1 Semantic tokens

Define these as CSS variables, dark values on `:root`, light values under `html[data-theme='light']`. Expose them to Tailwind v4 with `@theme inline` so utilities like `bg-surface`, `text-fg-muted`, `border-line` exist. Contrast figures below are approximate; the T0 script is the authority and you may adjust a value to pass.

| Token | Dark (keep current look) | Light |
|---|---|---|
| `--bg` | `#08090E` | `#F2F1ED` |
| `--surface` (panels, sections) | `#0D111D` | `#F8F7F3` |
| `--surface-2` (raised) | `#131826` | `#EEEDE8` |
| `--card` | `#0F1322` | `#FFFDF9` |
| `--sunken` (inputs, wells) | `#080B14` | `#E7E5DE` |
| `--stage` (game screens, charts) | `#070912` | `#0B1020` (stays dark) |
| `--line` | `rgb(255 255 255 / 10%)` | `#D8DDD8` |
| `--line-strong` | `rgb(255 255 255 / 18%)` | `#C4CBC6` |
| `--fg` | `#F1F5F9` | `#202A3B` (about 11:1 on `--bg`) |
| `--fg-muted` | `#94A3B8` | `#58677F` (about 5:1 on `--bg`) |
| `--fg-subtle` (decorative only) | `#64748B` | `#7A8699` (about 3.3:1, never for essential text) |
| `--accent` | `#22D3EE` | `#0E7490` (about 4.7:1 on `--bg`) |
| `--accent-hover` | `#67E8F9` | `#155E75` |
| `--accent-fg` (text on accent) | `#06222B` | `#F8FAFC` |
| `--accent-soft` | `rgb(34 211 238 / 12%)` | `rgb(14 116 144 / 10%)` |
| `--success` / `--warning` / `--danger` | `#34D399` / `#FBBF24` / `#FB7185` | `#15803D` / `#B45309` / `#BE123C` |
| `--shadow-card` | current dark shadow | `0 1px 2px rgb(31 41 55 / 6%), 0 8px 20px rgb(31 41 55 / 8%)` |
| `--shadow-pop` (modals, menus) | current | `0 20px 50px -12px rgb(31 41 55 / 28%)` |

Rules: radius 12 px for controls, 16 px for cards, 24 px for hero and modals. Spacing on a 4 px grid. Section vertical rhythm 56 px (mobile 40 px). Body 14-16 px, labels in JetBrains Mono 10-11 px uppercase with 0.12-0.18em tracking.

### 4.2 Core components (define once, reuse everywhere)

- **Button**: `primary` (accent fill, `--accent-fg` text), `secondary` (surface-2 fill, line border), `ghost`. All have visible hover, active (1 px press), focus-visible (2 px accent ring with 2 px offset in `--bg`) and disabled states. Minimum height 44 px on touch.
- **Chip / tab**: unselected = surface-2 + `--fg-muted`; selected = `--accent-soft` fill, `--accent` text and border. Replaces `bg-cyan-950` and `bg-amber-950/60`.
- **Card**: `--card` fill, `--line` border, `--shadow-card`; hover raises 2 px with `--line-strong` (accent border only when the game accent has 3:1 contrast, otherwise use `color-mix` toward `--fg`).
- **Screen bezel**: a dark `--stage` inset with 1 px inner highlight and rounded corners, used for card previews, the hero stage, the Dossier header and the Telemetry chart.
- **Input / select**: `--sunken` fill, `--line` border, `--accent` focus ring, `color-scheme` set so native option lists match.
- **Status colors**: one mapping (success, warning, danger, info) used by badges, ranks and toasts.

---

## 5. Component specs and acceptance criteria

For each component: replace hex and palette classes with tokens, remove its rules from the legacy block, and check both themes at 390, 768 and 1280 px.

1. **Navbar / header**: translucent `--bg` with blur and a bottom `--line`; a soft shadow once scrolled. Links use `--fg-muted`, hover `--fg` with an accent underline (no neon). Icon buttons have hover and focus states. The mobile scrim is a real dim (`rgb(15 23 42 / 45%)`) in light mode. The 44 px touch targets stay.
2. **LauncherHome**: hero is a card with the dark `--stage` on the right and warm paper on the left. Badge, dots and arrows use tokens. Continue playing, Recommended and Daily challenge cards share the Card component. The empty Recommended state has an illustration-free dashed box with clear text.
3. **GameCatalog**: tabs and quick filters use Chip. The filter row sits on a `--surface` panel. Selects use Input. Replace the gradient fade strips with `--bg`-colored fades. "Surprise Me" becomes a secondary button with an accent icon (no amber gradient). Skeleton cards use `--surface-2` shimmer. Empty state uses Button.
4. **GameCard3D**: Card component, accent only on the play button, difficulty badge and progress ring. Keep the tilt and the dark preview screen. Fix L7 and L11.
5. **TelemetryDashboard**: metric cards on `--card`. The chart well is a Screen bezel. Read canvas colors from CSS variables (`getComputedStyle(document.documentElement)`) and redraw when the theme changes. Tier selector buttons use Chip. Reset confirm uses danger tokens. Table rows get a real hover.
6. **AboutAnthology / Footer**: cards on `--card`, icon tiles use `--accent-soft`. Footer is `--surface` with a top `--line`, not a dark band.
7. **ProfileHub**: one Card, stat tiles on `--surface-2`, avatar keeps its generated hue but gets a ring in `--line`. Import/Export are secondary and primary buttons.
8. **GameDossierModal**: backdrop dims correctly in both themes (L2). Panel on `--card`, header is a Screen bezel, footer on `--surface`. Close button has a visible background in light mode.
9. **PlayableTheaterModal**: always dark (D2). Wrap it in a `data-theme="dark"` scope so tokens resolve to the dark values regardless of the page theme, and add `data-theater` to exclude it from any remaining global rule. Its look must not change in either theme.

---

## 6. Task list (do in order, one per session)

| Task | Goal | Main files | Done when |
|---|---|---|---|
| **T0** | Baseline and tooling | `docs/ui-baseline/`, `scripts/contrast-check.mjs`, `docs/UI_QA.md` | Screenshots of every section in both themes at 390/768/1280 px saved (use Playwright only if the owner approved it; otherwise write the manual capture steps in `docs/UI_QA.md`). The no-dependency Node script computes WCAG ratios for every token pair in section 4.1 and exits non-zero on failure. |
| **T1** | Theme bootstrap (L9, L15, L17) | `index.html`, `src/App.tsx`, `Navbar.tsx` | A tiny inline script in `<head>` sets `data-theme`, `color-scheme` and `theme-color` before first paint. Preference is `system` (default), `light` or `dark`; the toggle cycles or offers all three, keeping the `apex-arcade-theme` key readable for old values. No flash on reload in either theme. `meta theme-color` follows the theme. |
| **T2** | Token layer | `src/index.css` | Section 4.1 tokens defined for both themes and exposed with `@theme inline`. Legacy override block kept for now. Dark theme unchanged. |
| **T3** | Core components | new `src/components/ui/` (Button, Chip, Card, ScreenBezel, Input) | Components built on tokens only, with all states. Used in at least one place each. |
| **T4** | Navbar + LauncherHome | `Navbar.tsx`, `LauncherHome.tsx` | Section 5 items 1 and 2. L2 (nav scrim) and L4 (nav links) fixed. Remove migrated rules from the legacy block. |
| **T5** | GameCatalog + GameCard3D | `GameCatalog.tsx`, `GameCard3D.tsx`, `CardScenePreview.tsx` | Section 5 items 3 and 4. L5, L6, L7, L11 fixed. |
| **T6** | TelemetryDashboard | `TelemetryDashboard.tsx` | Section 5 item 5. L8 fixed, chart redraws on theme change. |
| **T7** | Dossier, Profile, About, Footer | the four components | Section 5 items 6 to 8. L2 fixed for the Dossier. |
| **T8** | Theater isolation | `PlayableTheaterModal.tsx`, `index.css` | Section 5 item 9. L10 fixed. |
| **T9** | Remove legacy hacks | `src/index.css`, `HeroAnthology.tsx` | Legacy selectors deleted (L1, L3). `HeroAnthology.tsx` deleted after confirming no import (`grep -rn HeroAnthology src`). `npm run check:theme` script (grep guard from section 3) added to `package.json`. |
| **T10** | Visual polish | all components | Elevation, section rhythm, button consistency (L12, L13), hover and active states, focus rings, skeletons, empty states. Motion respects `prefers-reduced-motion`. |
| **T11** | Accessibility pass | all components | Contrast script passes. Every interactive element has hover, focus-visible, active, disabled. Touch targets at least 44 px. Forced-colors and reduced-motion checked. Native `<select>` and scrollbars match each theme (L16). |
| **T12** | Responsive and perf pass | all components | 360, 390, 768, 1024, 1440 px checked in both themes; no horizontal scroll; no layout shift when the theme loads; bundle within the 5 KB budget. |
| **T13** | Docs | `docs/UI_STYLE_GUIDE.md`, `docs/UI_QA.md` | Token table, component usage, how to add a new component, final screenshot set. |

If a task grows beyond about 15 files, split it and say so in your report.

---

## 7. Allow-list for hard-coded colors after migration

These may keep literal colors because they are intentionally theme-independent:
- Canvas drawing code in `CardScenePreview`, `LauncherHome` (hero canvas), `InteractiveLivePreview`, and `src/components/engines/**`.
- The `--stage` color and the game-accent colors (`game.accentColor`) passed through inline `style`.
- `PlayableTheaterModal` (dark scope).
- Social and brand marks, if any are added later.

---

## 8. QA matrix (record results in `docs/UI_QA.md`)

- Themes: light, dark, system-light, system-dark.
- Viewports: 360, 390, 768, 1024, 1440.
- States: default, hover, focus-visible (keyboard), active, disabled, loading (skeleton), empty (no recommendations, no search results), error.
- Flows: toggle theme while a modal is open; open Dossier and Theater in light; reload on each theme (no flash); search highlight (`<mark>`) readable in both; reduced motion on.
- Browsers: Chrome and Firefox at minimum; Safari if available.

---

## 9. Decisions for the owner (defaults in brackets)

- **D1** First-visit theme: follow the system setting [default], or always dark.
- **D2** Theater stays dark in both themes [default], or gets a light chrome.
- **D3** Toggle: three-state System/Light/Dark [default], or two-state.
- **D4** Brand accent in light mode: teal `#0E7490` [default], or another color.
- **D5** Allow Playwright as a dev dependency for screenshot QA [default: ask first].

---

## 10. Master prompt (paste at the start of each Codex session)

```
You are working on the Apex Arcade website (Vite, React 19, TypeScript, Tailwind 4).
Read docs/LIGHT_UI_PRD.md in full, then do ONLY task <TASK ID>.
Follow section 0 exactly: read each file before editing, keep the dark theme unchanged,
do not touch public/assets/aistudio, src/components/engines, .aistudio or tsconfig.json,
add no runtime dependency, keep every data-* attribute, id and aria-* attribute.
Finish with `npm run lint` and `npm run build`, and end your reply with
Verified (how) / Not verified / Known issues, then suggest the next task.
```
