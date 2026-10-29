# Game 01 — Glowmoth Gauntlet

## Pitch

The last glowmoth carries the Dawn Spark through collapsing caverns to relight the Lumen Tree. Preserve quick-restart endless flight; add a 15-stage campaign across five caverns with a gate challenge per biome.

## Art direction

Palette: midnight indigo `#0b1030`, deep violet `#241552`, plum `#4b1d6b`, orchid `#a78bfa`, ice cyan `#67e8f9`, moth-gold `#fde68a`, rose `#f9a8d4`. Light from upper left; thin, selective dark outlines; three material values (lit, base, shaded). Keep the moth layered and legible, with body, eyes/antennae, translucent wings. Retain three parallax ridges, fireflies, ground shadow, restrained glow; reduce bloom/particles on Lite and respect reduced motion.

## Menu Identity Card (M0)

- **Archetype:** Banner Frame.
- **Mood:** A quiet, bioluminescent cavern just before the first flight; mysterious and welcoming, with the moth clearly readable against the distant crystal light.
- **Palette:** bg `#0b1030`; panel `rgba(12,18,40,0.82)`; accent `#67e8f9`; button `#fde68a`; buttonText `#241552`; text `#f4f0ff`.
- **Type:** `system-ui` for title and body; `ui-monospace` for score and version details until the proposed self-hosted font set is approved.
- **Frame and buttons:** Fine crystal corner cuts, a restrained violet inner stroke, and broad moth-gold banner buttons with faceted end caps. Use cyan focus rings and a short lift on hover; no continuous shimmer.
- **Scene recipe (back to front):** Three slow parallax cave ridges in indigo and plum; a distant cyan crystal arch; a few low-opacity spores; one original Glowmoth sprite hovering beside, never behind, menu labels. The menu panel occupies a stable clear zone at center-left.
- **Music and UI sounds:** Proposed slow, airy pad with two soft bell notes; short glassy hover tick, warm selection chime, muted low note on Back. Start audio only after the first user gesture.
- **Menu items and order:** Play, Customize, Options, About, Stats, Exit. Modes stays omitted while the game ships its single classic endless-flight mode.
- **Game-specific settings:** Existing difficulty choice (Easy, Normal, Hard), audio, performance tier, and reduced-motion preference. Keep gameplay controls available in About.
- **Customize:** The shared 16-item Glowmoth registry across skin, palette, trail, and theme slots. Show the Sparks balance, buy with Sparks, gate achievement items, equip owned items, and apply the choice to the loaded run; Save v3 persists ownership and equipment.
- **Lite fallback:** One static cave frame with the moth sprite, no particles or parallax, and the same high-contrast panel and controls.
- **Originality:** Build the cavern, crystal marks, moth, and sound from Apex Arcade assets; do not reproduce commercial franchise key art.

## Characters and story beats

The Keeper entrusts the Spark to the Glowmoth as the Tree dims. Each gate reveals a new biome and Tree fragment; the ending relights the Tree and opens replay. Keep narrative in one `STORY` object.

## Levels and difficulty

Five caverns, three stages each: Crystal (wide gaps, drifting crystals, wind); Mushroom (spore drafts, split routes, moving pairs); Ice (crosswinds, brittle gates, updrafts); Magma (heat vents, ember bursts, rising passages); Void (dim lanes, converging crystals, collapsing gate). Teach hazards before combining them. Keep endless medals at 10/20/30/40.

| Setting | Campaign and endless behavior |
| --- | --- |
| Easy | 0.8× speed, wider safe gaps, one checkpoint per cavern, and optional route hint. |
| Normal | Baseline speed and gaps; one checkpoint at each cavern gate. |
| Hard | 1.35× speed, 1.25× score, tighter gaps, and no checkpoints. |

## Controls and achievements

Space, Up, W, click/tap, or gamepad primary button to flap; P/Escape pauses; M mutes. Touch targets stay clear of the flight lane.

Achievements: First Flight; Bronze/Silver/Gold/Platinum (10/20/30/40); Untouched (10 gates); Dawnkeeper (campaign); Daily Glow (daily run).

## Features and risks

Current baseline has endless flight, moving columns after 8 points, four medals, saved medal records, Perf-budgeted particles, baked sprites, parallax, synthesized SFX/music, and score/achievement hooks. Campaign, checkpoints, daily seed, ghost, expanded achievements, and campaign difficulty are proposals—not implemented. Preserve one-button play and portrait readability.
