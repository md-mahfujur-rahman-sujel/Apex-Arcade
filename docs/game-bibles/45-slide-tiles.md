# Game 45 — Slide Tiles

## Pitch

A classic sliding puzzle with a gap. Tiles in the same row or column slide toward the gap, a click slides the whole run of tiles between the clicked tile and the gap, and arrow keys move the tile beside the gap. Classic is 4×4 in ascending order, Sprint is 3×3 on a 90-second clock, Zen is 5×5 with unlimited undo, Mirror solves 15 down to 1 with the gap in the top-left, and Daily gives everyone the same 4×4 shuffle.

## Art direction

A dark board with rounded numbered tiles whose colour ramps across the sequence. The tile ramp comes from `sliding-puzzle:tiles-*` (hue, saturation and lightness), the board from `sliding-puzzle:board-*`, the placed-tile ring from `sliding-puzzle:glow-*` and the digits/aura from `sliding-puzzle:ink-*`. Tiles animate their left/top moves with a short ease; a tile in its final place keeps a coloured ring. Reduced-motion settings remove the slide transition while keeping position updates.

## Modes and match structure

| Mode | Grid | Goal order | Clock | Undo limit | Unlock |
| --- | --- | --- | --- | --- | --- |
| Classic | 4×4 | 1 → gap | none | 5 | open |
| Sprint | 3×3 | 1 → gap | 90 s | 2 | open |
| Zen | 5×5 | 1 → gap | none | unlimited (99) | open |
| Mirror | 4×4 | gap top-left, 15 → 1 | none | 3 | Classic win |
| Daily | 4×4 | 1 → gap, date seed | none | 3 | open |

1. **Classic:** the baseline 4×4 grid and the unlock gate.
2. **Sprint:** a 3×3 grid with a 90-second clock; the run ends when time reaches zero.
3. **Zen:** a 5×5 grid and effectively unlimited undo.
4. **Mirror:** locked until a Classic win (`classicWins ≥ 1`); the solved board runs 15 down to 1 with the gap at the top-left.
5. **Daily:** the shuffle is seeded from the local date, so every player gets the same 4×4 board that day.

A mode change starts a fresh puzzle. Pause freezes the Sprint clock.

## Core rules

- Clicking a tile in the gap's row or column moves that tile and every tile between it and the gap one step.
- Arrow keys slide the tile adjacent to the gap in the pressed direction.
- A click on a tile that shares neither row nor column with the gap is refused.
- Every slide can be undone up to the mode's limit; undoing rewinds the move counter too.
- A puzzle is solved when every tile matches the mode's goal order.
- Every shuffle is generated from the solved board with legal moves, so every puzzle is solvable.

## Scoring

Classic pays `1200 + max(0, 900 − 3 × seconds) − 4 × moves`; Sprint `1000 + 6 × remaining seconds − 4 × moves`; Zen a flat 800; Mirror `1800 + max(0, 1200 − 3 × seconds) − 5 × moves`; Daily `1000 + max(0, 900 − 3 × seconds) − 4 × moves`. Every mode then subtracts 60 per undo (20 in Zen) and floors at 100. A loss scores zero.

## Records and persistence

Saved under `sliding-puzzle`:

- `bestScore`, `bestScoreClassic`, `bestScoreSprint`, `bestScoreZen`, `bestScoreMirror`, `bestScoreDaily`
- `bestTimeClassic`, `bestTimeSprint`, `bestTimeZen`, `bestTimeMirror`, `bestTimeDaily`
- `bestMovesClassic`, `bestMovesSprint`, `bestMovesZen`, `bestMovesMirror`, `bestMovesDaily`
- `wins`, `losses`, `solves`, `moves`, `undos`
- `classicWins`, `sprintWins`, `zenWins`, `mirrorWins`, `dailyWins`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`bestTime*` and `bestMoves*` use the minimum merge and only record wins.

## Cosmetics

Sixteen registered cosmetics using the `sliding-puzzle:` prefix:

| Slot | Items |
| --- | --- |
| Skin (tiles) | Classic, Ember, Jade, Ice, Violet |
| Palette (board) | Slate, Night, Indigo, Mono |
| Effect (placed ring) | Green, Cyan, Amber, Rose |
| Theme (digits/aura) | Navy, Ember, Mint |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Slide | solve any puzzle | Common |
| Efficient | solve in 100 moves or fewer | Rare |
| Quick Hands | solve in under 90 seconds | Rare |
| Clean Run | solve without undo | Common |
| Sprint Solver | solve Sprint | Rare |
| Zen Solver | solve Zen | Common |
| Daily Tiles | solve the Daily puzzle | Rare |
| Mirror Finish | solve Mirror | Epic |
| Wide Grid | solve a 5×5 puzzle | Rare |
| Triple Crown | win in three modes | Rare |
| Ten Solves | solve ten puzzles | Epic |
| Complete Slider | win in every mode | Legendary |

## Tutorial and controls

The interactive tutorial covers same-row/column clicks, arrow-key slides, the placed-tile ring and the mode modifiers. Controls: click a tile to slide it and any tiles behind it; arrows slide the neighbour into the gap; U undoes; N shuffles a new puzzle; H/M toggle help and mute. The HUD shows moves, elapsed or remaining time, the mode's undo allowance, tiles in place and the per-mode best move count.

## Menu Identity Card

- **Archetype:** sliding-tile board.
- **Mood:** one open space, one tile at a time.
- **Palette:** `#2a2f45` board, `#93c5fd` accent, hue-ramped tiles.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `tiles-*`, `board-*` and `ink-*` identity.
- **Scene recipe:** Rounded numbered tiles positioned on a shadowed board; static in reduced-motion mode.
- **Music and UI sounds:** Per-title procedural motif; slide, click, error and win cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Controls:** Click or arrows; U undo; N shuffle.
- **Lite fallback:** Static tile layout with the title accent.
