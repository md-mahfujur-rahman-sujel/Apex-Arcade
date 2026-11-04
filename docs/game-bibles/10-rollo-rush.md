# Game 10 — Rollo Rush

## Pitch

Build momentum, hit cyan acceleration pads, roll into a spinning ball, launch off springs, and collect rings. Keep the source game’s recognizable rhythm and make each run readable, quick to restart, and rewarding to master.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #2DD4BF accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

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

Use a guided tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: A/D run to build speed, Space/W jump & spin attack, Shift spin dash.

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `10-sonic/index.html`; `Arcade.game` save id is `rollo-rush`. The page is a standalone momentum engine on top of the shared kits: the canonical three zones (Sunny Shore, Crystal Mines, Neon Highway), speed-building run physics, a ground spin dash, cyan boost pads, springs, checkpoints, crates, rings, moving lift platforms, and four enemy types. Taking a hit scatters half the run’s rings as recoverable pickups. Five modes share the engine: Campaign (three lives, three hearts, checkpointed stage resume), Blitz Run (120-second clock, +15 seconds per clear), Daily Dash (local-day seeded, 1.25× score), Endless Rush (procedural zones, growing multiplier), and Overdrive (one life, two hearts, faster pace, 1.5× score, unlocked after three cleared zones). Records track cleared zones, campaign clears, endless best, daily best, overdrive clears, rings, and runs; 14 achievements and 13 `rollo-rush` cosmetics are wired. Gameplay randomness uses a local seeded generator, while decorative stars stay outside the seed. Controls are A/D or arrows to run, Space/↑/W to jump and spin, Shift to spin dash, and ↓+jump to drop through thin platforms; the touch pad exposes run, jump, and spin dash.

## Menu Identity Card

- **Archetype:** crt.
- **Mood:** Build speed and keep your momentum through the course.
- **Palette:** `#080d15` background, `color-mix(in srgb, #facc15 8%, rgba(15,22,35,.94))` panel, `#facc15` accent, `color-mix(in srgb, #facc15 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `wheel-frame` frame and `wheel-banner` button identity, using the shared crt treatment.
- **Scene recipe:** Original procedural wheel mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit. Five modes and 13 cosmetics are live; Overdrive stays locked until three zones are cleared.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options, plus per-game difficulty, screen shake, and particle tier.
- **Controls:** Arrows or A/D move; Space jumps and spins; Shift spin-dashes; ↓+jump drops through thin platforms.
- **Lite fallback:** Static wheel composition with the title accent and scene silhouette.
