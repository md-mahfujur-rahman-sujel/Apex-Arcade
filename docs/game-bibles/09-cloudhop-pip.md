# Game 09 — Cloudhop Pip

## Pitch

A nimble double-jumping frog crosses sky isles, floating clouds, and moving mechanical platforms. Keep the source game’s recognizable rhythm and make each run readable, quick to restart, and rewarding to master.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #4ADE80 accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

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

Use a guided tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: A/D run, Space jump and double-jump, hold Shift to glide.

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `09-mario-world/index.html`; `Arcade.game` save id is `cloudhop-pip`. The page is a standalone sky-isle engine on top of the shared kits: three static courses (Floating Isles, Windmill Heights, Starlit Bridge), a double jump, a held-Shift cape glide, drifting cloud platforms, springs, checkpoints, crates, coins, and four enemy types. Five modes share the engine: Campaign (three lives, three hearts, checkpointed stage resume), Breeze Dash (140-second clock, +15 seconds per clear), Daily Drift (local-day seeded, 1.25× score), Endless Ascent (procedural isles, growing multiplier), and Stormfront (one life, two hearts, faster gusts, 1.5× score, unlocked after three cleared isles). Records track cleared isles, campaign clears, endless best, daily best, storm clears, coins, and runs; 14 achievements and 13 `cloudhop-pip` cosmetics are wired. Gameplay randomness uses a local seeded generator, while decorative stars stay outside the seed. Controls are A/D or arrows to run, Space/↑/W to jump and double-jump, Shift to glide, and ↓+jump to drop through thin platforms; the touch pad exposes run, jump, and glide.

## Menu Identity Card

- **Archetype:** storybook.
- **Mood:** Hop between drifting clouds and find the safe route.
- **Palette:** `#080d15` background, `color-mix(in srgb, #67e8f9 8%, rgba(15,22,35,.94))` panel, `#67e8f9` accent, `color-mix(in srgb, #67e8f9 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `cloud-frame` frame and `cloud-banner` button identity, using the shared storybook treatment.
- **Scene recipe:** Original procedural cloud mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit. Five modes and 13 cosmetics are live; Stormfront stays locked until three isles are cleared.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options, plus per-game difficulty, screen shake, and particle tier.
- **Controls:** Arrows or A/D move; Space jumps and double-jumps; hold Shift to glide; ↓+jump drops through thin platforms.
- **Lite fallback:** Static cloud composition with the title accent and scene silhouette.
