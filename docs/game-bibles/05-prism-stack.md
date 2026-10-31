# Game 05 — Prism Stack

## Pitch

Stack seven-bag tetrominoes with SRS wall kicks, a hold slot, ghost piece, lock delay, back-to-back tetrises, and combo scoring. Reach 150 lines in the current Marathon while keeping the playfield, next queue, hold slot, and control legend readable together.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #C084FC accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Marathon:** current rule set; clear 150 lines and preserve the present level-based gravity curve.
2. **40-Line Sprint:** finish when the line counter reaches 40; record elapsed time and score.
3. **Daily Prism:** seeded seven-bag sequence and a fixed 40-line target; retries use the same daily sequence and update one daily best.
4. **Prism Circuit:** five stages with targets of 10, 20, 30, 40, then 50 lines. Save the highest stage cleared and offer Continue or restart-from-stage-one.

A mode change must reset only the state named by that mode. Pause and resume preserve the complete in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× gravity progression; 1.0× score multiplier. |
| Normal | Existing gravity progression and 1.0× score. |
| Hard | 1.35× gravity progression and 1.25× score; line thresholds remain unchanged. |
| Shake and particles | Persist shake amount and map particle count to the shared Lite, Standard, and Ultra budgets. |
| Reduced motion | Remove nonessential shake, glow pulses, and screen flashes; preserve block movement and line-clear timing. |
| Palette and audio | Keep piece types distinguishable by shape/mark as well as colour; inherit global audio unless overridden. |

## Cosmetics

The registry contains 15 Prism Stack cosmetics: four block skins, four piece palettes, three ghost styles, and four board themes. Preserve shape and contrast across palettes; cosmetics do not change collision or scoring. Purchases use Sparks and persist ownership/equip state.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Stack | Lock the first piece. | Common |
| Clean Sweep | Clear a single line. | Common |
| Double Prism | Clear two lines at once. | Common |
| Triple Spectrum | Clear three lines at once. | Rare |
| Fourfold Prism | Clear four lines at once. | Rare |
| Back-to-Back | Clear consecutive tetrises. | Epic |
| Combo Chain | Reach a 5-clear combo. | Rare |
| Halfway There | Reach level 8. | Rare |
| Circuit Complete | Clear all five Prism Circuit stages. | Epic |
| Marathon Master | Clear 150 lines in Marathon. | Legendary |

Unlock each once under the host game id and send one achievement event and one toast. Score targets must respect the selected mode’s documented multiplier.

## Tutorial and controls

Use a replayable interactive tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: Left/Right move, Up/X rotate, Space hard drop, C hold.

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `05-tetris/index.html`; `Arcade.game` save id is `prism-stack`. The page implements a 10×20 board, seven-bag randomizer, SRS kicks, hold, ghost, DAS movement, soft/hard drop, lock resets, combos, back-to-back scoring, escalating gravity, and a 150-line win. The Game Frame config now adds Marathon, Sprint, deterministic Daily Prism, and a five-stage Circuit with saved checkpoints, plus the achievements and cosmetics above. Controls are Left/Right, Up/X/W rotate, Z reverse rotate, Down/S soft drop, Space hard drop, and C/Shift hold. Source-level implementation is present; runtime acceptance is pending.

## Menu Identity Card

- **Archetype:** glass.
- **Mood:** Fit each falling shape into the shifting stack.
- **Palette:** `#080d15` background, `color-mix(in srgb, #c4b5fd 8%, rgba(15,22,35,.94))` panel, `#c4b5fd` accent, `color-mix(in srgb, #c4b5fd 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `prism-frame` frame and `prism-banner` button identity, using the shared glass treatment.
- **Scene recipe:** Original procedural prism mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. No proposed modes or cosmetics are shown as available.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Left/Right moves; Up rotates; Down drops faster; Space hard-drops.
- **Lite fallback:** Static prism composition with the title accent and scene silhouette.
