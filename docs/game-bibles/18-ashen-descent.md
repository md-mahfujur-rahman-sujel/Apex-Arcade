# Game 18 — Ashen Descent

## Pitch

Descend through three procedurally built biomes with one life, a dodge-roll that grants invulnerability, and weapon chests that swap your blade. Every run mixes new rooms, foes, and chest drops, then ends at the Warden’s gate. Five modes, persistent records, 14 achievements, and 16 cosmetics extend the roguelite loop without changing its core rules.

## Art direction

Preserve the ash-lit silhouettes, layered arches, ember motes, and readable room grammar on the canonical page. Use the game’s #FB923C routine accent for HUD and reward states while the front menu keeps its #fb7185 ember identity. Keep chests, gates, spikes, and enemy telegraphs distinct from the backdrop; never rely on colour alone for hazards. Lite and reduced-motion settings must reduce particles and shake without removing gameplay feedback.

## Modes and match structure

1. **Ashen Run:** the classic three-biome descent — Prisoner’s Quarter, Toxic Sewers, and The Warden’s Spire — at 6/7/6 procedural segments and 36 HP Warden. Clearing the final gate records a completion, best score, best time, and boss count.
2. **Daily Descent:** a local-day seed builds the same three biomes for everyone that day. The RNG stream resets at each biome build, so draw/update consumption cannot change the layout. Stores a separate daily best.
3. **Cursed Run:** chests still swap weapons but never heal, and the run pays 1.3× score. Clearing it unlocks Cursed Survivor.
4. **Warden Gauntlet:** three arena duels — Ash Gate, Sunken Ossuary, Warden Keep — each with a sleeping Warden and its own ash gate. Pays 1.4× score.
5. **Ashen+:** enemies gain 1.5× HP, 1.15× speed, and 1.5× rewards; the Warden fights at 54 HP and 3 damage. Pays 1.6× score. Locked behind an Ashen Run clear, with the menu hint `Finish the Ashen Run to unlock`.

A mode change resets the complete run through `init`, including score, weapons, chests, and the RNG override. Pause and resume preserve the in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× simulation speed; 1.0× score. |
| Normal | Preserve the source page’s baseline rules at 1.0× speed and score. |
| Hard | 1.35× simulation speed; 1.25× score. |
| Performance | Respect Lite, Standard, and Ultra budgets; preserve chest glow, gate, and boss telegraphs. |
| Reduced motion | Remove decorative shake and nonessential flashes; preserve input and game-state motion. |
| Audio and palette | Inherit global settings, allow per-game overrides, and keep enemy and hazard colours legible in colour-blind palettes. |

## Scoring

Every payout passes through `G.addScore`, so the selected mode multiplier and the hard-difficulty 1.25× scale the whole total. Base points: enemy kills 80–3000, coins 25, and the ash gate 500. The Warden pays a 3000 bounty. Completion bonuses are **Ashen Run 6000, Daily Descent 5000, Cursed Run 6500, Warden Gauntlet 8000, and Ashen+ 9000**. A clean test run that skips the gate therefore ends at 9000 (story), 8000 (daily), 12350 (cursed), and 21600 (Ashen+); the gauntlet combines two Warden bounties, one ash gate, and its bonus for 20300.

## Records

`Save.update('ashen-descent', { stats })` persists:

- `runs, seconds, kills, chests, deaths, highestStage, lastMode, bestScore, bossesFelled`
- `storyCompletions, dailyCompletions, noHealCompletions, bossRushCompletions, plusCompletions`
- `dailyBest, bestTimeSec`

`bestScore` is also mirrored by `Arcade.game` on every score gain and on win/over. The run recorder uses the best stored at run start so Personal Best unlocks on the first record-breaking finish.

## Cosmetics

16 cosmetics are registered across four slots:

- **Prisoner skins (5):** `prisoner` (default), `sentinel`, `alchemist`, `wraith`, `gilded`.
- **Blade palettes (4):** `blade-steel` (default), `blade-ember`, `blade-frost`, `blade-venom`.
- **Ash effects (4):** `ash-orange` (default), `ash-mint`, `ash-violet`, `ash-gold`.
- **Themes (3):** `theme-quarters`, `theme-sewers`, `theme-spire`, each overriding the backdrop sky.

Cosmetic ids resolve by exact suffix, so the `ashen-descent:` prefix never mis-maps a theme. Skins repaint cloth, trim, head, flame, and core; palettes tint the current weapon; effects tint roll ghosts, boss cores, gates, and chest sparks. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Blood | defeat your first enemy | Common |
| Arsenal | open three weapon chests in one run | Common |
| Room Clearer | defeat 25 enemies in one run | Common |
| Warden Slain | defeat the Warden | Rare |
| Ashen Descent | finish the Ashen Run | Rare |
| Daily Descent | finish a Daily Descent | Rare |
| Cursed Survivor | finish the Cursed Run | Epic |
| Three Doors | clear the Warden Gauntlet | Legendary |
| Ashen Adept | finish Ashen+ | Legendary |
| Quick Descent | finish the Ashen Run in under four minutes | Epic |
| Untouched | clear a biome without taking damage | Epic |
| Ash Legend | score 15,000 in one run | Epic |
| Personal Best | finish the Ashen Run with a new best score | Rare |
| Iron Heart | finish the Ashen Run with at least four health | Rare |

Unlock each once under the host game id and send one achievement event and one toast. Score targets respect the selected mode’s documented multiplier.

## Tutorial and controls

The game menu carries a four-step interactive tutorial: run and hold jump for height, swing with X and walk into chests to swap weapons, dodge-roll with Shift for invulnerability, and reach the gate then break the Warden. Controls shown in the menu and during play: arrows or A/D run, Space/↑/W/Z jump (hold for height), X/J attack, Shift/L dodge-roll (invulnerable), walk into a chest to swap, ↓+Jump drops through thin floors, P/M pause or mute.

Support keyboard and touch. Action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `18-dead-cells/index.html` (29.9 KB); `Arcade.game` save id is `ashen-descent`. The source is a single 800×480 canvas with a procedural room builder (start, flat, pit, steps, arena, chest, boss, end segments), five enemy types (`k` crawler, `v` flyer, `h` hopper, `u` archer, `B` Warden), six weapons, five modes, a four-step tutorial, 14 save-once achievements, 16 cosmetic catalog items across four slots, and adjustable difficulty/shake/particle settings.

The `?test=1` gate exposes `window.AshenTest`: `state`, `sequence`, `world`, `levelName`, `stageCount`, `setMode`, `restart`, `setDifficulty`, `award`, `cosmetic`, `colors`, `stats`, `goLevel`, `finishLevel`, `hurt`, `wakeBoss`, `damageBoss`, `killBoss`, `clearEnemies`, `teleport`, `spawn`, `setHp`, `enemyStats`, `gridAt`.

The 3D theater uses `ActionCombatEngine` with variant `deadcells`: three zones (Prisoner’s Quarter, Toxic Sewers, The Warden’s Spire), a 320 HP Warden, and the `DESCEND` start label. Its `?test=1` gate exposes `ActionCombatTest` with the shared action-combat state and helpers.

Regression coverage: `scripts/test-game-18.mjs` (`npm run test:game-18`) verifies daily layout and RNG determinism across sessions, Ashen+ locking, every mode’s score bonus and records, chest healing versus Cursed no-heal, the one-life death path, all 14 achievements, the 16 cosmetics and their colour mapping, the chrome-free play view, the extension-error reporter, and the three-zone theater flow.

## Menu Identity Card

- **Archetype:** banner.
- **Mood:** Descend through the ash and survive the next room.
- **Palette:** `#080d15` background, `color-mix(in srgb, #fb7185 8%, rgba(15,22,35,.94))` panel, `#fb7185` accent, `color-mix(in srgb, #fb7185 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `ember-frame` frame and `ember-banner` button identity, using the shared banner treatment.
- **Scene recipe:** Original procedural ember mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Modes shown:** Ashen Run, Daily Descent, Cursed Run, Warden Gauntlet, Ashen+ (locked until the Ashen Run is cleared).
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrows or WASD move; Space jumps; X attacks; Shift dodges; walk into chests to swap weapons.
- **Cosmetics:** 16 items across prisoner skins, blade palettes, ash effects, and biome themes.
- **Lite fallback:** Static ember composition with the title accent and scene silhouette.
