# Game 29 — Reversi

## Pitch

Outflank your rival to flip their discs and own the board when it fills. Classic plays the full 8×8 grid; Blitz adds a clock, Corner Rush ends on corners, Mini shrinks to 4×4, and Grandmaster deepens the search. Every placement is a visible line of flips, which makes the game read without explanation.

## Art direction

A green-table board with square cells, dark and light discs drawn as glossy counters, and a gold ring on the last placement. Legal empty squares show a small dot. Corners are subtly outlined because they can never be flipped. The score strip shows Black and White disc counts side by side, so the material swing is always visible.

Disc skins pair the two colours into contrasting sets (onyx, ruby, gold, jade, ice). Board skins repaint square, board and frame colours together, and accents drive hints, legal dots and the last-move ring. Lite and reduced-motion remove flip sparkles but keep the disc's colour change and count update.

## Modes and match structure

| Mode | Board | Clock | Special rule | Multiplier | Win bonus |
| --- | --- | --- | --- | --- | --- |
| Classic | 8×8 | none | Standard Reversi; Black moves first | 1× | 1,000 |
| Blitz | 8×8 | 1:30 per side | Flag falls, that side loses | 1.1× | 900 |
| Corner Rush | 8×8 | none | First side to hold three corners wins | 1.2× | 1,000 |
| Mini 4×4 | 4×4 | none | Short board, every square matters | 1.3× | 1,100 |
| Grandmaster | 8×8 | none | Deepest search | 1.5× | 1,500 |

1. **Classic:** if a side has no legal move it passes; when neither side can move, the larger disc count wins. A tie is a draw.
2. **Blitz:** ninety seconds each, paused with the menu.
3. **Corner Rush:** the third corner for one side ends the game immediately.
4. **Mini 4×4:** opening position is scaled to the 4×4 board with the standard centre cluster.
5. **Grandmaster:** locked until one Classic win (`classicWins ≥ 1`).

A mode change rebuilds the board at that mode's size. Pause/resume preserves position, clock, hint and undo history.

## Core rules

- Place a disc on a square that traps at least one straight line of rival discs between the new disc and an existing own disc.
- All trapped discs flip; lines can be horizontal, vertical or diagonal.
- Corners cannot be flipped, which is why the hint system values them highly.
- A side with no legal placement passes; the game ends when neither side can move.
- In Corner Rush the corner count is checked after every placement; in Blitz a timeout ends the game.

## Scoring

| Event | Points |
| --- | --- |
| Place a disc | 10 |
| Flip a disc | 20 per flipped disc |
| Win | Mode bonus from the table above |

The final score is `(human score + win bonus if the human won) × mode multiplier`, rounded. In two-player mode the human seat is Black and only a Black win earns the bonus. A draw records the score with no win bonus.

## Records and persistence

Saved under `reversi` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestBlitzScore`, `bestCornersScore`, `bestMiniScore`, `bestGrandmasterScore`
- `bestScore`, `wins`, `classicWins`, `blitzWins`, `cornersWins`, `miniWins`, `grandmasterWins`
- `biggestFlip`, `discsFlipped`, `movesPlayed`
- `fewestMoves` on a win
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

## Cosmetics

Sixteen registered cosmetics using the `reversi:` prefix:

| Slot | Items |
| --- | --- |
| Skin (discs) | Onyx Discs, Ruby Discs, Gold Discs, Jade Discs, Ice Discs |
| Palette (board) | Forest Board, Slate Board, Walnut Board, Plum Board |
| Effect (marker) | Amber Marker, Cyan Marker, Rose Marker, Lime Marker |
| Theme (scene) | Night Garden, Forest Glade, Sunset Terrace |

Disc skins recolour both sides; board skins rewrite cell, board and frame colours; accents colour legal dots, hints and the last-placement ring. Theme items only replace the page background.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Placement | Place a disc. | Common |
| Turncoat | Flip an enemy disc. | Common |
| Board Owner | Win a Classic game. | Common |
| Quick Thinker | Win a Blitz game. | Rare |
| Corner Rusher | Win a Corner Rush game. | Rare |
| Mini Master | Win a Mini 4×4 game. | Rare |
| Grandmaster | Win a Grandmaster game. | Legendary |
| Mass Flip | Flip six or more discs in one move. | Epic |
| Corner Lord | Win with all four corners. | Epic |
| Shutout | Win with every disc on the board. | Legendary |
| Dominant | Win by thirty discs or more. | Rare |
| Personal Best | Set a new best score. | Rare |

`corner-lord`, `shutout` and `dominant` are only evaluated on a human win; a draw never awards a mode badge.

## Tutorial and controls

Four interactive steps cover trapping and flipping, legal-move dots and passes, corners, and the final disc count.

| Input | Action |
| --- | --- |
| Click / tap a dot | Place a disc |
| T | Show a hint |
| U | Undo |
| N | New game |
| H / M | Shared help / mute |

Legal dots are on the board, and the hint highlights a recommended square; the side rail holds only status, score, seat/level and the New game / Undo / Hint controls.

## Current baseline and scope

Canonical page: `public/assets/games/29-reversi/index.html` (26.9 KB). Shared kits: board-kit, menu-bootstrap, menu-kit, meta-kit, meta-config, save-kit, score-bridge, ui-kit, perf-kit, music-kit. Layout: Board DOM grid that rebuilds for 4×4 or 8×8; 16 cosmetics registered across four slots.

`window.ReversiTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setSeat`, `setLevel`, `setDifficulty`, `level`, `setBoard`, `setTurn`, `play`, `finish`, `setScore`, `setClock`, `tick`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-29.mjs` (`npm run test:game-29`). It covers the mode list and Grandmaster lock, menu actions, the Classic opening moves, a flip score, Mini 4×4 sizing, a Corner Rush finish, an all-four-corners Classic win, Grandmaster and Blitz finishes, all 16 cosmetics, achievements, cumulative stats and a chrome-free playing view.

## Menu Identity Card

- **Archetype:** glass.
- **Mood:** Claim the corners and turn the board your way.
- **Palette:** `#080d15` background, `color-mix(in srgb, #86efac 8%, rgba(15,22,35,.94))` panel, `#86efac` accent, `color-mix(in srgb, #86efac 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** `discs-frame` frame and `discs-banner` button identity, using the shared glass treatment.
- **Scene recipe:** Original procedural discs motif with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Glass-family motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Click or tap a legal square to place a disc.
- **Lite fallback:** Static discs composition with the title accent and scene silhouette.
