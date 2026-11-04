# Game 19 — Lumen Sprite

## Pitch

Carry a wisp of light through three dark glades, collecting charm pickups that unlock double jump and the light dash while the shadows pile up behind you. Five modes, persistent records, 14 achievements, and 16 cosmetics deepen the route without changing its readable loop.

## Art direction

Preserve the glowing sprite, layered tree silhouettes, drifting motes, gold-rimmed platforms, and the rising-dark vignette on the canonical page. Use the game's #FDE68A routine accent for HUD and reward states while the front menu keeps its #f0abfc spirit identity. Keep charms, motes, spike beds, and enemy telegraphs distinct from the backdrop; never rely on colour alone for hazards. Lite and reduced-motion settings must reduce particles and shake without removing gameplay feedback.

## Modes and match structure

1. **Lumen Run:** the classic three-glade route — Whispering Grove, Hollow of Echoes, and The Rising Dark — at 5 HP and 3 lives. Clearing the final gate records a completion, best score, best time, and charm count.
2. **Daily Glade:** a local-day seed scatters coins and extra motes through all three glades. The RNG stream resets at each glade build, so draw/update consumption cannot change the layout. Stores a separate daily best.
3. **Nightfall Rush:** shadows rise in every glade, and the tower climbs at 0.7 speed with a 90-frame head start. Pays 1.3× score.
4. **Mote Hunt:** each gate demands 6, 6, and 5 motes before it opens. Pays 1.2× score.
5. **Radiant+:** enemies gain 1.5× HP, 1.15× speed, and 1.5× rewards; the run pays 1.6× score. Locked behind a Lumen Run clear, with the menu hint `Finish the Lumen Run to unlock`.

A mode change resets the complete run through `init`, including score, charms, motes, lives, and the RNG override. Pause and resume preserve the in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× simulation speed; 1.0× score. |
| Normal | Preserve the source page's baseline rules at 1.0× speed and score. |
| Hard | 1.35× simulation speed; 1.25× score. |
| Performance | Respect Lite, Standard, and Ultra budgets; preserve charm glow, gates, and rising-dark telegraphs. |
| Reduced motion | Remove decorative shake and nonessential flashes; preserve input and game-state motion. |
| Audio and palette | Inherit global settings, allow per-game overrides, and keep hazards legible in colour-blind palettes. |

## Scoring

Every payout passes through `G.addScore`, so the selected mode multiplier and the hard-difficulty 1.25× scale the whole total. Base points: enemy kills 80–120, coins 25, motes 200 each, and the gate 500. Completion bonuses are **Lumen Run 6000, Daily Glade 5000, Nightfall Rush 6500, Mote Hunt 5500, and Radiant+ 8000**. A test run that skips motes and gates therefore ends at 6000 (story), 5000 (daily), 8450 (nightfall), 6600 (mote hunt), and 12800 (Radiant+).

## Records

`Save.update('lumen-sprite', { stats })` persists:

- `runs, seconds, kills, charms, deaths, highestStage, lastMode, bestScore`
- `storyCompletions, dailyCompletions, nightCompletions, moteCompletions, plusCompletions`
- `dailyBest, bestTimeSec`

`bestScore` is also mirrored by `Arcade.game` on every score gain and on win/over. The run recorder uses the best stored at run start so Personal Best unlocks on the first record-breaking finish.

## Cosmetics

16 cosmetics are registered across four slots:

- **Sprite skins (5):** `spirit-ivory` (default), `spirit-jade`, `spirit-sky`, `spirit-rose`, `spirit-violet`.
- **Flare palettes (4):** `flare-gold` (default), `flare-mint`, `flare-sky`, `flare-rose`.
- **Trail effects (4):** `trail-gold` (default), `trail-mint`, `trail-violet`, `trail-rose`.
- **Themes (3):** `theme-grove`, `theme-echo`, `theme-tower`, each overriding the backdrop sky.

Cosmetic ids resolve by exact suffix, so the `lumen-sprite:` prefix never mis-maps a theme. Skins repaint body, glow, and eyes; palettes tint the flare and charm icons; effects tint dash ghosts and light trails. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Glow | defeat your first creature | Common |
| Grove Warden | defeat 10 creatures in one run | Common |
| Charm Hunter | hold the Leaf and Star Charms in one run | Rare |
| Lumen Run | finish the Lumen Run | Rare |
| Daily Glade | finish a Daily Glade | Rare |
| Nightfall Survivor | finish Nightfall Rush | Epic |
| Mote Gatherer | finish Mote Hunt | Rare |
| Radiant Adept | finish Radiant+ | Legendary |
| Swift Light | finish the Lumen Run in under five minutes | Epic |
| Untouched | finish a run without taking damage | Epic |
| Lightbringer | score 12,000 in one run | Epic |
| Personal Best | finish the Lumen Run with a new best score | Rare |
| Full Heart | finish the Lumen Run at full health | Rare |
| Spirit Bound | finish the Lumen Run without either charm | Legendary |

Unlock each once under the host game id and send one achievement event and one toast. Score targets respect the selected mode's documented multiplier.

## Tutorial and controls

The game menu carries a four-step interactive tutorial: run and jump through the grove, collect the Leaf Charm for double jump and the Star Charm for the light dash, flare with X to clear creatures, and climb the rising dark to the gate. Controls shown in the menu and during play: arrows or A/D run, Space/↑/W/Z jump (double jump after the Leaf Charm), X/J flare, Shift/L light dash (after the Star Charm), land on creatures to bounce, P/M pause or mute.

Support keyboard and touch. Action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `19-ori/index.html` (27.5 KB); `Arcade.game` save id is `lumen-sprite`. The source is a single 800×480 canvas with three hand-built levels (Whispering Grove 110×15, Hollow of Echoes 120×15, The Rising Dark 25×40), four enemy types (`k` walker, `v` flyer, `h` hopper, `u` turret), two charm pickups, mote gates, a rising-dark level, five modes, a four-step tutorial, 14 save-once achievements, 16 cosmetic catalog items across four slots, and adjustable difficulty/shake/particle settings.

The `?test=1` gate exposes `window.LumenTest`: `state`, `sequence`, `world`, `levelName`, `stageCount`, `setMode`, `restart`, `setDifficulty`, `award`, `cosmetic`, `colors`, `stats`, `goLevel`, `finishLevel`, `hurt`, `clearEnemies`, `teleport`, `spawn`, `setHp`, `setTokens`, `need`, `enemyStats`, `gridAt`.

The 3D theater uses `PrecisionPlatformerEngine` with variant `ori`: three stages (Sunken Glades, Ginso Tree, Spirit Willow), seven Light Orbs per stage (21 total), and the `START STAGE` label. Its `?test=1` gate exposes `PrecisionTest` with `state`, `start`, `setStage`, `reachGoal`, `collectAll`, and `setScore`; the victory screen reads `Nibel Restored!`.

Regression coverage: `scripts/test-game-19.mjs` (`npm run test:game-19`) verifies daily layout and RNG determinism across sessions, Radiant+ locking, every mode's score bonus and records, charm pickup and gate behaviour, the rising-dark tower, the three-life death path, all 14 achievements, the 16 cosmetics and their colour mapping, the chrome-free play view, the extension-error reporter, and the three-stage theater flow.

## Menu Identity Card

- **Archetype:** glass.
- **Mood:** Find the soft light hidden beyond the forest.
- **Palette:** `#080d15` background, `color-mix(in srgb, #f0abfc 8%, rgba(15,22,35,.94))` panel, `#f0abfc` accent, `color-mix(in srgb, #f0abfc 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `spirit-frame` frame and `spirit-banner` button identity, using the shared glass treatment.
- **Scene recipe:** Original procedural spirit mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Modes shown:** Lumen Run, Daily Glade, Nightfall Rush, Mote Hunt, Radiant+ (locked until the Lumen Run is cleared).
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrows or WASD move; Space jumps; X flares; Shift dashes after the Star Charm; land on creatures to bounce.
- **Cosmetics:** 16 items across sprite skins, flare palettes, trail effects, and glade themes.
- **Lite fallback:** Static spirit composition with the title accent and scene silhouette.
