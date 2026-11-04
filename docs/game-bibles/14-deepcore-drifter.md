# Game 14 — Deepcore Drifter

## Pitch

Descend three collapsed sectors, blast cyan energy doors, crack weak walls, find the Missiles, and bring down the Brood Warden. Keep the source game’s recognizable rhythm and make each run readable, quick to restart, and rewarding to master.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #22D3EE accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Story Drift:** the authored three-sector route (Collapsed Core, Ion Trench, Brood Nest) with three lives, the Spring Boots, the Charge Cell, Missiles, and the Brood Warden at the bottom.
2. **Core Hunt:** the same sectors gain four core shards each; the gate stays shut until all four are collected, then the sector boss must still fall.
3. **Warden Gauntlet:** three compact arenas with a warden duel each, no sector exploration, and the gate sealed until the current warden is defeated.
4. **Daily Descent:** deterministic local-day seed for enemy behaviour, drops, and boss choices; a saved daily best score.
5. **Nightcore+:** locked until the first Story Drift clear; non-boss enemies gain ×1.5 HP, ×1.15 speed, and ×1.5 score, the Brood Warden gains ×1.5 HP and 3 contact damage, and the run scores ×1.3.

A mode change restarts the run and resets only that mode’s state. Pause and resume preserve the complete in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

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

16 cosmetics: five drifter skins (Standard, Ember, Arctic, Toxic, Void), four beam palettes (Ion, Plasma, Solar, Void), three effect trails (Ion Spark, Static Charge, Core Nova), and four cave themes (Deepcore, Magma Core, Frozen Abyss, Overgrown Nest). Cosmetic keys only repaint the drifter, beam, impact effects, backdrop, and HUD accent; gameplay physics and hitboxes never change. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Blood | defeat your first enemy | Common |
| Scavenger | break eight doors or weak walls in one run | Common |
| Relentless Hunter | defeat 25 enemies in one run | Common |
| Deepcore Legend | score 10,000 in one run | Rare |
| Brood Warden Slain | defeat the Brood Warden | Rare |
| Personal Best | finish Story Drift with a new best score | Rare |
| Core Stabilised | finish Story Drift | Rare |
| Core Keeper | finish Core Hunt | Rare |
| Daily Descent | finish the Daily Descent | Rare |
| Untouched | clear a sector without taking damage | Epic |
| Iron Drifter | finish Story Drift without losing a life | Epic |
| Core Sprint | finish Story Drift in under six minutes | Epic |
| Nightcore Adept | finish Nightcore+ | Legendary |
| Gauntlet Run | win all three warden duels | Legendary |

Each unlocks once under the `deepcore-drifter` save id and sends one achievement event and one toast. Score targets respect the selected mode’s multiplier.

## Tutorial and controls

The four-step interactive tutorial teaches movement and jumping, the charge beam plus Spring Boots, missiles and red doors, and the three-sector win condition. Controls shown in the menu and during play: A/D or arrows move, Space/↑/W/Z jump (Spring Boots add a mid-air jump), X/J fire the beam (hold to charge), C/K fire a missile, ↓+Jump drops through thin floors, P/M pause or mute.

Support keyboard and touch. Virtual controls stay below the canvas and away from hazards. Shared menus support gamepad focus and activation.

## Current baseline and scope

Canonical page: `14-metroid/index.html`; `Arcade.game` save id is `deepcore-drifter`. It builds three sectors with `act-kit` tile builders (150, 128, and 132 columns at 20/18/18 rows), plus three 40×15 gauntlet arenas. The drifter has six hearts, three lives, and no starting ammo; the beam is a fast one-damage shot, and missiles cost one ammo for six damage. Doors (`d`) crack to the beam, weak walls (`x`) break to shots, and red doors (`e`) need missiles. Coins, dropped hearts, and core shards add score; checkpoints (`C`) save progress. Enemies are crawlers, flyers, brutes, and fixed turrets; the Brood Warden has 36 HP, wakes on approach, and fires spread volleys. Sector gates (`F`) enforce shard counts and a living boss. `seedForToday()` hashes the local date with `deepcore-drifter`; `dailySequence()` exposes the xorshift stream, and Daily Descent replaces `Math.random` with that stream. `UI.mountGame` mounts the five modes, difficulty/shake/particle settings, 14 achievements, the four-step tutorial, and the cosmetic hook. Stats persist runs, seconds, kills, doors, deaths, highest stage, best score, last mode, bosses felled, per-mode completions, daily best, and best Story time. `?test=1` exposes `DeepcoreTest` (state, daily sequence, world grid, mode/level control, boss damage, cosmetics, stats). The React theater engine (`ActionCombatEngine`, `metroid` kit) mirrors three sectors with wave combat, door and wall gating, beam and missile attacks, a resource HUD, the Torizo Sentinel’s patrol/volley pattern, zone-complete callbacks, and READY/GAMEOVER/VICTORY overlays. Regression: `scripts/test-game-14.mjs`.

## Menu Identity Card

- **Archetype:** machine.
- **Mood:** Read the cave, find the route, and push deeper.
- **Palette:** `#080d15` background, `color-mix(in srgb, #22d3ee 8%, rgba(15,22,35,.94))` panel, `#22d3ee` accent, `color-mix(in srgb, #22d3ee 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `scanner-frame` frame and `scanner-banner` button identity, using the shared machine treatment.
- **Scene recipe:** Original procedural scanner mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** A/D move; Space jumps; X/J fires; C/K launches a missile.
- **Cosmetics:** 16 items across drifter skins, beam palettes, effects, and cave themes.
- **Lite fallback:** Static scanner composition with the title accent and scene silhouette.
