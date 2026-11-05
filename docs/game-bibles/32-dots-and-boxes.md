# Game 32 — Dots & Boxes

## Pitch

Draw one line at a time on a grid of dots, close boxes to claim them and keep the turn. Classic lets you pick 3×3, 4×4 or 5×5; Sprint is a fixed 3×3 race to five boxes, Double Trouble scores every box double, Blitz adds a 90-second clock and Grandmaster runs the deepest search. The flow stays readable: every legal line is clickable, every claimed box is labelled, and the score rail always shows who moves next.

## Art direction

A dark slate grid of thin grey lines and bright dots, with cyan lines and boxes for the first player and amber for the second. Claimed boxes fill at 30% opacity with a large player letter, so ownership reads even without colour. The newest line glows faintly. A hint line pulses in the accent colour. The menu scene uses the shared graph motif: a simple three-line grid under an accent glow. Lite and reduced motion keep the grid, line colours and box fills while dropping glow, hover lift and drifting particles.

## Modes and match structure

| Mode | Grid | Clock | Score multiplier | Win bonus |
| --- | --- | --- | --- | --- |
| Classic | 3×3, 4×4 or 5×5 | none | 1× | 800 |
| Blitz | chosen grid | 1:30 per side | 1.1× | 700 |
| Sprint | fixed 3×3, first to 5 boxes | none | 1.2× | 700 |
| Double Trouble | chosen grid, boxes score double | none | 1.3× | 900 |
| Grandmaster | chosen grid vs the deepest search | none | 1.5× | 1,200 |

1. **Classic:** the full grid; the player with more boxes when the board fills wins.
2. **Blitz:** ninety seconds each. The clock pauses with the menu; a flag loses the game with no bonus.
3. **Sprint:** the grid locks to 3×3 and the first player to five boxes wins immediately.
4. **Double Trouble:** every claimed box scores 50 points instead of 25.
5. **Grandmaster:** locked until one Classic win (`classicWins ≥ 1`); the computer always uses the deepest search.

A mode change starts a fresh game. Changing the grid size or seat also resets the board. Pause/resume preserves lines, boxes, turn and clock.

## Core rules

- Players alternate drawing one unused line between two neighbouring dots.
- Completing the fourth side of a box claims it; the player must move again.
- Drawing the third side of a box usually gifts it to the rival, so safe lines come first and the smallest sacrifice comes last.
- The game ends when every box is claimed, or early in Sprint when the box target is reached.
- Undo removes the last line and any boxes it completed, restoring the score and turn.

## Scoring

| Event | Points |
| --- | --- |
| Draw a line | 5 |
| Claim a box | 25 × mode box multiplier |

The final score is `(points earned + win bonus) × mode multiplier`, rounded. A timeout win awards no bonus. The win bonus is not paid on a draw. Only the human seat's points are scored in single-player games.

## Records and persistence

Saved under `dots-boxes` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestBlitzScore`, `bestSprintScore`, `bestDoubleScore`, `bestGrandmasterScore`
- `bestScore`, `bestWinMargin`, `wins`, `classicWins`, `blitzWins`, `sprintWins`, `doubleWins`, `grandmasterWins`
- `boxesClaimed`, `linesDrawn`
- `fewestLines` on a win
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`bestWinMargin` stores the largest box margin in any finished game, including draws recorded as zero.

## Cosmetics

Sixteen registered cosmetics using the `db:` prefix:

| Slot | Items |
| --- | --- |
| Skin (lines) | Cyan Lines, Ruby Lines, Jade Lines, Violet Lines, Mono Lines |
| Palette (grid) | Night Grid, Slate Grid, Forest Grid, Plum Grid |
| Effect (hint glow) | Cyan Glow, Amber Glow, Rose Glow, Lime Glow |
| Theme (scene) | Night Board, Dusk Board, Sea Board |

Line skins recolour both players together; grid skins repaint the field, rim, grid lines and dots; accents drive hints, focus and the active-turn border. Theme items only replace the page background.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Line | Draw a line. | Common |
| Boxed In | Claim a box. | Common |
| Two At Once | Claim two boxes in one turn. | Rare |
| Long Chain | Claim four boxes in one turn. | Epic |
| Grid Regular | Win a Classic game. | Common |
| Beat The Clock | Win a Blitz game. | Rare |
| Quick Squares | Win a Sprint game. | Rare |
| Double Agent | Win a Double Trouble game. | Epic |
| Grandmaster | Win a Grandmaster game. | Legendary |
| Clean Sheet | Win without conceding a box. | Epic |
| High Roller | Finish with 1,000+ points. | Rare |
| Personal Best | Set a new best score. | Rare |

`Two At Once` and `Long Chain` are awarded from a single multi-box claim; `Clean Sheet` requires the human side to finish with the rival on zero boxes and no timeout.

## Menu and controls

The page mounts the shared board menu (Play, Modes, Customize, Options, About, Stats, Exit).

| Input | Action |
| --- | --- |
| Click / tap a line | Draw it between two dots |
| T | Show a suggested line |
| U | Undo |
| N | New game |
| H / M | Shared help / mute |

The side rail carries status, the two score cards, seat / level / board selectors, New game / Undo / Hint, and the box counter. The grid itself has no overlay controls.

## Current baseline and scope

Canonical page: `public/assets/games/32-dots-boxes/index.html` (24.0 KB). Shared kits: perf-kit, save-kit, meta-config, meta-kit, board-kit, score-bridge, ui-kit, music-kit, menu-kit, menu-bootstrap. Layout: board-kit DOM/SVG grid that rebuilds for 3×3, 4×4 or 5×5; 16 cosmetics across four slots. The computer prefers boxes it can take, then safe lines, and in Hard/Grandmaster evaluates sacrifice chains by simulation.

`window.DotsBoxesTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setSeat`, `setLevel`, `setDifficulty`, `level`, `setSize`, `setBoard`, `setTurn`, `play`, `finish`, `undo`, `setScore`, `setClock`, `tick`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-32.mjs` (`npm run test:game-32`). It covers the opening grid and edge count, Classic, Sprint, Blitz (timeout), Double Trouble and Grandmaster finishes, line scoring and undo, the 16 cosmetics, cumulative records and a chrome-free playing view.

## Menu Identity Card

- **Archetype:** Paper.
- **Mood:** A pencil puzzle on a desk; quiet, precise and quick to restart.
- **Palette:** bg `color-mix(in srgb, #60a5fa 12%, #080d15)`; panel `color-mix(in srgb, #60a5fa 8%, rgba(15,22,35,.94))`; accent `#60a5fa`; button `color-mix(in srgb, #60a5fa 76%, white)`; button text `#10151e`; text `#f6f7fb`.
- **Type:** `system-ui` for title and body; the score rail uses tabular numerals.
- **Frame and buttons:** `graph-frame` frame and `graph-banner` buttons with the shared paper treatment.
- **Scene recipe:** Dark desk backdrop; an accent-lit three-line graph motif; restrained paper bands; static under reduced motion.
- **Music and UI sounds:** Per-title procedural motif; dry pencil tick on hover, soft line draw, paper brush on Back.
- **Menu items:** Play, Modes, Customize, Options, About, Stats, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options; seat, level and grid size live in-game.
- **Lite fallback:** Static graph composition with the accent silhouette and no glow or particles.
