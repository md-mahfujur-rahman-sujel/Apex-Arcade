# Game 38 — Bowling

## Pitch

Ten frames of ten-pin bowling with a three-click meter: place the ball, lock the angle, then stop the power sweep and let it roll. Five modes give the lane a different job. Classic is a standard ten-frame game, Blitz runs a twelve-second shot clock, Spare Practice racks ten seven-pin leaves, Triple Header strings three games into one score, and Pro Oil hides the aim guide and nearly doubles the hook. Strikes, spares and the tenth-frame bonus balls follow standard scoring, and the page keeps per-mode runs and a perfect-game counter.

## Art direction

A neon-trimmed night alley. The lane is lacquered wood with a moving sheen and a light pool behind the pin deck; gutters and side trim glow cyan and pink. The ball carries the `bowl:ball-*` skin, the lane uses `bowl:lane-*`, the side neon uses `bowl:trim-*`, and the room uses `bowl:alley-*`. Pins are shaded capsules that spin and tumble when knocked down. Strikes and spares flash the lane, ring the deck and throw confetti; Lite and reduced-motion modes keep the flash and pin motion but shorten the confetti.

## Modes and match structure

| Mode | Frames | Shot clock | Hook | Aim guide | Raw score source | Multiplier |
| --- | --- | --- | --- | --- | --- | --- |
| Classic | 10 | none | 1× | shown | one game | 1× |
| Blitz | 10 | 12 s | 1× | shown | one game | 1.2× |
| Spare Practice | 10 leaves | none | 1× | shown | ten leaves | 1.15× |
| Triple Header | 30 | none | 1× | shown | three games | 1.25× |
| Pro Oil | 10 | none | 1.9× | hidden | one game | 1.6× |

1. **Classic:** a standard ten-frame game.
2. **Blitz:** the shot clock throws for you when it lapses; the ball still counts.
3. **Spare Practice:** every frame starts with a seven-pin leave; each conversion pays the leftovers plus a spare bonus.
4. **Triple Header:** three complete games run back to back; the two archived games join the finale in one score.
5. **Pro Oil:** locked behind a 150-point session; the aim guide is hidden and the hook is much sharper.

A mode change starts a fresh rack. Pause freezes the shot clock and the rolling physics.

## Core rules

- Frame 1–9: two balls. A strike moves to the next frame; a spare is converted from the leave.
- Frame 10: up to three balls; a strike or spare earns the bonus delivery.
- The ball can be curved by holding Left/Right while it rolls.
- A gutter ball scores nothing for that delivery.
- Spare Practice uses the same ten-frame card, but a fresh seven-pin leave is racked each frame.
- Triple Header records each finished game and keeps 300-scale game scores before the mode multiplier.

## Scoring

Standard ten-pin scoring: a strike is 10 plus the next two balls, a spare is 10 plus the next ball, and an open frame is the pin count. The final score is the raw card multiplied by the mode multiplier and rounded:

- Classic: raw card at 1×.
- Blitz: raw card at 1.2×.
- Spare Practice: each cleared leave is `7 + 30`, ten times, at 1.15×; a missed leave scores only the pins felled.
- Triple Header: the two archived games plus the live card, at 1.25×.
- Pro Oil: raw card at 1.6×.

## Records and persistence

Saved under `bowling`:

- `bestScore`, `bestGame` (single-game card)
- `plays`, `games`, `strikes`, `spares`, `gutters`, `pins`
- `perfectGames`
- `classicRuns`, `blitzRuns`, `sparesRuns`, `seriesRuns`, `masterRuns`
- `secondsPlayed`, `lastResult`, `lastMode`

`bestScore` is the page-wide dispatch score, so a Triple Header can hold it while `bestGame` still tracks the best single card.

## Cosmetics

Sixteen registered cosmetics using the `bowl:` prefix:

| Slot | Items |
| --- | --- |
| Skin (ball) | Cyan Ball, Ember Ball, Jade Ball, Mono Ball, Ruby Ball |
| Palette (lane) | Classic Lane, Maple Lane, Ash Lane, Midnight Lane |
| Effect (neon trim) | Cyan Trim, Amber Trim, Rose Trim, Lime Trim |
| Theme (alley) | Night Alley, Neon Alley, Sunset Alley |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Strike | roll a strike | Common |
| Double | strike in two consecutive frames | Rare |
| Turkey | strike in three consecutive frames | Epic |
| Spare Artist | convert ten spares across runs | Rare |
| Clean Sheet | finish a game with no open frames | Rare |
| League Regular | complete five games | Common |
| Century Club | score 200 in one game | Rare |
| Perfect Game | roll twelve strikes in one game | Legendary |
| Speed Demon | finish a Blitz game | Rare |
| Spare Master | clear every Spare Practice leave | Epic |
| Series Champ | finish a Triple Header | Epic |
| Pro Oil | finish a Pro Oil game | Legendary |

## Tutorial and controls

The tutorial teaches the three-click meter and the hook. Controls: Left/Right or the pointer to position the ball; Space, Enter or click three times to lock position, aim and power; hold Left/Right while rolling to curve. The scoreboard shows all ten frames, the running total and the current frame highlight.

## Menu Identity Card

- **Archetype:** neon alley.
- **Mood:** Pick your line, stop the meter clean and let the pins fall.
- **Palette:** `#060811` background, `rgba(21,25,38,.94)` panel, `#f87171` accent, `#67e8f9` lane light, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `bowl-frame` frame and `bowl-banner` button identity.
- **Scene recipe:** Lacquered lane, glowing gutters and a lit pin deck rendered procedurally; static in Lite and reduced-motion modes.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, roll, pin hit and strike cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options.
- **Controls:** Left/Right or pointer to position; Space/click three times; Left/Right to hook.
- **Lite fallback:** Static alley composition with the lane, pin deck and title accent.
