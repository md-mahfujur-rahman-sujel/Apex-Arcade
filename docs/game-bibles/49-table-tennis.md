# Game 49 — Table Tennis

## Pitch

Perspective 3D ping-pong table with paddle tracking, spin deflection, Easy/Medium/Hard AI, and local 2-player keyboard sharing. Keep the source game’s recognizable rhythm and make each run readable, quick to restart, and rewarding to master.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #F87171 accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Classic:** preserve the canonical rules and scoring.
2. **Campaign:** a sequence of short, authored stages with checkpoints.
3. **Daily challenge:** fixed local-day seed, one scored attempt, replay available without overwriting the first result.
4. **Master challenge:** harder rule preset using the same core mechanic.

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

Plan 15 cosmetics across palette, board/craft/object skin, effects, and scene/theme slots as applicable to this game. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

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
| Mastery | clear the highest standard challenge | Epic |
| Season Ace | meet the local season target | Legendary |

Unlock each once under the host game id and send one achievement event and one toast. Score targets must respect the selected mode’s documented multiplier.

## Tutorial and controls

Use a replayable interactive tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: Mouse / touch / WASD to move paddle. Space or click to serve and swing.

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `49-table-tennis.html`. Current family: Board Kit (Yes). Catalog description: “Perspective 3D ping-pong table with paddle tracking, spin deflection, Easy/Medium/Hard AI, and local 2-player keyboard sharing.” Controls: Mouse / touch / WASD to move paddle. Space or click to serve and swing. This bible is a rollout proposal; it does not claim the proposed modes, tier features, cosmetics, or achievements are already shipped. Before implementation, retain the existing game rules and inspect this page’s full source for its exact save id, events, and input behavior.

## Menu Identity Card

- **Archetype:** scoreboard.
- **Mood:** Meet the ball early and return it across the table.
- **Palette:** `#080d15` background, `color-mix(in srgb, #38bdf8 8%, rgba(15,22,35,.94))` panel, `#38bdf8` accent, `color-mix(in srgb, #38bdf8 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `rally-frame` frame and `rally-banner` button identity, using the shared scoreboard treatment.
- **Scene recipe:** Original procedural rally mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. No proposed modes or cosmetics are shown as available.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Move the paddle with the pointer or touch; keyboard arrows also work.
- **Lite fallback:** Static rally composition with the title accent and scene silhouette.
