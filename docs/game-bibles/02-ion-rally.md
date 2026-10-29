# Game 02 — Ion Rally

## Pitch

Two energy pilots race a comet across the Ion City arena. Keep the paddle angle skill, adaptive CPU and short rallies; turn the existing one-player and local two-player match into three clearly different ways to compete.

## Art direction

Keep the midnight synthwave skyline, cyan left paddle, warm right paddle, glassy blue court and reactive crowd lights. Preserve strong ball contrast against both sides of the table. Rally trails and goal flashes must stay brief and reduce cleanly on Lite and reduced motion. Do not add flashing full-screen effects.

## Modes and match structure

| Mode | Rules |
| --- | --- |
| Classic | Existing adaptive CPU or local two-player match; first to 7. |
| Rally Rush | One player against CPU; first to 5, faster serves, and a visible rally target. Award a mode result only when the target match is complete. |
| City Circuit | Three consecutive CPU opponents with distinct paddle speed, prediction accuracy and serve pace; win each match to advance. Save the highest circuit cleared. |

`Digit1`/`Digit2` remain Classic CPU/local-two-player shortcuts. Mode selection must also be reachable through the shared menu. Every mode restarts to a clean score, ball, rally and serve state. Seeded daily matches use the same serve sequence and CPU behavior for the same seed.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Difficulty — Easy | 0.8× simulation speed, slower CPU paddle movement, wider CPU prediction error, and a 1.0× score multiplier. |
| Difficulty — Normal | Existing baseline CPU movement and prediction behavior at 1.0× speed and score. |
| Difficulty — Hard | 1.35× simulation speed, quicker CPU reaction and tighter prediction error; 1.25× score multiplier. |
| Screen shake | Scale match and paddle-hit shake from 0 to 100%; zero removes camera shake. |
| Particles | Lite/Standard/Ultra map to the shared Perf budgets; ball visibility and score feedback remain intact in Lite. |
| Reduced motion | Stops crowd pulsing, ball trail animation and nonessential flashes; it does not change ball physics. |
| Audio | Music and SFX volumes inherit global settings unless a per-game override is saved. |

Pause, settings, restart and return must preserve or intentionally reset the exact match state as named. Pausing cannot change the serve countdown, score, rally, or CPU target.

## Cosmetics

Eight unlockable cosmetics across palette, paddle skin, ball trail and arena theme slots. Keep both player sides distinguishable after every equip. Proposed rewards: Ion Cyan (default), Magenta Pulse, Solar Gold, Jade Current, Prism Edge, Comet Tail, Starfield Table, and Rainlit Skyline. Costs and achievement gates are assigned in the shared registry; purchase is charged once and the selected item survives reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Serve | Complete the first rally. | Common |
| Clean Sweep | Win a Classic CPU match without conceding a point. | Epic |
| Long Rally | Reach an 8-hit rally. | Rare |
| Comet Run | Reach a 20-hit rally. | Epic |
| Edge Artist | Score from a steep paddle-edge return. | Rare |
| City Circuit | Clear all three City Circuit opponents. | Legendary |
| Daily Pilot | Complete a seeded Daily match. | Rare |
| Local Rivals | Finish a local two-player match. | Common |

Each unlock is recorded once under the host game id, with one toast and one achievement event.

## Tutorial and controls

Guided, replayable steps teach paddle movement, return angle, rally scoring and serving. Keyboard: W/S or Up/Down for the left paddle; player two uses Up/Down only in local mode, so local keyboard play uses W/S versus the arrows. Touch controls must offer a one-player paddle gesture and a reachable mode toggle; they must not cover the ball or the theater's launch control. Gamepad focus and activation work through every shared menu state.

## Current baseline and scope

The existing page implements a first-to-7 match, CPU and local two-player modes, adaptive CPU prediction, rally speed-up, keyboard controls, canvas touch arrows, screen shake, synthesized SFX, and an authored reactive arena. It does not yet implement these three mode entries in the Game Frame, the City Circuit campaign, a seeded daily mode, the eight-game cosmetic set, the eight achievements above, or the guided tutorial. The current `Arcade.game` call does not retain its return value; integration must capture the game object before mounting the shared frame. Do not claim the proposed features as shipped until implemented.

## Menu Identity Card

- **Archetype:** neon.
- **Mood:** Race a comet through the Ion City arena.
- **Palette:** `#080d15` background, `color-mix(in srgb, #38bdf8 8%, rgba(15,22,35,.94))` panel, `#38bdf8` accent, `color-mix(in srgb, #38bdf8 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `comet-frame` frame and `comet-banner` button identity, using the shared neon treatment.
- **Scene recipe:** Original procedural comet mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. No proposed modes or cosmetics are shown as available.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** W/S moves; arrows control player two in local play.
- **Lite fallback:** Static comet composition with the title accent and scene silhouette.
