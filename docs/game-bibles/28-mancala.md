# Game 28 — Mancala

## Pitch

Kalah-rules Mancala on a two-row board of six pits and a store per side. Sow stones counter-clockwise, chain extra turns, capture from the pit opposite, and fill your store before the rival does. Five modes change the starting stones, the clock or the finish line without changing the sowing rule.

## Art direction

A warm wooden board with two rows of round pits and a tall store at each end. Amber stones belong to side one, Violet stones to side two. Stones are drawn as shaded beads with a count badge when a pit holds many. The sowing animation hands off one stone at a time, the landing pit pops, and captures lift out before they land in the store.

Counts are always printed, so stacked stones never rely on colour or size alone. Stones slide one pit at a time rather than teleporting, and the status line names the side to move. Lite and reduced-motion shorten the hand-off but keep the order and landing feedback.

## Modes and match structure

| Mode | Stones per pit | Clock | Special rule | Multiplier | Win bonus |
| --- | --- | --- | --- | --- | --- |
| Classic | 4 | none | Standard round; fuller store wins | 1× | 1,000 |
| Blitz | 4 | 1:30 per side | Flag falls, that side loses | 1.1× | 900 |
| Harvest | 6 | none | Larger starting stores to race | 1.2× | 1,100 |
| Sudden Death | 4 | none | First store to 25 stones wins instantly | 1.3× | 1,200 |
| Grandmaster | 4 | none | Deepest sowing search | 1.5× | 1,500 |

1. **Classic:** the round ends when one side's pits are empty; both sides bank remaining stones, then the fuller store wins.
2. **Blitz:** ninety seconds each, running only for the side to move; the clock pauses with the menu.
3. **Harvest:** starts with six stones per pit.
4. **Sudden Death:** the moment a store reaches 25, that side wins immediately.
5. **Grandmaster:** locked until one Classic win (`classicWins ≥ 1`).

Pause/resume preserves the board, clocks, undo history and pending extra turn.

## Core rules

- Pits 1–6 (indices 0–5) plus store 6 belong to Amber; pits 7–12 plus store 13 belong to Violet.
- Sow counter-clockwise, one stone per pit, skipping the rival's store; your own store takes a stone.
- Landing your last stone in your own store grants another turn.
- Landing in an empty pit on your side captures that stone plus every stone in the opposite pit into your store.
- One side having no pit stones ends the round (classic/harvest/blitz); the remaining stones are banked automatically.
- The game reports a draw with `winner == null` and a side win with `winner` 0 or 1, including a side-one win (`0`).

## Scoring

| Event | Points |
| --- | --- |
| Capture stones | 10 per stone captured |
| Extra turn | 20 |
| Win | Mode bonus from the table above |

The final score is `(human score + win bonus if the human won) × mode multiplier`, rounded. In two-player mode the human seat is Amber and only an Amber win earns the bonus.

## Records and persistence

Saved under `mancala` through `Save` / `GameUI.record`:

- `bestClassicScore`, `bestBlitzScore`, `bestHarvestScore`, `bestSuddenScore`, `bestGrandmasterScore`
- `bestScore`, `wins`, `classicWins`, `blitzWins`, `harvestWins`, `suddenWins`, `grandmasterWins`
- `mostCaptured` (best single game), `stonesCaptured`, `movesPlayed`
- `fewestMoves` on a win
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`shutout` and `landslide` are evaluated from the final stores on a human win.

## Cosmetics

Sixteen registered cosmetics, all using the `mancala:` prefix:

| Slot | Items |
| --- | --- |
| Skin (stones) | Classic Stones, Gem Stones, Neon Stones, Pastel Stones, Mono Stones |
| Palette (board) | Teak Board, Slate Board, Walnut Board, Midnight Board |
| Effect (glow) | Amber Glow, Cyan Glow, Rose Glow, Lime Glow |
| Theme (scene) | Night Hearth, Desert Dusk, Dusk Village |

Stone skins recolour the Amber and Violet bead sets together; board skins repaint the timber, pit and frame tones; accents drive capture and extra-turn highlights. Theme items only replace the page background.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Sowing | Sow from a pit. | Common |
| Harvested | Capture stones from a rival pit. | Common |
| Again | Land your last stone in your store. | Common |
| Rich Vein | Capture four or more stones in one move. | Rare |
| Mancala Master | Win a Classic game. | Common |
| Beat The Clock | Win a Blitz game. | Rare |
| Bumper Crop | Win a Harvest game. | Rare |
| Sudden Winner | Win a Sudden Death game. | Epic |
| Grandmaster | Win a Grandmaster game. | Legendary |
| Empty Store | Win with the rival store empty. | Epic |
| Landslide | Win by twenty or more stones. | Rare |
| Personal Best | Set a new best score. | Rare |

## Tutorial and controls

Four interactive steps cover sowing order, the extra turn, captures, and the end of the round.

| Input | Action |
| --- | --- |
| Click / tap | Sow from a highlighted pit |
| 1 – 6 | Sow from your pit 1–6 |
| U | Undo the last move |
| N | New game |
| H / M | Shared help / mute |

Pits with stones are visually active; the board handles selection so no button row is needed.

## Current baseline and scope

Canonical page: `public/assets/games/28-mancala/index.html` (23.8 KB). Shared kits: board-kit, menu-bootstrap, menu-kit, meta-kit, meta-config, save-kit, score-bridge, ui-kit, perf-kit, music-kit. Layout: Board DOM board with two rows of pits and stores; 16 cosmetics registered across four slots. The sowing engine is deterministic and the computer uses an alpha-beta search over simulated sowings.

`window.MancalaTest` exposes: `state`, `modes`, `setMode`, `getMode`, `restart`, `setSeat`, `setLevel`, `setDifficulty`, `level`, `setBoard`, `setTurn`, `play`, `finish`, `setScore`, `setClock`, `tick`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression: `scripts/test-game-28.mjs` (`npm run test:game-28`). It covers the mode list and Grandmaster lock, menu actions, a basic sow, the extra-turn grant, an opposite-pit capture, Classic/Sudden Death/Harvest/Grandmaster finishes, the Blitz clock, all 16 cosmetics, the achievement set, cumulative stats and a chrome-free playing view. The harness resumes the board through `ApexPauseGame(false)` before awaiting an animated move.

## Menu Identity Card

- **Archetype:** table.
- **Mood:** Count the seeds and plan the next turn.
- **Palette:** `#080d15` background, `color-mix(in srgb, #a3e635 8%, rgba(15,22,35,.94))` panel, `#a3e635` accent, `color-mix(in srgb, #a3e635 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** `seeds-frame` frame and `seeds-banner` button identity, using the shared table treatment.
- **Scene recipe:** Original procedural seeds motif with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Table-family major motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Click or tap one of your bowls to move its seeds.
- **Lite fallback:** Static seeds composition with the title accent and scene silhouette.
