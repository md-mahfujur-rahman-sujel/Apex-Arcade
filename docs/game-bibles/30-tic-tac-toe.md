# Game 30 — Tic-Tac-Toe

## Pitch

A quick-play cafe challenge. Classic 3×3 stays approachable; Four in a Row, Ultimate, Blitz and Grandmaster add length, routing, a clock and a perfect opponent. Five AI strengths sit under the chosen mode so difficulty and match length are separate decisions.

## Art direction

Dark slate and cyan X marks against warm amber O marks. The board sits on a softly lit cafe table: thin cell lines, contact shadow, upper-left highlight, and a paper score sheet in the menu scene. Marks are crisp strokes, not glassy discs. Placement uses a short pop, the win line gets one gentle pulse, and a small spark celebration closes a win.

Ultimate shows nine small boards with clear sub-grid edges; closed boards carry the winning mark faintly and the forced board gets a visible outline. The menu card keeps the paper-and-ink identity from the original brief: slate backdrop, notebook rules, timber tabletop, ruled score sheet, pencil prop. Lite and reduced motion keep marks, the win line and the forced-board outline while dropping grain and particles.

## Modes and match structure

| Mode | Format | Clock | Score multiplier | Win bonus |
| --- | --- | --- | --- | --- |
| Classic 3×3 | 3×3, three in a row | none | 1× | 200 |
| Four in a Row | 4×4, four in a row | none | 1.2× | 320 |
| Ultimate | nine linked 3×3 boards | none | 1.3× | 500 |
| Blitz | 3×3 | 1:00 per side | 1.4× | 260 |
| Grandmaster | 3×3 vs the perfect search | none | 1.5× | 400 |

1. **Classic 3×3:** X moves first by default; three in a row wins. The seat selector swaps X/O or starts a two-player match.
2. **Four in a Row:** a 4×4 grid needs four marks on any row, column or diagonal.
3. **Ultimate:** each move sends the rival to the matching small board; a closed board grants a free choice. Win small boards to claim the big one.
4. **Blitz:** sixty seconds each; the clock pauses with the menu and a flag loses the match.
5. **Grandmaster:** locked until one Classic win (`classicWins ≥ 1`); the search is always at full strength regardless of the manual level selector.

A draw records half the mode's win bonus before the multiplier. Pause/resume preserves the board, forced board, clock and undo history; a new game clears all of them.

## Core rules

- Marks alternate; a legal move is an empty cell (and, in Ultimate, inside the forced board).
- A win is three (classic/ultimate) or four (four-in-a-row) in a line.
- If the board fills with no line the match is a draw.
- In Ultimate, winning a small board does not always end the match; three small boards in a line wins the big board.
- Undo removes the human move and the computer reply where both were stored.

## Scoring

| Event | Points |
| --- | --- |
| Place a mark | 10 per own mark |
| Win | Mode bonus from the table above |
| Draw | Half the mode's win bonus |

The final score is `(human marks + bonus) × mode multiplier`, rounded. Only the human seat's marks are scored; in two-player mode the human is X and only an X win earns the full bonus.

## Records and persistence

Saved under `tic-tac-toe` through `Save` / `GameUI.record`, plus a legacy aggregate:

- `bestClassicScore`, `bestFourScore`, `bestUltimateScore`, `bestBlitzScore`, `bestGrandmasterScore`
- `bestScore`, `bestStreak`, `wins`, `draws`, `classicWins`, `fourWins`, `ultimateWins`, `blitzWins`, `grandmasterWins`
- `marksPlaced`
- `fewestMoves` on a win
- `stats.ticTacToe`: `x`, `o`, `wins`, `losses`, `draws`, `streak`, `bestStreak`, `rounds`, `lastResult`, `lastMode`

The custom menu Statistics screen reads the legacy `ticTacToe` record. `Reset score` clears the visible scoreboard tally without deleting lifetime match history.

## Cosmetics

Sixteen registered cosmetics using the `tic-tac-toe:` prefix:

| Slot | Items |
| --- | --- |
| Skin (marks) | Cool Marks, Neon Marks, Gold Marks, Ice Marks, Mono Marks |
| Palette (board) | Slate Board, Ink Board, Paper Board, Plum Board |
| Effect (hints) | Cyan Hints, Amber Hints, Rose Hints, Lime Hints |
| Theme (scene) | Cafe Night, Dusk Notebook, Forest Sketch |

Mark skins rewrite the X and O colours together; board skins repaint panel, line, background and hover colours; accents drive hints, focus and the forced-board outline. Theme items only replace the page background.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| Opening Mark | Place a mark. | Common |
| First Line | Win your first game. | Common |
| Corner Start | Open on a corner square. | Common |
| Classic Winner | Win a Classic game. | Common |
| Four Across | Win a Four in a Row game. | Rare |
| Ultimate Strategist | Win an Ultimate game. | Epic |
| Beat The Clock | Win a Blitz game. | Rare |
| Grandmaster | Win a Grandmaster game. | Legendary |
| Clean Sweep | Win without facing a threat. | Rare |
| Comeback | Win after facing a threat. | Epic |
| Perfect Defense | Draw against the perfect computer. | Epic |
| Personal Best | Set a new best score. | Rare |

`comeback` and `clean-sweep` are mutually exclusive per win. `perfect-defense` requires a draw against a full-strength search, not merely a draw on Grandmaster.

## Menu and controls

The game mounts its own menu (items: Play, Modes, Customize, Options, About, Stats, Exit) with a custom Modes screen and a Statistics view backed by the legacy record.

| Input | Action |
| --- | --- |
| Click / tap | Place a mark |
| 1 – 9 | Place on the printed numpad layout |
| Escape | Pause / resume |
| U | Undo |
| N | New game |
| H / M | Shared help / mute |
| Hint | Easy difficulty only, when no manual level overrides the contract |

The board prints the numpad digits on Classic so keyboard play needs no legend. The side rail carries status, seat/level selects and New game / Pause / Undo / Hint / Statistics / Reset score; the playing grid stays unobstructed.

## Current baseline and scope

Canonical page: `public/assets/games/30-tic-tac-toe/index.html` (50.4 KB). Shared kits: board-kit, menu-kit, menu-bootstrap, meta-kit, meta-config, save-kit, score-bridge, ui-kit, perf-kit, music-kit, board-art. Layout: Board DOM grid that rebuilds for 3×3, 4×4 or 9×9; 16 cosmetics registered across four slots. The CPU uses minimax with alpha-beta pruning and a depth cap per strength.

`window.TicTacToeTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setFormat`, `setSeat`, `setLevel`, `setLevelAuto`, `setDifficulty`, `level`, `setBoard`, `setTurn`, `play`, `finish`, `setScore`, `setClock`, `tick`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-30.mjs` (`npm run test:game-30`). It covers the mode list and Grandmaster lock, the custom menu items, Classic and 4×4 wins, Ultimate routing across three moves, the Blitz clock, the Grandmaster finish, all 16 cosmetics, the legacy tally, cumulative stats and a chrome-free playing view.

## Menu Identity Card

- **Archetype:** Paper and Ink.
- **Mood:** A friendly late-evening cafe table where a pencil-drawn challenge is waiting; tactile and calm, with clear contrast between the two marks.
- **Palette:** bg `#111923`; panel `#172630`; accent `#67e8f9`; button `#f3dfb5`; buttonText `#18242b`; text `#f5f7fa`. Cyan X and warm amber O remain the game's identity colors.
- **Type:** `system-ui` for title and body; `ui-monospace` for match details. Pencil character comes from CSS strokes, not a third font dependency.
- **Frame and buttons:** Thin notebook-rule frame with softly rounded paper corners, a graphite edge, and compact paper banner buttons with pencil-underlined labels. Focus uses a strong cyan outline.
- **Scene recipe (back to front):** Deep slate cafe backdrop; a softly lit timber tabletop; one lightly ruled score sheet; a crisp 3×3 grid with cyan X and amber O; a small pencil resting outside the menu panel.
- **Music and UI sounds:** Quiet room tone with warm felt-piano notes; dry pencil tap on hover, light wooden tick on placement, soft paper brush on Back.
- **Menu items:** Play, Modes, Customize, Options, About, Stats, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options; starting mark and AI strength live in-game.
- **Lite fallback:** Static slate-and-paper tabletop with a still board; no grain animation, glow, or decorative particles.
