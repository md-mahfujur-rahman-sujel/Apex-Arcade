# Game 22 — Snakes & Ladders

## Pitch

Race four tokens to square 100 across a hand-drawn canvas board. Five modes change the board and the dice: Classic, a short Quick Dash, two-dice Twin Dice, a relocating Chaos Board, and a three-lap Marathon. Every mode shares the same readable ladder-and-snake language, with 13 achievements and 16 cosmetics layered on top.

## Art direction

Keep the 600×650 night board: alternating tinted squares, numbered cells, a gold finish tile, chain ladders, and Bezier snakes with eyes and forked tongues. Four tokens carry white rings so they stay visible on every board palette. Use the game's `#22d3ee` cyan accent for live status and legal-input feedback, while the front menu keeps its `#fb923c` storybook identity. Easy, Normal, and Hard change snake landings, not the art. Cosmetic boards and snake sets must keep heads, tails, tokens, and numbers distinguishable without relying on colour alone; Lite and reduced-motion settings remove decorative motion while preserving board state.

## Modes and match structure

1. **Classic:** the printed board. Roll one die, move, and land exactly on 100 to win. A 6 earns another roll. Win bonus 800.
2. **Quick Dash:** everyone starts on square 24 and races to an exact 100. Win bonus 600.
3. **Twin Dice:** roll two dice and add them; any double earns another roll, and only an exact 100 wins. Win bonus 900.
4. **Chaos Board:** after a ladder or snake is used, it relocates to a new unused start and target. The board always keeps the same number of ladders and snakes. Pays 1.3× score.
5. **Marathon:** three laps of the board with no exact-finish rule. Each completed lap before the last pays 400; finishing lap three wins. Pays 1.5× score. Locked behind a Classic win, with the menu hint `Win a Classic game to unlock`.

A mode change rebuilds the board, tokens, scores, and turn order. One to three computers can join; local play supports two to four people. Easy sends a snake victim to the midpoint between head and tail, Normal uses the printed landing, and Hard drops five squares lower. Pause suspends CPU turns and resumes the same state.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | Snake landings move to the midpoint between head and tail; 1.0× score. |
| Normal | Printed snake landings; 1.0× score. |
| Hard | Snake landings drop five extra squares; 1.0× score. |
| Players | You vs 1–3 computers, or 2–4 local players. |
| Performance | Respect Lite, Standard, and Ultra budgets; the canvas redraws on state change and keeps simple vector art. |
| Reduced motion | Remove die-shake and token-glide decoration where possible; keep square, ladder, and snake outcomes readable. |
| Audio and palette | Inherit global settings; every cosmetic keeps tokens, snakes, numbers, and the finish tile legible. |

## Scoring

Ladders pay 40, and each completed Marathon lap before the last pays 400. Mode multipliers apply to every gain: **Classic ×1, Quick Dash ×1, Twin Dice ×1, Chaos Board ×1.3, and Marathon ×1.5**. Win bonuses are 800, 600, 900, 900, and 1200 before the multiplier, so Marathon finishes at 1800 and Chaos at 1170. Snakes never subtract score.

## Records

`GameUI.record` writes to save id `snakes-ladders`:

- `bestClassicScore, bestQuickScore, bestTwinScore, bestChaosScore, bestMarathonScore`
- `rolls, laddersClimbed, snakesSlid, wins, classicWins, quickWins, twinWins, chaosWins, marathonWins`
- `fewestRolls` (min-merged across wins), plus host `plays, bestScore, secondsPlayed, lastResult, lastMode`

Personal Best unlocks on the first record-breaking finish. CPU and local games both record the human seat's score.

## Cosmetics

16 cosmetics are registered across four slots:

- **Token sets (5):** Ember (default), Ocean, Candy, Mono, Neon.
- **Boards (4):** Midnight (default), Paper, Forest, Sunset.
- **Snake sets (4):** Classic (default), Neon, Pastel, Mono.
- **Themes (3):** Game Night, Dusk Parlor, Jungle Trail.

Token sets repaint all four tokens; boards repaint tiles, finish, grid, bar, and frame; snake sets recolour all ten snakes; themes replace the page backdrop. Ladder colours stay warm so they remain distinct from snakes.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Roll | roll the die in any mode | Common |
| Up We Go | climb a ladder | Common |
| Down We Go | land on a snake | Common |
| Classic Finish | win a Classic game | Common |
| Quick Dash | win a Quick Dash game | Common |
| Double Trouble | win a Twin Dice game | Rare |
| Chaos Tamer | win a Chaos Board game | Rare |
| Marathoner | win a Marathon game | Epic |
| Six Streak | roll three sixes in a row | Rare |
| Clean Climb | win without landing on a snake | Rare |
| Right On The Dot | win by rolling the exact number | Rare |
| From The Back | win after sitting on square 10 or lower | Epic |
| Personal Best | set a new best score | Rare |

## Tutorial and controls

The menu carries a four-step interactive tutorial: roll and move, use ladders and avoid snakes, land exactly on 100, then try two-dice doubles. Controls: Space, Enter, or R rolls; the Roll button works on touch; N starts a new game; H/M toggle help or mute. Local players pass the device between turns.

## Current baseline and scope

Canonical page: `22-snakes-ladders/index.html` (26.4 KB); save id `snakes-ladders`. The page is a single 600×650 canvas with nine ladders, ten snakes, five modes, two to four players, CPU opponents, a 13-achievement ladder, and 16 cosmetics across four slots. The first ladder reaches the finish tile, so exact-finish and no-snake paths remain achievable.

The `?test=1` gate exposes `window.SnakesTest`: `state`, `modes`, `setMode`, `getMode`, `restart`, `setPlayers`, `setPos`, `setTurn`, `board`, `turn`, `finish`, `award`, `roll`, `menuPaused`, `start`, `setDie`, `setDifficulty`, `level`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression coverage: `scripts/test-game-22.mjs` (`npm run test:game-22`) verifies the Marathon lock and unlock, exact-finish wins in Classic and Quick Dash, Twin Dice doubles, Chaos relocation and 1.3× scoring, the three-lap Marathon payout, snake landings and difficulty shifts, the dual-roll records, all 13 achievements reached by the run, 16 cosmetics, and the chrome-free play view.

## Menu Identity Card

- **Archetype:** storybook.
- **Mood:** Roll forward and see where the board takes you.
- **Palette:** `#080d15` background, `color-mix(in srgb, #fb923c 8%, rgba(15,22,35,.94))` panel, `#fb923c` accent, `color-mix(in srgb, #fb923c 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `track-frame` frame and `track-banner` button identity, using the shared storybook treatment.
- **Scene recipe:** Original procedural board-track mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Modes shown:** Classic, Quick Dash, Twin Dice, Chaos Board, Marathon (locked until a Classic win).
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options; player count lives on the board sidebar.
- **Controls:** Space/Enter/R or the Roll button; N restarts; local players share the device.
- **Cosmetics:** 16 items across token sets, boards, snake sets, and themes.
- **Lite fallback:** Static board-track composition with the title accent and scene silhouette.
