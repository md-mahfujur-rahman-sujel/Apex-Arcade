# Apex Arcade Game Frame Style Guide

This guide covers the shared in-game frame and the visual language of the three prototype pilots. The launcher and site chrome follow [UI_STYLE_GUIDE.md](./UI_STYLE_GUIDE.md). Game canvases, board pages, and the theater stay dark in both site themes.

## Shared frame

- Keep each game's identity. Use the shared shell for menu, settings, pause, results, and accessible controls; do not flatten games into one visual template.
- Arcade canvas games use `UI.mountGame(G, config)` after the game's family kits load. Keep the legacy `UI.mountArcade` call shape intact.
- Board pages use `Board.shell` for their semantic DOM, rules, controls, and board-specific modes. Add shared behavior through `ui-kit.js` or `board-kit.js`; do not replace working board input with a canvas overlay.
- Use the host's theater game id for saved progression. Game frames may store owned and equipped cosmetic ids through `Save`; `Meta` owns the cross-game registry and Sparks balance.
- Use native buttons, selects, and inputs. Every action has a visible focus state and an accessible name. Do not bind game shortcuts while focus is in a form control or a modal dialog.

## State and behavior

The frame follows **Boot → Menu → Mode → Play → Pause → Results → Menu**. Existing game controls can provide the mode and settings screens when they expose the same decisions clearly.

- Pause must preserve the board, score, timer, and pending work. If asynchronous work is canceled, resume restarts only that work and does not apply an extra move.
- A results action must be reachable with keyboard and touch. It reports the existing result and provides replay or return actions without changing the game's rules.
- Settings and difficulty changes must call the game's real setting API and persist through `Save`. Do not present controls that have no effect.
- A cosmetic purchase is validated and charged once by `Meta`. Equip is allowed only for owned or achievement-unlocked items, persists by slot through `Save`, and is applied after a game reload.
- Keep touch actions out of the play lane. Test touch launch separately from touch gameplay because the host theater has its own launch control.

## Visual direction for pilot games

### 01 — Glowmoth Gauntlet

Use midnight indigo `#0b1030`, deep violet `#241552`, plum `#4b1d6b`, orchid `#a78bfa`, ice cyan `#67e8f9`, moth-gold `#fde68a`, and rose `#f9a8d4`. Light comes from the upper left. Preserve the layered moth, three parallax ridges, fireflies, ground shadow, selective outlines, and restrained glow. Easy-to-read portrait gameplay remains the priority. Lite and reduced-motion settings lower or remove nonessential effects.

### 30 — Tic-Tac-Toe

Use dark slate, cyan X marks, warm amber O marks, thin cell borders, contact shadows, and an upper-left highlight. Keep marks crisp. Use brief placement motion, one gentle win-line pulse, and a small celebration. The board, side panel, mode controls, and focus ring must remain readable in Classic, 4×4, and Ultimate layouts.

### 42 — Merge 2048

Use a dark slate foundry with warm ivory low tiles and a clear coral, violet, cyan, and amber progression for larger values. Keep numbers high-contrast, tile edges crisp, upper-left light soft, and merge glow restrained. Preserve legibility on 3×3 through 6×6 boards and keep movement short. Reduced motion removes tile travel and merge animation while preserving move feedback.

## Interaction sizing and motion

- Keep primary actions large enough to activate by touch, with spacing that avoids accidental adjacent actions.
- Prefer short state transitions and brief game feedback. Never make animation necessary to understand the current turn, score, mode, or result.
- Honor `prefers-reduced-motion` and the in-game reduced-motion setting. Remove looping pulses, decorative particles, and camera shake when reduced motion is active.
- Keep text readable over game stages; use an opaque or sufficiently dark control surface behind labels rather than relying on glow or shadow alone.

## Verification before a pilot is accepted

Run `npm run lint`, `npm run build`, `npm run test:mount-game`, `npm run test:game-frame-pilots`, and `npm run test:smoke`. Run `npm run check:theme` for site UI changes. Record each pass and failure separately in the PRD and smoke report. A red full smoke does not become green because a pilot-only test passed.
