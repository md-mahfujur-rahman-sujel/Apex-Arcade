# Game 41 — Soccer Pool

## Pitch

Flick-and-score table football on a floodlit pitch. Drag back from one of four cyan discs and release to flick it at the ball; discs and ball bank off the cushions, and the ball must cross the amber goal mouth on the right. The rival answers with its own discs and attacks the left goal. Five modes change the target, the clock, the power and the rival's accuracy, and every finished match banks a score, records and achievements.

## Art direction

A dark stadium sky over a striped pitch with white markings, two goals and the four-disc formation mirrored on each half. The ball palette comes from `soccer:ball-*`, the pitch from `soccer:pitch-*`, the aim guide from `soccer:aim-*` and the sky from `soccer:sky-*`. Goals trigger confetti, a ring, a net flash and a screen flash. Discs and ball leave short trails while moving; Lite and reduced-motion settings keep the playfield and drop decorative shake.

## Modes and match structure

| Mode | First to | Clock | Score multiplier | Flick power | Cushion bounce | Rival noise | Aim guide |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Classic Match | 5 | none | 1× | 1.0 | 1.0 | 0.045 | shown |
| Blitz | 3 | 75 s | 1.25× | 1.0 | 1.0 | 0.045 | shown |
| Power Play | 5 | none | 1.3× | 1.25 | 1.1 | 0.045 | shown |
| Derby Night | 5 | none | 1.4× | 1.0 | 1.0 | 0.018 | shown |
| Masterclass | 5 | none | 1.6× | 1.0 | 1.0 | 0.008 | hidden |

1. **Classic Match:** the baseline five-goal duel and the unlock gate.
2. **Blitz:** a 75-second match that ends on the clock; whoever leads at full time wins.
3. **Power Play:** heavier flicks and livelier cushions make every rebound travel further.
4. **Derby Night:** the rival's aim noise drops from 0.045 to 0.018.
5. **Masterclass:** locked until a Classic win (`classicWins ≥ 1`); no aim guide and near-perfect rival aim.

A mode change starts a fresh match. Pause freezes the simulation and the match clock.

## Core rules

- You flick one disc per turn; the rival replies after the table settles.
- Pulling further from the disc produces a harder flick, with a minimum power and a capped maximum.
- The ball scores when it crosses a goal mouth between the posts; the ball is repositioned after every goal.
- Rebounds off cushions and other discs are legal.
- If the ball settles, the turn passes; a goal restarts the formation with the conceding side kicking off.
- Blitz ends immediately when the clock reaches zero, even mid-roll.

## Scoring

Every player goal pays 100 and the winning side earns a 300 bonus, both multiplied by the mode's score multiplier (Blitz 1.25×, Power Play 1.3×, Derby Night 1.4×, Masterclass 1.6×). At 1× a 5–0 Classic win is 800 points; a 2–1 Blitz win is 625. A timed-out lead counts as a win; a draw at full time is recorded as an over, not a win.

## Records and persistence

Saved under `soccer-pool`:

- `matches`, `goals`, `conceded`
- `wins`, `losses`, `cleanSheets`
- `bestMatch`, `bestMargin`, `bestScore`
- `classicBest` (best Classic score)
- `classicMatches`, `classicWins`, `blitzMatches`, `blitzWins`, `powerMatches`, `powerWins`, `derbyMatches`, `derbyWins`, `masterMatches`, `masterWins`

`bestMargin` and `bestMatch` use the maximum merge, so a short Blitz match cannot erase a full Classic result.

## Cosmetics

Sixteen registered cosmetics using the `soccer:` prefix:

| Slot | Items |
| --- | --- |
| Skin (ball) | Classic, Solar, Ember, Ice, Mono |
| Palette (pitch) | Stadium, Clay, Neon, Mono |
| Effect (aim line) | White, Cyan, Amber, Lime |
| Theme (sky) | Floodlit, Sunset, Midnight |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| Opening Goal | score your first goal | Common |
| Hat-Trick Hero | score three goals in one match | Rare |
| Clean Sheet | win without conceding | Rare |
| Five-Star | win 5–0 | Epic |
| Comeback Kid | win after trailing by two | Epic |
| Thunderbolt | score from inside your own half | Rare |
| Season Striker | score 20 career goals | Epic |
| Fortress | keep three clean sheets | Rare |
| Blitz Champion | win a Blitz match | Rare |
| Power Player | win a Power Play match | Epic |
| Derby Winner | win a Derby Night match | Epic |
| Table Master | win a Masterclass match | Legendary |

## Tutorial and controls

The interactive tutorial teaches the drag-back flick, the two goal mouths, cushion rebounds and the five mode modifiers. Controls: drag back from a cyan disc and release to flick. The HUD shows the score, the target and the Blitz clock. The aim guide can be disabled in settings or by Masterclass.

## Menu Identity Card

- **Archetype:** floodlit table-football pitch.
- **Mood:** read the angles and finish the move.
- **Palette:** `#050813` stadium sky, `#38bdf8` accent, cyan player discs, amber rival discs.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title stadium identity with the shared menu toolbar.
- **Scene recipe:** Striped pitch, goals, mirrored disc formation and a moving aim guide; static in Lite and reduced-motion modes.
- **Music and UI sounds:** Per-title procedural motif; kick, hit, goal and whistle cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Difficulty (0.8× / 1.0× / 1.35× simulation), aim guide toggle, shared audio/display/accessibility options.
- **Controls:** Drag back and release; pause with P or Esc.
- **Lite fallback:** Static pitch and disc formation with the title accent.
