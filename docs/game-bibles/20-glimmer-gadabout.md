# Game 20 — Glimmer Gadabout

## Pitch

Hop a paper-bright rhythm platformer across three musical stages: hair-glide over gaps, punch with floating fists, and time the beat-synced spike pads. Five modes, persistent records, 14 achievements, and 16 cosmetics extend the show without changing its readable rhythm loop.

## Art direction

Preserve the candy sky, paper bubbles, layered ridges, glowing sparks, and beat-pulsing pads on the canonical page. Use the game's #F97316 routine accent for HUD and reward states while the front menu keeps its #f472b6 storybook identity. Keep sparks, spikes, gates, and enemy telegraphs distinct from the backdrop; never rely on colour alone for hazards. Lite and reduced-motion settings must reduce particles and shake without removing the beat feedback.

## Modes and match structure

1. **On Stage:** the classic three-stage route — Drumline Meadow, Neon Reef, and Candy Chasm — at 4 HP and 3 lives, with the hair glide available throughout. Clearing the final gate records a completion, best score, and best time.
2. **Daily Encore:** a local-day seed scatters coins and extra sparks through all three stages. The RNG stream resets at each stage build, so draw/update consumption cannot change the layout. Stores a separate daily best.
3. **Grounded Run:** the hair glide is removed for the whole run; clear everything with jumps, punches, and bounces. Pays 1.3× score.
4. **Every Spark:** fixed extra sparks appear in every stage and each gate demands all of them — 14 in the meadow, 17 in the reef, and 12 in the chasm. Pays 1.2× score.
5. **Glimmer+:** enemies gain 1.5× HP, 1.15× speed, and 1.5× rewards; the run pays 1.6× score. Locked behind an On Stage clear, with the menu hint `Finish the On Stage run to unlock`.

A mode change resets the complete run through `init`, including score, sparks, lives, and the RNG override. Grounded Run strips the glide after each respawn as well as at the start. Pause and resume preserve the in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× simulation speed; 1.0× score. |
| Normal | Preserve the source page's baseline rules at 1.0× speed and score. |
| Hard | 1.35× simulation speed; 1.25× score. |
| Performance | Respect Lite, Standard, and Ultra budgets; preserve spark glow, gates, and beat dots. |
| Reduced motion | Remove decorative shake and nonessential flashes; preserve input and game-state motion. |
| Audio and palette | Inherit global settings, allow per-game overrides, and keep hazards legible in colour-blind palettes. |

## Scoring

Every payout passes through `G.addScore`, so the selected mode multiplier and the hard-difficulty 1.25× scale the whole total. Base points: enemy kills 80–120, coins 25, sparks 200 each, and the gate 500. Completion bonuses are **On Stage 6000, Daily Encore 5000, Grounded Run 6500, Every Spark 5500, and Glimmer+ 8000**. A test run that skips sparks and gates therefore ends at 6000 (story), 5000 (daily), 8450 (grounded), 6600 (Every Spark), and 12800 (Glimmer+).

## Records

`Save.update('glimmer-gadabout', { stats })` persists:

- `runs, seconds, kills, sparks, deaths, highestStage, lastMode, bestScore`
- `storyCompletions, dailyCompletions, groundedCompletions, sparkCompletions, plusCompletions`
- `dailyBest, bestTimeSec`

`bestScore` is also mirrored by `Arcade.game` on every score gain and on win/over. The run recorder uses the best stored at run start so Personal Best unlocks on the first record-breaking finish.

## Cosmetics

16 cosmetics are registered across four slots:

- **Gadabout skins (5):** `gad-rose` (default), `gad-mint`, `gad-sky`, `gad-grape`, `gad-candy`.
- **Fist palettes (4):** `punch-amber` (default), `punch-lime`, `punch-sky`, `punch-rose`.
- **Trail effects (4):** `trail-gold` (default), `trail-mint`, `trail-violet`, `trail-rose`.
- **Themes (3):** `theme-meadow`, `theme-reef`, `theme-chasm`, each overriding the backdrop sky.

Cosmetic ids resolve by exact suffix, so the `glimmer-gadabout:` prefix never mis-maps a theme. Skins repaint shirt, head, hair, and eyes; palettes tint the floating fists and punch trail; effects tint the air trail behind jumps and glides. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Punch | defeat your first creature | Common |
| Crowd Pleaser | defeat 10 creatures in one run | Common |
| Showstopper | defeat 18 creatures in one run | Epic |
| Spark Hoarder | collect 15 sparks in one run | Rare |
| Standing Ovation | finish the On Stage run | Rare |
| Daily Encore | finish a Daily Encore | Rare |
| Feet On The Ground | finish Grounded Run | Epic |
| Every Spark | finish Every Spark | Rare |
| Glimmer Adept | finish Glimmer+ | Legendary |
| Encore Timing | finish the On Stage run in under five minutes | Epic |
| Untouched | finish a run without taking damage | Epic |
| Glimmer Legend | score 12,000 in one run | Epic |
| Personal Best | finish the On Stage run with a new best score | Rare |
| Full Heart | finish the On Stage run at full health | Rare |

Unlock each once under the host game id and send one achievement event and one toast. Score targets respect the selected mode's documented multiplier.

## Tutorial and controls

The game menu carries a four-step interactive tutorial: run and jump, hold jump in the air to hair-glide, punch through creatures and spike pads, then collect every spark and reach the gate. Controls shown in the menu and during play: arrows or A/D run, Space/↑/W/Z jump (hold in the air to glide), X/J punch, land on creatures to bounce, watch the beat dots before crossing red pads, P/M pause or mute.

Support keyboard and touch. Action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `20-rayman/index.html` (28.3 KB); `Arcade.game` save id is `glimmer-gadabout`. The source is a single 800×480 canvas with three hand-built levels (Drumline Meadow 120×15, Neon Reef 130×15, Candy Chasm 112×15), four enemy types (`k` walker, `v` flyer, `h` hopper, `u` turret), beat-synced spike pairs, sparks and gates, five modes, a four-step tutorial, 14 save-once achievements, 16 cosmetic catalog items across four slots, and adjustable difficulty/shake/particle settings. The meadow's coin line no longer overwrites its eighth spark, so the base eight-spark gate is reachable.

The `?test=1` gate exposes `window.GlimmerTest`: `state`, `sequence`, `world`, `levelName`, `stageCount`, `setMode`, `restart`, `setDifficulty`, `award`, `cosmetic`, `colors`, `stats`, `goLevel`, `finishLevel`, `hurt`, `clearEnemies`, `teleport`, `spawn`, `setHp`, `setTokens`, `need`, `grabSparks`, `enemyStats`, `gridAt`.

The 3D theater uses `PrecisionPlatformerEngine` with variant `rayman`: three stages (Dream Forest, Band Land, Candy Chasm), seven Lums per stage (21 total), and the `START STAGE` label. Its `?test=1` gate exposes `PrecisionTest` with `state`, `start`, `setStage`, `reachGoal`, `collectAll`, and `setScore`; the victory screen reads `Dream Worlds Freed!`.

Regression coverage: `scripts/test-game-20.mjs` (`npm run test:game-20`) verifies daily layout and RNG determinism across sessions, Glimmer+ locking, every mode's score bonus and records, the grounded no-glide rule, Every Spark gate requirements, spark stacking, the three-life death path, all 14 achievements, the 16 cosmetics and their colour mapping, the chrome-free play view, the extension-error reporter, and the three-stage theater flow.

## Menu Identity Card

- **Archetype:** storybook.
- **Mood:** Follow the rhythm through a paper-bright adventure.
- **Palette:** `#080d15` background, `color-mix(in srgb, #f472b6 8%, rgba(15,22,35,.94))` panel, `#f472b6` accent, `color-mix(in srgb, #f472b6 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `lute-frame` frame and `lute-banner` button identity, using the shared storybook treatment.
- **Scene recipe:** Original procedural lute mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Modes shown:** On Stage, Daily Encore, Grounded Run, Every Spark, Glimmer+ (locked until the On Stage run is cleared).
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrows or A/D move; Space jumps, hold to glide; X punches; land on creatures to bounce; collect sparks to open the gate.
- **Cosmetics:** 16 items across gadabout skins, fist palettes, trail effects, and stage themes.
- **Lite fallback:** Static lute composition with the title accent and scene silhouette.
