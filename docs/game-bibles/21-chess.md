# Game 21 — Chess

## Pitch

A complete chess rules engine with legal-move highlights, checkmate, stalemate, castling, en passant, promotion, and draw detection. Five modes stretch the same readable board: Classic against three engine levels, a five-minute Blitz, a mating Endgame Lab, a five-board Puzzle Sprint, and the deeper Grandmaster. Persistent records, 13 achievements, and 16 cosmetics reward play without changing the rules.

## Art direction

Keep the canonical ivory-and-ebony glyphs on a warm walnut board: light `#e9dcc3`, dark `#a9805a`, and a `#2a2f45` frame. Legal targets use green dots, selection uses a cyan inset ring, the last move uses an amber wash, and check uses a red radial halo, so no state relies on colour alone. The game's routine accent is `#f59e0b` while the front menu keeps its `#d6b98c` table identity. Lite and reduced-motion modes remove decorative glow and transition motion without removing move, check, or capture feedback. Cosmetic piece and board palettes must keep both sides distinguishable.

## Modes and match structure

1. **Classic:** a full game against the computer at Easy, Medium, or Hard depth, or two players on one board. Checkmate pays 800 plus move bonuses.
2. **Blitz:** five minutes per side. The clock starts on each side's first move; a flag ends the game immediately. A win pays 1000 plus the winner's remaining seconds.
3. **Endgame Lab:** king and queen versus king from a fixed position. Mate within 30 moves; the payout is 600 plus 20 per unused move. An inside-20 mate unlocks Endgame Technique.
4. **Puzzle Sprint:** five mate-in-one boards — Back rank, Corner net, Royal escort, Smothered, and Rank sweep. Each solve pays 300 plus the check bonus, a miss is counted, and a clean sweep adds 300 and unlocks First Try.
5. **Grandmaster:** the same board against a depth-4 engine with no move noise, paying 1.5× score. Locked behind a Classic win, with the menu hint `Win a Classic game to unlock`.

Every mode resets score, clocks, puzzles, and move history through `newGame`. Pause keeps the in-progress position and clock; the Blitz clock only runs while the board is actively playing. Puzzles and the Endgame Lab always play White and disable side selection and undo.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | Depth-1 engine with wide move noise; 1.0× score. |
| Medium | Depth-2 engine with light move noise; 1.0× score. |
| Hard | Depth-3 engine with no move noise; 1.0× score. |
| Grandmaster | Depth-4 engine, no noise, 1.5× score; unlocked by a Classic win. |
| Performance | Respect Lite, Standard, and Ultra budgets; the DOM board repaints only on state change. |
| Reduced motion | Remove decorative transitions; keep selection, legal-target, check, and capture feedback. |
| Audio and palette | Inherit global settings; cosmetic piece and board palettes keep both sides legible. |

## Scoring

Move bonuses: captures pay the piece value ÷ 10 (pawn 10 through queen 90), check +10, castling +20, and promotion +50. Draws pay 100. Completion bonuses are **Classic 800, Blitz 1000 + remaining seconds, Endgame Lab 600 + 20 per unused move, Puzzle Sprint 300 per solve + 300 for a perfect sweep, and Grandmaster 1500**. The Grandmaster multiplier scales every gain by 1.5×, so the standard mate-in-one test finishes at 810 in Classic and 2265 in Grandmaster.

## Records

`GameUI.record` writes to save id `chess`:

- `plays, bestScore, secondsPlayed, lastResult, lastMode`
- `bestClassicScore, bestBlitzScore, bestEndgameLabScore, bestPuzzleSprintScore, bestGrandmasterScore`
- `wins, classicWins, blitzWins, endgameWins, grandmasterWins, puzzlesSolved, fastestMate`

`fastestMate` is min-merged across wins, and `bestScore` is also mirrored by the host bridge. Personal Best unlocks on the first record-breaking finish.

## Cosmetics

16 cosmetics are registered across four slots:

- **Piece skins (5):** `pieces-ivory` (default), `pieces-midnight`, `pieces-jade`, `pieces-rose`, `pieces-neon`.
- **Boards (4):** `board-walnut` (default), `board-slate`, `board-emerald`, `board-royal`.
- **Last-move glows (4):** `glow-amber` (default), `glow-cyan`, `glow-rose`, `glow-gold`.
- **Themes (3):** `theme-classic`, `theme-royal`, `theme-coffee`.

Piece skins repaint both sides; boards repaint light, dark, and frame tiles; glows tint the last-move wash; themes replace the page backdrop. Cosmetics never change legal moves or engine strength.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| Opening Move | make your first move | Common |
| First Blood | checkmate the computer | Common |
| Safe King | castle in a game | Common |
| Crowned | promote a pawn | Common |
| Sneaky Capture | capture en passant | Rare |
| Quick Study | win Classic in 20 moves or fewer | Rare |
| Beat The Clock | win a Blitz game | Rare |
| Time To Spare | win Blitz with two minutes left | Epic |
| Puzzle Master | solve all five puzzle boards | Rare |
| First Try | solve the sprint with no misses | Epic |
| Endgame Technique | mate the lab inside 20 moves | Epic |
| Grandmaster Slayer | beat the Grandmaster engine | Legendary |
| Personal Best | set a new best score | Rare |

Unlock each once under the `chess` id and send one achievement event and toast.

## Tutorial and controls

The menu carries a four-step interactive tutorial: select a piece and click a highlighted square, castle and promote normally, watch the Blitz clock, then find mate in one across the puzzle sprint. Controls: click or tap to select and move, U undo, F flip, T hint, N new game, H/M help or mute.

Support keyboard and touch. The board keeps large tap targets, a visible selected square, and a legal-target overlay. The shared menu supports gamepad focus and activation.

## Current baseline and scope

Canonical page: `21-chess/index.html` (38.4 KB); save id `chess`. The page is a single 8×8 DOM grid with a full rules engine, three search levels, a depth-4 Grandmaster, five modes, five authored mate-in-one puzzles, a 13-achievement ladder, and 16 cosmetic catalog items across four slots. The front menu exposes Play, Modes, Customize, Options, More, and Exit, and hides its toolbar during live play.

The `?test=1` gate exposes `window.ChessTest`: `state`, `modes`, `setMode`, `getMode`, `restart`, `setSide`, `setLevel`, `setDifficulty`, `level`, `award`, `legal`, `play`, `fen`, `setFen`, `grid`, `moves`, `clock`, `tick`, `flag`, `solvePuzzle`, `failPuzzle`, `setPuzzle`, `advancePuzzle`, `puzzleNames`, `puzzleFens`, `undo`, `hint`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`, `isHumanTurn`.

Regression coverage: `scripts/test-game-21.mjs` (`npm run test:game-21`) verifies the Grandmaster lock, Classic mate and records, all five puzzle boards with a miss, the Endgame Lab inside-20 payout, Blitz timeout and full-clock win, the Grandmaster 1.5× payout and unlock, all 13 achievement paths reached by the run, the 16 cosmetics and their colour mapping, aggregated stats, and the chrome-free play view.

## Menu Identity Card

- **Archetype:** table.
- **Mood:** Plan the next move across a warm walnut board.
- **Palette:** `#080d15` background, `color-mix(in srgb, #d6b98c 8%, rgba(15,22,35,.94))` panel, `#d6b98c` accent, `color-mix(in srgb, #d6b98c 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `chess-frame` frame and `chess-banner` button identity, using the shared table treatment.
- **Scene recipe:** Original procedural chess mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Modes shown:** Classic, Blitz, Endgame Lab, Puzzle Sprint, Grandmaster (locked until a Classic win).
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Click or tap a piece, then choose a legal square; U undo, F flip, T hint.
- **Cosmetics:** 16 items across piece skins, boards, last-move glows, and themes.
- **Lite fallback:** Static chess composition with the title accent and scene silhouette.
