# Game 43 — Sudoku

## Pitch

A full 9×9 Sudoku with guaranteed unique solutions, pencil notes, conflict checking, hints and undo. Classic builds a 32-clue grid, Blitz races a five-minute clock, Zen removes the clock and the hint limit, Diagonal adds both main diagonals to the rules, and Expert drops to 26 clues with no hints and a three-mistake limit. Every finished run banks a score, per-mode records and achievements.

## Art direction

A dark slate board with nine 3×3 boxes separated by brighter rules. The given digits use the `sudoku:ink-*` skin, the board uses `sudoku:paper-*`, the selected cell uses `sudoku:glow-*` and the frame/accent uses `sudoku:frame-*`. Selected cells highlight their row, column and box; conflicting entries turn red; the hint cell pulses amber. Lite and reduced-motion settings keep the grid and drop decorative motion.

## Modes and match structure

| Mode | Clues | Clock | Hints | Mistake limit | Diagonal | Score base |
| --- | --- | --- | --- | --- | --- | --- |
| Classic | 32 | none | 3 | none | no | 1000 |
| Blitz | 32 | 5:00 | 3 | none | no | 800 + remaining time |
| Zen | 40 | none | unlimited | none | no | 600 flat |
| Diagonal | 32 | none | 3 | none | yes | 1200 |
| Expert | 26 | none | 0 | 3 | no | 1500 |

1. **Classic:** the baseline three-hint grid and the unlock gate.
2. **Blitz:** a five-minute race; the run ends at zero and records a loss.
3. **Zen:** more clues, no clock and unlimited hints for a relaxed solve.
4. **Diagonal:** locked until a Classic win; both main diagonals must also contain 1–9.
5. **Expert:** locked until a Classic win; 26 clues, no hints, and the third mistake ends the run.

A mode change generates a fresh puzzle and resets the clock, mistakes, hints and undo history.

## Core rules

- Selecting a cell and pressing 1–9 places a digit; pressing the same digit again removes it.
- Notes mode toggles candidate marks per cell; placing a real digit clears that cell's notes.
- Every placement is checked against the row, column, box and (in Diagonal) both diagonals.
- A wrong digit counts as a mistake but stays on the board until corrected; Expert ends at three.
- Hints reveal the correct digit for the selected (or first empty) cell and consume the mode's allowance.
- Undo restores the previous board, notes and mistake count.
- The puzzle is solved when every cell matches the generated solution.

## Scoring

Classic pays `1000 + max(0, 600 − 2 × seconds)`; Diagonal `1200 + max(0, 600 − 2 × seconds)`; Expert `1500 + max(0, 900 − 2 × seconds)`; Zen a flat 600; Blitz `800 + 4 × remaining seconds`. Every mode then subtracts 50 per mistake (100 in Expert) and 80 per hint, with a floor of 100. A loss scores zero.

## Records and persistence

Saved under `sudoku`:

- `bestScore`, `bestScoreClassic`, `bestScoreBlitz`, `bestScoreZen`, `bestScoreDiagonal`, `bestScoreExpert`
- `bestTimeClassic`, `bestTimeZen`, `bestTimeDiagonal`, `bestTimeExpert` (seconds; Blitz has no time record)
- `wins`, `losses`, `solves`, `mistakes`, `hints`
- `hintFree`, `perfect`
- `classicWins`, `blitzWins`, `zenWins`, `diagonalWins`, `expertWins`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`bestTime*` uses the minimum merge and only records wins.

## Cosmetics

Sixteen registered cosmetics using the `sudoku:` prefix:

| Slot | Items |
| --- | --- |
| Skin (digits) | Classic, Ember, Jade, Ice, Violet |
| Palette (paper) | Slate, Night, Indigo, Mono |
| Effect (selection) | Cyan, Amber, Lime, Rose |
| Theme (frame) | Slate, Rose, Mint |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Solve | complete any puzzle | Common |
| Flawless Grid | solve without a mistake | Rare |
| Quick Logic | solve in under five minutes | Rare |
| Unaided | solve without a hint | Rare |
| Blitz Solver | win a Blitz puzzle | Rare |
| Zen Solver | complete a Zen puzzle | Common |
| Diagonal Adept | solve a Diagonal puzzle | Epic |
| Grid Expert | solve an Expert puzzle | Epic |
| Marathon | solve a puzzle with 26 or fewer clues | Epic |
| Triple Crown | win three puzzles | Rare |
| Ten Wins | win ten puzzles | Epic |
| Complete Solver | win in every mode | Legendary |

## Tutorial and controls

The interactive tutorial covers cell selection, digit entry, notes, conflicts, hints and the mode modifiers. Controls: click or arrow to a cell; 1–9 places a digit (or toggles a note in Notes mode); Backspace/0 erases; Space/P toggles Notes; U undoes; T hints; N generates a new puzzle; H/M toggle help and mute. The HUD shows the modes, clues, mistakes left, hint count and clock where relevant.

## Menu Identity Card

- **Archetype:** neon logic grid.
- **Mood:** quiet deduction under a soft glow.
- **Palette:** `#151926` paper, `#7dd3fc` ink accent, amber hint pulse.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `paper-*` board and `frame-*` identity.
- **Scene recipe:** Nine 3×3 boxes with peer highlights and a selected-cell glow; static in Lite and reduced-motion modes.
- **Music and UI sounds:** Per-title procedural motif; place, error, hint and win cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Controls:** Click/arrows + 1–9; Space notes; U undo; T hint; N new puzzle.
- **Lite fallback:** Static grid with the title accent.
