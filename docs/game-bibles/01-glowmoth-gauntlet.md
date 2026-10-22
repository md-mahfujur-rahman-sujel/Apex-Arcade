# Game 01 — Glowmoth Gauntlet

## Pitch

The last glowmoth carries the Dawn Spark through collapsing caverns to relight the Lumen Tree. Preserve quick-restart endless flight; add a 15-stage campaign across five caverns with a gate challenge per biome.

## Art direction

Palette: midnight indigo `#0b1030`, deep violet `#241552`, plum `#4b1d6b`, orchid `#a78bfa`, ice cyan `#67e8f9`, moth-gold `#fde68a`, rose `#f9a8d4`. Light from upper left; thin, selective dark outlines; three material values (lit, base, shaded). Keep the moth layered and legible, with body, eyes/antennae, translucent wings. Retain three parallax ridges, fireflies, ground shadow, restrained glow; reduce bloom/particles on Lite and respect reduced motion.

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
