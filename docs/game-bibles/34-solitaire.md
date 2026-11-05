# Game 34 — Solitaire

## Pitch

Klondike on a green felt table, with five ways to play. Classic draws one card with unlimited redeals; Draw Three turns three at a time; Single Pass forbids recycling the stock; Blitz gives three minutes; Master forbids undo. Hints, undo, double-click-to-foundation and auto-complete keep the flow smooth, while fifty-two-card wins, timed modes and records give the table a long life.

## Art direction

A green felt table (`#14603f` to `#0b3d2a`) with crisp white cards, red and black suits, and blue patterned backs. The stock, waste, four foundations and seven tableau columns use dashed empty slots so the layout reads even before the first deal. A selected card gets a cyan ring; a hint glows amber. Completed foundations animate on arrival. The menu scene uses the shared solitaire motif: three fanned card rectangles under an accent glow. Lite and reduced motion keep card faces, selection and hint states while dropping deal flourishes and particle drift.

## Modes and match structure

| Mode | Draw | Redeals | Undo | Clock | Score multiplier | Win bonus |
| --- | --- | --- | --- | --- | --- | --- |
| Classic | 1 | unlimited | yes | none | 1× | 2,000 |
| Draw Three | 3 | unlimited | yes | none | 1.25× | 2,200 |
| Single Pass | 1 | none | yes | none | 1.3× | 2,200 |
| Blitz | 1 | unlimited | yes | 3:00 | 1.15× | 1,800 |
| Master | 1 | unlimited | no | none | 1.5× | 2,500 |

1. **Classic:** the standard game; draw one card and recycle the waste as often as needed.
2. **Draw Three:** turn three cards at a time; only the top waste card is playable.
3. **Single Pass:** the stock can be turned once; when it is empty and the waste cannot be recycled the game can still be won from the tableau.
4. **Blitz:** three minutes to clear all four foundations. The clock pauses with the menu.
5. **Master:** locked until one Classic win (`classicWins ≥ 1`); undo is disabled and the attempt is recorded.

A mode change starts a fresh deal. Pause/resume preserves the table, clock and undo history. A new game clears selected cards and hints.

## Core rules

- Build each suit from Ace to King on the four foundations.
- Build tableau columns down in alternating colours.
- Only a King or a stack beginning with a King may be placed in an empty column.
- Click the stock to turn cards; clicking an empty stock recycles the waste when the mode allows it.
- Click a face-up card to select it and every card above it, then click a legal destination.
- Double-click a playable card to send it straight to its foundation.
- Face-down cards turn over when uncovered.
- Auto-complete appears when the stock is empty, every tableau card is face up and only ordered moves remain.

## Scoring

| Event | Points |
| --- | --- |
| Send a card to a foundation | 10 |
| Move a card or stack on the tableau | 2 |
| Turn over a hidden card | 5 each |
| Win | Mode bonus |

The final score is `(points earned + win bonus) × mode multiplier`, rounded. A timeout records the partial score with no bonus. Undo restores the score snapshot, so exploring a line and rewinding never inflates the total.

## Records and persistence

Saved under `solitaire` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestDraw3Score`, `bestSinglepassScore`, `bestBlitzScore`, `bestMasterScore`
- `bestScore`, `bestFoundation`
- `wins`, `classicWins`, `draw3Wins`, `singlepassWins`, `blitzWins`, `masterWins`
- `foundationCards`, `cardsFlipped`, `movesPlayed`
- `fewestMoves` on a win
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`bestFoundation` stores the largest number of cards placed on foundations in any finished game (52 on a win).

## Cosmetics

Sixteen registered cosmetics using the `sol:` prefix:

| Slot | Items |
| --- | --- |
| Skin (card backs) | Classic Backs, Ruby Backs, Jade Backs, Violet Backs, Mono Backs |
| Palette (felt) | Green Felt, Slate Felt, Plum Felt, Sunset Felt |
| Effect (selection) | Cyan Selection, Amber Selection, Rose Selection, Lime Selection |
| Theme (scene) | Night Room, Dusk Room, Sea Room |

Card-back skins repaint every face-down card; felt skins repaint the table gradient; accents drive selection, hints and focus. Theme items only replace the page background.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Move | Make a move. | Common |
| Foundations | Send a card to a foundation. | Common |
| Full Set | Complete an Ace-to-King suit. | Rare |
| Swift Finish | Win in under three minutes. | Rare |
| Sunday Best | Win a Classic game. | Common |
| Three At A Time | Win a Draw Three game. | Rare |
| One Pass | Win a Single Pass game. | Rare |
| Against The Clock | Win a Blitz game. | Epic |
| Master | Win a Master game. | Legendary |
| No Regrets | Win without undoing a single move. | Epic |
| High Roller | Finish with 3,000+ points. | Rare |
| Personal Best | Set a new best score. | Rare |

`No Regrets` checks the whole attempt, including moves later undone. `Swift Finish` uses the in-game timer, so paused time does not count.

## Menu and controls

The page mounts the shared board menu (Play, Modes, Customize, Options, About, Stats, Exit).

| Input | Action |
| --- | --- |
| Click the stock | Turn cards / recycle the waste |
| Click a card, then a target | Move a card or stack |
| Double-click a card | Send it to its foundation |
| T | Show a hint |
| U | Undo (disabled in Master) |
| N | New game |
| H / M | Shared help / mute |

The panel carries status, points and timer, New game / Undo / Hint, and Auto-complete when it becomes available. The table itself stays free of overlay controls.

## Current baseline and scope

Canonical page: `public/assets/games/34-solitaire/index.html` (25.8 KB). Shared kits: perf-kit, save-kit, meta-config, meta-kit, board-kit, score-bridge, ui-kit, music-kit, menu-kit, menu-bootstrap. Layout: board-kit DOM card table with seven tableau columns and four foundations; 16 cosmetics across four slots. The hint engine prefers foundation moves, then fruitful tableau moves, then a stock turn.

`window.SolitaireTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setGame`, `drawStock`, `move`, `setScore`, `setClock`, `tick`, `finish`, `undo`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-34.mjs` (`npm run test:game-34`). It covers the opening deal, a Classic win, Draw Three, the blocked Single Pass recycle and its win, the Blitz timeout, Master after Classic unlock, all 16 cosmetics, cumulative records and a chrome-free playing view.

## Menu Identity Card

- **Archetype:** Cards.
- **Mood:** A calm hotel-room table at night; one more deal, one more card.
- **Palette:** bg `color-mix(in srgb, #34d399 12%, #080d15)`; panel `color-mix(in srgb, #34d399 8%, rgba(15,22,35,.94))`; accent `#34d399`; button `color-mix(in srgb, #34d399 76%, white)`; button text `#10151e`; text `#f6f7fb`.
- **Type:** `system-ui` for title and body; card ranks use a clear sans face.
- **Frame and buttons:** `solitaire-frame` frame and `solitaire-banner` buttons with the shared card-table treatment.
- **Scene recipe:** Dark room backdrop; three fanned cards under an accent glow; soft felt bands; static under reduced motion.
- **Music and UI sounds:** Per-title procedural motif; soft card slide, crisp flip, warm win cue.
- **Menu items:** Play, Modes, Customize, Options, About, Stats, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Lite fallback:** Static fan of cards with the accent silhouette and no glow or particles.
