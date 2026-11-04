# Game 13 — Lanternbound

## Pitch

Whip haunted candles to gather throwing-axe ammo, climb three gothic stages, and bring down the floating Hollow Duke. Keep the source game’s recognizable rhythm and make each run readable, quick to restart, and rewarding to master.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #F59E0B accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Story Hunt:** the authored three-stage route (Moonlit Courtyard, Haunted Library, Clock Tower) with three lives and the Hollow Duke in the belfry.
2. **Relic Hunt:** the same stages gain four relics each; the gate stays shut until all four are collected, then the stage boss must still fall.
3. **Duke’s Gauntlet:** three compact arenas with a duke duel each, no stage exploration, and the gate sealed until the current duke is defeated.
4. **Daily Crypt:** deterministic local-day seed for enemy behaviour, drops, and boss choices; a saved daily best score.
5. **Nocturne+:** locked until the first Story Hunt clear; non-boss enemies gain ×1.5 HP, ×1.15 speed, and ×1.5 score, the boss gains ×1.5 HP and 3 contact damage, and the run scores ×1.3.

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

16 cosmetics: five knight skins (Ivory, Crimson, Azure, Verdant, Obsidian), four whip palettes (Ember, Frost, Blood, Prism), three effect trails (Ash Drift, Ember Wake, Moonlight Halo), and four sky themes (Courtyard Night, Blood Moon, Frostfall, Duke’s Belfry). Cosmetic keys only repaint the knight, whip, lantern glow, and backdrop; gameplay physics and hitboxes never change. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Light | defeat your first enemy | Common |
| Candle Lighter | break ten candles in one run | Common |
| Relentless Hunter | defeat 25 enemies in one run | Common |
| Candlelight Legend | score 10,000 in one run | Rare |
| Hollow Duke Slain | defeat the Hollow Duke | Rare |
| Personal Best | finish Story Hunt with a new best score | Rare |
| The Manor Is Silent | finish Story Hunt | Rare |
| Relic Keeper | finish Relic Hunt | Rare |
| Daily Cryptographer | finish the Daily Crypt | Rare |
| Untouched | clear a stage without taking damage | Epic |
| Iron Lantern | finish Story Hunt without losing a life | Epic |
| Lantern Sprint | finish Story Hunt in under six minutes | Epic |
| Nocturne Adept | finish Nocturne+ | Legendary |
| Duke’s Gauntlet | win all three duke duels | Legendary |

Each unlocks once under the `lanternbound` save id and sends one achievement event and one toast. Score targets respect the selected mode’s multiplier.

## Tutorial and controls

The four-step interactive tutorial teaches walking and jumping, the candle-breaking whip, axe ammo, and the three-stage win condition. Controls shown in the menu and during play: A/D or arrows walk, Space/↑/W/Z jump (hold for height), X/J whip, C/K throw axe, ↓+Jump drops through thin floors, P/M pause or mute.

Support keyboard and touch. Virtual controls stay below the canvas and away from hazards. Shared menus support gamepad focus and activation.

## Current baseline and scope

Canonical page: `13-castlevania/index.html`; `Arcade.game` save id is `lanternbound`. It builds the three stages with `act-kit` tile builders (112, 124, and 128 columns at 15 rows), plus three 40×15 gauntlet arenas. The knight has six hearts, three lives, five starting axe ammo, a 74 px whip that also deflects projectiles, and a piercing spinning axe. Candles (`i`) drop ammo, hearts, or coins; checkpoints (`C`) save progress; coins and relics add score. Enemies are ghouls, bats, drifting wraiths, and fixed turrets; the Hollow Duke floats, fires three-way volleys, and dashes. Stage gates (`F`) enforce relic counts and a living boss. `seedForToday()` hashes the local date with `lanternbound`; `dailySequence()` exposes the xorshift stream, and Daily Crypt replaces `Math.random` with that stream. `UI.mountGame` mounts the five modes, difficulty/shake/particle settings, 14 achievements, the four-step tutorial, and the cosmetic hook. Stats persist runs, seconds, kills, candles, deaths, highest stage, best score, last mode, bosses felled, per-mode completions, daily best, and best Story time. `?test=1` exposes `LanternboundTest` (state, daily sequence, world grid, mode/level control, boss damage, cosmetics, stats). The React theater engine (`ActionCombatEngine`, `castlevania` kit) mirrors three areas with wave combat, candle drops, whip/shot attacks, axe specials, a resource HUD, the Hollow Duke’s hover/dive/volley pattern, zone-complete callbacks, and READY/GAMEOVER/VICTORY overlays. Regression: `scripts/test-game-13.mjs`.

## Menu Identity Card

- **Archetype:** banner.
- **Mood:** Carry a small light through the haunted crypt.
- **Palette:** `#080d15` background, `color-mix(in srgb, #f59e0b 8%, rgba(15,22,35,.94))` panel, `#f59e0b` accent, `color-mix(in srgb, #f59e0b 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `lantern-frame` frame and `lantern-banner` button identity, using the shared banner treatment.
- **Scene recipe:** Original procedural lantern mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** A/D walk; Space jumps; X/J whips; C/K throws an axe.
- **Cosmetics:** 16 items across skins, whip palettes, effects, and crypt themes.
- **Lite fallback:** Static lantern composition with the title accent and scene silhouette.
