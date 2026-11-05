# Game 44 — Minefield

## Pitch

Clear every safe square on a minefield using numeric clues. The first click is always safe and opens a region, flagging marks suspected mines, and clicking a revealed number whose flags match its count chords the rest of its neighbours open. Classic is a 16×16 field with 40 mines, Sprint is 9×9 on a 90-second clock, Zen defuses one mine for you, No Flag disables flagging, and Evil packs 55 mines into 16×16.

## Art direction

A dark field of raised tiles over a recessed slate board. Tiles use `minesweeper:tile-*`, the board `minesweeper:board-*`, the keyboard cursor `minesweeper:focus-*` and the counters `minesweeper:hud-*`. Numbers are colour-coded 1–8, revealed cells sink flat, flags are red, and a hit mine flashes red. Lite and reduced-motion settings keep every state cue but drop the shake.

## Modes and match structure

| Mode | Field | Mines | Clock | Special | Unlock |
| --- | --- | --- | --- | --- | --- |
| Classic | 16×16 | 40 | none | none | open |
| Sprint | 9×9 | 12 | 90 s | none | open |
| Zen | 9×9 | 10 | none | one free defuse | open |
| No Flag | 16×16 | 40 | none | flagging disabled | Classic clear |
| Evil | 16×16 | 55 | none | denser field | Classic clear |

1. **Classic:** the baseline field and the unlock gate.
2. **Sprint:** a smaller field with a 90-second clock.
3. **Zen:** the first mine hit is defused and flagged instead of ending the run.
4. **No Flag:** the flag button is hidden and every flag input is refused.
5. **Evil:** 55 mines in the same 16×16 area, leaving far fewer safe squares.

A mode change deals a fresh field. Pause freezes the Sprint clock.

## Core rules

- Mines are placed lazily on the first reveal, excluding the clicked cell and its eight neighbours.
- Revealing a zero cascades open every connected safe cell.
- A number counts the mines among its eight neighbours.
- Chording opens all unflagged, unrevealed neighbours when the flag count equals the number.
- A wrong flag still counts toward the displayed mine counter and prevents chording until corrected.
- Revealing a mine ends the run; in Zen the first hit is defused, flagged, and the defuse counter drops to zero.
- The field is cleared when every safe square is revealed.

## Scoring

Classic pays `600 + max(0, 600 − 2 × seconds)`; Sprint `800 + max(0, 300 − 4 × seconds)`; Zen a flat 500; No Flag `900 + max(0, 900 − 2 × seconds)`; Evil `1500 + max(0, 1200 − 2 × seconds)`. All scores round and floor at 100. A loss scores zero.

## Records and persistence

Saved under `minesweeper`:

- `bestScore`, `bestScoreClassic`, `bestScoreSprint`, `bestScoreZen`, `bestScoreNoflags`, `bestScoreEvil`
- `bestTimeClassic`, `bestTimeSprint`, `bestTimeZen`, `bestTimeNoflags`, `bestTimeEvil`
- `wins`, `losses`, `fieldsCleared`
- `mines`, `flagsPlaced`, `chords`, `defuses`
- `classicWins`, `sprintWins`, `zenWins`, `noflagsWins`, `evilWins`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`bestTime*` records the fastest clear per mode.

## Cosmetics

Sixteen registered cosmetics using the `minesweeper:` prefix:

| Slot | Items |
| --- | --- |
| Skin (tiles) | Graphite, Ember, Jade, Ice, Violet |
| Palette (board) | Slate, Night, Indigo, Mono |
| Effect (cursor) | Amber, Cyan, Lime, Rose |
| Theme (HUD) | Ruby, Amber, Mint |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Field | clear any field | Common |
| Clean Sweep | clear without placing a flag | Rare |
| Quick Sweep | clear in under 90 seconds | Rare |
| Sprint Sweeper | clear Sprint | Rare |
| Zen Sweeper | clear Zen | Common |
| Bare Hands | clear No Flag | Epic |
| Evil Genius | clear Evil | Legendary |
| Defused | survive a mine in Zen | Rare |
| Five Fields | clear five fields | Rare |
| Triple Crown | win in three modes | Rare |
| Ten Fields | clear ten fields | Epic |
| Complete Sapper | clear every mode | Legendary |

## Tutorial and controls

The interactive tutorial covers safe first clicks, number reading, flagging, chording and the mode modifiers. Controls: click reveals (or chords); right-click, long-press or F flags; the Flag mode button supports touch; arrows move the keyboard cursor and Space reveals/chords; N deals a new field; H/M toggle help and mute. The HUD shows remaining mines, the clock and the mode.

## Menu Identity Card

- **Archetype:** tactile minefield board.
- **Mood:** careful deduction, one square at a time.
- **Palette:** `#2a2f45` frame, `#181c2e` open cells, `#fb7185` HUD accent.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `tile-*`, `board-*` and `hud-*` identity.
- **Scene recipe:** Raised tile grid with colour-coded numbers and a focus cursor; static in Lite and reduced-motion modes.
- **Music and UI sounds:** Per-title procedural motif; reveal, flag, chord, defuse and boom cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Controls:** Click reveal/chord; right-click/F flag; arrows + Space; N new field.
- **Lite fallback:** Static tile field with the title accent.
