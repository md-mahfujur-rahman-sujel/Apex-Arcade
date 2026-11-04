# Game 24 — Carrom

## Pitch

A physics carrom table with a draggable striker, pocketed coins, queen cover rules, and a hard computer. Five boards change the coin count and objective: Classic, Quick Five, Queen Rush, Sudden Death, and Grandmaster. Twelve achievements and 16 cosmetics reward clean striking without altering the table physics.

## Art direction

Keep the 640×640 table: a grained wooden surface, red baseline circles, four corner pockets, pale and dark coins, and a pink queen. The striker carries a two-tone gradient, the aim line is dashed, and the equipped trail colour marks the shot path and striker rim. Use the game's `#f59e0b` accent for live status, while the front menu keeps its `#d6b98c` table identity. Every board palette keeps light coins, dark coins, the queen, pockets, and baseline marks distinct; Lite and reduced-motion settings reduce decorative travel effects without hiding the physics.

## Modes and match structure

1. **Classic:** nine coins each plus the queen. Pocket every own coin and legally cover the queen to win. Win bonus 1000.
2. **Quick Five:** five coins each and no queen. A short duel; win bonus 600.
3. **Queen Rush:** the first player to legally cover the queen wins immediately. Pays 1.1× score and a 800 bonus.
4. **Sudden Death:** three coins each and no queen. A foul returns a coin and passes the turn, so one bad shot can decide the board. Pays 1.2× score and a 700 bonus.
5. **Grandmaster:** the full nine-coin board against the hard computer, paying 1.5× score and a 1400 bonus. Locked behind a Classic win, with the menu hint `Win a Classic game to unlock`.

A pocketed own coin earns another shot; pocketing a rival coin counts for the rival and passes the turn. The queen must be covered by pocketing one of your coins in the same shot, or after all your coins are already down. A foul — pocketing the striker — costs 50 points, returns one of your pocketed coins when available, and passes the turn. Modes rebuild the board, coin counts, and queen presence. The computer can be the opponent or both sides can be local.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | Computer samples the first few candidate shots with wide aim noise; 1.0× score. |
| Normal | Computer evaluates ten candidate shots with light noise; 1.0× score. |
| Hard | Computer evaluates twenty-six candidates with tighter aim; 1.0× score. |
| Grandmaster | Forces the hard search and 1.5× score; unlocked by a Classic win. |
| Performance | Respect Lite, Standard, and Ultra budgets; the 240 Hz physics step caps catch-up at 50 ms. |
| Reduced motion | Keep the aim line, motion, and pocket feedback; avoid extra decorative flashes. |
| Audio and palette | Inherit global settings; every board keeps coin colours, the queen, pockets, and baselines legible. |

## Scoring

Pocketing one of your coins pays 100 and covering the queen pays 300. A foul subtracts 50 and returns a coin. Mode multipliers scale every gain: **Classic ×1, Quick Five ×1, Queen Rush ×1.1, Sudden Death ×1.2, and Grandmaster ×1.5**. Completion bonuses are 1000, 600, 800, 700, and 1400 respectively, so Grandmaster clears at 3900 in the deterministic test line.

## Records

`GameUI.record` writes to save id `carrom`:

- `bestClassicScore, bestQuickScore, bestQueenScore, bestSuddenScore, bestGrandmasterScore`
- `coinsPocketed, shots, wins, classicWins, quickWins, queenWins, suddenWins, grandmasterWins, queensCovered`
- `fewestShots` (min-merged across wins), plus host `plays, bestScore, secondsPlayed, lastResult, lastMode`

Personal Best unlocks on the first record-breaking finish. Clean Sweep requires a win without a foul.

## Cosmetics

16 cosmetics are registered across four slots:

- **Strikers (5):** Ice (default), Onyx, Rose, Jade, Gold.
- **Boards (4):** Teak (default), Maple, Walnut, Slate.
- **Aim trails (4):** Cyan (default), Gold, Rose, Violet.
- **Themes (3):** Lamplit Room, Night Parlour, Sunset Club.

Striker skins repaint the gradient and rim; boards repaint the surface, grain, lines, pockets, frame, and all coin tones; trails tint the aim line and striker edge; themes replace the page backdrop. Cosmetics never alter friction, pocket size, or aim physics.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Flick | take your first shot | Common |
| Pocketed | pocket one of your own coins | Common |
| Queen Covered | legally cover the queen | Rare |
| Carrom Champion | win a Classic game | Common |
| Five Alive | win a Quick Five game | Common |
| Queen Rush | win a Queen Rush game | Rare |
| Sudden Winner | win a Sudden Death game | Rare |
| Grandmaster | win a Grandmaster game | Legendary |
| Double Pot | pocket two coins in one shot | Rare |
| Triple Pot | pocket three coins in one shot | Epic |
| Clean Sweep | win without a foul | Epic |
| Personal Best | set a new best score | Rare |

## Tutorial and controls

The menu carries a four-step interactive tutorial: slide the striker along the baseline, drag back and release to flick, pocket an own coin for another shot, then cover the queen in the same shot. Controls: drag the striker or the position slider, release to shoot; N starts a new game; the side selector switches between the computer and local two-player play.

## Current baseline and scope

Canonical page: `24-carrom/index.html` (30.1 KB); save id `carrom`. The page is a single 640×640 canvas with a deterministic 240 Hz physics step, 9/5/3-coin board configurations, queen cover and foul rules, five modes, three computer search levels, a 12-achievement ladder, and 16 cosmetics across four slots. The front menu exposes Play, Modes, Customize, Options, More, and Exit, and hides its toolbar during live play.

The `?test=1` gate exposes `window.CarromTest`: `state`, `modes`, `setMode`, `getMode`, `restart`, `setSide`, `setTurn`, `setStriker`, `discs`, `simulate`, `settle`, `finish`, `award`, `setDifficulty`, `level`, `setLevel`, `menuPaused`, `start`, `colors`, `cosmetic`, `cosmeticList`, `achievements`, `stats`, `modalOpen`, `closeModal`. `settle` deactivates the matching real discs before resolving, so injected pocket events never duplicate the queen.

Regression coverage: `scripts/test-game-24.mjs` (`npm run test:game-24`) verifies the Grandmaster lock, the Classic pocket/queen/foul/turn sequence, Quick Five, Queen Rush's immediate win, Sudden Death's perfect clear, the Grandmaster payout, all 12 achievement paths, 16 cosmetics, accumulated stats, and the chrome-free play view.

## Menu Identity Card

- **Archetype:** table.
- **Mood:** Line up the striker and pocket your colour.
- **Palette:** `#080d15` background, `color-mix(in srgb, #d6b98c 8%, rgba(15,22,35,.94))` panel, `#d6b98c` accent, `color-mix(in srgb, #d6b98c 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `striker-frame` frame and `striker-banner` button identity, using the shared table treatment.
- **Scene recipe:** Original procedural striker mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Modes shown:** Classic, Quick Five, Queen Rush, Sudden Death, Grandmaster (locked until a Classic win).
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Drag back from the striker and release to shoot; the slider repositions the striker.
- **Cosmetics:** 16 items across strikers, boards, aim trails, and themes.
- **Lite fallback:** Static striker composition with the title accent and scene silhouette.
