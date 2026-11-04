# Game 16 — Skyfall Ridge

## Pitch

Climb ten authored rooms with momentum movement, variable-height jumping, wall slide/jump, one air dash, crystal dash refills, springs, brittle blocks, spikes, and a summit flag. Death respawns immediately in the same room; the run score rewards speed, few falls, and collected shards. Five modes, persistent records, 14 achievements, and 16 cosmetics extend the climb without changing the room layouts.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #38BDF8 accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Summit Story:** the ten-room authored ascent and summit result. Clears record story completions, the best time, and the highest room reached.
2. **Time Trial:** replay all ten rooms with the same layout; falls do not reduce the time bonus. A clean summit pays `max(0, 12000 − seconds × 35)`.
3. **Daily Ridge:** a local-day seed selects a fixed time target (`150 + seed % 121` seconds) for the authored route; one fall ends the attempt, and retries that day retain the same target. Stores a separate daily best.
4. **Shard Hunt:** complete the same ten rooms while collecting every summit shard; the summit turns the run away with an on-screen shortfall until all nine are held.
5. **Golden Ridge:** every shard, no falls, 1.3× score. Locked behind a Summit Story clear; the menu reports `Clear Summit Story to unlock`.

A mode change must reset only the state named by that mode. Pause and resume preserve the complete in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× simulation speed; 1.0× score. |
| Normal | Preserve the source page’s baseline rules at 1.0× speed and score. |
| Hard | 1.35× simulation speed; 1.25× score. |
| Performance | Respect Lite, Standard, and Ultra budgets; preserve essential playfield feedback. |
| Reduced motion | Remove decorative movement, shake, and nonessential flashes; preserve input and game-state motion. |
| Audio and palette | Inherit global settings, allow per-game overrides, and keep objects legible in colour-blind palettes. |

## Records

`Save.update('skyfall-ridge', { stats })` persists:

- `runs, seconds, falls, shards, highestRoom, lastMode, bestScore, bestTimeSec`
- `storyCompletions, timeTrialCompletions, dailyCompletions, shardCompletions, goldenCompletions`
- `dailyBest`

`bestScore` is also mirrored by `Arcade.game` on every score gain. The run recorder compares against the best stored at run start so Personal Best unlocks on the first record-breaking finish.

## Cosmetics

16 cosmetics are registered across four slots:

- **Parka skins (5):** `parka-amber` (default), `parka-rose`, `parka-jade`, `parka-ice`, `parka-gold`.
- **Scarf palettes (4):** `scarf-sky` (default), `scarf-ember`, `scarf-gold`, `scarf-violet`.
- **Shard effects (4):** `shard-gold` (default), `shard-rose`, `shard-mint`, `shard-ice`.
- **Themes (3):** `theme-alpine` (default), `theme-night`, `theme-violet`.

Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Dash | use the air dash | Common |
| First Shard | collect a shard | Common |
| Crystal Chain | collect a shard and recharge mid-air | Rare |
| Spring Flight | launch from a spring | Common |
| A Soft Landing | fall and respawn | Common |
| Steady Ascent | reach the summit without falling | Rare |
| Daily Climber | complete a daily route | Rare |
| Quick Ascent | reach the summit in under two minutes | Epic |
| Shard Keeper | collect every shard | Epic |
| Summit Story | finish Summit Story | Rare |
| Shard Hunt | finish Shard Hunt with every shard | Legendary |
| Trial Runner | finish Time Trial | Rare |
| Golden Ridge | finish Golden Ridge with every shard and no falls | Legendary |
| Personal Best | finish with a new best score | Rare |

Unlock each once under the host game id and send one achievement event and one toast. Score targets must respect the selected mode’s documented multiplier.

## Tutorial and controls

Use a replayable interactive tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Four steps cover moving/holding jump, dashing with crystal refills, wall-jumps and springs, and the all-shard summit gate. Controls shown in the menu and during play: A/D or arrows move, Space jumps (hold for height), Shift dashes (aim with arrows).

Support keyboard and touch. Action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `16-celeste/index.html` (34.8 KB); `Arcade.game` save id is `skyfall-ridge`. The source contains ten named rooms (First Steps, Thorns, The Leap, The Chimney, Springboard, Brittle Bridge, Crystal Chain, Thorn Climb, Windy Gap, The Summit) on a 20×12 tile grid, nine shards worth 100 each, crystals that refill the air dash, springs, crumbling blocks, and lethal spikes. Falls respawn in the current room and increment a death counter; reaching the summit awards a mode-specific base bonus. The Game Frame offers Summit Story, Time Trial, Daily Ridge, Shard Hunt, and Golden Ridge, with Golden Ridge gated on a story clear. The menu also carries a four-step tutorial, 14 save-once achievements, 16 cosmetic catalog items across four slots, and adjustable difficulty/shake/particle settings.

The `?test=1` gate exposes `window.SkyfallTest`: `state`, `world`, `levelName`, `setMode`, `restart`, `setDifficulty`, `award`, `cosmetic`, `colors`, `stats`, `goRoom`, `fillShards`, `reachSummit`, `teleport`, `setFalls`, `gridAt`, and `roomCount`.

The 3D theater uses `PrecisionPlatformerEngine` with variant `celeste`, three stages (Ascent, Crystal Climb, The Summit), seven shards per stage, and the same wall-jump/air-dash rules. Its `?test=1` gate exposes `PrecisionTest` (`state`, `start`, `setStage`, `reachGoal`, `collectAll`, `setScore`).

Regression coverage: `scripts/test-game-16.mjs` (`npm run test:game-16`) verifies daily determinism, mode locking, every mode’s scoring and records, all 14 achievements, the 16 cosmetics and their colour mapping, the chrome-free play view, the extension-error reporter, and the three-stage theater flow.

## Menu Identity Card

- **Archetype:** glass.
- **Mood:** Climb one bright ridge, one dash at a time.
- **Palette:** `#080d15` background, `color-mix(in srgb, #7dd3fc 8%, rgba(15,22,35,.94))` panel, `#7dd3fc` accent, `color-mix(in srgb, #7dd3fc 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `mountain-frame` frame and `mountain-banner` button identity, using the shared glass treatment.
- **Scene recipe:** Original procedural mountain mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Modes shown:** Summit Story, Time Trial, Daily Ridge, Shard Hunt, Golden Ridge (locked until Summit Story is cleared).
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrows or WASD move; Space jumps; Shift dashes.
- **Lite fallback:** Static mountain composition with the title accent and scene silhouette.
