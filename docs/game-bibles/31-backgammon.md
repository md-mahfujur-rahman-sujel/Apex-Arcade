# Game 31 — Backgammon

## Pitch

A complete 24-point backgammon table: roll, race, hit blots and bear off. Classic keeps the full fifteen-checker game; Blitz adds a two-minute clock, Sprint shortens the race to ten checkers, Gammon Rush forces a double stake on every win, and Grandmaster runs the deepest search. The seat selector flips the player between cyan and amber or starts a local two-player match.

## Art direction

A dark navy table with six wedge points per quadrant, cyan and amber checkers, and a muted bar down the centre. The board sits in a deep `#0c1226` field with a `#1b2340` outer rim, walnut-brown and navy triangles, and a soft drop shadow. Checkers read by both fill and edge colour; legal destinations pulse rather than rely on colour alone. Dice are drawn as large unicode pips with used dice dimmed or struck through. The menu scene uses the shared points motif: three triangular wedges under an accent glow with slow drifting particles. Lite and reduced motion keep the points, checkers and legal-move pulse while dropping particle drift.

## Modes and match structure

| Mode | Format | Clock | Score multiplier | Win bonus |
| --- | --- | --- | --- | --- |
| Classic | 15 checkers, full race | none | 1× | 1,000 |
| Blitz | 15 checkers | 2:00 per side | 1.1× | 900 |
| Sprint | first to bear off 10 | none | 1.2× | 1,100 |
| Gammon Rush | every win stakes at least a gammon | none | 1.3× | 1,200 |
| Grandmaster | 15 checkers vs the deepest search | none | 1.5× | 1,500 |

1. **Classic:** the full game. A gammon (rival bears off none) stakes double and a backgammon (rival still has a checker in the winner's home board or on the bar) stakes triple.
2. **Blitz:** two minutes per side. The clock pauses with the menu and a flag loses the match with no win bonus.
3. **Sprint:** the match ends as soon as either side bears off ten checkers. Gammon stakes do not apply.
4. **Gammon Rush:** every non-timeout win is staked at least as a gammon, doubling the bonus.
5. **Grandmaster:** locked until one Classic win (`classicWins ≥ 1`); the computer always uses the deepest search regardless of the manual level selector.

A mode change starts a fresh game. Pause/resume preserves the position, dice, turn and clock. A new game clears undo history, scores and timers.

## Core rules

- Cyan moves anticlockwise into the bottom-right home board; Amber moves the other way into the top-right home board.
- Roll two dice (doubles grant four moves). A checker may move to an empty point, its own point, or a point holding exactly one rival checker.
- Landing on a lone rival checker hits it to the bar. A point with two or more rival checkers is blocked.
- Checkers on the bar must re-enter before any other checker moves.
- You must use as many dice as possible. When only one die can be played, it must be the larger.
- Once all fifteen checkers are in the home board, bear off by exact distance or by the smallest legal overshoot.
- Undo rewinds the whole turn, including hits and score changes.

## Scoring

| Event | Points |
| --- | --- |
| Move a checker | 10 |
| Hit a blot | 60 |
| Bear off a checker | 100 |
| Win | Mode bonus × stake (1, 2 or 3) |

The final score is `(points earned + bonus × stake) × mode multiplier`, rounded. A timeout win awards no bonus. Gammon Rush raises the stake to at least 2; a natural backgammon still stakes 3.

## Records and persistence

Saved under `backgammon` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestBlitzScore`, `bestSprintScore`, `bestGammonScore`, `bestGrandmasterScore`
- `bestScore`, `bestStake`, `wins`, `classicWins`, `blitzWins`, `sprintWins`, `gammonWins`, `grandmasterWins`
- `checkersOff`, `blotsHit`, `rollsPlayed`
- `fewestRolls` on a win
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`record()` max-merges scores, sums counters and applies the minimum for `fewestRolls`.

## Cosmetics

Sixteen registered cosmetics using the `backgammon:` prefix:

| Slot | Items |
| --- | --- |
| Skin (checkers) | Cyan Checkers, Ruby Checkers, Jade Checkers, Violet Checkers, Mono Checkers |
| Palette (board) | Classic Board, Walnut Board, Slate Board, Forest Board |
| Effect (move glow) | Cyan Move Glow, Amber Move Glow, Rose Move Glow, Lime Move Glow |
| Theme (scene) | Night Club, Dusk Lounge, Sea Deck |

Checker skins recolour both sides together; board skins repaint the field, rim, bar and triangle colours; accents drive the legal-move pulse and focus states. Theme items only replace the page background.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Roll | Roll the dice. | Common |
| Blot Hunter | Hit a rival blot to the bar. | Common |
| Bearing Off | Bear off a checker. | Common |
| Gammon | Win without the rival bearing off. | Rare |
| Backgammon | Win a triple-stake backgammon. | Epic |
| Board Veteran | Win a Classic game. | Common |
| Beat The Clock | Win a Blitz game. | Rare |
| Fast Finish | Win a Sprint game. | Rare |
| Gammon Champion | Win a Gammon Rush game. | Epic |
| Grandmaster | Win a Grandmaster game. | Legendary |
| Untouched | Win without a blot being hit. | Epic |
| Personal Best | Set a new best score. | Rare |

`gammon` and `backgammon` are separate tiers: a triple-stake win awards only the higher badge. `untouched` checks the human side's blots lost across the whole match.

## Menu and controls

The page mounts the shared board menu (Play, Modes, Customize, Options, About, Stats, Exit) with a custom mode description and the standard progress view.

| Input | Action |
| --- | --- |
| R / Space | Roll the dice |
| Click a checker, then a point | Move it; legal points pulse |
| U | Undo the moves made this turn |
| T | Show a suggested move |
| N | New game |
| H / M | Shared help / mute |

The side rail carries status, the dice tray, seat and level selectors and Roll / Undo / Hint / New game. The board stays unobstructed during play.

## Current baseline and scope

Canonical page: `public/assets/games/31-backgammon/index.html` (34.7 KB). Shared kits: perf-kit, save-kit, meta-config, meta-kit, board-kit, score-bridge, ui-kit, music-kit, menu-kit, menu-bootstrap. Layout: board-kit SVG with 24 points, bar, off trays and dynamic checker layout; 16 cosmetics across four slots. The computer scores positions by pip count, bar pressure, made points, prime length and blot exposure, then searches move plans depth-first; Grandmaster raises the search strength.

`window.BackgammonTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setSeat`, `setLevel`, `setDifficulty`, `level`, `setBoard`, `setTurn`, `setDice`, `move`, `roll`, `undo`, `finish`, `setScore`, `setClock`, `tick`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-31.mjs` (`npm run test:game-31`). It covers the mode list and Grandmaster lock, the menu actions, forced larger-die play, a hit to the bar with undo and replay, all five mode finishes (including timeout), the 16 cosmetics, cumulative records and a chrome-free playing view.

## Menu Identity Card

- **Archetype:** Table.
- **Mood:** A quiet club table under warm light; the roll decides the pace and every checker has a clear home.
- **Palette:** bg `color-mix(in srgb, #d6b98c 12%, #080d15)`; panel `color-mix(in srgb, #d6b98c 8%, rgba(15,22,35,.94))`; accent `#d6b98c`; button `color-mix(in srgb, #d6b98c 76%, white)`; button text `#10151e`; text `#f6f7fb`.
- **Type:** `system-ui` for title and body; monospace for dice and clocks.
- **Frame and buttons:** `points-frame` frame and `points-banner` buttons with the shared table treatment and a light wood accent.
- **Scene recipe:** Deep navy field; three accent-lit triangular points; restrained depth bands; drifting accent particles that stop under reduced motion.
- **Music and UI sounds:** Per-title procedural motif at a relaxed tempo; wooden dice rattle, checker clicks and a soft back cue.
- **Menu items:** Play, Modes, Customize, Options, About, Stats, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options; seat and level live in-game.
- **Lite fallback:** Static points composition with the accent silhouette and no drifting particles.
