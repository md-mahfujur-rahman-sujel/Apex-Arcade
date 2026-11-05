# Game 35 — Memory Match

## Pitch

Flip two cards, remember the faces and clear the board. Classic is a 16-card solo board, Quick Spot is 12, Expert is 36, Duel shares 24 cards between two players, and Master gives three minutes for 24 cards. Streaks reward clean runs, a timed hint bails out a stuck memory, and per-mode best times and scores give every board a target.

## Art direction

A dark table with rounded square cards. Face-down cards carry a distinct gradient back with a large `?`; face-up cards reveal a bright emoji on a panel background. Matched pairs tint emerald and hop once; a hinted pair turns face up briefly. The menu scene uses the shared memory motif: three stacked card outlines under an accent glow. Lite and reduced motion keep card flips and matched highlights while shortening the hop.

## Modes and match structure

| Mode | Cards | Players | Clock | Score multiplier | Win bonus |
| --- | --- | --- | --- | --- | --- |
| Classic | 16 | solo | none | 1× | 1,000 |
| Quick Spot | 12 | solo | none | 1.15× | 800 |
| Expert | 36 | solo | none | 1.35× | 1,500 |
| Duel | 24 | two | none | 1.2× | none |
| Master | 24 | solo | 3:00 | 1.5× | 1,200 |

1. **Classic:** eight pairs; the standard solo board.
2. **Quick Spot:** six pairs for a fast round.
3. **Expert:** eighteen pairs on a six-column grid.
4. **Duel:** two players share the board; a match scores a point and keeps the turn, a miss passes it. Most pairs wins; a tie is a draw.
5. **Master:** locked until one Classic clear (`classicWins ≥ 1`); twelve pairs must be cleared in three minutes.

A mode change starts a fresh board. Pause/resume freezes the timer, the reveal timers and the current turn.

## Core rules

- All cards start face down. Flip two per move.
- A matching pair stays face up and scores points; a mismatch flips back and costs a small penalty.
- Consecutive matches build a streak worth extra points.
- In Duel, a match adds a point for the current player and repeats their turn; a mismatch passes the turn.
- Hint reveals one unmatched pair for 1.2 seconds and costs 40 points.
- The game ends when every pair is found, or when the Master clock reaches zero.

## Scoring

| Event | Points |
| --- | --- |
| Match a pair | 25 + 10 × (streak − 1), capped at +40 |
| Mismatch | −5 (never below zero) |
| Hint | −40 (never below zero) |
| Solo clear | Mode bonus + speed bonus |
| Duel win | No clear bonus |

The speed bonus is `max(0, 600 − 2 × seconds)` and applies only to untimed solo modes. The final score is `(points + clear bonus + speed bonus) × mode multiplier`, rounded. A timeout records the partial score with no clear bonus.

## Records and persistence

Saved under `memory-match` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestQuickScore`, `bestExpertScore`, `bestDuelScore`, `bestMasterScore`
- `bestClassicTime`, `bestQuickTime`, `bestExpertTime`, `bestMasterTime` (seconds, solo wins only)
- `bestScore`, `bestStreak`
- `wins`, `classicWins`, `quickWins`, `expertWins`, `duelWins`, `masterWins`
- `pairsFound`, `flips`, `mismatches`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

Time records use the minimum merge and skip a zero-second value, so a test or instant finish cannot erase a real best.

## Cosmetics

Sixteen registered cosmetics using the `mm:` prefix:

| Slot | Items |
| --- | --- |
| Skin (card backs) | Midnight Backs, Ruby Backs, Jade Backs, Violet Backs, Ice Backs |
| Palette (table) | Night Table, Slate Table, Forest Table, Plum Table |
| Effect (focus) | Cyan Focus, Amber Focus, Rose Focus, Lime Focus |
| Theme (scene) | Night Room, Dusk Room, Sea Room |

Card-back skins repaint every face-down card; table skins repaint the board surround; accents drive the active stat-card highlight. Theme items only replace the page background.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Flip | Turn over a card. | Common |
| First Pair | Match a pair. | Common |
| Perfect Recall | Finish a solo game with no mismatches. | Epic |
| Quick Eye | Finish a solo game in under a minute. | Rare |
| Grid Regular | Complete a Classic board. | Common |
| Snap Decision | Complete a Quick Spot board. | Common |
| Big Board | Complete an Expert board. | Rare |
| Duel Winner | Win a two-player Duel. | Rare |
| Memory Master | Win a Master board. | Legendary |
| High Roller | Finish with 3,000+ points. | Rare |
| Personal Best | Set a new best score. | Rare |

`Perfect Recall` and `Quick Eye` exclude Duel. All clear badges require a completed board, not a timeout.

## Menu and controls

The page mounts the shared board menu (Play, Modes, Customize, Options, About, Stats, Exit).

| Input | Action |
| --- | --- |
| Click / tap | Flip a card |
| T | Peek at a pair (costs 40 points) |
| N | New game |
| H / M | Shared help / mute |

The side rail shows time, moves, pairs and streak (or both player scores in Duel). New game and Hint sit below the stats; the card grid itself stays unobstructed.

## Current baseline and scope

Canonical page: `public/assets/games/35-memory-match/index.html` (21.5 KB). Shared kits: perf-kit, save-kit, meta-config, meta-kit, board-kit, score-bridge, ui-kit, music-kit, menu-kit, menu-bootstrap. Layout: board-kit DOM card grid that rebuilds for 4 or 6 columns; 16 cosmetics across four slots. Matches use paused-aware `Board.after` timers, so the reveal window freezes with the menu.

`window.MemoryTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setGame`, `flip`, `pairOf`, `cards`, `finish`, `setScore`, `setClock`, `tick`, `hint`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-35.mjs` (`npm run test:game-35`). It covers the opening board, a real pair flip and hint cost, Classic, Quick Spot, Expert, Duel and Master finishes, the 16 cosmetics, cumulative stats and a chrome-free playing view.

## Menu Identity Card

- **Archetype:** Cards.
- **Mood:** A bright table game with a soft spotlight; playful, quick and easy to restart.
- **Palette:** bg `color-mix(in srgb, #f0abfc 12%, #080d15)`; panel `color-mix(in srgb, #f0abfc 8%, rgba(15,22,35,.94))`; accent `#f0abfc`; button `color-mix(in srgb, #f0abfc 76%, white)`; button text `#10151e`; text `#f6f7fb`.
- **Type:** `system-ui` for title and body; emoji faces carry the card identity.
- **Frame and buttons:** `memory-frame` frame and `memory-banner` buttons with the shared card-table treatment.
- **Scene recipe:** Dark room backdrop; three stacked card outlines under an accent glow; soft bands; static under reduced motion.
- **Music and UI sounds:** Per-title procedural motif; soft card flip, bright match chime, muted miss.
- **Menu items:** Play, Modes, Customize, Options, About, Stats, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Lite fallback:** Static card stack with the accent silhouette and no glow or particles.
