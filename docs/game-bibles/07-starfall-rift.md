# Game 07 — Starfall Rift

## Pitch

Pilot an inertial ship through a wraparound field, split three asteroid sizes, dodge aimed saucer fire, and combine shield, rapid-fire, triple-shot, and hyperspace pickups. Waves rise from four rocks to a ten-rock cap; each 10,000 points grants another ship.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #60A5FA accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Classic Orbit:** preserve endless waves, three starting ships, all pickups, and an extra ship every 10,000 points.
2. **Wave Rush:** survive five waves with a single life and no extra-ship awards; save the best score and wave.
3. **Daily Rift:** seeded asteroid formations, pickup drops, and saucer schedule for the local day; keep the same seed on retries and save a daily best.
4. **Rift Campaign:** five sectors of three waves each. Award a checkpoint after each sector and save the highest sector reached.

A mode change must reset only the state named by that mode. Pause and resume preserve the complete in-progress state. Daily seeds use the local date and produce the same starting state for every retry that day.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× world, projectile, and saucer simulation speed; normal three ships and 1.0× score. |
| Normal | Existing speed, collision, pickup, and extra-ship rules. |
| Hard | 1.35× simulation speed, narrower saucer aim error, and 1.25× score. |
| Screen shake and particles | Persist shake strength and map particle counts to Lite/Standard/Ultra budgets; retain hit and pickup cues. |
| Reduced motion | Remove camera shake, large rings, and decorative star parallax; keep ship and hazard movement unchanged. |
| Accessibility and audio | Keep ship, player shots, enemy shots, and pickups distinct by shape/outline as well as colour; inherit global audio. |

## Cosmetics

The registry contains 15 Starfall Rift cosmetics: four ship skins, four shot palettes, four thrust trails, and three starfield themes. Keep player and saucer shots distinguishable. Cosmetic choices never affect movement or collision; purchases use Sparks and persist after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Fracture | Break an asteroid. | Common |
| Raider Down | Destroy a saucer. | Common |
| Emergency Jump | Use hyperspace once. | Common |
| Salvage Crew | Collect a power-up. | Common |
| Triple Threat | Destroy a rock with triple shot active. | Rare |
| Wave Five | Clear wave 5. | Rare |
| Untouched Sector | Clear a wave without losing a ship. | Rare |
| Daily Navigator | Complete a Daily Rift run. | Rare |
| Rift Campaign | Clear all five campaign sectors. | Epic |
| Deep Space Ace | Reach wave 20 in Classic Orbit. | Legendary |

Unlock each once under the host game id and send one achievement event and one toast. Score targets must respect the selected mode’s documented multiplier.

## Tutorial and controls

Use a replayable interactive tutorial. Teach the primary objective, legal input, one recovery or strategy tip, and the end condition. Controls shown in the menu and during play: Left/Right rotate, Up thrust, Space fire, Shift hyperspace.

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `07-asteroids.html`; `Arcade.game` save id is `starfall-rift`. The page implements 800×520 wraparound inertial flight, three asteroid sizes with splitting, three starting ships, saucers from wave 2, aimed enemy bullets, shield/rapid/triple pickups, hyperspace cooldown, and an extra ship every 10,000 points. The Game Frame config adds Classic Orbit, one-life Wave Rush, seeded five-wave Daily Rift, and a five-sector checkpointed Campaign, plus the achievements and cosmetics above. Controls are A/D or arrows to rotate, W/up to thrust, held Space to fire, and Shift/X to hyperspace; the touch pad currently omits hyperspace. Gameplay randomness in Daily Rift uses a local seeded generator; decorative stars remain outside the seed. Source-level implementation is present; runtime acceptance is pending.

## Menu Identity Card

- **Archetype:** neon.
- **Mood:** Thread the rift and survive the debris field.
- **Palette:** `#080d15` background, `color-mix(in srgb, #a78bfa 8%, rgba(15,22,35,.94))` panel, `#a78bfa` accent, `color-mix(in srgb, #a78bfa 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `asteroid-frame` frame and `asteroid-banner` button identity, using the shared neon treatment.
- **Scene recipe:** Original procedural asteroid mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. No proposed modes or cosmetics are shown as available.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** Arrow keys steer; Space fires; Shift boosts.
- **Lite fallback:** Static asteroid composition with the title accent and scene silhouette.
