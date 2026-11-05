# Game 48 — Orchard Drop

## Pitch

Drop fruit into a glass-fronted basket and let matching pairs merge into bigger fruit. The chain runs cherry → strawberry → grape → orange → apple → pear → peach → pineapple → melon → watermelon; two watermelons vanish for a 500-point bonus. Keep the pile below the red line. Classic is the standard basket, Blitz races a 90-second clock, Tiny Basket narrows the walls, Big Harvest starts with bigger fruit, and Zen never tops out — finish whenever you like.

## Art direction

A painted dusk orchard behind a wooden basket with a glass front, glossy baked fruit sprites, drifting fireflies, merge shockwaves, juice droplets, score floaters and a soft screen shake. Basket skins come from `fruit-merge:wood-*`, the orchard palette from `fruit-merge:dusk-*`, the aim line from `fruit-merge:aim-*` and the side-panel cart from `fruit-merge:pill-*`. Lite and reduced-motion settings remove the fireflies and shake, and the fruit and next-fruit previews plus the merge chain stay visible.

## Modes and match structure

| Mode | Walls | Start fruit | Overflow grace | Clock | Unlock |
| --- | --- | --- | --- | --- | --- |
| Classic | standard (20 px inset) | levels 0–3 | 2.2 s | none | open |
| Blitz | standard | levels 0–3 | 2.2 s | 90 s | open |
| Tiny Basket | narrow (60 px inset) | levels 0–3 | 1.8 s | none | open |
| Big Harvest | standard | levels 2–5 | 2.0 s | none | open |
| Zen | standard | levels 0–3 | never | none | Classic score 600 |

1. **Classic:** the standard basket and the scoring baseline.
2. **Blitz:** the standard basket against a 90-second clock; time-up ends the run.
3. **Tiny Basket:** walls inset to 60 px on each side and a shorter grace window.
4. **Big Harvest:** the drop queue starts at grape through pear sizes for faster big merges.
5. **Zen:** no overflow loss; the pile can settle indefinitely and the run ends when the player chooses. Locked until a Classic run scores 600 (`bestScoreClassic ≥ 600`).

A mode change starts a fresh basket. Pause freezes the simulation, the clock and the drop cooldown.

## Core rules

- Move the aim with the pointer, A/D or the arrow keys, then click, tap, Space or ↓ to drop.
- The next fruit is previewed beside the basket; the drop cooldown prevents spam.
- Two fruits of the same kind that touch merge into the next fruit in the chain and score.
- The merged fruit inherits the pair's combined motion, so chains can continue.
- Two watermelons merge out of the basket for a 500-point bonus.
- A fruit resting above the red line starts the grace timer; dropping back below it recovers the timer. When the timer expires the run ends.
- **Finish run** ends the current session deliberately in any mode and records the score.
- The best fruit is tracked by the highest level reached in the run.

## Scoring

Every merge pays the new fruit's level index × 10 (strawberry 10, grape 20, …, watermelon 80); a watermelon pair pays 500 instead. The run score is the sum of all merges and bonuses. There is no difficulty score multiplier.

## Records and persistence

Saved under `fruit-merge`:

- `bestScoreClassic`, `bestScoreBlitz`, `bestScoreTiny`, `bestScoreHarvest`, `bestScoreZen`
- `bestFruit` (highest fruit level reached, maximum merge)
- `bestFruitClassic`, `bestFruitBlitz`, `bestFruitTiny`, `bestFruitHarvest`, `bestFruitZen`
- `runs`, `merges`, `drops`
- `classicRuns`, `blitzRuns`, `tinyRuns`, `harvestRuns`, `zenRuns`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

Runs report `Finished`, `Overflow` or `Time up`; every result records the score and counters, including zero-score runs.

## Cosmetics

Sixteen registered cosmetics using the `fruit-merge:` prefix:

| Slot | Items |
| --- | --- |
| Skin (basket) | Oak, Maple, Walnut, Ash, Rosewood |
| Palette (orchard) | Dusk, Night, Violet, Ember |
| Effect (aim line) | Cyan, Amber, Lime, Rose |
| Theme (cart) | Slate, Rose, Mint |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Merge | merge a matching pair | Common |
| Pear Tree | grow a pear | Common |
| Pineapple Express | grow a pineapple | Rare |
| Melon Head | grow a melon | Rare |
| Watermelon Crash | merge two watermelons | Epic |
| Bushel | score 500 in a run | Common |
| Bumper Crop | score 1,000 in a run | Rare |
| Blitz Picker | score 300 in Blitz | Rare |
| Tight Squeeze | score 300 in Tiny Basket | Rare |
| Heavy Harvest | score 300 in Big Harvest | Rare |
| Zen Gardener | score 300 in Zen | Epic |
| Every Orchard | play every mode | Legendary |

## Tutorial and controls

The interactive tutorial covers aiming, the drop input, the merge chain and the overflow line. Controls: mouse/touch drag or A/D and ←/→ to aim; click, tap, Space or ↓ to drop; N starts a new game; H/M toggle help and mute. The side panel shows score, best, time, biggest fruit, the run status and the full merge chain.

## Menu Identity Card

- **Archetype:** storybook.
- **Mood:** Drop matching fruit and let the orchard grow.
- **Palette:** `#080d15` background, `color-mix(in srgb, #fb7185 8%, rgba(15,22,35,.94))` panel, `#fb7185` accent, `color-mix(in srgb, #fb7185 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** `fruit-frame` frame and `fruit-banner` button identity, using the shared storybook treatment.
- **Scene recipe:** An original procedural fruit mark with a dusk-orchard gradient, restrained depth bands and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title major procedural motif; shared tick, select and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options. Easy/Normal/Hard change the drop cooldown to 0.75 s / 0.55 s / 0.35 s; there is no score multiplier.
- **Controls:** Move to aim; click or tap to drop the fruit.
- **Lite fallback:** Static fruit composition with the title accent and orchard silhouette.
