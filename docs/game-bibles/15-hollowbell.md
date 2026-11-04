# Game 15 — Hollowbell

## Pitch

Descend three quiet depths with a small bell-masked wanderer: needle strikes build focus, pogo off enemies, dash through shadows, rest at benches, and silence the Pale Warden. Keep the source game’s recognizable rhythm and make each run readable, quick to restart, and rewarding to master.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #5EEAD4 accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Pilgrimage:** the authored three-depth route (The Sunken Hollow, Mistveil Cistern, The Pale Sanctum) with five masks, the Shade Cloak, focus healing, benches, and the Pale Warden at the bottom.
2. **Shard Hunt:** the same depths gain four lost bells each; the gate stays shut until all four are collected, then the depth boss must still fall.
3. **Warden Gauntlet:** three compact arenas with a warden duel each, no depth exploration, and the gate sealed until the current warden is defeated.
4. **Daily Descent:** deterministic local-day seed for enemy behaviour, drops, and boss choices; a saved daily best score.
5. **Hollow+:** locked until the first Pilgrimage clear; non-boss enemies gain ×1.5 HP, ×1.15 speed, and ×1.5 score, the Pale Warden gains ×1.5 HP and 3 contact damage, and the run scores ×1.3.

Hollowbell is a soul run: there are no spare lives. Falling drops the wanderer at the last bench, and carried shards wait in a shade where the fall happened. A mode change restarts the run and resets only that mode’s state. Pause and resume preserve the complete in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× simulation speed; 1.0× score. |
| Normal | Preserve the source page’s baseline rules at 1.0× speed and score. |
| Hard | 1.35× simulation speed; 1.25× score. |
| Performance | Lite, Standard, and Ultra particle budgets; preserve essential playfield feedback. |
| Reduced motion | Remove decorative shake and nonessential flashes; preserve input and game-state motion. |
| Audio and palette | Inherit global settings, allow per-game overrides, and keep hazards legible in colour-blind palettes. |

## Cosmetics

16 cosmetics: five wanderer shells (Wanderer, Ember, Frost, Gilded, Void), four needle palettes (Pale, Ember, Frost, Dream), three effect trails (Pale Spark, Soul Wisp, Nightmare Flare), and four cave themes (Sunken Hollow, Mistveil, Ember Hollow, Pale Garden). Cosmetic keys only repaint the wanderer, needle, focus glow, effect motes, backdrop, and HUD accent; gameplay physics and hitboxes never change. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Wound | defeat your first enemy | Common |
| Wall Breaker | break six cracked walls in one run | Common |
| Relentless Hunter | defeat 25 enemies in one run | Common |
| Shard Legend | score 10,000 in one run | Rare |
| Pale Warden Slain | defeat the Pale Warden | Rare |
| Personal Best | finish Pilgrimage with a new best score | Rare |
| Pilgrimage Complete | finish Pilgrimage | Rare |
| Shard Keeper | finish Shard Hunt | Rare |
| Daily Descent | finish the Daily Descent | Rare |
| Untouched | clear a depth without taking damage | Epic |
| Iron Heart | finish Pilgrimage without falling once | Epic |
| Hollow Sprint | finish Pilgrimage in under six minutes | Epic |
| Hollow Adept | finish Hollow+ | Legendary |
| Gauntlet Run | win all three warden duels | Legendary |

Each unlocks once under the `hollowbell` save id and sends one achievement event and one toast. Score targets respect the selected mode’s multiplier.

## Tutorial and controls

The four-step interactive tutorial teaches movement and jumping, the needle and pogo, the Shade Cloak dash, and focus healing plus the Pale Warden win condition. Controls shown in the menu and during play: A/D or arrows walk, Space/↑/W/Z jump (hold for height), X/J needle strike, ↓+X in the air to pogo, Shift/L shade dash (after the Cloak), hold V/H to spend one-third of the focus bar on a mask, ↓+Jump drops through thin floors, P/M pause or mute.

Support keyboard and touch. Virtual controls stay below the canvas and away from hazards. Shared menus support gamepad focus and activation.

## Current baseline and scope

Canonical page: `15-hollow-knight/index.html`; `Arcade.game` save id is `hollowbell`. It builds three depths with `act-kit` tile builders (134, 140, and 128 columns at 16 rows each), plus three 40×15 gauntlet arenas. The wanderer has five masks and a soul respawn at the last bench; needle strikes build focus, and one-third of the bar heals a mask. The needle pogo bounces off enemies, the Shade Cloak adds an invulnerable dash, and cracked walls (`x`) break to strikes. Benches (`C`) save progress and refill masks, coins are shards, and falling spawns a shade holding the carried shards. Enemies are crawlers, hoppers, drifting flyers, and fixed turrets; the Pale Warden has 26 HP, wakes on approach, and cycles between rushes, ground waves, and a leap. Depth gates (`F`) enforce bell counts and a living boss. `seedForToday()` hashes the local date with `hollowbell`; `dailySequence()` exposes the xorshift stream, and Daily Descent replaces `Math.random` with that stream. `UI.mountGame` mounts the five modes, difficulty/shake/particle settings, 14 achievements, the four-step tutorial, and the cosmetic hook. Stats persist runs, seconds, kills, walls, deaths, highest depth, best score, last mode, bosses felled, per-mode completions, daily best, and best Pilgrimage time. `?test=1` exposes `HollowbellTest` (state, daily sequence, world grid, mode/level control, boss damage, cosmetics, stats). The React theater engine (`ActionCombatEngine`, `hollow` kit) mirrors three areas with wave combat, candle drops, nail/soul attacks, a resource HUD, the False Knight’s swing/leap pattern, zone-complete callbacks, and READY/GAMEOVER/VICTORY overlays. Regression: `scripts/test-game-15.mjs`.

## Menu Identity Card

- **Archetype:** banner.
- **Mood:** Follow the bell through a quiet, misted world.
- **Palette:** `#080d15` background, `color-mix(in srgb, #d6a56f 8%, rgba(15,22,35,.94))` panel, `#d6a56f` accent, `color-mix(in srgb, #d6a56f 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `bell-frame` frame and `bell-banner` button identity, using the shared banner treatment.
- **Scene recipe:** Original procedural bell mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** A/D walk; Space jumps; X/J strikes; ↓+X pogos; Shift dashes; hold V heals.
- **Cosmetics:** 16 items across wanderer shells, needle palettes, effects, and cave themes.
- **Lite fallback:** Static bell composition with the title accent and scene silhouette.
