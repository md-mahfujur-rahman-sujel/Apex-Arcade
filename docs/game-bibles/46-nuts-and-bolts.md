# Game 46 — Nuts & Bolts

## Pitch

Unscrew bolts from a stack of planks into a tray at the bottom. Three bolts of the same colour pop together and free their slots; a plank with no bolts left falls away and uncovers the bolts beneath it. Clear every plank before the tray fills. Classic is the campaign, Relaxed widens the tray to eight slots, Blitz races a 90-second clock, Precision narrows the tray to five with no undo, and Masterclass packs six colours into five slots with a single undo.

## Art direction

A workbench of rotated wooden planks over a dark bench, with hexagonal bolts in five colours and a tray that fills slot by slot. Plank skins come from `nuts-bolts:wood-*`, the bench from `nuts-bolts:bench-*`, the selection ring from `nuts-bolts:glow-*` and the tray from `nuts-bolts:tray-*`. Covered bolts refuse with a short shake, cleared planks tumble away with a brief fall, and the tray, bolt and match counts are always printed, so feedback never depends on colour or motion alone.

## Modes and match structure

| Mode | Tray slots | Colours | Undo | Clock | Unlock |
| --- | --- | --- | --- | --- | --- |
| Classic | 6 | 5 | 5 | none | open |
| Relaxed | 8 | 5 | unlimited (99) | none | open |
| Blitz | 6 | 5 | 2 | 90 s | open |
| Precision | 5 | 5 | 0 | none | open |
| Masterclass | 5 | 6 | 1 | none | Classic win |

1. **Classic:** the campaign. Clearing a level records it and unlocks the next one.
2. **Relaxed:** two extra tray slots and effectively unlimited undo.
3. **Blitz:** the standard tray with a 90-second clock; time-out loses the level.
4. **Precision:** five slots and no undo.
5. **Masterclass:** a sixth colour squeezed into five slots with one undo; locked until a Classic win (`classicWins ≥ 1`).

A mode change rebuilds the level from scratch. Pause preserves the whole in-progress tray, planks and undo history.

## Core rules

- A bolt can be unscrewed only when no plank lies on top of it.
- Each tapped bolt drops into the next free tray slot.
- Three bolts of the same colour in the tray pop together and release all three slots.
- When the last bolt leaves a plank, the plank falls and uncovers anything beneath it.
- The level is cleared when every plank is gone.
- The level is lost when the tray is full and no match is available.
- Every generated level is checked by a solver before it is dealt, so every level can be cleared.
- The level jump selector lists every level reached so far; Classic resumes at the highest unlocked level.

## Scoring

A clear pays `bolts × 10 + matches × 150 + 400 + level × 50 − undos × 25`, plus a Blitz time bonus of `max(0, 600 − seconds × 5)`. The result floors at 100. A loss scores zero. There is no difficulty score multiplier; the mode's clock and tray limits are the challenge.

## Records and persistence

Saved under `nuts-bolts`:

- `bestScoreClassic`, `bestScoreRelaxed`, `bestScoreBlitz`, `bestScorePrecision`, `bestScoreMaster`
- `level` (highest cleared, maximum merge)
- `bestTimeClassic`, `bestTimeRelaxed`, `bestTimeBlitz`, `bestTimePrecision`, `bestTimeMaster` (minimum, wins only)
- `wins`, `losses`, `levelsCleared`, `bolts`, `matches`, `undos`
- `classicWins`, `relaxedWins`, `blitzWins`, `precisionWins`, `masterWins`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

## Cosmetics

Sixteen registered cosmetics using the `nuts-bolts:` prefix:

| Slot | Items |
| --- | --- |
| Skin (planks) | Pine, Walnut, Ash, Rosewood, Ebony |
| Palette (bench) | Slate, Night, Indigo, Mono |
| Effect (selection ring) | Amber, Cyan, Lime, Rose |
| Theme (tray) | Slate, Rose, Mint |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| Bench Hand | clear any level | Common |
| Quick Hands | clear a level in under 60 seconds | Rare |
| Clean Hands | clear a level without undo | Common |
| Bolt Collector | unscrew 50 bolts across your career | Rare |
| Five Benches | clear five levels | Common |
| Triple Crown | win in three different modes | Rare |
| Ten Benches | clear ten levels | Epic |
| Blitz Bench | clear a Blitz level | Rare |
| Easy Does It | clear a Relaxed level | Common |
| Steady Hands | clear a Precision level | Rare |
| Master Mechanic | clear a Masterclass level | Epic |
| Toolbox Complete | win in every mode | Legendary |

Unlocks are stored once under `nuts-bolts`; each unlock sends one achievement event and one toast.

## Tutorial and controls

The interactive tutorial teaches the free-bolt rule, the three-of-a-kind pop, the falling plank and each mode modifier. Controls: click or tap a bolt to unscrew it; U undoes; R restarts the level; N deals a new layout for the same level; H/M toggle help and mute. The side panel shows level, bolts collected, elapsed time, the level best, the tray, and the jump selector.

## Menu Identity Card

- **Archetype:** machine.
- **Mood:** Unscrew matching bolts into the tray.
- **Palette:** `#080d15` background, `color-mix(in srgb, #cbd5e1 8%, rgba(15,22,35,.94))` panel, `#cbd5e1` accent, `color-mix(in srgb, #cbd5e1 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** `bolts-frame` frame and `bolts-banner` button identity, using the shared machine treatment.
- **Scene recipe:** A procedural hex-bolt field lit by the bench accent, with restrained depth bands and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title minor procedural motif; shared tick, select and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options. The shared difficulty setting has no gameplay effect; the mode sets the tray, clock and undo rules.
- **Controls:** Click or tap a bolt to unscrew it into the tray; U undo; R restart.
- **Lite fallback:** Static hex-bolt composition with the title accent and bench silhouette.
