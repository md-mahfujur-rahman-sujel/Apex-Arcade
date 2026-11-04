# Game 11 — Iron Circuit

## Pitch

A six-rival championship circuit (Brakk, Sable, Warden Orlo, Vex, Mira, Ash) with frame-advantage punches, kicks, blocks, parries, and Rift Rush. Keep the source game’s recognizable rhythm and make each run readable, quick to restart, and rewarding to master.

## Art direction

Preserve the current artwork, silhouettes, animation, and sound on the canonical page. Use the game’s existing #F59E0B accent as a guide for new menu and reward states. Keep gameplay objects distinct from the background; never rely on colour alone for hazards or legal moves. Lite and reduced-motion settings must reduce effects without removing gameplay feedback.

## Modes and match structure

1. **Campaign:** three rivals (Brakk, Sable, Warden Orlo), best-of-three rounds, three lives, 60-second rounds.
2. **Blitz Run:** all six rivals in single rounds, two lives, 40-second rounds.
3. **Daily Duel:** deterministic local-day seed shuffles the six-rival order; two lives, 50-second rounds, and a saved daily best.
4. **Endless Circuit:** twelve escalating rivals (stat-scaled rematches), three lives, 50-second rounds.
5. **Overdrive:** six rivals, one life, 45-second rounds, 1.5× score. Unlocks after defeating six rivals.

A mode change must reset only the state named by that mode. Pause and resume preserve the complete in-progress state. Daily seeds use the local date and produce the same rival order for every retry that day. Rounds end by K.O. or timer; a draw replays the round. The first fighter to the mode’s round target wins the matchup, a lost matchup costs one life, and a defeated rival awards 1,200 base points.

## Settings and difficulty

| Setting | Behavior |
| --- | --- |
| Easy | 0.8× simulation speed or a wider timing/mistake allowance; 1.0× score. |
| Normal | Preserve the source page’s baseline rules at 1.0× speed and score. |
| Hard | 1.35× simulation speed or a stricter opponent/puzzle target; 1.25× score. |
| Performance | Respect Lite, Standard, and Ultra budgets; preserve essential playfield feedback. |
| Reduced motion | Remove decorative movement, shake, and nonessential flashes; preserve input and game-state motion. |
| Audio and palette | Inherit global settings, allow per-game overrides, and keep objects legible in colour-blind palettes. |

## Cosmetics

Twelve cosmetics ship across four slots. Skins: Ember, Cobalt, and Violet Kestrel. HUD palettes: Sunset, Aurora, and Neon. Rift trails: Gold, Violet, and Cyan. Arena themes: Dune Heat, Neon Rooftop, and Midnight Circuit. Keep all interactive objects distinguishable and do not change game physics. Purchases use the shared Sparks registry, charge once, and persist ownership and equip state after reload.

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Blood | win the first round | Common |
| Iron Guard | parry five attacks in one run | Rare |
| Chain Fighter | land a five-hit combo | Rare |
| Untouched | win a round without taking damage | Rare |
| Last Stand | win a round with 15 HP or less | Epic |
| Rift Rush | land a Rift Rush finisher | Common |
| Circuit Champion | clear the campaign | Epic |
| Blitz Breaker | clear a Blitz Run | Epic |
| Daily Duelist | win the Daily Duel | Rare |
| Six Deep | defeat six rivals in the Endless Circuit | Epic |
| Overdrive | clear Overdrive on one life | Legendary |
| Circuit Legend | score 20,000 in one run | Legendary |

Unlock each once under the host game id and send one achievement event and one toast. Score targets must respect the selected mode’s documented multiplier.

## Tutorial and controls

Use a guided tutorial. Teach movement and blocking, the punch → kick chain, and the Rift Rush meter. Controls shown in the menu and during play: A/D move, S/back block, W jump, F punch, G kick, H Rift Rush.

Support keyboard and touch. Board games must offer clear selected/active state and tap targets; action games must keep virtual controls away from hazards and the theatre launch controls. Shared menus must support gamepad focus and activation.

## Current baseline and scope

Canonical page: `11-street-fighter/index.html`. Current family: Arcade Core (Yes). Catalog description: “A six-rival circuit (Brakk, Sable, Warden Orlo, Vex, Mira, Ash) with best-of rounds, frame-advantage strikes, parries, and Rift Rush. Five modes: campaign, blitz, seeded daily, endless, and overdrive.” Controls: A/D move, S/back block, W jump, F punch, G kick, H Rift Rush. This bible describes the shipped rollout.

## Menu Identity Card

- **Archetype:** machine.
- **Mood:** Enter the circuit and outlast every challenger.
- **Palette:** `#080d15` background, `color-mix(in srgb, #22d3ee 8%, rgba(15,22,35,.94))` panel, `#22d3ee` accent, `color-mix(in srgb, #22d3ee 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** Per-title `gauntlet-frame` frame and `gauntlet-banner` button identity, using the shared machine treatment.
- **Scene recipe:** Original procedural gauntlet mark with an accent-lit background, restrained depth bands, and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title procedural motif; shared tick, select, and back cues.
- **Menu items:** Play, Options, About, Exit. The five shipped modes and twelve cosmetics are available from the in-game menu.
- **Settings:** Shared audio, display, controls, accessibility, and difficulty options.
- **Controls:** A/D move; W jumps; S blocks; F punches; G kicks; H Rift Rush.
- **Lite fallback:** Static gauntlet composition with the title accent and scene silhouette.
