# Game 27 — Connect Four

## Pitch

A seven-column, six-row drop grid. Gold and Crimson alternate dropping discs and race to build a line — four in Classic and Blitz, three in Triple Threat, five in Marathon. The board is the interface: hover column, drop, win-line flash, done.

## Art direction

A deep-blue board panel with circular sockets, radially shaded discs, and a bright win line drawn across the four (or three, or five) matched discs. Gold discs read warm (amber gradient), Crimson discs read hot (rose gradient). The hovered column lifts a faint disc preview so the drop target is obvious before the click.

Disc skins recolour both players at once, so the two sides must stay distinguishable in every skin: the five sets pair contrasting hues (gold/rose, cyan/violet, lime/magenta, emerald/rose, white/graphite). Win lines use the accent slot and are reinforced by a soft board pulse, so colour is never the only signal. Lite and reduced-motion remove the pulse but keep the lit line.

## Modes and match structure

| Mode | Line length | Clock | Score multiplier | Win bonus |
| --- | --- | --- | --- | --- |
| Classic | 4 | none | 1× | 1,000 |
| Triple Threat | 3 | none | 1.1× | 900 |
| Marathon | 5 | none | 1.2× | 1,100 |
| Blitz | 4 | 1:00 per side | 1.3× | 1,100 |
| Grandmaster | 4 | none | 1.5× | 1,500 |

1. **Classic:** Gold moves first; four across, up, down or diagonally wins.
2. **Triple Threat:** three in a row ends the game quickly, so opening traps matter.
3. **Marathon:** five in a row on the full board; longer build-ups and bigger comebacks.
4. **Blitz:** sixty seconds each. The clock runs only for the side to move and pauses with the menu.
5. **Grandmaster:** locked until one Classic win (`classicWins ≥ 1`). Deeper search, 1.5× score.

If every slot fills with no line the game is a draw. Pause/resume preserves the position, turn, clock and undo history.

## Core rules

- A disc falls to the lowest free slot in the chosen column; full columns reject the drop.
- A line may be horizontal, vertical, or either diagonal.
- Undo removes the last drop (and the computer's reply when applicable) from the saved history.
- The computer searches for immediate wins, blocks, and central control, with depth set by the level select.

## Scoring

| Event | Points |
| --- | --- |
| Drop a disc | 20 |
| Win | Mode bonus from the table above |

The final score is `(human score + win bonus if the human won) × mode multiplier`, rounded. In two-player mode the human seat is Gold and only a Gold win earns the bonus.

## Records and persistence

Saved under `connect-four` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestTripleScore`, `bestMarathonScore`, `bestBlitzScore`, `bestGrandmasterScore`
- `bestScore`, `wins`, `classicWins`, `tripleWins`, `marathonWins`, `blitzWins`, `grandmasterWins`
- `discsDropped`
- `fewestMoves` on a win (drops)
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

## Cosmetics

Sixteen registered cosmetics. IDs use the `c4:` prefix while `gameId` remains `connect-four`:

| Slot | Items |
| --- | --- |
| Skin (discs) | Classic Discs, Ocean Discs, Emerald Discs, Neon Discs, Mono Discs |
| Palette (board) | Classic Blue, Navy Board, Charcoal Board, Violet Board |
| Effect (win line) | White Win Line, Cyan Win Line, Rose Win Line, Lime Win Line |
| Theme (scene) | Night Arcade, Deep Space, Sunset Lounge |

Disc skins rewrite both radial gradients; board skins repaint board, frame and socket fill; accents colour the win line. Theme items only replace the page background.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Drop | Drop a disc. | Common |
| Connected | Win any game. | Common |
| Classic Line | Win a Classic game. | Common |
| Quick Three | Win a Triple Threat game. | Rare |
| Five Alive | Win a Marathon game. | Epic |
| Beat The Clock | Win a Blitz game. | Rare |
| Grandmaster | Win a Grandmaster game. | Legendary |
| Crossed Lines | Win on a diagonal. | Rare |
| Stacked | Win on a vertical line. | Rare |
| Lightning Line | Win within ten discs. | Epic |
| Center Stage | Win with the final disc in the centre column. | Rare |
| Personal Best | Set a new best score. | Rare |

Line-shape badges are checked when the human wins; the centre-column badge reads the final drop.

## Tutorial and controls

Three to four interactive steps teach dropping, blocking, line directions, and the mode rule.

| Input | Action |
| --- | --- |
| Click / tap column | Drop a disc |
| 1 – 7 | Drop in that column |
| ← → then Enter / ↓ | Move the pointer, then drop |
| U | Undo |
| N | New game |
| H / M | Shared help / mute |

The hovered column is highlighted on the board, so the pointer/keyboard target is visible without side-panel text.

## Current baseline and scope

Canonical page: `public/assets/games/27-connect-four/index.html` (22.3 KB). Shared kits: board-kit, menu-bootstrap, menu-kit, meta-kit, meta-config, save-kit, score-bridge, ui-kit, perf-kit, music-kit. Layout: Board DOM grid with a side rail; 16 cosmetics registered across four slots.

`window.ConnectTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setSeat`, `setLevel`, `setDifficulty`, `level`, `setBoard`, `setTurn`, `drop`, `finish`, `setScore`, `setClock`, `tick`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-27.mjs` (`npm run test:game-27`). It covers the five modes and Grandmaster lock, menu actions, a Classic four-in-a-row, Triple and Marathon line lengths, the Blitz clock, the Grandmaster finish, all 16 cosmetics, line-shape achievements, cumulative stats and a chrome-free playing view.

## Menu Identity Card

- **Archetype:** table.
- **Mood:** Drop four in a row before the other side does.
- **Palette:** `#080d15` background, `color-mix(in srgb, #facc15 8%, rgba(15,22,35,.94))` panel, `#facc15` accent, `color-mix(in srgb, #facc15 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** `connect-frame` frame and `connect-banner` button identity, using the shared table treatment.
- **Scene recipe:** Original procedural connect motif with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Table-family major motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Click or tap a column to drop a counter.
- **Lite fallback:** Static connect composition with the title accent and scene silhouette.
