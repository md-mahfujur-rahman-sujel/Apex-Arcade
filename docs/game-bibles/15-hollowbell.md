# Game 15 — Hollowbell

## Pitch

Nail strikes generate focus to heal, needle-pogo off enemies and spikes, dash through shadows, and rest at benches. Keep the source game’s recognizable rhythm and make each run readable, quick to restart, and rewarding to master.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #5EEAD4 accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

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

Use a guided tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: A/D walk, Space jump, X/J needle strike, Down+X pogo, Shift dash, hold V to heal.

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `15-hollow-knight.html`. Current family: Action Kit (Arcade) (Yes). Catalog description: “Nail strikes generate focus to heal, needle-pogo off enemies and spikes, dash through shadows, and rest at benches.” Controls: A/D walk, Space jump, X/J needle strike, Down+X pogo, Shift dash, hold V to heal. This bible is a rollout proposal; it does not claim the proposed modes, tier features, cosmetics, or achievements are already shipped. Before implementation, retain the existing game rules and inspect this page’s full source for its exact save id, events, and input behavior.

## Menu Identity Card

- **Archetype:** banner.
- **Mood:** Follow the bell through a quiet, misted world.
- **Palette:** `#080d15` background, `color-mix(in srgb, #d6a56f 8%, rgba(15,22,35,.94))` panel, `#d6a56f` accent, `color-mix(in srgb, #d6a56f 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `bell-frame` frame and `bell-banner` button identity, using the shared banner treatment.
- **Scene recipe:** Original procedural bell mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. No proposed modes or cosmetics are shown as available.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrows or A/D move; Space jumps; X attacks.
- **Lite fallback:** Static bell composition with the title accent and scene silhouette.
