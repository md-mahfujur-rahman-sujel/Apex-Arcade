# Game 40 — Mini Golf

## Pitch

Nine compact holes of putt-putt with bumpers, sand, water, a windmill, moving walls and a zigzag finish. Drag back from the ball and release to putt, or aim with Left/Right and release a charged Space stroke. Each hole awards points against par, a hole-in-one pays a flat 80, and the card tracks strokes against par across the round. Five modes change the card: Classic is all nine holes, Speed Golf is five holes against a 90-second clock, Windy Links adds a crosswind, Tight Cup shrinks the cup and shortens the pickup limit, and Championship adds the tight cup, crosswind and no aim guide.

## Art direction

A dark backdrop over a striped green with wooden rails. The course colour comes from `minigolf:grass-*`, the ball from `minigolf:ball-*`, the aim dashes from `minigolf:aim-*`, and the sky from `minigolf:sky-*`. Water animates with wave lines, sand is speckled, the windmill turns, and moving walls slide on a sine path. The cup draws at the active mode's radius with a waving flag. Lite and reduced-motion modes keep the ball, rails and hazards but stop decorative sheen.

## Modes and match structure

| Mode | Holes | Clock | Cup radius | Wind | Aim guide | Pickup at | Multiplier |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Classic Round | 9 | none | 12 px | none | shown | 8 strokes | 1× |
| Speed Golf | 5 | 90 s | 12 px | none | shown | 8 strokes | 1.2× |
| Windy Links | 9 | none | 12 px | +0.05 | shown | 8 strokes | 1.3× |
| Tight Cup | 9 | none | 8 px | none | shown | 6 strokes | 1.4× |
| Championship | 9 | none | 8 px | −0.045 | hidden | 6 strokes | 1.6× |

1. **Classic Round:** the standard nine-hole card and unlock gate.
2. **Speed Golf:** the first five holes must be finished before the clock expires.
3. **Windy Links:** a steady crosswind bends every rolling ball.
4. **Tight Cup:** a smaller cup and an earlier pickup limit.
5. **Championship:** locked until a Classic round scores 200 (`classicBest ≥ 200`); tight cup, crosswind and no guide.

A mode change starts a fresh card. Pause freezes the clock, the windmill, the moving walls and the ball.

## Core rules

- Each hole starts at its tee; the ball rolls until it stops or is sunk.
- Water sends the ball back to its last resting spot and adds one stroke.
- Sand increases rolling friction.
- A ball that stops inside the cup's capture radius and is slow enough drops.
- A ball stopped near the cup is pulled gently toward it.
- Exceeding the pickup limit ends the hole with the pickup score (zero points); the strokes still count on the card.
- Speed Golf ends the whole round when the clock reaches zero, recording the holes played so far.

## Scoring

A hole-in-one pays 80. Every other finish pays `max(0, (par + 3 − strokes) × 10)`: an eagle pays `(par + 1) × 10`, a birdie `(par + 2) × 10`, par `(par + 3) × 10`, and a bogey or worse pays less, down to zero. A pickup pays zero.

Each award passes through `G.addScore`, so the mode multiplier is applied per hole and rounded before it joins the round score. The round score is the sum across holes.

## Records and persistence

Saved under `minigolf`:

- `bestScore`, `bestRound`
- `rounds`, `holes`, `strokes`
- `aces`, `birdies`, `eagles`, `pars`, `pickups`
- `bestToPar` (nine-hole rounds only), `bestStrokes` (nine-hole rounds only)
- `classicBest` (unlock gate for Championship)
- `classicRounds`, `sprintRounds`, `windyRounds`, `tightRounds`, `masterRounds`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`bestToPar` and `bestStrokes` use the minimum merge, so a shortened Speed Golf card cannot overwrite a real nine-hole record.

## Cosmetics

Sixteen registered cosmetics using the `minigolf:` prefix:

| Slot | Items |
| --- | --- |
| Skin (ball) | Classic Ball, Lime Ball, Ice Ball, Sunset Ball, Gold Ball |
| Palette (green) | Emerald Green, Links Green, Autumn Green, Night Green |
| Effect (aim line) | White Line, Cyan Line, Amber Line, Lime Line |
| Theme (sky) | Dusk Sky, Night Sky, Sunset Sky |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| Tee Time | sink the first hole | Common |
| Hole In One | sink a hole in a single stroke | Common |
| Double Ace | sink two holes in one during a round | Epic |
| Eagle Eye | finish a hole two strokes under par | Rare |
| Under Par | finish a hole one stroke under par | Common |
| Steady Hand | play three holes in a row at par or better | Rare |
| Red Numbers | finish a nine-hole round under par | Epic |
| Clean Card | finish nine holes without picking up | Rare |
| Quick Round | finish Speed Golf before the clock expires | Rare |
| Wind Player | finish Windy Links | Epic |
| Threading It | finish Tight Cup | Epic |
| Club Champion | finish Championship | Legendary |

## Tutorial and controls

The interactive tutorial teaches the drag-back putt, the aim-and-charge alternative, the water and sand penalties, and the mode modifiers. Controls: drag back and release to putt; Left/Right to aim; hold Space, release to charge. The HUD shows the hole, par, strokes and the Speed Golf clock, with a wind marker in windy modes.

## Menu Identity Card

- **Archetype:** putting green.
- **Mood:** Read the break and finish under par.
- **Palette:** `#0f1a2e` sky, `rgba(21,25,38,.94)` panel, `#84cc16` accent, `#22a55f` green, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `golf-frame` frame and `golf-banner` button identity.
- **Scene recipe:** Procedural green with wooden rails, hazards and a waving flag; static in Lite and reduced-motion modes.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, putt, splash and cup cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Controls:** Drag back and release; Left/Right + hold Space; pause with P or Esc.
- **Lite fallback:** Static hole composition with the green, cup and title accent.
