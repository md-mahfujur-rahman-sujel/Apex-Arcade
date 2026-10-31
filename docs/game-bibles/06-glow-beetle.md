# Game 06 — Glow Beetle

## Pitch

Guide a glowing beetle through a fixed neon maze, clear every seed, time power cores against four drones with distinct targeting habits, and survive level-by-level speed increases. The current page already has wrapped tunnels, bonus gems, lives, and six changing maze palettes.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #84CC16 accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Classic Maze:** preserve the existing maze, four drones, power cores, bonus gems, lives, and increasing levels.
2. **Sector Campaign:** five authored maze sectors. Preserve remaining lives between sectors; checkpoint at each sector and save the highest sector reached.
3. **Daily Circuit:** fixed maze, drone release schedule, and gem sequence for the local day; save one daily best.
4. **Last Light:** one life, no extra-life awards, and faster drone pressure; score multiplier 1.25×.

A mode change must reset only the state named by that mode. Pause and resume preserve the complete in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× beetle and drone movement speed; retain the normal three lives and 1.0× score. |
| Normal | Existing speed curves, drone release schedule, lives, and score. |
| Hard | 1.35× drone speed and shorter scatter periods; 1.25× score. |
| Screen shake and particles | Persist impact shake and particle budget without reducing seed or drone contrast. |
| Reduced motion | Remove maze flash, camera shake, and decorative glow pulsing; leave movement and collision readable. |
| Accessibility | Offer semantic palette variants and a distinct shape/outline for frightened drones; retain global audio settings. |

## Cosmetics

Plan 15 cosmetics across palette, board/craft/object skin, effects, and scene/theme slots as applicable to this game. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Seed | Eat one maze seed. | Common |
| Core Charge | Eat a power core. | Common |
| Drone Tamer | Tag one frightened drone. | Common |
| Gem Hunter | Collect a bonus gem. | Rare |
| Combo Four | Tag four drones during one power window. | Epic |
| Clean Sector | Clear a level without losing a life. | Rare |
| Deep Descent | Reach level 5. | Rare |
| Daily Glow | Finish a Daily Circuit. | Rare |
| Last Light | Clear a sector in Last Light. | Epic |
| Beetle Legend | Complete Sector Campaign. | Legendary |

Unlock each once under the host game id and send one achievement event and one toast. Score targets must respect the selected mode’s documented multiplier.

## Tutorial and controls

Use a replayable interactive tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: Arrow keys or WASD to steer (turns can be pre-queued).

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `06-pac-man/index.html`; `Arcade.game` save id is `glow-beetle`. The page already implements a fixed 21×23 maze, 3 lives, four individually targeted drones, scatter/chase timing, frightened state and combo captures, side tunnels, timed bonus gems, 10,000-point extra lives, six hue-shifted levels, and win/loss states. It has no `UI.mountGame` config. Keyboard arrows/WASD steer with turn buffering; touch uses four direction buttons. The modes, 15 cosmetics, and 10 achievements above remain rollout proposals; seed the randomized frightened-drone choices and gem schedule for Daily Circuit.

## Menu Identity Card

- **Archetype:** crt.
- **Mood:** Light every corridor and outpace the sentries.
- **Palette:** `#080d15` background, `color-mix(in srgb, #a3e635 8%, rgba(15,22,35,.94))` panel, `#a3e635` accent, `color-mix(in srgb, #a3e635 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `beetle-frame` frame and `beetle-banner` button identity, using the shared crt treatment.
- **Scene recipe:** Original procedural beetle mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. No proposed modes or cosmetics are shown as available.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrow keys or WASD move through the maze.
- **Lite fallback:** Static beetle composition with the title accent and scene silhouette.
