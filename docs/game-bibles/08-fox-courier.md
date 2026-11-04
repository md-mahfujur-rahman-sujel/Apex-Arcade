# Game 08 — Fox Courier

## Pitch

Three courses of enemy stomping, crate busting, spring launches, checkpoints, and flagpole leaps. Keep the source game’s recognizable rhythm and make each run readable, quick to restart, and rewarding to master.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #FB923C accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Classic:** preserve the canonical rules and scoring.
2. **Challenge:** a short target-based run with a clear completion condition.
3. **Daily challenge:** deterministic local-day seed and a saved daily best.

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

Plan 8 cosmetics across palette, board/craft/object skin, effects, and scene/theme slots as applicable to this game. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Run | complete one session | Common |
| Steady Hand | reach the first score milestone | Common |
| Quick Clear | finish within the target time | Common |
| Personal Best | set a new personal best | Rare |
| Daily Player | complete a seeded daily run | Rare |
| No Mistakes | finish without a mistake or lost life | Rare |
| Long Run | reach the long-run milestone | Rare |
| Perfect Round | complete a perfect round | Epic |

Unlock each once under the host game id and send one achievement event and one toast. Score targets must respect the selected mode’s documented multiplier.

## Tutorial and controls

Use a guided tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: A/D run, Space/W jump (hold for height), Down+Jump drops through thin floors.

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `08-mario/index.html`; `Arcade.game` save id is `fox-courier`. The page implements an 800×480 scrolling platformer with stompable grubs, spikers, breakable crates, springs, checkpoints, spikes, moving platforms, and flagpole clears. The Game Frame config adds Campaign, the timed Parcel Dash, the seeded three-route Daily Route, procedural Endless Delivery, and the one-life Midnight Run, plus the achievements and cosmetics above. Controls are A/D or arrows to run, Space/W/up to jump (hold for height), down+jump to drop through thin platforms, and Shift/K/J for the theatre dash. Gameplay randomness in Daily Route and Endless Delivery uses a local seeded generator; decorative scenery remains outside the seed.

## Menu Identity Card

- **Archetype:** storybook.
- **Mood:** Carry the last parcel across three lively routes.
- **Palette:** `#080d15` background, `color-mix(in srgb, #fb923c 8%, rgba(15,22,35,.94))` panel, `#fb923c` accent, `color-mix(in srgb, #fb923c 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `parcel-frame` frame and `parcel-banner` button identity, using the shared storybook treatment.
- **Scene recipe:** Original procedural parcel mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrows or A/D move; Space jumps; stomp enemies and reach each flag.
- **Lite fallback:** Static parcel composition with the title accent and scene silhouette.
