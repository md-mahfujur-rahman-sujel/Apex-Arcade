# Game 16 — Skyfall Ridge

## Pitch

Climb ten authored rooms with momentum movement, variable-height jumping, wall slide/jump, one air dash, crystal dash refills, springs, brittle blocks, spikes, and a summit flag. Death respawns immediately in the same room; the run score rewards speed, few falls, and collected gems.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #38BDF8 accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Summit Story:** preserve the current ten-room authored ascent and summit result.
2. **Time Trial:** replay all ten rooms with the same layout; rank only by elapsed time, then falls.
3. **Daily Ridge:** a local-day seed selects a fixed time target for the authored route; one fall ends the attempt, and retries that day retain the same target. Store a separate daily score and time.
4. **Shard Hunt:** complete the same ten rooms while collecting every summit shard; preserve room transition checkpoints and show remaining shards.

A mode change must reset only the state named by that mode. Pause and resume preserve the complete in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× simulation speed or a wider timing/mistake allowance; 1.0× score. |
| Normal | Preserve the source page’s baseline rules at 1.0× speed and score. |
| Hard | 1.35× simulation speed or a stricter opponent/puzzle target; 1.25× score. |
| Performance | Respect Lite, Standard, and Ultra budgets; preserve essential playfield feedback. |
| Reduced motion | Remove decorative movement, shake, and nonessential flashes; preserve input and game-state motion. |
| Audio and palette | Inherit global settings, allow per-game overrides, and keep objects legible in colour-blind palettes. |

## Cosmetics

15 cosmetics are registered across parka skin, scarf palette, shard effect, and scene theme slots. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Dash | use the air dash | Common |
| First Shard | collect a shard | Common |
| Crystal Chain | collect a shard and recharge mid-air | Rare |
| Spring Flight | launch from a spring | Common |
| A Soft Landing | fall and respawn | Common |
| Steady Ascent | reach the summit without falling | Rare |
| Daily Climber | complete the daily route | Rare |
| Quick Ascent | finish in under two minutes | Epic |
| Shard Keeper | collect every shard | Epic |
| Summit Story | finish story mode | Rare |
| Shard Hunt | finish Shard Hunt with every shard | Legendary |

Unlock each once under the host game id and send one achievement event and one toast. Score targets must respect the selected mode’s documented multiplier.

## Tutorial and controls

Use a replayable interactive tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: A/D move, Space jump (hold for height), Shift dash (aim with arrows).

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `16-celeste/index.html`; `Arcade.game` save id is `skyfall-ridge`. The source contains ten named rooms (First Steps, Thorns, The Leap, The Chimney, Springboard, Brittle Bridge, Crystal Chain, Thorn Climb, Windy Gap, The Summit), gems worth 100 each, crystals that refill the air dash, springs, crumbling blocks, and lethal spikes. Falls respawn in the current room and increment a death counter; reaching the summit awards a bonus based on elapsed seconds and deaths. The Game Frame now offers Summit Story, Time Trial, Daily Ridge, and Shard Hunt; Shard Hunt requires every shard, Time Trial ignores falls in its time bonus, and Daily Ridge ends on the first fall with a seed-derived time target fixed for the local day. Eleven save-once achievement triggers, four cosmetic slots with 15 catalog items, adjustable shake/particle settings, and a replayable controls tutorial are wired. Daily retries use the same authored route and local-day seed. Implementation is source-reviewed but not runtime-verified. Controls are left/right or A/D, Space to jump (hold for height), and Shift to dash in the aimed direction.

## Menu Identity Card

- **Archetype:** glass.
- **Mood:** Climb one bright ridge, one dash at a time.
- **Palette:** `#080d15` background, `color-mix(in srgb, #7dd3fc 8%, rgba(15,22,35,.94))` panel, `#7dd3fc` accent, `color-mix(in srgb, #7dd3fc 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `mountain-frame` frame and `mountain-banner` button identity, using the shared glass treatment.
- **Scene recipe:** Original procedural mountain mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. No proposed modes or cosmetics are shown as available.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrows or WASD move; Space jumps; Shift dashes.
- **Lite fallback:** Static mountain composition with the title accent and scene silhouette.
