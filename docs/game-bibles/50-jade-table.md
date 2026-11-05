# Game 50 — Jade Table (Mahjong Solitaire)

## Pitch

Traditional Mahjong solitaire on a jade table: dismantle the layered turtle by removing matching pairs of free tiles. A tile is free when nothing rests on it and at least one long side is open. The full board is 144 tiles in a stepped pyramid; Swift shrinks it to a 72-tile mound, Blitz puts a five-minute clock on the full board, Zen relaxes the hint and undo limits, and Master removes the safety net entirely. Every tile face is drawn as vector art with the suit, numeral and CJK character, so the board stays sharp at any scale.

## Art direction

A jade felt table under a soft table lamp, with ivory tile bodies, engraved suit art and a raised 3D bevel. Bamboo and circle suits are drawn as vector pips, the character suit uses serif CJK numerals, and the winds, dragons and flowers use their traditional glyphs. Free tiles glow in the selected accent and blocked tiles dim, so legal plays read at a glance. Tile skins come from `mahjong:tile-*`, the felt from `mahjong:felt-*`, the free-tile glow from `mahjong:glow-*` and the HUD ink from `mahjong:ink-*`. Tile faces never rely on colour alone: each face carries its symbol and an accessible name.

## Modes and board structure

| Mode | Board | Hints | Undos | Shuffles | Clock | Unlock |
| --- | --- | --- | --- | --- | --- | --- |
| Classic | 144 tiles (72 pairs), stepped pyramid | 3 | 3 | 1 | none | open |
| Swift | 72 tiles (36 pairs), compact mound | 2 | 2 | 1 | none | open |
| Blitz | 144 tiles | 3 | 2 | 1 | 5:00 | open |
| Zen | 144 tiles | 5 | unlimited | 3 | none | open |
| Master | 144 tiles | 0 | 0 | 1 | none | Classic win |

1. **Classic:** the full turtle and the baseline limits; the natural first clear.
2. **Swift:** a smaller two-layer mound for a quick, readable run.
3. **Blitz:** the full board against a five-minute countdown; running out of time ends the run.
4. **Zen:** generous hints, unlimited undo and three shuffles for a relaxed clear.
5. **Master:** no hints or undos and a single shuffle; locked until a Classic board is cleared (`classicWins ≥ 1`).

A mode change deals a fresh board. Pause freezes the clock and pointer input. The shared difficulty setting does not alter Mahjong: there is no opponent and no simulation speed, so every mode plays at its table rules.

## Core rules

- A tile is free when no remaining tile rests on top of it and its left or right side is open.
- Select one free tile, then a second free tile with the same face; both are removed.
- Selecting a different free tile replaces the selection rather than penalising the player.
- A board is cleared when every tile is removed.
- If no legal pair remains, the player must shuffle the remaining tiles to reopen the board.
- Hint glows one available pair for 1.8 seconds; undo restores the last removed pair and rewinds the move and score counters; shuffle redeals the remaining faces until at least one pair exists.
- Blitz ends the run at 5:00 even if pairs remain.

## Scoring

Each removed pair pays **100 points**. Clearing the board adds a finish bonus:

`500 + max(0, 900 − seconds × 3) − hints used × 20 − undos used × 25 − shuffles used × 40`

The total is floored at zero. A timed-out Blitz run keeps only the pair score. There is no difficulty multiplier.

## Records and persistence

Saved under `mahjong`:

- `bestScoreClassic`, `bestScoreSwift`, `bestScoreBlitz`, `bestScoreZen`, `bestScoreMaster`
- `bestPairs` (most pairs in one board, maximum merge)
- `bestTimeClassic`, `bestTimeSwift`, `bestTimeBlitz`, `bestTimeZen`, `bestTimeMaster` (fastest clear; losses are skipped)
- `bestMovesClassic`, `bestMovesSwift`, `bestMovesBlitz`, `bestMovesZen`, `bestMovesMaster` (fewest moves on a clear)
- `matches`, `wins`, `losses`, `pairs`, `hints`, `undos`, `shuffles`
- `classicWins`, `swiftWins`, `blitzWins`, `zenWins`, `masterWins`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

## Cosmetics

Sixteen registered cosmetics using the `mahjong:` prefix:

| Slot | Items |
| --- | --- |
| Skin (tile) | Jade, Ivory, Rosewood, Slate, Amber |
| Palette (felt) | Jade, Night, Plum, Ocean |
| Effect (free-tile glow) | Gold, Cyan, Lime, Rose |
| Theme (HUD ink) | Gold, Mint, Slate |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Sweep | clear any board | Common |
| Unaided | clear a board without a hint, undo or shuffle | Epic |
| As Dealt | clear a board without shuffling | Rare |
| Quick Hands | clear a board in under 90 seconds | Rare |
| Table Regular | clear five boards across the career | Common |
| Jade Veteran | clear ten boards across the career | Rare |
| Swift Sweep | clear a Swift board | Rare |
| Clock Beater | clear a Blitz board | Rare |
| Still Water | clear a Zen board | Rare |
| Jade Master | clear a Master board | Epic |
| Every Table | clear a board in every mode | Legendary |
| Hundred Pairs | match one hundred pairs across the career | Rare |

## Tutorial and controls

The interactive tutorial teaches free-tile detection, pair selection, the cost of hints/undos/shuffles and what each mode changes. Controls: click or tap tiles to select and match; H hints; U undoes; S shuffles; N deals a new board; M toggles mute; H opens help from the menu. Free tiles show a glow and blocked tiles are dimmed and disabled. The HUD shows pairs cleared, elapsed time (and the Blitz limit), score, moves and the remaining hint, undo and shuffle counts.

## Menu Identity Card

- **Archetype:** table.
- **Mood:** Clear matching free tiles from the jade table.
- **Palette:** `#080d15` background, `color-mix(in srgb, #34d399 8%, rgba(15,22,35,.94))` panel, `#34d399` accent, `color-mix(in srgb, #34d399 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts; serif CJK for tile characters.
- **Frame and buttons:** `mahjong-frame` frame and `mahjong-banner` button identity, using the shared table treatment.
- **Scene recipe:** Eight-tooth ring motif under a jade accent light, with restrained depth bands and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Table-family major motif; shared tick, select and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options; difficulty does not change Mahjong rules.
- **Controls:** Select two matching free tiles to remove them; Hint, Undo and Shuffle are available in the table panel.
- **Lite fallback:** Static jade composition with the title accent and ring silhouette.
