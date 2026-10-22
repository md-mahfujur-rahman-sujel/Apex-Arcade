# UI baseline and QA record

## T0 baseline capture

At T0, Playwright had not yet been approved for this project, so the original baseline procedure uses manual Chrome DevTools captures. Keep the screenshots local under `docs/ui-baseline/`; that folder is reserved for the baseline and is not checked into source control unless the owner wants the image files committed.

1. Run `npm run dev` and open `http://localhost:3000` in Chrome.
2. Use DevTools' device toolbar to set each viewport to **390 × 844**, **768 × 1024**, and **1280 × 900** CSS pixels. Keep browser zoom at 100%.
3. For each viewport, capture the page in **dark** and **light** themes. Use the theme control in the page; confirm the selected theme before each capture.
4. Capture the full page at each size so the baseline includes Navbar, Launcher Home, Game Catalog, Telemetry Dashboard, About, Profile, and Footer. Also capture the open Dossier and Theater modals at 1280 × 900 in each theme.
5. Save PNGs with names such as `dark-390-full.png`, `light-390-full.png`, `dark-1280-dossier.png`, and `light-1280-theater.png` in `docs/ui-baseline/`. Record any state that cannot be captured in the table below.
6. Repeat after UI tasks using the same browser, viewport, scroll position, theme, and modal state. Compare dark screenshots to this baseline for unintended changes.

| Theme | Viewport | Full page | Dossier | Theater | Notes |
|---|---:|---|---|---|---|
| Dark | 390 × 844 | Pending | — | — | |
| Light | 390 × 844 | Pending | — | — | |
| Dark | 768 × 1024 | Pending | — | — | |
| Light | 768 × 1024 | Pending | — | — | |
| Dark | 1280 × 900 | Pending | Pending | Pending | |
| Light | 1280 × 900 | Pending | Pending | Pending | |

## Automated checks

- `node scripts/contrast-check.mjs` calculates WCAG relative luminance contrast for the declared semantic text and accent pairs from `docs/LIGHT_UI_PRD.md` §4.1. Normal text uses 4.5:1; large text and accent/UI marks use 3:1. `--fg-subtle` is decorative-only and is checked at 3:1 on the dark stage.
- Pair selection follows the intended semantic uses: body and muted text on page surfaces, readable labels on the dark stage, accent labels on page surfaces, and text on primary buttons. It does not claim that every possible token combination is a valid design pairing.

## Follow-up QA matrix

Record results as tasks are completed. T0 provides the baseline procedure; run the relevant checks for each task rather than treating pending items as verified.

| Area | Themes / viewports / states | Status | Notes |
|---|---|---|---|
| Baseline screenshots | Dark and light; 360, 390, 768, 1280, 1440 px | Passed in Chrome 2026-10-22 | Ten complete-page Playwright captures are in `docs/baseline/`; all seven sections were present and canvas rendering was awaited. |
| Build checks | TypeScript and production build | Passed 2026-10-22 | `npm run lint` and `npm run build` pass; Vite prints the existing `__dirname` config warning. |
| S0-6 game smoke | 50 games; 1280 × 720 and 390 × 844 touch | Executed twice; matching check outcomes, failures remain | `npm run test:smoke` produced 50 rows in `docs/SMOKE_REPORT.md`; D-11 cross-window score rejection passed. Both runs showed mobile Play interception across all games, plus existing reporting, board input and pause/resume gaps. Pass/fail outcomes matched; report checksums differed. |
| S0-7 twin cleanup | Canonical game pages, shared kits, PRD distribution | Build passed; smoke remains non-green | Removed 57 unreferenced hashed twins. Moved the byte-identical public PRD copy to `docs/archive/`. A fresh `npm run test:smoke` still lists the existing mobile launch and game-hook failures in `docs/SMOKE_REPORT.md`. |
| Contrast | Semantic token pairs | Passed automated check | `node scripts/contrast-check.mjs` passed for declared pairs in both themes; it does not cover every component pairing. |
| Theme bootstrap | Light, dark, system-light, system-dark | Passed in Chrome 2026-10-22 | Head script sets theme and `color-scheme` before app startup. System-light and system-dark both resolved correctly and persisted after reload. |
| Responsive | 360, 390, 768, 1280, 1440 px | Passed in Chrome 2026-10-22 | S0-5 captures cover both themes at every width with no document or content overflow. At 360 px, carousel dots stay on one row; at 768 px, Telemetry metric rows align, the footer labels fit one row, and filters form 3+2 rows. |
| Interaction | Default, hover, focus, active, disabled, loading, empty, error | Code pass; browser review pending | Shared states, loading skeleton and empty catalog state are present. Check representative controls and states manually. |
| Modal flows | Toggle theme with modal open; Dossier and Theater in light theme | Dossier/Theater captures passed; toggle flow pending | Both modals were captured in dark and light page themes. The Theater scope stayed dark. Theme switching while a modal is open remains unchecked. |
| Accessibility | Reduced motion, forced colors, native selects, scrollbars | Reduced-motion captures passed; other checks pending | Captures used Chrome with reduced motion enabled. Forced-colors, keyboard-focus, native select and scrollbar review in Firefox remain pending. |

## T13 final screenshot set

The owner approved Playwright for this set. These historical captures were generated by `scripts/capture-ui-final.mjs` using the installed Chrome browser and reduced-motion mode. Their PNGs remain under `docs/ui-final/` as local review artifacts. The current complete-page capture workflow and output path are documented below.

| Theme | Viewport | Full page | Dossier | Theater |
|---|---:|---|---|---|
| Dark | 360 × 800 | Captured | — | — |
| Light | 360 × 800 | Captured | — | — |
| Dark | 390 × 844 | Captured | — | — |
| Light | 390 × 844 | Captured | — | — |
| Dark | 768 × 1024 | Captured | — | — |
| Light | 768 × 1024 | Captured | — | — |
| Dark | 1024 × 900 | Captured | — | — |
| Light | 1024 × 900 | Captured | — | — |
| Dark | 1280 × 900 | Captured | Captured | Captured |
| Light | 1280 × 900 | Captured | Captured | Captured |
| Dark | 1440 × 1000 | Captured | — | — |
| Light | 1440 × 1000 | Captured | — | — |

Suggested filenames: `dark-360-full.png`, `light-390-full.png`, `dark-768-full.png`, `light-1024-full.png`, `dark-1440-full.png`, `light-1280-dossier.png`, and `dark-1280-theater.png`. Use the matching `dark-` or `light-` prefix and viewport for the remaining captures. For Theater captures in light page mode, verify the modal itself stays dark.

## S0-5 complete-page baseline

The S0-5 capture script scrolls through the document to trigger section and lazy canvas observers, waits for fonts and rendered canvases, asserts all seven main sections are present, and checks horizontal overflow before saving. It writes ten full-page PNGs to `docs/baseline/`: dark and light at 360 × 800, 390 × 844, 768 × 1024, 1280 × 900, and 1440 × 1000. Dossier and Theater captures remain in the T13 set under `docs/ui-final/`.
