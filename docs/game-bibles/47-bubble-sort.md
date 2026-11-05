# Game 47 — Bubble Sort

## Pitch

Pour coloured bubbles between glass tubes until every tube holds one colour. Tap a tube to lift its top bubble — or its top run of matching bubbles — then tap a destination. A pour only lands on an empty tube or on the same colour, and only while the destination has room. Classic is the campaign, Sprint races a 120-second clock, Zen adds a third empty tube and unlimited undo, Precision removes undo and adds a colour, and Masterclass deepens every tube to five bubbles with one undo.

## Art direction

Tall glass tubes in a dark rack, each holding up to four bubbles (five in Masterclass) in up to twelve colours. Tube skins come from `bubble-sort:tube-*`, the rack from `bubble-sort:bg-*`, the pour highlight from `bubble-sort:glow-*` and the ink from `bubble-sort:ink-*`. A picked tube lifts and a legal destination highlights; a full single-colour tube turns green. Symbols (●▲■★♥◆✚☾♣✿✖☀) can be switched on from the side panel so colour is never the only cue. Reduced-motion removes the pop and shake animations while keeping the lift, selection and sorted state visible.

## Modes and match structure

| Mode | Tube capacity | Empty tubes | Extra spare tube | Undo | Clock | Unlock |
| --- | --- | --- | --- | --- | --- | --- |
| Classic | 4 | 2 | 1 | 5 | none | open |
| Sprint | 4 | 2 | 1 | 2 | 120 s | open |
| Zen | 4 | 3 | 2 | unlimited (99) | none | open |
| Precision | 4 | 2 | 0 | 0 | none | open |
| Masterclass | 5 | 2 | 0 | 1 | none | Classic win |

1. **Classic:** the campaign; each clear advances to the next level and saves the highest cleared level.
2. **Sprint:** the Classic rack against a 120-second clock.
3. **Zen:** one extra empty tube, two spare-tube additions, unlimited undo and one fewer colour for the level.
4. **Precision:** one extra colour and no undo or spare tube.
5. **Masterclass:** five bubbles per tube, one undo, and locked until a Classic win (`classicWins ≥ 1`).

Levels use `3 + floor((level − 1) / 2)` colours, capped at twelve; Precision adds one and Zen subtracts one. A mode change starts a fresh level for that mode. Pause freezes the Sprint clock and the move history.

## Core rules

- Tapping a tube selects it; tapping it again clears the selection.
- A pour moves the top run of one colour onto an empty tube or onto the same colour, provided every moved bubble fits.
- An illegal pour refuses with a shake and leaves the rack untouched.
- A tube with one colour and no gaps is locked (shown green) and cannot be picked up.
- Cleared tubes count toward the level goal; a level is solved when every colour has its own full tube.
- Undo rewinds the previous pour up to the mode limit.
- The spare-tube button adds an empty tube, up to the mode's allowance.
- New layout re-deals the current level; restart re-deals and resets moves, clock and assists.

## Scoring

A clear pays `400 + level × 50 + max(0, 600 − moves × 10) − undos × 25 − spares × 50`, plus `12 × remaining seconds` in Sprint. The result floors at 100. A loss scores zero. There is no difficulty score multiplier; the mode's clock, undo and spare limits are the challenge.

## Records and persistence

Saved under `bubble-sort`:

- `bestScoreClassic`, `bestScoreSprint`, `bestScoreZen`, `bestScorePrecision`, `bestScoreMaster`
- `level` (highest cleared, maximum merge)
- `bestMovesClassic`, `bestMovesSprint`, `bestMovesZen`, `bestMovesPrecision`, `bestMovesMaster` (minimum, wins only)
- `bestTimeClassic`, `bestTimeSprint`, `bestTimeZen`, `bestTimePrecision`, `bestTimeMaster` (minimum, wins only)
- `wins`, `losses`, `levelsCleared`, `moves`, `undos`, `spares`
- `classicWins`, `sprintWins`, `zenWins`, `precisionWins`, `masterWins`
- `plays`, `secondsPlayed`, `lastResult`, `lastMode`

## Cosmetics

Sixteen registered cosmetics using the `bubble-sort:` prefix:

| Slot | Items |
| --- | --- |
| Skin (tubes) | Glass, Frost, Amber, Jade, Violet |
| Palette (rack) | Slate, Night, Indigo, Mono |
| Effect (pour highlight) | Gold, Cyan, Lime, Rose |
| Theme (ink) | Slate, Plum, Mint |

## Achievements

| Achievement | Trigger | Rarity |
| --- | --- | --- |
| First Pour | clear any level | Common |
| Steady Pour | clear a level without undo | Common |
| No Spare Needed | clear a level without adding a spare tube | Common |
| Quick Pour | clear a level in under 90 seconds | Rare |
| Five Racks | clear five levels | Common |
| Ten Racks | clear ten levels | Epic |
| Triple Crown | win in three different modes | Rare |
| Sprint Sorter | clear a Sprint level | Rare |
| Zen Sorter | clear a Zen level | Common |
| Diamond Hands | clear a Precision level | Rare |
| Pour Master | clear a Masterclass level | Epic |
| Every Rack | win in every mode | Legendary |

## Tutorial and controls

The interactive tutorial covers picking up a run, the empty-or-matching pour rule, the locked full tube and the mode modifiers. Controls: click or tap a tube, then a destination; 1–9 and 0 select tubes by number (0 is tube ten); U undoes; R restarts; T adds a spare tube; N deals a new layout; H/M toggle help and mute. The side panel shows level, moves, time, best level, symbols toggle, undo and spare actions, and the level jump selector.

## Menu Identity Card

- **Archetype:** glass.
- **Mood:** Pour each colour until every tube holds one shade.
- **Palette:** `#080d15` background, `color-mix(in srgb, #22d3ee 8%, rgba(15,22,35,.94))` panel, `#22d3ee` accent, `color-mix(in srgb, #22d3ee 76%, white)` button, `#10151e` button text, `#f6f7fb` body text.
- **Type:** System UI title and body fonts.
- **Frame and buttons:** `tubes-frame` frame and `tubes-banner` button identity, using the shared glass treatment.
- **Scene recipe:** A procedural hex-field of glass tubes lit by the rack accent, with restrained depth bands and a static Lite/reduced-motion frame.
- **Music and UI sounds:** Per-title minor procedural motif; shared tick, select and back cues.
- **Menu items:** Play, Modes, Customize, Options, More, Exit.
- **Settings:** Shared audio, display, controls, accessibility and difficulty options. The shared difficulty setting has no gameplay effect; the mode sets capacity, clock and assists.
- **Controls:** Click a source tube, then an available destination.
- **Lite fallback:** Static tube composition with the title accent and rack silhouette.
