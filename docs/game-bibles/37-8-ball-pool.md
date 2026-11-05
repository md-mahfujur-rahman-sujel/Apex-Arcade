# Game 37 — 8-Ball Pool

## Pitch

A full 8-ball rack with real cue-and-ball physics. Break, settle your group, pot every solid or stripe, then take the 8-ball. Five modes reshape the rack: Classic is a straight match against the house computer, Blitz adds a fifteen-second shot clock, Solo Run clears all fifteen balls alone for the fewest strokes, Bank Shot triples rail-first pots, and Grandmaster removes the aim guide and sharpens the computer. Fouls give ball-in-hand, and a scratch swaps the cue ball to a placement phase.

## Art direction

A dark hall with a felt table lit from above. The cloth uses the `pool:cloth-*` palette family, the cue uses `pool:cue-*`, the aim overlay uses `pool:aim-*`, and the room background uses `pool:room-*`. Balls keep their classic solids/stripes colouring with a white cue ball and a black 8. Pocket bursts and rail hits stay short; Lite and reduced-motion modes cut decorative sparks while keeping contact flashes and shot feedback.

## Modes and match structure

| Mode | Structure | Shot clock | Computer error | Score multiplier |
| --- | --- | --- | --- | --- |
| Classic | standard rack vs computer | none | 2.2% | 1× |
| Blitz | standard rack vs computer | 15 s | 2.4% | 1.25× |
| Solo Run | clear all fifteen balls alone | none | — | 1.15× |
| Bank Shot | standard rack vs computer | none | 2.2% | 1.3× |
| Grandmaster | standard rack, no aim guide | none | 0.6% | 1.6× |

1. **Classic:** alternates turns after a miss; sinking your own ball keeps the turn.
2. **Blitz:** a lapsed shot clock is a foul and hands ball-in-hand to the opponent.
3. **Solo Run:** every pot scores and the turn never passes; a scratch costs a stroke and re-places the cue ball. Fewest shots is the record.
4. **Bank Shot:** rail-first pots are worth three times a normal pot.
5. **Grandmaster:** locked until one Classic win (`classicWins ≥ 1`); the aim guide is hidden.

A mode change starts a fresh rack. Pause freezes the shot clock, the physics step and the computer's thinking delay.

## Core rules

- The break decides the opening spread; a potted 8 on the break is re-spotted.
- The first legal pot after the break assigns groups: potter takes that group, the opponent takes the other.
- A legal shot must first contact an own-group ball and, after contact, either pot a ball or drive any ball to a rail.
- A foul (no rail, wrong first contact, scratch, shot-clock lapse) hands ball-in-hand to the opponent.
- Sinking the 8 early loses the rack; sinking it after clearing your group wins.
- Potting your own ball repeats the turn; a miss passes it.

## Scoring

| Event | Points |
| --- | --- |
| Own-group pot | 50 |
| Own-group bank pot (Bank Shot) | 150 |
| Own-group bank pot (other modes) | 50 |
| Solo Run pot | 40 |
| Solo Run bank pot | 60 |
| Clear all fifteen (Solo Run) | +1,500 |
| Win a rack (non-solo) | +500 |

The score is accumulated through `G.addScore`, so the active mode multiplier and the shared Hard difficulty multiplier apply to every award. Solo Run's 1,500 clear bonus is added at the table-clear moment and multiplied the same way.

## Records and persistence

Saved under `pool`:

- `bestScore` (page best across modes)
- `runs`, `rackWins`, `rackLosses`
- `potted`, `banks`, `fouls`, `shots`, `bestBreak`
- `classicWins`, `blitzWins`, `soloWins`, `bankWins`, `masterWins`
- `bestSoloStrokes`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`bestSoloStrokes` uses the minimum merge so a test finish cannot replace a real run.

## Cosmetics

Sixteen registered cosmetics using the `pool:` prefix:

| Slot | Items |
| --- | --- |
| Skin (cue) | Ebony Cue, Maple Cue, Carbon Cue, Ivory Cue, Crimson Cue |
| Palette (cloth) | Emerald Cloth, Teal Cloth, Slate Cloth, Plum Cloth |
| Effect (aim sight) | Cyan Sight, Amber Sight, Rose Sight, Lime Sight |
| Theme (room) | Night Room, Dusk Room, Hall Room |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Pot | sink any ball | Common |
| Break Pot | sink a ball on the break | Common |
| Three in a Row | pot three of your balls in one visit | Rare |
| Table Runner | pot five of your balls in one visit | Epic |
| Off the Rail | sink a banked ball | Rare |
| House Champion | win a Classic rack | Rare |
| Beat the Clock | win a Blitz rack | Rare |
| Full Rack | clear all fifteen in Solo Run | Epic |
| Bank Manager | win a Bank Shot rack | Epic |
| Grandmaster | win a Grandmaster rack | Legendary |
| Spotless | win a rack without a foul | Epic |
| Pool Shark | score 600 in one rack | Epic |

## Tutorial and controls

The interactive tutorial covers aiming, pull-back power, group assignment, ball-in-hand and the 8-ball condition. Controls: drag back from the cue ball and release to shoot; click or tap a free spot to place the cue ball after a scratch. The HUD shows the current group, remaining balls, score and — in Blitz — the shot clock.

## Menu Identity Card

- **Archetype:** table.
- **Mood:** Pocket your group, then sink the 8-ball.
- **Palette:** `#080d15` background, `color-mix(in srgb, #34d399 8%, rgba(15,22,35,.94))` panel, `#34d399` accent, `color-mix(in srgb, #34d399 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `pool-frame` frame and `pool-banner` button identity, using the shared table treatment.
- **Scene recipe:** Original procedural pool mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, rail and pocket cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Controls:** Drag back and release to shoot; click to place the cue ball after a foul.
- **Lite fallback:** Static pool composition with the title accent and scene silhouette.
