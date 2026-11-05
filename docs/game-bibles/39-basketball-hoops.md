# Game 39 — Basketball Hoops

## Pitch

A rooftop court and a sixty-second shootout. Drag back from the ball and release to arc a shot, or set the angle with Up/Down and release a charged Space shot. Baskets inside the line are worth two, beyond it three; a clean swish adds a bonus point and three makes in a row adds another. Five modes reframe the session: Pickup Game is the sixty-second standard, Rapid Fire halves the clock, Downtown launches every shot from deep, Hot Hand adds two seconds per make, and Rooftop Wind adds a crosswind and removes the guide.

## Art direction

A dusk rooftop with a backboard, rim and net on the right and a lit court below. The ball uses the `basketball:ball-*` skin, the floor and wall use `basketball:court-*`, the trajectory and power bar use `basketball:aim-*`, and the sky uses `basketball:sky-*`. The net ripples on a make, the ball leaves a short shadow trail, and scores pop above the rim. Rooftop Wind draws a wind marker; Lite and reduced-motion modes keep the guide, ball and net motion but drop decorative bursts.

## Modes and match structure

| Mode | Clock | Score multiplier | Special rule | Guide |
| --- | --- | --- | --- | --- |
| Pickup Game | 60 s | 1× | standard spots on both sides of the line | shown |
| Rapid Fire | 30 s | 1.25× | half the clock | shown |
| Downtown | 60 s | 1.3× | every spawn is beyond the arc | shown |
| Hot Hand | 60 s | 1.35× | each make adds 2 s to the clock | shown |
| Rooftop Wind | 50 s | 1.6× | crosswind pushes every shot | hidden |

1. **Pickup Game:** the standard session and unlock gate.
2. **Rapid Fire:** the same court with half the time.
3. **Downtown:** spawns start at least forty pixels beyond the three-point line.
4. **Hot Hand:** made shots extend the session, so a streak can outlast the clock.
5. **Rooftop Wind:** locked until a Pickup Game scores 20 (`classicBest ≥ 20`); a constant crosswind and no trajectory dots.

A mode change starts a fresh session. Pause freezes the clock, the flight physics and the shot meter.

## Core rules

- Each attempt begins on a spawn spot; the ball rests on the floor until shot.
- Drag back and release, or use Up/Down to set the launch angle and hold Space to charge.
- The ball collides with the backboard, both rim edges and the floor; rim contact marks the shot as non-swish.
- A basket counts when the ball crosses the rim plane downward inside the two rim edges.
- Two bounces, an off-screen ball or a settled ball ends the attempt.
- The session ends at zero on the clock.

## Scoring

| Event | Points |
| --- | --- |
| Two-point basket | 2 |
| Three-point basket | 3 |
| Swish (no rim or board contact) | +1 |
| Third consecutive make and beyond | +1 |
| Hot Hand make | +2 seconds on the clock |

Every award passes through `G.addScore`, so the mode multiplier and the shared Hard difficulty multiplier apply per basket and round to the nearest point. The session score is the sum of awarded points.

## Records and persistence

Saved under `basketball`:

- `bestScore`, `bestSession`
- `sessions`, `shots`, `made`, `swishes`, `threes`, `points`
- `bestStreak`, `bestSwish`
- `classicBest` (unlock gate for Rooftop Wind)
- `classicSessions`, `rapidSessions`, `downtownSessions`, `hotSessions`, `masterSessions`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

`bestStreak` and `bestSwish` use the maximum merge; the session multipliers never inflate the streak counters.

## Cosmetics

Sixteen registered cosmetics using the `basketball:` prefix:

| Slot | Items |
| --- | --- |
| Skin (ball) | Ember Ball, Sunset Ball, Jade Ball, Mono Ball, Ruby Ball |
| Palette (court) | Hardwood Court, Slate Court, Neon Court, Sand Court |
| Effect (arc) | White Arc, Cyan Arc, Amber Arc, Lime Arc |
| Theme (sky) | Dusk Gym, Night Gym, Sunrise Gym |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Basket | sink one shot | Common |
| Nothing But Net | sink a swish | Common |
| From Downtown | sink a three-pointer | Common |
| Triple Threat | make three in a row | Rare |
| Heater | make five in a row | Epic |
| Sharpshooter | make ten shots in one session | Rare |
| Twenty Club | score 20 in one session | Rare |
| Sniper | swish five in a row | Epic |
| Quick Release | finish Rapid Fire | Rare |
| City Lights | finish Downtown | Epic |
| Still Hot | finish Hot Hand | Epic |
| Against The Wind | finish Rooftop Wind | Legendary |

## Tutorial and controls

The interactive tutorial teaches the drag-back shot, the angle-and-charge alternative, the three-point line, the swish and streak bonuses and the mode modifiers. Controls: drag back and release; Up/Down to set the angle; hold Space, release to shoot. The HUD shows score, time, streak, the shot counter and the live power bar.

## Menu Identity Card

- **Archetype:** rooftop court.
- **Mood:** Find the arc before the buzzer.
- **Palette:** `#1b2340` sky, `rgba(21,25,38,.94)` panel, `#fb923c` accent, `#f97316` rim, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `hoops-frame` frame and `hoops-banner` button identity.
- **Scene recipe:** Procedural rooftop, backboard, rim and net with an accent-lit sky; static in Lite and reduced-motion modes.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, bounce, swish and buzzer cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Controls:** Drag back and release; Up/Down + hold Space; pause with P or Esc.
- **Lite fallback:** Static court composition with the hoop, ball and title accent.
