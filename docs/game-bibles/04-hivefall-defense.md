# Game 04 — Hivefall Defense

## Pitch

Harbor Station is the last line between the descending Hive and the planet below. Pilot the lone defense craft, keep the bunkers intact as long as possible, and break the swarm before it reaches the surface. Preserve the readable fixed-shooter formation and short, deliberate firing cadence; build replay value through a compact sector campaign, an endless survival mode, and a deterministic daily siege.

## Art direction

Keep the 640×520 playfield and crisp formation silhouettes. Frame the arena as Harbor Station above a curved planet: layered indigo sky, restrained star parallax, cyan horizon grid, and four bright green destructible bunkers. The Hive has three clearly distinct ranks—violet jelly scouts, amber wasps, and jade drones—with two high-contrast eye pixels. Use cyan/blue for the player craft, gold for player fire, and separate green, violet, and red enemy shots by both hue and shape. Keep bullets and the player silhouette readable against every background. Use brief hit flashes and restrained particles; Lite reduces bursts and glow, while reduced motion removes shake, freeze and decorative pulses without obscuring hazards.

## Characters and story beats

The rookie defender answers the Harbor Station alarm as the Hive Queen's vanguard enters orbit. Clearing a sector pushes the formation back and reveals the next threat. The campaign ends with the Queen's carrier exposed above the planet; defeating it saves the station and unlocks the completed-campaign replay. Keep story beats short and skippable, with the action and wave callouts remaining the focus.

## Modes and progression

| Mode | Rules |
| --- | --- |
| Harbor Campaign | Three sectors of five waves, followed by a Hive Queen encounter. Preserve the current formation movement, alien ranks, saucer bonus, and destructible bunkers. Give a checkpoint after each sector; a lost life is still lost for the current encounter. |
| Endless Defense | Start with the standard three lives and survive an unbounded wave sequence. Increase formation speed, firing pressure, and enemy-shot variety in readable steps. Record the best wave and score locally. |
| Daily Siege | A seeded ten-wave run with a fixed starting formation, saucer schedule, and enemy-shot sequence for the local date. Save the daily best and show the seed on the result screen. |

Each mode starts from a clean state. Restarting a campaign resumes from its last sector checkpoint only when the player chooses Continue; Replay starts at sector one. Pause/resume preserves the formation, bunker damage, bullets, lives, saucer timer, and wave state.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Difficulty — Easy | Use the shared 0.8× simulation speed and normal score multiplier. |
| Difficulty — Normal | Use the shared 1.0× simulation speed and score multiplier. |
| Difficulty — Hard | Use the shared 1.35× simulation speed and 1.25× score multiplier. |
| Screen shake | Scale impact shake from 0 to 100%; zero disables camera shake. |
| Particles | Map Lite, Standard and Ultra to the shared performance budgets; never reduce projectile contrast or hit feedback. |
| Reduced motion | Remove shake, freeze frames, decorative pulsing and nonessential particle motion; keep formation and projectile motion intact. |
| Accessibility palette | Offer the shared colour-blind palettes and distinguish enemy shot types with shape as well as colour. |
| Audio | Inherit the global music and SFX defaults until the player saves per-game overrides. |

Keyboard remains A/D or Left/Right to move and held Space to fire. Touch uses the configured left/right and fire buttons; gamepad uses horizontal movement and the primary fire button. Keep P/Escape pause and M mute available, and prevent gameplay shortcuts from firing while a menu control has focus.

## Mutators

- **Fast Swarm:** formation and enemy projectile simulation advance 1.15× faster; score factor 1.1×.
- **Reinforced Hive:** each alien needs two hits, with a visible damage state; score factor 1.2×.

These are proposed run modifiers. Do not advertise them as supported until the game config can apply the modifier, include its factor in results, and persist the run result without changing the standard campaign.

## Cosmetics

Eight Tier A cosmetics across craft skin, projectile trail, shield appearance, and arena theme: Harbor Blue (default craft), Rescue Gold (craft), Sentinel Violet (craft), Comet Tail (projectile trail), Ion Wake (projectile trail), Verdant Shield (bunker palette), Moonlit Harbor (arena), and Dawn Patrol (arena). Keep craft, bullets, bunkers and enemy fire distinguishable in every combination. Use the shared Sparks/achievement purchase rules; purchases and equipped slots persist through reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Contact | Destroy one alien. | Common |
| Saucer Down | Hit a passing saucer. | Common |
| Bunker Keeper | Clear a campaign sector without losing a life. | Rare |
| Formation Breaker | Clear wave five in Harbor Campaign. | Rare |
| Last Craft Standing | Reach wave ten in Endless Defense. | Rare |
| Harbor Saved | Defeat the Hive Queen. | Epic |
| Untouched Orbit | Clear a full campaign without losing a life. | Legendary |
| Daily Defender | Complete a Daily Siege. | Rare |

Unlock each once, save it under the host game id, and emit one achievement event and one toast. The game page's internal save id remains `hivefall`; the shared host identity is `space-invaders`.

## Tutorial

Guided tutorial steps: move left and right; hold fire while respecting the two-shot limit; use bunkers as cover while remembering both sides of a bunker can erode; identify the three alien ranks and their shot shapes; shoot the saucer for a variable bonus; and avoid letting the formation reach the ground. Let players replay or skip the tutorial. Save completion and show keyboard, touch, and gamepad controls in the menu and during play.

## Current baseline and scope

The current page uses `Arcade.game` id `hivefall`, a 640×520 canvas, ten waves of 50 aliens, three lives, four destructible bunkers, a two-player-shot cap, rank-dependent points, an extra life for each 1,500 points, a variable saucer bonus, three enemy projectile types, and win/loss states. It loads `perf-kit.js`, `save-kit.js`, `meta-config.js`, `meta-kit.js`, `arcade-core.js`, `score-bridge.js`, and `ui-kit.js`, in that order. The current game has no `UI.mountGame` config, mode selector, campaign checkpoints, Endless Defense, seeded Daily Siege, Hive Queen encounter, cosmetics catalog, eight-achievement set, or guided tutorial. Those are proposals, not shipped features. Preserve formation movement, bunker erosion, firing cadence, score/life rules, and current keyboard/touch play while integrating the shared frame.

## Menu Identity Card

- **Archetype:** machine.
- **Mood:** Hold the line against the descending swarm.
- **Palette:** `#080d15` background, `color-mix(in srgb, #fbbf24 8%, rgba(15,22,35,.94))` panel, `#fbbf24` accent, `color-mix(in srgb, #fbbf24 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `hive-frame` frame and `hive-banner` button identity, using the shared machine treatment.
- **Scene recipe:** Original procedural hive mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. No proposed modes or cosmetics are shown as available.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** A/D or Left/Right aims; hold Space to fire.
- **Lite fallback:** Static hive composition with the title accent and scene silhouette.
