# Game 17 — Stormcap Showdown

## Pitch

Duel Mama Thundercloud in a one-on-one cartoon boss fight: shoot, dash through danger, and jump-parry pink projectiles to charge a super. The storm runs three phases and shifts its rain, bolts, and charge attacks as its health falls. Five modes, persistent records, 14 achievements, and 16 cosmetics extend the duel without changing the fight’s core rules.

## Art direction

Preserve the hand-inked background, cloud silhouette, and animation on the canonical page. Use the game’s #F87171 accent for menu and reward states while the front menu keeps its neon #FDE047 identity. Keep projectiles, parry shots, and hazards distinct from the sky; never rely on colour alone for danger. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Stormcap Showdown:** the classic three-phase duel at 360 HP. Ending the fight records a completion, best grade, best time, and score.
2. **No-Hit Duel:** one touch ends the duel, and the win pays 1.5× score. A failed first hit drops the hearts to zero immediately.
3. **Parry Rush:** pink shots arrive twice as often (every 70 frames instead of 130) and each parry adds 150 to the victory bonus; 1.2× score.
4. **Daily Squall:** a local-day seed selects a fixed time target (`90 + seed % 61` seconds). Retries that day keep the same seed and target and store a separate daily best.
5. **Thunder Gauntlet:** three storms in a row at `240 + round × 60` HP (300/360/420), healing one heart between rounds; 1.4× score. Locked behind a Stormcap Showdown clear, with the menu hint `Clear Stormcap Showdown to unlock`.

A mode change resets the complete run through `init`. Pause and resume preserve the in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× simulation speed; 1.0× score. |
| Normal | Preserve the source page’s baseline rules at 1.0× speed and score. |
| Hard | 1.35× simulation speed; 1.25× score. |
| Performance | Respect Lite, Standard, and Ultra budgets; preserve rain, bolt, and parry telegraphs. |
| Reduced motion | Remove decorative shake and nonessential flashes; preserve input and game-state motion. |
| Audio and palette | Inherit global settings, allow per-game overrides, and keep parry shots legible in colour-blind palettes. |

## Scoring

A finished duel scores `round(max(0, verdict)) × 20 + hearts × 300` plus the mode bonus, then the whole payout is scaled by the mode multiplier (1.0 Story/Daily, 1.5 No-Hit, 1.2 Parry Rush, 1.4 Gauntlet). The verdict is `100 − hits × 17 + parries × 3 − max(0, floor(seconds) − 75) × 2`. Grades: S at 96+, A at 80+, B at 60+, C below. Mode bonuses: Story `max(0, 6000 − seconds × 40 − hits × 600)`, No-Hit 8000, Parry Rush `parries × 150`, Daily `max(0, target − seconds) × 30`, and Gauntlet `6500 + (round − 1) × 1500`.

## Records

`Save.update('stormcap-showdown', { stats })` persists:

- `runs, seconds, hits, parries, highestRound, lastMode, bestScore, bestGrade, bestTimeSec`
- `storyCompletions, noHitCompletions, parryCompletions, dailyCompletions, gauntletCompletions`
- `dailyBest`

`bestScore` is also mirrored by `Arcade.game` on every score gain. The run recorder compares against the best stored at run start so Personal Best unlocks on the first record-breaking finish.

## Cosmetics

16 cosmetics are registered across four slots:

- **Kettle skins (5):** `kettle-crimson` (default), `kettle-blue`, `kettle-jade`, `kettle-gold`, `kettle-violet`.
- **Shot palettes (4):** `shot-ivory` (default), `shot-sky`, `shot-gold`, `shot-mint`.
- **Parry effects (4):** `parry-rose` (default), `parry-mint`, `parry-gold`, `parry-sky`.
- **Themes (3):** `theme-inkwell` (default), `theme-storm`, `theme-sunset`.

Cosmetic ids resolve by exact suffix, so the `stormcap-showdown:` prefix never mis-maps a theme. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| Counterpunch | parry a pink shot | Common |
| Storm Charge | use the super | Rare |
| Eye of the Storm | reach the third phase | Rare |
| Showdown Won | finish Stormcap Showdown | Rare |
| Perfect Storm | finish No-Hit Duel | Epic |
| Parry Rush Cleared | finish Parry Rush | Rare |
| Daily Forecaster | finish Daily Squall | Rare |
| Three Storms | finish Thunder Gauntlet | Legendary |
| S-Rank Showdown | finish any duel with an S grade | Epic |
| Untouched Thunder | finish with an S grade and no hits | Legendary |
| Quick Draw | finish a duel in under a minute | Rare |
| Parry Master | land ten parries in one run | Epic |
| Untouchable | finish with all three hearts | Rare |
| Personal Best | finish with a new best score | Rare |

Unlock each once under the host game id and send one achievement event and one toast. Score targets respect the selected mode’s documented multiplier.

## Tutorial and controls

The game menu carries a four-step interactive tutorial: hold a direction to run and jump higher, hold X to shoot and Shift to dash, jump again beside a pink shot to parry and charge the super, and press C at full meter to unleash the super. Controls shown in the menu and during play: arrows or A/D run, Space/↑/W/Z jump (hold for height), X/J shoot, Shift/L dash, C/K super, P/M pause or mute.

Support keyboard and touch. Action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `17-cuphead/index.html` (28.4 KB); `Arcade.game` save id is `stormcap-showdown`. The source is a single 800×480 arena with two platforms, a three-phase cloud boss (rain, aimed sparks, pink orbs, telegraphed bolts, and a charging sweep), a parry/super loop, and a grade card. The Game Frame offers Stormcap Showdown, No-Hit Duel, Parry Rush, Daily Squall, and Thunder Gauntlet, with the gauntlet gated on a story clear. The menu also carries the tutorial, 14 save-once achievements, 16 cosmetic catalog items across four slots, and adjustable difficulty/shake/particle settings.

The `?test=1` gate exposes `window.StormcapTest`: `state`, `setMode`, `restart`, `setDifficulty`, `award`, `cosmetic`, `colors`, `stats`, `skipIntro`, `killBoss`, `damageBoss`, `setParries`, `setTimeSec`, `setHp`, `fillMeter`, `useSuper`, and `hurt`.

The 3D theater uses `ActionCombatEngine` with variant `cuphead`: three zones (Inkwell Shore, Cloudtop Climb, Thunderhead Arena), a 360 HP Mama Thundercloud, and the `TAKE THE STAGE` start label. Its `?test=1` gate exposes `ActionCombatTest` with the shared action-combat state and helpers.

Regression coverage: `scripts/test-game-17.mjs` (`npm run test:game-17`) verifies daily determinism, gauntlet locking and all three rounds, every mode’s scoring and records, all 14 achievements, the 16 cosmetics and their colour mapping, the chrome-free play view, the extension-error reporter, and the three-zone theater flow.

## Menu Identity Card

- **Archetype:** neon.
- **Mood:** Read the storm and strike when the opening appears.
- **Palette:** `#080d15` background, `color-mix(in srgb, #fde047 8%, rgba(15,22,35,.94))` panel, `#fde047` accent, `color-mix(in srgb, #fde047 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `storm-frame` frame and `storm-banner` button identity, using the shared neon treatment.
- **Scene recipe:** Original procedural storm mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Modes shown:** Stormcap Showdown, No-Hit Duel, Parry Rush, Daily Squall, Thunder Gauntlet (locked until Stormcap Showdown is cleared).
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrows or WASD move; Space jumps; X shoots; Shift dashes; C supers; jump again beside a pink shot to parry.
- **Cosmetics:** 16 items across kettle skins, shot palettes, parry effects, and storm themes.
- **Lite fallback:** Static storm composition with the title accent and scene silhouette.
