# Game 23 — Ludo

## Pitch

Five races around the same cross board. Classic keeps four tokens and full capture rules; Sprint shortens the race to two tokens; Hunter ignores star safety and pays more for captures; Steady Pace removes the six bonus but scales every point; Duel is a 1v1 against the hard computer at 1.5×. Twelve achievements and 16 cosmetics extend the race without changing its clear turn rhythm.

## Art direction

Keep the 600×600 cross board: four coloured yards, a fourteen-cell arm per seat, star safe cells, numbered tokens, and a white ring on every piece. Legal picks pulse with the equipped glow, the active seat is framed in the sidebar, and captures and home arrivals use distinct movement cues. Use the game's `#22d3ee` cyan accent for live status, while the front menu keeps its `#f472b6` table identity. Token and board cosmetics must keep all four seats distinguishable; Lite and reduced-motion settings preserve the glow's meaning while reducing pulse animation.

## Modes and match structure

1. **Classic:** four tokens each. Roll a 6 to leave the yard, capture rivals outside safe cells, and bring all four tokens home. Win bonus 1000.
2. **Sprint:** two tokens each; the first pair home wins. Win bonus 600.
3. **Hunter:** only the coloured start cells remain safe — star cells no longer block captures — and each capture pays 150 instead of 120. First three tokens home wins. Win bonus 900.
4. **Steady Pace:** a 6 no longer grants another roll. Every gain is multiplied by 1.2×. Win bonus 1100.
5. **Duel:** a 1v1 against the hard computer at 1.5× score. Win bonus 1400. Locked behind a Classic win, with the menu hint `Win a Classic game to unlock`.

Modes rebuild the token count, home target, seats, and board state. A 6, a capture, or a token reaching home earns another roll except in Steady Pace. Safe cells are stars in every mode except Hunter, where only the coloured start squares are safe. Up to three computers can join, or zero for four local players. Pause suspends CPU turns and preserves the current roll, selection, and token positions.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | Random CPU token choice; 1.0× score. |
| Normal | Weighted CPU that values home, captures, and exits; 1.0× score. |
| Hard | Stronger weighting for home, captures, exits, and safe landings; 1.0× score. |
| Duel | Forces the hard CPU in a 1v1; 1.5× score. |
| Performance | Respect Lite, Standard, and Ultra budgets; the canvas redraws on turn changes and keeps simple vector art. |
| Reduced motion | Reduce the legal-pick pulse and token travel decoration; keep the glow, roll, and capture feedback visible. |
| Audio and palette | Inherit global settings; all cosmetic palettes keep four seats, safe cells, and numbered tokens legible. |

## Scoring

Leaving the yard pays 20, a capture pays 120 (150 in Hunter), and a token reaching home pays 250. Win bonuses are **Classic 1000, Sprint 600, Hunter 900, Steady Pace 1100, and Duel 1400** before multipliers. Steady Pace multiplies every gain by 1.2× and Duel by 1.5×, so Steady Pace pays 300 for a home arrival and 1320 for the win, while a Duel win pays 2100.

## Records

`GameUI.record` writes to save id `ludo`:

- `bestClassicScore, bestSprintScore, bestHunterScore, bestSteadyScore, bestDuelScore`
- `captures, tokensHome, wins, classicWins, sprintWins, hunterWins, steadyWins, duelWins`
- `fewestRolls` (min-merged across wins), plus host `plays, bestScore, secondsPlayed, lastResult, lastMode`

Personal Best unlocks on the first record-breaking finish. Flawless Finish requires a win with no token lost, and Sharpshooter requires three captures in the winning game.

## Cosmetics

16 cosmetics are registered across four slots:

- **Token sets (5):** Classic (default), Pastel, Neon, Jewel, Mono.
- **Boards (4):** Midnight (default), Ivory, Cedar, Graphite.
- **Pick glows (4):** Gold (default), Cyan, Rose, White.
- **Themes (3):** Game Night, Casino Floor, Garden Table.

Token sets repaint every seat; boards repaint the background, frame, yards, track, and stars; glows tint the legal-pick ring; themes replace the page backdrop. Cosmetics never alter movement or capture rules.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| Opening Roll | roll the die | Common |
| Bump | send a rival token back to its yard | Common |
| Home Safe | bring a token all the way home | Common |
| Ludo Champion | win a Classic game | Common |
| Quick Pair | win a Sprint game | Common |
| No Mercy | win a Hunter game | Rare |
| Slow And Sure | win a Steady Pace game | Rare |
| Head To Head | win a Duel against the hard computer | Legendary |
| Triple Six | roll three sixes in a row | Rare |
| Flawless Finish | win without losing a token | Epic |
| Sharpshooter | capture three tokens in one game | Epic |
| Personal Best | set a new best score | Rare |

## Tutorial and controls

The menu carries a four-step interactive tutorial: roll a 6 to leave the yard, earn extra rolls from 6s, captures, and home arrivals, capture rivals outside safe cells, then reach the mode's home target. Controls: Space, Enter, or R rolls; keys 1–4 or a click select a token when several moves are legal; N starts a new game. Local players share the device.

## Current baseline and scope

Canonical page: `23-ludo/index.html` (24.6 KB); save id `ludo`. The page is a single 600×600 canvas with a 52-cell track, four home columns, star safe cells, five modes, one to four seats, three CPU skill levels, a 12-achievement ladder, and 16 cosmetics across four slots. The front menu exposes Play, Modes, Customize, Options, More, and Exit, and hides its toolbar during live play.

The `?test=1` gate exposes `window.LudoTest`: `state`, `modes`, `setMode`, `getMode`, `restart`, `setOpponents`, `setTurn`, `setPositions`, `setCounters`, `turn`, `finish`, `menuPaused`, `start`, `setDifficulty`, `level`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`.

Regression coverage: `scripts/test-game-23.mjs` (`npm run test:game-23`) verifies the Duel lock and unlock, yard rolls, home arrivals, captures, star safety in Classic versus Hunter, the Sprint two-token target, Hunter and Duel payouts, Steady Pace's missing extra roll and 1.2× scoring, all 12 achievement paths, 16 cosmetics, and the chrome-free play view.

## Menu Identity Card

- **Archetype:** table.
- **Mood:** Bring every piece home before the other colours do.
- **Palette:** `#080d15` background, `color-mix(in srgb, #f472b6 8%, rgba(15,22,35,.94))` panel, `#f472b6` accent, `color-mix(in srgb, #f472b6 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `dice-frame` frame and `dice-banner` button identity, using the shared table treatment.
- **Scene recipe:** Original procedural dice mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Modes shown:** Classic, Sprint, Hunter, Steady Pace, Duel (locked until a Classic win).
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Roll, then press 1–4 or click a token; local players share the device.
- **Cosmetics:** 16 items across token sets, boards, pick glows, and themes.
- **Lite fallback:** Static dice composition with the title accent and scene silhouette.
