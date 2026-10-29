# Game 03 — Ember Serpent

## Pitch

Guide a growing ember serpent through a ten-level cavern run. Keep the immediate turn-and-eat loop, queued turns, optional wrap-around, timed bonus gems, and the switchable Ember/Classic looks; make the modes explain how long and how challenging a run will be.

## Art direction

Preserve the 25×16 grid and high-contrast fruit, rocks, and serpent. Ember uses a dark volcanic palette, orange-gold body, green fruit, and gold timed gems. Classic uses a calm dark garden board with a green serpent. Keep cell spacing legible on narrow screens; lower glow, trail particles, and shake on Lite and remove decorative pulsing under reduced motion.

## Modes

| Mode | Rules |
| --- | --- |
| Classic Run | Existing ten-level climb with six fruits per level, increasing speed and rocks, and the current wrap/wall choice. |
| Daily Route | Seeded level-one start with the same initial snake, fruit, bonus and obstacle sequence for the same local day. Show the daily seed and save that day's best. |
| Survival | Endless score run; continue increasing speed and obstacle pressure after level ten, with a saved personal best. |

The shared menu selects the mode before play. A restart resets the run to the selected mode's documented start state; pause/resume preserves the snake, queued turns, food timers, score and level.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Difficulty — Easy | 0.8× simulation speed, fewer rocks per level, and no bonus timer expiration. |
| Difficulty — Normal | Existing level speed curve, obstacle count and 540-tick bonus lifetime. |
| Difficulty — Hard | 1.35× simulation speed, one additional rock per level where space allows, and 1.25× score. |
| Wall style | Solid walls keep the existing 1.5× food score; wrap-around connects opposite edges and uses the normal food score. |
| Skin | Ember or Classic art; does not change collision, speed or scoring. |
| Particles / reduced motion | Use shared Perf tiers; reduced motion removes trail sparks, pulsing glows and camera shake without hiding turns or hazards. |
| Audio | Global music/SFX defaults apply until the game has a saved override. |

## Cosmetics

Eight cosmetics across serpent skin, palette, trail and board theme: Ember (default), Garden Serpent, Cinder Scale, Mooncoil, Sunstone Trail, Firefly Trail, Basalt Grid, and Moss Garden. Preserve body/head contrast and hazard visibility. Use shared Spark purchase and Save equip rules; equip persists after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Fruit | Eat a fruit. | Common |
| Bonus Bite | Collect a timed gem. | Common |
| Rock Runner | Clear level 3. | Rare |
| Furnace Climb | Clear level 5. | Rare |
| Serpent Supreme | Clear all ten Classic levels. | Epic |
| Board Clear | Fill every available cell without collision. | Legendary |
| Wall Tamer | Score 500 points with solid walls. | Epic |
| Daily Coil | Finish a Daily Route. | Rare |

Each unlock is unique per game and emits one achievement event and toast.

## Tutorial and controls

Guided tutorial: steer with arrows/WASD; queued turns allow one safe turn to be held; avoid the body and rocks; fruit grows the serpent; gold gems expire; T toggles walls/wrap, and K changes skin. Tutorial can be replayed from the menu and its completion is saved. Show the current keys and the selected wall style before play. Directional touch controls must provide all four directions without covering the grid.

## Current baseline and scope

The current page has one run, ten levels, an increasing speed curve, six fruits per level, up to 26 level rocks, timed bonus gems, wrap/wall scoring, persistent Ember/Classic skin, keyboard and touch-direction input, and authored canvas effects. It has no shared config-driven menu, three-mode selector, seeded Daily Route, endless Survival, cosmetics registry entries, achievement set, guided tutorial, or per-game settings page. The proposed additions are not shipped features. Keep collision and queued-turn behavior intact while integrating shared controls.

## Menu Identity Card

- **Archetype:** Banner Frame.
- **Mood:** A carved basalt passage warmed by drifting embers and one bright golden seed.
- **Palette:** `#120b13` background, `rgba(30,17,23,0.84)` panel, `#fb923c` accent, `#f6bd75` banner, `#32150f` banner text, `#fff4e8` body text.
- **Type:** System UI title and body fonts; the menu remains legible over the cavern scene.
- **Frame and buttons:** `basalt-arch` frame with `molten-facet` banners, distinct from Glowmoth's crystal corners and pale faceted buttons.
- **Scene recipe:** Layered volcanic ridges, a restrained orange glow, original curled serpent and golden fruit mark, and a small field of sparks. Lite and reduced-motion views hold a still frame.
- **Music and UI sounds:** Slow minor-key bass, pad and lead; shared tick, select and back cues.
- **Menu items:** Play, Options, About, Exit. No unimplemented mode, cosmetics or stats page is advertised.
- **Settings:** Shared audio, display, controls and accessibility options; shared difficulty setting.
- **Cosmetics:** No cosmetics page until the proposed cosmetics are implemented.
- **Lite fallback:** Static cavern composition with the serpent, fruit and ember field.
